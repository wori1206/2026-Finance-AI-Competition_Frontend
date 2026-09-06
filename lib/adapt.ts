"use client";

// 서버 응답 → 화면이 쓰는 타입으로 번역합니다.
// 🔴 화면 코드(checkumait-app.tsx)를 안 고치려고 여기서 흡수합니다.

import type { ExpensePlan, PlanStatus, ScheduleItem, ChecklistItem, RuleItem } from "./types";
import type { 계획요약, 계획상세, 할일, 판정값 } from "./server-types";
import { 초안읽기 } from "./inquiry-store";

/**
 * 판정 4-way → 배지 3종.
 * 🔴 배지는 3개지만 «설명 문구는 4개» 입니다 — 조건부와 판단불가가 같은 노랑인데
 *    사용자가 할 일이 다릅니다 (조건부=조건 채우기 / 판단불가=기관 문의).
 */
export function 판정을상태로(판정: 판정값): PlanStatus {
  switch (판정) {
    case "가능":
      return "특이사항 없음";
    case "조건부":
      return "확인 필요";
    case "판단불가":
      return "확인 필요";
    case "불가":
      return "위험";
    default:
      return "점검 전";
  }
}

/** 같은 노랑이라도 문구는 갈라야 합니다. 화면 11 에서 씁니다. */
export function 판정설명(판정: 판정값): string {
  switch (판정) {
    case "가능":
      return "규정상 문제되는 부분이 확인되지 않았습니다.";
    case "조건부":
      return "조건을 충족하면 집행할 수 있습니다. 아래 항목을 먼저 확인하세요.";
    case "판단불가":
      return "규정만으로는 결론을 낼 수 없습니다. 주관기관 문의가 필요합니다.";
    case "불가":
      return "규정에 어긋날 가능성이 높습니다. 집행 전에 반드시 확인하세요.";
    default:
      return "아직 점검하지 않았습니다.";
  }
}

/**
 * 배지 옆 «제목». 🟡 두 개가 여기서 갈립니다.
 *
 * 🔴 `status` 만 보면 「조건부」와 「판단불가」가 둘 다 “추가 확인이 필요합니다”가 됩니다.
 *    사용자는 그 문장을 읽고 무엇을 해야 하는지 알 수 없습니다.
 *    판정을 못 받은 계획(예시 데이터 등)은 `null` → 예전 문구로 돌아갑니다.
 */
export function 판정제목(판정: 판정값 | undefined, 비목: string): string | null {
  const 앞 = 비목 ? `${비목} ` : "";
  switch (판정) {
    case "가능":
      return `${앞}기준으로 특이사항이 없습니다.`;
    case "조건부":
      return `${앞}기준에서 확인할 조건이 있습니다.`;
    case "판단불가":
      return `${앞}기준만으로는 결론을 낼 수 없습니다.`;
    case "불가":
      return `${앞}기준에 어긋날 가능성이 높습니다.`;
    default:
      return null; // 화면이 기존 문구를 씁니다
  }
}

/**
 * «그래서 무엇을 해야 하는가». 배지에도 요약에도 안 들어 있는 정보입니다.
 * 조건부는 사용자가 처리하고, 판단불가는 기관에 물어야 합니다 — 정반대입니다.
 */
export function 행동문구(판정: 판정값 | undefined): string | null {
  switch (판정) {
    case "조건부":
      return "아래 조건을 채우면 집행할 수 있습니다.";
    case "판단불가":
      return "규정만으로는 결론이 나지 않습니다. 집행 전에 주관기관에 확인하세요.";
    case "불가":
      return "이대로 집행하면 환수 대상이 될 수 있습니다. 반드시 먼저 확인하세요.";
    default:
      return null; // 「가능」과 미점검은 따로 시킬 일이 없습니다
  }
}

