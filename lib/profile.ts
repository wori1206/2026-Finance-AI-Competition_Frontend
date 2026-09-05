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

/**
 * 서버가 아무 값도 못 줄 때 화면이 「—」와 「0원」이 되지 않게 하는 시연 기본값.
 * 🔴 여러 화면이 각자 다른 기본값을 들고 있으면 홈과 마이페이지가 어긋납니다.
 *    한 곳에 둡니다.
 */
export const 시연협약: 협약정보 = {
  시작일: "2026-03-01",
  종료일: "2026-12-31",
  정부지원: 50000000,
  자기부담: 0,
};

/**
 * 🔴 협약 정보를 이 브라우저에 기억합니다.
 *
 *    홈·사이드바·마이페이지가 각자 값을 들고 있어서, 마이페이지에서 고쳐도 홈은
 *    2026.03.01~12.31 이 그대로 남았습니다(홈은 아예 화면에 박혀 있었습니다).
 *    목 서버는 저장을 안 받으므로 서버만 믿으면 고친 값이 사라집니다.
 *    그래서 서버 값을 «먼저» 쓰되, 없으면 여기 기억한 값으로 메웁니다.
 */
const 협약KEY = "checkumait-협약정보";

export function 협약기억(c: 협약정보): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(협약KEY, JSON.stringify(c));
  } catch {
    /* 무시 */
  }
}

export function 기억된협약(): 협약정보 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(협약KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as 협약정보;
    if (!v || typeof v !== "object") return null;
    return {
      시작일: 글자(v.시작일),
      종료일: 글자(v.종료일),
      정부지원: 숫자(v.정부지원),
      자기부담: 숫자(v.자기부담),
    };
  } catch {
    return null;
  }
}

/**
 * 종료일까지 남은 날. 없으면 `null`.
 * 🔴 「D-129」가 화면에 박혀 있어서 날짜가 지나도 그대로였습니다.
 */
export function 남은날(종료일: string): number | null {
  if (!종료일) return null;
  const 끝 = new Date(`${종료일}T00:00:00`).getTime();
  if (Number.isNaN(끝)) return null;
  const 오늘 = new Date();
  const 기준 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate()).getTime();
  return Math.ceil((끝 - 기준) / 86400000);
}

/**
 * 화면에 쓰는 D-day 표기. 협약이 없으면 `null`(아무것도 안 그림).
 * 🔴 지난 협약에 「D--554」가 찍히던 자리입니다 — 음수는 「종료」로 말합니다.
 */
export function 디데이표기(종료일: string): string | null {
  const 남음 = 남은날(종료일);
  if (남음 == null) return null;
  if (남음 > 0) return `D-${남음}`;
  return 남음 === 0 ? "D-DAY" : "종료";
}

/** "2026-03-01" ~ "2026-12-31" → "2026.03.01 ~ 2026.12.31" */
export function 기간표기(시작일: string, 종료일: string): string {
  if (!시작일 && !종료일) return "—";
  return `${날짜표기(시작일)} ~ ${날짜표기(종료일)}`;
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
