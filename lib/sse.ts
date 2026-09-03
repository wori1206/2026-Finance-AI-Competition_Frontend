"use client";

import { 주소, 인증오류 } from "./http";
import { 현재토큰 as 토큰 } from "./session";   // 🔴 Supabase 토큰 + 데모 토큰을 한 곳에서 고릅니다

/**
 * SSE over POST.
 *
 * 🔴 표준 도구인 EventSource 는 «GET 만» 됩니다. 판정·정규화는 POST 로 긴 바디를
 *    보내야 해서 못 씁니다. fetch 로 받아 직접 끊어 읽습니다.
 *
 * 🔴 서버가 대기 중 12초마다 `: keep-alive` 주석 줄을 흘립니다 (프록시 idle timeout
 *    방지). event:/data: 로 시작하지 않는 줄은 여기서 자연히 무시됩니다.
 */
export type SSE핸들러 = (이벤트: string, 데이터: unknown) => void;

/**
 * 🔴 게스트(비로그인)는 Authorization 을 «안» 보냅니다. 빈 헤더를 보내면 서버가
 *    「헤더가 있으면 토큰으로 끝난다」 규칙에 따라 401 로 거부합니다.
 */
async function SSE헤더(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  const t = await 토큰();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function SSE(
  경로: string,
  바디: unknown,
  on: SSE핸들러,
  옵션?: { 쿼리?: Record<string, unknown>; signal?: AbortSignal },
): Promise<void> {
  const res = await fetch(주소(경로, 옵션?.쿼리), {
    method: "POST",
    headers: await SSE헤더(),
    body: JSON.stringify(바디),
    signal: 옵션?.signal,
  });
  // 🔴 401/403 을 「요청에 실패했습니다」로 뭉개지 않습니다 — 판정 화면에서 로그인이
  //    풀린 것과 서버가 죽은 것이 같은 문구로 보이면 원인을 못 찾습니다.
  if (res.status === 401 || res.status === 403) {
    console.warn("[auth] SSE", res.status, res.url);
    throw new 인증오류(
      res.status,
      res.status === 401
        ? "로그인이 만료되었습니다. 다시 로그인한 뒤 점검해 주세요."
        : "이 계정으로는 점검할 수 없습니다. 기관 계정 등록을 확인해 주세요.",
    );
  }
  if (!res.ok || !res.body) throw new Error(`요청에 실패했습니다 (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let 버퍼 = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    버퍼 += decoder.decode(value, { stream: true });

    // 이벤트는 빈 줄(\n\n)로 끊어집니다
    const 덩어리들 = 버퍼.split("\n\n");
    버퍼 = 덩어리들.pop() ?? "";

    for (const 덩어리 of 덩어리들) {
      let 이름 = "message";
      const 데이터줄: string[] = [];
      for (const 줄 of 덩어리.split("\n")) {
        if (줄.startsWith("event:")) 이름 = 줄.slice(6).trim();
        else if (줄.startsWith("data:")) 데이터줄.push(줄.slice(5).trim());
      }
      if (!데이터줄.length) continue;         // `: keep-alive` 는 여기서 걸러집니다
      const 원문 = 데이터줄.join("\n");
      let 값: unknown = 원문;
      try {
        값 = JSON.parse(원문);
      } catch {
        /* 「문의초안」은 JSON 이 아니라 문자열입니다 */
      }
      on(이름, 값);
    }
  }
}

/* ── 화면 8: 자연어/폼 → 구조화 ────────────────── */

export type 정규화입력 = {
  품목: string; 금액: number; 용도: string;              // 폼 경로 필수 3종
  집행예정일?: string; 거래처?: string; 추가설명?: string;
  사업명?: string;
  f5?: { 친족거래: boolean; 전직임직원업체: boolean };
};

export function 정규화SSE(입력: 정규화입력, on: SSE핸들러, signal?: AbortSignal) {
  return SSE("/api/normalize", { f5: { 친족거래: false, 전직임직원업체: false }, ...입력 }, on, { signal });
}

/* ── 화면 11: 판정 ─────────────────────────────── */

export type 판정입력 = {
  정규화: Record<string, unknown>;
  확정비목?: string | null;
  사업명?: string | null;
  plan_id?: number | null;
  f5?: { 친족거래: boolean; 전직임직원업체: boolean };
};

/**
 * 이벤트 순서 (실측):
 *   진행×3 → 판정 → 해야할일 → 인용 → 전제 → 참조사슬 → 결과 → 저장 → 완료
 *   판단불가일 때만 「문의초안」이 참조사슬 뒤에 하나 더 옵니다.
 *
 * `목` 을 주면 목 서버에서 4-way 를 골라서 그려볼 수 있습니다:
 *   판정SSE(입력, on, { 목: "불가" })
 *
 * 🔴 실패해도 «자동 재시도 금지». 판정 1건이 GPU 호출입니다.
 */
export function 판정SSE(
  입력: 판정입력,
  on: SSE핸들러,
  옵션?: { 목?: "가능" | "조건부" | "불가" | "판단불가"; signal?: AbortSignal },
) {
  return SSE(
    "/api/judge",
    { f5: { 친족거래: false, 전직임직원업체: false }, ...입력 },
    on,
    { 쿼리: 옵션?.목 ? { 목: 옵션.목 } : undefined, signal: 옵션?.signal },
  );
}
