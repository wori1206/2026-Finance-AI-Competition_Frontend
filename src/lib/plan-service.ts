"use client";

import { INITIAL_PLANS, INITIAL_SCHEDULES } from "./mock-data";
import type { ExpensePlan, ScheduleItem } from "./types";

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

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

// API 연동 시 이 객체의 구현만 fetch 기반으로 교체합니다.
export const planService = {
  listPlans: () => Promise.resolve(normalizePlans(read(PLAN_KEY, INITIAL_PLANS))),
  savePlans: (plans: ExpensePlan[]) => { write(PLAN_KEY, plans); return Promise.resolve(plans); },
  listSchedules: () => Promise.resolve(read(SCHEDULE_KEY, INITIAL_SCHEDULES)),
  saveSchedules: (items: ScheduleItem[]) => { write(SCHEDULE_KEY, items); return Promise.resolve(items); },
};
