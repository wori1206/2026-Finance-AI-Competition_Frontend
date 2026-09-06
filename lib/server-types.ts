"use client";

// 서버가 «실제로» 주는 모양. 목 서버(SUDDOE_MOCK=1) 응답을 직접 캡처해 적었습니다.
// 프론트 타입(types.ts)과 이름이 달라서 adapt.ts 가 사이에서 번역합니다.

export type 판정값 = "가능" | "조건부" | "불가" | "판단불가" | null;

/**
 * `corpus.precedence_rules` 한 행 — L1/L2/L3 중 어느 층이 이기는지.
 * `server/models.py::우선순위규칙` 과 1:1 대응 (2026-09-07, 서버 커밋 `7fcd665`).
 */
export type 우선순위규칙 = {
  우선계층: string;
  열위계층: string;
  범위?: string | null;
  우선규범?: string | null;
  해석?: string | null;
};

/** `GET /api/programs` 항목 한 줄. `server/models.py::사업정보` 와 1:1 대응. */
export type 사업정보 = {
  사업명: string;
  별칭: string[];
  비목계통: string | null;
  트랙범위: string | null;
  우선순위규칙목록: 우선순위규칙[];
};

/** `GET /api/l3/current` 한 건. `server/models.py::L3현재문서` 와 1:1 대응. */
export type L3현재문서 = {
  doc_id: string;
  원본파일명: string;
  version: string | null;
  시행일: string | null;
  파싱품질: "대기" | "pass" | "warn" | "fail" | null;
  조_건수: number;
};

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

/**
 * 정규화가 돌려주는 비목 후보 한 건.
 *
 * 🔴 `설명` 은 **아직 서버가 안 보냅니다** (`server/models.py::비목후보` 는 비목·신뢰도
 *    두 칸뿐). 백엔드가 컬럼을 붙이면 그때부터 값이 실려 오고 화면이 저절로 살아납니다
 *    — 그래서 선택 필드로 둡니다. 값이 없으면 설명 줄을 아예 안 그립니다.
 *    🔴 여기에 프론트가 지어낸 문구를 채워 넣지 마세요. 없는 근거를 만드는 것이고,
 *       서버가 진짜 값을 보내기 시작하면 둘이 어긋납니다.
 */
export type 비목후보 = { 비목: string; 신뢰도: number; 설명?: string | null };

/**
 * 심층질문 — `corpus.check_items` 기반, LLM 이 만들지 않는다(A-3, 2026-09-06 레인 Y).
 * `models.py::심층질문항목` 과 1:1 대응. `code` 로 `/api/judge` 의 `답변` 에 되돌려 보낸다.
 */
export type 심층질문선택지 = { 값: string; 라벨: string };

export type 심층질문근거 = { doc_id: string; 조번호: string };

export type 심층질문항목 = {
  code: string;
  질문문: string;
  유형: "예아니오" | "선택" | "숫자" | "텍스트";
  /** `유형` 이 "선택" 일 때만 채워진다. */
  선택지: 심층질문선택지[];
  /** 왜 묻는지 — 화면에 조번호만 작게 보여준다. doc_id 원문은 노출하지 않는다. */
  근거: 심층질문근거;
  필요F필드: string[];
};

/** `/api/judge` 요청의 `답변[]` 한 칸 — `models.py::답변항목` 과 1:1 대응. */
export type 답변항목 = { code: string; 값: unknown };

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
  심층질문: 심층질문항목[];
};
