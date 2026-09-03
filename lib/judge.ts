"use client";

// 화면 11 「AI 점검하기」 — 진짜 판정을 부릅니다.
//
// 흐름:
//   ① 서버에서 계획 상세를 다시 읽어 판정 입력(정규화·사업명·확정비목)을 만든다
//   ② POST /api/judge (SSE) 로 판정을 받는다 — 진행 상황이 조각으로 흘러온다
//   ③ 판정이 끝나면 서버가 «자동으로» 할일을 넣는다 (tasks:sync 를 부르면 안 된다)
//   ④ 그래서 상세를 한 번 더 읽어 최신 할일까지 반영한 계획을 돌려준다

import { 계획상세 } from "./api";
import { 판정SSE } from "./sse";
import { 상세를계획으로, 판정을상태로, 판정설명, 시각표기 } from "./adapt";
import type { ChecklistItem, RuleItem } from "./types";
import type { ExpensePlan } from "./types";
import type { 판정값 } from "./server-types";

export type 목판정 = "가능" | "조건부" | "불가" | "판단불가";

export type 판정중계 = {
  /** 진행 설명 문구. 「관련 조항을 찾는 중」 같은 것 */
  진행: (설명: string) => void;
  /** 판정이 확정된 순간. 배지를 먼저 보여주고 싶을 때 씁니다 */
  판정?: (값: { 판정: 판정값; 요약: string; 신뢰등급: string | null }) => void;
  /** 판단불가일 때만 옵니다 */
  문의초안?: (글: string) => void;
};

export type 판정결과 = {
  계획: ExpensePlan;
  판정: 판정값;
  요약: string;
  문의초안: string | null;
  저장됨: boolean;
};

function 문자(v: unknown, 기본 = ""): string {
  return typeof v === "string" ? v : 기본;
}

/**
 * 판정 1건 실행.
 *
 * 🔴 실패해도 «자동 재시도 금지». 판정 1건이 GPU 호출입니다.
 * 🔴 `목` 을 주면 목 서버에서 4-way 를 골라 그려볼 수 있습니다 — 시연 리허설용입니다.
 */
export type 대체입력 = {
  사업명?: string | null;
  확정비목?: string | null;
  정규화?: Record<string, unknown> | null;
  제목?: string | null;
  용도?: string | null;
  금액?: number | null;
};

