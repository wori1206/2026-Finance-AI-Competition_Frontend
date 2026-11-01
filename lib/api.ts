"use client";

// 화면이 부르는 함수는 전부 여기 있습니다. 주소를 아는 곳은 config.ts 하나입니다.

import { GET, POST, PATCH, PUT, DELETE, 인증헤더, 응답처리 } from "./http";
import type {
  계획목록응답,
  계획상세 as 계획상세형,   // 아래 같은 이름의 '함수' 와 겹쳐서 별칭으로 받습니다
  할일,
  할일목록응답,
  사업정보,
  L3현재문서,
} from "./server-types";

/* ── 사업 · 비목 ─────────────────────────────── */

/**
 * 화면 2 온보딩① 사업 선택 · 마이페이지 「공통 관리 기준」.
 * 주의: 2026-09-07 — `사업정보.우선순위규칙목록` 이 추가됐습니다(서버 커밋 `7fcd665`,
 *    `corpus.precedence_rules`, verified 행만). `lib/norms.ts` 가 이걸 읽습니다.
 */
export const 사업목록 = () =>
  GET("/api/programs") as Promise<{ 사업: 사업정보[]; 비고?: string | null }>;

/**
 * 이 기관(주관기관)에 '지금 적용 중'(status='active')인 L3 문서 목록.
 * 주의: 2026-09-07 신설(`GET /api/l3/current`) — `lib/orgs.ts:107 적용중_기준파일`
 *    하드코딩 대체용.
 *
 * 주의: `org_id` 를 인자로 받지 않습니다 — 여기서 프론트가 알 수 있는 식별자는
 *    `slug`(HMAC, 역산 불가) 뿐이고 `org_id` 는 UUID 여야 하니 slug 를 넣으면
 *    422 로 거부됩니다(`server/auth.py::_uuid인가`). org 는 로그인 토큰에서
 *    미들웨어가 정합니다(`server/auth.py` §org_id 주입) — 게스트면 서버가 빈
 *    목록을 줍니다.
 */
export const L3현재문서목록 = () => GET("/api/l3/current") as Promise<{ 문서: L3현재문서[] }>;

/**
 * 화면 9 비목 확인.
 * 주의: 비목 라벨을 화면에 '하드코딩하지 마세요' — 이 응답이 기준 데이터입니다.
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

/**
 * 화면 11 「삭제」 — v26 배포로 신설(책임자 요청, 2026-09-07).
 * 주의: 계획을 지워도 **판정 기록(`decisions`)은 안 지웁니다** — 감사 흔적으로 연결만
 *    끊습니다. `할일삭제` 는 같이 지워진 확인 항목·일정(plan_tasks) 개수입니다.
 * 주의: 없거나 남의 org 계획이면 서버가 403 이 아니라 **404** 를 줍니다(존재 자체를
 *    숨기려는 설계) — 호출부가 이걸 「이미 지워졌나 보다」 로 읽으면 됩니다.
 */
export const 계획삭제 = (planId: number | string) =>
  DELETE(`/api/plans/${planId}`) as Promise<{ 삭제: boolean; plan_id: number; 제목: string | null; 할일삭제: number }>;

/** 화면 8 저장. 사업명·품목·금액·용도가 '필수' 입니다. */
export const 계획추가 = (입력: {
  사업명: string; 품목: string; 금액: number; 용도: string;
  제목?: string; 집행예정일?: string; 거래처?: string; 추가설명?: string;
  확정비목?: string; 질문원문?: string; 정규화?: unknown;
}) => POST("/api/plans", 입력) as Promise<계획상세형>;

/* ── 할 일 ──────────────────────────────────── */

