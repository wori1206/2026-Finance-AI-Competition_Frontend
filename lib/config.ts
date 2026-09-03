"use client";

// 백엔드 주소를 아는 «유일한» 곳입니다.
//
// 🔴 환경변수는 «모듈 최상단에서 직접» 읽어야 합니다.
//    Next.js 는 `process.env.NEXT_PUBLIC_*` 를 빌드할 때 실제 값으로 바꿔치기하는데,
//    함수 안에서 읽거나 변수를 거치면 바꿔치기가 안 되고 그대로 남습니다.
//    브라우저에는 `process.env` 가 없으니 그러면 «항상 빈 값» 이 됩니다.
//    (2026-09-02 실제로 이 문제로 배포본이 목 데이터만 보여줬습니다.)
const 빌드시_주소 = process.env.NEXT_PUBLIC_API_BASE;

// 규칙:
//   · 환경변수가 있으면            → 그 값이 항상 이깁니다
//   · 없고 내 컴퓨터(localhost)면  → http://localhost:8080 (목 서버)
//   · 그 외                       → 주소 없음 → 예시 데이터로 동작
const 목서버 = "http://localhost:8080";
const 명시된주소 = (빌드시_주소 ?? "").trim().replace(/\/$/, "");

function 내컴퓨터인가(): boolean {
  if (typeof window === "undefined") return false;
  return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
}

/** 지금 부를 백엔드 주소. 빈 문자열이면 «오프라인 모드» 입니다. */
export function apiBase(): string {
  if (명시된주소) return 명시된주소;
  return 내컴퓨터인가() ? 목서버 : "";
}

/** 서버 연동을 쓸 것인가. false 면 lib/mock-data.ts 로 돕니다. */
export function API켜짐(): boolean {
  return apiBase().length > 0;
}

// 🔴 `orgId()` 와 `NEXT_PUBLIC_ORG_ID` 는 «없앴습니다» (2026-09-03).
//    org_id 는 비밀이 아닙니다 — 백엔드가 `uuid5(uuid5(NAMESPACE_DNS,"suddoe.org"), 기관명)`
//    으로 만들고 그 네임스페이스 문자열이 레포에 그대로 있어서, 기관명만 알면 재계산됩니다
//    (백엔드 실측: 413행 중 411행이 이름만으로 재현). 그래서 「URL 에 실어도 UUID 라 아무도
//    모른다」는 방어가 아니었고, `?org_id=` 자기신고가 열려 있는 동안은 남의 지출계획이
//    열려 있었습니다.
//    → 이제 기관은 «서버가» Authorization 토큰에서 정합니다. 프론트는 주장하지 않습니다.
//    환경변수에서도 지웁니다 — 남겨두면 다음 사람이 다시 URL 에 붙입니다.