export async function 판정실행(
  planId: string | number,
  중계: 판정중계,
  옵션?: { 목?: 목판정; signal?: AbortSignal; 대체입력?: 대체입력 },
): Promise<판정결과> {
  // 🔴 방금 만든 계획은 상세 조회가 «서버 버그로» 500 이 납니다
  //    (routes_plans.py:139 — `계획상세() got multiple values for keyword argument '정규화'`).
  //    그래서 실패하면 호출부가 들고 있던 값으로 대신 판정합니다. 담당자 수정 후에는
  //    이 대체 경로가 그냥 안 타게 됩니다.
  const 대체 = 옵션?.대체입력;
  const 이전 = await 계획상세(planId).catch((e) => {
    if (!대체) throw e;
    return {
      plan_id: typeof planId === "string" ? Number(planId) : planId,
      제목: 대체.제목 ?? null,
      확정비목: 대체.확정비목 ?? null,
      금액: 대체.금액 ?? null,
      판정: null,
      집행예정일: null,
      updated_at: null,
      사업명: 대체.사업명 ?? null,
      상태: "draft" as const,
      질문원문: null,
      용도: 대체.용도 ?? null,
      거래처: null,
      추가설명: null,
      정규화: 대체.정규화 ?? {},
      latest_decision_id: null,
      판정상세: null,
      할일: [],
      created_at: null,
    };
  });

  const 정규화 =
    이전.정규화 && Object.keys(이전.정규화).length
      ? 이전.정규화
      : {
          품목: 이전.제목 ?? "",
          용도: 이전.용도 ?? "",
          금액: 이전.금액 ?? 0,
          거래처: 이전.거래처 ?? "",
          _원문: 이전.질문원문 ?? "",
        };

  let 판정: 판정값 = null;
  let 요약 = "";
  let 해야할일: ChecklistItem[] = [];
  let 인용: RuleItem[] = [];
  let 문의초안: string | null = null;
  let 저장됨 = false;
  let 서버오류: string | null = null;

  await 판정SSE(
    {
      정규화: 정규화 as Record<string, unknown>,
      확정비목: 이전.확정비목,
      사업명: 이전.사업명,
      plan_id: typeof planId === "string" ? Number(planId) : planId,
    },
    (이름, 값) => {
      const v = (값 ?? {}) as Record<string, unknown>;
      switch (이름) {
        case "진행":
          중계.진행(문자(v["설명"], "점검하는 중"));
          break;
        case "판정":
          판정 = (v["판정"] as 판정값) ?? null;
          요약 = 문자(v["요약"]);
          중계.판정?.({
            판정,
            요약,
            신뢰등급: 문자(v["신뢰등급"]) || null,
          });
          break;
        case "해야할일":
          해야할일 = (Array.isArray(값) ? 값 : []).map((t, i) => {
            const o = (t ?? {}) as Record<string, unknown>;
            return {
              id: `ai-${i}`,
              label: 문자(o["항목"], "확인 항목"),
              description: 문자(o["설명"]),
            };
          });
          break;
        case "인용":
          인용 = (Array.isArray(값) ? 값 : []).map((c) => {
            const o = (c ?? {}) as Record<string, unknown>;
            return {
              title: [문자(o["조번호"]), 문자(o["조제목"])].filter(Boolean).join(" ") || "근거 조항",
              source: 문자(o["doc_id"]),
              description: 문자(o["원문"]),
            };
          });
          break;
        case "문의초안":
          문의초안 = typeof 값 === "string" ? 값 : 문자(v["문의초안"]);
          if (문의초안) 중계.문의초안?.(문의초안);
          break;
        case "저장":
          저장됨 = v["저장"] === true;
          break;
        case "오류":
          // 🔴 normalize/judge 는 실패를 HTTP 500 이 아니라 «오류 이벤트» 로 보냅니다.
          //    try/catch 만으로는 안 잡힙니다.
          서버오류 = 문자(v["메시지"], "점검에 실패했습니다");
          break;
      }
    },
    { 목: 옵션?.목, signal: 옵션?.signal },
  );

  if (서버오류) throw new Error(서버오류);

  // 🔴 판정 직후 서버가 할일을 «자동으로» 넣습니다. tasks:sync 를 부르면 중복됩니다.
  //    그래서 부르지 않고, 상세를 다시 읽어 최신 상태를 가져옵니다.
  const 이후 = await 계획상세(planId).catch(() => 이전);
  const 바탕 = 상세를계획으로(이후);

  // 🔴 목 서버(SUDDOE_MOCK=1)는 판정을 계획에 «저장하지 않습니다» — `판정_저장` 이
  //    가짜 응답만 돌려줍니다. 그래서 다시 읽어도 판정이 null 입니다.
  //    스트림으로 받은 값을 «항상 우선» 쓰고, 서버가 채워준 게 있으면 그것도 씁니다.
  const 최종판정: 판정값 = 판정 ?? 이후.판정 ?? null;

  const 계획: ExpensePlan = {
    ...바탕,
    status: 판정을상태로(최종판정),
    판정: 최종판정,             // 🔴 조건부/판단불가를 화면에서 가르는 값
    aiSummary: 요약 || 바탕.aiSummary || 판정설명(최종판정),
    aiChecks: 바탕.aiChecks.length ? 바탕.aiChecks : 해야할일,
    rules: 바탕.rules.length ? 바탕.rules : 인용,
    nextAction:
      바탕.nextAction || (해야할일[0]?.label ?? ""),
    updatedAt: 시각표기(new Date().toISOString()),
  };

  return { 계획, 판정: 최종판정, 요약, 문의초안, 저장됨 };
}
