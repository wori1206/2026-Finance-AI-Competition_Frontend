"use client";

// 화면 10 「추가 확인」 — 판정 전에 사용자에게 물을 확인 질문을 서버에서 받습니다.
//
// 확인 질문을 받지 못하면 실패를 알리고 다시 시도합니다.

import { SSE, 진행항목정리, type 진행항목 } from "./sse";
import { 용어풀이정리, 분류정리 } from "./adapt";
import type { 확인질문, 확인질문선택지, 확인질문근거, 추가입력칸, 용어풀이항목, 부가세구분, 분류값 } from "./server-types";

export type 질문입력 = {
  사업명?: string | null;
  /** v045: 새 경로 사업은 보내지 않습니다. 서버가 품목 → 세목 → 비목으로 정해 응답 `분류` 로 알려 줍니다. */
  확정비목?: string;
  확정세목?: string | null;
  부가세구분?: 부가세구분;
  세부유형?: string | null;
  품목: string;
  금액: number | null;
  용도: string;
  질문원문?: string;
  조사ID?: string;
  웹조사?: boolean;
  /** 옛 화면 호환. v046 부터 서버는 조사에 쓰지 않습니다(지출 항목 · 사용 목적 낱말로 검색). */
  공개검색어?: string;
  판매URL?: string;
  /** v046: 업체 정보 조사에 씁니다(선택). */
  거래처?: string;
  조사답변?: 조사답변[];
  /** v047: 공개 정보를 못 찾았을 때 받은 한 문장 품목 설명. 서버가 분류 자료로 씁니다. */
  품목설명?: string;
  /** v048: 재조사 후보(응답 `재조사.후보`)에 대한 답. 판정 요청에는 보내지 않습니다(서버가 조사 세션에 둠). */
  재조사답변?: 조사답변[];
};

/** `질문` 은 서버가 검사한 화면용 확인 문장(없으면 옛 서버), `질문종류`=기본 이면 유형 이름만 든 기본 문장입니다. 판정에는 `내용`(발췌)만 갑니다. */
/** v056: `종류`=거래유형 이면 공개 검색 결과가 아니라 서버가 만든 거래 유형 확인 문장입니다(출처 없음). 화면에 내지 않는 값입니다. */
/** 자금 확인: `종류`=자금 이면 서버가 만든 자금 확인 문장이고(출처 없음), `자금` 은 그 문장의 자금 이름입니다(화면은 `질문` 만 냅니다). */
export type 조사후보 = { id: string; 유형: string; 내용: string; 질문?: string; 질문종류?: string; 확인문장?: string; 종류?: string; 자금?: string; 상태: string; 출처: { 제목: string; url: string; 발췌?: string }[] };
/** v047: [맞아요] | [직접 입력하기]. 직접입력이면 정정(사용자가 쓴 한 문장 설명)이 꼭 있어야 합니다(서버가 400). */
export type 조사답변 = { id: string; 답: "맞아요" | "직접입력"; 정정?: string };
export type 조사결과 = { 상태?: string; 확인한정보?: (조사후보 & { 답?: string; 정정?: string })[]; 업체이용조건?: 조사후보[]; 미확인?: 조사후보[]; 부족정보?: string[]; 사용자확인?: { 항목: string; 질문: string }[] };

/** `질문` 과 `추가입력` 이 둘 다 비어 있으면 확인 화면 없이 바로 판정합니다. */
export type 질문결과 = {
  상태?: string;
  질문세트: string | null;
  질문: 확인질문[];
  추가입력: 추가입력칸[];
  용어풀이: 용어풀이항목[];
  조사ID?: string;
  조사후보?: 조사후보[];
  사용자확인?: { 항목: string; 질문: string }[];
  부족정보?: string[];
  /** v045: 서버가 정한 분류와 안내 문장(「… 기준으로 확인할게요.」). 비목을 보내 물은 요청에는 없습니다. */
  분류?: 분류값 | null;
  분류안내?: string;
  /** v048: 상태 「분류없음」 일 때 화면이 할 일. 재조사확인 · 설명입력 · 다시시도 · 판정 (화면에 내지 않는 값) */
  다음행동?: string;
  /** v048: 다음행동 재조사확인 일 때 다시 물을 품목 정보. */
  재조사후보?: 조사후보[];
  /** v056: 재조사 후보의 종류. 「거래유형」 이면 거래 유형 확인 카드, 「자금」 이면 자금 확인 카드(둘 다 하나만 고름),
   *  없거나 모르는 값이면 지금 재조사 카드입니다(화면에 내지 않는 값). */
  재조사종류?: string;
  /** 서버는 재조사확인을 보냈지만 고를 후보가 없어 다시시도 로 바꿨다. 화면은 앞 재조사 후보 · 답을 버리고 다시 보냅니다(화면에 내지 않는 값). */
  재조사후보없음?: boolean;
};