/** "2026-09-01T10:12:00+09:00" → "2026.09.01 10:12" */
export function 시각표기(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function 할일을체크로(t: 할일): ChecklistItem {
  return {
    id: String(t.task_id),
    label: t.항목,
    description: t.설명 ?? "",
    done: t.상태 === "완료",
  };
}

/**
 * L3 업로드 결과 문구의 «사실 부분». 호출부가 자기 접두사("등록했습니다 — " 등)를 붙입니다.
 *
 * 🔴 2026-09-07 — 서버가 `파싱품질`(대기/pass/warn/fail)을 이미 채워 보내는데
 *    (`server/routes_l3.py:367`) 호출부 두 곳이 `조_건수` 만 보고 성공 톤을 고정해,
 *    데모 org 문서 4개(전부 `warn` — 안내문·양식이라 조·항 구조가 없어 단락으로
 *    떨어짐)를 올려도 "조 N건을 읽었습니다"만 보였습니다. 겁주지 않되 사실대로 말합니다.
 */
export function L3등록사실(
  조_건수: number | null | undefined,
  파싱품질: "대기" | "pass" | "warn" | "fail" | null | undefined,
): string {
  if (파싱품질 === "fail") {
    return "파싱에 실패했습니다 — 조·항을 읽지 못했습니다. 판정에는 반영되지 않습니다.";
  }
  if (!조_건수) return "파싱이 진행 중입니다. 완료되면 판정에 반영됩니다.";
  if (파싱품질 === "warn") {
    return `${조_건수}개 항목을 읽었습니다. 이 문서는 조·항 구조가 없어 항목 단위로 나눴습니다.`;
  }
  return `조 ${조_건수}건을 읽었습니다.`;
}

/** 내부 doc_id → 사람이 읽는 문서명.
 *
 * 🔴 화면에 `L1_중소기업창업_지원사업_통합관리지침_제14차개정_20251223` 이 그대로
 *    나가고 있었습니다. `L1_`(계층 접두)·밑줄·끝의 8자리 날짜는 «우리 내부 표기» 라
 *    사용자에게는 뜻이 없습니다. 근거를 보여주는 자리에서 제일 먼저 눈에 띄는 줄이라
 *    이것 하나로 화면이 «내부 도구» 처럼 보입니다.
 * 🔴 문서를 «바꾸는» 게 아니라 «읽는 이름» 만 만듭니다 — doc_id 자체는 인용 대조에
 *    그대로 쓰입니다. 규칙에 안 맞는 id 는 건드리지 않고 그대로 돌려줍니다.
 */
export function 문서명보기(docId: string): string {
  if (!docId) return "";
  let s = docId.replace(/^L[123]_/, "");
  s = s.replace(/_(\d{4})(\d{2})(\d{2})$/, " ($1.$2.$3)");
  s = s.replace(/제(\d+)차개정/, "제$1차 개정");
  s = s.replace(/_/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

// 조문 항 마커. `scripts/llm_validate.py:_항마커` 와 같은 목록 — 서버가 «조 전체» 를
// 잘라주지 않은 경우(아래 항추출) 프론트가 같은 규칙으로 다시 잘라야 짝이 맞는다.
const 항마커 = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
];

/** 조 본문에서 `항호`(예: "③" · "③④")가 가리키는 항만 잘라낸다.
 *
 * 🔴 2026-09-07(레인 F2) — `scripts/llm_validate.py:_항_추출()` 과 같은 규칙을 프론트에
 *    옮긴 것. 서버는 `종류="article"`(조문 전체 소스)일 때만 이 자르기를 하고,
 *    `종류="chunk"`(청크가 이미 항 단위라고 가정)는 자르지 않는다(`llm_schema.py:144`
 *    주석). 그런데 실화면(제38조 외주용역비)에서는 그 가정이 깨져 청크가 조 전체
 *    (10개 항)를 통째로 담고 있었다 — `항호`(③④)는 맞게 왔는데 `원문`은 안 잘렸다.
 *    백엔드를 고치는 대신(레인 밖) 프론트가 같은 규칙으로 한 번 더 잘라 방어한다.
 * 🔴 **자르기지 요약이 아니다** — 마커를 못 찾으면 원문을 그대로 돌려준다(「인용은
 *    생성이 아니라 추출」, `scripts/llm_validate.py:93`와 같은 원칙). 지어내지 않는다.
 */
export function 항추출(본문: string, 항호: string): string {
  if (!본문) return "";
  const 마커목록 = Array.from(항호 || "").filter((ch) => 항마커.includes(ch));
  if (!마커목록.length) return 본문;
  const k = 본문.indexOf(마커목록[0]);
  if (k < 0) return 본문;
  const 끝마커위치 = 본문.indexOf(마커목록[마커목록.length - 1], k);
  let end = 본문.length;
  if (끝마커위치 >= 0) {
    for (const m of 항마커) {
      const i = 본문.indexOf(m, 끝마커위치 + 1);
      if (i > 0 && i < end) end = i;
    }
  }
  const 잘린 = 본문.slice(k, end).trim();
  return 잘린 || 본문;
}

/** 서버 `인용[]`(원시 딕셔너리 배열) → 화면에 낼 `RuleItem[]`.
 *
 * 🔴 2026-09-06 — 여기서 읽던 여섯 키(제목·조·문서·출처·본문·설명)가 **서버 스키마에
 *    하나도 없었습니다.** 정본은 `scripts/llm_schema.py:208 class 인용` 이고
 *    s번호 · doc_id · 조번호 · 조제목 · 항호 · 원문 · 원문범위 · version · extraction 입니다.
 *    그래서 실서버 판정에서 「적용 근거 2건」인데 각 줄이 «근거 조항»(폴백) + 빈칸으로
 *    나갔습니다 — 조문 내용이 통째로 안 보였습니다 (2026-09-06 production 실화면 확인).
 *    🔴 `lib/judge.ts` 는 «이 함수를 안 쓰고» 같은 매핑을 자기 안에 따로 두고 있었습니다
 *       — 같은 서버 응답을 두 파일이 서로 다른 키로 읽던 문제가 재발했습니다(2026-09-07
 *       레인 F2, ai-33 실화면 확인). `judge.ts` 도 이 함수 하나로 모읍니다.
 * 🔴 2026-09-07(레인 F2) — **같은 (doc_id, 조번호) 는 한 건으로 접습니다.** 실화면에서
 *    「제38조 외주용역비」가 항호만 다른 두 건으로 와서, 조 전체(10개 항) 원문이 그대로
 *    두 번 찍혔습니다 — 실제로 걸리는 건 ③·④항뿐이었습니다. 항호를 합쳐 제목에 붙이고,
 *    본문은 `항추출()`로 해당 항만 남깁니다(원문에 없는 문장은 만들지 않습니다).
 */
export function 인용정리(인용들: Record<string, unknown>[]): RuleItem[] {
  const 문자 = (c: Record<string, unknown>, k: string) =>
    typeof c[k] === "string" ? (c[k] as string) : "";

  const 그룹: Map<
    string,
    { 조번호: string; 조제목: string; doc_id: string; version: string; 항호들: string[]; 조각들: string[] }
  > = new Map();
  const 순서: string[] = [];

  for (const c of 인용들) {
    const doc_id = 문자(c, "doc_id");
    const 조번호 = 문자(c, "조번호");
    const 항호 = 문자(c, "항호");
    const key = `${doc_id}::${조번호}`;
    if (!그룹.has(key)) {
      그룹.set(key, {
        조번호,
        조제목: 문자(c, "조제목"),
        doc_id,
        version: 문자(c, "version"),
        항호들: [],
        조각들: [],
      });
      순서.push(key);
    }
    const g = 그룹.get(key)!;
    if (항호 && !g.항호들.includes(항호)) g.항호들.push(항호);
    const 조각 = 항추출(문자(c, "원문"), 항호);
    if (조각 && !g.조각들.includes(조각)) g.조각들.push(조각);
  }

  return 순서.map((key) => {
    const g = 그룹.get(key)!;
    const 항호결합 = g.항호들.join("");
    return {
      title:
        [g.조번호, g.조제목].filter(Boolean).join(" ") +
          (항호결합 ? ` ${항호결합}` : "") || "근거 조항",
      source: [문서명보기(g.doc_id), g.version].filter(Boolean).join(" · "),
      description: g.조각들.join("\n"),
    };
  });
}

/** 목록 한 줄 → ExpensePlan (상세 필드는 비어 있습니다) */
export function 요약을계획으로(s: 계획요약): ExpensePlan {
  return {
    id: String(s.plan_id),
    name: s.제목 ?? "(제목 없음)",
    purpose: "",
    amount: s.금액 ?? 0,
    plannedDate: s.집행예정일 ?? "",
    category: s.확정비목 ?? "",
    vendor: "",
    status: 판정을상태로(s.판정),
    판정: s.판정 ?? null,       // 🔴 접히기 «전» 의 원래 값 (조건부/판단불가 구분용)
    nextAction: "",
    updatedAt: 시각표기(s.updated_at),
    aiSummary: "",
    aiChecks: [],
    evidence: [],
    rules: [],
  };
}

/** 상세 → ExpensePlan (판정·할일·근거까지 채웁니다) */
export function 상세를계획으로(d: 계획상세): ExpensePlan {
  const 기본 = 요약을계획으로(d);
  const 할일들 = d.할일 ?? [];
  const 결제전 = 할일들.filter((t) => t.구분 === "결제전");
  const 결제후 = 할일들.filter((t) => t.구분 === "결제후");
  const 남은것 = 할일들.find((t) => t.상태 !== "완료");
  const 상세 = d.판정상세 ?? null;
  const 인용들 = Array.isArray(상세?.인용) ? (상세?.인용 as Record<string, unknown>[]) : [];

  return {
    ...기본,
    purpose: d.용도 ?? "",
    vendor: d.거래처 ?? "",
    nextAction: 남은것?.항목 ?? "",
    aiSummary:
      (typeof 상세?.요약 === "string" ? 상세.요약 : "") || 판정설명(d.판정),
    // 🔴 결제전이 없으면 「집행」까지 포함해 보여줍니다 — 빈 화면보다 낫습니다
    aiChecks: (결제전.length ? 결제전 : 할일들).map(할일을체크로),
    evidence: 결제후.map(할일을체크로),
    rules: 인용정리(인용들),
    /**
     * 🔴 서버는 «아직» 초안을 안 돌려줍니다 — `_실_상세` 가 읽는 decisions 컬럼에
     *    문의초안이 없습니다(판정 직후 SSE 로만 흘러갑니다). 그래서 이 탭이 받아 둔
     *    값으로 메웁니다. 백엔드가 `판정상세.문의초안` 을 싣기 시작하면 그쪽이 이깁니다.
     *
     * 🔴 「판단불가」일 때만 씁니다. 재판정으로 「가능」이 되었는데 옛 초안이 남아
     *    있으면, 지금 판정과 안 맞는 문의를 보내게 됩니다.
     */
    문의초안:
      (typeof 상세?.문의초안 === "string" ? 상세.문의초안 : null) ??
      (d.판정 === "판단불가" ? 초안읽기(d.plan_id) : null),
  };
}

const 유형표: Record<string, ScheduleItem["type"]> = {
  계약: "계약",
  비교견적: "비교견적",
  기타: "기타",
};

const 상태표: Record<string, ScheduleItem["state"]> = {
  준비필요: "준비 필요",
  집행예정: "집행 예정",
  완료: "완료",
};

/**
 * 🔴 서버 할일의 `due_date` 는 «없을 수 있습니다» — 체크리스트에만 있고 캘린더에는
 *    안 올리겠다는 뜻입니다(서버 models.py 주석). 그런데 결제 전 확인이 하나도
 *    일정으로 안 잡히면 화면이 통째로 비어서, 우리는 그럴 때 전체 할일로 채웁니다.
 *    그 길로 들어온 항목은 날짜가 빈 문자열이라 목록·캘린더에 **「0/0」** 으로 찍혔습니다.
 *
 *    그래서 날짜가 없으면 시연용 기본값을 넣습니다 — 10월 초. 한 날에 몰리면
 *    캘린더가 안 읽히므로 task_id 로 10/01~10/07 에 고르게 흩뿌립니다.
 */
function 기본마감일(task_id: number | string): string {
  const n = Number(task_id);
  const 일 = 1 + (Number.isFinite(n) ? Math.abs(Math.trunc(n)) % 7 : 0);
  return `${new Date().getFullYear()}-10-${String(일).padStart(2, "0")}`;
}

export function 할일을일정으로(t: 할일): ScheduleItem {
  return {
    id: String(t.task_id),
    taskId: String(t.task_id),      // 🔴 상세 체크박스와 이어지는 열쇠
    planId: t.plan_id === null ? "" : String(t.plan_id),
    title: t.항목,
    date: t.due_date || 기본마감일(t.task_id),
    type: t.구분 === "집행" ? "집행" : (유형표[t.유형] ?? "기타"),
    state: 상태표[t.상태] ?? "준비 필요",
    memo: t.설명 ?? undefined,
  };
}
