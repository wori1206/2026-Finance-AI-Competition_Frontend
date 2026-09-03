"use client";

/**
 * 마이페이지 ↔ `GET/PUT /api/profile`
 *
 * 🔴 서버의 「프로필」은 이름·이메일이 아닙니다. 판정 엔진이 전제로 쓰는
 *    「협약기간 + 사업비(정부지원/자기부담)」입니다. (F1)
 *    F3(집행내역)·F4(인력)는 이번 범위 밖이라 건드리지 않고 그대로 둡니다.
 *
 * 🔴 목 서버(`SUDDOE_MOCK=1`)는 저장을 «받지 않습니다» —
 *    `PUT` 이 `{"저장": false, "이유": "목 모드 …"}` 를 돌려줍니다.
 *    이건 오류가 아니므로 빨간 오류로 보여주면 안 됩니다.
 */

import { 프로필읽기, 프로필저장 } from "./api";
import { API켜짐 } from "./config";

export type 협약정보 = {
  시작일: string; // "2026-03-01" · 없으면 ""
  종료일: string;
  정부지원: number;
  자기부담: number;
};

function 숫자(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function 글자(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 서버가 「의미 있는 값」을 줬는가. 목 서버는 전부 0/null 이라 false 입니다. */
export function 값있음(c: 협약정보): boolean {
  return Boolean(c.시작일 || c.종료일 || c.정부지원 || c.자기부담);
}

export async function 협약읽기(): Promise<협약정보 | null> {
  if (!API켜짐()) return null;
  try {
    const r = await 프로필읽기();
    const f1 = ((r ?? {})["f1"] ?? {}) as Record<string, unknown>;
    return {
      시작일: 글자(f1["협약시작일"]),
      종료일: 글자(f1["협약종료일"]),
      정부지원: 숫자(f1["정부지원_현금"]),
      자기부담: 숫자(f1["자기부담_현금"]),
    };
  } catch {
    return null;
  }
}

export type 저장결과 = "저장됨" | "서버가안받음" | "실패";

export async function 협약쓰기(c: 협약정보): Promise<저장결과> {
  if (!API켜짐()) return "서버가안받음";
  try {
    const r = (await 프로필저장({
      f1: {
        정부지원_현금: c.정부지원,
        자기부담_현금: c.자기부담,
        협약시작일: c.시작일 || null,
        협약종료일: c.종료일 || null,
      },
    })) as Record<string, unknown>;
    return r?.["저장"] === false ? "서버가안받음" : "저장됨";
  } catch {
    return "실패";
  }
}

/* ── 화면 표기 ─────────────────────────────── */

export function 원(n: number): string {
  return `${(n || 0).toLocaleString("ko-KR")}원`;
}

/** "2026-03-01" → "2026.03.01" · 없으면 "—" */
export function 날짜표기(s: string): string {
  return s ? s.replace(/-/g, ".") : "—";
}
