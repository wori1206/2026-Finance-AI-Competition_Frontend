"use client";

/**
 * 「판단불가」 문의 초안을 이 탭에 붙들어 둡니다.
 *
 * 🔴 **왜 필요한가 — 서버가 초안을 저장하지 않습니다.**
 *    초안은 `main.py::_실_판정` 이 판정 «직후에» 조립해서 SSE `문의초안` 이벤트로만
 *    흘려보냅니다. 판정 행(`tenant.decisions`)은 그보다 «먼저» `orchestrate.decisions_적재()`
 *    가 쓰기 때문에 초안이 들어갈 자리가 없고, 상세 조회(`routes_plans.py::_실_상세`)가
 *    읽는 컬럼 목록에도 없습니다:
 *      판정 · 요약 · 해야할일 · 인용 · 전제 · 신뢰등급 · 버전스탬프 · 참조사슬 · 강등사유
 *    그래서 `GET /api/plans/{id}` 에는 초안이 «절대» 안 실립니다.
 *
 *    결과: AI 점검을 막 돌린 화면에서는 초안이 보이는데, 목록으로 나갔다 다시 들어오거나
 *    새로고침하면 사라집니다. 판정은 그대로 「판단불가」인데 「그래서 뭘 물어보나」만
 *    없어지는 셈이라, 사용자에겐 «가끔 뜨는 카드» 로 보입니다.
 *
 * 🔴 근본 해법은 백엔드가 초안을 `decisions` 에 같이 저장하고 `판정상세` 로 돌려주는
 *    것입니다. 그게 들어오면 `adapt.ts` 가 서버 값을 «먼저» 쓰므로 이 파일은 자연히
 *    안 쓰이게 됩니다 — 지우기만 하면 됩니다.
 *
 * 🔴 sessionStorage 입니다. 탭을 닫으면 사라지고, 다른 사람에게 안 넘어갑니다.
 *    로그아웃 때도 비웁니다 — 다음 사람이 앞사람의 문의 글을 보면 안 됩니다.
 */

const KEY = "checkumait-문의초안";

type 보관함 = Record<string, string>;

function 읽기(): 보관함 {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as 보관함) : {};
  } catch {
    return {};
  }
}

function 쓰기(값: 보관함): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(값));
  } catch {
    /* 저장이 막힌 브라우저면 그냥 «판정 직후에만» 보입니다 — 예전 동작 */
  }
}

export function 초안보관(planId: string | number, 글: string | null | undefined): void {
  const id = String(planId ?? "").trim();
  if (!id) return;
  const 함 = 읽기();
  // 🔴 빈 값이면 «지웁니다». 재판정에서 초안이 안 나왔는데 옛 글이 남아 있으면
  //    지금 판정과 안 맞는 문의를 보내게 됩니다.
  if (글 && 글.trim()) 함[id] = 글;
  else delete 함[id];
  쓰기(함);
}

export function 초안읽기(planId: string | number): string | null {
  const id = String(planId ?? "").trim();
  if (!id) return null;
  return 읽기()[id] ?? null;
}

export function 초안전부지우기(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
