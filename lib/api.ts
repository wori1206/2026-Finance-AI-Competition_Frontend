"use client";

// 화면이 부르는 함수는 전부 여기 있습니다. 주소를 아는 곳은 config.ts 하나입니다.

import { GET, POST, PATCH, PUT } from "./http";
import type {
  계획목록응답,
  계획상세 as 계획상세형,   // 아래 같은 이름의 «함수» 와 겹쳐서 별칭으로 받습니다
  할일,
  할일목록응답,
} from "./server-types";

/* ── 사업 · 비목 ─────────────────────────────── */

/** 화면 2 온보딩① 사업 선택 */
export const 사업목록 = () =>
  GET("/api/programs") as Promise<{ 사업: { 사업명: string; 별칭: string[] }[] }>;

/**
 * 화면 9 비목 확인.
 * 🔴 비목 라벨을 화면에 «하드코딩하지 마세요» — 이 응답이 정본입니다.
 *    사업명을 주면 걸러집니다 (창업활동비는 예비창업패키지에만 있습니다).
 */
export const 비목목록 = (사업명?: string) =>
  GET("/api/vocab", { 사업명 }) as Promise<{
    비목: string[];
    별칭: Record<string, string[]> | null;
  }>;

/* ── 지출 계획 ───────────────────────────────── */

export const 계획목록 = (opt: {
  탭?: string; 사업명?: string; 확정비목?: string; q?: string;
  금액_최소?: number; 금액_최대?: number;
  정렬?: string; 페이지?: number; 크기?: number;
} = {}) => GET("/api/plans", opt) as Promise<계획목록응답>;

export const 계획상세 = (planId: number | string) =>
  GET(`/api/plans/${planId}`) as Promise<계획상세형>;

/** 화면 8 저장. 사업명·품목·금액·용도가 «필수» 입니다. */
export const 계획추가 = (입력: {
  사업명: string; 품목: string; 금액: number; 용도: string;
  제목?: string; 집행예정일?: string; 거래처?: string; 추가설명?: string;
  확정비목?: string; 질문원문?: string; 정규화?: unknown;
}) => POST("/api/plans", 입력) as Promise<계획상세형>;

/* ── 할 일 ──────────────────────────────────── */

export const 할일추가 = (planId: number | string, 입력: {
  항목: string; 설명?: string;
  구분?: "결제전" | "결제후";
  due_date?: string;
  유형?: "기타" | "계약" | "비교견적";
}) => POST(`/api/plans/${planId}/tasks`, 입력) as Promise<할일>;

export const 할일수정 = (
  planId: number | string,
  taskId: number | string,
  입력: {
    상태?: "준비필요" | "집행예정" | "완료";
    due_date?: string;
    유형?: "기타" | "계약" | "비교견적";
  },
) => PATCH(`/api/plans/${planId}/tasks/${taskId}`, 입력) as Promise<할일>;

/** 집행 일정 화면. 일정만=true 면 날짜가 있는 것만 옵니다. */
export const 할일목록 = (opt: {
  상태?: string; 구분?: string; plan_id?: number;
  일정만?: boolean; 이후?: string;
} = {}) => GET("/api/tasks", opt) as Promise<할일목록응답>;

/* 🔴 tasks:sync 는 «부르지 마세요». 판정 직후 서버가 자동으로 넣습니다.
      프론트가 또 부르면 할일이 중복됩니다 (계약 문서 명시).             */

/* ── 내 정보 (화면 14) ───────────────────────── */

export const 프로필읽기 = () => GET("/api/profile") as Promise<Record<string, unknown>>;
export const 프로필저장 = (p: { f1?: unknown; f3?: unknown[]; f4?: unknown[] }) =>
  PUT("/api/profile", p) as Promise<Record<string, unknown>>;

/* ── 기관 규정 업로드 (화면 4) ───────────────── */

export async function 규정업로드(파일: File, 기관명: string, orgId: string) {
  const fd = new FormData();
  fd.append("파일", 파일);
  fd.append("org_id", orgId);
  fd.append("기관명", 기관명);
  // ⚠️ FormData 에는 Content-Type 을 직접 넣지 마세요 — 브라우저가 경계문자를 붙입니다
  const { apiBase } = await import("./config");
  const res = await fetch(`${apiBase()}/api/l3/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("업로드에 실패했습니다");
  return res.json() as Promise<{
    doc_id: string; 파일명: string; 확장자: string; 상태: string;
    조_건수: number; dangling: number; 메시지: string;
  }>;
}

/**
 * 🔴 2026-09-02 서버 변경 — org_id 를 «반드시» 실어야 합니다.
 *    빼면 주인에게도 404 이고 온보딩이 무한 스피너가 됩니다.
 *    업로드 때 넘긴 org_id 를 그대로 쓰세요.
 */
export const 규정상태 = (docId: string, orgId: string) =>
  GET(`/api/l3/${docId}`, { org_id: orgId });

/* ── 서버 살았나 ─────────────────────────────── */

export const 헬스 = () =>
  GET("/api/health") as Promise<{ ok: boolean; 모드: "mock" | "real" }>;
