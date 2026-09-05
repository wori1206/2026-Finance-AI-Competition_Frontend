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

/**
 * 지금 로그인된 사람의 이메일. 없으면 null.
 *
 * 🔴 화면에 「team@startup.kr」 이 박혀 있어서, 어떤 계정으로 들어와도 같은 주소가
 *    보였습니다. 계정을 바꿔 시연할 때 바로 들통나는 자리입니다.
 */
export async function 이메일(): Promise<string | null> {
  if (!인증켜짐) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user?.email ?? null;
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

/* ── 회원가입 ────────────────────────────────────────────────────────────
 *
 * 🔴 **가입은 «두 단계» 입니다. 이 함수는 그중 첫 단계뿐입니다.**
 *
 *      ① Supabase 에 계정을 만든다        ← 이 함수. 비밀번호는 Supabase 가 든다
 *      ② 우리 서버에 (이메일 → 소속기관) 을 등록한다   ← **아직 API 가 없다**
 *
 *    ②가 없으면 로그인은 되는데 `tenant.accounts` 에 행이 없어서 «모든 API 가 403»
 *    입니다(`server/auth.py::_supabase해석` → 「등록되지 않은 계정이다」).
 *    그래서 ①만 성공한 사람은 로그인은 되지만 자기 지출계획이 안 보입니다.
 *    → 화면이 그걸 «말해야» 합니다. `lib/data-source.ts` 의 배너가 그 자리입니다.
 *
 * 🔴 ②의 경로·바디가 아직 «정해지지 않았습니다». 계약 없이 호출부를 만들면
 *    붙이는 날 전부 고칩니다. 그래서 여기서는 «만들지 않습니다» — 대신 온보딩이
 *    기관 slug 를 기억해 두어(`lib/orgs.ts::기관저장`), 계약이 정해지면 그 값을
 *    그대로 실으면 되게 해 둡니다.
 */

export type 가입결과 =
  | "가입됨"            // 계정 생성 + 세션까지 받음 (이메일 확인 꺼짐)
  | "메일확인필요"       // 계정은 생겼는데 확인 메일을 눌러야 세션이 납니다
  | "인증미설정";        // Supabase 설정 전 — 화면만 통과시킵니다

export async function 가입(
  email: string,
  password: string,
  팀이름?: string,
): Promise<가입결과> {
  if (!인증켜짐) return "인증미설정";

  const { data, error } = await supabase().auth.signUp({
    email: email.trim(),
    password,
    // 🔴 팀 이름을 «Supabase 에» 붙입니다 (`auth.users.raw_user_meta_data`).
    //    전에는 이 탭의 sessionStorage 에만 적어서, 로그아웃하거나 탭을 닫으면
    //    사라지고 화면이 다시 「체쿠메이트」로 돌아갔습니다. 우리 DB 에는 팀 이름을
    //    담을 칸이 없고(`tenant.accounts` 는 email·org_id 뿐), 계정 등록 API 도
    //    아직 없습니다 — 그러니 «계정을 가진 쪽» 이 들고 있는 게 맞습니다.
    //    로그인하면 세션에 실려 오므로 다른 기기·다른 브라우저에서도 따라옵니다.
    options: 팀이름?.trim() ? { data: { 팀이름: 팀이름.trim() } } : undefined,
  });

  if (error) {
    // 🔴 서버 원문을 그대로 보여주지 않습니다 — 영어이고, 어떤 문구는
    //    「그 이메일이 이미 있다」를 알려 주어 계정 존재 여부가 새어 나갑니다.
    const 원문 = (error.message || "").toLowerCase();
    if (원문.includes("already") || 원문.includes("registered")) {
      throw new Error("이미 가입된 이메일입니다. 로그인해 주세요.");
    }
    if (원문.includes("password")) {
      throw new Error("비밀번호가 조건에 맞지 않습니다. 8자 이상으로 정해 주세요.");
    }
    if (원문.includes("invalid") && 원문.includes("email")) {
      throw new Error("이메일 형식이 올바르지 않습니다.");
    }
    throw new Error("가입하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }

  // 🔴 Supabase 프로젝트에서 「Confirm email」이 켜져 있으면 계정은 생기지만
  //    session 이 null 입니다. 이걸 성공으로 뭉개면 사용자는 가입이 끝난 줄 알고
  //    다음 화면으로 갔다가 «전부 게스트로» 돌게 됩니다.
  return data.session ? "가입됨" : "메일확인필요";
}

/* ── 팀 이름 (사용자 메타데이터) ──────────────────────────────────────────
 *
 * 🔴 `auth.users.raw_user_meta_data` 에 삽니다. 우리 백엔드 DB 가 아닙니다 —
 *    `tenant.accounts` 에는 email·org_id 밖에 없고 계정 등록 API 도 아직 없어서,
 *    담을 곳이 여기뿐입니다. 로그인하면 세션에 같이 실려 옵니다.
 *
 * ⚠️ 사용자 메타데이터는 «본인이 고칠 수 있는» 값입니다. 화면에 이름을 보여주는
 *    용도로만 씁니다 — 권한이나 소속 판단에 쓰면 안 됩니다. 소속 기관은 서버가
 *    토큰의 email 로 정합니다(`server/auth.py`).
 */
export async function 팀이름(): Promise<string | null> {
  if (!인증켜짐) return null;
  const { data } = await supabase().auth.getSession();
  const v = data.session?.user?.user_metadata?.["팀이름"];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * 팀 이름을 바꿉니다 (마이페이지 「내 정보 수정」).
 *
 * 🔴 가입 때 메타데이터가 안 붙은 «옛 계정» 을 되살리는 통로이기도 합니다.
 *    한 번 저장하면 그 다음 로그인부터 이름이 따라옵니다.
 * 🔴 실패해도 «던지지 않습니다». 팀 이름은 화면 표기일 뿐이라, 이것 때문에
 *    협약 저장 같은 진짜 작업이 실패로 보이면 안 됩니다.
 */
export async function 팀이름쓰기(이름: string): Promise<boolean> {
  if (!인증켜짐) return false;
  const 값 = (이름 ?? "").trim();
  if (!값) return false;
  try {
    const { error } = await supabase().auth.updateUser({ data: { 팀이름: 값 } });
    return !error;
  } catch {
    return false;
  }
}
