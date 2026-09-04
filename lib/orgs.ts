"use client";

/**
 * 주관기관 검색 — `GET /api/orgs`
 *
 * 🔴 전에는 화면에 「경상국립대학교 창업중심대학사업단」 한 건이 박혀 있었습니다.
 *    서버에는 420건이 있는데 드롭다운에 다 넣을 수 없어서 임시로 줄여 둔 것이었고,
 *    그래서 «검색도 수정도 안 되는» 화면이 됐습니다. 이제 서버에 물어봅니다.
 *
 * 🔴 응답에 `org_id` 가 «없습니다». 밖으로 나오는 손잡이는 `slug`(역산 불가) 뿐이고,
 *    slug → org_id 는 서버 안에서만 풉니다. 프론트는 org_id 를 알 필요가 없습니다.
 */

import { GET } from "./http";
import { API켜짐 } from "./config";

export type 기관 = {
  slug: string;
  기관명: string;
  사업명: string[];
};

type 기관목록응답 = {
  총건수: number;
  페이지: number;
  크기: number;
  항목: 기관[];
};

/** 서버가 못 줄 때 화면이 비지 않게 하는 최소 목록. */
export const 예비기관: 기관 = {
  slug: "",
  기관명: "경상국립대학교 창업중심대학사업단",
  사업명: ["창업중심대학"],
};

export type 검색결과 = {
  항목: 기관[];
  총건수: number;
  /** 🔴 서버를 못 불러 예비 목록으로 답했는가. 화면이 「검색이 안 된다」를 알 수 있게. */
  폴백: boolean;
};

/**
 * 기관명 부분일치 검색. 서버가 공백을 무시하고 맞춥니다.
 *
 * @param q      검색어. 비어 있으면 앞에서부터 `크기` 건.
 * @param 사업명  주면 그 사업을 운영하는 기관만.
 */
export async function 기관검색(
  q: string,
  옵션: { 사업명?: string; 크기?: number; signal?: AbortSignal } = {},
): Promise<검색결과> {
  const 예비 = { 항목: [예비기관], 총건수: 1, 폴백: true };
  if (!API켜짐()) return 예비;
  try {
    const r = (await GET("/api/orgs", {
      q: q.trim() || undefined,
      사업명: 옵션.사업명,
      크기: 옵션.크기 ?? 20,
    })) as 기관목록응답;
    const 항목 = Array.isArray(r?.항목) ? r.항목 : [];
    // 🔴 검색어 없이 0건이면 «서버에 기관 데이터가 없는» 상태입니다. 그대로 두면
    //    온보딩 2단계에서 고를 게 없어 다음으로 못 넘어갑니다 — 화면을 막지 않습니다.
    if (!항목.length && !q.trim()) return 예비;
    return { 항목, 총건수: Number(r?.총건수) || 항목.length, 폴백: false };
  } catch {
    // 🔴 검색 실패로 온보딩을 막지 않습니다. 예비 1건으로 계속 갑니다.
    return 예비;
  }
}

/** 기관명 아래 회색 줄에 쓸 한 줄 설명. 사업이 없으면 빈 문자열. */
export function 사업요약(기관: 기관): string {
  const 목록 = (기관.사업명 ?? []).filter(Boolean);
  if (!목록.length) return "";
  return 목록.length <= 2 ? 목록.join(" · ") : `${목록.slice(0, 2).join(" · ")} 외 ${목록.length - 2}건`;
}
