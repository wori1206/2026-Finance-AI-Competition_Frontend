"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { INITIAL_PLANS } from "../lib/mock-data";
import { planService } from "../lib/plan-service";
import type {
  AppRoute,
  ExpensePlan,
  PlanStatus,
  ScheduleItem,
} from "../lib/types";
import { API켜짐 } from "../lib/config";
import { 판정실행 } from "../lib/judge";
import { 정규화하기 } from "../lib/normalize";
import { 비목목록, 계획추가, GPU깨우기, GPU상태 } from "../lib/api";
import type { GPU상태값 } from "../lib/api";
import { 체크저장, 일정변경저장 } from "../lib/tasks";
import { 적용규범 } from "../lib/norms";
import { 기관검색, 사업요약, 예비기관, 기관저장, 선택기관, 기본기관명, 적용중_기준파일, type 기관 } from "../lib/orgs";
import { 첨부보관, 첨부읽기, 첨부쓰기, 파일을첨부로, 크기표기, type 첨부 } from "../lib/attachments";
import { 지금출처, 출처구독, 출처문구 } from "../lib/data-source";
import { 인증켜짐, 로그인 as supabase로그인, 가입 as supabase가입, 로그아웃 as supabase로그아웃, 이메일 as supabase이메일, 팀이름 as supabase팀이름, 팀이름쓰기 as supabase팀이름쓰기 } from "../lib/supabase";
import { 상세를계획으로, 판정제목, 행동문구, 시각표기 } from "../lib/adapt";
// 🔴 `데모종료` 는 남깁니다 — 「계정 없이 둘러보기」를 없앴어도 예전에 받아 둔
//    데모 토큰이 브라우저에 2시간 남아 있을 수 있고, 그게 로그인 조회를 가로챕니다.
import { 데모종료, 데모중, 이메일기억, 기억된이메일, 이메일잊기, 팀이름기억, 기억된팀이름 } from "../lib/session";
import { 초안전부지우기 } from "../lib/inquiry-store";
import { 선택사업, 사업저장, 사업선택지, 목록에맞추기, 기본사업 } from "../lib/program";
import { 협약읽기, 협약쓰기, 값있음, 원, 날짜표기, 기간표기, 디데이표기, 시연협약, 협약기억, 기억된협약, type 협약정보 } from "../lib/profile";
import { SendButton } from "./send-button";
import "./detail-refinement.css";

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const scheduleStateLabel = (state: ScheduleItem["state"]) =>
  state === "준비 필요" ? "준비 일정" : state;

