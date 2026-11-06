"use client";

import { 주소, 인증오류 } from "./http";
import { 현재토큰 as 토큰 } from "./session";   // 주의: Supabase 토큰 + 데모 토큰을 한 곳에서 고릅니다
import type { 답변항목, 부가세구분 } from "./server-types";

/**
 * SSE over POST.
 *
 * 주의: 표준 도구인 EventSource 는 'GET 만' 됩니다. 판정·정규화는 POST 로 긴 바디를
 *    보내야 해서 못 씁니다. fetch 로 받아 직접 끊어 읽습니다.
 *
 * 주의: 서버가 대기 중 12초마다 `: keep-alive` 주석 줄을 보냅니다 (프록시 idle timeout
 *    방지). 호출부에는 `keep-alive` 이벤트로 알려 무응답 타이머를 다시 재게 합니다.
 */
export type SSE핸들러 = (이벤트: string, 데이터: unknown) => void;

/**
 * 주의: 게스트(비로그인)는 Authorization 을 '안' 보냅니다. 빈 헤더를 보내면 서버가
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
  // 주의: 401/403 을 「요청에 실패했습니다」로 합치지 않습니다 — 판정 화면에서 로그인이
  //    만료된 것과 서버 장애가 같은 문구로 보이면 원인을 못 찾습니다.
  if (res.status === 401 || res.status === 403) {
    console.warn("[auth] SSE", res.status, res.url);
    throw new 인증오류(
      res.status,
      res.status === 401
        ? "로그인이 만료되었습니다. 다시 로그인한 뒤 점검해 주세요."
        : "이 계정으로는 점검할 수 없습니다. 기관 계정 등록을 확인해 주세요.",
    );
  }
  // 주의: 429(요청 한도)·422(등록되지 않은 사업명 등)·503 은 서버가 이유를 본문에 담아 보냅니다.
  //    상태코드만 보여주면 사용자가 기다려야 하는지, 입력을 고쳐야 하는지 모릅니다.
  if (!res.ok || !res.body) {
    const 본문 = await res.json().catch(() => null) as Record<string, unknown> | null;
    const 사유 = [본문?.["오류"], 본문?.["detail"]].find((v) => typeof v === "string") as string | undefined;
    throw Object.assign(new Error(사유 || `요청에 실패했습니다 (${res.status})`), { status: res.status });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let 버퍼 = "";
  // 주의: 서버는 정규화·판정 모두 마지막에 「완료」를 보냅니다. 그 전에 연결이 끊기면
  //    (모바일 망 전환·프록시 종료) 결과를 못 받은 것이므로 성공으로 넘기지 않습니다.
  let 완료받음 = false;

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
      // 주의: `: keep-alive` 주석은 데이터가 없지만 '서버가 아직 판정 중' 이라는 신호입니다.
      //    호출부의 무응답 타이머가 이걸로 다시 잽니다(판정 마감 180초 동안 12초마다 옵니다).
      if (!데이터줄.length) {
        if (덩어리.trimStart().startsWith(":")) on("keep-alive", null);
        continue;
      }
      const 원문 = 데이터줄.join("\n");
      let 값: unknown = 원문;
      try {
        값 = JSON.parse(원문);
      } catch {
        /* 「문의초안」은 JSON 이 아니라 문자열입니다 */
      }
      if (이름 === "완료") 완료받음 = true;
      on(이름, 값);
    }
  }
  if (!완료받음) {
    throw new Error("서버와 연결이 끊겨 결과를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}

/* ── 화면 8: 자연어/폼 → 구조화 ────────────────── */

/** 특수관계 여부 — 서버 `models.py::특수관계` 와 같은 모양입니다. */
export type 특수관계 = { 친족거래: boolean; 전직임직원업체: boolean };

const 특수관계_기본값: 특수관계 = { 친족거래: false, 전직임직원업체: false };

export type 정규화입력 = {
  품목: string; 금액: number; 용도: string;              // 폼 경로 필수 3종
  집행예정일?: string; 거래처?: string; 추가설명?: string;
  사업명?: string;
  부가세구분?: 부가세구분;
  특수관계?: 특수관계;
};

export function 정규화SSE(입력: 정규화입력, on: SSE핸들러, signal?: AbortSignal) {
  return SSE("/api/normalize", { 특수관계: 특수관계_기본값, ...입력 }, on, { signal });
}

/* ── 화면 11: 판정 ─────────────────────────────── */

export type 판정입력 = {
  정규화: Record<string, unknown>;
  확정비목?: string | null;
  사업명?: string | null;
  plan_id?: number | null;
  특수관계?: 특수관계;
  /** 확인 질문의 답 — 서버 `models.py::판정요청.답변` 그대로. 비어도 종전과 같은 경로로 처리된다. */
  답변?: 답변항목[];
  /** 답변이 어느 질문 묶음의 것인지 알려 주는 키. `POST /api/questions` 응답 값 그대로입니다. */
  질문세트?: string | null;
  /** 분류 확인에서 확정한 세목. 서버가 그 비목 아래에서 찾지 못하면 판단불가입니다. */
  확정세목?: string | null;
  /** 추가 입력 칸에 채운 값. 코드의 한도 비교는 이 값과 금액 · 부가세구분만 읽습니다. */
  추가입력값?: Record<string, string | number>;
  부가세구분?: 부가세구분;
};

/**
 * 이벤트 순서 (실측):
 *   진행×3 → 판정 → 해야할일 → 인용 → 전제 → 참조관계 → 결과 → 저장 → 완료
 *   판단불가일 때만 「문의초안」이 참조관계 뒤에 하나 더 옵니다.
 *
 * `mock` 을 주면 mock 서버에서 4종 판정 중 하나를 골라 화면을 확인할 수 있습니다:
 *   판정SSE(입력, on, { mock: "불가" })
 *
 * 주의: 실패해도 '자동 재시도 금지'. 판정 1건이 LLM 호출입니다.
 */
export function 판정SSE(
  입력: 판정입력,
  on: SSE핸들러,
  옵션?: { mock?: "가능" | "조건부" | "불가" | "판단불가"; signal?: AbortSignal },
) {
  return SSE(
    "/api/judge",
    { 특수관계: 특수관계_기본값, ...입력 },
    on,
    { 쿼리: 옵션?.mock ? { mock: 옵션.mock } : undefined, signal: 옵션?.signal },
  );
}