// v049: 요청 전체의 제한 시간이 아니라, 마지막으로 무언가(진행 · keep-alive)를 받은 뒤 아무것도 오지 않은 시간입니다(판정 화면과 같은 방식).
const 무응답한도ms = 150000;
// 서버가 받는 질문원문 길이 상한입니다. 넘으면 422 가 나 질문 없이 넘어갑니다.
const 질문원문상한 = 2000;

const 기본선택지: 확인질문선택지[] = [
  { 라벨: "예", 값: "예" },
  { 라벨: "아니오", 값: "아니오" },
  { 라벨: "모르겠어요", 값: "모름" },
];

const 문자 = (o: Record<string, unknown>, 키: string): string =>
  typeof o[키] === "string" ? (o[키] as string).trim() : "";

/** 주의: 서버가 받는 답은 예·아니오·모름 세 값뿐입니다. 그 밖의 값은 버리고, 하나라도 빠지면 기본 세 버튼을 그립니다. */
function 선택지정리(값: unknown): 확인질문선택지[] {
  if (!Array.isArray(값)) return 기본선택지;
  const 정리 = 값.flatMap((s): 확인질문선택지[] => {
    if (typeof s !== "object" || s === null) return [];
    const o = s as Record<string, unknown>;
    const 라벨 = 문자(o, "라벨");
    const 값칸 = 문자(o, "값");
    return 라벨 && 기본선택지.some((b) => b.값 === 값칸) ? [{ 라벨, 값: 값칸 }] : [];
  });
  return 기본선택지.every((b) => 정리.some((s) => s.값 === b.값)) ? 정리 : 기본선택지;
}

function 근거정리(값: unknown): 확인질문근거 | null {
  if (typeof 값 !== "object" || 값 === null) return null;
  const o = 값 as Record<string, unknown>;
  const 원문 = 문자(o, "원문");
  if (!원문) return null;
  return {
    doc_id: 문자(o, "doc_id"),
    조번호: 문자(o, "조번호"),
    조제목: 문자(o, "조제목"),
    항호: 문자(o, "항호"),
    원문,
  };
}

function 질문정리(값: unknown): 확인질문[] {
  if (!Array.isArray(값)) return [];
  return 값.flatMap((항목): 확인질문[] => {
    if (typeof 항목 !== "object" || 항목 === null) return [];
    const o = 항목 as Record<string, unknown>;
    const id = 문자(o, "id");
    const 질문문 = 문자(o, "질문문");
    if (!id || !질문문) return [];
    return [{ id, 질문문, 이유: 문자(o, "이유"), 선택지: 선택지정리(o["선택지"]), 근거: 근거정리(o["근거"]) }];
  });
}

/**
 * 응답 `재조사.후보` → 화면이 그릴 후보. id 가 없는 항목(답을 맞출 수 없음)과 보일 확인 문장이 없는 항목(`질문` · `내용` 이 둘 다 비거나 글자가 아님)은
 * 버립니다 — 무엇을 확인하는지 모르는 채 [맞아요] 를 보내면 안 됩니다. 글 칸은 글자만 남깁니다.
 * 주의: 모르는 `종류` 의 후보도 버리지 않습니다. 화면이 지금의 재조사 카드로 그리므로 칸 모양만 맞춥니다.
 */
function 재조사후보정리(값: unknown): 조사후보[] {
  if (!Array.isArray(값)) return [];
  const 선택글 = (o: Record<string, unknown>, 키: string) => 문자(o, 키) || undefined;
  return 값.flatMap((항목): 조사후보[] => {
    if (typeof 항목 !== "object" || 항목 === null) return [];
    const o = 항목 as Record<string, unknown>;
    const id = 문자(o, "id");
    if (!id || (!문자(o, "질문") && !문자(o, "내용"))) return [];
    const 출처 = (Array.isArray(o["출처"]) ? o["출처"] : []).flatMap((c): 조사후보["출처"] => {
      if (typeof c !== "object" || c === null) return [];
      const s = c as Record<string, unknown>;
      return 문자(s, "url") ? [{ 제목: 문자(s, "제목"), url: 문자(s, "url"), ...(문자(s, "발췌") ? { 발췌: 문자(s, "발췌") } : {}) }] : [];
    });
    return [{ id, 유형: 문자(o, "유형"), 내용: 문자(o, "내용"), 질문: 선택글(o, "질문"), 질문종류: 선택글(o, "질문종류"), 확인문장: 선택글(o, "확인문장"),
      종류: 선택글(o, "종류"), 자금: 선택글(o, "자금"), 상태: 문자(o, "상태"), 출처 }];
  });
}

/** 고를 후보가 없는 재조사확인에 대신 보일 안내. 화면의 다른 「다시 확인」 안내와 같은 말투입니다. */
const 재조사후보없음_안내 = "확인할 내용을 받지 못했어요. 다시 시도해 주세요.";

