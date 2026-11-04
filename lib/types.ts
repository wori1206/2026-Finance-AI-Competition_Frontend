export type PlanStatus = "점검 전" | "재점검 필요" | "특이사항 없음" | "확인 필요" | "위험";

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done?: boolean;
};

export type RuleItem = {
  title: string;
  source: string;
  description: string;
};

export type ExpensePlan = {
  id: string;
  name: string;
  purpose: string;
  amount: number;
  actualAmount?: number;
  actualDate?: string;
  executionStatus?: "결제 완료";
  plannedDate: string;
  category: string;
  vendor: string;
  status: PlanStatus;
  /**
   * 주의: 서버가 준 '원래' 판정입니다 — `status` 로는 구분할 수 없는 것을 구분합니다.
   *    「조건부」와 「판단불가」가 둘 다 노란 배지(확인 필요) 하나로 합쳐지는데,
   *    사용자가 할 일은 정반대입니다 (조건 채우기 ↔ 주관기관 문의).
   *    서버에서 온 계획에만 있습니다. 예시 데이터에는 없습니다(undefined).
   */
  판정?: "가능" | "조건부" | "불가" | "판단불가" | null;
  /**
   * 주의: 「판단불가」일 때만 서버가 주는 '주관기관에 보낼 문의 초안'.
   *    서버가 LLM 없이 판정이 가진 값(품목·금액·인용·전제)으로 작성해 보냅니다
   *    (`server/inquiry.py`). 값이 없으면 키 자체가 안 옵니다 — 지어내지 않습니다.
   */
  문의초안?: string | null;
  /**
   * 주의: 방금 받은 판정을 서버가 '저장하지 않았을 때' true. 새로고침하면 이전 판정이
   *    다시 보이므로 화면에서 그 사실을 알립니다. 서버에서 다시 읽은 계획에는 없습니다.
   */
  저장안됨?: boolean;
  previousStatus?: Exclude<PlanStatus, "점검 전" | "재점검 필요">;
  nextAction: string;
  updatedAt: string;
  aiSummary: string;
  aiChecks: ChecklistItem[];
  evidence: ChecklistItem[];
  rules: RuleItem[];
  /**
   * 주의: 2026-09-07 — 삭제 확인 모달(보류 중, B)용 '지우기 전' 개수. `aiChecks.length +
   *    evidence.length` 로는 못 씁니다 — `aiChecks` 가 결제전 할일이 없으면 '전체
   *    할일들' 로 바뀌는 경로가 있어(`adapt.ts::상세를계획으로`), 그 경우
   *    결제후 항목이 두 번 잡힙니다. 서버가 준 원본 `할일` 배열 길이를 그대로 둡니다.
   *
   * 주의: **선택 필드로 둡니다** — B(삭제 확인 모달)가 책임자 결정으로 보류돼
   *    `adapt.ts`/`mock-data.ts` 를 아직 안 건드립니다. 필수로 두면 그 파일들이
   *    전부 이 값을 채워야 해서 tsc 가 깨집니다. B 를 다시 시작할 때
   *    `adapt.ts::상세를계획으로` 에서 `d.할일?.length` 로 채우면 됩니다.
   */
  할일건수?: number;
};

export type ScheduleItem = {
  id: string;
  planId: string;
  /**
   * 주의: 이 일정이 '어느 할일에서 나왔는가' (서버 task_id).
   *    상세의 체크박스와 집행 일정의 완료 체크가 같은 것을 가리키게 하는 키입니다.
   *    사용자가 직접 만든 일정에는 없습니다.
   */
  taskId?: string;
  title: string;
  date: string;
  type: "사전승인" | "사전 확인" | "비교견적" | "계약" | "집행" | "증빙" | "기타";
  state: "집행 예정" | "준비 필요" | "완료";
  memo?: string;
  checks?: string[];
};

export type AppRoute =
  | { page: "home" }
  | { page: "plans" }
  | { page: "plan-new" }
  | { page: "plan-detail"; id: string }
  | { page: "ai-chat" }
  | { page: "schedule" }
  | { page: "rules" };
