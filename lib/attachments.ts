"use client";

/**
 * 지출 계획에 붙인 첨부파일 — **브라우저 안에서만** 들고 있습니다.
 *
 * 🔴 서버에 계획 첨부파일 API 가 «없습니다». `POST /api/l3/upload` 는 기관 규정
 *    문서용이고 계획과 묶이지 않습니다. 그래서 파일 자체는 이 탭이 살아 있는 동안만
 *    유지되고, 새로고침하면 사라집니다. 서버에 붙는 날 이 파일만 갈아끼우면 됩니다.
 *
 * 🔴 예전에는 계획을 열 때마다 「○○ 견적서.pdf」·「○○ 참고자료.pdf」 두 건을
 *    «지어내서» 보여줬습니다. 올린 적 없는 파일이 첨부돼 있는 것처럼 보였고,
 *    반대로 새 계획에서 «실제로 붙인» 파일은 저장하는 순간 버려졌습니다.
 *    이 저장소가 그 둘을 한 번에 고칩니다.
 */

export type 첨부 = {
  id: string;
  name: string;
  size: string;
  /** 실제 파일. 있어야 내려받기가 됩니다. */
  file?: File;
};

/** 계획 id → 첨부 목록. 탭이 살아 있는 동안만. */
const 보관함 = new Map<string, 첨부[]>();

export function 크기표기(바이트: number): string {
  return 바이트 >= 1024 * 1024
    ? `${(바이트 / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(바이트 / 1024))}KB`;
}

export function 파일을첨부로(file: File, 순번: number): 첨부 {
  return {
    id: `up-${file.lastModified}-${순번}-${file.name}`,
    name: file.name,
    size: 크기표기(file.size),
    file,
  };
}

/** 새 계획에서 붙인 파일들을 그 계획 id 로 옮겨 담습니다. */
export function 첨부보관(planId: string, files: File[]): void {
  if (!planId) return;
  if (!files.length) return;              // 빈 배열로 기존 것을 지우지 않습니다
  보관함.set(planId, files.map(파일을첨부로));
}

/** 상세 화면에서 추가·삭제한 결과를 그대로 덮어씁니다. */
export function 첨부쓰기(planId: string, 목록: 첨부[]): void {
  if (!planId) return;
  if (목록.length) 보관함.set(planId, 목록);
  else 보관함.delete(planId);
}

export function 첨부읽기(planId: string): 첨부[] {
  return planId ? (보관함.get(planId) ?? []) : [];
}

/**
 * 🔴 계획을 서버에 만들면 id 가 바뀝니다 (`plan-1757…` → `6`).
 *    새 계획 화면에서 붙인 파일이 상세에서 안 보이는 걸 막습니다.
 */
export function 첨부옮기기(이전id: string, 새id: string): void {
  if (!이전id || !새id || 이전id === 새id) return;
  const 것 = 보관함.get(이전id);
  if (!것) return;
  보관함.set(새id, 것);
  보관함.delete(이전id);
}