/**
 * 상태 「분류없음」 응답의 다음행동 · 안내 · 재조사 후보. 재조사확인인데 고를 후보가 없으면(빈 목록, 정리에서 모두 빠짐)
 * 카드도 없고 주 버튼도 켤 수 없어 화면이 멈춥니다. 서버 연결 오류와 같은 「다시 시도」 로 바꿔 안내와 다시 보내는 길을 줍니다.
 * 카드 종류는 응답의 `재조사.종류` 하나로 정합니다. 후보마다 `종류` 가 없거나 달라도 그 값으로 덮어씁니다(제목 · 하나 고르기 ·
 * 직접 입력 숨김 · 출처 줄이 한 값을 보게 — Codex 재리뷰 W5재리뷰_a9f58f3).
 */
function 분류없음정리(응답: Record<string, unknown>): Pick<질문결과, "다음행동" | "분류안내" | "재조사후보" | "재조사종류" | "재조사후보없음"> {
  const 재조사 = 응답["재조사"] && typeof 응답["재조사"] === "object" ? (응답["재조사"] as Record<string, unknown>) : undefined;
  const 카드종류 = 재조사 ? 문자(재조사, "종류") || undefined : undefined;
  // 응답에 종류가 없으면 후보의 종류도 지웁니다(지금의 재조사 카드로 한결같이 그림).
  const 재조사후보 = (재조사 ? 재조사후보정리(재조사.후보) : []).map((c) => ({ ...c, 종류: 카드종류 }));
  // 주의: 다음행동이 없으면 화면이 할 일을 모르므로 다시 시도로 둡니다.
  const 다음행동 = 문자(응답, "다음행동") || "다시시도";
  if (다음행동 === "재조사확인" && !재조사후보.length) {
    return { 다음행동: "다시시도", 분류안내: 재조사후보없음_안내, 재조사후보: [], 재조사종류: undefined, 재조사후보없음: true };
  }
  return { 다음행동, 분류안내: 문자(응답, "분류안내"), 재조사후보, 재조사종류: 카드종류 };
}

function 추가입력정리(값: unknown): 추가입력칸[] {
  if (!Array.isArray(값)) return [];
  return 값.flatMap((항목): 추가입력칸[] => {
    if (typeof 항목 !== "object" || 항목 === null) return [];
    const o = 항목 as Record<string, unknown>;
    const 키 = 문자(o, "키");
    const 라벨 = 문자(o, "라벨");
    if (!키 || !라벨) return [];
    const 단위 = 문자(o, "단위") || null;
    if (o["형식"] === "숫자") return [{ 키, 라벨, 단위, 형식: "숫자" }];
    if (o["형식"] !== "선택" || !Array.isArray(o["선택지"])) return [];
    const 선택지 = (o["선택지"] as unknown[]).filter((v): v is string => typeof v === "string" && !!v);
    return 선택지.length ? [{ 키, 라벨, 단위, 형식: "선택", 선택지 }] : [];
  });
}

/** 칸마다 미리 채울 글자. `수치` 에 키가 있을 때만 채우고, 사용자가 지우거나 고칠 수 있습니다. */
export function 추가입력초기값(칸들: 추가입력칸[], 수치: Record<string, unknown> | undefined): Record<string, string> {
  const 값들: Record<string, string> = {};
  for (const 칸 of 칸들) {
    const v = 수치?.[칸.키];
    if (typeof v !== "string" && typeof v !== "number") continue;
    const 글 = String(v).trim();
    if (글 && (칸.형식 === "숫자" ? Number.isFinite(Number(글)) : 칸.선택지?.includes(글))) 값들[칸.키] = 글;
  }
  return 값들;
}

/** 판정으로 보낼 `추가입력값`. 비운 칸은 보내지 않습니다. 서버가 그 한도를 비교하지 않고 결과의 조건으로 안내합니다. */
export function 추가입력값만들기(칸들: 추가입력칸[], 값들: Record<string, string>): Record<string, string | number> {
  const 보낼값: Record<string, string | number> = {};
  for (const 칸 of 칸들) {
    const 글 = (값들[칸.키] ?? "").trim();
    if (!글) continue;
    if (칸.형식 === "선택") {
      if (칸.선택지?.includes(글)) 보낼값[칸.키] = 글;
    } else if (Number.isFinite(Number(글))) {
      보낼값[칸.키] = Number(글);
    }
  }
  return 보낼값;
}

