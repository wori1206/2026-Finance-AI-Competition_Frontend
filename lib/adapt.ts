"use client";

// 서버 응답 → 화면이 쓰는 타입으로 번역합니다.
// 🔴 화면 코드(checkumait-app.tsx)를 안 고치려고 여기서 흡수합니다.

import type { ExpensePlan, PlanStatus, ScheduleItem, ChecklistItem, RuleItem } from "./types";
import type { 계획요약, 계획상세, 할일, 판정값 } from "./server-types";

/**
 * 판정 4-way → 배지 3종.
 * 🔴 배지는 3개지만 «설명 문구는 4개» 입니다 — 조건부와 판단불가가 같은 노랑인데
 *    사용자가 할 일이 다릅니다 (조건부=조건 채우기 / 판단불가=기관 문의).
 */
export function 판정을상태로(판정: 판정값): PlanStatus {
  switch (판정) {
    case "가능":
      return "특이사항 없음";
    case "조건부":
      return "확인 필요";
    case "판단불가":
      return "확인 필요";
    case "불가":
      return "위험";
    default:
      return "점검 전";
  }
}

/** 같은 노랑이라도 문구는 갈라야 합니다. 화면 11 에서 씁니다. */
export function 판정설명(판정: 판정값): string {
  switch (판정) {
    case "가능":
      return "규정상 문제되는 부분이 확인되지 않았습니다.";
    case "조건부":
      return "조건을 충족하면 집행할 수 있습니다. 아래 항목을 먼저 확인하세요.";
    case "판단불가":
      return "규정만으로는 결론을 낼 수 없습니다. 주관기관 문의가 필요합니다.";
    case "불가":
      return "규정에 어긋날 가능성이 높습니다. 집행 전에 반드시 확인하세요.";
    default:
      return "아직 점검하지 않았습니다.";
  }
}

/**
 * 배지 옆 «제목». 🟡 두 개가 여기서 갈립니다.
 *
 * 🔴 `status` 만 보면 「조건부」와 「판단불가」가 둘 다 “추가 확인이 필요합니다”가 됩니다.
 *    사용자는 그 문장을 읽고 무엇을 해야 하는지 알 수 없습니다.
 *    판정을 못 받은 계획(예시 데이터 등)은 `null` → 예전 문구로 돌아갑니다.
 */
export function 판정제목(판정: 판정값 | undefined, 비목: string): string | null {
  const 앞 = 비목 ? `${비목} ` : "";
  switch (판정) {
    case "가능":
      return `${앞}기준으로 특이사항이 없습니다.`;
    case "조건부":
      return `${앞}기준에서 확인할 조건이 있습니다.`;
    case "판단불가":
      return `${앞}기준만으로는 결론을 낼 수 없습니다.`;
    case "불가":
      return `${앞}기준에 어긋날 가능성이 높습니다.`;
    default:
      return null; // 화면이 기존 문구를 씁니다
  }
}

/**
 * «그래서 무엇을 해야 하는가». 배지에도 요약에도 안 들어 있는 정보입니다.
 * 조건부는 사용자가 처리하고, 판단불가는 기관에 물어야 합니다 — 정반대입니다.
 */
export function 행동문구(판정: 판정값 | undefined): string | null {
  switch (판정) {
    case "조건부":
      return "아래 조건을 채우면 집행할 수 있습니다.";
    case "판단불가":
      return "규정만으로는 결론이 나지 않습니다. 집행 전에 주관기관에 확인하세요.";
    case "불가":
      return "이대로 집행하면 환수 대상이 될 수 있습니다. 반드시 먼저 확인하세요.";
    default:
      return null; // 「가능」과 미점검은 따로 시킬 일이 없습니다
  }
}

