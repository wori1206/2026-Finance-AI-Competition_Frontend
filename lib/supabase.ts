"use client";

// Supabase Auth — «로그인과 토큰만» 담당합니다.
//
// 🔴 데이터는 여전히 백엔드 API 로 갑니다. Supabase 로 DB 를 읽지 않습니다.
//    (인프라 결정: DB·API 는 GCP, Supabase 는 인증만)
//
// 🔴 환경변수는 «모듈 최상단에서 직접» 읽습니다. 함수 안에서 읽으면
//    Next.js 가 빌드할 때 값으로 바꿔치기하지 못해 항상 빈 값이 됩니다.
//    (2026-09-02 이 문제로 배포본이 백엔드를 못 불렀습니다.)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const KEY_ = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** 로그인 기능을 쓸 수 있는가. 값이 없으면 예전처럼 «통과만» 하는 로그인입니다. */
export const 인증켜짐 = Boolean(URL_ && KEY_);

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!인증켜짐) throw new Error("Supabase 설정이 없습니다");
  if (!_client) {
    _client = createClient(URL_, KEY_, {
      auth: {
        persistSession: true,      // 새로고침해도 로그인 유지
        autoRefreshToken: true,    // 만료 전에 알아서 갱신
        detectSessionInUrl: false, // 이메일 링크·소셜 로그인을 안 씁니다
      },
    });
  }
  return _client;
}

/**
 * 지금 로그인된 사용자의 액세스 토큰. 없으면 null.
 *
 * 🔴 **null 은 「게스트」라는 뜻입니다 — 오류가 아닙니다.** 부르는 쪽은 헤더를
 *    «안 붙이고» 그냥 보냅니다. 빈 문자열이나 `Bearer null` 을 보내면 서버가
 *    401 로 거부합니다(헤더가 있으면 토큰으로 끝난다는 규칙).
 *
 * 🔴 세 갈래가 전부 null 로 뭉쳐집니다 — 구분이 필요하면 `세션상태()` 를 쓰세요:
 *      ① Supabase 설정 없음(인증켜짐=false)  ② 로그인한 적 없음  ③ 세션 만료·갱신 실패
 *    ③ 이 위험합니다. 화면은 로그인한 줄 아는데 요청은 게스트로 나가서, 남의 자료가
 *    새는 게 아니라 «내 자료가 안 보이는» 형태로 조용히 틀립니다.
 */
export async function 토큰(): Promise<string | null> {
  if (!인증켜짐) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export type 세션상태 = "인증미설정" | "게스트" | "로그인";

/**
 * 지금 요청이 어느 갈래로 나가는지. 화면이 「로그인이 풀렸습니다」를 띄우려면 이걸 봅니다.
 * (2026-09-03 기준 화면 배선은 «아직 안 했습니다» — lib 만 준비해 둡니다.)
 */
export async function 세션상태(): Promise<세션상태> {
  if (!인증켜짐) return "인증미설정";
  return (await 토큰()) ? "로그인" : "게스트";
}

export async function 로그인(email: string, password: string): Promise<void> {
  if (!인증켜짐) return;                     // 설정 전에는 통과시킵니다
  const { error } = await supabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    // 🔴 서버 원문("Invalid login credentials")을 그대로 보여주지 않습니다.
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }
}

export async function 로그아웃(): Promise<void> {
  if (!인증켜짐) return;
  await supabase().auth.signOut();
}
