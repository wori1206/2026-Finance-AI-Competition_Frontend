"use client";

// 화면 10 「추가 확인」 — 판정 전에 사용자에게 물을 확인 질문을 서버에서 받습니다.
//
// 주의: 질문을 못 받는 것은 오류가 아닙니다. 서버 오류·요청 한도·옛 서버의 404·모양이 맞지 않는 응답은
//    모두 빈 결과로 돌려주고, 화면은 질문 없이 바로 판정으로 넘어갑니다. 사용자에게 오류를 보이지 않습니다.

import { POST } from "./http";
import type { 확인질문, 확인질문선택지, 확인질문근거 } from "./server-types";

export type 질문입력 = {
  사업명?: string | null;
  확정비목: string;
  세부유형?: string | null;
  품목: string;
  금액: number;
  용도: string;
  질문원문?: string;
};

/** `질문` 이 비어 있으면 질문 화면 없이 바로 판정합니다. */
export type 질문결과 = {
  질문세트: string | null;
  질문: 확인질문[];
};

const 빈질문결과: 질문결과 = { 질문세트: null, 질문: [] };

// 서버의 질문 LLM 제한(20초)보다 조금 길게 잡았습니다.
const 제한시간ms = 25000;
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

async function 질문요청(입력: 질문입력): Promise<질문결과> {
  try {
    const 응답 = (await POST("/api/questions", {
      ...입력,
      질문원문: 입력.질문원문?.slice(0, 질문원문상한),
    })) as Record<string, unknown> | null;
    if (!응답) return 빈질문결과;
    const 질문 = 질문정리(응답["질문"]);
    const 질문세트 = 문자(응답, "질문세트");
    // 주의: 질문세트가 없으면 서버가 답을 어느 질문에 맞출지 몰라 답이 판정에 들어가지 못합니다.
    //    답해도 쓰이지 않을 질문은 묻지 않습니다.
    if (응답["상태"] !== "있음" || !질문.length || !질문세트) return 빈질문결과;
    return { 질문세트, 질문 };
  } catch (e) {
    console.warn("[질문] 확인 질문을 받지 못해 바로 판정합니다", e);
    return 빈질문결과;
  }
}

/**
 * 질문을 받습니다. 늦으면 빈 결과로 끝냅니다.
 * 주의: `POST` 가 signal 을 받지 않아 요청을 끊지 못합니다. 늦게 온 응답은 버립니다.
 */
export async function 질문가져오기(입력: 질문입력): Promise<질문결과> {
  let 타이머 = 0;
  const 제한 = new Promise<질문결과>((resolve) => {
    타이머 = window.setTimeout(() => resolve(빈질문결과), 제한시간ms);
  });
  try {
    return await Promise.race([질문요청(입력), 제한]);
  } finally {
    window.clearTimeout(타이머);
  }
}
