"use client";

// 화면 8 「새 지출 계획 ① 기본 정보」 → 서버 정규화
//
// 🔴 서버에는 경로가 둘이고 «폼 경로» 가 프론트 정식 경로입니다.
//    폼 경로에서는 서버가 비목을 추측하지 «않습니다» — `비목후보: []` 를 줍니다.
//    (server/main.py `_실_정규화` 주석: "비목후보는 화면 9 에서 사용자가 직접 확정한다")
//    목 서버는 후보를 채워 주기 때문에 개발 중에는 후보가 보입니다.
//    → 그래서 «후보가 비어도 정상» 으로 다뤄야 합니다.

import { 정규화SSE } from "./sse";
import type { 비목후보 } from "./server-types";

export type 정규화입력값 = {
  품목: string;
  금액: number;
  용도: string;
  집행예정일?: string;
  거래처?: string;
  추가설명?: string;
  사업명?: string;
};

export type 정규화출력 = {
  비목후보: 비목후보[];
  정규화: Record<string, unknown>;
  질문원문: string;
};

export async function 정규화하기(
  입력: 정규화입력값,
  진행?: (설명: string) => void,
): Promise<정규화출력> {
  let 결과: Record<string, unknown> = {};
  let 오류: string | null = null;

  await 정규화SSE(입력, (이름, 값) => {
    const v = (값 ?? {}) as Record<string, unknown>;
    if (이름 === "진행") 진행?.(typeof v["설명"] === "string" ? v["설명"] : "정리하는 중");
    if (이름 === "결과") 결과 = v;
    // 🔴 실패가 HTTP 500 이 아니라 «오류 이벤트» 로 옵니다. try/catch 로는 안 잡힙니다.
    if (이름 === "오류") 오류 = typeof v["메시지"] === "string" ? v["메시지"] : "정리에 실패했습니다";
  });

  if (오류) throw new Error(오류);

  const 후보 = Array.isArray(결과["비목후보"]) ? (결과["비목후보"] as 비목후보[]) : [];
  return {
    비목후보: 후보,
    정규화: 결과,
    질문원문: typeof 결과["질문원문"] === "string" ? (결과["질문원문"] as string) : "",
  };
}