const iconPaths: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" />
    </>
  ),
  plans: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  chat: (
    <>
      <path d="M5 17.5 3.5 21l4-1.5A9 9 0 1 0 5 17.5Z" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </>
  ),
  rules: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
      <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z" />
    </>
  ),
  sparkSolid: (
    <path
      d="M12 2.5c.9 4.8 3.7 7.6 8.5 8.5-4.8.9-7.6 3.7-8.5 8.5-.9-4.8-3.7-7.6-8.5-8.5 4.8-.9 7.6-3.7 8.5-8.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  arrow: <path d="m9 18 6-6-6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  back: <path d="m15 18-6-6 6-6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  moreVertical: (
    <>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M12 3 2.8 20h18.4Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2.5 19h19" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8Z" />
      <path d="m14.5 6.3 3.2 3.2" />
    </>
  ),
  paperclip: (
    <path d="m9 12 5.2-5.2a3 3 0 1 1 4.2 4.2l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.1-7.1" />
  ),
  fileText: (
    <>
      <path d="M6 2h8l4 4v16H6Z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  fileAlert: (
    <>
      <path d="M6 2h8l4 4v16H6Z" />
      <path d="M14 2v5h5M12 11v4M12 18h.01" />
    </>
  ),
  fileSearch: (
    <>
      <path d="M6 2h8l4 4v7M6 2v20h6" />
      <path d="M14 2v5h5" />
      <circle cx="12" cy="16" r="3.5" />
      <path d="m14.5 18.5 3 3" />
    </>
  ),
  filePenLine: (
    <>
      <path d="M6 2h8l4 4v6" />
      <path d="M14 2v5h5M6 2v20h7" />
      <path d="m14.5 19.5 5-5 2 2-5 5-3 .7Z" />
      <path d="m18.5 15.5 2 2" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4V2h6v2M8.5 13l2.2 2.2 4.8-5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8.2 14.8A7 7 0 1 1 15.8 14.8C14.7 15.6 14.5 16.5 14.5 18h-5c0-1.5-.2-2.4-1.3-3.2Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 14v5h14v-5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5h16l-6.5 7v6l-3 1v-7Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

/**
 * 🔴 AI 챗봇(화면 12)을 «끕니다» — 2026-09-03 백엔드 확정: 이번 제출 범위 밖입니다.
 *    서버 엔드포인트 20개에 챗봇용이 없어서, 열어두면 심사위원이 화면에 박아 둔
 *    답변을 «AI 답변으로» 읽게 됩니다. 그게 제일 나쁜 결과라는 데 양쪽이 동의했습니다.
 *    나중에 API 가 생기면 이 한 줄만 true 로 되돌리면 화면이 그대로 살아납니다.
 */
const 챗봇_켬 = false;

const navItems = [
  { page: "home", label: "홈", icon: "home" },
  { page: "plans", label: "지출 계획", icon: "plans" },
  { page: "ai-chat", label: "AI CHAT", icon: "chat" },
  { page: "schedule", label: "집행 일정", icon: "calendar" },
  { page: "rules", label: "마이페이지", icon: "user" },
] as const;

/**
 * 🔴 이제 상수가 아닙니다 — 온보딩에서 사용자가 «고른» 사업을 돌려줍니다.
 *    (아무것도 안 골랐으면 「2026 초기창업패키지」. 서버는 연도 접두사를 별칭으로 벗깁니다)
 *    쓰는 곳: 비목 조회 · 정규화 · 계획 저장 · AI 점검
 */
const 현재사업 = () => 선택사업();

/**
 * 받침이 있으면 「을」, 없으면 「를」.
 *
 * 🔴 사업명이 서버에서 오는 값이라 조사를 고정할 수 없습니다. 「초기창업패키지을(를)」
 *    처럼 나오면 화면이 대충 만든 것으로 읽힙니다.
 */
function 을를(말: string): string {
  const 끝 = (말 ?? "").trim().slice(-1);
  const 코드 = 끝.charCodeAt(0);
  if (!끝 || Number.isNaN(코드) || 코드 < 0xac00 || 코드 > 0xd7a3) return "를";
  return (코드 - 0xac00) % 28 ? "을" : "를";
}

/**
 * "2026-10-02" → "10/2". 날짜가 없으면 **「0/0」 대신 「—」**.
 *
 * 🔴 예전에는 `Number("".slice(5,7))` 가 그대로 0 이 되어 집행 일정에 「0/0」이
 *    찍혔습니다. 서버 할일에 due_date 가 없을 때 나던 증상입니다.
 */
function 월일표기(date: string): string {
  const m = Number(date?.slice(5, 7));
  const d = Number(date?.slice(8, 10));
  return m && d ? `${m}/${d}` : "—";
}

/**
 * 화면에 「참여 중인 사업」을 «글자로» 보여줄 때 씁니다.
 *
 * 🔴 `현재사업()` 을 JSX 안에서 바로 부르면 안 됩니다.
 *    서버에서 미리 그린 HTML 은 기본값인데 브라우저는 localStorage 값을 읽어서,
 *    React 가 「서버와 화면이 다르다」고 경고(hydration mismatch)를 냅니다.
 *    그래서 첫 그림은 기본값으로 그리고, 붙은 뒤에 바꿉니다.
 */
function use사업(재조회?: unknown): string {
  const [값, set값] = useState(기본사업);
  useEffect(() => {
    set값(선택사업());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

/**
 * 지금 참여 중인 «주관기관». 온보딩에서 고른 값입니다.
 * 🔴 `use사업` 과 같은 이유로 첫 그림은 기본값, 붙은 뒤에 localStorage 를 읽습니다.
 */
function use기관(재조회?: unknown): string {
  const [값, set값] = useState(기본기관명);
  useEffect(() => {
    set값(선택기관());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

/**
 * 협약 기간·사업비. 홈·사이드바·마이페이지가 «같은 값» 을 보게 하는 통로입니다.
 *
 * 🔴 순서: 서버(`/api/profile` f1) → 이 브라우저가 기억한 값 → 시연 기본값.
 *    목 서버는 저장을 안 받으므로 서버만 믿으면 마이페이지에서 고친 값이 사라집니다.
 */
function use협약(재조회?: unknown): 협약정보 {
  const [값, set값] = useState<협약정보>(시연협약);
  useEffect(() => {
    let 살아있음 = true;
    const 기억 = 기억된협약();
    if (기억 && 값있음(기억)) set값(기억);
    협약읽기().then((v) => {
      if (!살아있음 || !v || !값있음(v)) return;
      set값(v);
      협약기억(v);
    });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

/**
 * 회원가입에서 받은 팀 이름.
 *
 * 🔴 **Supabase 사용자 메타데이터가 정본입니다** (2026-09-05).
 *    전에는 이 탭의 sessionStorage 만 봤는데, 로그아웃하면 그 값을 지우므로
 *    다시 로그인하면 이름이 「체쿠메이트」로 되돌아갔습니다. 계정에 붙여 두면
 *    다른 기기·다른 브라우저에서 들어와도 따라옵니다.
 *
 * 🔴 로컬 기억을 «먼저» 그립니다. 서버 조회는 한 박자 늦어서, 안 그러면 로그인
 *    직후 한 프레임 동안 「체쿠메이트」가 번쩍입니다.
 */
function use팀이름(재조회?: unknown): string {
  /**
   * 🔴 **모르면 «빈 문자열» 을 돌려줍니다. 기본 표기를 여기서 만들지 않습니다.**
   *
   *    2026-09-05 사고. 전에는 이 훅이 못 찾으면 「체쿠메이트」를 «값처럼» 돌려줬습니다.
   *    마이페이지가 그 값을 「서버가 알려준 이름」으로 알고 profile 에 덮어써서,
   *    사용자가 팀 이름을 고쳐 저장해도 저장 직후 곧바로 「체쿠메이트」로 되돌아갔습니다
   *    — 화면에서는 «수정이 아예 안 되는» 것으로 보였습니다. 하드코딩처럼 보인 이유가
   *    이것입니다. 「모른다」와 「기본값이 이것이다」를 한 값으로 뭉치면 안 됩니다.
   *
   *    → 표기 기본값은 «그리는 쪽» 이 정합니다 (`|| "체쿠메이트"`).
   */
  const [값, set값] = useState("");
  useEffect(() => {
    let 살아있음 = true;
    set값(기억된팀이름());
    supabase팀이름()
      .then((서버) => {
        if (!살아있음 || !서버) return;
        set값(서버);
        팀이름기억(서버);   // 다음 진입에서 깜빡임 없이 바로 그리도록
      })
      .catch(() => {
        /* 메타데이터가 없는 옛 계정 — 로컬 기억이나 빈 값으로 둡니다 */
      });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

/**
 * 지금 로그인한 사람의 이메일. 화면 세 곳(사이드바·내 정보·마이페이지)이 같은 값을 씁니다.
 *
 * 🔴 순서: Supabase 세션 → 이 탭이 기억한 로그인 이메일 → 데모(계정 없음).
 *    `use사업` 과 같은 이유로 첫 그림은 비워 두고 붙은 뒤에 채웁니다(hydration).
 */
function use이메일(재조회?: unknown): string {
  const [값, set값] = useState("");
  useEffect(() => {
    let 살아있음 = true;
    supabase이메일()
      .catch(() => null)
      .then((e) => {
        if (!살아있음) return;
        if (e) return set값(e);
        const 기억 = 기억된이메일();
        if (기억) return set값(기억);
        set값(데모중() ? "둘러보기 · 계정 없음" : "");
      });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

const EXPENSE_CATEGORIES = [
  "재료비",
  "외주용역비",
  "기계장치비",
  "특허권 등 무형자산 취득비",
  "인건비",
  "지급수수료",
  "교육훈련비",
  "여비",
  "광고선전비",
  "창업활동비",
] as const;

const FEE_SUBTYPES = [
  "기술이전",
  "학회·세미나",
  "전시회·박람회",
  "시험·인증",
  "멘토링",
  "기자재 임차",
  "사무실 임차",
  "운반",
  "보험",
  "보관",
  "회계감사",
  "세무기장",
  "법인설립",
  "기술보호",
  "수리",
  "규제애로 해소 법률컨설팅",
] as const;

type CheckQuestion = { label: string; options?: string[] };

/**
 * 🔴 서버 비목 라벨과 이 파일의 질문표 키가 다릅니다.
 *      서버 `기계장치`  ↔ 질문표 `기계장치비`
 *      서버 `특허권등무형자산취득비` ↔ 질문표 `특허권 등 무형자산 취득비`
 *    공백을 접고 앞부분이 겹치면 같은 것으로 봅니다. 못 찾으면 빈 배열입니다.
 */
function 질문찾기(라벨: string): CheckQuestion[] {
  const 접기 = (x: string) => x.replace(/\s/g, "");
  const 키 = 접기(라벨.split(" · ")[0]);
  const 후보 = Object.keys(CATEGORY_QUESTIONS);
  const 맞는것 =
    후보.find((k) => 접기(k) === 키) ??
    후보.find((k) => 접기(k).startsWith(키) || 키.startsWith(접기(k)));
  return 맞는것 ? CATEGORY_QUESTIONS[맞는것] : [];
}

const CATEGORY_QUESTIONS: Record<string, CheckQuestion[]> = {
  재료비: [
    { label: "구매한 재료가 시제품의 일부가 되나요?" },
    {
      label: "어떤 방식으로 준비하나요?",
      options: ["완성된 재료 구매", "맞춤 제작 의뢰", "확인 필요"],
    },
    { label: "구매 수량은 시제품 제작에 필요한 범위인가요?" },
    { label: "협약기간 안에 모두 납품하고 사용할 예정인가요?" },
  ],
  외주용역비: [
    { label: "업체의 사업자등록 업종이 이번 과업과 관련되어 있나요?" },
    { label: "해당 업체가 이 분야에서 1년 이상 사업을 수행했나요?" },
    {
      label:
        "대표자나 임직원이 현재 또는 최근 2년 내 해당 업체에서 근무한 적이 있나요?",
    },
    { label: "이번 사업에 참여 중인 다른 창업기업인가요?" },
    { label: "프리랜서 중개 서비스를 통한 계약인가요?" },
    { label: "제품을 대량 생산하기 위한 용역인가요?" },
  ],
  기계장치비: [
    { label: "사업비로 구매한 PC·장비를 이미 보유하고 있나요?" },
    {
      label: "구매하려는 제품은 어떤 상태인가요?",
      options: ["신품", "중고", "확인 필요"],
    },
    { label: "충전 후 차감되는 방식으로 결제하나요?" },
  ],
  "특허권 등 무형자산 취득비": [
    { label: "최초 협약 시작 이후에 새로 출원하는 건인가요?" },
    {
      label: "출원인은 누구인가요?",
      options: ["창업기업 법인", "대표자 개인", "공동 출원", "확인 필요"],
    },
    { label: "다른 기관 또는 기업과 공동출원하나요?" },
    { label: "변리사 성공보수료가 포함되어 있나요?" },
  ],
  인건비: [
    { label: "해당 직원은 4대사회보험에 가입되어 있나요?" },
    { label: "대표자의 배우자 또는 직계존비속인가요?" },
    {
      label:
        "다른 정부지원사업의 자기부담금 또는 현물 인력으로 등록되어 있나요?",
    },
    { label: "최근 3년 이내 근로소득이 있나요?" },
    { label: "두루누리 사회보험료 지원 대상자인가요?" },
  ],
  교육훈련비: [
    { label: "교육 대상자가 4대사회보험에 가입되어 있나요?" },
    { label: "교재 등 문헌 구매 비용이 포함되어 있나요?" },
    { label: "정부에서 교육비 일부를 환급해주는 과정인가요?" },
    { label: "고용노동부 등이 운영하는 교육의 본인부담금인가요?" },
  ],
  여비: [
    { label: "실제 사업 목적의 출장인가요?" },
    { label: "다른 정부부처·지자체·기관에서 이 출장비를 지원받고 있나요?" },
  ],
  광고선전비: [
    { label: "광고대행사와 별도 계약을 체결하나요?" },
    { label: "광고비를 미리 충전한 뒤 사용액만 차감하는 방식인가요?" },
    { label: "충전한 금액은 협약기간 안에 모두 사용할 예정인가요?" },
  ],
  창업활동비: [
    { label: "회의 목적과 참석자가 사업 수행에 직접 관련되어 있나요?" },
    { label: "외부 참석자가 포함되어 있나요?" },
    { label: "기관의 1인당 회의비 기준을 확인했나요?" },
  ],
};

const FEE_QUESTIONS: Record<string, CheckQuestion[]> = {
  기술이전: [
    { label: "법적 권리를 보장받는 기술이전 계약인가요?" },
    { label: "기술이전 금액의 산정 근거가 있나요?" },
    { label: "기술평가 비용을 창업기업이 부담하나요?" },
  ],
  "학회·세미나": [
    { label: "참가자는 대표자 또는 4대사회보험 가입 임직원인가요?" },
    { label: "행사 개최일이 협약기간 안인가요?" },
  ],
  "전시회·박람회": [
    {
      label: "어떤 비용이 포함되어 있나요?",
      options: ["참가·부스·통역비", "숙식·체제비", "교통비", "확인 필요"],
    },
  ],
  "시험·인증": [
    {
      label: "어떤 인증인가요?",
      options: [
        "제품 인증",
        "신규 시스템 인증",
        "시스템 인증 갱신",
        "확인 필요",
      ],
    },
    { label: "컨설팅 비용이 함께 포함되어 있나요?" },
  ],
  멘토링: [
    { label: "멘토가 창업지원사업 전담조직 소속 인력인가요?" },
    { label: "1인 1일 지급액이 30만원 이하인가요?" },
  ],
  "기자재 임차": [
    { label: "임차기간이 1개월 이상인가요?" },
    {
      label: "어디에서 임차하나요?",
      options: ["대학·연구소 등 전문기관", "민간기업", "확인 필요"],
    },
  ],
  "사무실 임차": [
    {
      label: "어떤 공간인가요?",
      options: ["사업장 사무실", "공장·연구소", "공유오피스", "기타"],
    },
    { label: "임대인의 사업자등록증에 부동산업·임대업이 등록되어 있나요?" },
    { label: "보증금 또는 관리비가 포함되어 있나요?" },
  ],
  운반: [{ label: "창업아이템 수출 과정에서 발생하는 비용인가요?" }],
  보험: [{ label: "창업아이템 수출과 관련된 보험인가요?" }],
  보관: [{ label: "수출 과정에서 발생하는 보관료인가요?" }],
  회계감사: [
    { label: "전문기관에서 지정한 회계법인이 진행하는 사업비 회계감사인가요?" },
  ],
  세무기장: [
    { label: "연간 기장료를 미리 한 번에 지급하나요?" },
    { label: "세무사무소에 직접 지급하나요?" },
  ],
  법인설립: [
    { label: "온라인법인설립시스템을 이용하나요?" },
    {
      label: "어떤 비용인가요?",
      options: [
        "잔액고 증명 수수료",
        "법인등록면허세",
        "법인등기수수료",
        "기타",
      ],
    },
  ],
  기술보호: [
    { label: "창업기업지원 서비스 바우처 사업에 선정되어 있나요?" },
    {
      label: "어떤 비용인가요?",
      options: ["기술임치", "기술임치 갱신", "기타 기술보호", "확인 필요"],
    },
  ],
  수리: [
    { label: "외부 업체를 통한 수리인가요?" },
    {
      label: "어떤 작업인가요?",
      options: ["고장·파손 복구", "기능향상 업그레이드", "확인 필요"],
    },
  ],
  "규제애로 해소 법률컨설팅": [
    { label: "창업아이템 관련 규제 개선·법률 검토인가요?" },
    { label: "컨설팅 완료 후 비용을 지급하나요?" },
  ],
};

const displayPlanStatus = (value: PlanStatus) =>
  value === "점검 전" || value === "재점검 필요" ? "점검전" : value;

function Status({ value }: { value: PlanStatus }) {
  const key =
    displayPlanStatus(value) === "점검전"
      ? "draft"
      : value === "특이사항 없음"
        ? "safe"
        : value === "위험"
          ? "risk"
          : "warn";
  return (
    <span className={`status status-${key}`}>
      <Icon
        name={
          key === "draft"
            ? "fileSearch"
            : key === "safe"
              ? "check"
              : key === "warn"
                ? "fileAlert"
                : "alert"
        }
        size={14}
      />
      {displayPlanStatus(value)}
    </span>
  );
}

/**
 * 써도돼요 로고.
 *
 * 🔴 두 벌을 «둘 다» 그려 두고 CSS 로 하나만 보입니다. 메뉴를 접었다 펼 때
 *    이미지를 갈아끼우면 잠깐 빈칸이 생기는데(새 파일을 그때 받아옵니다),
 *    미리 둘 다 두면 그 깜빡임이 없습니다.
 *      · 펼침 = 가로형 워드마크 (ssudo_v2)
 *      · 접힘 = 정사각 심볼   (ssu)
 */
/**
 * 「지금 보이는 자료가 서버 것이 아닙니다」를 «화면이 말하게» 합니다.
 *
 * 🔴 왜 있는가: 서버 호출이 실패하면 예시 데이터로 되돌아가는데, 예전에는 그걸
 *    콘솔에만 적었습니다. 그래서 「123」 같은 예전 시험 입력이 DB 값처럼 보였고,
 *    화면만 봐서는 «실제 자료인지 예시인지» 구분할 방법이 없었습니다.
 *
 * 🔴 서버가 정상이면 `출처문구()` 가 null 을 주고 아무것도 안 그립니다.
 *
 * 🔴 `useSyncExternalStore` 를 쓰는 이유: 출처는 React 밖(`lib/data-source.ts`)에서
 *    바뀝니다. 상태를 또 만들어 복제하면 두 값이 어긋납니다.
 */
function DataSourceBanner() {
  const 기록 = useSyncExternalStore(
    출처구독,
    지금출처,
    // 🔴 서버 렌더에서는 «항상 서버 정상» 으로 봅니다. 서버에는 브라우저의
    //    조회 결과가 없어서, 여기서 다른 값을 주면 hydration 이 어긋납니다.
    () => ({ 값: "서버" as const }),
  );
  const [접음, set접음] = useState(false);
  const 문구 = 출처문구(기록);
  if (!문구 || 접음) return null;
  return (
    <div
      className={`data-source-banner ${문구.심각도 === "주의" ? "warn" : ""}`}
      role="status"
    >
      <Icon name="alert" size={16} />
      <span>
        <b>{문구.제목}</b>
        <small>{문구.설명}</small>
      </span>
      <button type="button" aria-label="안내 닫기" onClick={() => set접음(true)}>
        ×
      </button>
    </div>
  );
}

function BrandWord() {
  return (
    <span className="brand-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo-full" src="/logo/ssudo-wordmark.svg" alt="써도돼요" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo-mark" src="/logo/ssudo-mark.svg" alt="" aria-hidden="true" />
    </span>
  );
}

export default function CheckumaitApp() {
  const [signedIn, setSignedIn] = useState(false);
  // 🔴 localStorage 를 첫 그림에서 읽으면 서버 HTML 과 어긋납니다 — 붙은 뒤에 읽습니다.
  //    (`signedIn` 아래에 있어야 합니다 — 위에 두면 선언 전 참조로 터집니다)
  // 🔴 로그인 «뒤에» 다시 물어야 합니다 — 첫 마운트 때는 아직 세션이 없습니다.
  const 이메일 = use이메일(signedIn);
  // 온보딩을 마치고 들어오므로 로그인 상태가 바뀔 때 다시 읽습니다.
  // 🔴 사업도 마찬가지입니다 — 안 그러면 사이드바만 예전 사업이 남습니다.
  const 사업 = use사업(signedIn);
  const 기관 = use기관(signedIn);
  const 팀이름 = use팀이름(signedIn) || "체쿠메이트";
  const 협약 = use협약(signedIn);
  const [데모기관, set데모기관] = useState<string | null>(null);
  useEffect(() => {
    set데모기관(데모중()?.기관명 ?? null);
  }, [signedIn]);
  const [route, setRoute] = useState<AppRoute>({ page: "home" });
  const [plans, setPlans] = useState<ExpensePlan[]>(INITIAL_PLANS);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([planService.listPlans(), planService.listSchedules()]).then(
      ([planRows, scheduleRows]) => {
        setPlans(planRows);
        setSchedules(scheduleRows);
      },
    );
    const onPop = (event: PopStateEvent) =>
      setRoute((event.state as AppRoute) || { page: "home" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (next: AppRoute) => {
    window.history.pushState(next, "");
    setRoute(next);
    setMobileNav(false);
    setAccountOpen(false);
    window.scrollTo(0, 0);
  };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };
  const persistPlans = (next: ExpensePlan[]) => {
    setPlans(next);
    void planService.savePlans(next);
  };
  const persistSchedules = (next: ScheduleItem[]) => {
    const 이전 = schedules;
    setSchedules(next);
    void planService.saveSchedules(next);
    // 🔴 집행 일정은 그동안 «어디에도» 저장되지 않았습니다 — 완료 체크가 새로고침하면
    //    사라졌습니다. 서버에서 온 일정(숫자 id)은 이제 상태를 진짜로 저장합니다.
    void 일정변경저장(이전, next).then(({ 실패, 없음 }) => {
      if (실패.length) {
        setSchedules(이전);
        notify("일정 상태를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
      if (없음.length) {
        notify("일부 일정은 서버에 없어 이 화면에서만 바뀝니다.");
      }
    });
  };
  /**
   * 🔴 상세의 체크박스와 집행 일정의 완료 체크를 «한 몸» 으로 묶습니다.
   *
   *    둘은 사실 같은 것(서버 `plan_tasks` 한 행)인데 화면 상태가 둘로 갈려 있어서,
   *    한쪽에서 체크해도 다른 쪽은 그대로였습니다. 이제 어느 쪽을 눌러도 두 화면이
   *    같이 바뀌고, 서버에는 «한 번만» 저장합니다.
   *
   *    `taskId` 가 이어주는 열쇠입니다 — 상세에서 「일정에 추가」로 만든 일정과
   *    서버에서 받아온 일정 둘 다 이 값을 답니다. 사용자가 손으로 만든 일정에는
   *    없으므로 그런 건 예전처럼 화면 안에서만 움직입니다.
   */
  const 할일동기화 = (planId: string, taskId: string, 완료: boolean) => {
    const 이전계획 = plans;
    const 이전일정 = schedules;

    const 다음계획 = plans.map((p) => {
      if (p.id !== planId) return p;
      const aiChecks = p.aiChecks.map((c) =>
        c.id === taskId ? { ...c, done: 완료 } : c,
      );
      const evidence = p.evidence.map((c) =>
        c.id === taskId ? { ...c, done: 완료 } : c,
      );
      return {
        ...p,
        aiChecks,
        evidence,
        nextAction: aiChecks.every((c) => c.done)
          ? "확인 완료"
          : p.nextAction === "확인 완료"
            ? "확인사항 확인"
            : p.nextAction,
      };
    });

    const 다음일정 = schedules.map((s) =>
      (s.taskId ?? s.id) === taskId && s.planId === planId
        ? {
            ...s,
            state: (완료
              ? "완료"
              : s.type === "집행"
                ? "집행 예정"
                : "준비 필요") as ScheduleItem["state"],
          }
        : s,
    );

    setPlans(다음계획);
    setSchedules(다음일정);
    void planService.savePlans(다음계획);
    void planService.saveSchedules(다음일정);

    // 🔴 서버 저장은 «한 번» 입니다 — 두 화면이 각자 PATCH 하면 경합합니다.
    체크저장(planId, taskId, 완료)
      .then((결과) => {
        if (결과 !== "없음") return;
        console.warn("[할일] 서버에 없음 — plan_id=%s task_id=%s", planId, taskId);
        notify("이 항목은 서버에 없어 화면에서만 바뀝니다.");
      })
      .catch((e: unknown) => {
        setPlans(이전계획);
        setSchedules(이전일정);
        notify(e instanceof Error ? e.message : "저장하지 못했습니다");
      });
  };

  const deletePlan = (ids: string | string[], skipConfirm = false) => {
    const targets = Array.isArray(ids) ? ids : [ids];
    const target = plans.find((plan) => plan.id === targets[0]);
    if (
      !target ||
      (!skipConfirm && !window.confirm(
        `'${target.name}' 지출 계획을 삭제할까요? 연결된 집행 일정도 함께 삭제됩니다.`,
      ))
    )
      return false;
    persistPlans(plans.filter((plan) => !targets.includes(plan.id)));
    persistSchedules(schedules.filter((item) => !targets.includes(item.planId)));
    notify("지출 계획과 연결된 일정을 삭제했습니다.");
    return true;
  };

  if (!signedIn)
    return (
      <Login
        onEnter={(destination) => {
          window.sessionStorage.setItem("checkumait-signed-in", "true");
          setRoute({ page: destination });
          setSignedIn(true);
        }}
      />
    );
  const activePage =
    route.page === "plan-detail" || route.page === "plan-new"
      ? "plans"
      : route.page;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <button
          className="brand"
          onClick={() => go({ page: "home" })}
          aria-label="써도돼요 홈"
        >
          <BrandWord />
        </button>
        <nav className="side-nav" aria-label="주요 메뉴">
          {navItems
            .filter((item) => 챗봇_켬 || item.page !== "ai-chat")
            .map((item) => (
            <button
              key={item.page}
              className={`${activePage === item.page ? "active" : ""} ${item.page === "rules" ? "nav-separated" : ""}`}
              onClick={() => go({ page: item.page } as AppRoute)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          {/* 🔴 순서를 바꿨습니다 — 「지금 서버가 되는가」가 먼저고,
              「어느 사업인가」는 그 아래입니다 (QA 0905). */}
          <GPU상태배지 />
          <section className="project-mini">
            <span>{데모기관 ? "둘러보기" : "참여 중인 프로젝트"}</span>
            <b>{사업}</b>
            {/* 🔴 데모 세션은 «누를 때마다 새 기관» 입니다. 고정 표기되면 안 됩니다.
                로그인 사용자는 온보딩에서 고른 기관과 실제 협약 종료일을 씁니다. */}
            <small>
              {데모기관 ??
                `${기관}${디데이표기(협약.종료일) ? ` · ${디데이표기(협약.종료일)}` : ""}`}
            </small>
          </section>
          <div className="account-row">
            <button
              className="account-main"
              onClick={() => setProfileOpen(true)}
            >
              <span className="avatar">{팀이름.slice(0, 1)}</span>
              <span>
                <b>{팀이름}</b>
                <small>{이메일 || "로그인 정보 없음"}</small>
              </span>
            </button>
            <button
              className="more-button"
              aria-label="계정 메뉴"
              onClick={() => setAccountOpen((v) => !v)}
            >
              <Icon name="moreVertical" />
            </button>
            {accountOpen && (
              <div className="account-menu">
                <button onClick={() => setProfileOpen(true)}>내 정보</button>
                <button
                  className="danger"
                  onClick={() => {
                    void supabase로그아웃();          // 설정이 없으면 아무것도 안 합니다
                    데모종료();                        // 🔴 안 지우면 다음 사람이 그 기관으로 들어갑니다
                  이메일잊기();
                  초안전부지우기();                  // 🔴 다음 사람이 앞사람의 문의 글을 보면 안 됩니다
                    window.sessionStorage.removeItem("checkumait-signed-in");
                    setSignedIn(false);
                    setAccountOpen(false);
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="sidebar-toggle"
              onClick={() =>
                window.innerWidth <= 800
                  ? setMobileNav(true)
                  : setSidebarCollapsed((value) => !value)
              }
              aria-label={
                sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"
              }
            >
              ☰
            </button>
            <span className="top-title">
              {route.page === "plan-detail"
                ? "지출 상세"
                : navItems.find((item) => item.page === activePage)?.label ||
                  "CHECKUMAIT"}
            </span>
          </div>
        </header>
        {/* 🔴 지금 보이는 자료가 «서버 것이 아닐 때» 만 뜹니다. 정상이면 아무것도
            안 그립니다 — 잘 되는 날 배너가 있으면 그게 더 나쁩니다. */}
        <DataSourceBanner />
        {route.page === "home" && (
          <HomePage plans={plans} schedules={schedules} go={go} />
        )}
        {route.page === "plans" && (
          <PlansPage
            plans={plans}
            schedules={schedules}
            go={go}
            remove={deletePlan}
            update={(plan) =>
              persistPlans(
                plans.map((item) => (item.id === plan.id ? plan : item)),
              )
            }
          />
        )}
        {route.page === "plan-new" && (
          <NewPlanPage
            save={(plan, temporary) => {
              persistPlans([plan, ...plans]);
              if (temporary) {
                go({ page: "plans" });
                notify("지출 계획을 임시저장했습니다.");
              } else {
                go({ page: "plan-detail", id: plan.id });
                notify("지출 계획을 저장하고 AI 점검을 완료했습니다.");
              }
            }}
            cancel={() => go({ page: "plans" })}
          />
        )}
        {route.page === "plan-detail" && (
          <PlanDetail
            plan={plans.find((plan) => plan.id === route.id)}
            allPlans={plans}
            update={(plan) =>
              persistPlans(
                plans.map((row) => (row.id === plan.id ? plan : row)),
              )
            }
            addSchedules={(items) => persistSchedules([...schedules, ...items])}
            할일동기화={할일동기화}
            remove={() => {
              const target = plans.find((plan) => plan.id === route.id);
              if (target && deletePlan(target.id)) go({ page: "plans" });
            }}
            back={() => go({ page: "plans" })}
            notify={notify}
          />
        )}
        {챗봇_켬 && route.page === "ai-chat" && <AiChat plans={plans} />}
        {route.page === "schedule" && (
          <SchedulePage
            plans={plans}
            schedules={schedules}
            save={persistSchedules}
            할일동기화={할일동기화}
            notify={notify}
          />
        )}
        {route.page === "rules" && <MyPage notify={notify} />}
      </main>
      {챗봇_켬 && (
        <button
          className={`floating-ai ${route.page === "ai-chat" ? "is-collapsed" : ""}`}
          onClick={() => setChatOpen((v) => !v)}
          aria-label="AI에게 물어보기"
        >
          <span>
            <Icon name="sparkSolid" size={18} />
          </span>
          <span className="floating-ai-label">AI에게 물어보기</span>
        </button>
      )}
      {챗봇_켬 && chatOpen && (
        <FloatingChat
          plans={plans}
          route={route}
          close={() => setChatOpen(false)}
        />
      )}
      {profileOpen && (
        <ProfileModal close={() => setProfileOpen(false)} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function OnboardingDemo() {
  return (
    <section className="onboarding-demo" aria-label="AI 점검 결과 예시">
      <div className="demo-plan-card">
        <header>
          <span>실제 AI 점검 예시</span>
          <Status value="확인 필요" />
        </header>
        <h2>UI 디자인 외주 제작</h2>
        <strong>3,000,000원</strong>
        <dl>
          <div>
            <dt>예상 비목</dt>
            <dd>외주용역비</dd>
          </div>
          <div>
            <dt>예상 집행일</dt>
            <dd>2026.09.30</dd>
          </div>
          <div>
            <dt>거래처</dt>
            <dd>㈜디자인랩</dd>
          </div>
        </dl>
      </div>
      <div className="demo-result-card">
        <span className="demo-result-label">
          <Icon name="sparkSolid" size={14} />
          AI 종합 판단
        </span>
        <h3>결제 전에 확인이 필요해요</h3>
        <p>
          과업 범위와 가격 적정성을 확인할 수 있도록 아래 자료를 준비해주세요.
        </p>
        <ul>
          <li className="done">
            <Icon name="check" size={14} />
            사업 목적과 직접 관련성 확인
          </li>
          <li>
            <i />
            비교견적 첨부 필요
          </li>
          <li>
            <i />
            계약서·과업내용 준비
          </li>
        </ul>
      </div>
    </section>
  );
}

function Login({
  onEnter,
}: {
  onEnter: (destination: "home" | "plan-new") => void;
}) {
  const [로그인중, set로그인중] = useState(false);
  const [로그인오류, set로그인오류] = useState<string | null>(null);
  const [step, setStep] = useState<
    "welcome" | "signup" | "project" | "institution" | "upload" | "ready"
  >("welcome");
  const [program, setProgram] = useState(선택사업);
  const [서버사업, set서버사업] = useState<string[] | null>(null);
  const [institutionQuery, setInstitutionQuery] = useState("");
  // 🔴 주관기관은 서버(`GET /api/orgs`)가 정본입니다. 예전에는 화면에 1건이 박혀 있어서
  //    검색도 수정도 안 됐습니다. 서버가 안 되면 예비 1건으로 조용히 내려갑니다.
  const [기관목록, set기관목록] = useState<기관[]>([예비기관]);
  const [기관찾는중, set기관찾는중] = useState(false);
  /** 🔴 고른 사업으로 걸렀더니 0건이라 필터를 풀었는가. 그러면 화면이 말해야 합니다. */
  const [사업필터해제, set사업필터해제] = useState(false);
  const [institution, setInstitution] = useState("");
  /**
   * 🔴 고른 기관의 slug. «이름이 아니라 이것» 이 서버가 기관을 되찾는 열쇠입니다
   *    — 「경상국립대학교」·「경상국립대학교 창업지원단」·「…창업중심대학사업단」이
   *    같이 있어서 이름으로 되찾으면 다른 기관에 붙습니다.
   *    등록 API 가 붙는 날 이 값을 그대로 싣습니다 (`lib/orgs.ts::선택기관slug`).
   */
  const [institutionSlug, setInstitutionSlug] = useState("");
  /**
   * 🔴 판정 엔진에 «이미 적재되어 있는» 기준 파일을 기본값으로 보여줍니다.
   *    사용자가 다른 파일을 올려도 엔진에 반영할 길이 없어(업로드 → 파싱 → 재적재는
   *    MVP 범위 밖), 여기서 바꾼 값은 서비스 어디에도 연결하지 않습니다.
   *    화면은 «지금 실제로 적용 중인 파일» 을 그대로 말합니다.
   */
  const [criteriaFile, setCriteriaFile] = useState(적용중_기준파일);
  // 🔴 Supabase 에 실제로 만들어 둔 계정과 «똑같아야» 합니다.
  //    (Supabase → Authentication → Users 에서 보이는 이메일)
  //    비밀번호는 코드에 넣지 않습니다. 시연 때 직접 입력하세요.
  const [loginEmail, setLoginEmail] = useState("prototype@ssudo.kr");
  const [loginPassword, setLoginPassword] = useState("");
  /**
   * 회원가입 — 🔴 **화면만** 입니다. 아직 서버에 계정을 만들지 않습니다.
   *    가입을 마치면 온보딩 1단계로 이어지고, 입력한 이메일·팀 이름은 이 탭이
   *    기억해 사이드바·마이페이지에 그대로 보입니다.
   *    서버가 붙으면 `가입하기` 안의 «한 곳» 만 실제 호출로 바꾸면 됩니다.
   */
  const [가입, set가입] = useState({
    이메일: "",
    비밀번호: "",
    비밀번호확인: "",
    팀이름: "",
  });
  const [가입약관, set가입약관] = useState({ 서비스: false, 개인정보: false });
  const [가입오류, set가입오류] = useState<string | null>(null);
  const [가입중, set가입중] = useState(false);
  const setupSteps = ["project", "institution", "upload", "ready"] as const;
  const stepIndex = Math.max(
    0,
    setupSteps.indexOf(step as (typeof setupSteps)[number]),
  );
  /** 서버가 못 줄 때만 쓰는 예비 목록입니다. */
  const 예비사업목록 = [
    "2026 예비창업패키지",
    "2026 초기창업패키지",
    "2026 창업도약패키지",
    "2026 창업중심대학",
    "2026 재도전성공패키지",
    "2026 모두의 창업 일반・기술",
    "2026 초격차 스타트업 1000+",
    "2026 민관공동 창업자 발굴·육성",
  ];

  // 🔴 사업 목록은 `/api/programs` 가 정본입니다 (「2026 」 접두사 없이 옵니다).
  //    못 가져오면 조용히 예비 목록으로 갑니다 — 온보딩이 막히면 안 됩니다.
  useEffect(() => {
    let 살아있음 = true;
    사업선택지().then((목록) => {
      if (!살아있음 || !목록) return;
      set서버사업(목록);
      // 「2026 초기창업패키지」→「초기창업패키지」처럼 서버 문자열로 맞춥니다.
      setProgram((이전) => 목록에맞추기(목록, 이전));
    });
    return () => {
      살아있음 = false;
    };
  }, []);

  const programs = 서버사업 ?? 예비사업목록;

  // 🔴 입력할 때마다 서버를 치지 않도록 250ms 기다립니다. 온보딩 2단계에서만 돕니다.
  //
  // 🔴 «1단계에서 고른 사업» 으로 거릅니다. 전에는 전체 420건이 그대로 나와서,
  //    예비창업패키지를 고른 사람에게 창업중심대학 사업단이 같이 떴습니다.
  //    그 사업으로 등록된 기관이 아직 없으면 `기관검색` 이 필터를 풀고 알려줍니다.
  useEffect(() => {
    if (step !== "institution") return;
    let 살아있음 = true;
    set기관찾는중(true);
    const 타이머 = window.setTimeout(() => {
      기관검색(institutionQuery, { 사업명: program, 크기: 20 }).then((r) => {
        if (!살아있음) return;
        set기관목록(r.항목.length ? r.항목 : []);
        set사업필터해제(Boolean(r.필터해제));
        set기관찾는중(false);
      });
    }, 250);
    return () => {
      살아있음 = false;
      window.clearTimeout(타이머);
    };
  }, [institutionQuery, step, program]);

  /* ── 회원가입 ────────────────────────────────────────────────
     🔴 온보딩과 «같은 껍데기»(setup-shell → setup-content)를 씁니다. 다만 4단계
        스테퍼는 안 붙입니다 — 가입은 그 4단계 밖이고, 붙이면 「1/4」가 두 번
        도는 것처럼 보입니다. 대신 위쪽에 가입 → 설정 흐름을 한 줄로 말합니다. */
  if (step === "signup") {
    const 비번짧음 = 가입.비밀번호.length > 0 && 가입.비밀번호.length < 8;
    const 비번다름 = 가입.비밀번호확인.length > 0 && 가입.비밀번호 !== 가입.비밀번호확인;
    const 채워짐 =
      가입.이메일.trim().includes("@") &&
      가입.비밀번호.length >= 8 &&
      가입.비밀번호 === 가입.비밀번호확인 &&
      가입.팀이름.trim().length > 0 &&
      가입약관.서비스 &&
      가입약관.개인정보;

    /**
     * 🔴 **가입은 두 단계인데 지금은 ①만 됩니다.**
     *      ① Supabase 계정 생성            ← 여기서 합니다
     *      ② 우리 서버에 (이메일 → 기관) 등록 ← **API 가 아직 없습니다**
     *    ②가 빠지면 로그인은 되는데 서버가 403 「등록되지 않은 계정이다」를 냅니다.
     *    그 상태를 조용히 넘기지 않도록 온보딩 뒤 화면이 배너로 말합니다
     *    (`lib/data-source.ts`).
     *
     * 🔴 Supabase 설정 전(인증켜짐=false)에는 예전처럼 «통과» 시킵니다. 설정이
     *    안 들어간 채로 배포돼도 시연이 막히면 안 됩니다.
     */
    const 가입하기 = async () => {
      if (!채워짐 || 가입중) return;
      set가입오류(null);
      set가입중(true);
      try {
        const 결과 = await supabase가입(
          가입.이메일.trim(),
          가입.비밀번호,
          가입.팀이름.trim(),
        );
        if (결과 === "메일확인필요") {
          // 계정은 생겼지만 세션이 없습니다 — 다음 화면으로 보내면 전부 게스트로 돕니다.
          set가입오류(
            "확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.",
          );
          return;
        }
        이메일기억(가입.이메일.trim());
        팀이름기억(가입.팀이름.trim());
        setLoginEmail(가입.이메일.trim());
        setStep("project");
      } catch (e: unknown) {
        set가입오류(e instanceof Error ? e.message : "가입하지 못했습니다.");
      } finally {
        set가입중(false);
      }
    };

    return (
      <main className="onboarding-setup">
        <header className="onboarding-nav">
          <div className="login-brand static">
            <BrandWord />
          </div>
          <button className="outline" onClick={() => setStep("welcome")}>
            로그인으로
          </button>
        </header>
        <section className="setup-shell">
          <section className="setup-content signup-content">
            <p className="login-kicker">회원가입</p>
            <h1>계정을 만들어 주세요.</h1>
            <p>
              가입을 마치면 참여 중인 지원사업과 주관기관을 설정하고 바로 지출
              계획을 점검할 수 있습니다.
            </p>

            <form
              className="signup-form"
              onSubmit={(event) => {
                event.preventDefault();
                가입하기();
              }}
            >
              <label>
                <span>이메일</span>
                <input
                  type="email"
                  value={가입.이메일}
                  onChange={(e) => set가입((v) => ({ ...v, 이메일: e.target.value }))}
                  placeholder="업무용 이메일을 입력하세요"
                  autoComplete="email"
                />
                <small>이 주소로 로그인합니다.</small>
              </label>

              <div className="signup-row">
                <label>
                  <span>비밀번호</span>
                  <input
                    type="password"
                    value={가입.비밀번호}
                    onChange={(e) => set가입((v) => ({ ...v, 비밀번호: e.target.value }))}
                    placeholder="8자 이상"
                    autoComplete="new-password"
                  />
                  <small className={비번짧음 ? "signup-warn" : undefined}>
                    {비번짧음 ? "8자 이상으로 입력해 주세요." : "영문·숫자를 섞어 8자 이상"}
                  </small>
                </label>
                <label>
                  <span>비밀번호 확인</span>
                  <input
                    type="password"
                    value={가입.비밀번호확인}
                    onChange={(e) => set가입((v) => ({ ...v, 비밀번호확인: e.target.value }))}
                    placeholder="다시 한 번 입력하세요"
                    autoComplete="new-password"
                  />
                  <small className={비번다름 ? "signup-warn" : undefined}>
                    {비번다름 ? "비밀번호가 서로 다릅니다." : "\u00a0"}
                  </small>
                </label>
              </div>

              <label>
                <span>팀 이름</span>
                <input
                  value={가입.팀이름}
                  onChange={(e) => set가입((v) => ({ ...v, 팀이름: e.target.value }))}
                  placeholder="사업에 참여 중인 팀·기업 이름"
                  autoComplete="organization"
                />
                <small>지출 계획과 집행 내역이 이 팀 단위로 관리됩니다.</small>
              </label>

              {/* 🔴 판정에 필요 없는 개인 식별 정보는 «입력 칸 자체를 만들지 않습니다».
                  담당자 이름·연락처를 받지 않는 것은 설계 결정입니다. */}
              <div className="signup-agree">
                <label>
                  <input
                    type="checkbox"
                    checked={가입약관.서비스}
                    onChange={(e) => set가입약관((v) => ({ ...v, 서비스: e.target.checked }))}
                  />
                  <span>
                    <b>[필수] 서비스 이용약관에 동의합니다.</b>
                    <small>AI 점검 결과는 참고 정보이며 기관의 승인을 대신하지 않습니다.</small>
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={가입약관.개인정보}
                    onChange={(e) => set가입약관((v) => ({ ...v, 개인정보: e.target.checked }))}
                  />
                  <span>
                    <b>[필수] 개인정보 수집·이용에 동의합니다.</b>
                    <small>이메일과 팀 이름만 수집하며, 지출 점검 목적으로만 사용합니다.</small>
                  </span>
                </label>
              </div>

              {가입오류 && (
                <p className="signup-error">{가입오류}</p>
              )}

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="outline large"
                  disabled={가입중}
                  onClick={() => setStep("welcome")}
                >
                  이전
                </button>
                <button
                  type="submit"
                  className="primary large"
                  disabled={!채워짐 || 가입중}
                >
                  {가입중 ? "계정을 만드는 중…" : "가입하고 시작하기"}
                </button>
              </div>
            </form>

            <p className="onboarding-notice signup-next">
              가입 후 <b>사업 선택 → 주관기관 선택 → 기관 기준 확인</b> 순서로
              초기 설정이 이어집니다.
            </p>
          </section>
        </section>
      </main>
    );
  }

  if (step === "welcome")
    return (
      <main className="onboarding-landing">
        <header className="onboarding-nav">
          <div className="login-brand static">
            <BrandWord />
          </div>
          <span className="onboarding-login-note">최초 로그인 후 초기 설정이 진행됩니다.</span>
        </header>
        <section className="onboarding-hero">
          <div className="onboarding-hero-copy">
            <p className="login-kicker">사업비 사전 점검 AI 서비스</p>
            <h1>
              사업비, 쓰기 전에
              <br />
              <em>AI가 먼저</em> 확인해드려요.
            </h1>
            <p>
              지출 계획을 입력하면 비목부터 사전절차, 필요 증빙, 위험요소까지
              현재 사업 기준으로 미리 점검합니다.
            </p>
            <form
              className="onboarding-login-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!loginEmail.trim() || !loginPassword.trim()) return;
                // 🔴 Supabase 설정이 없으면 예전처럼 «통과» 시킵니다.
                //    설정 전에 배포돼도 시연이 막히지 않게.
                if (!인증켜짐) {
                  이메일기억(loginEmail);   // 🔴 Supabase 에 안 남으므로 화면용으로만 기억
                  setStep("project");
                  return;
                }
                set로그인중(true);
                set로그인오류(null);
                try {
                  await supabase로그인(loginEmail, loginPassword);
                  이메일기억(loginEmail);
                  // 🔴 로그인 직후 GPU 기동에 «머리 시작 시간»을 벌어 둡니다. 실패해도
                  //    조용히 넘어갑니다 — 실제 판정 때 서버가 다시 기동을 시도합니다.
                  if (API켜짐()) GPU깨우기().catch(() => {});
                  setStep("project");
                } catch (e: unknown) {
                  set로그인오류(
                    e instanceof Error ? e.message : "로그인하지 못했습니다.",
                  );
                } finally {
                  set로그인중(false);
                }
              }}
            >
              <div>
                <label>
                  <span>이메일</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="이메일을 입력하세요"
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>비밀번호</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="primary large"
                disabled={!loginEmail.trim() || !loginPassword.trim() || 로그인중}
              >
                {로그인중 ? "확인하는 중…" : "로그인"}
              </button>
              {/* 계정이 없는 사람의 입구. 가입을 마치면 온보딩으로 이어집니다. */}
              <button
                type="button"
                className="outline large"
                disabled={로그인중}
                onClick={() => {
                  set로그인오류(null);
                  setStep("signup");
                }}
              >
                회원가입
              </button>
              {로그인오류 && (
                <small style={{ color: "var(--red, #c23b3b)" }}>{로그인오류}</small>
              )}
              <small>계정이 없으신가요? 회원가입 후 참여 사업을 설정하면 바로 이용할 수 있습니다.</small>
            </form>
          </div>
          <OnboardingDemo />
        </section>
        <section className="onboarding-feature-strip" aria-label="주요 기능">
          <article>
            <Icon name="plans" />
            <div>
              <b>비목 자동 판단</b>
              <span>지출 목적에 맞는 비목을 추천해요.</span>
            </div>
          </article>
          <article>
            <Icon name="rules" />
            <div>
              <b>규정·기준 점검</b>
              <span>현재 사업과 기관 기준을 함께 확인해요.</span>
            </div>
          </article>
          <article>
            <Icon name="check" />
            <div>
              <b>필요 증빙 안내</b>
              <span>결제 전후에 필요한 자료를 정리해요.</span>
            </div>
          </article>
          <article>
            <Icon name="calendar" />
            <div>
              <b>사전절차 체크</b>
              <span>승인·견적·계약 일정을 놓치지 않게 해요.</span>
            </div>
          </article>
        </section>
      </main>
    );

  return (
    <main className="onboarding-setup">
      <header className="onboarding-nav">
        <div className="login-brand static">
          <BrandWord />
        </div>
        <button className="outline" onClick={() => setStep("welcome")}>
          처음으로
        </button>
      </header>
      <section className="setup-shell">
        <nav
          className="onboarding-stepper"
          aria-label={`온보딩 ${stepIndex + 1}/4`}
        >
          {setupSteps.map((item, index) => (
            <span
              key={item}
              className={`${index === stepIndex ? "current" : ""} ${index < stepIndex ? "complete" : ""}`}
            >
              <i>
                {index < stepIndex ? (
                  <Icon name="check" size={13} />
                ) : (
                  index + 1
                )}
              </i>
              {
                ["사업 선택", "주관기관 선택", "기관 기준 등록", "설정 완료"][
                  index
                ]
              }
            </span>
          ))}
        </nav>
        <section className={`setup-content setup-${step}`}>
          {step === "project" && (
            <>
              <p className="login-kicker">선정 사업 설정</p>
              <h1>어떤 지원사업에 선정되셨나요?</h1>
              <p>선택한 사업의 공통 규정을 기준으로 지출 계획을 점검합니다.</p>
              <label className="onboarding-select">
                선정 사업
                <select
                  value={program}
                  onChange={(event) => setProgram(event.target.value)}
                >
                  {programs.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="project-choice active">
                <b>{program}</b>
                <span>중소벤처기업부 · 창업진흥원</span>
                <small>최초에는 주로 사용하는 사업 1개만 설정합니다.</small>
              </div>
              <div className="onboarding-actions">
                <button
                  className="outline large"
                  onClick={() => setStep("welcome")}
                >
                  이전
                </button>
                <button
                  className="primary large"
                  onClick={() => {
                    // 🔴 여기서 고른 사업이 이후 비목 조회·계획 저장·AI 점검에 그대로 쓰입니다.
                    사업저장(program);
                    setStep("institution");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}
          {step === "institution" && (
            <>
              <p className="login-kicker">주관기관 설정</p>
              <h1>주관기관을 선택해주세요.</h1>
              <p>
                기관별 사업비 집행기준을 함께 적용하기 위해 주관기관을
                확인합니다. <b>{program}</b>{을를(program)} 운영하는 기관만 보여드립니다.
              </p>
              {/* 🔴 그 사업으로 등록된 기관이 서버에 아직 없으면 목록을 비우지 않고
                  전체를 보여줍니다 — 대신 그 사실을 말해야 사용자가 오해하지 않습니다. */}
              {사업필터해제 && (
                <p className="onboarding-filter-notice">
                  <span>ⓘ</span>
                  {program}으로 등록된 주관기관이 아직 없어 전체 기관을 보여드립니다.
                </p>
              )}
              <label className="institution-search">
                주관기관 검색
                <span>
                  <Icon name="search" size={17} />
                  <input
                    value={institutionQuery}
                    onChange={(event) => {
                      setInstitutionQuery(event.target.value);
                      setInstitution("");
                      // 🔴 이름을 지우면 slug 도 같이 버립니다. 안 버리면 A 기관을
                      //    골랐다가 B 를 검색해 고른 순간 slug 만 A 로 남습니다.
                      setInstitutionSlug("");
                    }}
                    placeholder="학교·기관 이름을 입력하세요"
                  />
                </span>
              </label>
              <div className="institution-results">
                <small>검색 결과</small>
                {기관찾는중 && 기관목록.length === 0 && <p>찾는 중…</p>}
                {기관목록.map((기관) => {
                  const 고름 = institution === 기관.기관명;
                  const 부제 = 사업요약(기관);
                  return (
                    <button
                      key={기관.slug || 기관.기관명}
                      className={고름 ? "selected" : ""}
                      // 🔴 고른 것을 다시 누르면 해제합니다. 잘못 골랐을 때
                      //    빠져나갈 길이 없으면 새로고침 말고는 방법이 없습니다.
                      onClick={() => {
                        if (고름) {
                          setInstitution("");
                          setInstitutionSlug("");
                          setInstitutionQuery("");
                          return;
                        }
                        setInstitution(기관.기관명);
                        setInstitutionSlug(기관.slug || "");
                        setInstitutionQuery(기관.기관명);
                      }}
                      aria-pressed={고름}
                    >
                      <span>
                        <b>{기관.기관명}</b>
                        {부제 && <small>{부제}</small>}
                      </span>
                      {고름 ? <Icon name="check" size={18} /> : <Icon name="arrow" size={16} />}
                    </button>
                  );
                })}
                {!기관찾는중 && 기관목록.length === 0 && (
                  <p>{program}{을를(program)} 운영하는 기관 중 일치하는 곳이 없습니다.</p>
                )}
              </div>
              <div className="onboarding-actions">
                <button
                  className="outline large"
                  onClick={() => setStep("project")}
                >
                  이전
                </button>
                <button
                  className="primary large"
                  disabled={!institution}
                  onClick={() => {
                    // 🔴 여기서 고른 기관이 사이드바·홈·마이페이지에 그대로 쓰입니다.
                    //    slug 는 화면에 안 쓰지만, 서버 명부 등록이 붙는 날 필요합니다.
                    기관저장(institution, institutionSlug);
                    setStep("upload");
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}
          {step === "upload" && (
            <>
              <p className="login-kicker">기관 세부기준 등록</p>
              <h1>주관기관의 세부기준을 확인해주세요.</h1>
              <p>
                선택한 주관기관의 사업비 집행기준이 이미 등록되어 있습니다. 다른
                문서를 쓰려면 아래에서 파일을 바꿀 수 있습니다.
              </p>
              <dl className="onboarding-standards">
                <div>
                  <dt>선정 사업</dt>
                  <dd>{program}</dd>
                </div>
                <div>
                  <dt>주관기관</dt>
                  <dd>{institution}</dd>
                </div>
                <div>
                  <dt>적용 기준</dt>
                  <dd>
                    {criteriaFile
                      ? "사업 공통 규정 + 기관 세부기준"
                      : "사업 공통 규정 우선 적용"}
                  </dd>
                </div>
              </dl>
              <label
                className={`criteria-upload ${criteriaFile ? "complete" : ""}`}
              >
                <input
                  type="file"
                  /* 🔴 서버가 .doc·.docx 를 415 로 «거부» 합니다 (파서가 없습니다).
                     고를 수 있게 두면 반드시 실패하는 선택지를 주는 셈입니다.
                     `routes_l3.py` 허용_확장자 = {pdf, hwpx, hwp} */
                  accept=".pdf,.hwp,.hwpx"
                  onChange={(event) =>
                    setCriteriaFile(event.target.files?.[0]?.name || "")
                  }
                />
                <span className="criteria-icon">
                  <Icon name={criteriaFile ? "check" : "plus"} size={19} />
                </span>
                <span>
                  <b>{criteriaFile || "기관 세부기준 파일 선택"}</b>
                  <small>
                    {criteriaFile === 적용중_기준파일
                      ? "현재 판정에 적용 중인 기준 문서입니다."
                      : criteriaFile
                        ? "업로드할 파일을 선택했습니다."
                        : "선택사항 · PDF, HWP, HWPX · 최대 30MB"}
                  </small>
                </span>
                <em>{criteriaFile ? "파일 변경" : "파일 찾기"}</em>
              </label>
              {/* 🔴 바꾼 파일이 판정에 쓰인다고 오해하지 않게 «지금 적용 중인 것» 을 밝힙니다.
                  올린 문서를 엔진에 넣으려면 파싱·재적재가 필요한데 MVP 범위 밖입니다. */}
              <p className="onboarding-notice">
                {criteriaFile === 적용중_기준파일
                  ? "등록된 문서는 기관별 금액 기준, 사전승인·심의 조건, 필요 증빙 판단에 사용됩니다."
                  : "새로 올린 문서는 기관 검토 후 판정 기준에 반영됩니다. 그때까지는 현재 등록된 기준 문서가 계속 적용됩니다."}
              </p>
              <div className="onboarding-actions">
                <button
                  className="outline large"
                  onClick={() => setStep("institution")}
                >
                  이전
                </button>
                <button
                  className="primary large"
                  onClick={() => setStep("ready")}
                >
                  설정 완료
                </button>
              </div>
            </>
          )}
          {step === "ready" && (
            <>
              <p className="login-kicker">설정 완료</p>
              <h1>준비됐어요. CHECKUMAIT을 둘러볼까요?</h1>
              <p>
                선택한 사업 기준으로 초기 설정을 완료했습니다. 지출 계획을 작성하면{" "}
                {criteriaFile
                  ? "사업 공통 규정과 기관 세부기준을 함께"
                  : "우선 사업 공통 규정을 기준으로"}{" "}
                확인합니다.
              </p>
              <div className="ready-project">
                <Icon name="check" size={20} />
                <span>
                  <b>{program}</b>
                  {/* 🔴 사용자가 파일을 바꿔도 판정에 적용되는 것은 기존 문서입니다. */}
                  <small>
                    {institution} · {적용중_기준파일}
                  </small>
                </span>
              </div>
              <div className="onboarding-demo-notice">
                <Icon name="fileSearch" size={18} />
                <span>
                  <b>시연용 예시 데이터가 준비되어 있어요.</b>
                  <small>홈에서 작성된 지출 계획과 연결된 집행 일정을 바로 확인할 수 있습니다.</small>
                  {/* 🔴 온보딩에서 고른 사업·기관은 «이 브라우저에만» 저장됩니다.
                      시연 계정의 데이터는 서버가 이미 갖고 있는 것이라 안 바뀝니다.
                      이걸 안 말하면 「설정했는데 왜 그대로냐」는 오해가 납니다. */}
                  <small>현재 온보딩에서 설정한 내용은 시연 계정에 적용되지 않습니다.</small>
                </span>
              </div>
              <div className="ready-actions">
                <button
                  className="primary large"
                  onClick={() => onEnter("home")}
                >
                  홈으로 이동하기
                </button>
                <button
                  className="outline large"
                  onClick={() => onEnter("plan-new")}
                >
                  첫 계획 작성하기
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function HomePage({
  plans,
  schedules,
  go,
}: {
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  go: (route: AppRoute) => void;
}) {
  const 사업 = use사업();
  // 🔴 홈에 박혀 있던 기관명·사업기간·D-day 를 실제 값으로 바꿉니다.
  //    마이페이지와 다른 값이 보이던 자리입니다.
  const 기관 = use기관();
  const 협약 = use협약();
  const 남음 = 디데이표기(협약.종료일);
  const counts = {
    all: plans.length,
    safe: plans.filter((p) => p.status === "특이사항 없음").length,
    warn: plans.filter((p) => p.status === "확인 필요").length,
    risk: plans.filter((p) => p.status === "위험").length,
  };
  const totalAmount = plans.reduce((sum, plan) => sum + plan.amount, 0);
  // 🔴 홈은 「지금 확인해주세요」라 «위험 먼저»가 맞습니다. 다만 그 안에서의 차례가
  //    지출 계획 목록과 달라 같은 계획이 두 화면에서 뒤죽박죽으로 보였습니다.
  //    목록의 기본 정렬(최근 수정순)을 2차 기준으로 써서 둘을 맞춥니다.
  const attentionPlans = plans
    .filter((p) => p.status !== "특이사항 없음")
    .sort(
      (a, b) =>
        Number(b.status === "위험") - Number(a.status === "위험") ||
        b.updatedAt.localeCompare(a.updatedAt, "ko"),
    );
  return (
    <div className="page home-v3">
      <header className="home-v3-heading">
        <div>
          <span>
            안녕하세요! <b>체쿠메이트님.</b>
          </span>
          <h1>지출 계획을 점검하고 필요한 준비를 미리 확인해보세요.</h1>
        </div>
        <button
          className="primary home-v3-new"
          onClick={() => go({ page: "plan-new" })}
        >
          <Icon name="plus" />새 지출 계획
        </button>
      </header>
      <div className="home-v3-overview">
        <section className="home-v3-project">
          <div className="home-v3-project-top">
            <span>진행 중인 사업</span>
            {남음 && (
              <div>
                <small>{남음 === "종료" ? "협약 상태" : "사업 종료까지"}</small>
                <b>{남음}</b>
              </div>
            )}
          </div>
          <h2>{사업}</h2>
          <p>{기관} · 사업비 집행</p>
          <dl>
            <div>
              <Icon name="calendar" size={16} />
              <span>
                <dt>사업기간</dt>
                <dd>{기간표기(협약.시작일, 협약.종료일)}</dd>
              </span>
            </div>
            <div>
              <Icon name="rules" size={16} />
              <span>
                <dt>적용 기준</dt>
                <dd>기관 최신 집행 안내 확인</dd>
              </span>
            </div>
          </dl>
        </section>
        <section className="home-v3-status home-status-reference">
          <header>
            <div>
              <h2>전체 지출 계획 현황</h2>
              <p>
                전체 {counts.all}건 · 예상금액 {won(totalAmount)}
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => go({ page: "plans" })}
            >
              전체 보기 <Icon name="arrow" size={17} />
            </button>
          </header>
          <div className="home-v3-metrics">
            <div>
              <span className="home-metric-label">
                <i>
                  <Icon name="plans" size={23} />
                </i>
                전체
              </span>
              <b>
                {counts.all}
                <em>건</em>
              </b>
            </div>
            <div className="warn">
              <span className="home-metric-label">
                <i>
                  <Icon name="fileAlert" size={23} />
                </i>
                확인 필요
              </span>
              <b>
                {counts.warn}
                <em>건</em>
              </b>
            </div>
            <div className="risk">
              <span className="home-metric-label">
                <i>
                  <Icon name="alert" size={23} />
                </i>
                위험
              </span>
              <b>
                {counts.risk}
                <em>건</em>
              </b>
            </div>
            <div className="safe">
              <span className="home-metric-label">
                <i>
                  <Icon name="check" size={23} />
                </i>
                특이사항 없음
              </span>
              <b>
                {counts.safe}
                <em>건</em>
              </b>
            </div>
          </div>
        </section>
      </div>
      <div className="home-v3-main">
        <section className="home-v3-panel home-v3-attention">
          <header>
            <div>
              <h2>지금 확인해주세요</h2>
              <p>결제 전에 확인이 필요한 지출입니다.</p>
            </div>
            <button
              className="outline small home-v3-panel-cta"
              onClick={() => go({ page: "plans" })}
            >
              전체 지출 계획 보기
            </button>
          </header>
          <div className="home-v3-plan-list">
            {attentionPlans.slice(0, 5).map((plan) => (
              <button
                className="home-v3-plan-row"
                key={plan.id}
                onClick={() => go({ page: "plan-detail", id: plan.id })}
              >
                <span>
                  <b className="home-v3-plan-title">
                    <i
                      className={
                        plan.status === "위험"
                          ? "risk"
                          : plan.status === "확인 필요"
                            ? "warn"
                            : "safe"
                      }
                    />
                    {plan.name}
                  </b>
                  <small>
                    {plan.category} · {won(plan.amount)}
                  </small>
                </span>
                <Status value={plan.status} />
              </button>
            ))}
          </div>
          <footer>
            <Icon name="bell" size={16} />
            <span>확인이 필요한 지출 {attentionPlans.length}건이 더 있어요.</span>
          </footer>
        </section>
        <section className="home-v3-panel home-v3-schedule">
          <header>
            <div>
              <h2>다가오는 일정</h2>
              <p>주요 일정과 준비가 필요한 내용을 확인하세요.</p>
            </div>
            <button
              className="outline small home-v3-panel-cta"
              onClick={() => go({ page: "schedule" })}
            >
              <Icon name="calendar" size={15} />
              전체 캘린더 보기
            </button>
          </header>
          <div className="home-v3-timeline">
            {schedules.slice(0, 5).map((item) => (
              <button
                className={`home-v3-schedule-row ${
                  item.state === "완료"
                    ? "is-done"
                    : item.state === "준비 필요"
                      ? "is-need"
                      : "is-planned"
                }`}
                key={item.id}
                onClick={() => go({ page: "schedule" })}
              >
                <span className="timeline-marker">
                  <i />
                </span>
                <time>
                  <b>{item.date.slice(5).replace("-", ".")}</b>
                  <small>{item.type}</small>
                </time>
                <span>
                  <b>{item.title}</b>
                  <small>{plans.find((p) => p.id === item.planId)?.name}</small>
                </span>
                <em
                  className={
                    item.state === "완료"
                      ? "done"
                      : item.state === "준비 필요"
                        ? "need"
                        : "planned"
                  }
                >
                  {scheduleStateLabel(item.state)}
                </em>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AiCheckingOverlay({
  count,
  planId,
  대체입력,
  제목,
  onComplete,
  onFail,
}: {
  count: number;
  /**
   * 🔴 새 계획 작성 흐름에서만 문구가 다릅니다 (「AI가 지출계획을 작성하고 있어요」).
   *    목록의 일괄 점검은 «이미 있는» 계획을 보는 것이라 기존 문구가 맞습니다.
   */
  제목?: string;
  /** 주면 «진짜» 판정을 부릅니다. 없으면 예전처럼 연출만 합니다. */
  planId?: string;
  /** 방금 만든 계획처럼 상세 조회가 실패할 수 있을 때의 대비 값 */
  대체입력?: {
    사업명?: string | null;
    확정비목?: string | null;
    정규화?: Record<string, unknown> | null;
    제목?: string | null;
    용도?: string | null;
    금액?: number | null;
  };
  onComplete: (판정된계획?: ExpensePlan) => void;
  onFail?: (메시지: string) => void;
}) {
  const [stage, setStage] = useState(0);
  const [설명, set설명] = useState("");
  const 진행중 = useRef<Promise<{ 계획: ExpensePlan }> | null>(null);
  // 🔴 2026-09-04 — GPU 콜드 기동 대응. 마지막으로 「진행」 이벤트를 받은 시각을 기록합니다.
  //    서버 워치독은 5초마다(SUDDOE_GPU_POLL_SEC) 기동 진행을 흘리므로, GPU 를 깨우는 동안은
  //    이 시각이 계속 갱신됩니다. 절대시간 3분으로 끊으면 GPU 콜드 기동(서버 자체 상한
  //    SUDDOE_GPU_START_SEC 기본 300초) 도중에 「오래 걸린다」로 잘못 보고합니다 — 아래
  //    타임아웃은 «마지막 진행 이후 무응답 시간» 을 잽니다.
  const 진행시각 = useRef(Date.now());
  const GPU기동중 = /서버를 깨우는 중|서버가 준비/.test(설명);

  useEffect(() => {
    // ── 연출 경로 (백엔드 없음 / 계획 지정 안 함) ──
    if (!planId || !API켜짐()) {
      const first = window.setTimeout(() => setStage(1), 900);
      const second = window.setTimeout(() => setStage(2), 1800);
      const done = window.setTimeout(() => onComplete(), 2700);
      return () => {
        window.clearTimeout(first);
        window.clearTimeout(second);
        window.clearTimeout(done);
      };
    }

    // ── 진짜 판정 경로 ──
    //
    // 🔴 판정 1건이 GPU 호출이라 «한 번만» 부릅니다. 자동 재시도 없음.
    //
    // 🔴 개발 모드(`npm run dev`)에서 React 는 effect 를 «두 번» 실행합니다
    //    (StrictMode: 마운트 → 정리 → 다시 마운트). 그래서
    //      · 정리에서 요청을 끊으면  → 첫 호출이 죽고
    //      · 「한 번만」 가드로 막으면 → 두 번째가 안 돌아
    //    영원히 기다리게 됩니다. 그래서 «요청을 끊지 않고» 약속(Promise)을
    //    보관해 두었다가, 다시 마운트되면 그 약속에 그대로 매답니다.
    let 살아있음 = true;

    if (!진행중.current) {
      진행중.current = 판정실행(
        planId,
        {
          진행: (문구) => {
            // 언마운트 뒤 호출돼도 React 18+ 에서는 무해합니다 (경고 없음)
            진행시각.current = Date.now();
            set설명(문구);
            setStage((s) => Math.min(2, s + 1));
          },
        },
        { 대체입력 },
      );
    }

    // 🔴 안전장치 — 어떤 이유로도 «영원히» 도는 일이 없게 합니다.
    //    절대시간이 아니라 «마지막 진행 이후 무응답» 을 잽니다 — GPU 콜드 기동은
    //    5초마다 진행 이벤트를 흘려서 계속 갱신되고, 실판정 구간(무응답 최대 실측
    //    약 97초)도 이 안에 들어옵니다. 150초 무응답이면 그때는 정말 멈춘 것입니다.
    const 무응답한도 = 150000;
    const 시간초과 = window.setInterval(() => {
      if (!살아있음) return;
      if (Date.now() - 진행시각.current < 무응답한도) return;
      window.clearInterval(시간초과);
      진행중.current = null;
      onFail?.("점검이 예상보다 오래 걸립니다. 잠시 후 다시 시도해 주세요.");
    }, 5000);

    진행중.current
      .then((r) => {
        window.clearInterval(시간초과);
        if (살아있음) onComplete(r.계획);
      })
      .catch((e: unknown) => {
        window.clearInterval(시간초과);
        if (!살아있음) return;
        진행중.current = null;          // 다음 시도는 새로 부를 수 있게
        const 메시지 = e instanceof Error ? e.message : "점검에 실패했습니다";
        if (onFail) onFail(메시지);
        else onComplete();
      });

    return () => {
      살아있음 = false;
      window.clearInterval(시간초과);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);
  return (
    <div className="ai-checking-backdrop">
      <section className="ai-checking-modal" role="dialog" aria-modal="true" aria-labelledby="ai-checking-title">
        <span className="ai-checking-visual" aria-hidden="true">
          <span className="ai-checking-spinner" />
          <Icon name="sparkSolid" size={20} />
          <i className="ai-check-spark ai-check-spark-one"><Icon name="sparkSolid" size={9} /></i>
          <i className="ai-check-spark ai-check-spark-two"><Icon name="sparkSolid" size={7} /></i>
        </span>
        <h2 id="ai-checking-title">
          {제목 ?? `AI가 지출 계획${count > 1 ? ` ${count}건을` : "을"} 점검하고 있어요`}
        </h2>
        <p>{설명 || "비목, 확인 항목, 필요 증빙을 정리하고 있습니다. 잠시만 기다려주세요."}</p>
        <div className="ai-checking-steps">
          {["기본 정보 확인", "비목 분류", "확인 항목 정리"].map((label, index) => (
            <span className={index <= stage ? "active" : ""} key={label}><i /><b>{label}</b></span>
          ))}
        </div>
        {/* 🔴 GPU 가 꺼져 있으면 몇 분씩 걸릴 수 있습니다 — 「5초」를 그때도 보여주면
            팀원이 「고장」으로 봅니다. 서버가 보낸 문구로 기동 중임을 압니다(고정값 아님). */}
        <small>
          {GPU기동중
            ? "AI 서버를 새로 켜는 중입니다. 몇 분 정도 걸릴 수 있어요."
            : "보통 5초 정도 소요됩니다."}
        </small>
      </section>
    </div>
  );
}

/**
 * 사이드바 GPU 상태 표시 — 화면 Q6 ㄴ.
 *
 * 🔴 `GET /api/gpu/status` 는 캐시값을 돌려줍니다 — 20초 폴링이 RunPod API 를 직접 치지
 *    않습니다(`server/gpu_watchdog.py:516-523`). `종료예정초` 는 null 일 수 있고, 그건
 *    「곧 끝난다」가 아니라 «모른다» 입니다 — 그때는 남은 시간을 안 보여줍니다.
 * 🔴 `vLLM_응답` 은 v4 배포 전에는 응답에 아예 없을 수 있습니다(undefined) — 그때는
 *    이 필드를 못 본 걸로 취급합니다(옛 계약대로 「상태」만 봅니다).
 *    `상태:가동` + `vLLM_응답:false` 는 팟은 떠 있는데 모델이 죽은 사각지대입니다
 *    (2026-09-04, ai-d7/Q1 실측 계기) — 「사용 중」이 아니라 「기동 준비 중」으로 보여줍니다.
 *    이 배지는 판정을 막지 않습니다 — 실제 게이트는 서버 `_실_판정`/`_실_정규화` 안에 있습니다.
 */
function GPU상태배지() {
  const [상태, set상태] = useState<GPU상태값 | null>(null);

  useEffect(() => {
    if (!API켜짐()) return;
    let 살아있음 = true;
    const 조회 = () => {
      GPU상태()
        .then((v) => {
          if (살아있음) set상태(v);
        })
        .catch(() => {
          /* 상태 조회 실패는 조용히 넘어갑니다 — 판정을 막는 자리가 아닙니다 */
        });
    };
    조회();
    const 주기 = window.setInterval(조회, 20000);
    return () => {
      살아있음 = false;
      window.clearInterval(주기);
    };
  }, []);

  if (!상태) return null;

  const 남은분 =
    상태.종료예정초 != null ? Math.max(1, Math.round(상태.종료예정초 / 60)) : null;
  // 🔴 vLLM_응답 이 명시적으로 false 일 때만 사각지대로 봅니다. undefined(필드 없음)·
  //    null(아직 미확인)·true(응답함)는 전부 「상태」값을 그대로 믿습니다.
  const 모델죽음 = 상태.상태 === "가동" && 상태.vLLM_응답 === false;

  // 🔴 「가동 중이고 종료 예정도 모른다」는 평상시라 아무것도 안 보여줍니다.
  //    기동중·중지·모델죽음은 항상 보여줍니다. 가동인데 종료예정초 가 있으면(=유휴
  //    카운트다운 진행 중) 그것도 보여줍니다 — 이게 「사용 중 남은 시간」 표시입니다.
  if (상태.상태 === "가동" && 남은분 == null && !모델죽음) return null;

  return (
    <div className="gpu-status-pill" role="status">
      {모델죽음 ? (
        <span>AI 서버 기동 준비 중 · 판정은 정상 응답합니다</span>
      ) : (
        <>
          {상태.상태 === "기동중" && <span>AI 서버 기동 중</span>}
          {상태.상태 === "중지" && <span>AI 서버 꺼짐 · 판정 요청 시 자동으로 켭니다</span>}
          {상태.상태 === "가동" && <span>AI 서버 사용 중</span>}
        </>
      )}
      {남은분 != null && !모델죽음 && <small>약 {남은분}분 뒤 정리 예정</small>}
    </div>
  );
}

function PlanRecheckQuestionsModal({
  plan,
  close,
  start,
}: {
  plan: ExpensePlan;
  close: () => void;
  start: () => void;
}) {
  const category = plan.category.split(" · ")[0];
  const feeSubtype = plan.category.split(" · ")[1] || "멘토링";
  // 🔴 서버 비목 라벨(「기계장치」)도 질문표(「기계장치비」)에 맞게 찾습니다.
  //    그냥 대괄호로 찾으면 못 찾고 «외주용역비 질문» 으로 조용히 떨어집니다.
  const 찾은질문 = 질문찾기(category);
  const questions =
    category === "지급수수료"
      ? FEE_QUESTIONS[feeSubtype] || FEE_QUESTIONS["멘토링"]
      : 찾은질문.length
        ? 찾은질문
        : CATEGORY_QUESTIONS["외주용역비"];
  return (
    <div className="ai-checking-backdrop" role="presentation">
      <section className="plan-recheck-modal" role="dialog" aria-modal="true" aria-labelledby="plan-recheck-title">
        <header>
          <div>
            <small>{plan.name}</small>
            <h2 id="plan-recheck-title">추가로 확인할게요</h2>
            <p>{plan.category} 판단에 필요한 정보만 확인합니다.</p>
          </div>
          <button type="button" onClick={close} aria-label="닫기">×</button>
        </header>
        <div className="plan-recheck-questions">
          {questions.map((question, index) => (
            <Question key={`${plan.id}-${index}`} label={question.label} options={question.options} />
          ))}
        </div>
        <footer>
          <button className="outline" onClick={close}>취소</button>
          <button className="primary" onClick={start}>답변하고 AI 점검</button>
        </footer>
      </section>
    </div>
  );
}

function PlansPage({
  plans,
  schedules,
  go,
  remove,
  update,
}: {
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  go: (route: AppRoute) => void;
  remove: (ids: string | string[], skipConfirm?: boolean) => boolean;
  update: (plan: ExpensePlan) => void;
}) {
  const [점검오류, set점검오류] = useState<string | null>(null);
  const [filter, setFilter] = useState<"전체" | ReturnType<typeof displayPlanStatus>>("전체");
  const [filterOpen, setFilterOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [detailFilters, setDetailFilters] = useState({
    name: "",
    category: "",
    status: "",
    minAmount: "",
    maxAmount: "",
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpensePlan | null>(null);
  const [draft, setDraft] = useState<ExpensePlan | null>(null);
  const [sortOrder, setSortOrder] = useState<"updated" | "created" | "plannedDate">("updated");
  const [questionPlan, setQuestionPlan] = useState<ExpensePlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [bulkComplete, setBulkComplete] = useState(false);
  const categories = useMemo(
    () => Array.from(new Set(plans.map((plan) => plan.category))).sort(),
    [plans],
  );
  const filteredRows = plans
    .filter(
      (plan) =>
        (filter === "전체" || displayPlanStatus(plan.status) === filter) &&
        (!detailFilters.name ||
          plan.name.toLowerCase().includes(detailFilters.name.toLowerCase())) &&
        (!detailFilters.category || plan.category === detailFilters.category) &&
        (!detailFilters.status || displayPlanStatus(plan.status) === detailFilters.status) &&
        (!detailFilters.minAmount ||
          plan.amount >= Number(detailFilters.minAmount)) &&
        (!detailFilters.maxAmount ||
          plan.amount <= Number(detailFilters.maxAmount)),
    )
    .sort((a, b) =>
      sortOrder === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt, "ko")
        : sortOrder === "plannedDate"
          ? a.plannedDate.localeCompare(b.plannedDate)
          : plans.indexOf(a) - plans.indexOf(b),
    );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const rows = filteredRows.slice(pageStart, pageStart + pageSize);
  const activeDetailFilterCount = [
    detailFilters.category,
    detailFilters.status,
  ].filter(Boolean).length;
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, detailFilters, pageSize]);
  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);
  const toggle = (id: string) =>
    setSelected((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  const exportSelectedCsv = () => {
    const targets = plans.filter((plan) => selected.includes(plan.id));
    if (!targets.length) return;
    const escape = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const header = [
      "비목",
      "세목",
      "세세목",
      "산출 근거",
      "집행일",
      "현금",
      "현물",
      "합계",
      "현금신청 가능 금액",
      "현물 신청 가능금액",
    ];
    const body = targets.map((plan) => {
      const [category = "", subCategory = ""] = plan.category.split(" · ");
      return [
        category,
        subCategory,
        "",
        plan.name,
        plan.plannedDate,
        plan.amount,
        "",
        plan.amount,
        "",
        "",
      ];
    });
    const csv =
      "\uFEFF" +
      [header, ...body].map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `CHECKUMAIT_지출계획_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const counts = {
    all: plans.length,
    safe: plans.filter((p) => p.status === "특이사항 없음").length,
    warn: plans.filter((p) => p.status === "확인 필요").length,
    risk: plans.filter((p) => p.status === "위험").length,
  };
  return (
    <div className="page plans-v2">
      <header className="plans-v2-heading">
        <div>
          <h1>지출 계획</h1>
          <p>
            전체 지출 계획을 등록하고, 점검이 필요한 항목을 선택해 AI 점검을
            시작하세요.
          </p>
        </div>
        <div>
          <button className="primary" onClick={() => go({ page: "plan-new" })}>
            <Icon name="plus" />새 지출 계획
          </button>
        </div>
      </header>
      <section className="plans-v2-metrics">
        <button onClick={() => setFilter("전체")}>
          <span className="metric-icon all">
            <Icon name="plans" />
          </span>
          <span>
            <small>전체</small>
            <b>{counts.all}건</b>
          </span>
        </button>
        <button onClick={() => setFilter("확인 필요")}>
          <span className="metric-icon warn">
            <Icon name="fileText" />
          </span>
          <span>
            <small>확인 필요</small>
            <b>{counts.warn}건</b>
          </span>
        </button>
        <button onClick={() => setFilter("위험")}>
          <span className="metric-icon risk">
            <Icon name="alert" />
          </span>
          <span>
            <small>위험</small>
            <b>{counts.risk}건</b>
          </span>
        </button>
        <button onClick={() => setFilter("특이사항 없음")}>
          <span className="metric-icon safe">
            <Icon name="check" />
          </span>
          <span>
            <small>특이사항 없음</small>
            <b>{counts.safe}건</b>
          </span>
        </button>
      </section>
      <nav className="plans-v2-tabs" aria-label="지출 상태 필터">
        {(["전체", "점검전", "확인 필요", "위험", "특이사항 없음"] as const).map(
          (label) => (
            <button
              className={filter === label ? "active" : ""}
              key={label}
              onClick={() => setFilter(label)}
            >
              {label}
            </button>
          ),
        )}
      </nav>
      <div className="plans-v2-tools">
        <div className="plans-v2-primary-tools">
          <label className="plans-v2-search">
            <Icon name="search" size={17} />
            <input
              value={detailFilters.name}
              onChange={(event) => setDetailFilters((value) => ({ ...value, name: event.target.value }))}
              placeholder="지출명 검색"
            />
          </label>
          <div className="plans-v2-filter-wrap">
            <button
              className={`outline${filterOpen ? " active" : ""}`}
              onClick={() => {
                setFilterOpen((value) => !value);
                setAmountOpen(false);
              }}
              aria-expanded={filterOpen}
            >
              <Icon name="filter" size={16} />
              필터{activeDetailFilterCount > 0 ? ` ${activeDetailFilterCount}` : ""}
            </button>
            {filterOpen && (
              <section className="plans-v2-filter-panel" aria-label="지출 계획 상세 필터">
                <div className="plans-v2-filter-grid">
                <label>
                  <span>예상 비목</span>
                  <select
                    value={detailFilters.category}
                    onChange={(event) => setDetailFilters((value) => ({ ...value, category: event.target.value }))}
                  >
                    <option value="">전체 비목</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label>
                  <span>점검 상태</span>
                  <select
                    value={detailFilters.status}
                    onChange={(event) => setDetailFilters((value) => ({ ...value, status: event.target.value }))}
                  >
                    <option value="">전체 상태</option>
                    <option value="점검전">점검전</option>
                    <option value="특이사항 없음">특이사항 없음</option>
                    <option value="확인 필요">확인 필요</option>
                    <option value="위험">위험</option>
                  </select>
                </label>
                </div>
                <footer>
                  <button
                    className="outline small"
                    onClick={() => setDetailFilters((value) => ({ ...value, category: "", status: "" }))}
                  >
                    초기화
                  </button>
                  <button className="primary small" onClick={() => setFilterOpen(false)}>적용</button>
                </footer>
              </section>
            )}
          </div>
          <div className="plans-v2-amount-wrap">
            <button
              className={`outline${amountOpen ? " active" : ""}`}
              onClick={() => {
                setAmountOpen((value) => !value);
                setFilterOpen(false);
              }}
              aria-expanded={amountOpen}
            >
              금액 범위
              {(detailFilters.minAmount || detailFilters.maxAmount) && <span className="filter-dot" />}
              <Icon name="chevronDown" size={14} />
            </button>
            {amountOpen && (
              <section className="plans-v2-amount-panel" aria-label="금액 범위 설정">
                <label><span>최소 금액</span><input type="number" min="0" value={detailFilters.minAmount} onChange={(event) => setDetailFilters((value) => ({ ...value, minAmount: event.target.value }))} placeholder="0원" /></label>
                <span>–</span>
                <label><span>최대 금액</span><input type="number" min="0" value={detailFilters.maxAmount} onChange={(event) => setDetailFilters((value) => ({ ...value, maxAmount: event.target.value }))} placeholder="제한 없음" /></label>
                <footer>
                  <button className="outline small" onClick={() => setDetailFilters((value) => ({ ...value, minAmount: "", maxAmount: "" }))}>초기화</button>
                  <button className="primary small" onClick={() => setAmountOpen(false)}>적용</button>
                </footer>
              </section>
            )}
          </div>
        </div>
        <div className="plans-v2-export-tools">
          <button
            className="outline"
            disabled={selected.length === 0}
            onClick={exportSelectedCsv}
          >
            <Icon name="fileText" size={15} />
            선택 항목 CSV 출력
          </button>
          <label className="outline plans-v2-sort">
            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as "updated" | "created" | "plannedDate")
              }
              aria-label="지출 계획 정렬"
            >
              <option value="updated">최근 수정순</option>
              <option value="created">최근 작성순</option>
              <option value="plannedDate">예상 지출일 순</option>
            </select>
            <Icon name="chevronDown" size={14} />
          </label>
        </div>
      </div>
      <section className="plans-v2-table">
        <div className="plans-v2-selection">
          <b>
            {selected.length > 0 ? `${selected.length}건 선택됨` : "지출 점검"}
          </b>
          <div>
            <button
              className="primary small"
              disabled={selected.length !== 1}
              onClick={() => {
                const target = plans.find((plan) => plan.id === selected[0]);
                if (target) setQuestionPlan(target);
              }}
            >
              <Icon name="spark" size={15} />
              {selected.length > 1 ? "AI 점검은 1건만 가능" : "선택 항목 AI 점검"}
            </button>
            {점검오류 && (
              <small style={{ color: "var(--red, #c23b3b)" }}>{점검오류}</small>
            )}
            {selected.length > 0 && (
              <>
                <button
                  className="outline small selection-delete"
                  onClick={() => {
                    if (!window.confirm(`선택한 ${selected.length}건의 지출 계획을 삭제할까요? 연결된 집행 일정도 모두 함께 삭제됩니다.`)) return;
                    remove(selected, true);
                    setSelected([]);
                  }}
                >
                  <Icon name="trash" size={14} />
                  선택 삭제
                </button>
                <button className="outline small" onClick={() => setSelected([])}>
                  선택 해제
                </button>
              </>
            )}
          </div>
        </div>
        <div className="plans-v2-table-scroll">
          <table className="plans-v2-native-table">
            <colgroup>
              <col className="checkbox-col" />
              <col className="title-col" />
              <col className="category-col" />
              <col className="amount-col" />
              <col className="status-col" />
              <col className="action-col" />
              <col className="date-col" />
              <col className="more-col" />
            </colgroup>
            <thead>
              <tr>
                <th className="checkbox-cell" scope="col">
                  <label>
                    <span className="sr-only">전체 선택</span>
                    <input
                      type="checkbox"
                      checked={
                        rows.length > 0 &&
                        rows.every((plan) => selected.includes(plan.id))
                      }
                      onChange={() =>
                        setSelected(
                          rows.every((plan) => selected.includes(plan.id))
                            ? []
                            : rows.map((plan) => plan.id),
                        )
                      }
                    />
                  </label>
                </th>
                <th scope="col">지출명</th>
                <th scope="col">예상 비목</th>
                <th className="amount-cell" scope="col">예상 금액</th>
                <th className="status-cell" scope="col">AI 점검 상태</th>
                <th scope="col">예상 지출일</th>
                <th scope="col">최근 수정일</th>
                <th className="more-cell" scope="col">더보기</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((plan) => (
                <tr
                  key={plan.id}
                  onClick={() => go({ page: "plan-detail", id: plan.id })}
                >
                  <td
                    className="checkbox-cell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label>
                      <span className="sr-only">{plan.name} 선택</span>
                      <input
                        type="checkbox"
                        checked={selected.includes(plan.id)}
                        onChange={() => toggle(plan.id)}
                      />
                    </label>
                  </td>
                  <td className="title-cell"><b>{plan.name}</b></td>
                  <td>{plan.category}</td>
                  <td className="amount-cell"><strong>{won(plan.amount)}</strong></td>
                  <td className="status-cell"><Status value={plan.status} /></td>
                  <td className="action-cell planned-date-cell">
                    <span className="planned-date-content">
                    <time>{plan.plannedDate.replaceAll("-", ".")}</time>
                    {(plan.executionStatus === "결제 완료" ||
                      schedules.some(
                        (schedule) =>
                          schedule.planId === plan.id &&
                          schedule.type === "집행" &&
                          schedule.state === "완료",
                      )) && <small className="execution-complete-label">집행 완료</small>}
                    </span>
                  </td>
                  <td className="date-cell"><time>{plan.updatedAt}</time></td>
                  <td
                    className="more-cell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="row-menu">
                      <button
                        aria-label={`${plan.name} 메뉴`}
                        onClick={() =>
                          setOpenMenu((value) =>
                            value === plan.id ? null : plan.id,
                          )
                        }
                      >
                        <Icon name="moreVertical" size={17} />
                      </button>
                      {openMenu === plan.id && (
                        <div>
                          <button
                            onClick={() => {
                              setEditing(plan);
                              setDraft(plan);
                              setOpenMenu(null);
                            }}
                          >
                            <Icon name="edit" size={14} />
                            수정
                          </button>
                          <button
                            className="danger"
                            onClick={() => {
                              remove(plan.id);
                              setSelected((value) =>
                                value.filter((id) => id !== plan.id),
                              );
                              setOpenMenu(null);
                            }}
                          >
                            <Icon name="trash" size={14} />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="plans-v2-empty-row">
                  <td colSpan={8}>조건에 맞는 지출 계획이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer>
          <span>전체 {filteredRows.length}건</span>
          <nav aria-label="페이지 이동">
            <button aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button key={page} className={currentPage === page ? "active" : ""} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            <button aria-label="다음 페이지" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>›</button>
          </nav>
          <label className="outline small plans-v2-page-size">
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="페이지당 표시 개수">
              <option value={5}>5개씩</option>
              <option value={10}>10개씩</option>
              <option value={15}>15개씩</option>
            </select>
            <Icon name="chevronDown" size={13} />
          </label>
        </footer>
      </section>
      {checking && (
        // 🔴 2026-09-04 — 여기에 `planId` 를 «안 넘기고» 있었습니다. 그러면
        //    AiCheckingOverlay 가 2.7초짜리 «연출만» 하고 끝납니다
        //    (`if (!planId || !API켜짐())` 분기). 목록에서 「선택 항목 AI 점검」을
        //    눌러도 서버 판정이 한 번도 안 돌았고, 그래서 상태가 계속 「점검전」
        //    이었습니다. 상세 화면은 넘기고 있어서 거기서만 진짜로 돌았습니다.
        <AiCheckingOverlay
          count={selected.length}
          planId={API켜짐() ? selected[0] : undefined}
          // 🔴 상세 조회가 404·500 이어도 판정을 포기하지 않습니다. 화면이 이미 들고
          //    있는 값으로 대신 판정합니다 — 없으면 「지출계획 23412 을(를) 찾을 수
          //    없습니다」가 그대로 사용자에게 튀어나옵니다.
          대체입력={(() => {
            const 대상 = plans.find((item) => item.id === selected[0]);
            if (!대상) return undefined;
            return {
              사업명: 현재사업(),
              확정비목: 대상.category.split(" · ")[0],
              제목: 대상.name,
              용도: 대상.purpose,
              금액: 대상.amount,
            };
          })()}
          onFail={(메시지) => {
            setChecking(false);
            setBulkComplete(false);
            set점검오류(메시지);
          }}
          onComplete={(판정된계획) => {
            setChecking(false);
            if (판정된계획) update(판정된계획);   // 목록의 배지가 바로 바뀝니다
            setBulkComplete(true);
          }}
        />
      )}
      {questionPlan && (
        <PlanRecheckQuestionsModal
          plan={questionPlan}
          close={() => setQuestionPlan(null)}
          start={() => {
            setQuestionPlan(null);
            setChecking(true);
          }}
        />
      )}
      {bulkComplete && (
        <div className="ai-checking-backdrop">
          <section className="bulk-check-complete" role="dialog" aria-modal="true" aria-labelledby="bulk-complete-title">
            <span className="bulk-complete-icon"><Icon name="check" size={23} /></span>
            <h2 id="bulk-complete-title">지출 계획 점검이 완료됐어요</h2>
            <p>AI 점검 상태와 예상 지출일을 확인해주세요.</p>
            <div className="bulk-complete-summary">
              <span><small>특이사항 없음</small><b>{plans.filter((plan) => selected.includes(plan.id) && plan.status === "특이사항 없음").length}건</b></span>
              <span><small>확인 필요</small><b className="warn">{plans.filter((plan) => selected.includes(plan.id) && plan.status === "확인 필요").length}건</b></span>
              <span><small>위험</small><b className="risk">{plans.filter((plan) => selected.includes(plan.id) && plan.status === "위험").length}건</b></span>
            </div>
            <div className="bulk-complete-list">
              {plans.filter((plan) => selected.includes(plan.id)).map((plan) => (
                <button key={plan.id} onClick={() => go({ page: "plan-detail", id: plan.id })}>
                  <span><b>{plan.name}</b><small>예상 지출일 {plan.plannedDate.replaceAll("-", ".")}</small></span>
                  <Status value={plan.status} />
                  <span className="bulk-result-arrow">›</span>
                </button>
              ))}
            </div>
            <footer><button className="primary" onClick={() => { setBulkComplete(false); setSelected([]); }}>목록에서 확인</button></footer>
          </section>
        </div>
      )}
      {editing && draft && (
        <EditPlan
          plan={draft}
          setPlan={setDraft}
          close={() => {
            setEditing(null);
            setDraft(null);
          }}
          save={() => {
            update(draft);
            setEditing(null);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

function NewPlanPage({
  save,
  cancel,
}: {
  save: (plan: ExpensePlan, temporary?: boolean) => void;
  cancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("2026-09-30");
  const [vendor, setVendor] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [category, setCategory] = useState("외주용역비");
  const [feeSubtype, setFeeSubtype] = useState("멘토링");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<ExpensePlan | null>(null);
  // ── 서버 연동 상태 ──
  const [서버비목, set서버비목] = useState<string[] | null>(null);
  const [서버추천, set서버추천] = useState<string | null>(null);
  const [서버정규화, set서버정규화] = useState<Record<string, unknown> | null>(null);
  const [새planId, set새planId] = useState<string | null>(null);
  const [저장중, set저장중] = useState(false);
  const [연동오류, set연동오류] = useState<string | null>(null);
  const recommendation = useMemo(
    () =>
      name.includes("노트북") || name.includes("카메라")
        ? "기계장치비"
        : name.includes("특허") || name.includes("상표")
          ? "특허권 등 무형자산 취득비"
          : name.includes("급여") || name.includes("인건비")
            ? "인건비"
            : name.includes("교육") || name.includes("훈련")
              ? "교육훈련비"
              : name.includes("출장") || name.includes("교통")
                ? "여비"
                : name.includes("회의")
                  ? "창업활동비"
                  : name.includes("광고")
                    ? "광고선전비"
                    : name.includes("멘토") ||
                        name.includes("임차") ||
                        name.includes("인증")
                      ? "지급수수료"
                      : name.includes("부품") ||
                          name.includes("원단") ||
                          name.includes("재료")
                        ? "재료비"
                        : "외주용역비",
    [name],
  );
  // 🔴 비목 라벨을 화면에 박아 넣지 않습니다 — `/api/vocab` 이 정본입니다.
  //    (서버가 「기계장치」를 주고, 프론트의 「기계장치비」는 원문에 없는 말입니다)
  useEffect(() => {
    if (!API켜짐()) return;
    let 살아있음 = true;
    비목목록(현재사업())
      .then((r) => {
        if (살아있음 && Array.isArray(r.비목) && r.비목.length) set서버비목(r.비목);
      })
      .catch(() => {});
    return () => {
      살아있음 = false;
    };
  }, []);

  const 비목선택지: readonly string[] = 서버비목 ?? EXPENSE_CATEGORIES;
  const 표시추천 = 서버추천 ?? recommendation;
  const questions =
    category === "지급수수료" ? FEE_QUESTIONS[feeSubtype] : 질문찾기(category);
  useEffect(() => {
    if (!categoryLoading) return;

    // ── 백엔드 없음 → 예전 연출 그대로 ──
    if (!API켜짐()) {
      const timer = window.setTimeout(() => {
        setCategory(recommendation);
        setStep(2);
        setCategoryLoading(false);
      }, 1600);
      return () => window.clearTimeout(timer);
    }

    // ── 서버 정규화 ──
    let 살아있음 = true;
    set연동오류(null);
    정규화하기({
      품목: name,
      금액: Number(amount.replace(/,/g, "")) || 0,
      용도: purpose,
      집행예정일: date || undefined,
      거래처: vendor || undefined,
      사업명: 현재사업(),
    })
      .then((r) => {
        if (!살아있음) return;
        set서버정규화(r.정규화);
        const 첫후보 = r.비목후보[0]?.비목;
        // 🔴 후보가 «비어 있는 것도 정상» 입니다 (실서버 폼 경로). 그때는 사용자가 고릅니다.
        if (첫후보) {
          set서버추천(첫후보);
          setCategory(첫후보);
        }
      })
      .catch((e: unknown) => {
        if (!살아있음) return;
        set연동오류(e instanceof Error ? e.message : "정리에 실패했습니다");
      })
      .finally(() => {
        if (!살아있음) return;
        setStep(2);          // 실패해도 다음 단계로 — 사용자가 직접 고르면 됩니다
        setCategoryLoading(false);
      });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryLoading]);
  useEffect(() => {
    if (!questionsLoading) return;
    const timer = window.setTimeout(() => {
      setStep(3);
      setQuestionsLoading(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [questionsLoading]);
  const buildPlan = (temporary: boolean): ExpensePlan => {
    const base =
      INITIAL_PLANS.find((p) => p.category === category) || INITIAL_PLANS[0];
    const categoryLabel =
      category === "지급수수료" ? `${category} · ${feeSubtype}` : category;
    return {
      ...base,
      id: `plan-${Date.now()}`,
      name: name || "새 지출 계획",
      purpose: purpose || "사업 수행을 위한 지출",
      amount: Number(amount.replace(/,/g, "")) || 0,
      plannedDate: date,
      vendor: vendor || "거래처 미정",
      category: categoryLabel,
      status: temporary
        ? "점검 전"
        : category === "광고선전비"
          ? "특이사항 없음"
          : "확인 필요",
      nextAction: temporary
        ? "AI 점검 필요"
        : category === "기계장치비"
          ? "구매 필요성 보완"
          : category === "창업활동비"
            ? "단가 기준 확인"
            : category === "지급수수료"
              ? `${feeSubtype} 조건 확인`
              : "추가정보 확인",
      updatedAt: "2026.08.24 방금 전",
      aiSummary: temporary
        ? "임시저장된 지출 계획입니다. 입력을 완료한 뒤 AI 점검을 진행해주세요."
        : `${categoryLabel}로 분류했습니다. 입력한 목적과 금액을 바탕으로 결제 전 확인할 항목과 증빙을 정리했습니다.`,
    };
  };
  /** 서버에 계획을 만들고 plan_id 를 돌려줍니다. */
  const 서버에저장 = () =>
    계획추가({
      사업명: 현재사업(),
      품목: name,
      금액: Number(amount.replace(/,/g, "")) || 0,
      용도: purpose || "사업 수행을 위한 지출",
      제목: name,
      집행예정일: date || undefined,
      거래처: vendor || undefined,
      // 🔴 화면 9 에서 «사용자가 확정한» 비목입니다. 서버가 enum 10종으로 검증합니다.
      확정비목: category.split(" · ")[0],
      정규화: 서버정규화 ?? undefined,
    });

  /**
   * 🔴 계획을 목록으로 넘기기 «직전» 에 첨부파일을 그 계획 id 로 옮깁니다.
   *    예전에는 `attachments` 를 화면에서 보여주기만 하고 저장할 때 그냥 버렸습니다
   *    — 붙인 파일이 상세에서 사라지던 이유입니다.
   */
  const 저장 = (계획: ExpensePlan, 임시?: boolean) => {
    첨부보관(계획.id, attachments);
    save(계획, 임시);
  };

  const submit = () => {
    if (!API켜짐()) {
      setPendingPlan(buildPlan(false));
      setChecking(true);
      return;
    }
    set저장중(true);
    set연동오류(null);
    서버에저장()
      .then((d) => {
        set새planId(String(d.plan_id));
        setPendingPlan(상세를계획으로(d));
        setChecking(true);
      })
      .catch((e: unknown) => {
        set연동오류(e instanceof Error ? e.message : "저장하지 못했습니다");
      })
      .finally(() => set저장중(false));
  };

  const saveDraft = () => {
    if (!API켜짐()) {
      저장(buildPlan(true), true);
      return;
    }
    set저장중(true);
    서버에저장()
      .then((d) => 저장(상세를계획으로(d), true))
      .catch((e: unknown) => {
        set연동오류(e instanceof Error ? e.message : "임시저장하지 못했습니다");
      })
      .finally(() => set저장중(false));
  };
  return (
    <div className="page narrow">
      <header className="detail-top new-plan-header">
        <button className="back-button" onClick={cancel}>
          <Icon name="back" />
        </button>
        <div>
          <h1>새 지출 계획</h1>
          <p>기본 정보를 입력하면 AI가 비목과 확인 항목을 추천합니다.</p>
        </div>
      </header>
      <div className="stepper">
        <span className={step >= 1 ? "active" : ""}>1 기본 정보</span>
        <i />
        <span className={step >= 2 ? "active" : ""}>2 비목 확인</span>
        <i />
        <span className={step >= 3 ? "active" : ""}>3 추가 확인</span>
      </div>
      <section className="form-card">
        {step === 1 && (
          <>
            <h2>기본 정보</h2>
            <div className="field-grid">
              <label className="full">
                <span className="field-label">
                  지출 항목 <em className="required-mark">*</em>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 개발용 노트북 구매"
                />
              </label>
              <label className="full">
                <span className="field-label">
                  사용 목적 <em className="required-mark">*</em>
                </span>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="사업 수행에 왜 필요한지 작성해주세요."
                />
              </label>
              <label>
                <span className="field-label">
                  예상 금액 <small className="vat-included">부가세 포함</small> <em className="required-mark">*</em>
                </span>
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                />
              </label>
              <label>
                예상 지출일
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="full">
                거래처
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="미정인 경우 비워둘 수 있어요."
                />
              </label>
              <div className="full file-field">
                <div className="new-plan-file-head">
                  <span>
                    <b className="field-label">첨부파일</b>
                    <small>견적서·과업자료 등이 있다면 첨부해주세요.</small>
                  </span>
                  <label className="new-plan-file-button">
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        // 🔴 상세 화면과 같은 한도(개별 3MB · 최대 10개)를 여기서도 겁니다.
                        //    여기서 안 막으면 상세에서 못 다루는 파일이 들어옵니다.
                        const selectedFiles = Array.from(event.target.files || []);
                        const 넘김 = selectedFiles.filter((f) => f.size > 3 * 1024 * 1024);
                        const 통과 = selectedFiles.filter((f) => f.size <= 3 * 1024 * 1024);
                        if (넘김.length) set연동오류("첨부파일은 개별 3MB 이하만 올릴 수 있습니다.");
                        if (통과.length) {
                          setAttachments((current) => [...current, ...통과].slice(0, 10));
                        }
                        event.target.value = "";
                      }}
                    />
                    + 파일 첨부
                  </label>
                </div>
                {attachments.length > 0 && (
                  <ul className="new-plan-file-list">
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        <Icon name="fileText" size={15} />
                        <b>{file.name}</b>
                        <small>
                          {file.size >= 1024 * 1024
                            ? `${(file.size / 1024 / 1024).toFixed(1)}MB`
                            : `${Math.max(1, Math.round(file.size / 1024))}KB`}
                        </small>
                        <button
                          type="button"
                          aria-label={`${file.name} 삭제`}
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>AI 비목 추천</h2>
            <p className="section-copy">
              입력한 지출 내용과 목적을 바탕으로 가장 가까운 비목을 자동
              선택했습니다. 직접 변경할 수 있습니다.
            </p>
            <div className="category-grid">
              {비목선택지.map((item) => (
                <button
                  key={item}
                  className={`${category === item ? "selected" : ""} ${표시추천 === item ? "recommended" : ""}`}
                  onClick={() => setCategory(item)}
                >
                  <span>{item}</span>
                  {표시추천 === item && (
                    <em>
                      <Icon name="sparkSolid" size={11} />
                      AI 추천
                    </em>
                  )}
                </button>
              ))}
            </div>
            {category === "지급수수료" && (
              <section className="fee-subtype-panel">
                <header>
                  <b>어떤 지급수수료인가요?</b>
                  <span>
                    세부 유형에 따라 확인 기준과 필요 증빙이 달라집니다.
                  </span>
                </header>
                <div>
                  {FEE_SUBTYPES.map((item) => (
                    <button
                      key={item}
                      className={feeSubtype === item ? "selected" : ""}
                      onClick={() => setFeeSubtype(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="additional-check-title">몇 가지만 추가로 확인할게요</h2>
            <p className="section-copy additional-check-copy">
              {category === "지급수수료"
                ? `${feeSubtype} 기준으로 필요한 정보만 확인합니다.`
                : `${category} 판단에 필요한 정보만 확인합니다.`}
            </p>
            <div className="auto-check-note">
              <Icon name="check" />
              <span>
                <b>입력 내용으로 먼저 확인했어요</b>예상 금액·지출일·사용
                목적은 자동 점검에 반영됩니다.
              </span>
            </div>
            <div className="question-list">
              {questions.map((question, index) => (
                <Question
                  key={`${category}-${feeSubtype}-${index}`}
                  label={question.label}
                  options={question.options}
                />
              ))}
            </div>
            <div className="info-note">
              <Icon name="spark" />
              답변을 반영해 공통 기준과 비목별 기준을 함께 점검합니다.
            </div>
          </>
        )}
      </section>
      {연동오류 && (
        <p className="section-copy" style={{ color: "var(--red, #c23b3b)" }}>
          {연동오류}
        </p>
      )}
      <footer className="form-actions">
        <button
          className="outline"
          disabled={categoryLoading || questionsLoading}
          onClick={step === 1 ? cancel : () => setStep(step - 1)}
        >
          {step === 1 ? "취소" : "이전"}
        </button>
        <button className="outline draft-save" onClick={saveDraft} disabled={categoryLoading || questionsLoading || 저장중}>
          임시저장
        </button>
        <button
          className="primary"
          disabled={categoryLoading || questionsLoading || 저장중 || (step === 1 && (!name || !purpose || !amount))}
          onClick={() => {
            if (step === 1) {
              setCategoryLoading(true);
            } else if (step === 2) setQuestionsLoading(true);
            else submit();
          }}
        >
          {step === 1
            ? "비목 확인하기"
            : step === 2
              ? "AI 점검하기"
              : "결과 확인하기"}
        </button>
      </footer>
      {checking && pendingPlan && (
        <AiCheckingOverlay
          count={1}
          planId={새planId ?? undefined}
          제목="AI가 지출계획을 작성하고 있어요."
          대체입력={{
            사업명: 현재사업(),
            확정비목: category.split(" · ")[0],
            정규화: 서버정규화,
            제목: name,
            용도: purpose,
            금액: Number(amount.replace(/,/g, "")) || 0,
          }}
          onFail={(메시지) => {
            setChecking(false);
            set연동오류(메시지);
            저장(pendingPlan);      // 저장은 됐으니 목록으로는 보냅니다
          }}
          onComplete={(판정된계획) => {
            setChecking(false);
            저장(판정된계획 ?? pendingPlan);
          }}
        />
      )}
      {(categoryLoading || questionsLoading) && (
        <div className="category-analysis-backdrop">
          <section
            className="category-analysis-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-analysis-title"
          >
            <span className="category-analysis-visual" aria-hidden="true">
              <span className="category-analysis-spinner" />
              <Icon name="sparkSolid" size={18} />
              <i className="analysis-spark analysis-spark-one"><Icon name="sparkSolid" size={8} /></i>
              <i className="analysis-spark analysis-spark-two"><Icon name="sparkSolid" size={6} /></i>
            </span>
            <h2 id="category-analysis-title">{questionsLoading ? "AI가 내용을 점검하고 있어요." : "입력한 내용을 분석하고 있어요"}</h2>
            <p>{questionsLoading ? "선택한 비목에 맞는 추가 질문을 준비하고 있습니다." : "지출 항목과 사용 목적을 바탕으로 적합한 비목을 찾고 있습니다."}</p>
            <small>잠시만 기다려주세요.</small>
          </section>
        </div>
      )}
    </div>
  );
}

function Question({
  label,
  options = ["예", "아니오", "확인 필요"],
}: CheckQuestion) {
  const [value, setValue] = useState("");
  return (
    <div className="question">
      <b>{label}</b>
      <div>
        {options.map((option) => (
          <button
            key={option}
            className={value === option ? "active" : ""}
            onClick={() => setValue(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 「판단불가」일 때 서버가 함께 보내주는 «주관기관에 보낼 문의 초안».
 *
 * 🔴 서버가 LLM 을 한 번도 더 부르지 않고 판정이 이미 쥔 값(품목·금액·인용·전제)으로
 *    조립합니다(`server/inquiry.py`). 값이 없으면 키 자체가 안 오므로, 부르는 쪽에서
 *    `plan.문의초안` 이 있을 때만 그립니다.
 *
 * 🔴 접어 둡니다. 판정 결과를 보러 온 사람에게 긴 메일 본문이 먼저 펼쳐져 있으면
 *    「AI 점검 결과」가 안 읽힙니다. 필요한 사람만 폅니다.
 */
function 문의초안카드({
  초안,
  notify,
}: {
  초안: string;
  notify: (message: string) => void;
}) {
  const [복사됨, set복사됨] = useState(false);

  const 복사 = async () => {
    try {
      // 🔴 clipboard API 는 https / localhost 에서만 됩니다. 막히면 조용히 실패하지
      //    않고 «선택해서 복사하세요» 로 안내합니다 — 눌렀는데 아무 일도 안 나는 게
      //    제일 나쁩니다.
      await navigator.clipboard.writeText(초안);
      set복사됨(true);
      window.setTimeout(() => set복사됨(false), 2000);
    } catch {
      notify("복사하지 못했습니다. 아래 글을 직접 선택해 복사해주세요.");
    }
  };

  return (
    <details className="ai-inquiry">
      <summary>
        <div className="ai-inquiry-title">
          <Icon name="fileText" size={20} />
          <div>
            <b>주관기관에 보낼 문의 초안</b>
            <small>규정만으로 결론이 안 나서, 물어볼 내용을 정리했습니다.</small>
          </div>
        </div>
        {/* 🔴 열림/닫힘 글자는 CSS 로 바꿉니다. details 의 open 을 React state 로
            따로 들면 사용자가 직접 접었다 편 것과 어긋나기 쉽습니다. */}
        <span className="ai-inquiry-toggle">
          <span className="when-closed">펼치기</span>
          <span className="when-open">접기</span>
          <Icon name="arrow" size={14} />
        </span>
      </summary>
      <div className="ai-inquiry-body">
        <div className="ai-inquiry-head">
          <small>그대로 복사해서 메일로 보내면 됩니다.</small>
          <button
            type="button"
            className="outline small"
            onClick={복사}
            aria-live="polite"
          >
            {복사됨 ? "복사됨" : "복사"}
          </button>
        </div>
        {/* 🔴 서버가 준 글자를 «한 글자도 안 고칩니다». 줄바꿈만 살립니다. */}
        <pre className="ai-inquiry-text">{초안}</pre>
        <p className="ai-inquiry-notice">
          <span>ⓘ</span>초안입니다. 보내기 전에 기관명·담당자·사업명이 맞는지
          확인해주세요.
        </p>
      </div>
    </details>
  );
}

function PlanDetail({
  plan,
  allPlans,
  update,
  addSchedules,
  할일동기화,
  remove,
  back,
  notify,
}: {
  plan?: ExpensePlan;
  allPlans: ExpensePlan[];
  update: (plan: ExpensePlan) => void;
  addSchedules: (items: ScheduleItem[]) => void;
  /** 🔴 체크박스는 이걸로 바꿉니다 — 집행 일정까지 같이 움직이고 서버 저장도 여기서. */
  할일동기화: (planId: string, taskId: string, 완료: boolean) => void;
  remove: () => void;
  back: () => void;
  notify: (message: string) => void;
}) {
  const 사업 = use사업();
  const [editing, setEditing] = useState(false);
  const [recheckPrompt, setRecheckPrompt] = useState(false);
  const [recheckQuestions, setRecheckQuestions] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [scheduleGroup, setScheduleGroup] = useState<
    "aiChecks" | "evidence" | null
  >(null);
  const [draft, setDraft] = useState(plan);
  // 🔴 2026-09-04 — 여기에 「○○ 견적서.pdf」·「○○ 참고자료.pdf」 두 건을 «지어내고»
  //    있었습니다. 이제 «사용자가 실제로 붙인» 파일만 보여줍니다
  //    (새 지출 계획에서 붙인 것 + 이 화면에서 추가한 것).
  const [planFiles, setPlanFiles] = useState<첨부[]>(() =>
    plan ? 첨부읽기(plan.id) : [],
  );
  // 다른 계획을 열면 그 계획의 첨부로 갈아 끼웁니다.
  useEffect(() => {
    setPlanFiles(plan ? 첨부읽기(plan.id) : []);
  }, [plan?.id]);
  // 이 화면에서 추가·삭제한 결과를 보관함에 되돌려 놓습니다 — 나갔다 와도 남게.
  useEffect(() => {
    if (plan?.id) 첨부쓰기(plan.id, planFiles);
  }, [plan?.id, planFiles]);
  const [evidenceFiles, setEvidenceFiles] = useState<Record<string, File>>({});
  const [actualDate, setActualDate] = useState(plan?.actualDate || plan?.plannedDate || "");
  const [actualAmount, setActualAmount] = useState(
    plan?.actualAmount ? String(plan.actualAmount) : "",
  );
  /**
   * 🔴 「결제 완료」 체크박스를 없앴습니다. 체크와 등록 버튼이 따로 있어서
   *    「체크만 하고 등록을 안 누른」 반쯤 등록된 상태가 만들어졌습니다.
   *    이제 등록 버튼 하나가 확인 창을 띄우고, 누르면 그게 곧 결제 완료입니다.
   *
   *    등록한 뒤에는 «잠깁니다». 누적 집행액에 이미 반영된 값이라 아무 때나
   *    바뀌면 안 됩니다 — 고치려면 「수정하기」로 명시적으로 풀어야 합니다.
   */
  const 집행등록됨 = plan?.executionStatus === "결제 완료";
  const [집행수정중, set집행수정중] = useState(false);
  const [집행확인, set집행확인] = useState<null | "등록" | "수정">(null);
  const 집행잠김 = 집행등록됨 && !집행수정중;
  if (!plan || !draft)
    return (
      <div className="page">
        <div className="empty-state">
          <h1>지출 계획을 찾을 수 없습니다.</h1>
          <button className="primary" onClick={back}>
            목록으로
          </button>
        </div>
      </div>
    );
  const toggle = (group: "aiChecks" | "evidence", id: string) => {
    const 켜짐 = !plan[group].find((item) => item.id === id)?.done;
    // 🔴 상세 체크박스와 집행 일정의 완료 체크는 «같은 것» 입니다 (서버 plan_tasks 한 행).
    //    한 곳에서 처리해 두 화면이 같이 바뀌고, 서버 저장도 한 번만 나갑니다.
    할일동기화(plan.id, id, 켜짐);
  };

  const saveScheduleChecks = (
    items: { id: string; label: string; date: string }[],
  ) => {
    const stamp = Date.now();
    addSchedules(
      items.map((item, index) => ({
        id: `schedule-${stamp}-${index}`,
        // 🔴 어느 할일에서 나왔는지 남깁니다. 이게 있어야 집행 일정에서 완료를
        //    누를 때 상세의 체크박스도 같이 켜집니다.
        taskId: item.id,
        planId: plan.id,
        title: item.label,
        date: item.date,
        type: scheduleGroup === "evidence" ? "증빙" : "사전 확인",
        state: "준비 필요",
        checks: [],
      })),
    );
    setScheduleGroup(null);
    notify(`${items.length}개 항목을 집행 일정에 등록했습니다.`);
  };
  const pendingChecks = plan.aiChecks.filter((item) => !item.done).length;
  const savedActualAmount = Number(actualAmount.replace(/[^0-9]/g, "")) || 0;
  const cumulativeActualAmount = allPlans.reduce(
    (sum, item) =>
      sum +
      (item.id === plan.id
        ? savedActualAmount
        : item.executionStatus === "결제 완료"
          ? item.actualAmount || 0
          : 0),
    0,
  );
  /** 버튼을 눌렀을 때 — 값만 검사하고 «확인 창» 을 엽니다. 저장은 창에서 합니다. */
  const 집행확인열기 = (종류: "등록" | "수정") => {
    if (!actualDate || savedActualAmount <= 0) {
      notify("실제 지출일과 지출액을 입력해주세요.");
      return;
    }
    set집행확인(종류);
  };

  const 집행저장 = () => {
    const 종류 = 집행확인;
    set집행확인(null);
    if (!종류) return;
    update({
      ...plan,
      actualDate,
      actualAmount: savedActualAmount,
      executionStatus: "결제 완료",
      updatedAt: 시각표기(new Date().toISOString()),
    });
    set집행수정중(false);
    notify(종류 === "등록" ? "실제 집행 정보를 등록했습니다." : "실제 집행 정보를 수정했습니다.");
  };

  /** 수정을 그만둘 때 — 등록돼 있던 값으로 되돌립니다. */
  const 집행수정취소 = () => {
    setActualDate(plan.actualDate || plan.plannedDate || "");
    setActualAmount(plan.actualAmount ? String(plan.actualAmount) : "");
    set집행수정중(false);
  };
  const formatSize = (size: number) =>
    size >= 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)}MB`
      : `${Math.max(1, Math.round(size / 1024))}KB`;
  const downloadFile = (name: string, file?: File) => {
    const blob = file || new Blob([`${name} 파일 미리보기`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="page expense-detail-page expense-detail-redesign expense-v5">
      <header className="expense-v5-header">
        <div className="expense-v5-toolbar">
          <button className="detail-back-link" onClick={back}>
            <Icon name="back" size={16} />
            지출 계획
          </button>
          <div className="detail-actions">
            {(plan.status === "재점검 필요" || plan.status === "점검 전") && (
              <button className="primary" onClick={() => setRecheckQuestions(true)}>
                <Icon name="spark" size={15} />
                {plan.status === "재점검 필요" ? "재점검하기" : "AI 점검하기"}
              </button>
            )}
            <button
              className="outline"
              onClick={() => {
                setDraft(plan);
                setEditing(true);
              }}
            >
              수정
            </button>
            <div className="row-menu detail-more-menu">
              <button
                className="more-square"
                aria-label="더보기"
                onClick={() => setDetailMenuOpen((value) => !value)}
              >
                <Icon name="moreVertical" />
              </button>
              {detailMenuOpen && (
                <div>
                  <button className="danger" onClick={remove}>
                    <Icon name="trash" size={14} />
                    지출 계획 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <h1>{plan.name}</h1>
        <p>최근 수정 {plan.updatedAt}</p>
      </header>
      <main className="expense-v5-flow">
        <section className="expense-v5-section expense-v5-plan">
          <header className="expense-v5-section-head">
            <h2>지출 계획 정보</h2>
          </header>
          <dl className="expense-v5-plan-grid">
            <Info label="지출 항목" value={plan.name} />
            <Info label="관련 비목" value={plan.category} />
            <Info
              label="예상 금액"
              value={`${won(plan.amount)} (부가세 포함)`}
            />
            <Info
              label="예상 지출일"
              value={plan.plannedDate.replaceAll("-", ".")}
            />
            <Info label="거래처" value={plan.vendor} />
            <Info label="사업" value={사업} />
            <Info label="사용 목적" value={plan.purpose} className="wide" />
            <div className="expense-v5-file-row">
              <span>첨부 파일</span>
              <div>
                {planFiles.length === 0 && (
                  <p className="expense-v5-file-empty">
                    첨부한 파일이 없습니다. 견적서·과업자료가 있으면 올려 두세요.
                  </p>
                )}
                <ul>
                  {planFiles.map((file) => (
                    <li key={file.id}>
                      <Icon name="fileText" size={15} />
                      <b>{file.name}</b>
                      <small>{file.size}</small>
                      <button
                        aria-label={`${file.name} 다운로드`}
                        onClick={() => downloadFile(file.name, file.file)}
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`${file.name} 삭제`}
                        onClick={() =>
                          setPlanFiles((items) =>
                            items.filter((item) => item.id !== file.id),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <footer>
                  <label className="outline small expense-v5-add-file">
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        const selectedFiles = Array.from(event.target.files || []);
                        if (selectedFiles.some((file) => file.size > 3 * 1024 * 1024)) {
                          notify("첨부파일은 개별 3MB 이하만 등록할 수 있습니다.");
                        }
                        const added = selectedFiles
                          .filter((file) => file.size <= 3 * 1024 * 1024)
                          .map(
                          (file) => ({
                            id: `${file.name}-${file.lastModified}-${Math.random()}`,
                            name: file.name,
                            size: formatSize(file.size),
                            file,
                          }),
                        );
                        setPlanFiles((items) => [...items, ...added].slice(0, 10));
                        event.target.value = "";
                      }}
                    />
                    파일 추가
                  </label>
                  <small>최대 10개 / 개별 3MB 이하</small>
                </footer>
              </div>
            </div>
          </dl>
        </section>
        <section className="expense-v5-section expense-v5-ai">
          <header className="expense-v5-section-head">
            <div>
              <h2>AI 점검 결과</h2>
            </div>
          </header>
          {plan.status === "재점검 필요" && (
            <div className="recheck-stale-notice">
              <Icon name="filePenLine" size={19} />
              <span>
                <b>지출 계획 수정 전 점검 결과입니다.</b>
                <small>변경된 내용을 반영하려면 AI 재점검이 필요합니다.</small>
              </span>
            </div>
          )}
          <div className={`ai-result-frame ${plan.status === "재점검 필요" ? "is-stale" : ""}`}>
            <div className="ai-verdict-row">
              <Status value={plan.status === "재점검 필요" ? plan.previousStatus || "확인 필요" : plan.status} />
              <div>
                {/* 🔴 「조건부」와 「판단불가」는 같은 🟡 인데 할 일이 정반대입니다.
                    판정을 받은 계획이면 판정별 문구를, 아니면 기존 문구를 씁니다. */}
                <h3>
                  {판정제목(plan.판정, plan.category) ??
                    `${plan.category} 기준으로 ${
                      plan.status === "특이사항 없음"
                        ? "특이사항이 없습니다."
                        : "추가 확인이 필요합니다."
                    }`}
                </h3>
                {행동문구(plan.판정) && (
                  <p className="ai-verdict-action">
                    <b>{행동문구(plan.판정)}</b>
                  </p>
                )}
                <p>
                  현재 입력된 내용을 기준으로 확인했으며, 안전한 집행을 위해
                  아래 항목을 추가로 점검해주세요.
                </p>
              </div>
            </div>
            <div className="ai-explanation">
              <Icon name="spark" size={20} />
              <div>
                <b>AI 해설</b>
                {/* 🔴 여기는 «서버가 실제로 판단한 문장» 자리입니다.
                    예전에는 화면에 박아 둔 문구라, 어떤 계획을 열어도 같은 해설이
                    나왔습니다. 서버 요약이 있으면 그걸 보여줍니다. */}
                <p>
                  {plan.aiSummary ||
                    (plan.status === "특이사항 없음"
                      ? "현재 조건에서는 주요 사전 준비가 확인됐습니다. 집행 후 증빙을 빠짐없이 보관하세요."
                      : "사업계획과의 연관성은 확인됐습니다. 다만 계약 전에 과업 범위, 결과물, 검수 기준을 문서로 명확히 하고 금액 적정성과 특수관계 여부를 추가로 확인해야 합니다.")}
                </p>
              </div>
            </div>
            <section className="ai-before-checks">
              <header>
                <div>
                  <Icon name="clipboardCheck" size={20} />
                  <b>결제 전 확인</b>
                </div>
                <button
                  className="outline small"
                  onClick={() =>
                    document
                      .getElementById("payment-before")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  집행 준비에서 확인하기 <span aria-hidden="true">↓</span>
                </button>
              </header>
              <div>
                {plan.aiChecks.map((item, index) => (
                  <article key={item.id}>
                    <i>
                      <Icon
                        name={
                          index === 1 ? "alert" : index === 2 ? "user" : "plans"
                        }
                        size={20}
                      />
                    </i>
                    <span>
                      <b>{item.label}</b>
                      <small>{item.description}</small>
                    </span>
                  </article>
                ))}
              </div>
            </section>
            <section className="ai-basis">
              <header>
                <div>
                  <Icon name="rules" size={20} />
                  <b>적용 근거</b>
                </div>
                <strong>{plan.rules.length}건</strong>
              </header>
              <div>
                {plan.rules.map((rule, index) => (
                  <article key={index}>
                    <i>{index + 1}</i>
                    <span>
                      <b>{rule.title}</b>
                      <small>{rule.source}</small>
                      <p>{rule.description}</p>
                    </span>
                  </article>
                ))}
              </div>
            </section>
            {/* 🔴 「판단불가」의 결말입니다. 배지와 해설은 «못 정했다» 까지만 말하고,
                「그래서 뭐라고 물어보나」는 여기 있습니다. 서버가 준 값이 있을 때만
                나옵니다 — 없으면 통째로 안 그립니다(빈 카드를 남기지 않습니다). */}
            {plan.문의초안 && <문의초안카드 초안={plan.문의초안} notify={notify} />}
            <p className="ai-result-notice">
              <span>ⓘ</span>AI 점검 결과는 참고용이며, 최종 판단과 책임은
              담당기관의 최신 안내를 확인해주세요.
            </p>
          </div>
        </section>
        <section className="expense-v5-section expense-v5-prep">
          <header className="expense-v5-section-head">
            <div>
              <h2>집행 준비</h2>
              <p>결제 전 확인부터 지출 후 증빙까지 단계별로 관리하세요.</p>
            </div>
          </header>
          <div className="expense-v5-prep-grid">
            <section id="payment-before">
              <header>
                <div>
                  <h3><i>1</i><span>결제 전 확인</span></h3>
                  <small>결제 전에 완료해야 하는 항목</small>
                </div>
                <b>
                  {plan.aiChecks.filter((item) => item.done).length}/
                  {plan.aiChecks.length}
                </b>
              </header>
              <div className="expense-v5-checks">
                {plan.aiChecks.map((item) => (
                  <label key={item.id} className={item.done ? "done" : ""}>
                    <input
                      type="checkbox"
                      checked={Boolean(item.done)}
                      onChange={() => toggle("aiChecks", item.id)}
                    />
                    <span>
                      <b>{item.label}</b>
                      <small>{item.description}</small>
                    </span>
                  </label>
                ))}
              </div>
              <footer>
                <span>필요한 확인사항을 일정에 연결해 관리할 수 있습니다.</span>
                <button
                  className="outline small"
                  onClick={() => setScheduleGroup("aiChecks")}
                >
                  일정에 추가
                </button>
              </footer>
            </section>
            {/* 🔴 1 결제 전 확인 / 2·3 결제 이후 — 세 카드가 한 덩어리로 붙어 있어
                「지금 뭘 해야 하나」가 안 보였습니다. 결제를 기준으로 끊습니다. */}
            <div className="expense-v5-prep-split" role="presentation" />
            <section className="expense-v5-execution-card">
              <header>
                <div>
                  <h3><i>2</i><span>실제 집행 정보</span></h3>
                  <small>누적 집행액 계산에 반영되는 정보</small>
                </div>
                {plan.executionStatus && <b>{plan.executionStatus}</b>}
              </header>
              <div className={`expense-v5-execution-form ${집행잠김 ? "is-locked" : ""}`}>
                <label>
                  <span>실제 지출일</span>
                  <input
                    type="date"
                    value={actualDate}
                    disabled={집행잠김}
                    onChange={(event) => setActualDate(event.target.value)}
                  />
                </label>
                <label>
                  <span>실제 지출액 <small>부가세 포함</small></span>
                  <div className="expense-v5-amount-input">
                    <input
                      inputMode="numeric"
                      placeholder="0"
                      disabled={집행잠김}
                      value={actualAmount ? Number(actualAmount.replace(/[^0-9]/g, "")).toLocaleString("ko-KR") : ""}
                      onChange={(event) => setActualAmount(event.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <b>원</b>
                  </div>
                </label>
              </div>
              <div className="expense-v5-execution-summary">
                <span>예상 금액 <b>{won(plan.amount)}</b></span>
                <span>실제 지출액 <b>{savedActualAmount ? won(savedActualAmount) : "미입력"}</b></span>
                <span>누적 집행액 <b>{won(cumulativeActualAmount)}</b></span>
              </div>
              <footer>
                <span>
                  {집행잠김
                    ? "등록을 마쳐 잠겨 있습니다. 값을 바꾸려면 수정하기를 누르세요."
                    : "등록한 실제 지출액은 누적 집행액에 반영됩니다."}
                </span>
                {/* 🔴 상태에 따라 버튼이 하나씩만 뜹니다 — 「등록」과 「수정」이 같이
                    보이면 어느 것이 지금 할 일인지 안 보입니다. */}
                {집행수정중 ? (
                  <span className="expense-v5-execution-buttons">
                    <button className="outline small" onClick={집행수정취소}>취소</button>
                    <button className="primary small" onClick={() => 집행확인열기("수정")}>수정하기</button>
                  </span>
                ) : 집행등록됨 ? (
                  <button className="outline small" onClick={() => set집행수정중(true)}>수정하기</button>
                ) : (
                  <button className="primary small" onClick={() => 집행확인열기("등록")}>실제 지출 등록</button>
                )}
              </footer>
            </section>
            <section className="expense-v5-evidence-section">
              <header>
                <div>
                  <h3><i>3</i><span>결제 후 필요 증빙</span></h3>
                  <small>실제 지출 후 등록해야 하는 자료</small>
                </div>
                <b>
                  {plan.evidence.filter((item) => item.done).length}/
                  {plan.evidence.length}
                </b>
              </header>
              <div className="expense-v5-checks evidence">
                {plan.evidence.map((item) => (
                  <div
                    key={item.id}
                    className={`expense-v5-evidence-item ${item.done ? "done" : ""}`}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(item.done)}
                        onChange={() => toggle("evidence", item.id)}
                      />
                      <span>
                        <b>{item.label}</b>
                        <small>{item.description}</small>
                      </span>
                    </label>
                    <label className="outline small expense-v5-upload">
                      <input
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 3 * 1024 * 1024) {
                            notify("첨부파일은 개별 3MB 이하만 등록할 수 있습니다.");
                            event.target.value = "";
                            return;
                          }
                          setEvidenceFiles((files) => ({ ...files, [item.id]: file }));
                          event.target.value = "";
                        }}
                      />
                      <Icon name="upload" size={14} />
                      파일 업로드
                    </label>
                    {evidenceFiles[item.id] && (
                      <div className="expense-v5-uploaded-file">
                        <Icon name="fileText" size={14} />
                        <span>
                          <b>{evidenceFiles[item.id].name}</b>
                          <small>{formatSize(evidenceFiles[item.id].size)}</small>
                        </span>
                        <button
                          aria-label={`${evidenceFiles[item.id].name} 다운로드`}
                          onClick={() =>
                            downloadFile(
                              evidenceFiles[item.id].name,
                              evidenceFiles[item.id],
                            )
                          }
                        >
                          ↓
                        </button>
                        <button
                          aria-label={`${evidenceFiles[item.id].name} 삭제`}
                          onClick={() =>
                            setEvidenceFiles((files) => {
                              const next = { ...files };
                              delete next[item.id];
                              return next;
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <footer className="expense-v5-evidence-actions">
                <span>
                  지출 후 필요한 자료를 일정과 파일로 함께 관리하세요.
                </span>
                <div>
                  <button
                    className="outline small"
                    onClick={() => setScheduleGroup("evidence")}
                  >
                    <Icon name="calendar" size={14} />
                    일정에 추가
                  </button>
                </div>
              </footer>
            </section>
          </div>
        </section>
      </main>
      {/* 🔴 누적 집행액에 들어가는 값이라 «되돌리기가 쉽지 않습니다». 한 번 묻습니다. */}
      {집행확인 && (
        <div className="modal-backdrop">
          <section className="modal narrow execution-confirm-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>지출을 {집행확인}하시겠습니까?</h2>
                <p>
                  {집행확인 === "등록"
                    ? "등록하면 누적 집행액에 반영되고, 이후에는 수정하기를 눌러야 값을 바꿀 수 있습니다."
                    : "바꾼 금액으로 누적 집행액이 다시 계산됩니다."}
                </p>
              </div>
              <button onClick={() => set집행확인(null)}>×</button>
            </header>
            <dl className="execution-confirm-list">
              <div>
                <dt>실제 지출일</dt>
                <dd>{actualDate || "—"}</dd>
              </div>
              <div>
                <dt>실제 지출액</dt>
                <dd>{won(savedActualAmount)}</dd>
              </div>
            </dl>
            <footer>
              <button className="outline" onClick={() => set집행확인(null)}>취소</button>
              <button className="primary" onClick={집행저장}>{집행확인}하기</button>
            </footer>
          </section>
        </div>
      )}
      {scheduleGroup && (
        <ScheduleCheckModal
          items={plan[scheduleGroup]}
          defaultDate={plan.plannedDate}
          title={
            scheduleGroup === "evidence" ? "증빙 일정을 추가" : "일정에 추가"
          }
          close={() => setScheduleGroup(null)}
          save={saveScheduleChecks}
        />
      )}
      {editing && (
        <EditPlan
          plan={draft}
          setPlan={setDraft}
          onFilesSaved={setPlanFiles}
          close={() => setEditing(false)}
          save={() => {
            update({
              ...draft,
              status: "재점검 필요",
              previousStatus:
                plan.status === "재점검 필요"
                  ? plan.previousStatus || "확인 필요"
                  : plan.status === "점검 전"
                    ? "확인 필요"
                    : plan.status,
              nextAction: "AI 재점검 필요",
            });
            setEditing(false);
            setRecheckPrompt(true);
          }}
        />
      )}
      {recheckPrompt && (
        <div className="ai-checking-backdrop" role="presentation">
          <section className="recheck-required-modal" role="dialog" aria-modal="true" aria-labelledby="recheck-required-title">
            <h2 id="recheck-required-title">지출 계획이 수정되었습니다</h2>
            <p>점검에 사용된 내용이 변경되어 AI 재점검이 필요합니다.</p>
            <footer>
              <button className="outline" onClick={() => setRecheckPrompt(false)}>나중에 하기</button>
              <button className="primary" onClick={() => { setRecheckPrompt(false); setRecheckQuestions(true); }}>지금 재점검</button>
            </footer>
          </section>
        </div>
      )}
      {recheckQuestions && (
        <PlanRecheckQuestionsModal
          plan={plan}
          close={() => setRecheckQuestions(false)}
          start={() => {
            setRecheckQuestions(false);
            setRechecking(true);
          }}
        />
      )}
      {rechecking && (
        <AiCheckingOverlay
          count={1}
          planId={API켜짐() ? plan.id : undefined}
          // 🔴 상세가 404·500 이어도 화면이 든 값으로 판정합니다 (목록과 같은 규칙).
          대체입력={{
            사업명: 현재사업(),
            확정비목: plan.category.split(" · ")[0],
            제목: plan.name,
            용도: plan.purpose,
            금액: plan.amount,
          }}
          onFail={(메시지) => {
            setRechecking(false);
            notify(메시지);
          }}
          onComplete={(판정된계획) => {
            if (판정된계획) {
              // 🔴 서버가 판정·할일·근거를 다 채워서 돌려준 계획입니다
              update(판정된계획);
            } else {
              const status: PlanStatus =
                plan.category.startsWith("광고선전비")
                  ? "특이사항 없음"
                  : "확인 필요";
              update({
                ...plan,
                status,
                previousStatus: undefined,
                nextAction: status === "특이사항 없음" ? "집행 준비" : "추가정보 확인",
                updatedAt: "2026.08.31 방금 전",
              });
            }
            setRechecking(false);
            notify("변경된 내용으로 AI 재점검을 완료했습니다.");
          }}
        />
      )}
    </div>
  );
}

function ScheduleCheckModal({
  items,
  defaultDate,
  title = "일정에 추가",
  close,
  save,
}: {
  items: ExpensePlan["aiChecks"];
  defaultDate: string;
  title?: string;
  close: () => void;
  save: (items: { id: string; label: string; date: string }[]) => void;
}) {
  const initial = items
    .filter((item) => !item.done)
    .slice(0, 2)
    .map((item) => item.id);
  const [selected, setSelected] = useState(
    initial.length ? initial : items.slice(0, 2).map((item) => item.id),
  );
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, defaultDate])),
  );
  const toggle = (id: string) =>
    setSelected((value) =>
      value.includes(id)
        ? value.filter((itemId) => itemId !== id)
        : [...value, id],
    );
  const selectedItems = items
    .filter((item) => selected.includes(item.id))
    .map((item) => ({ id: item.id, label: item.label, date: dates[item.id] }));
  return (
    <div
      className="schedule-check-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="schedule-check-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-check-title"
      >
        <header>
          <div>
            <h2 id="schedule-check-title">{title}</h2>
            <p>
              집행 일정에 등록할 항목을 선택하고 날짜를 지정하세요.
              <br />
              추가된 일정은 캘린더와 다가오는 일정에 바로 반영됩니다.
            </p>
          </div>
          <button onClick={close} aria-label="닫기">
            ×
          </button>
        </header>
        <div className="schedule-check-toolbar">
          <span>
            선택 가능 항목 <b>{items.length}건</b>
          </span>
          <label>
            <Icon name="filter" size={15} />
            <select aria-label="항목 정렬">
              <option>기본 순</option>
            </select>
          </label>
        </div>
        <div className="schedule-check-list">
          {items.map((item) => (
            <div
              className={selected.includes(item.id) ? "selected" : ""}
              key={item.id}
            >
              <label className="schedule-check-copy">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>
                  <b>{item.label}</b>
                  <small>{item.description}</small>
                </span>
              </label>
              <label className="schedule-check-date">
                <span className="sr-only">{item.label} 날짜</span>
                <input
                  type="date"
                  value={dates[item.id]}
                  onChange={(event) =>
                    setDates((value) => ({
                      ...value,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <p className="schedule-check-note">
          <span>ⓘ</span> 날짜는 추후 집행 일정에서 수정할 수 있습니다.
        </p>
        <footer>
          <span>
            <b>{selected.length}개</b> 항목 선택됨
          </span>
          <div>
            <button className="outline" onClick={close}>
              취소
            </button>
            <button
              className="primary"
              disabled={
                !selectedItems.length ||
                selectedItems.some((item) => !item.date)
              }
              onClick={() => save(selectedItems)}
            >
              일정에 추가
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function LegacyPlanDetail({
  plan,
  update,
  addSchedule,
  back,
  notify,
}: {
  plan?: ExpensePlan;
  update: (plan: ExpensePlan) => void;
  addSchedule: (item: ScheduleItem) => void;
  back: () => void;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan);
  if (!plan || !draft)
    return (
      <div className="page">
        <div className="empty-state">
          <h1>지출 계획을 찾을 수 없습니다.</h1>
          <button className="primary" onClick={back}>
            목록으로
          </button>
        </div>
      </div>
    );
  const toggle = (group: "aiChecks" | "evidence", id: string) => {
    const next = {
      ...plan,
      [group]: plan[group].map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    };
    update(next);
  };
  const scheduleCheck = () => {
    const target =
      plan.aiChecks.find((item) => !item.done)?.label || plan.nextAction;
    addSchedule({
      id: `schedule-${Date.now()}`,
      planId: plan.id,
      title: target,
      date: plan.plannedDate,
      type: "기타",
      state: "준비 필요",
    });
    notify("확인사항을 집행 일정에 등록했습니다.");
  };
  return (
    <div className="page expense-detail-page">
      <header className="detail-compact-header">
        <div className="detail-header-bar">
          <button className="detail-back-link" onClick={back}>
            <Icon name="back" size={16} />
            지출 계획
          </button>
          <div className="detail-actions">
            <button
              className="outline"
              onClick={() => {
                setDraft(plan);
                setEditing(true);
              }}
            >
              수정
            </button>
            <button
              className="more-square"
              aria-label="더보기"
              onClick={() =>
                notify("삭제 기능은 프로토타입에서 실행하지 않습니다.")
              }
            >
              <Icon name="more" />
            </button>
          </div>
        </div>
        <div className="detail-summary">
          <h1>{plan.name}</h1>
          <div className="detail-status-line recent-only">
            <span>최근 수정 {plan.updatedAt}</span>
          </div>
        </div>
      </header>
      <main className="detail-flow">
        <section className="detail-flat-section expense-info-section">
          <header className="detail-flat-head">
            <div className="section-title-with-icon">
              <Icon name="fileText" size={18} />
              <div>
                <h2>지출 정보</h2>
                <p>AI 점검에 사용한 작성 내용입니다.</p>
              </div>
            </div>
          </header>
          <dl className="compact-expense-info">
            <Info label="예상 비목" value={plan.category} />
            <Info label="예상 금액" value={won(plan.amount)} />
            <Info
              label="예상 지출일"
              value={plan.plannedDate.replaceAll("-", ".")}
            />
            <Info label="거래처" value={plan.vendor} />
            <Info label="사용 목적" value={plan.purpose} className="purpose" />
          </dl>
        </section>
        <section className="card ai-result detail-section emphasis-section">
          <header className="card-head detail-section-head">
            <div className="section-title-with-icon">
              <Icon name="alert" size={18} />
              <div className="card-title-copy">
                <h2>AI 점검 결과</h2>
                <p>입력 내용과 적용 기준을 함께 분석했습니다.</p>
              </div>
            </div>
            <Status value={plan.status} />
          </header>
          <div className="result-body result-vertical">
            <div className="result-summary">
              <div>
                <b>
                  {plan.category} 기준으로{" "}
                  {plan.status === "특이사항 없음"
                    ? "주요 준비가 확인됐습니다."
                    : "추가 확인이 필요합니다."}
                </b>
                <p>{plan.aiSummary}</p>
                <strong className="result-action-count">
                  결제 전 확인사항{" "}
                  {plan.aiChecks.filter((item) => !item.done).length}건
                </strong>
              </div>
            </div>
            <div className="ai-comment compact-comment">
              <Icon name="spark" size={17} />
              <div>
                <b>AI 코멘트</b>
                <p>
                  {plan.status === "특이사항 없음"
                    ? "현재 입력된 조건에서는 주요 사전 준비가 확인됐습니다. 집행 후 거래·결과 증빙을 빠짐없이 보관하세요."
                    : "기관별 승인 기준과 최신 안내를 추가로 확인한 뒤 결제를 진행하세요."}
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="card checklist-card detail-section task-section before-task-section">
          <header className="card-head detail-section-head">
            <div className="section-title-with-icon">
              <Icon name="clipboardCheck" size={18} />
              <div className="card-title-copy">
                <h2>결제 전 확인</h2>
                <p>결제 전에 완료해야 하는 항목입니다.</p>
              </div>
            </div>
            <strong>
              {plan.aiChecks.filter((item) => item.done).length}/
              {plan.aiChecks.length}
            </strong>
          </header>
          <Checklist
            items={plan.aiChecks}
            toggle={(id) => toggle("aiChecks", id)}
          />
          <div className="quick-schedule">
            <span>
              <b>확인사항을 일정으로 관리</b>
              <small>필요한 준비를 예상 지출일에 연결합니다.</small>
            </span>
            <button className="outline small" onClick={scheduleCheck}>
              <Icon name="calendar" />
              일정에 추가
            </button>
          </div>
        </section>
        <details className="detail-disclosure rules-section">
          <summary>
            <div className="section-title-with-icon">
              <Icon name="rules" size={18} />
              <div>
                <h2>적용 근거</h2>
                <p>이번 판단에 사용된 규정과 조항입니다.</p>
              </div>
            </div>
            <span className="disclosure-action">
              {plan.rules.length}건 <Icon name="arrow" size={14} />
            </span>
          </summary>
          <div className="rule-list">
            {plan.rules.map((rule, index) => (
              <article key={index}>
                <span>{index + 1}</span>
                <div>
                  <b>{rule.title}</b>
                  <small>{rule.source}</small>
                  <p>{rule.description}</p>
                </div>
              </article>
            ))}
            <button
              className="text-button rule-source-link"
              onClick={() => notify("규정 원문 링크를 열었습니다.")}
            >
              규정 원문 보기
            </button>
          </div>
        </details>
        <section className="card checklist-card detail-section task-section evidence-task-section">
          <header className="card-head detail-section-head">
            <div className="section-title-with-icon">
              <Icon name="paperclip" size={18} />
              <div className="card-title-copy">
                <h2>결제 후 필요 증빙</h2>
                <p>지출 후 등록해야 하는 자료입니다.</p>
              </div>
            </div>
            <strong>
              {plan.evidence.filter((item) => item.done).length}/
              {plan.evidence.length}
            </strong>
          </header>
          <EvidenceList
            items={plan.evidence}
            toggle={(id) => toggle("evidence", id)}
          />
          <div className="after-payment-note">
            <b>결제 후 진행</b>
            <span>실제 지출이 완료되면 자료를 하나씩 확인해 등록해주세요.</span>
          </div>
        </section>
      </main>
      {editing && (
        <EditPlan
          plan={draft}
          setPlan={setDraft}
          close={() => setEditing(false)}
          save={() => {
            update(draft);
            setEditing(false);
            notify("지출 계획을 수정했습니다.");
          }}
        />
      )}
    </div>
  );
}

void LegacyPlanDetail;

function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function Checklist({
  items,
  toggle,
}: {
  items: ExpensePlan["aiChecks"];
  toggle: (id: string) => void;
}) {
  return (
    <div className="checklist action-checklist">
      {items.map((item) => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={Boolean(item.done)}
            onChange={() => toggle(item.id)}
          />
          <span>
            <b>{item.label}</b>
            <small>{item.description}</small>
          </span>
        </label>
      ))}
    </div>
  );
}
function EvidenceList({
  items,
  toggle,
}: {
  items: ExpensePlan["evidence"];
  toggle: (id: string) => void;
}) {
  return (
    <div className="evidence-list evidence-checklist">
      {items.map((item) => (
        <label key={item.id} className={item.done ? "done" : ""}>
          <input
            type="checkbox"
            checked={Boolean(item.done)}
            onChange={() => toggle(item.id)}
          />
          <span>
            <b>{item.label}</b>
            <small>{item.description}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

function EditPlan({
  plan,
  setPlan,
  close,
  save,
  onFilesSaved,
}: {
  plan: ExpensePlan;
  setPlan: (plan: ExpensePlan) => void;
  close: () => void;
  save: () => void;
  /** 저장이 끝난 뒤 «부모 화면» 의 첨부 목록도 같은 값으로 맞춥니다. */
  onFilesSaved?: (files: 첨부[]) => void;
}) {
  /**
   * 🔴 「첨부 파일 [+ 파일 교체·추가]」는 «누르는 데가 없는 장식» 이었습니다.
   *    input 도 onClick 도 없었고, 상세 화면의 첨부 목록과도 이어져 있지 않아서
   *    수정 창에서는 붙인 파일이 보이지도 않고 새로 붙일 수도 없었습니다.
   *    → 상세와 «같은 보관함»(lib/attachments)을 봅니다. 여기서 지운 파일은
   *      상세에서도 사라지고, 여기서 붙인 파일은 상세에 그대로 나타납니다.
   *
   * 🔴 초안입니다. 「취소」로 닫으면 보관함을 건드리지 않습니다 — 다른 입력칸과
   *    같은 규칙이어야 합니다. 실제 반영은 「수정 저장」에서 한 번에 합니다.
   */
  const [편집첨부, set편집첨부] = useState<첨부[]>(() => 첨부읽기(plan.id));
  const [첨부오류, set첨부오류] = useState("");
  useEffect(() => {
    set편집첨부(첨부읽기(plan.id));
    set첨부오류("");
  }, [plan.id]);

  const 첨부저장 = () => {
    첨부쓰기(plan.id, 편집첨부);
    onFilesSaved?.(편집첨부);
  };

  return (
    <div className="modal-backdrop">
      <section className="modal wide">
        <header>
          <div>
            <h2>지출 계획 수정</h2>
            <p>입력 내용과 첨부 정보를 모두 수정할 수 있습니다.</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <div className="field-grid">
          <label className="full">
            지출 항목
            <input
              value={plan.name}
              onChange={(e) => setPlan({ ...plan, name: e.target.value })}
            />
          </label>
          <label className="full">
            사용 목적
            <textarea
              value={plan.purpose}
              onChange={(e) => setPlan({ ...plan, purpose: e.target.value })}
            />
          </label>
          <label>
            예상 금액
            <input
              value={plan.amount}
              onChange={(e) =>
                setPlan({ ...plan, amount: Number(e.target.value) })
              }
            />
          </label>
          <label>
            예상 지출일
            <input
              type="date"
              value={plan.plannedDate}
              onChange={(e) =>
                setPlan({ ...plan, plannedDate: e.target.value })
              }
            />
          </label>
          <label>
            거래처
            <input
              value={plan.vendor}
              onChange={(e) => setPlan({ ...plan, vendor: e.target.value })}
            />
          </label>
          <label>
            비목
            <select
              value={plan.category}
              onChange={(e) => setPlan({ ...plan, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="full edit-file-box">
            <b>첨부 파일</b>
            {편집첨부.length === 0 ? (
              <p className="edit-file-empty">
                첨부한 파일이 없습니다. 견적서·과업자료가 있으면 올려 두세요.
              </p>
            ) : (
              <ul>
                {편집첨부.map((file) => (
                  <li key={file.id}>
                    <Icon name="fileText" size={15} />
                    <b>{file.name}</b>
                    <small>{file.size}</small>
                    <button
                      type="button"
                      aria-label={`${file.name} 삭제`}
                      onClick={() =>
                        set편집첨부((items) =>
                          items.filter((item) => item.id !== file.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <footer>
              <label className="outline small edit-file-add">
                <input
                  type="file"
                  multiple
                  onChange={(event) => {
                    const 고른것 = Array.from(event.target.files || []);
                    // 🔴 상세 화면과 «같은» 한도여야 합니다. 여기서만 큰 파일이
                    //    들어오면 상세에서 다룰 수 없는 첨부가 생깁니다.
                    const 넘김 = 고른것.filter((f) => f.size > 3 * 1024 * 1024);
                    set첨부오류(
                      넘김.length
                        ? "첨부파일은 개별 3MB 이하만 올릴 수 있습니다."
                        : "",
                    );
                    const 쓸것 = 고른것.filter((f) => f.size <= 3 * 1024 * 1024);
                    // 🔴 순번을 «기존 개수부터» 셉니다. 0 부터 다시 세면 같은 파일을
                    //    두 번에 나눠 붙였을 때 id 가 겹쳐 지우기가 엉킵니다.
                    set편집첨부((items) =>
                      [
                        ...items,
                        ...쓸것.map((f, i) => 파일을첨부로(f, items.length + i)),
                      ].slice(0, 10),
                    );
                    event.target.value = "";
                  }}
                />
                파일 추가
              </label>
              <small>최대 10개 / 개별 3MB 이하</small>
            </footer>
            {첨부오류 && <p className="edit-file-error">{첨부오류}</p>}
          </div>
        </div>
        <footer>
          <button className="outline" onClick={close}>
            취소
          </button>
          <button
            className="primary"
            onClick={() => {
              첨부저장();
              save();
            }}
          >
            수정 저장
          </button>
        </footer>
      </section>
    </div>
  );
}

function AiChat({ plans }: { plans: ExpensePlan[] }) {
  const 사업 = use사업();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "현재 사업 기준과 작성한 지출 계획을 함께 확인해 답변해드릴게요. 무엇이 궁금하신가요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const ask = (text = input) => {
    if (!text.trim() || isLoading) return;
    setMessages((value) => [...value, { role: "user", text }]);
    setInput("");
    setIsLoading(true);
    window.setTimeout(() => {
      setMessages((value) => [
        ...value,
        {
          role: "ai",
          text: `2026 초기창업패키지 공통 기준과 작성된 ${plans.length}건의 지출 계획을 함께 확인했습니다. 결제 전에는 사업 직접 관련성, 기관별 사전절차, 견적 기준, 필요 증빙을 순서대로 확인하는 것이 좋습니다. 특정 지출명을 말씀해주시면 해당 계획을 우선해서 설명해드릴게요.`,
        },
      ]);
      setIsLoading(false);
    }, 1300);
  };
  return (
    <div className="page chat-page">
      <header className="page-heading">
        <div>
          <h1>AI CHAT</h1>
          <p>
            사업비·비목·규정·증빙을 현재 사업과 작성한 계획을 바탕으로
            질문하세요.
          </p>
        </div>
      </header>
      <section className="chat-workspace">
        <div className="chat-context">
          <span>현재 참조 범위</span>
          <b>{사업}</b>
          <p>작성한 지출 계획 {plans.length}건 · 최신 규정 안내</p>
        </div>
        <div className="conversation">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.role === "ai" && <span>AI</span>}
              <p>{message.text}</p>
            </div>
          ))}
          {isLoading && (
            <div className="message ai ai-generating" aria-live="polite">
              <span>AI</span>
              <div className="ai-typing-status">
                <i /><i /><i />
                <small>답변을 작성하고 있어요</small>
              </div>
            </div>
          )}
        </div>
        <div className="quick-prompts">
          {[
            "노트북 구매 전에 뭘 준비해야 해?",
            "회의비 단가를 확인해줘",
            "외주 계약 증빙이 궁금해",
          ].map((text) => (
            <button key={text} onClick={() => ask(text)} disabled={isLoading}>
              {text}
            </button>
          ))}
        </div>
        <div className="chat-composer">
          <div className="chat-input-shell">
            <textarea
              rows={1}
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="궁금한 내용을 입력하세요."
            />
            <SendButton onClick={() => ask()} disabled={!input.trim() || isLoading} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SchedulePage({
  plans,
  schedules,
  save,
  할일동기화,
  notify,
}: {
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  save: (items: ScheduleItem[]) => void;
  /** 🔴 서버 할일에서 온 일정이면 이걸로 바꿉니다 — 상세 체크박스까지 같이 움직입니다. */
  할일동기화: (planId: string, taskId: string, 완료: boolean) => void;
  notify: (message: string) => void;
}) {
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  /**
   * 🔴 달력이 2026년 8·9·10월에 «박혀» 있었고, 오늘 표시는 `month===8 && day===29` 로
   *    고정이었습니다. 그래서 9월에 들어오면 오늘 동그라미가 아예 안 떴습니다.
   *    이제 실제 오늘을 기준으로 「지난달·이번달·다음달」을 봅니다.
   *
   * 🔴 서버에서 미리 그린 HTML 과 어긋나지 않게(hydration) 첫 그림은 고정값으로
   *    두고, 붙은 뒤에 오늘로 옮깁니다.
   */
  const [오늘, set오늘] = useState<{ y: number; m: number; d: number } | null>(null);
  useEffect(() => {
    const n = new Date();
    set오늘({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() });
  }, []);
  const 기준연 = 오늘?.y ?? 2026;
  const 기준월 = 오늘?.m ?? 9;
  const [월오프셋, set월오프셋] = useState(0);           // -1 지난달 · 0 이번달 · +1 다음달
  const month = 기준월 + 월오프셋;
  const 연 = month < 1 ? 기준연 - 1 : month > 12 ? 기준연 + 1 : 기준연;
  const 표시월 = ((month - 1 + 12) % 12) + 1;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [viewing, setViewing] = useState<ScheduleItem | null>(null);
  const [upcomingView, setUpcomingView] = useState<"all" | "plans">("all");
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  const 오늘문자 = 오늘
    ? `${오늘.y}-${String(오늘.m).padStart(2, "0")}-${String(오늘.d).padStart(2, "0")}`
    : "2026-08-29";
  const upcoming = [...schedules].sort((a, b) => a.date.localeCompare(b.date));
  const visibleUpcoming = upcoming.filter((item) => item.state !== "완료");
  const activeUpcoming = visibleUpcoming
    .filter((item) => item.date >= 오늘문자)
    .slice(0, 3);
  const dday = (date: string) =>
    Math.ceil(
      (new Date(`${date}T00:00:00`).getTime() -
        new Date(`${오늘문자}T00:00:00`).getTime()) /
        86400000,
    );
  const calendarStart = new Date(연, 표시월 - 1, 1).getDay();
  const calendarDays = new Date(연, 표시월, 0).getDate();
  const stats = {
    all: upcoming.length,
    need: upcoming.filter((s) => s.state === "준비 필요").length,
    planned: upcoming.filter((s) => s.state === "집행 예정").length,
    done: upcoming.filter((s) => s.state === "완료").length,
  };
  const upcomingGroups = [
    ...plans
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        category: plan.category,
        items: upcoming.filter((item) => item.planId === plan.id),
      }))
      .filter((group) => group.items.length > 0),
    ...(() => {
      const unlinked = upcoming.filter(
        (item) => !plans.some((plan) => plan.id === item.planId),
      );
      return unlinked.length
        ? [
            {
              id: "unlinked",
              name: "기타 일정",
              category: "기타",
              items: unlinked,
            },
          ]
        : [];
    })(),
  ];
  const toggleUpcomingGroup = (id: string) =>
    setExpandedPlans((current) =>
      current.includes(id)
        ? current.filter((groupId) => groupId !== id)
        : [...current, id],
    );
  const toggleDone = (id: string) => {
    const 대상 = schedules.find((item) => item.id === id);
    if (!대상) return;
    const 완료 = 대상.state !== "완료";

    // 🔴 서버 할일에서 온 일정이면 «상세 체크박스와 같이» 움직입니다.
    //    (그쪽에서 서버 저장까지 한 번에 합니다)
    const taskId = 대상.taskId;
    if (taskId && 대상.planId) {
      할일동기화(대상.planId, taskId, 완료);
      return;
    }

    // 사용자가 손으로 만든 일정 — 이어질 할일이 없어 화면 안에서만 움직입니다.
    save(
      schedules.map((item) =>
        item.id === id
          ? {
              ...item,
              state: (완료
                ? "완료"
                : item.type === "집행"
                  ? "집행 예정"
                  : "준비 필요") as ScheduleItem["state"],
            }
          : item,
      ),
    );
  };
  return (
    <div className="page schedule-v2">
      <header className="schedule-v2-heading">
        <div>
          <h1>집행 일정</h1>
          <p>사전 준비 일정과 예상 집행일을 한눈에 확인하세요.</p>
        </div>
        <div>
          <button className="primary" onClick={() => setModal(true)}>
            <Icon name="plus" />
            일정 추가
          </button>
        </div>
      </header>
      <section className="schedule-v2-metrics">
        <article>
          <span className="schedule-metric-icon all">
            <Icon name="calendar" />
          </span>
          <span>
            <small>이번 달 예정</small>
            <b>
              {stats.all}
              <em>건</em>
            </b>
          </span>
        </article>
        <article>
          <span className="schedule-metric-icon need">
            <Icon name="clipboardCheck" />
          </span>
          <span>
            <small>준비 일정</small>
            <b>
              {stats.need}
              <em>건</em>
            </b>
          </span>
        </article>
        <article>
          <span className="schedule-metric-icon planned">
            <Icon name="clock" />
          </span>
          <span>
            <small>집행 예정</small>
            <b>
              {stats.planned}
              <em>건</em>
            </b>
          </span>
        </article>
        <article>
          <span className="schedule-metric-icon done">
            <Icon name="check" />
          </span>
          <span>
            <small>완료</small>
            <b>
              {stats.done}
              <em>건</em>
            </b>
          </span>
        </article>
      </section>
      <div className="schedule-v2-layout">
        <section className="schedule-v2-calendar">
          <header>
            <div className="schedule-month-nav">
              <button
                disabled={월오프셋 <= -1}
                onClick={() => set월오프셋((v) => v - 1)}
                aria-label="이전 달"
              >
                ‹
              </button>
              <h2>{연}년 {표시월}월</h2>
              <button
                disabled={월오프셋 >= 1}
                onClick={() => set월오프셋((v) => v + 1)}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>
            <div>
              <button className="outline small" onClick={() => set월오프셋(0)}>
                오늘
              </button>
              <span className="schedule-v2-view">
                <button
                  className={view === "calendar" ? "active" : ""}
                  onClick={() => setView("calendar")}
                >
                  <Icon name="calendar" size={14} />
                  캘린더
                </button>
                <button
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                >
                  <Icon name="plans" size={14} />
                  리스트
                </button>
              </span>
            </div>
          </header>
          {view === "calendar" ? (
            <>
              <div className="schedule-v2-week">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="schedule-v2-grid">
                {Array.from({ length: 42 }, (_, i) => {
                  const day = i - calendarStart + 1;
                  const valid = day >= 1 && day <= calendarDays;
                  const 날짜문자 = valid
                    ? `${연}-${String(표시월).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : "";
                  const items = valid
                    ? upcoming.filter((s) => s.date === 날짜문자)
                    : [];
                  return (
                    <div
                      key={i}
                      className={`${날짜문자 && 날짜문자 === 오늘문자 ? "today" : ""} ${!valid ? "outside" : ""}`}
                    >
                      <span>{valid ? day : ""}</span>
                      {items.slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          className={
                            item.state === "준비 필요"
                              ? "need"
                              : item.state === "완료"
                                ? "done"
                                : "planned"
                          }
                          onClick={() => setViewing(item)}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <footer className="schedule-v2-legend">
                <span>
                  <i className="planned" />
                  집행 예정
                </span>
                <span>
                  <i className="need" />
                  준비 일정
                </span>
                <span>
                  <i className="done" />
                  완료
                </span>
              </footer>
            </>
          ) : (
            <div className="schedule-v2-list-view">
              {upcoming.map((item) => (
                <button key={item.id} onClick={() => setViewing(item)}>
                  <time>{item.date}</time>
                  <span>
                    <b>{item.title}</b>
                    <small>
                      {plans.find((p) => p.id === item.planId)?.name}
                    </small>
                  </span>
                  <em
                    className={
                      item.state === "준비 필요"
                        ? "need"
                        : item.state === "완료"
                          ? "done"
                          : "planned"
                    }
                  >
                    {scheduleStateLabel(item.state)}
                  </em>
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="schedule-v2-upcoming">
          <header>
            <h2>다가오는 일정</h2>
            <div className="upcoming-view-switch" aria-label="다가오는 일정 보기 방식">
              <button
                type="button"
                className={upcomingView === "all" ? "active" : ""}
                aria-pressed={upcomingView === "all"}
                onClick={() => setUpcomingView("all")}
              >
                전체
              </button>
              <button
                type="button"
                className={upcomingView === "plans" ? "active" : ""}
                aria-pressed={upcomingView === "plans"}
                onClick={() => {
                  setUpcomingView("plans");
                  if (!expandedPlans.length && upcomingGroups[0]) {
                    setExpandedPlans([upcomingGroups[0].id]);
                  }
                }}
              >
                지출계획별
              </button>
            </div>
          </header>
          {upcomingView === "all" ? visibleUpcoming.map((item) => {
            const past = item.date < "2026-08-29";
            const activeIndex = activeUpcoming.findIndex(
              (active) => active.id === item.id,
            );
            return (
              <div
                className={`upcoming-delete-row ${activeIndex === 0 ? "nearest" : ""}`}
                key={item.id}
              >
                <div className="upcoming-main">
                  <input
                    type="checkbox"
                    checked={false}
                    aria-label={`${item.title} 완료 처리`}
                    onChange={() => toggleDone(item.id)}
                  />
                  <button
                    type="button"
                    className="upcoming-view"
                    onClick={() => setViewing(item)}
                    aria-label={`${item.title} 일정 내용 보기`}
                  >
                    <time>
                      <b>
                        {월일표기(item.date)}
                      </b>
                      {past ? (
                        <small className="past-date">지남</small>
                      ) : activeIndex >= 0 ? (
                        <small className="dday">D-{dday(item.date)}</small>
                      ) : null}
                    </time>
                    <span>
                      <b>{item.title}</b>
                      <small>
                        {plans.find((p) => p.id === item.planId)?.name || "기타"}
                      </small>
                    </span>
                    <em
                      className={item.state === "준비 필요" ? "need" : "planned"}
                    >
                      {scheduleStateLabel(item.state)}
                    </em>
                  </button>
                </div>
                <div className="row-menu">
                  <button
                    aria-label={`${item.title} 메뉴`}
                    onClick={() =>
                      setOpenMenu((value) =>
                        value === item.id ? null : item.id,
                      )
                    }
                  >
                    <Icon name="moreVertical" size={16} />
                  </button>
                  {openMenu === item.id && (
                    <div>
                      <button
                        onClick={() => {
                          setEditing(item);
                          setOpenMenu(null);
                        }}
                      >
                        <Icon name="edit" size={14} />
                        수정
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (
                            window.confirm(`'${item.title}' 일정을 삭제할까요?`)
                          ) {
                            save(
                              schedules.filter(
                                (schedule) => schedule.id !== item.id,
                              ),
                            );
                            notify("일정을 삭제했습니다.");
                          }
                          setOpenMenu(null);
                        }}
                      >
                        <Icon name="trash" size={14} />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="upcoming-plan-groups">
              {upcomingGroups.map((group) => {
                const open = expandedPlans.includes(group.id);
                const nearest = group.items[0];
                return (
                  <section className="upcoming-plan-group" key={group.id}>
                    <button
                      type="button"
                      className="upcoming-plan-group-head"
                      aria-expanded={open}
                      onClick={() => toggleUpcomingGroup(group.id)}
                    >
                      <span className="upcoming-plan-name">
                        <b>{group.name}</b>
                        <small>{group.category}</small>
                      </span>
                      <span className="upcoming-plan-meta">
                        <small>일정 수</small>
                        <b>{group.items.length}건</b>
                      </span>
                      <span className="upcoming-plan-meta nearest-date">
                        <small>가장 가까운 일정</small>
                        <b>{nearest.date.replaceAll("-", ".")}</b>
                      </span>
                      <Icon name="chevronDown" size={16} />
                    </button>
                    {open && (
                      <div className="upcoming-plan-items">
                        {group.items.map((item) => {
                          const done = item.state === "완료";
                          return (
                            <div
                              className={`upcoming-plan-item ${done ? "is-done" : ""}`}
                              key={item.id}
                            >
                              <input
                                type="checkbox"
                                checked={done}
                                aria-label={`${item.title} ${done ? "미완료" : "완료"} 처리`}
                                onChange={() => toggleDone(item.id)}
                              />
                              <button
                                type="button"
                                onClick={() => setViewing(item)}
                                aria-label={`${item.title} 일정 내용 보기`}
                              >
                                <time>
                                  {월일표기(item.date)}
                                </time>
                                <span>
                                  <b>{item.title}</b>
                                  <small>{item.type}</small>
                                </span>
                                <em
                                  className={
                                    item.state === "준비 필요"
                                      ? "need"
                                      : done
                                        ? "done"
                                        : "planned"
                                  }
                                >
                                  {scheduleStateLabel(item.state)}
                                </em>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </aside>
      </div>
      {modal && (
        <ScheduleFormModal
          plans={plans}
          close={() => setModal(false)}
          save={(item) => {
            save([...schedules, item]);
            setModal(false);
            notify("일정을 저장했습니다.");
          }}
        />
      )}
      {editing && (
        <ScheduleFormModal
          item={editing}
          plans={plans}
          close={() => setEditing(null)}
          save={(item) => {
            save(
              schedules.map((schedule) =>
                schedule.id === item.id ? item : schedule,
              ),
            );
            setEditing(null);
            notify("일정을 수정했습니다.");
          }}
        />
      )}
      {viewing && (
        <ScheduleDetailModal
          item={viewing}
          plan={plans.find((plan) => plan.id === viewing.planId)}
          close={() => setViewing(null)}
          toggleComplete={() => {
            const updated: ScheduleItem = {
              ...viewing,
              state:
                viewing.state === "완료"
                  ? viewing.type === "집행"
                    ? "집행 예정"
                    : "준비 필요"
                  : "완료",
            };
            // 🔴 상세 모달에서 눌러도 같은 규칙 — 서버 할일이면 체크박스까지 같이.
            if (viewing.taskId && viewing.planId) {
              할일동기화(viewing.planId, viewing.taskId, updated.state === "완료");
            } else {
              save(
                schedules.map((schedule) =>
                  schedule.id === viewing.id ? updated : schedule,
                ),
              );
            }
            setViewing(updated);
            notify(updated.state === "완료" ? "일정을 완료 처리했습니다." : "일정을 미완료로 변경했습니다.");
          }}
          edit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleFormModal({
  item,
  plans,
  close,
  save,
}: {
  item?: ScheduleItem;
  plans: ExpensePlan[];
  close: () => void;
  save: (item: ScheduleItem) => void;
}) {
  const [draft, setDraft] = useState<ScheduleItem>(
    item || {
      id: `s-${Date.now()}`,
      planId: plans[0]?.id || "",
      title: "",
      date: "2026-09-09",
      type: "사전 확인",
      state: "준비 필요",
      memo: "",
    },
  );
  return (
    <div className="modal-backdrop schedule-modal-backdrop">
      <section className="schedule-create-modal">
        <header>
          <div>
            <h2>{item ? "일정 수정" : "일정 추가"}</h2>
            <p>일정 정보와 메모를 관리할 수 있습니다.</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <div className="schedule-create-body">
          <section>
            <h3>기본 정보</h3>
            <div className="schedule-create-grid">
              <label>
                일정 제목
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="예: 외주계약서 검토"
                />
              </label>
              <label>
                일정 유형
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value as ScheduleItem["type"],
                      state:
                        e.target.value === "집행"
                          ? "집행 예정"
                          : draft.state === "집행 예정"
                            ? "준비 필요"
                            : draft.state,
                    })
                  }
                >
                  <option>사전 확인</option>
                  <option>사전승인</option>
                  <option>비교견적</option>
                  <option>계약</option>
                  <option>집행</option>
                  <option>증빙</option>
                  <option>기타</option>
                </select>
              </label>
              <label className="full">
                관련 지출 계획
                <select
                  value={draft.planId}
                  onChange={(e) =>
                    setDraft({ ...draft, planId: e.target.value })
                  }
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                  <option value="other">기타</option>
                </select>
              </label>
            </div>
          </section>
          <section>
            <h3>일정 정보</h3>
            <div className="schedule-info-grid no-preview">
              <div>
                <label>
                  {draft.type === "집행" ? "집행일" : "일정일"}
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  상태
                  <select
                    value={draft.state}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        state: e.target.value as ScheduleItem["state"],
                        type: e.target.value === "집행 예정" ? "집행" : draft.type,
                      })
                    }
                  >
                    <option value="집행 예정">집행 예정</option>
                    <option value="준비 필요">준비 일정</option>
                    <option>완료</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
          <section>
            <label className="schedule-memo">
              메모
              <textarea
                maxLength={500}
                value={draft.memo || ""}
                onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                placeholder="추가로 기록할 내용을 입력하세요."
              />
              <small>{(draft.memo || "").length}/500</small>
            </label>
          </section>
        </div>
        <footer>
          <button className="outline" onClick={close}>
            취소
          </button>
          <button
            className="primary"
            disabled={!draft.title.trim() || !draft.planId}
            onClick={() => save({ ...draft, title: draft.title.trim() })}
          >
            {item ? "수정 저장" : "일정 추가"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ScheduleDetailModal({
  item,
  plan,
  close,
  toggleComplete,
  edit,
}: {
  item: ScheduleItem;
  plan?: ExpensePlan;
  close: () => void;
  toggleComplete: () => void;
  edit: () => void;
}) {
  const related = plan
    ? `${plan.name} · ${plan.category} · ${won(plan.amount)}`
    : item.planId === "other"
      ? "기타"
      : "연결된 지출 계획 없음";
  return (
    <div className="modal-backdrop">
      <section className="modal schedule-detail-modal">
        <header>
          <div>
            <span
              className={`schedule-detail-state ${item.state === "준비 필요" ? "need" : item.state === "완료" ? "done" : ""}`}
            >
              {scheduleStateLabel(item.state)}
            </span>
            <h2>{item.title}</h2>
            <p>{related}</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <dl>
          <div>
            <dt>{item.type === "집행" ? "집행일" : "일정일"}</dt>
            <dd>{item.date.replaceAll("-", ".")}</dd>
          </div>
          <div>
            <dt>일정 유형</dt>
            <dd>{item.type}</dd>
          </div>
          <div className="wide">
            <dt>관련 지출 계획</dt>
            <dd>{related}</dd>
          </div>
          <div className="wide">
            <dt>메모</dt>
            <dd>{item.memo || "등록된 메모가 없습니다."}</dd>
          </div>
        </dl>
        <label className="schedule-detail-completion">
          <input
            type="checkbox"
            checked={item.state === "완료"}
            onChange={toggleComplete}
          />
          <span>
            <b>일정 완료</b>
            <small>
              {item.state === "완료"
                ? "완료된 일정입니다. 체크를 해제하면 미완료 상태로 돌아갑니다."
                : "일정을 마쳤다면 체크해 완료 상태로 변경하세요."}
            </small>
          </span>
        </label>
        <footer>
          <button className="outline" onClick={close}>
            닫기
          </button>
          <button className="primary" onClick={edit}>
            일정 수정
          </button>
        </footer>
      </section>
    </div>
  );
}

function RecommendModal({
  plans,
  schedules,
  close,
  save,
}: {
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  close: () => void;
  save: (items: ScheduleItem[]) => void;
}) {
  const candidates = plans
    .filter((p) => p.status !== "특이사항 없음")
    .slice(0, 4)
    .map((p, i) => ({
      id: `r-${p.id}`,
      planId: p.id,
      title: p.nextAction,
      date: `2026-09-${String(10 + i * 3).padStart(2, "0")}`,
      type: "기타" as const,
      state: "준비 필요" as const,
    }));
  const [selected, setSelected] = useState(candidates.map((c) => c.id));
  return (
    <div className="modal-backdrop">
      <section className="modal wide schedule-recommend-modal">
        <header>
          <div>
            <h2>추천 일정 불러오기</h2>
            <p>AI 점검 결과에서 필요한 사전 준비 일정을 추천했습니다.</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <div className="recommend-list">
          {candidates.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() =>
                  setSelected((v) =>
                    v.includes(item.id)
                      ? v.filter((id) => id !== item.id)
                      : [...v, item.id],
                  )
                }
              />
              <span>
                <b>{item.title}</b>
                <small>
                  {plans.find((p) => p.id === item.planId)?.name} · {item.date}
                </small>
              </span>
              <em>추천</em>
            </label>
          ))}
        </div>
        <footer>
          <button className="outline" onClick={close}>
            취소
          </button>
          <button
            className="primary"
            onClick={() =>
              save(
                candidates.filter(
                  (c) =>
                    selected.includes(c.id) &&
                    !schedules.some(
                      (s) => s.planId === c.planId && s.title === c.title,
                    ),
                ),
              )
            }
          >
            선택 일정 불러오기
          </button>
        </footer>
      </section>
    </div>
  );
}

function MyPage({ notify }: { notify: (message: string) => void }) {
  const [editingProfile, setEditingProfile] = useState(false);
  // 🔴 이메일은 «로그인한 사람» 의 것이어야 합니다 — 예전엔 여기 한 줄이 박혀 있어서
  //    어느 계정으로 들어와도 team@startup.kr 이 보였습니다.
  const 로그인이메일 = use이메일();
  // 🔴 팀 이름도 같은 규칙입니다 — Supabase 계정에 붙은 값이 정본입니다.
  /**
   * 🔴 저장한 뒤 «다시 읽어야» 합니다. 훅은 마운트할 때 한 번만 읽는데,
   *    저장 직후 아래 effect 가 도는 시점에는 아직 옛 값을 들고 있어서
   *    방금 저장한 이름을 도로 덮었습니다. 저장이 끝나면 이 열쇠를 올립니다.
   */
  const [팀갱신, set팀갱신] = useState(0);
  const 계정팀이름 = use팀이름(팀갱신);
  const [profile, setProfile] = useState({
    team: "체쿠메이트",   // 🔴 표기 기본값. 이름을 «알아냈을 때만» 덮습니다
    program: 선택사업(),
    // 🔴 온보딩에서 고른 기관입니다. 예전엔 여기 한 줄이 박혀 있어서 다른 기관을
    //    골라도 마이페이지는 늘 경상국립대로 보였습니다.
    host: 기본기관명,
    duplicateBenefit: "X",
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  /** 주관기관 세부 안내 — 시연용 표시 값입니다(판정 엔진과는 연결되지 않습니다). */
  const [institutionFile, setInstitutionFile] = useState(적용중_기준파일);
  const [교체확인, set교체확인] = useState<File | null>(null);

  /**
   * 협약기간·사업비. 서버(`/api/profile` 의 f1) → 이 브라우저가 기억한 값 →
   * 시연 기본값 순서로 채웁니다. 홈·사이드바가 쓰는 `use협약()` 과 같은 규칙이라
   * 세 화면이 어긋나지 않습니다.
   */
  const [협약, set협약] = useState<협약정보>(시연협약);
  const [협약초안, set협약초안] = useState(협약);
  const [협약저장중, set협약저장중] = useState(false);

  useEffect(() => {
    if (!계정팀이름 || editingProfile) return;
    setProfile((v) => (v.team === 계정팀이름 ? v : { ...v, team: 계정팀이름 }));
    setProfileDraft((v) => (v.team === 계정팀이름 ? v : { ...v, team: 계정팀이름 }));
  }, [계정팀이름, editingProfile]);

  useEffect(() => {
    let 살아있음 = true;
    // 🔴 표기를 서버 문자열에 맞춥니다(「2026 초기창업패키지」→「초기창업패키지」).
    //    선택은 온보딩에서 끝났으므로 여기서는 보여주기만 합니다.
    사업선택지().then((목록) => {
      if (!살아있음 || !목록) return;
      const 맞춘값 = 목록에맞추기(목록, 선택사업());
      setProfile((v) => ({ ...v, program: 맞춘값 }));
      setProfileDraft((v) => ({ ...v, program: 맞춘값 }));
    });
    // 🔴 팀 이름은 아래 `use팀이름()` 이 Supabase 에서 받아 채웁니다 — 여기서
    //    sessionStorage 를 또 읽으면 로그아웃 뒤 빈 값이 서버 값을 덮습니다.
    // 온보딩에서 고른 기관을 반영합니다.
    const 기관 = 선택기관();
    setProfile((v) => ({ ...v, host: 기관 }));
    setProfileDraft((v) => ({ ...v, host: 기관 }));
    // 기억해 둔 협약이 있으면 먼저 채우고, 서버가 값을 주면 그것으로 덮습니다.
    const 기억 = 기억된협약();
    if (기억 && 값있음(기억)) {
      set협약(기억);
      set협약초안(기억);
    }
    협약읽기().then((값) => {
      if (!살아있음 || !값 || !값있음(값)) return; // 목 서버의 빈 값은 무시합니다
      set협약(값);
      set협약초안(값);
      협약기억(값);
    });
    return () => {
      살아있음 = false;
    };
  }, []);

  return (
    <div className="page my-page">
      <header className="page-heading">
        <div>
          <h1>마이페이지</h1>
          <p>내 정보와 현재 참여 중인 사업 정보를 확인하세요.</p>
        </div>
      </header>
      <section className="my-profile-card">
        <header>
          <div className="my-profile-summary">
            <span className="my-profile-avatar">{profile.team.slice(0, 1)}</span>
            <div>
              <h2>{profile.team}</h2>
              <p>{로그인이메일 || "로그인 정보 없음"}</p>
            </div>
          </div>
          <div className="my-profile-actions">
            <button
              className="outline small"
              onClick={() => {
                setProfileDraft(profile);
                set협약초안(협약);
                setEditingProfile(true);
              }}
            >
              <Icon name="edit" size={14} />
              내 정보 수정
            </button>
          </div>
        </header>
        <dl className="my-profile-grid">
          <Info label="팀 이름" value={profile.team} />
          <Info label="이메일" value={로그인이메일 || "로그인 정보 없음"} />
          <Info label="선정 사업" value={profile.program} />
          <Info label="주관기관" value={profile.host} />
          <Info label="사업 중복 수혜 여부" value={profile.duplicateBenefit} />
          <Info label="적용 기준" value="사업 공통 규정 + 기관 세부기준" />
        </dl>
      </section>
      <section className="my-business-heading">
        <div>
          <h2>사업 정보</h2>
          <p>현재 사업에 적용되는 지원 정보와 기준을 확인하세요.</p>
        </div>
      </section>
      <section className="rules-overview">
        <div>
          <span className="rule-mark">
            <Icon name="rules" />
          </span>
          <div>
            <b>현재 참여 사업</b>
            <h2>{profile.program}</h2>
            <p>{profile.host}</p>
          </div>
        </div>
        <dl className="business-period-grid">
          <div><dt>협약 시작일</dt><dd>{날짜표기(협약.시작일)}</dd></div>
          <div><dt>협약 종료일</dt><dd>{날짜표기(협약.종료일)}</dd></div>
          <div><dt>사업 지원비</dt><dd>{원(협약.정부지원 + 협약.자기부담)}</dd></div>
        </dl>
      </section>
      <section className="card rule-library">
        <header className="card-head">
          <div>
            <h2>공통 관리 기준</h2>
            <p>CHECKUMAIT이 지출 사전점검에 우선 적용하는 기준입니다.</p>
          </div>
        </header>
        {/* 🔴 사업마다 적용 규범이 «다릅니다». 예전에는 「창업중심대학사업 운영관리기준」이
            박혀 있어서, 다른 사업을 골라도 화면은 창업중심대학 기준을 보고 있는 것처럼
            읽혔습니다. 초격차·모두의창업은 상위 규범이 통합관리지침이 아니라
            운영요령까지 포함이라 줄 수도 달라집니다. (lib/norms.ts 참조) */}
        {적용규범(profile.program).map((규범) => (
          <article key={규범.제목}>
            <span className="auto-badge">자동 반영</span>
            <div>
              <b>{규범.제목}</b>
              <small>{규범.설명}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="card rule-library">
        <header className="card-head">
          <div>
            <h2>주관기관 세부 안내</h2>
            <p>
              금액 기준·승인 절차·제출 양식은 기관의 최신 안내를 함께
              적용합니다.
            </p>
          </div>
          {/* 🔴 고르자마자 바꾸지 않습니다 — 이 문서는 판정 기준이라 한 번 묻습니다.
              서버가 .doc·.docx 를 415 로 거부하므로 고를 수 있게 두지 않습니다. */}
          <label className="outline small institution-file-replace">
            <input
              type="file"
              accept=".pdf,.hwp,.hwpx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 30 * 1024 * 1024) {
                  notify("기준 문서는 30MB 이하만 등록할 수 있습니다.");
                  return;
                }
                set교체확인(file);
              }}
            />
            <Icon name="upload" size={14} />
            파일 교체
          </label>
        </header>
        <article>
          <span className="institution-badge">사용자 등록</span>
          <div>
            <b>{institutionFile}</b>
            <small>2026.03.02 등록</small>
          </div>
        </article>
      </section>
      <div className="rule-caution">
        <Icon name="alert" />
        <p>
          <b>안내</b> AI 점검 결과는 입력한 정보와 연결된 규정에 기반한 사전
          참고자료입니다. 최종 집행 가능 여부와 기관의 승인 절차는 담당기관의
          최신 안내를 확인해야 합니다.
        </p>
      </div>
      {교체확인 && (
        <div className="modal-backdrop">
          <section className="modal narrow file-replace-modal" role="dialog" aria-modal="true" aria-labelledby="file-replace-title">
            <header>
              <div>
                <h2 id="file-replace-title">주관기관 기준 문서를 교체하시겠습니까?</h2>
                <p>이 문서는 금액 기준·사전승인 조건·필요 증빙 판단에 쓰이는 판정 기준입니다.</p>
              </div>
              <button onClick={() => set교체확인(null)}>×</button>
            </header>
            <dl className="file-replace-list">
              <div>
                <dt>새 문서</dt>
                <dd>{교체확인.name}</dd>
              </div>
              <div>
                <dt>크기</dt>
                <dd>{크기표기(교체확인.size)}</dd>
              </div>
              <div>
                <dt>현재 문서</dt>
                <dd>{institutionFile}</dd>
              </div>
            </dl>
            <p className="file-replace-notice">
              <span>ⓘ</span>
              교체하면 기존 문서를 대신해 기관 세부기준으로 등록됩니다.
            </p>
            <footer>
              <button className="outline" onClick={() => set교체확인(null)}>취소</button>
              <button
                className="primary"
                onClick={() => {
                  setInstitutionFile(교체확인.name);
                  set교체확인(null);
                  notify("주관기관 기준 파일을 교체했습니다.");
                }}
              >
                교체하기
              </button>
            </footer>
          </section>
        </div>
      )}
      {editingProfile && (
        <div className="modal-backdrop">
          <section className="modal my-profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <header>
              <div>
                <h2 id="profile-edit-title">내 정보 수정</h2>
                <p>이메일·참여 사업·주관기관은 확인만 가능합니다. 팀 이름과 협약 정보를 수정할 수 있습니다.</p>
              </div>
              <button onClick={() => setEditingProfile(false)}>×</button>
            </header>
            <div className="my-profile-edit-grid">
              <label>
                <span>이메일 <small className="profile-fixed-label">수정 불가</small></span>
                <input value={로그인이메일} readOnly aria-readonly="true" />
              </label>
              <label>
                <span>팀 이름</span>
                <input value={profileDraft.team} onChange={(event) => setProfileDraft((value) => ({ ...value, team: event.target.value }))} />
              </label>
              {/* 🔴 참여 사업과 주관기관은 온보딩에서 정하고, 정해진 순간부터
                  비목 조회·규정 검색·판정이 그 값을 씁니다. 여기서 바꾸면 이미
                  내려둔 판정과 근거가 어긋나므로 확인만 하도록 잠급니다. */}
              <label>
                <span>참여 사업 <small className="profile-fixed-label">수정 불가</small></span>
                <input value={profileDraft.program} readOnly aria-readonly="true" />
              </label>
              <label>
                <span>주관기관 <small className="profile-fixed-label">수정 불가</small></span>
                <input value={profileDraft.host} readOnly aria-readonly="true" />
              </label>
              <label>
                <span>사업 중복 수혜 여부</span>
                <select value={profileDraft.duplicateBenefit} onChange={(event) => setProfileDraft((value) => ({ ...value, duplicateBenefit: event.target.value }))}>
                  <option value="O">O</option>
                  <option value="X">X</option>
                </select>
              </label>
              {/* 🔴 아래 4칸이 서버의 f1 입니다. AI 점검이 「협약기간 밖 지출」·
                  「사업비 초과」를 판단할 때 전제로 씁니다. */}
              <label>
                <span>협약 시작일</span>
                <input type="date" value={협약초안.시작일} onChange={(event) => set협약초안((v) => ({ ...v, 시작일: event.target.value }))} />
              </label>
              <label>
                <span>협약 종료일</span>
                <input type="date" value={협약초안.종료일} onChange={(event) => set협약초안((v) => ({ ...v, 종료일: event.target.value }))} />
              </label>
              <label>
                <span>정부지원금 (원)</span>
                <input inputMode="numeric" value={협약초안.정부지원.toLocaleString("ko-KR")} onChange={(event) => set협약초안((v) => ({ ...v, 정부지원: Number(event.target.value.replace(/[^0-9]/g, "")) || 0 }))} />
              </label>
              <label>
                <span>자기부담금 (원)</span>
                <input inputMode="numeric" value={협약초안.자기부담.toLocaleString("ko-KR")} onChange={(event) => set협약초안((v) => ({ ...v, 자기부담: Number(event.target.value.replace(/[^0-9]/g, "")) || 0 }))} />
              </label>
            </div>
            <footer>
              <button className="outline" onClick={() => setEditingProfile(false)}>취소</button>
              <button className="primary" disabled={!profileDraft.host.trim() || 협약저장중} onClick={() => {
                // 화면은 먼저 바꿉니다 — 서버가 못 받아도 시연이 끊기면 안 됩니다.
                setProfile(profileDraft);
                // 🔴 팀 이름은 Supabase 계정에 붙여야 다음 로그인에도 남습니다.
                //    실패해도 «막지 않습니다» — 화면 표기일 뿐입니다.
                //    쓰기가 끝난 «뒤» 다시 읽습니다. 안 그러면 아래 effect 가
                //    옛 값으로 방금 저장한 이름을 덮습니다.
                팀이름기억(profileDraft.team.trim());
                supabase팀이름쓰기(profileDraft.team)
                  .catch(() => false)
                  .finally(() => set팀갱신((n) => n + 1));
                set협약(협약초안);
                사업저장(profileDraft.program);
                set협약저장중(true);
                협약쓰기(협약초안)
                  .then((결과) => {
                    setEditingProfile(false);
                    notify(
                      결과 === "저장됨"
                        ? "내 정보를 저장했습니다."
                        : 결과 === "서버가안받음"
                          ? "내 정보를 수정했습니다. (현재 목 서버라 서버에는 저장되지 않습니다)"
                          : "내 정보를 수정했지만 서버 저장에 실패했습니다.",
                    );
                  })
                  .finally(() => set협약저장중(false));
              }}>{협약저장중 ? "저장하는 중…" : "저장"}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function FloatingChat({
  plans,
  route,
  close,
}: {
  plans: ExpensePlan[];
  route: AppRoute;
  close: () => void;
}) {
  const current =
    route.page === "plan-detail"
      ? plans.find((p) => p.id === route.id)
      : undefined;
  const [messages, setMessages] = useState<
    { role: "ai" | "user"; text: string }[]
  >([
    {
      role: "ai",
      text: "현재 사업 기준과 작성한 지출 계획을 함께 확인해드릴게요. 무엇이 궁금하신가요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const send = () => {
    if (!input.trim() || isLoading) return;
    const question = input;
    setMessages((v) => [...v, { role: "user", text: question }]);
    setInput("");
    setIsLoading(true);
    window.setTimeout(() => {
      setMessages((v) => [
        ...v,
        {
          role: "ai",
          text: "관련 지출과 규정 근거를 확인했습니다. 결제 전에 필요한 행동부터 순서대로 안내드릴게요.",
        },
      ]);
      setIsLoading(false);
    }, 1200);
  };
  return (
    <aside className="floating-chat">
      <header>
        <div>
          <span>
            <Icon name="sparkSolid" />
          </span>
          <div>
            <b>CHECKUMAIT AI</b>
            <small>
              {current
                ? `${current.name} 우선 참조`
                : "현재 사업·작성 문서 참조"}
            </small>
          </div>
        </div>
        <button onClick={close}>×</button>
      </header>
      {current && (
        <div className="current-context">
          <span>현재 지출</span>
          <b>{current.name}</b>
          <small>
            {current.category} · {won(current.amount)} · {current.status}
          </small>
        </div>
      )}
      <div className="floating-messages">
        {messages.map((message, index) => (
          <div className={`floating-message ${message.role}`} key={index}>
            {message.role === "ai" && <span className="floating-ai-avatar"><Icon name="sparkSolid" size={11} /></span>}
            <p>{message.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="floating-message ai" aria-live="polite">
            <span className="floating-ai-avatar"><Icon name="sparkSolid" size={11} /></span>
            <div className="floating-ai-generating">
              <span className="ai-typing-dots"><i /><i /><i /></span>
              <small>답변을 작성하고 있어요</small>
            </div>
          </div>
        )}
      </div>
      <div className="floating-quick">
        <button disabled={isLoading} onClick={() => setInput("이 지출에서 가장 먼저 할 일은?")}>
          가장 먼저 할 일
        </button>
        <button disabled={isLoading} onClick={() => setInput("필요 증빙을 알려줘")}>
          필요 증빙
        </button>
      </div>
      <footer>
        <input
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="AI에게 물어보세요"
        />
        <SendButton onClick={send} disabled={!input.trim() || isLoading} />
      </footer>
    </aside>
  );
}

function ProfileModal({
  close,
}: {
  close: () => void;
}) {
  const 사업 = use사업();
  const 이메일 = use이메일();
  const 팀이름 = use팀이름() || "체쿠메이트";
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header>
          <div>
            <h2>내 정보</h2>
            <p>계정과 참여 사업 정보를 확인하세요.</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <dl className="profile-list">
          <Info label="팀 이름" value={팀이름} />
          <Info label="이메일" value={이메일 || "로그인 정보 없음"} />
          <Info label="선정사업" value={사업} />
        </dl>
        <footer>
          <button className="outline" onClick={close}>
            닫기
          </button>
        </footer>
      </section>
    </div>
  );
}