async function 질문요청(입력: 질문입력, on진행?: (항목: 진행항목) => void, signal?: AbortSignal, 활동?: () => void): Promise<질문결과> {
  try {
    let 받은응답: Record<string, unknown> | null = null;
    await SSE("/api/questions", {
      ...입력,
      질문원문: 입력.질문원문?.slice(0, 질문원문상한),
    }, (이름, 값) => {
      활동?.();
      if (이름 === "진행") { const 항목 = 진행항목정리(값); if (항목) on진행?.(항목); }
      if (이름 === "오류") throw new Error("질문을 받지 못했습니다.");
      if (이름 === "완료" && 값 && typeof 값 === "object") 받은응답 = 값 as Record<string, unknown>;
    }, { signal });
    const 응답 = 받은응답 as Record<string, unknown> | null;
    const 분류 = 응답 ? 분류정리(응답["분류"]) : null;
    // 주의: 상태 실패여도 분류가 있으면 질문만 못 만든 것입니다. 질문 없이 판정으로 넘어갑니다(서버 계약 8-2 ②).
    const 분류뒤실패 = 문자(응답 ?? {}, "상태") === "실패" && 분류 !== null;
    if (!응답 || (!분류뒤실패 && !["있음", "없음", "바로판정", "조사확인", "분류없음"].includes(문자(응답, "상태")))) {
      throw new Error("확인 질문을 받지 못했습니다.");
    }
    const 조사상태 = 응답["조사"] as Record<string, unknown> | undefined;
    // v047: 품목 조사 실패 · 후보 없음은 오류가 아닙니다(상태 조사확인 + 조사.상태 실패). 화면이 한 문장 설명 칸을 보입니다.
    if (입력.웹조사 && !분류뒤실패 && 응답["상태"] === "실패") {
      throw new Error("공개 정보 검색을 완료하지 못했습니다.");
    }
    // v053: 품목 조사가 연결 오류로 끝나면 서버가 상태 분류없음 · 다음행동 다시시도로 답합니다. 오류가 아니라 다시 시도 안내입니다.
    if (입력.웹조사 && 입력.조사답변 === undefined && 응답["상태"] !== "분류없음" && (응답["상태"] !== "조사확인" || !문자(응답, "조사ID"))) {
      throw new Error("공개 정보 확인을 시작하지 못했습니다.");
    }
    const 질문세트 = 문자(응답, "질문세트");
    // 주의: 질문세트가 없으면 서버가 답을 어느 질문에 맞출지 몰라 답이 판정에 들어가지 못합니다.
    //    답해도 쓰이지 않을 질문은 묻지 않습니다. 추가 입력 칸은 질문세트 없이도 판정에 들어갑니다.
    const 질문 = 질문세트 ? 질문정리(응답["질문"]) : [];
    const 추가입력 = 추가입력정리(응답["추가입력"]);
    // 주의: 온톨로지 경로는 질문이 비고 칸만 있을 수 있습니다. 질문만 보고 버리면 칸이 화면에 나오지 않습니다.
    const 조사 = 조사상태;
    const 후보 = Array.isArray(조사?.후보) ? 조사.후보 as 조사후보[] : [];
    const 사용자확인 = (Array.isArray(조사?.사용자확인) ? 조사.사용자확인 : []).flatMap((v): { 항목: string; 질문: string }[] => {
      if (!v || typeof v !== "object") return [];
      const o = v as Record<string, unknown>;
      const 항목 = 문자(o, "항목"), 질문 = 문자(o, "질문");
      return 항목 && 질문 ? [{ 항목, 질문 }] : [];
    });
    const 부족정보 = (Array.isArray(조사?.부족정보) ? 조사.부족정보 : []).filter((v): v is string => typeof v === "string" && !!v.trim());
    return { 상태: 문자(응답, "상태"), 질문세트: 질문세트 || null, 질문, 추가입력, 용어풀이: 용어풀이정리(응답["용어풀이"]), 조사ID: 문자(응답, "조사ID") || undefined, 조사후보: 후보, 사용자확인, 부족정보, 분류, 분류안내: 문자(응답, "분류안내"),
      // 고를 후보가 없는 재조사확인은 분류없음정리 가 다시 시도로 바꿉니다(안내 · 다음행동 둘 다).
      ...(문자(응답, "상태") === "분류없음" ? 분류없음정리(응답) : {}) };
  } catch (e) {
    throw e;
  }
}

/**
 * 서버에서 아무것도 오지 않은 채 무응답 한도가 지나면 요청을 중단합니다. 공개 검색 실패는 호출자에게 전달합니다.
 */
export async function 질문가져오기(입력: 질문입력, on진행?: (항목: 진행항목) => void): Promise<질문결과> {
  const controller = new AbortController();
  let 마지막 = Date.now();
  const 타이머 = window.setInterval(() => {
    if (Date.now() - 마지막 > 무응답한도ms) controller.abort();
  }, 5000);
  try {
    return await 질문요청(입력, on진행, controller.signal, () => { 마지막 = Date.now(); });
  } finally {
    window.clearInterval(타이머);
  }
}
