"use client";

import { INITIAL_PLANS, INITIAL_SCHEDULES } from "./mock-data";
import type { ExpensePlan, ScheduleItem } from "./types";
import { API켜짐 } from "./config";
import { 계획목록, 계획상세, 할일목록 } from "./api";
import { 요약을계획으로, 상세를계획으로, 할일을일정으로 } from "./adapt";

const PLAN_KEY = "checkumait-clean-plans";
const SCHEDULE_KEY = "checkumait-clean-schedules-v2";

function normalizePlans(plans: ExpensePlan[]): ExpensePlan[] {
  return plans.map(plan => {
    const legacyStatus = plan.status as string;
    const status = legacyStatus === "준비 완료" ? "특이사항 없음"
      : legacyStatus === "위험 가능성" ? "위험"
      : legacyStatus === "사전조치 필요" ? "확인 필요"
      : plan.status;
    return { ...plan, status } as ExpensePlan;
  });
}

function normalizeSchedules(items: ScheduleItem[]): ScheduleItem[] {
  const normalized = items.map((item) => {
    const legacyState = item.state as string;
    if (legacyState !== "예정") return item;
    return {
      ...item,
      state: item.type === "집행" ? "집행 예정" : "준비 필요",
    } as ScheduleItem;
  });
  const executionRows = INITIAL_SCHEDULES.filter(
    (item) => item.type === "집행",
  );
  return [
    ...normalized,
    ...executionRows.filter(
      (row) =>
        !normalized.some(
          (item) => item.planId === row.planId && item.type === "집행",
        ),
    ),
  ];
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ════════════════════════════════════════════════════════════════
// 서버 경로
//
// 🔴 NEXT_PUBLIC_API_BASE 가 비어 있으면 이 아래는 «전혀 안 탑니다».
//    지금까지의 목 데이터 + localStorage 동작이 그대로 유지됩니다.
// ════════════════════════════════════════════════════════════════

/** 목록 한 번 + 상세 병렬. 상세에 판정·할일·근거가 들어 있어 화면 11 이 삽니다. */
const 상세동시 = 20;

/**
 * 🔴 서버가 안 떠 있으면 «조용히» 목 데이터로 되돌아갑니다.
 *    백엔드를 안 켠 상태에서 화면이 텅 비면 고장난 걸로 보이기 때문입니다.
 *    (브라우저 콘솔에 안내 한 줄이 남습니다.)
 */
async function 서버계획목록(): Promise<ExpensePlan[]> {
  try {
    return await 서버계획목록_실제();
  } catch (e) {
    console.warn("[CHECKUMAIT] 백엔드에 연결하지 못해 예시 데이터로 표시합니다.", e);
    return normalizePlans(read(PLAN_KEY, INITIAL_PLANS));
  }
}

async function 서버계획목록_실제(): Promise<ExpensePlan[]> {
  const 목록 = await 계획목록({ 크기: 50 });
  const 요약들 = (목록.항목 ?? []).map(요약을계획으로);

  // 상세는 실패해도 목록은 살립니다 — 한 건이 깨져서 화면 전체가 비면 안 됩니다
  const 대상 = (목록.항목 ?? []).slice(0, 상세동시);
  const 상세들 = await Promise.all(
    대상.map((s) =>
      계획상세(s.plan_id)
        .then(상세를계획으로)
        .catch(() => null),
    ),
  );

  const 채운것 = new Map<string, ExpensePlan>();
  for (const d of 상세들) if (d) 채운것.set(d.id, d);
  return 요약들.map((p) => 채운것.get(p.id) ?? p);
}

async function 서버일정목록(): Promise<ScheduleItem[]> {
  try {
    // 🔴 `일정만: true` 는 «due_date 가 있는» 할일만 줍니다. 시드 데이터에 날짜가
    //    안 붙어 있으면 집행 일정 화면이 통째로 빕니다 — 그러면 사용자는 「기능이
    //    안 된다」고 읽습니다. 0건이면 날짜 조건을 빼고 다시 물어봅니다.
    const r = await 할일목록({ 일정만: true });
    const 항목 = r.항목 ?? [];
    if (항목.length) return 항목.map(할일을일정으로);

    const 전부 = await 할일목록({});
    return (전부.항목 ?? []).map(할일을일정으로);
  } catch (e) {
    console.warn("[CHECKUMAIT] 백엔드에 연결하지 못해 예시 일정으로 표시합니다.", e);
    return normalizeSchedules(read(SCHEDULE_KEY, INITIAL_SCHEDULES));
  }
}

// ════════════════════════════════════════════════════════════════

export const planService = {
  listPlans: (): Promise<ExpensePlan[]> =>
    API켜짐()
      ? 서버계획목록()
      : Promise.resolve(normalizePlans(read(PLAN_KEY, INITIAL_PLANS))),

  /**
   * 🔴 서버 모드에서는 저장하지 않습니다.
   *    계획 생성은 POST /api/plans, 할일 상태는 PATCH .../tasks/{id} 로 가야 합니다
   *    (api.ts 의 `계획추가` · `할일수정`). 화면 안에서의 변경은 React 상태로 보이고,
   *    새로고침하면 서버 값으로 돌아옵니다 — 아직 쓰기를 안 붙인 상태입니다.
   */
  savePlans: (plans: ExpensePlan[]): Promise<ExpensePlan[]> => {
    if (!API켜짐()) write(PLAN_KEY, plans);
    return Promise.resolve(plans);
  },

  listSchedules: (): Promise<ScheduleItem[]> =>
    API켜짐()
      ? 서버일정목록()
      : Promise.resolve(normalizeSchedules(read(SCHEDULE_KEY, INITIAL_SCHEDULES))),

  saveSchedules: (items: ScheduleItem[]): Promise<ScheduleItem[]> => {
    if (!API켜짐()) write(SCHEDULE_KEY, items);
    return Promise.resolve(items);
  },
};
