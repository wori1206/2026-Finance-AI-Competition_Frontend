"use client";

// 할일 체크박스 → 서버 저장
//
// 🔴 2026-09-02 서버 변경 — 할일 쓰기 3경로가 `org_id` 를 봅니다.
//    `lib/http.ts` 가 모든 요청에 자동으로 붙이므로 여기서 따로 할 게 없습니다.
// 🔴 `tasks:sync` 는 «부르지 않습니다». 판정 직후 서버가 자동으로 넣습니다.

import { API켜짐 } from "./config";
import { 할일수정 } from "./api";

/** 숫자 id 만 서버의 진짜 task_id 입니다. 판정에서 갓 나온 항목은 `ai-0` 같은 임시 id 라 건너뜁니다. */
function 서버항목인가(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * 체크 상태를 서버에 저장합니다.
 * - 저장할 필요가 없으면(오프라인·임시 id) 조용히 `false` 를 돌려줍니다.
 * - 실패하면 예외를 던집니다 — 호출부가 화면을 되돌립니다.
 */
export async function 체크저장(
  planId: string,
  taskId: string,
  완료: boolean,
): Promise<boolean> {
  if (!API켜짐()) return false;
  if (!서버항목인가(planId) || !서버항목인가(taskId)) return false;

  // 🔴 상태 어휘는 DB CHECK 로 닫혀 있습니다: 준비필요 · 집행예정 · 완료
  await 할일수정(planId, taskId, { 상태: 완료 ? "완료" : "준비필요" });
  return true;
}