export const 할일추가 = (planId: number | string, 입력: {
  항목: string; 설명?: string;
  // 주의: 서버 `models.할일생성` 은 셋을 받습니다 (결제전·결제후·집행). 여기가 둘만
  //    적어 두면 「집행」 일정이 조용히 「결제후」로 접혀 나갑니다.
  구분?: "결제전" | "결제후" | "집행";
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

/* 주의: tasks:sync 는 '부르지 마세요'. 판정 직후 서버가 자동으로 넣습니다.
      프론트가 또 부르면 할일이 중복됩니다 (계약 문서 명시).             */

/* ── 내 정보 (화면 14) ───────────────────────── */

/** 기업 프로필. 키는 `협약`(협약 정보)·`집행내역`·`참여인력` 입니다. */
export const 프로필읽기 = () => GET("/api/profile") as Promise<Record<string, unknown>>;
export const 프로필저장 = (p: { 협약?: unknown; 집행내역?: unknown[]; 참여인력?: unknown[] }) =>
  PUT("/api/profile", p) as Promise<Record<string, unknown>>;

/* ── 기관 규정 업로드 (화면 4) ───────────────── */

/**
 * 주의: 여기만 `org_id` 를 아직 '본문(FormData)' 으로 보냅니다 — URL 이 아닙니다.
 *    서버 `routes_l3.업로드` 가 `org_id: str = Form(...)` 로 '필수' 폼필드를 받고,
 *    토큰 주입 미들웨어는 쿼리스트링만 교체하지 멀티파트 본문은 안 건드립니다.
 *    그래서 지금 빼면 업로드가 422 로 실패합니다.
 *    → 서버가 폼필드 대신 토큰에서 org_id 를 읽게 바뀌면 이 인자도 지웁니다. (백엔드 몫)
 *    URL·히스토리에는 남지 않으므로 이번 변경의 목적(주소창 누출 차단)은 충족됩니다.
 *
 * 주의: 이 함수는 `http.ts` 를 안 거치는 '직접 fetch' 라 그동안 Authorization 이
 *    아예 안 붙었습니다. 붙입니다.
 */
export async function 규정업로드(파일: File, 기관명: string, orgId?: string) {
  // 주의: 2026-09-06 — `orgId` 를 '선택' 으로 바꿉니다. 프론트는 org_id 를 알 수 없고
  //    (`lib/orgs.ts:10`), 서버가 토큰 주체로 정합니다(`routes_l3._업로드_주인` — 토큰이 우선합니다).
  //    필수로 두는 바람에 화면에서 이 함수를 '아예 부를 수 없었습니다'.
  const fd = new FormData();
  fd.append("파일", 파일);
  if (orgId) fd.append("org_id", orgId);
  fd.append("기관명", 기관명);
  // 주의: FormData 에는 Content-Type 을 직접 넣지 마세요 — 브라우저가 경계문자를 붙입니다
  const { apiBase } = await import("./config");
  const res = await fetch(`${apiBase()}/api/l3/upload`, {
    method: "POST",
    headers: await 인증헤더(),          // 게스트면 빈 객체 — 헤더가 아예 안 붙습니다
    body: fd,
  });
  return 응답처리(res) as Promise<{
    doc_id: string; 파일명: string; 확장자: string; 상태: string;
    조_건수: number | null;
    /** 상위 규정을 찾지 못한 참조 목록. */
    미해결참조: Record<string, unknown>[];
    메시지: string | null;
    // 주의: 서버는 이미 채워서 보냅니다(`server/models.py::L3업로드응답`,
    //    `routes_l3.py:367`) — pending/pass/warn/fail. warn·fail 은 「조문은 추출됐지만
    //    조·항 구조가 없어 단락으로 나눴다」는 뜻이라 호출부가 문구를 구분해야 합니다.
    파싱품질: "pending" | "pass" | "warn" | "fail" | null;
  }>;
}

/**
 * 주의: 2026-09-03 — `org_id` 인자를 '뺐습니다'. 서버가 토큰에서 기관을 정합니다.
 *    (그전에는 URL 에 `?org_id=` 로 포함되어 브라우저 히스토리에 남았습니다.)
 *    로그인 없이 부르면 게스트로 조회되어 남의 문서는 보이지 않습니다.
 */
export const 규정상태 = (docId: string) => GET(`/api/l3/${docId}`);

/* ── 서버 살았나 ─────────────────────────────── */

export const 헬스 = () =>
  GET("/api/health") as Promise<{ ok: boolean; 모드: "mock" | "real" }>;
