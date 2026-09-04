"use client";

// 할일(체크박스·집행 일정) → 서버 저장
//
// 🔴 `tasks:sync` 는 «부르지 않습니다». 판정 직후 서버가 자동으로 넣습니다.

import { API켜짐 } from "./config";
import { 할일수정 } from "./api";
import type { ScheduleItem } from "./types";

/** 숫자 id 만 서버의 진짜 task_id 입니다. 판정에서 갓 나온 항목은 `ai-0` 같은 임시 id 라 건너뜁니다. */
export function 서버항목인가(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * 저장 결과.
 *
 * 🔴 `없음` 을 «실패» 와 갈라 놓는 게 이 타입의 이유입니다.
 *    서버는 `WHERE task_id=? AND plan_id=? AND <org조건>` 이 0행이면 404 로
 *    「할일 123 을(를) 찾을 수 없습니다」를 돌려줍니다(`routes_tasks._실_수정`).
 *    그 문구를 그대로 사용자에게 띄우면 «고장»처럼 보이는데, 실제로는 화면이 들고
 *    있는 목록이 서버보다 낡은 것입니다 — 새로 읽으면 풀립니다.
 */
export type 저장결과 = "저장됨" | "건너뜀" | "없음" | "실패";

function 없음인가(e: unknown): boolean {
  return e instanceof Error && /찾을 수 없습니다|not found/i.test(e.message);
}

/**
 * 체크 상태를 서버에 저장합니다.
 *
 * @param 서버할일  이 계획이 «서버에서 받아온» 할일 id 집합. 주면 그 안에 없는 id 는
 *                 아예 요청을 안 보냅니다 — 낡은 화면이 404 를 만들지 않게.
 */
export async function 체크저장(
  planId: string,
  taskId: string,
  완료: boolean,
  서버할일?: ReadonlySet<string>,
): Promise<저장결과> {
  if (!API켜짐()) return "건너뜀";
  if (!서버항목인가(planId) || !서버항목인가(taskId)) return "건너뜀";
  if (서버할일 && !서버할일.has(taskId)) return "건너뜀";

  try {
    // 🔴 상태 어휘는 DB CHECK 로 닫혀 있습니다: 준비필요 · 집행예정 · 완료
    await 할일수정(planId, taskId, { 상태: 완료 ? "완료" : "준비필요" });
    return "저장됨";
  } catch (e) {
    if (없음인가(e)) return "없음";
    throw e;
  }
}

/* ── 집행 일정 ───────────────────────────────── */

/**
 * 화면의 일정 상태 → 서버 `plan_tasks.상태`.
 * 🔴 세 값 밖으로 나가면 DB CHECK 가 막습니다.
 */
const 상태사전: Record<ScheduleItem["state"], "준비필요" | "집행예정" | "완료"> = {
  "준비 필요": "준비필요",
  "집행 예정": "집행예정",
  완료: "완료",
};

/**
 * 일정 하나의 상태를 서버에 저장합니다.
 *
 * 🔴 집행 일정은 그동안 «어디에도 저장되지 않았습니다» — `plan-service.saveSchedules`
 *    가 서버가 붙어 있으면 아무것도 안 하고 끝났습니다. 그래서 완료 체크가
 *    새로고침하면 사라졌습니다. 서버에서 온 일정(숫자 task_id + 숫자 plan_id)은
 *    이제 진짜로 저장됩니다.
 *
 * 사용자가 «직접 추가»한 일정(`schedule-…` id)은 서버에 대응하는 행이 없으므로
 * 건너뜁니다 — 그건 `POST /api/plans/{id}/tasks` 를 붙이는 별개의 일입니다.
 */
export async function 일정상태저장(item: ScheduleItem): Promise<저장결과> {
  if (!API켜짐()) return "건너뜀";
  if (!서버항목인가(item.id) || !서버항목인가(item.planId)) return "건너뜀";
  try {
    await 할일수정(item.planId, item.id, { 상태: 상태사전[item.state] });
    return "저장됨";
  } catch (e) {
    if (없음인가(e)) return "없음";
    throw e;
  }
}

/**
 * 이전/다음 일정 목록을 견줘서 «상태가 바뀐 것»만 서버에 보냅니다.
 * 돌려주는 값은 저장에 실패한 일정들입니다 (호출부가 화면을 되돌립니다).
 */
export async function 일정변경저장(
  이전: ScheduleItem[],
  다음: ScheduleItem[],
): Promise<{ 실패: ScheduleItem[]; 없음: ScheduleItem[] }> {
  const 실패: ScheduleItem[] = [];
  const 없음: ScheduleItem[] = [];
  if (!API켜짐()) return { 실패, 없음 };

  const 전 = new Map(이전.map((s) => [s.id, s]));
  const 바뀐 = 다음.filter((s) => {
    const p = 전.get(s.id);
    return p != null && p.state !== s.state;
  });

  await Promise.all(
    바뀐.map(async (s) => {
      try {
        const r = await 일정상태저장(s);
        if (r === "없음") 없음.push(s);
      } catch {
        실패.push(s);
      }
    }),
  );
  return { 실패, 없음 };
}