/** "2026-09-01T10:12:00+09:00" → "2026.09.01 10:12" */
export function 시각표기(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function 할일을체크로(t: 할일): ChecklistItem {
  return {
    id: String(t.task_id),
    label: t.항목,
    description: t.설명 ?? "",
    done: t.상태 === "완료",
  };
}

function 인용을규정으로(c: Record<string, unknown>): RuleItem {
  const 문자 = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
  return {
    title: 문자("제목") || 문자("조") || "근거 조항",
    source: 문자("문서") || 문자("출처") || "",
    description: 문자("본문") || 문자("설명") || "",
  };
}

/** 목록 한 줄 → ExpensePlan (상세 필드는 비어 있습니다) */
export function 요약을계획으로(s: 계획요약): ExpensePlan {
  return {
    id: String(s.plan_id),
    name: s.제목 ?? "(제목 없음)",
    purpose: "",
    amount: s.금액 ?? 0,
    plannedDate: s.집행예정일 ?? "",
    category: s.확정비목 ?? "",
    vendor: "",
    status: 판정을상태로(s.판정),
    판정: s.판정 ?? null,       // 🔴 접히기 «전» 의 원래 값 (조건부/판단불가 구분용)
    nextAction: "",
    updatedAt: 시각표기(s.updated_at),
    aiSummary: "",
    aiChecks: [],
    evidence: [],
    rules: [],
  };
}

/** 상세 → ExpensePlan (판정·할일·근거까지 채웁니다) */
export function 상세를계획으로(d: 계획상세): ExpensePlan {
  const 기본 = 요약을계획으로(d);
  const 할일들 = d.할일 ?? [];
  const 결제전 = 할일들.filter((t) => t.구분 === "결제전");
  const 결제후 = 할일들.filter((t) => t.구분 === "결제후");
  const 남은것 = 할일들.find((t) => t.상태 !== "완료");
  const 상세 = d.판정상세 ?? null;
  const 인용들 = Array.isArray(상세?.인용) ? (상세?.인용 as Record<string, unknown>[]) : [];

  return {
    ...기본,
    purpose: d.용도 ?? "",
    vendor: d.거래처 ?? "",
    nextAction: 남은것?.항목 ?? "",
    aiSummary:
      (typeof 상세?.요약 === "string" ? 상세.요약 : "") || 판정설명(d.판정),
    // 🔴 결제전이 없으면 「집행」까지 포함해 보여줍니다 — 빈 화면보다 낫습니다
    aiChecks: (결제전.length ? 결제전 : 할일들).map(할일을체크로),
    evidence: 결제후.map(할일을체크로),
    rules: 인용들.map(인용을규정으로),
    // 🔴 판정 전문에 같이 저장됩니다. 이걸 안 읽으면 새로고침하는 순간 초안이 사라져
    //    「아까 있던 문의 글이 어디 갔나」가 됩니다.
    문의초안: typeof 상세?.문의초안 === "string" ? 상세.문의초안 : null,
  };
}

const 유형표: Record<string, ScheduleItem["type"]> = {
  계약: "계약",
  비교견적: "비교견적",
  기타: "기타",
};

const 상태표: Record<string, ScheduleItem["state"]> = {
  준비필요: "준비 필요",
  집행예정: "집행 예정",
  완료: "완료",
};

/**
 * 🔴 서버 할일의 `due_date` 는 «없을 수 있습니다» — 체크리스트에만 있고 캘린더에는
 *    안 올리겠다는 뜻입니다(서버 models.py 주석). 그런데 결제 전 확인이 하나도
 *    일정으로 안 잡히면 화면이 통째로 비어서, 우리는 그럴 때 전체 할일로 채웁니다.
 *    그 길로 들어온 항목은 날짜가 빈 문자열이라 목록·캘린더에 **「0/0」** 으로 찍혔습니다.
 *
 *    그래서 날짜가 없으면 시연용 기본값을 넣습니다 — 10월 초. 한 날에 몰리면
 *    캘린더가 안 읽히므로 task_id 로 10/01~10/07 에 고르게 흩뿌립니다.
 */
function 기본마감일(task_id: number | string): string {
  const n = Number(task_id);
  const 일 = 1 + (Number.isFinite(n) ? Math.abs(Math.trunc(n)) % 7 : 0);
  return `${new Date().getFullYear()}-10-${String(일).padStart(2, "0")}`;
}

export function 할일을일정으로(t: 할일): ScheduleItem {
  return {
    id: String(t.task_id),
    taskId: String(t.task_id),      // 🔴 상세 체크박스와 이어지는 열쇠
    planId: t.plan_id === null ? "" : String(t.plan_id),
    title: t.항목,
    date: t.due_date || 기본마감일(t.task_id),
    type: t.구분 === "집행" ? "집행" : (유형표[t.유형] ?? "기타"),
    state: 상태표[t.상태] ?? "준비 필요",
    memo: t.설명 ?? undefined,
  };
}
