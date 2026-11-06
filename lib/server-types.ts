"use client";

// 서버가 '실제로' 주는 모양. mock 서버(SUDDOE_MOCK=1) 응답을 직접 캡처해 적었습니다.
// 프론트 타입(types.ts)과 이름이 달라서 adapt.ts 가 사이에서 번역합니다.

export type 판정값 = "가능" | "조건부" | "불가" | "판단불가" | null;

/**
 * `corpus.precedence_rules` 한 행 — L1/L2/L3 중 어느 층이 이기는지.
 * `server/models.py::우선순위규칙` 과 1:1 대응 (2026-09-07, 서버 커밋 `7fcd665`).
 */
export type 우선순위규칙 = {
  우선계층: string;
  후순위계층: string;
  범위?: string | null;
  우선규범?: string | null;
  해석?: string | null;
};

/** `GET /api/programs` 항목 한 줄. `server/models.py::사업정보` 와 1:1 대응. */
export type 사업정보 = {
  사업명: string;
  별칭: string[];
  비목체계: string | null;
  트랙범위: string | null;
  우선순위규칙목록: 우선순위규칙[];
};

/** `GET /api/l3/current` 한 건. `server/models.py::L3현재문서` 와 1:1 대응. */
export type L3현재문서 = {
  doc_id: string;
  원본파일명: string;
  version: string | null;
  시행일: string | null;
  /** 등록한 날(YYYY-MM-DD). */
  등록일?: string | null;
  파싱품질: "pending" | "pass" | "warn" | "fail" | null;
  조_건수: number;
  /** 텍스트를 얻은 방식. `"ocr"` 이면 스캔본을 OCR 로 읽은 문서입니다(금액·조번호 오인식 가능). */
  추출방식?: string | null;
};

/**
 * `POST /api/l3/upload`(202) · `GET /api/l3/{doc_id}` 응답. `server/models.py::L3업로드응답` 과 1:1 대응.
 *
 * 주의: 2026-11-03 — 기관당 기준 문서는 하나입니다. 새 문서를 읽으면 바로 그 문서로 판정하고,
 *    읽지 못하면 기존 문서를 계속 씁니다. `메시지` 가 두 경우를 이미 사용자 문장으로 담아 옵니다.
 */
export type L3처리결과 = {
  doc_id: string;
  파일명: string;
  확장자: string;
  상태: "파싱대기" | "완료" | "실패" | (string & {});
  조_건수: number | null;
  /** 상위 규정을 찾지 못한 참조 목록. */
  미해결참조: Record<string, unknown>[];
  메시지: string | null;
  파싱품질: "pending" | "pass" | "warn" | "fail" | null;
  /** `상태="실패"` 일 때만. 스캔본·보호문서·조문없음·중단 등. 안내 문구는 `메시지` 에 있습니다. */
  실패사유?: string | null;
  /** 이 기관이 지금 판정에 쓰는 기준 문서 이름. `null` 이면 공통 관리 기준만으로 판정합니다. */
  적용중_문서?: string | null;
  /** `"ocr"` 이면 스캔본을 OCR 로 읽은 문서입니다. 이 문서를 근거로 한 '가능'은 서버가 '조건부'로 낮춥니다. */
  추출방식?: string | null;
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
  /** `corpus.check_items.code`. 매칭하지 못하면 null. */
  code: string | null;
  구분: "결제전" | "결제후" | "집행";
  항목: string;
  설명: string | null;
  due_date: string | null;
  유형: "기타" | "계약" | "비교견적" | "사전승인" | "사전확인" | "증빙";
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
  /** 인용한 규정의 버전 문자열. */
  규정버전?: string | null;
  인용?: 인용[];
  /** `전제[].매핑` 값의 프로필 경로 접두어는 아직 `F1.` 형식이며 이후 `협약.` 형식으로 바뀝니다. 프론트는 이 값을 해석하지 않습니다. */
  전제?: unknown[];
  /** 참조 관계 목록. 항목 키는 `참조문자열`·`해결근거` 등입니다. */
  참조관계?: unknown[];
  /** 판정을 하향하거나 경고한 검증 사유. */
  검증사유?: string[];
  /** 주의: 「판단불가」일 때만 포함됩니다. 아니면 키 자체가 없습니다. */
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
  /** 판정 전에 답한 내용. 옛 판정에는 없습니다. */
  사용자답변?: unknown;
};

export type 할일목록응답 = { 건수: number; 항목: 할일[] };

/**
 * 정규화가 돌려주는 비목 후보 한 건.
 *
 * 주의: `설명` 은 **아직 서버가 안 보냅니다** (`server/models.py::비목후보` 는 비목·신뢰도
 *    두 칸뿐). 백엔드가 컬럼을 추가하면 그때부터 값이 포함되어 오고 화면에 자동으로 표시됩니다
 *    — 그래서 선택 필드로 둡니다. 값이 없으면 설명 줄을 아예 안 그립니다.
 *    주의: 여기에 프론트가 지어낸 문구를 채워 넣지 마세요. 없는 근거를 만드는 것이고,
 *       서버가 진짜 값을 보내기 시작하면 둘이 어긋납니다.
 */
export type 비목후보 = { 비목: string; 신뢰도: number; 설명?: string | null };

/**
 * 심층질문 — `corpus.check_items` 기반, LLM 이 만들지 않는다(2026-09-06).
 * `models.py::심층질문항목` 과 1:1 대응. `code` 로 `/api/judge` 의 `답변` 에 되돌려 보낸다.
 */
export type 심층질문선택지 = { 값: string; 라벨: string };

export type 심층질문근거 = { doc_id: string; 조번호: string };

export type 심층질문항목 = {
  code: string;
  /** 이 질문이 속한 비목. 없으면 공통 질문입니다. */
  비목?: string | null;
  질문문: string;
  유형: "예아니오" | "선택" | "숫자" | "텍스트";
  /** `유형` 이 "선택" 일 때만 채워진다. */
  선택지: 심층질문선택지[];
  /** 왜 묻는지 — 화면에 조번호만 작게 보여준다. doc_id 원문은 노출하지 않는다. */
  근거: 심층질문근거;
  필요프로필필드: string[];
};

/** `/api/judge` 요청의 `답변[]` 한 칸 — `models.py::답변항목` 과 1:1 대응. */
export type 답변항목 = { code: string; 값: unknown };

/** `POST /api/questions` 질문의 선택지. `값` 은 예·아니오·모름 중 하나입니다. */
export type 확인질문선택지 = { 라벨: string; 값: string };

/** 질문의 근거 조문. `doc_id` 는 화면에 그대로 내지 않고 `문서명보기()` 로 바꿉니다. */
export type 확인질문근거 = {
  doc_id: string;
  조번호: string;
  조제목: string;
  항호: string;
  원문: string;
};

/** 판정 전에 묻는 질문 한 개. `id` 를 `/api/judge` 의 `답변[].code` 로 되돌려 보냅니다. */
export type 확인질문 = {
  id: string;
  질문문: string;
  이유: string;
  선택지: 확인질문선택지[];
  /** 원문을 받지 못하면 null 이고, 그때는 「규정 원문 보기」를 그리지 않습니다. */
  근거: 확인질문근거 | null;
};

/** 판정 결과의 `사용자답변[]` 한 칸. `답` 은 예·아니오·모름 중 하나입니다. */
export type 사용자답변항목 = { 질문문: string; 답: string };

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
