"use client";

import { apiBase, orgId } from "./config";
import { 토큰 } from "./supabase";

/**
 * org_id 를 «모든» 요청에 자동으로 붙입니다.
 *
 * 🔴 2026-09-02 서버 변경 — 읽기뿐 아니라 쓰기 3경로
 *    (POST tasks · PATCH tasks/{id} · tasks:sync) 와 L3 폴링도 org_id 를 봅니다.
 *    한쪽만 실으면 조용히 404 가 납니다. 그래서 여기 한 곳에서 붙입니다.
 */
export function 주소(경로: string, 쿼리?: Record<string, unknown>): string {
  const u = new URL(경로, apiBase() || "http://localhost");
  const org = orgId();
  if (org) u.searchParams.set("org_id", org);
  for (const [k, v] of Object.entries(쿼리 ?? {})) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * 모든 요청에 붙는 헤더.
 * 🔴 로그인돼 있으면 `Authorization: Bearer <토큰>` 을 싣습니다.
 *    백엔드가 이 토큰을 검증해 org_id 를 «주입» 하게 되면 자기신고 org_id 가 사라집니다
 *    (격리감사 BE4·BE5 가 가리키는 그 지점).
 */
async function 헤더(본문있음: boolean): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (본문있음) h["Content-Type"] = "application/json";
  const t = await 토큰();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function 응답처리(res: Response) {
  if (!res.ok) {
    // 서버 계약: { "오류": "메시지", "상태": 404 }
    const body = await res.json().catch(() => null);
    const 메시지 =
      (body && typeof body === "object" && "오류" in body
        ? String((body as { 오류: unknown }).오류)
        : null) ?? `요청 실패 (${res.status})`;
    throw new Error(메시지);
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
