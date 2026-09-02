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
  previousStatus?: Exclude<PlanStatus, "점검 전" | "재점검 필요">;
  nextAction: string;
  updatedAt: string;
  aiSummary: string;
  aiChecks: ChecklistItem[];
  evidence: ChecklistItem[];
  rules: RuleItem[];
};

export type ScheduleItem = {
  id: string;
  planId: string;
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
