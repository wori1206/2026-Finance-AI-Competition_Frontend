"use client";

// 서버가 «실제로» 주는 모양. 목 서버(SUDDOE_MOCK=1) 응답을 직접 캡처해 적었습니다.
// 프론트 타입(types.ts)과 이름이 달라서 adapt.ts 가 사이에서 번역합니다.

export type 판정값 = "가능" | "조건부" | "불가" | "판단불가" | null;

/** GET /api/plans 의 항목 한 줄 */
export type 계획요약 = {
  plan_id: number;
  제목: string | null;
  확정비목: string | null;
  금액: number | null;
  판정: 판정값;
  집행예정일: string | null;
  updated_at: string | null;
  사업명: string | null;
  상태: "draft" | "judged";
};

export type 계획통계 = {
  전체: number;
  확인필요: number;
  위험: number;
  특이사항없음: number;
  점검전: number;
  금액합계: number;
};

export type 계획목록응답 = {
  통계: 계획통계;
  건수: number;
  페이지: number;
  크기: number;
  항목: 계획요약[];
};

export type 할일 = {
  task_id: number;
  plan_id: number | null;
  출처: "ai" | "user";
  코드: string | null;
  구분: "결제전" | "결제후" | "집행";
  항목: string;
  설명: string | null;
  due_date: string | null;
  유형: "기타" | "계약" | "비교견적";
  날짜_사용자수정: boolean;
  상태: "준비필요" | "집행예정" | "완료";
  계획제목?: string | null;
};

export type 인용 = {
  문서?: string | null;
  조?: string | null;
  제목?: string | null;
  본문?: string | null;
  [k: string]: unknown;
};

export type 판정상세 = {
  판정?: 판정값;
  요약?: string | null;
  신뢰등급?: "A" | "B" | null;
  버전스탬프?: string | null;
  인용?: 인용[];
  전제?: unknown[];
  /** 🔴 「판단불가」일 때만 실립니다. 아니면 키 자체가 없습니다. */
  문의초안?: string | null;
  [k: string]: unknown;
} | null;

export type 계획상세 = 계획요약 & {
  질문원문: string | null;
  용도: string | null;
  거래처: string | null;
  추가설명: string | null;
  정규화: Record<string, unknown>;
  latest_decision_id: number | null;
  판정상세: 판정상세;
  할일: 할일[];
  created_at: string | null;
};

export type 할일목록응답 = { 건수: number; 항목: 할일[] };

export type 비목후보 = { 비목: string; 신뢰도: number };

export type 정규화결과 = {
  품목: string | null;
  금액: number | null;
  금액_추정여부: boolean;
  용도: string | null;
  비목후보: 비목후보[];
  하위항목: string | null;
  결제수단: string | null;
  구매명의: string | null;
  신청일: string | null;
  비교견적: string | null;
  질문원문: string | null;
};
