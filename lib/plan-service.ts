"use client";

import { INITIAL_PLANS, INITIAL_SCHEDULES } from "./mock-data";
import type { ExpensePlan, ScheduleItem } from "./types";
import { API켜짐 } from "./config";
import { 계획목록, 계획상세, 할일목록 } from "./api";
import { 인증오류 } from "./http";
import { 출처기록하기 } from "./data-source";
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
// 주의: NEXT_PUBLIC_API_BASE 가 비어 있으면 이 아래는 '전혀 실행되지 않습니다'.
//    지금까지의 mock 데이터 + localStorage 동작이 그대로 유지됩니다.
// ════════════════════════════════════════════════════════════════

/** 목록 한 번 + 상세 병렬. 상세에 판정·할일·근거가 들어 있어야 화면 11 을 표시할 수 있습니다. */
const 상세동시 = 20;

/**
 * 주의: 서버가 실행 중이 아니면 '조용히' mock 데이터로 되돌아갑니다.
 *    백엔드를 안 켠 상태에서 화면이 텅 비면 고장난 걸로 보이기 때문입니다.
 *    (브라우저 콘솔에 안내 한 줄이 남습니다.)
 */
async function 서버계획목록(): Promise<ExpensePlan[]> {
  try {
    const 것 = await 서버계획목록_실제();
    출처기록하기("서버");
    return 것;
  } catch (e) {
    // 주의: '왜' 실패했는지를 기록합니다. 예전에는 콘솔 warn 한 줄뿐이라, 화면에는
    //    예시 데이터가 조용히 떴고 사용자는 그게 DB 값인 줄 알았습니다.
    //    401·403 은 「서버 장애」가 아니라 '인증 문제' 입니다 — 대응 방법이 다릅니다.
    출처기록하기(...실패사유(e));
    console.warn("[CHECKUMAIT] 백엔드에 연결하지 못해 예시 데이터로 표시합니다.", e);
    return normalizePlans(read(PLAN_KEY, INITIAL_PLANS));
  }
}

/** 예외 → 화면이 말할 수 있는 사유. */
function 실패사유(e: unknown): ["예시_미등록계정" | "예시_로그인만료" | "예시_연결실패", string | undefined] {
  if (e instanceof 인증오류) {
    return [e.상태 === 403 ? "예시_미등록계정" : "예시_로그인만료", e.message];
  }
  return ["예시_연결실패", e instanceof Error ? e.message : undefined];
}

async function 서버계획목록_실제(): Promise<ExpensePlan[]> {
  const 목록 = await 계획목록({ 크기: 50 });
  const 요약들 = (목록.항목 ?? []).map(요약을계획으로);

  // 상세는 실패해도 목록은 유지합니다 — 한 건이 실패해서 화면 전체가 비면 안 됩니다
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
  // 주의: 날짜 없는 할일도 함께 받습니다. 달력·통계·다가오는 일정은 날짜 있는 줄만 쓰고,
  //    날짜 없는 줄은 집행 일정의 「날짜 미정」 묶음에 모입니다.
  // 주의: 실패는 호출부로 넘깁니다. 예시 일정이나 빈 목록으로 바꾸면 실제 일정 상태처럼 보입니다.
  const r = await 할일목록({});
  return (r.항목 ?? []).map(할일을일정으로);
}

// ════════════════════════════════════════════════════════════════

export const planService = {
  listPlans: (): Promise<ExpensePlan[]> => {
    if (API켜짐()) return 서버계획목록();
    출처기록하기("예시_주소없음");
    return Promise.resolve(normalizePlans(read(PLAN_KEY, INITIAL_PLANS)));
  },

  /**
   * 주의: 서버 모드에서는 저장하지 않습니다.
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
