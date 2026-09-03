"use client";

import { apiBase } from "./config";
import { 토큰 } from "./supabase";

/**
 * 요청 주소를 만듭니다. **org_id 는 절대 붙지 않습니다.**
 *
 * 🔴 2026-09-03 — `?org_id=` 자기신고를 뗐습니다.
 *    org_id 는 기관명만으로 재계산되는 값이라 URL 에 실리는 순간 남의 지출계획을
 *    여는 손잡이가 됩니다. 이제 기관은 서버가 Authorization 토큰에서 «주입» 합니다.
 *
 * 🔴 아래 `if (k === "org_id") continue` 는 실수 방지용입니다. 호출부가 실수로
 *    `{ org_id: ... }` 를 넘겨도 URL·쿼리스트링·브라우저 히스토리에 남지 않습니다.
 *    (히스토리에 한 번 남으면 로그아웃해도 안 지워집니다.)
 */
export function 주소(경로: string, 쿼리?: Record<string, unknown>): string {
  const u = new URL(경로, apiBase() || "http://localhost");
  for (const [k, v] of Object.entries(쿼리 ?? {})) {
    if (k === "org_id") continue;                       // 🔴 위 주석 참조. 절대 싣지 않습니다
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * 401/403 을 «조용히» 실패시키지 않기 위한 오류 타입입니다.
 * 화면은 `err instanceof 인증오류` 로 「로그인이 풀렸습니다」를 구분해 보여줄 수 있습니다.
 */
export class 인증오류 extends Error {
  readonly 상태: number;
  constructor(상태: number, 메시지: string) {
    super(메시지);
    this.name = "인증오류";
    this.상태 = 상태;
  }
}

/**
 * 모든 요청에 붙는 헤더.
 *
 * 로그인돼 있으면 `Authorization: Bearer <access_token>` 을 싣습니다.
 * 서버는 이 토큰의 email 클레임으로 기관을 정합니다 — 프론트는 기관을 주장하지 않습니다.
 *
 * 🔴 **게스트(비로그인)는 헤더를 «안» 보냅니다.** 빈 문자열이나 `Bearer null` 을
 *    보내면 서버가 401 로 «거부» 합니다(헤더가 있으면 토큰으로 끝납니다). 게스트는
 *    헤더가 아예 없어야 org_id=None 으로 통과해 게스트 행만 봅니다.
 */
async function 헤더(본문있음: boolean): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (본문있음) h["Content-Type"] = "application/json";
  const t = await 토큰();
  if (t) h.Authorization = `Bearer ${t}`;               // 없으면 «넣지 않습니다» (게스트)
  return h;
}

/** 인증 헤더만 따로 필요한 곳(FormData 업로드 등)에서 씁니다. */
export async function 인증헤더(): Promise<Record<string, string>> {
  const t = await 토큰();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function 응답처리(res: Response) {
  if (!res.ok) {
    // 서버 계약: { "오류": "메시지", "상태": 404 }. FastAPI HTTPException 은 { "detail": "..." } 입니다
    const body = await res.json().catch(() => null);
    const 꺼내기 = (키: string) =>
      body && typeof body === "object" && 키 in body
        ? String((body as Record<string, unknown>)[키])
        : null;

    // 🔴 401/403 을 일반 오류에 섞지 않습니다. 섞으면 화면에 「요청 실패 (401)」만 뜨고
    //    사용자도 개발자도 «로그인이 풀린 것» 이라는 걸 못 알아봅니다.
    if (res.status === 401 || res.status === 403) {
      const 사유 = 꺼내기("detail") ?? 꺼내기("오류");
      console.warn("[auth]", res.status, res.url, 사유);   // 조용히 실패하지 않게
      throw new 인증오류(
        res.status,
        res.status === 401
          ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
          : "이 계정으로는 볼 수 없는 자료입니다. 기관 계정이 등록되었는지 확인해 주세요.",
      );
    }

    // 🔴 `detail` 도 봅니다. FastAPI 의 `HTTPException` 은 «전부» detail 로 나갑니다.
    //    규정 업로드가 그 자리입니다 —
    //      415 ".docx 은 지원하지 않습니다. PDF·HWPX·HWP 로 올려 주세요."
    //      415 "파일 내용이 .hwpx 가 아닙니다 (실제: xlsx)."
    //      413 "파일이 너무 큽니다 (30MB 이하)."   400 "빈 파일입니다."
    //    detail 을 안 보면 이 친절한 문구가 전부 「요청 실패 (415)」로 뭉개집니다.
    throw new Error(꺼내기("오류") ?? 꺼내기("detail") ?? `요청 실패 (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export async function GET(경로: string, 쿼리?: Record<string, unknown>) {
  return 응답처리(await fetch(주소(경로, 쿼리), { headers: await 헤더(false) }));
}

export async function POST(경로: string, 바디?: unknown, 쿼리?: Record<string, unknown>) {
  return 응답처리(
    await fetch(주소(경로, 쿼리), {
      method: "POST",
      headers: await 헤더(true),
      body: JSON.stringify(바디 ?? {}),
    }),
  );
}

export async function PATCH(경로: string, 바디: unknown) {
  return 응답처리(
    await fetch(주소(경로), {
      method: "PATCH",
      headers: await 헤더(true),
      body: JSON.stringify(바디),
    }),
  );
}

export async function PUT(경로: string, 바디: unknown) {
  return 응답처리(
    await fetch(주소(경로), {
      method: "PUT",
      headers: await 헤더(true),
      body: JSON.stringify(바디),
    }),
  );
}
