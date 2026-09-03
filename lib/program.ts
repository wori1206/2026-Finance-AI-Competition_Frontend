"use client";

/**
 * 「지금 어떤 지원사업에 선정되어 있는가」 한 곳에서 관리합니다.
 *
 * 예전에는 `현재사업 = "2026 초기창업패키지"` 가 코드에 박혀 있었습니다.
 * 온보딩에서 다른 사업을 골라도 서버에는 늘 초기창업패키지로 보내졌습니다.
 * 이제 온보딩에서 고른 값이 여기에 저장되고, 비목 조회·계획 저장·AI 점검이
 * 전부 이 값을 씁니다.
 */

import { 사업목록 } from "./api";
import { API켜짐 } from "./config";

const KEY = "checkumait-선정사업";

/** 아직 아무것도 고르지 않았을 때. 서버는 「2026 」 접두사를 별칭으로 벗겨 냅니다. */
export const 기본사업 = "2026 초기창업패키지";

/** 화면이 서버에 보낼 사업명. */
export function 선택사업(): string {
  if (typeof window === "undefined") return 기본사업;
  try {
    return localStorage.getItem(KEY)?.trim() || 기본사업;
  } catch {
    return 기본사업;
  }
}

/** 온보딩에서 고른 값을 기억해 둡니다. */
export function 사업저장(이름: string): void {
  if (typeof window === "undefined") return;
  const 값 = (이름 ?? "").trim();
  if (!값) return;
  try {
    localStorage.setItem(KEY, 값);
  } catch {
    /* 저장이 막혀 있어도 이번 세션은 그냥 돌아갑니다 */
  }
}

/**
 * 온보딩 드롭다운에 채울 목록.
 * 🔴 못 가져오면 `null` 을 돌려줍니다 — 화면은 기존 하드코딩 목록을 씁니다.
 *    (서버가 죽어도 온보딩이 막히면 안 됩니다)
 */
/**
 * 저장해 둔 이름을 서버 목록의 «정확한 문자열» 로 바꿔 줍니다.
 * 프론트는 「2026 초기창업패키지」, 서버는 「초기창업패키지」라 그냥 두면
 * `<select>` 값이 목록에 없어서 엉뚱한 사업(첫 번째 항목)이 골라집니다.
 */
export function 목록에맞추기(목록: string[], 이전: string): string {
  if (!목록.length) return 이전;
  if (목록.includes(이전)) return 이전;
  const 벗김 = (s: string) => s.replace(/^\s*20\d\d\s*/, "").replace(/\s+/g, "");
  const 찾음 = 목록.find((m) => 벗김(m) === 벗김(이전));
  return 찾음 ?? 목록[0];
}

export async function 사업선택지(): Promise<string[] | null> {
  if (!API켜짐()) return null;
  try {
    const r = await 사업목록();
    const 목록 = (r?.사업 ?? [])
      .map((s) => (s?.사업명 ?? "").trim())
      .filter((s) => s.length > 0);
    return 목록.length ? 목록 : null;
  } catch {
    return null;
  }
}
