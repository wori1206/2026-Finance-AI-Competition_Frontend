"use client";

// 백엔드 주소를 아는 «유일한» 곳입니다.
//
// 규칙은 하나입니다:
//   · 내 컴퓨터에서 열었으면(localhost)  →  http://localhost:8080 (목 서버)
//   · 그 밖(배포된 사이트)               →  주소 없음 → 지금까지처럼 목 데이터로 동작
//   · NEXT_PUBLIC_API_BASE 를 넣으면     →  그 값이 항상 이깁니다
//
// 🔴 그래서 «내 컴퓨터에서 npm run dev 만 하면» 별도 설정 파일 없이 바로 붙습니다.
//    실서버 주소가 나오면 Vercel 환경변수에 NEXT_PUBLIC_API_BASE 를 넣으면 됩니다.

const 목서버 = "http://localhost:8080";

function 내컴퓨터인가(): boolean {
  if (typeof window === "undefined") return false;
  return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
}

/** 지금 부를 백엔드 주소. 빈 문자열이면 «오프라인 모드» 입니다. */
export function apiBase(): string {
  const 명시 = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/$/, "");
  if (명시) return 명시;
  return 내컴퓨터인가() ? 목서버 : "";
}

/** 서버 연동을 쓸 것인가. false 면 lib/mock-data.ts + localStorage 로 돕니다. */
export function API켜짐(): boolean {
  return apiBase().length > 0;
}

export function orgId(): string {
  return (process.env.NEXT_PUBLIC_ORG_ID ?? "").trim();
}
