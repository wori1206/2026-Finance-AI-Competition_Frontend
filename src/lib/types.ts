export type PlanStatus = "특이사항 없음" | "확인 필요" | "위험";

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
  plannedDate: string;
  category: string;
  vendor: string;
  status: PlanStatus;
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
  state: "예정" | "준비 필요" | "완료";
};

export type AppRoute =
  | { page: "home" }
  | { page: "plans" }
  | { page: "plan-new" }
  | { page: "plan-detail"; id: string }
  | { page: "ai-chat" }
  | { page: "schedule" }
  | { page: "rules" };
