"use client";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { INITIAL_PLANS } from "../lib/mock-data";
import { planService } from "../lib/plan-service";
import type { 기준문서정보,
  AppRoute,
  ExpensePlan,
  PlanStatus,
  ScheduleItem,
} from "../lib/types";
import type { 서버팀, 비목후보, 답변항목, 확인질문, 사용자답변항목, 판정피드백, 부가세구분, 분류값, 추가입력칸, 용어풀이항목, 코드판정값, 확인한조건항목 } from "../lib/server-types";
import { API켜짐 } from "../lib/config";
import { 판정실행 } from "../lib/judge";
import { 정규화하기 } from "../lib/normalize";
import { 인증오류 } from "../lib/http";
import { 계획목록, 계획상세, 비목목록, 계획추가, 계획수정, 규정업로드, 규정처리기다리기, 규정적용, 규정거절, 조문연결저장, L3현재문서목록, 팀조회, 팀만들기, 초대코드재발급, 팀들어가기, 팀나가기, 팀원내보내기, 계획삭제, 일정수정, 피드백저장 } from "../lib/api";
import type { L3처리결과, L3현재문서 } from "../lib/server-types";
import { 체크저장, 일정변경저장, 일정등록, 일정지우기, 점검일정인가 } from "../lib/tasks";
import { 기본규정, 서버규정읽기, type 적용규정항목 } from "../lib/norms";
import { 기관검색, 사업요약, 기관저장, 선택기관, 기본기관명, 계정등록, 초대코드등록, type 기관 } from "../lib/orgs";
import {
  use첨부,
  첨부accept,
  첨부검사,
  첨부내려받기,
  첨부다시올리기,
  첨부새로읽기,
  첨부올리기,
  첨부지우기,
  크기표기,
  type 첨부,
} from "../lib/attachments";
import { 지금출처, 출처구독, 출처문구 } from "../lib/data-source";
import { 인증켜짐, 로그인 as supabase로그인, 가입 as supabase가입, 로그아웃 as supabase로그아웃, 이메일 as supabase이메일, 팀이름 as supabase팀이름, 팀이름쓰기 as supabase팀이름쓰기, 온보딩기록읽기, 온보딩마침, 재설정링크읽기, 재설정끝내기, 재설정메일보내기, 새비밀번호저장 } from "../lib/supabase";
import { 상세를계획으로, 판정제목, 행동문구, 조건칸상태, 시각표기, L3등록사실, L3현재문서요약짓기, 조문연결셈, 문서명보기, 답표기, 로조사, 부가세확정, 부가세표기, 부가세질문id, 정규화저장값, type L3현재문서요약 } from "../lib/adapt";
import { 질문가져오기, 추가입력초기값, 추가입력값만들기, type 질문결과, type 조사후보, type 조사답변 } from "../lib/questions";
import type { 진행항목 } from "../lib/sse";
// 주의: `데모종료` 는 남깁니다 — 「계정 없이 둘러보기」를 없앴어도 예전에 받아 둔
//    데모 토큰이 브라우저에 2시간 남아 있을 수 있고, 그게 로그인 조회를 가로챕니다.
import { 데모종료, 데모중, 이메일기억, 기억된이메일, 이메일잊기, 팀이름기억, 기억된팀이름 } from "../lib/session";
import { 초안전부지우기 } from "../lib/inquiry-store";
import { 선택사업, 사업저장, 사업선택지, 목록에맞추기, 기본사업 } from "../lib/program";
import { 협약쓰기, 원, 날짜표기, 디데이표기, 지금협약, 협약기억, 협약잊기, 기억된협약, 서버협약읽기, 서버협약조회, 빈협약, type 협약정보 } from "../lib/profile";
import { SendButton } from "./send-button";
import "./detail-refinement.css";
import "./home-v4.css";

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
 * 주의: AI 챗봇(화면 12)을 '끕니다' — 2026-09-03 백엔드 확정: 이번 제출 범위 밖입니다.
 *    서버 엔드포인트 20개에 챗봇용이 없어서, 열어두면 심사위원이 화면에 하드코딩된
 *    답변을 'AI 답변으로' 읽게 됩니다. 그게 제일 나쁜 결과라는 데 양쪽이 동의했습니다.
 *    나중에 API 가 생기면 이 한 줄만 true 로 되돌리면 화면이 그대로 다시 동작합니다.
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
 * 주의: 이제 상수가 아닙니다 — 온보딩에서 사용자가 '고른' 사업을 돌려줍니다.
 *    (아무것도 안 골랐으면 「2026 초기창업패키지」. 서버는 연도 접두사를 별칭으로 벗깁니다)
 *    쓰는 곳: 비목 조회 · 정규화 · 계획 저장 · AI 점검
 */
const 현재사업 = () => 선택사업();

/**
 * 받침이 있으면 「을」, 없으면 「를」.
 *
 * 주의: 사업명이 서버에서 오는 값이라 조사를 고정할 수 없습니다. 「초기창업패키지을(를)」
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
 * 주의: 예전에는 `Number("".slice(5,7))` 가 그대로 0 이 되어 집행 일정에 「0/0」이
 *    찍혔습니다. 서버 할일에 due_date 가 없을 때 나던 증상입니다.
 */
/** 이 기기의 오늘 날짜(YYYY-MM-DD, 현지 시간). 클라이언트에서만 부릅니다. */
function 오늘날짜(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function 월일표기(date: string): string {
  const m = Number(date?.slice(5, 7));
  const d = Number(date?.slice(8, 10));
  return m && d ? `${m}/${d}` : "—";
}

/**
 * 화면에 「참여 중인 사업」을 '글자로' 보여줄 때 씁니다.
 *
 * 주의: `현재사업()` 을 JSX 안에서 바로 부르면 안 됩니다.
 *    서버에서 미리 그린 HTML 은 기본값인데 브라우저는 localStorage 값을 읽어서,
 *    React 가 「서버와 화면이 다르다」고 경고(hydration mismatch)를 냅니다.
 *    그래서 첫 렌더링은 기본값으로 그리고, 붙은 뒤에 바꿉니다.
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
 * 지금 참여 중인 '주관기관'. 온보딩에서 고른 값입니다.
 * 주의: `use사업` 과 같은 이유로 첫 렌더링은 기본값, 붙은 뒤에 localStorage 를 읽습니다.
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
 * 협약 기간·사업비. 홈·사이드바·마이페이지가 '같은 값' 을 보게 하는 통로입니다.
 *
 * 주의: 순서: **서버(`GET /api/profile`)** → 이 브라우저에 남긴 값(게스트·mock) → 온보딩에서
 *    '고른 사업' 의 시연값. 서버에 값이 있으면 브라우저 값을 지웁니다. 자세한 사정은
 *    `lib/profile.ts::서버협약읽기`.
 *
 * 주의: 초기값을 '동기' 로 채웁니다. 예전엔 기본값을 그린 다음 효과에서 덮어써서,
 *    홈에 잠깐 다른 금액이 스쳤습니다. 서버 값은 늦게 도착하므로 받아지면 한 번 더
 *    덮어씁니다(짧게 시연값 → 서버값으로 바뀔 수 있습니다 — 없음보다 낫습니다).
 */
const 협약저장알림 = "checkumait-협약저장";

function use협약(재조회?: unknown): 협약정보 & { 예시: boolean } {
  const [값, set값] = useState<협약정보>(지금협약);
  // 주의: 사용자가 입력한 값이 아니면 화면에 예시라고 표시합니다. 실제 협약기간처럼 보이면 안 됩니다.
  const [예시, set예시] = useState(true);
  // 주의: 마이페이지에서 저장해도 이미 떠 있는 사이드바는 다시 읽지 않아 D-day 가 안 보였습니다.
  const [저장횟수, set저장횟수] = useState(0);
  useEffect(() => {
    const 다시읽기 = () => set저장횟수((n) => n + 1);
    window.addEventListener(협약저장알림, 다시읽기);
    return () => window.removeEventListener(협약저장알림, 다시읽기);
  }, []);
  useEffect(() => {
    let 살아있음 = true;
    // 로그인·사업 변경 뒤에는 고른 사업이 달라졌을 수 있으므로 다시 읽습니다.
    set값(지금협약());
    set예시(!기억된협약());
    서버협약읽기().then((서버값) => {
      if (살아있음 && 서버값) {
        협약잊기();
        set값(서버값);
        set예시(false);
      }
    });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회, 저장횟수]);
  return { ...값, 예시 };
}

/** 이 사업에서 고를 수 있는 비목. `/api/vocab` 이 기준입니다(창업활동비는 일부 사업에만 있습니다). */
function use비목선택지(): readonly string[] {
  const [서버비목, set서버비목] = useState<string[] | null>(null);
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
  return 서버비목 ?? EXPENSE_CATEGORIES;
}

/**
 * 마이페이지 「공통 관리 기준」 — `사업명` 에 적용되는 규정 목록.
 *
 * 주의: 2026-09-07 — `GET /api/programs` 가 `우선순위규칙목록` 을 포함해 보내기
 *    시작했습니다(서버 커밋 `7fcd665`). 첫 렌더링은 `기본규정()`(동기, 지어내지
 *    않는 최소 문구)으로 채우고, 서버 응답이 오면 덮어씁니다 — `use협약()` 과
 *    같은 모양입니다.
 */
function use적용규정(사업명: string): 적용규정항목[] {
  const [값, set값] = useState<적용규정항목[]>(() => 기본규정(사업명));
  useEffect(() => {
    let 살아있음 = true;
    set값(기본규정(사업명));
    서버규정읽기(사업명).then((서버값) => {
      if (살아있음 && 서버값) set값(서버값);
    });
    return () => {
      살아있음 = false;
    };
  }, [사업명]);
  return 값;
}

const 빈기준문서: L3현재문서요약 = { 파일명: null, 안내: null, 등록일: null, ocr: false, 실패목록: [], 처리중목록: [], 확인대기목록: [], 조회실패: false };

/**
 * 마이페이지 「주관기관 세부 안내」 — 이 기관에 지금 적용 중인 L3 문서.
 *
 * 주의: 2026-09-07 — `GET /api/l3/current` 신설(서버 커밋 `7fcd665`). 게스트는 org 가
 *    없어 서버가 늘 빈 목록을 줍니다 — 그래서 이 훅은 로그인된 마이페이지에서만
 *    씁니다(온보딩은 `criteriaFile` 로컬 상태만 씁니다, 위 `Login` 컴포넌트 참고).
 */
function use현재기준문서(재조회?: unknown): L3현재문서요약 {
  const [값, set값] = useState<L3현재문서요약>(빈기준문서);
  useEffect(() => {
    let 살아있음 = true;
    if (!API켜짐()) return;
    L3현재문서목록()
      .then((r) => {
        if (살아있음) set값(L3현재문서요약짓기(r?.문서 ?? []));
      })
      .catch(() => {
        // 판정을 막지는 않지만 문서가 없는 것처럼 보이면 안 됩니다
        if (살아있음) set값({ ...빈기준문서, 조회실패: true });
      });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [재조회]);
  return 값;
}

/**
 * 기준 문서(L3)를 서버가 읽는 동안 띄우는 창. 온보딩 「설정 완료」와 마이페이지 「파일 교체」가 같이 씁니다.
 *
 * 주의: 판정 모달(`AiCheckingOverlay`)과 '같은 클래스' 를 씁니다 — 프로토타입 디자인이 이미
 *    그 모양이라, 새 스타일을 만들면 한 서비스에 로딩 모양이 두 가지가 됩니다.
 */
function L3읽는중({
  파일명,
  문구,
  반영됨 = false,
}: {
  파일명: string;
  문구: string;
  /** 다 읽어 판정 기준에 반영됐을 때만 세 단계를 모두 켭니다. 아직 읽는 중이면 첫 단계만 켭니다. */
  반영됨?: boolean;
}) {
  return (
    <div className="ai-checking-backdrop">
      <section
        className="ai-checking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="l3-parsing-title"
      >
        <span className="ai-checking-visual" aria-hidden="true">
          <span className="ai-checking-spinner" />
          <Icon name="sparkSolid" size={20} />
          <i className="ai-check-spark ai-check-spark-one">
            <Icon name="sparkSolid" size={9} />
          </i>
          <i className="ai-check-spark ai-check-spark-two">
            <Icon name="sparkSolid" size={7} />
          </i>
        </span>
        <h2 id="l3-parsing-title">기준 문서를 읽고 있어요</h2>
        <p>{문구 || "조·항을 나누고 금액 기준과 사전승인 조건을 찾고 있습니다."}</p>
        <div className="ai-checking-steps">
          {["문서 업로드", "조·항 분리", "기준 반영"].map((label, i) => (
            <span className={반영됨 || i === 0 ? "active" : ""} key={label}>
              <i />
              <b>{label}</b>
            </span>
          ))}
        </div>
        <small>{파일명}</small>
      </section>
    </div>
  );
}

/** 기준 문서를 읽지 못했을 때 `L3실패창` 에 넘기는 값. */
type L3실패 = {
  파일명: string;
  /** 서버 `메시지`(실패 이유와 다음 할 일, 지금 판정에 쓰는 규정까지 담긴 문장). */
  메시지: string;
  /** 지금 판정에 쓰는 기준 문서. `null` 이면 공통 관리 기준만으로 판정합니다. 모르면 생략합니다. */
  적용중?: string | null;
  /** 창 제목·부제. 생략하면 「읽지 못했습니다 / 반영되지 않았습니다」. */
  제목?: string;
  부제?: string;
};

/**
 * 기준 문서(L3)를 읽지 못했을 때 띄우는 창. 온보딩과 마이페이지가 같이 씁니다.
 *
 * 주의: 2026-11-03 — 실패를 토스트(2.3초)나 1.8초짜리 문구로만 알리고 넘어가서, 사용자는 올린
 *    규정이 판정에 쓰이는 줄 알았습니다. 서버가 실패 이유와 '지금 판정에 쓰는 문서'를 주므로
 *    (`실패사유`·`적용중_문서`) 사용자가 닫을 때까지 보여주고, 다시 올릴 길을 같은 창에 둡니다.
 *    모양은 마이페이지 「기준 문서 교체」 확인 창(`file-replace-modal`)과 같습니다.
 */
function L3실패창({
  실패,
  닫기,
  다시올리기,
  넘어가기,
}: {
  실패: L3실패;
  /** ×·「닫기」 — 창만 닫습니다. */
  닫기: () => void;
  다시올리기: (파일: File) => void;
  /** 주면 「닫기」 대신 이 버튼을 둡니다(온보딩의 「건너뛰고 계속」). */
  넘어가기?: { 문구: string; 동작: () => void };
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="modal narrow file-replace-modal l3-fail-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="l3-fail-title"
        aria-describedby="l3-fail-message"
      >
        <header>
          <div>
            <h2 id="l3-fail-title">{실패.제목 ?? "기준 문서를 읽지 못했습니다"}</h2>
            <p>{실패.부제 ?? "올린 문서는 판정에 반영되지 않았습니다."}</p>
          </div>
          <button onClick={닫기} aria-label="닫기">×</button>
        </header>
        <dl className="file-replace-list">
          <div>
            <dt>올린 문서</dt>
            <dd>{실패.파일명}</dd>
          </div>
          {실패.적용중 !== undefined && (
            <div>
              <dt>판정에 쓰는 문서</dt>
              <dd>{실패.적용중 ?? "없음 · 공통 관리 기준만 적용"}</dd>
            </div>
          )}
        </dl>
        <p className="file-replace-notice" id="l3-fail-message">
          <span>ⓘ</span>
          {실패.메시지}
        </p>
        <footer>
          {넘어가기 ? (
            <button className="outline" onClick={넘어가기.동작}>{넘어가기.문구}</button>
          ) : (
            <button className="outline" onClick={닫기}>닫기</button>
          )}
          {/* 주의: 서버가 .doc·.docx 를 415 로 거부하므로 고를 수 있게 두지 않습니다. */}
          <label className="primary institution-file-replace">
            <input
              type="file"
              accept=".pdf,.hwp,.hwpx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) 다시올리기(file);
              }}
            />
            <Icon name="upload" size={14} />
            다시 올리기
          </label>
        </footer>
      </section>
    </div>
  );
}

/** 예외를 사용자 문장으로 바꿉니다. 브라우저 원문("Failed to fetch" 등)은 보여주지 않습니다. */
function 오류사유(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "TypeError") return "서버에 연결하지 못했습니다.";      // fetch 네트워크 오류
    if (e.name === "TimeoutError" || e.name === "AbortError") return "서버 응답이 너무 늦습니다.";
    if (e.message) return e.message;                                       // 413·415·401 등 서버 안내
  }
  return "알 수 없는 오류입니다.";
}

/** 올린 문서가 이 기관 세부기준이 맞는지 사용자에게 묻는 창의 값. */
type L3확인 = {
  doc_id: string;
  파일명: string;
  조_건수: number;
  이유: string | null;
  /** 지금 판정에 쓰는 문서. `null` 이면 공통 관리 기준만으로 판정합니다. */
  적용중: string | null;
};

/**
 * 읽기는 했지만 세부기준이 맞는지 불확실한 문서를 쓸지 묻는 창. 온보딩과 마이페이지가 같이 씁니다.
 *
 * 고르기 전에는 판정에 쓰지 않습니다. ×로 닫으면 마이페이지 「주관기관 세부 안내」에서 다시 고를 수 있습니다.
 */
function L3확인창({
  확인,
  닫기,
  적용,
  거절,
}: {
  확인: L3확인;
  닫기: () => void;
  적용: (결과: L3처리결과) => void;
  거절: () => void;
}) {
  const [처리중, set처리중] = useState(false);
  const [오류, set오류] = useState("");
  const 처리 = async (동작: "적용" | "거절") => {
    set처리중(true);
    set오류("");
    try {
      if (동작 === "적용") {
        적용(await 규정적용(확인.doc_id));
      } else {
        await 규정거절(확인.doc_id);
        거절();
      }
    } catch (e) {
      set오류(`처리하지 못했습니다 — ${오류사유(e)}`);
      set처리중(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal narrow file-replace-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="l3-confirm-title"
      >
        <header>
          <div>
            <h2 id="l3-confirm-title">이 문서를 세부기준으로 쓸까요?</h2>
            <p>이 기관의 사업비 기준 문서가 아닐 수 있습니다.</p>
          </div>
          <button onClick={닫기} aria-label="닫기" disabled={처리중}>×</button>
        </header>
        <dl className="file-replace-list">
          <div>
            <dt>올린 문서</dt>
            <dd>{확인.파일명}</dd>
          </div>
          <div>
            <dt>찾은 항목</dt>
            <dd>{확인.조_건수}개</dd>
          </div>
          <div>
            <dt>판정에 쓰는 문서</dt>
            <dd>{확인.적용중 ?? "없음 · 공통 관리 기준만 적용"}</dd>
          </div>
        </dl>
        {확인.이유 && (
          <p className="file-replace-notice">
            <span>ⓘ</span>
            {확인.이유}
          </p>
        )}
        <p className="section-copy">고르기 전까지 지금 판정에 쓰는 기준을 그대로 둡니다.</p>
        {오류 && <p className="file-replace-notice" role="alert"><span>ⓘ</span>{오류}</p>}
        <footer>
          <button className="outline" disabled={처리중} onClick={() => void 처리("거절")}>올리지 않기</button>
          <button className="primary" disabled={처리중} onClick={() => void 처리("적용")}>이 문서로 적용</button>
        </footer>
      </section>
    </div>
  );
}

/** 조문 연결 고르기 값. 화면에는 표시문만 보이고, 값은 저장할 때만 씁니다. */
const 연결_고르지않음 = "__고르지않음";
const 연결_공통 = "__공통";
const 연결값 = (ids: string[] | null): string => (ids === null ? 연결_고르지않음 : ids.length === 0 ? 연결_공통 : ids.join("|"));

/**
 * 기관 세부기준의 조문마다 어느 비목에 해당하는지 확인하는 창(2026-11-07, P4-5). 마이페이지 「주관기관 세부 안내」에서 엽니다.
 *
 * 서버 추천이 기본으로 골라져 있고(「저장」하면 그대로 확인), 조마다 고치거나 「고르지 않음」으로 둘 수 있습니다.
 * 고르지 않은 조문은 지금처럼 모든 판정에 함께 들어갑니다. 「나중에」는 아무것도 저장하지 않습니다.
 */
function L3연결창({
  문서,
  닫기,
  저장됨,
}: {
  문서: L3현재문서;
  닫기: () => void;
  저장됨: (r: L3현재문서) => void;
}) {
  const 목록 = 문서.연결 ?? [];
  const 선택지 = 문서.연결선택지 ?? [];
  const [고름, set고름] = useState<Record<number, string>>(() =>
    Object.fromEntries(목록.map((x) => [x.article_id, 연결값(x.concept_ids)])),
  );
  const [처리중, set처리중] = useState(false);
  const [오류, set오류] = useState("");
  const 추천없음뿐 = 목록.length > 0 && 목록.every((x) => x.상태 === "추천없음");
  const 안내 =
    문서.연결상태 === "추천작성중"
      ? "추천을 만드는 중이에요. 잠시 뒤 다시 열면 추천이 채워져요. 지금 직접 골라도 됩니다."
      : 문서.연결상태 === "추천없음" // 추천을 만든 적이 없는 문서(이 기능 전에 올림). 실패가 아니다
        ? "이 문서에는 아직 자동 추천이 없어요. 조문마다 직접 골라 주세요."
      : 문서.연결상태 === "추천실패" || (추천없음뿐 && 문서.연결상태 !== "추천일부실패")
        ? "자동 추천을 만들지 못했어요. 조문마다 직접 골라 주세요."
        : 문서.연결상태 === "추천일부실패"
          ? "일부 조문은 추천을 만들지 못했어요. 비어 있는 조문은 직접 골라 주세요."
          : null;

  const 저장 = async () => {
    const 값: Record<string, string[] | null> = {};
    for (const x of 목록) {
      const v = 고름[x.article_id] ?? 연결_고르지않음;
      if (v === 연결_고르지않음) {
        if (x.상태 === "확인") 값[String(x.article_id)] = null; // 확인했던 조를 되돌린다
      } else {
        값[String(x.article_id)] = v === 연결_공통 ? [] : v.split("|");
      }
    }
    if (Object.keys(값).length === 0) {
      닫기();
      return;
    }
    set처리중(true);
    set오류("");
    try {
      저장됨(await 조문연결저장(문서.doc_id, 값));
    } catch (e) {
      set오류(`저장하지 못했습니다 — ${오류사유(e)}`);
      set처리중(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal wide" role="dialog" aria-modal="true" aria-labelledby="l3-link-title">
        <header>
          <div>
            <h2 id="l3-link-title">조문 연결 확인</h2>
            <p>
              조문마다 어느 비목에 해당하는지 골라 주세요. 판정할 때 고른 비목의 조문을 먼저 보고, 다른 비목에 연결한
              조문은 빼요.
            </p>
          </div>
          <button onClick={닫기} aria-label="닫기" disabled={처리중}>×</button>
        </header>
        <div className="recommend-list" style={{ padding: 20 }}>
          {안내 && <p className="section-copy" role="status">{안내}</p>}
          <p className="section-copy">
            고르지 않은 조문은 지금처럼 모든 판정에 함께 봅니다. 기관 규정이 상위 규정보다 느슨해도 판정은 상위 규정을 따릅니다.
          </p>
          {목록.map((x) => {
            const 지금 = 고름[x.article_id] ?? 연결_고르지않음;
            // 추천이 여러 분류를 묶었거나 지금 목록 밖 분류로 확인한 조는 그 값을 따로 둡니다(고치면 목록에서 고릅니다)
            const 원래 = 연결값(x.concept_ids);
            const 원래따로 = 원래 !== 연결_고르지않음 && 원래 !== 연결_공통 && !선택지.some((s) => s.concept_id === 원래);
            return (
              <label key={x.article_id}>
                <span>
                  <b>{[x.조번호, x.조제목].filter(Boolean).join(" ")}</b>
                  {x.미리보기 && <small>{x.미리보기}</small>}
                  {x.옛판문구.map((o, i) => (
                    <small key={i}>
                      <span className="institution-badge warn">옛 판 문구</span> 「{o.문서}」와 같은 문장이에요: “{o.문장}”
                      지금 판 기준과 다를 수 있어요.
                    </small>
                  ))}
                </span>
                <em>{x.상태 === "확인" ? "확인함" : x.상태 === "추천" ? "추천" : "추천 없음"}</em>
                <select
                  value={지금}
                  disabled={처리중}
                  aria-label={`${x.조번호} 연결할 비목`}
                  onChange={(event) => set고름((v) => ({ ...v, [x.article_id]: event.target.value }))}
                >
                  <option value={연결_고르지않음}>고르지 않음 (모든 판정에 함께 봄)</option>
                  <option value={연결_공통}>모든 지출에 공통</option>
                  {원래따로 && <option value={원래}>{x.표시문.join(" · ") || "이전에 고른 분류"}</option>}
                  {선택지.map((s) => (
                    <option key={s.concept_id} value={s.concept_id}>
                      {s.표시문}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        {오류 && <p className="section-copy" role="alert" style={{ padding: "0 20px" }}>ⓘ {오류}</p>}
        <footer>
          <button className="outline" disabled={처리중} onClick={닫기}>나중에</button>
          <button className="primary" disabled={처리중} onClick={() => void 저장()}>저장</button>
        </footer>
      </section>
    </div>
  );
}

/** 결과 화면 맨 위의 한 줄. 이 판정이 어떤 기준 문서로 점검했는지 알립니다. 판정 값은 바꾸지 않습니다. */
function 기준문서줄({ 정보, 기준문서보기 }: { 정보: 기준문서정보; 기준문서보기: () => void }) {
  const 쓴기준 = 정보.문서명 ? `기존 문서 「${정보.문서명}」` : "공통 규정";
  const [문구, 버튼] =
    정보.상태 === "적용"
      ? [`「${정보.문서명}」 기준으로 점검했어요.`, null]
      : 정보.상태 === "없음"
        ? ["기관 세부기준 없이 공통 규정으로 점검했어요.", "기준 문서 올리기"]
        : 정보.상태 === "읽기실패"
          ? [`읽지 못한 문서가 있어요(「${정보.대기문서명}」). ${쓴기준} 기준으로 점검했어요.`, "다시 올리기"]
          : [`확인 전인 문서가 있어요(「${정보.대기문서명}」). ${쓴기준} 기준으로 점검했어요.`, "확인하기"];
  return (
    <div className={`criteria-basis${정보.상태 === "적용" ? "" : " is-notice"}`}>
      <span>{문구}</span>
      {버튼 && <button className="outline small" onClick={기준문서보기}>{버튼}</button>}
    </div>
  );
}

type L3처리 =
  | { 종류: "완료"; 결과: L3처리결과 }
  | { 종류: "처리중"; 결과: L3처리결과 }
  | { 종류: "확인"; 확인: L3확인 }
  | { 종류: "실패"; 실패: L3실패 };

/**
 * 기준 문서 하나를 올리고 서버가 다 읽을 때까지 기다려 결과를 셋 중 하나로 돌려줍니다. 예외를 던지지 않습니다.
 * 온보딩과 마이페이지가 같이 씁니다.
 *
 * 주의: 업로드 자체가 실패하면(413·415·네트워크·30MB 초과) 서버에 문서가 생기지 않았으니 판정 기준도
 *    그대로입니다. 업로드는 됐는데 결과 조회가 실패하면(401·404 등) 서버는 계속 읽고 있을 수 있어서
 *    '반영 안 됨' 이라고 단정하지 않고 마이페이지에서 확인하라고 안내합니다.
 */
async function 기준문서처리(파일: File): Promise<L3처리> {
  const 바뀌지않음 = "판정 기준은 바뀌지 않았습니다.";
  if (파일.size > 30 * 1024 * 1024) {
    return { 종류: "실패", 실패: { 파일명: 파일.name, 메시지: `기준 문서는 30MB 이하만 등록할 수 있습니다. ${바뀌지않음}` } };
  }
  let 접수: L3처리결과;
  try {
    접수 = await 규정업로드(파일, 선택기관());
  } catch (e) {
    return { 종류: "실패", 실패: { 파일명: 파일.name, 메시지: `문서를 올리지 못했습니다 — ${오류사유(e)} ${바뀌지않음}` } };
  }
  let r: L3처리결과;
  try {
    r = await 규정처리기다리기(접수);
  } catch (e) {
    return {
      종류: "실패",
      실패: {
        파일명: 파일.name,
        제목: "처리 결과를 확인하지 못했습니다",
        부제: "문서는 올라갔지만 다 읽었는지 확인하지 못했습니다.",
        메시지: `${오류사유(e)} 잠시 뒤 마이페이지 「주관기관 세부 안내」에서 결과를 확인해 주세요.`,
      },
    };
  }
  if (r.상태 === "실패") {
    return {
      종류: "실패",
      실패: {
        파일명: 파일.name,
        메시지: r.메시지 || "문서를 읽지 못했습니다. 다시 올려 주세요.",
        적용중: r.적용중_문서 ?? null,
      },
    };
  }
  if (r.상태 === "확인필요") {
    return {
      종류: "확인",
      확인: {
        doc_id: r.doc_id,
        파일명: 파일.name,
        조_건수: r.조_건수 ?? 0,
        이유: r.검토이유 ?? null,
        적용중: r.적용중_문서 ?? null,
      },
    };
  }
  return { 종류: r.상태 === "완료" ? "완료" : "처리중", 결과: r };
}

/**
 * 회원가입에서 받은 팀 이름.
 *
 * 주의: **Supabase 사용자 메타데이터가 기준 데이터입니다** (2026-09-05).
 *    전에는 이 탭의 sessionStorage 만 봤는데, 로그아웃하면 그 값을 지우므로
 *    다시 로그인하면 이름이 「체쿠메이트」로 되돌아갔습니다. 계정에 붙여 두면
 *    다른 기기·다른 브라우저에서 들어와도 따라옵니다.
 *
 * 주의: 로컬 기억을 '먼저' 그립니다. 서버 조회는 한 박자 늦어서, 안 그러면 로그인
 *    직후 한 프레임 동안 「체쿠메이트」가 번쩍입니다.
 */
function use팀이름(재조회?: unknown): string {
  /**
   * 주의: **모르면 '빈 문자열' 을 돌려줍니다. 기본 표기를 여기서 만들지 않습니다.**
   *
   *    2026-09-05 사고. 전에는 이 훅이 못 찾으면 「체쿠메이트」를 '값처럼' 돌려줬습니다.
   *    마이페이지가 그 값을 「서버가 알려준 이름」으로 알고 profile 에 덮어써서,
   *    사용자가 팀 이름을 고쳐 저장해도 저장 직후 곧바로 「체쿠메이트」로 되돌아갔습니다
   *    — 화면에서는 '수정이 아예 안 되는' 것으로 보였습니다. 하드코딩처럼 보인 이유가
   *    이것입니다. 「모른다」와 「기본값이 이것이다」를 한 값으로 뭉치면 안 됩니다.
   *
   *    → 표기 기본값은 '그리는 쪽' 이 정합니다 (`|| "체쿠메이트"`).
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
 * 주의: 순서: Supabase 세션 → 이 탭이 기억한 로그인 이메일 → 데모(계정 없음).
 *    `use사업` 과 같은 이유로 첫 렌더링은 비워 두고 붙은 뒤에 채웁니다(hydration).
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
 * 주의: 서버 비목 라벨과 이 파일의 질문표 키가 다릅니다.
 *      서버 `기계장치`  ↔ 질문표 `기계장치비`
 *      서버 `특허권등무형자산취득비` ↔ 질문표 `특허권 등 무형자산 취득비`
 *    공백을 접고 앞부분이 겹치면 같은 것으로 봅니다. 못 찾으면 빈 배열입니다.
 */
function 질문찾기(라벨: string): CheckQuestion[] {
  const 접기 = (x: string) => x.replace(/\s/g, "");
  const 키 = 접기(라벨.split(" · ")[0]);
  // 주의: 빈 문자열은 모든 키의 앞부분과 겹칩니다. 그대로 두면 비목 없는 계획이 재료비 질문을 받습니다.
  if (!키) return [];
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

/** 판정을 받은 계획의 상태인가(점검 전 · 점검 중 · 재점검 필요가 아니다). 점검에 쓰인 입력이 바뀌면 이 계획만 재점검 대상이 된다. */
const 점검한상태 = (value: PlanStatus): value is Exclude<PlanStatus, "점검 전" | "점검 중" | "재점검 필요"> =>
  value !== "점검 전" && value !== "점검 중" && value !== "재점검 필요";
const displayPlanStatus = (value: PlanStatus) =>
  value === "점검 전" || value === "재점검 필요" ? "점검전" : value;

function Status({ value }: { value: PlanStatus }) {
  const key =
    value === "점검 중"
      ? "checking"
      : displayPlanStatus(value) === "점검전"
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
          key === "checking"
            ? "spark"
            : key === "draft"
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
 * 주의: 두 벌을 '둘 다' 그려 두고 CSS 로 하나만 보입니다. 메뉴를 접었다 펼 때
 *    이미지를 교체하면 잠깐 빈칸이 생기는데(새 파일을 그때 받아옵니다),
 *    미리 둘 다 두면 그 깜빡임이 없습니다.
 *      · 펼침 = 가로형 워드마크 (ssudo_v2)
 *      · 접힘 = 정사각 심볼   (ssu)
 */
/**
 * 「지금 보이는 자료가 서버 것이 아닙니다」를 '화면이 말하게' 합니다.
 *
 * 주의: 왜 있는가: 서버 호출이 실패하면 예시 데이터로 되돌아가는데, 예전에는 그걸
 *    콘솔에만 적었습니다. 그래서 「123」 같은 예전 시험 입력이 DB 값처럼 보였고,
 *    화면만 봐서는 '실제 자료인지 예시인지' 구분할 방법이 없었습니다.
 *
 * 주의: 서버가 정상이면 `출처문구()` 가 null 을 주고 아무것도 안 그립니다.
 *
 * 주의: `useSyncExternalStore` 를 쓰는 이유: 출처는 React 밖(`lib/data-source.ts`)에서
 *    바뀝니다. 상태를 또 만들어 복제하면 두 값이 어긋납니다.
 */
function DataSourceBanner() {
  const 기록 = useSyncExternalStore(
    출처구독,
    지금출처,
    // 주의: 서버 렌더에서는 '항상 서버 정상' 으로 봅니다. 서버에는 브라우저의
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

/**
 * 저장된 협약 금액이 사업의 협약 구성 규정(예: 자기부담 현물은 총사업비의 20% 이하)을 어길 때 서버가 준 문장을 보여 줍니다.
 * 주의: 안내일 뿐 점검 결과에는 영향이 없습니다. 문장이 없으면 아무것도 그리지 않습니다.
 */
function 협약경고알림({ 줄들, 모달 = false }: { 줄들: string[]; 모달?: boolean }) {
  if (줄들.length === 0) return null;
  return (
    <div className={`data-source-banner warn profile-ratio-warning${모달 ? " in-modal" : ""}`} role="status">
      <Icon name="alert" size={16} />
      <span>
        <b>협약 금액이 규정 기준과 달라요</b>
        {줄들.map((줄) => (
          <small key={줄}>{줄}</small>
        ))}
      </span>
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

type 확인요청 = { 제목: string; 설명: string; 실행문구: string };

const 계획삭제문구 = (이름: string): 확인요청 => ({
  제목: "지출 계획을 삭제할까요?",
  설명: `'${이름}'을(를) 삭제합니다. 연결된 집행 일정도 함께 삭제됩니다.`,
  실행문구: "삭제",
});

/** 삭제 전 확인 창. 브라우저 기본 창 대신 서비스 디자인으로 묻습니다. 기본 선택은 「취소」입니다. */
function ConfirmDialog({ 요청, 답 }: { 요청: 확인요청; 답: (확인함: boolean) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") 답(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [답]);
  return (
    <div className="modal-backdrop">
      <section
        className="modal narrow confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <header>
          <h2 id="confirm-title">{요청.제목}</h2>
          <button onClick={() => 답(false)} aria-label="닫기">×</button>
        </header>
        <p id="confirm-message">{요청.설명}</p>
        <footer>
          <button className="outline" autoFocus onClick={() => 답(false)}>취소</button>
          <button className="confirm-danger" onClick={() => 답(true)}>{요청.실행문구}</button>
        </footer>
      </section>
    </div>
  );
}

/** 계정에 남긴 사업·기관을 이 브라우저로 옮기고, 온보딩이 더 필요한지 돌려줍니다. */
async function 온보딩기록적용(): Promise<boolean> {
  const 기록 = await 온보딩기록읽기();
  if (기록?.사업) 사업저장(기록.사업);
  if (기록?.기관) 기관저장(기록.기관);
  const 필요 = (기록?.필요 ?? false) || (await 미등록계정());
  // 팀이면 사업은 팀의 값을 씁니다. 구성원마다 다른 사업으로 판정받으면 안 됩니다.
  if (!필요 && API켜짐()) {
    const 팀 = await 팀조회().catch(() => null);
    if (팀?.팀?.사업명) 사업저장(팀.팀.사업명);
  }
  return 필요;
}

/**
 * 표시가 없는 기존 계정 중 서버 명부(tenant.accounts)에 없는 계정을 찾습니다. 이 계정은 온보딩에서
 * 기관을 골라야 등록되고, 그전에는 모든 API 가 403 입니다.
 *
 * 주의: 서버 장애·지연을 미등록으로 보지 않습니다. 장애 때마다 온보딩이 뜨면 안 됩니다.
 */
async function 미등록계정(): Promise<boolean> {
  if (!API켜짐()) return false;
  const 조회 = 계획목록({ 크기: 1 }).then(
    () => false,
    (e: unknown) => e instanceof 인증오류 && e.상태 === 403,
  );
  const 시간초과 = new Promise<boolean>((끝) => setTimeout(() => 끝(false), 5000));
  return Promise.race([조회, 시간초과]);
}

export default function CheckumaitApp() {
  const [signedIn, setSignedIn] = useState(false);
  // 주의: 세션을 확인하기 전에 로그인 화면을 그리면 새로고침마다 한 번 번쩍입니다.
  const [세션확인중, set세션확인중] = useState(인증켜짐);
  /** 가입하고 온보딩을 마치지 못한 계정이 세션을 가진 채 돌아온 경우입니다. */
  const [온보딩이어가기, set온보딩이어가기] = useState(false);
  const [재설정, set재설정] = useState<"재설정" | "만료" | null>(null);
  useEffect(() => {
    if (!인증켜짐) return;
    let 살아있음 = true;
    void (async () => {
      try {
        // 주의: 세션 복원보다 먼저 봅니다. 안 그러면 새 비밀번호를 정하기 전에 앱으로 들어갑니다.
        const 링크 = 재설정링크읽기();
        if (링크) {
          const 세션있음 = 링크 === "재설정" && !!(await supabase이메일());
          if (!세션있음) await 재설정끝내기();
          if (살아있음) {
            set재설정(세션있음 ? "재설정" : "만료");
            set세션확인중(false);
          }
          return;
        }
        if (await supabase이메일()) {
          const 필요 = await 온보딩기록적용();
          if (!살아있음) return;
          if (필요) set온보딩이어가기(true);
          else setSignedIn(true);
        }
      } catch {
        /* 세션을 읽지 못하면 로그인 화면으로 갑니다 */
      }
      if (살아있음) set세션확인중(false);
    })();
    return () => {
      살아있음 = false;
    };
  }, []);
  // 주의: localStorage 를 첫 렌더링에서 읽으면 서버 HTML 과 어긋납니다 — 붙은 뒤에 읽습니다.
  //    (`signedIn` 아래에 있어야 합니다 — 위에 두면 선언 전 참조로 터집니다)
  // 주의: 로그인 '뒤에' 다시 물어야 합니다 — 첫 마운트 때는 아직 세션이 없습니다.
  const 이메일 = use이메일(signedIn);
  // 온보딩을 마치고 들어오므로 로그인 상태가 바뀔 때 다시 읽습니다.
  // 주의: 사업도 마찬가지입니다 — 안 그러면 사이드바만 예전 사업이 남습니다.
  const 사업 = use사업(signedIn);
  const 기관 = use기관(signedIn);
  const 팀이름 = use팀이름(signedIn) || "체쿠메이트";
  const 협약 = use협약(signedIn);
  const [데모기관, set데모기관] = useState<string | null>(null);
  useEffect(() => {
    set데모기관(데모중()?.기관명 ?? null);
  }, [signedIn]);
  const [route, setRoute] = useState<AppRoute>({ page: "home" });
  // 주의: 서버 모드에서 예시 계획으로 시작하면 응답이 오기 전까지 실제 계획처럼 보입니다.
  const [plans, setPlans] = useState<ExpensePlan[]>(() => (API켜짐() ? [] : INITIAL_PLANS));
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [자료받음, set자료받음] = useState(false);
  const [일정실패, set일정실패] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [확인대기, set확인대기] = useState<(확인요청 & { 끝: (확인함: boolean) => void }) | null>(null);
  const 확인 = (요청: 확인요청) =>
    new Promise<boolean>((끝) => set확인대기({ ...요청, 끝 }));

  // 주의: 판정은 1분쯤 걸려서 끝날 때의 화면 값이 시작할 때와 다릅니다. 그래서 닫힌 값 대신 ref 로 읽습니다.
  const [작업들, set작업들] = useState<판정작업[]>([]);
  const 작업Ref = useRef<판정작업[]>([]);
  const 다음작업키 = useRef(1);
  const 계획Ref = useRef<ExpensePlan[]>(plans);
  useEffect(() => {
    계획Ref.current = plans;
  }, [plans]);
  const 일정Ref = useRef<ScheduleItem[]>(schedules);
  useEffect(() => {
    일정Ref.current = schedules;
  }, [schedules]);
  const 작업바꾸기 = (바꾸기: (이전: 판정작업[]) => 판정작업[]) => {
    작업Ref.current = 바꾸기(작업Ref.current);
    set작업들(작업Ref.current);
  };
  // 계획 id → 마지막 판정의 작업 내역. 결과 화면의 「작업 내역 보기」가 읽습니다. 서버에 저장하지 않습니다.
  const [판정기록들, set판정기록들] = useState<Record<string, 판정기록>>({});
  const 점검중인가 = (id: string) => 작업Ref.current.some((j) => j.계획.id === id && !j.결과);
  /** 계획을 넣거나 바꿉니다. 화면에만 씌운 「점검 중」은 저장하지 않습니다. */
  const 계획반영 = (계획: ExpensePlan) => {
    const 이전 = 계획Ref.current;
    const 기존 = 이전.find((p) => p.id === 계획.id);
    const 값 = 계획.status === "점검 중" ? { ...계획, status: 기존?.status ?? "점검 전" } : 계획;
    const 다음 = 기존 ? 이전.map((p) => (p.id === 값.id ? 값 : p)) : [값, ...이전];
    계획Ref.current = 다음;
    setPlans(다음);
    void planService.savePlans(다음);
  };
  const 판정시작 = (입력: 판정시작입력) => {
    if (점검중인가(입력.계획.id)) {
      notify("이미 점검 중인 지출 계획입니다.");
      return false;
    }
    if (!계획Ref.current.some((p) => p.id === 입력.계획.id)) 계획반영(입력.계획);
    const 키 = 다음작업키.current++;
    작업바꾸기((이전) => [...이전, { ...입력, 키, 최소화: false }]);
    return true;
  };
  const 판정끝 = (키: number, 판정된계획?: ExpensePlan, 오류?: string, 기록?: 판정기록) => {
    const 작업 = 작업Ref.current.find((j) => j.키 === 키);
    if (!작업) return;
    if (기록) {
      const 남길값 = { ...기록, 오류 };
      set판정기록들((이전) => ({ ...이전, [작업.계획.id]: 남길값, ...(판정된계획 ? { [판정된계획.id]: 남길값 } : {}) }));
    }
    // 점검 중에 지운 계획을 결과로 되살리지 않습니다.
    if (판정된계획 && 계획Ref.current.some((p) => p.id === 판정된계획.id)) 계획반영(판정된계획);
    // 판정이 할일을 만들거나 지우므로 일정도 다시 읽습니다. 안 그러면 새로고침 전까지 옛 목록이 보입니다.
    if (판정된계획 && API켜짐()) {
      planService.listSchedules().then(setSchedules).catch((e: unknown) => {
        console.warn("[CHECKUMAIT] 점검 뒤 일정을 다시 읽지 못했습니다.", e);
      });
    }
    if (!작업.접은적) {
      작업바꾸기((이전) => 이전.filter((j) => j.키 !== 키));
      작업.끝남(판정된계획, 오류);
      return;
    }
    작업바꾸기((이전) =>
      이전.map((j) => (j.키 === 키 ? { ...j, 결과: { 오류, 저장안됨: 판정된계획?.저장안됨 } } : j)),
    );
    notify(오류 ? `'${작업.계획.name}' 점검을 마치지 못했습니다.` : `'${작업.계획.name}' 점검이 끝났습니다.`);
    탭제목알림(오류 ? "점검 실패 · 써도돼요" : "점검 완료 · 써도돼요");
  };
  const 도는작업있음 = 작업들.some((j) => !j.결과);
  // 점검 화면이 페이지 자리를 차지하고 있는지. 이때 다른 페이지 내용은 숨깁니다(지우지 않아 입력값이 남습니다).
  const 점검화면중 = 작업들.some((j) => !j.결과 && !j.최소화);
  // 사이드바 · 뒤로 가기로 다른 화면에 가면 점검은 접어 두고 그 화면을 보여 줍니다. 끝나면 아래 알림으로 알립니다.
  const 화면키 = route.page === "plan-detail" ? `plan-detail:${route.id}` : route.page;
  useEffect(() => {
    if (!작업Ref.current.some((j) => !j.결과 && !j.최소화)) return;
    작업바꾸기((이전) => 이전.map((j) => (!j.결과 && !j.최소화 ? { ...j, 최소화: true, 접은적: true } : j)));
  }, [화면키]);
  useEffect(() => {
    if (!도는작업있음) return;
    const 경고 = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", 경고);
    return () => window.removeEventListener("beforeunload", 경고);
  }, [도는작업있음]);
  // 주의: 페이지에는 이 값을 넘깁니다. `plans` 자체에 넣으면 판정이 실패했을 때 원래 상태를 잃습니다.
  const 화면계획 = useMemo(() => {
    const 도는id = new Set(작업들.filter((j) => !j.결과).map((j) => j.계획.id));
    if (!도는id.size) return plans;
    return plans.map((p) => (도는id.has(p.id) ? { ...p, status: "점검 중" as const } : p));
  }, [plans, 작업들]);

  // 주의: 2026-10-29 — 지출계획·일정은 로그인 '뒤에' 불러옵니다.
  //    예전에는 첫 마운트 때 한 번만 불렀는데, 그때는 아직 로그인 전이라 토큰 없이
  //    나갑니다. 서버는 게스트로 보고 0건을 주고, 로그인한 뒤에도 다시 안 불러서
  //    지출계획이 전부 0으로 보였습니다. 로그아웃 후 다른 계정으로 들어와도 다시 읽습니다.
  //    늦게 도착한 이전 응답이 새 응답을 덮지 않도록 `살아있음` 으로 막습니다.
  useEffect(() => {
    if (!signedIn) return;
    let 살아있음 = true;
    Promise.all([
      planService.listPlans(),
      // 주의: 실패를 빈 목록으로 두면 「일정이 없습니다」로 읽혀 마감을 놓칠 수 있습니다.
      planService.listSchedules().catch((e: unknown) => {
        console.warn("[CHECKUMAIT] 백엔드에서 일정을 읽지 못했습니다.", e);
        return null;
      }),
    ]).then(
      ([planRows, scheduleRows]) => {
        if (!살아있음) return;
        setPlans(planRows);
        setSchedules(scheduleRows ?? []);
        set일정실패(scheduleRows === null);
        set자료받음(true);
      },
    );
    return () => {
      살아있음 = false;
    };
  }, [signedIn]);

  useEffect(() => {
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
  /**
   * 주의: '새로 만든' 일정을 서버에 등록합니다 (2026-09-05 연동).
   *
   *    그동안 사용자가 추가한 일정은 화면에만 있고 새로고침하면 사라졌습니다.
   *    서버에는 `POST /api/plans/{id}/tasks` 가 이미 있었는데 부르는 곳이 없었습니다.
   *
   * 주의: 낙관적으로 먼저 그립니다. 서버가 task_id 를 주면 화면의 임시 id 를 그 값으로
   *    교체합니다 — 안 하면 그 일정의 '상태 변경' 이 계속 저장되지 않습니다
   *    (`일정상태저장()` 은 숫자 id 만 서버 항목으로 봅니다).
   */
  const 일정추가하기 = (새항목: ScheduleItem[], 완료문구?: string) => {
    if (!새항목.length) return;
    // 주의: 날짜 미정으로 이미 받은 할일에 날짜를 넣는 경우 같은 줄이 둘이 되지 않게 바꿔 끼웁니다.
    const 있는할일 = new Set(새항목.map((s) => s.taskId).filter(Boolean));
    setSchedules((이전) => [...이전.filter((s) => !s.taskId || !있는할일.has(s.taskId)), ...새항목]);
    void 일정등록(새항목).then(({ 바뀐id, 실패, 건너뜀, 로그인필요, 저장못함 }) => {
      if (바뀐id.size || 저장못함.size) {
        // 주의: 서버에 남지 않은 일정을 화면에 두면 저장된 줄로 보입니다. 빼고 사유를 알립니다.
        setSchedules((이전) =>
          이전
            .filter((s) => !저장못함.has(s.id))
            .map((s) => {
              const 서버id = 바뀐id.get(s.id);
              if (!서버id) return s;
              // 주의: 이미 있던 할일에 날짜를 넣은 줄은 출처를 모릅니다. 새로 읽을 때까지 점검 일정처럼 다룹니다.
              return s.taskId ? { ...s, id: 서버id } : { ...s, id: 서버id, taskId: 서버id, 출처: "user" as const };
            }),
        );
      }
      if (로그인필요) notify("로그인하면 일정이 서버에 저장됩니다. 로그인한 뒤 다시 추가해 주세요.");
      else if (실패) notify("일정을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      else if (API켜짐() && 건너뜀) notify(화면에만반영);
      else if (완료문구) notify(완료문구);
      for (const id of new Set(새항목.map((s) => s.planId))) 단계다시읽기(id);
    });
  };

  /**
   * 「날짜 미정」 줄에 날짜를 넣습니다. 먼저 그리고, 저장에 실패하면 되돌립니다.
   * 서버 할일이 아닌 일정(예시 모드)은 지금 화면 값만 바꿉니다.
   */
  const 일정날짜저장 = (item: ScheduleItem, 날짜: string) => {
    const 이전 = schedules;
    const 다음 = schedules.map((s) => (s.id === item.id ? { ...s, date: 날짜 } : s));
    setSchedules(다음);
    void planService.saveSchedules(다음);
    if (!API켜짐() || !item.taskId) {
      notify(API켜짐() ? 화면에만반영 : "날짜를 정했습니다.");
      return;
    }
    일정수정(item.taskId, { due_date: 날짜 })
      .then(() => notify("날짜를 정했습니다."))
      .catch((e: unknown) => {
        setSchedules(이전);
        notify(`날짜를 저장하지 못했습니다. ${오류사유(e)}`);
      });
  };

  /** 일정을 지웁니다. 먼저 빼고, 서버가 거절하면 되돌립니다. */
  const 일정지우기하기 = (item: ScheduleItem) => {
    const 이전 = schedules;
    const 다음 = schedules.filter((s) => s.id !== item.id);
    setSchedules(다음);
    void planService.saveSchedules(다음);
    void 일정지우기(item)
      .then(() => {
        notify("일정을 삭제했습니다.");
        단계다시읽기(item.planId);
      })
      .catch((e: unknown) => {
        setSchedules(이전);
        notify(`일정을 삭제하지 못했습니다. ${오류사유(e)}`);
      });
  };

  /**
   * 예상 지출일을 바꿉니다. 옮길 일정이 있으면 먼저 묻고, 없으면 바로 저장합니다.
   * 주의: 판정이 예상 지출일을 읽습니다(프로필의 협약 기간 밖이면 코드 불가). 이미 점검한 계획의 날짜가 바뀌면
   *    옛 판정이 새 날짜와 맞지 않으므로 「재점검 필요」를 띄웁니다(`지출일저장`).
   */
  const [지출일창, set지출일창] = useState<{ plan: ExpensePlan; 새날짜: string; 줄들: ScheduleItem[] } | null>(null);
  /** 일정·체크가 바뀐 뒤 진행 단계를 다시 받습니다. 단계는 서버가 할일에서 계산합니다. */
  const 단계다시읽기 = (planId: string) => {
    if (!API켜짐() || !/^\d+$/.test(planId)) return;
    계획상세(planId)
      .then((d) =>
        setPlans((이전) =>
          이전.map((p) => (p.id === planId ? { ...p, 단계요약: d.단계요약, 현재단계: d.현재단계 ?? null } : p)),
        ),
      )
      .catch((e: unknown) => console.warn("[CHECKUMAIT] 진행 단계를 다시 읽지 못했습니다.", e));
  };
  /** 저장이 끝난 뒤 일정을 다시 읽습니다. 저장은 이미 됐으므로 읽기 실패는 저장 실패가 아닙니다. */
  const 일정다시읽기 = () => {
    void planService
      .listSchedules()
      .then(setSchedules)
      .catch((e: unknown) => console.warn("[CHECKUMAIT] 일정을 다시 읽지 못했습니다.", e));
  };
  /** 실제 지출을 서버에 저장합니다. 집행 단계가 완료로 바뀌므로 일정도 다시 읽습니다. */
  const 실제지출저장 = (plan: ExpensePlan, 날짜: string, 금액: number): Promise<void> =>
    계획수정(plan.id, { 실제지출일: 날짜, 실제지출액: 금액 }).then((d) => {
      계획반영({
        ...plan,
        actualDate: 날짜,
        actualAmount: 금액,
        executionStatus: "결제 완료",
        단계요약: d.단계요약,
        현재단계: d.현재단계 ?? null,
      });
      일정다시읽기();
    });
  const 지출일저장 = (plan: ExpensePlan, 새날짜: string, 일정이동: boolean, 옮길일정있음: boolean) => {
    계획수정(plan.id, { 집행예정일: 새날짜 || null, 일정이동 })
      .then((d) => {
        const 새지출일 = d.집행예정일 ?? "";
        // 주의: 점검한 계획의 날짜가 실제로 바뀐 경우만입니다. 점검 전 · 점검 중 · 이미 재점검 필요인 계획은 그대로 둡니다.
        //    표시 방식은 계획을 고쳤을 때와 같습니다(`previousStatus` 에 옛 판정 상태를 남깁니다).
        const 재점검 = 새지출일 !== (plan.plannedDate ?? "") && 점검한상태(plan.status);
        계획반영({
          ...plan,
          plannedDate: 새지출일,
          ...(재점검 ? { status: "재점검 필요" as const, previousStatus: plan.status as Exclude<PlanStatus, "점검 전" | "점검 중" | "재점검 필요">, nextAction: "AI 재점검 필요" } : {}),
          단계요약: d.단계요약,
          현재단계: d.현재단계 ?? null,
        });
        notify(
          `${일정이동 && 옮길일정있음 ? "예상 지출일과 연결된 일정을 옮겼습니다." : "예상 지출일을 저장했습니다."}${
            재점검 ? " 점검에 쓰이는 날짜라 AI 재점검이 필요합니다." : ""
          }`,
        );
        일정다시읽기();
      })
      .catch((e: unknown) => notify(`예상 지출일을 저장하지 못했습니다. ${오류사유(e)}`));
  };
  const 지출일변경 = (plan: ExpensePlan, 새날짜: string) => {
    const 줄들 = schedules.filter(
      (s) => s.planId === plan.id && !!s.date && s.state !== "완료" && !s.지출일연동,
    );
    if (plan.plannedDate && 새날짜 && 줄들.length) {
      set지출일창({ plan, 새날짜, 줄들 });
      return;
    }
    지출일저장(plan, 새날짜, true, false);
  };

  const persistSchedules = (next: ScheduleItem[]) => {
    const 이전 = schedules;
    setSchedules(next);
    void planService.saveSchedules(next);
    // 주의: 집행 일정은 그동안 '어디에도' 저장되지 않았습니다 — 완료 체크가 새로고침하면
    //    사라졌습니다. 서버에서 온 일정(숫자 id)은 이제 상태를 진짜로 저장합니다.
    void 일정변경저장(이전, next).then(({ 실패, 없음 }) => {
      if (실패.length) {
        setSchedules(이전);
        notify("일정을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
      if (없음.length) {
        notify("일부 일정은 서버에 없어 이 화면에서만 바뀝니다.");
      }
      // 주의: 일정 유형과 상태가 진행 단계를 정합니다. 바뀐 줄의 계획만 다시 받습니다.
      const 전 = new Map(이전.map((s) => [s.id, s]));
      const 바뀐계획 = next.filter((s) => 전.has(s.id) && 전.get(s.id) !== s).map((s) => s.planId);
      for (const id of new Set(바뀐계획)) 단계다시읽기(id);
    });
  };
  /**
   * 주의: 상세의 체크박스와 집행 일정의 완료 체크를 '한 몸' 으로 묶습니다.
   *
   *    둘은 사실 같은 것(서버 `plan_tasks` 한 행)인데 화면 상태가 둘로 갈려 있어서,
   *    한쪽에서 체크해도 다른 쪽은 그대로였습니다. 이제 어느 쪽을 눌러도 두 화면이
   *    같이 바뀌고, 서버에는 '한 번만' 저장합니다.
   *
   *    `taskId` 가 이어주는 키입니다 — 상세에서 「일정에 추가」로 만든 일정과
   *    서버에서 받아온 일정 둘 다 이 값을 가집니다. 사용자가 직접 만든 일정에는
   *    없으므로 그런 건 예전처럼 화면 안에서만 움직입니다.
   */
  const 할일동기화 = (planId: string, taskId: string, 완료: boolean) => {
    // 주의: 증빙 파일 업로드가 끝난 뒤에도 불립니다. 그때의 값을 읽어야 그동안 바뀐 체크·판정을 덮지 않습니다.
    const 이전계획 = 계획Ref.current;
    const 이전일정 = 일정Ref.current;

    const 다음계획 = 이전계획.map((p) => {
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

    const 다음일정 = 이전일정.map((s) =>
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

    계획Ref.current = 다음계획;
    일정Ref.current = 다음일정;
    setPlans(다음계획);
    setSchedules(다음일정);
    void planService.savePlans(다음계획);
    void planService.saveSchedules(다음일정);

    // 주의: 서버 저장은 '한 번' 입니다 — 두 화면이 각자 PATCH 하면 경합합니다.
    체크저장(planId, taskId, 완료)
      .then((결과) => {
        if (결과 === "저장됨") 단계다시읽기(planId);
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

  const deletePlan = (ids: string | string[]) => {
    const targets = Array.isArray(ids) ? ids : [ids];
    if (!plans.some((plan) => plan.id === targets[0])) return false;
    if (targets.some(점검중인가)) {
      notify("점검 중인 지출 계획은 점검이 끝난 뒤 삭제할 수 있습니다.");
      return false;
    }

    // 주의: 2026-09-07 — 여기가 **서버를 안 부르고 있었습니다.** localStorage 만 고치고
    //    "삭제했습니다" 라고 알렸는데, 새로고침하면 계획이 '다시 나타났습니다'.
    //    화면과 서버가 갈라지는 유형이고(L3 업로드에서도 같은 일이 있었습니다),
    //    사용자에게는 잘못된 안내가 됩니다. `DELETE /api/plans/{id}`(v26)를 부릅니다.
    //
    //    주의: 시그니처를 `boolean` 그대로 둡니다 — 호출부 두 곳(`remove` prop)이 동기
    //    boolean 을 기대합니다. 타입을 바꾸면 그 경로 전체를 손대야 하고, 지금은
    //    '위험을 최소로' 가는 게 맞습니다(책임자 지시). 그래서 화면은 먼저 지우고,
    //    서버가 실패하면 '되돌립니다' — 낙관적 삭제 + 롤백.
    const 이전계획 = plans;
    const 이전일정 = schedules;
    persistPlans(plans.filter((plan) => !targets.includes(plan.id)));
    persistSchedules(schedules.filter((item) => !targets.includes(item.planId)));

    if (!API켜짐()) {
      notify("지출 계획과 연결된 일정을 삭제했습니다.");
      return true;
    }

    // 주의: 2026-09-07 — 서버에 '있는' 계획만 서버에 지운다. 샘플 계획(`mock-data` 의
    //    "mentoring" 같은 문자열 id)은 localStorage 에만 있어서 서버가 422 를 돌려줬고,
    //    그 한 건 때문에 '같이 고른 진짜 계획까지 전부 되돌려' "삭제하지 못했습니다" 가 났다
    //    (운영 서버 로그 01:00:36 `DELETE /api/plans/mentoring → 422`). 서버 id 는 숫자다.
    const 서버대상 = targets.filter((id) => /^\d+$/.test(String(id)));
    if (서버대상.length === 0) {
      notify("지출 계획과 연결된 일정을 삭제했습니다.");
      return true;
    }
    Promise.allSettled(서버대상.map((id) => 계획삭제(id)))
      .then((결과들) => {
        // 404 는 '이미 없다' 는 뜻이라 실패로 치지 않습니다(서버가 남의 org 도 404 로
        // 숨깁니다 — `lib/api.ts::계획삭제` 주석 참고).
        // 주의: 상태코드는 'Error 의 status 필드' 로 봅니다. 문자열에서 "404" 를 찾으면
        //    안 됩니다 — detail 이 있으면 메시지에 숫자가 안 들어갑니다.
        const 실패 = 결과들.filter(
          (r) =>
            r.status === "rejected" &&
            (r as PromiseRejectedResult).reason?.status !== 404,
        );
        if (실패.length === 0) {
          const 할일 = 결과들.reduce(
            (합, r) => 합 + (r.status === "fulfilled" ? (r.value?.할일삭제 ?? 0) : 0),
            0,
          );
          notify(
            할일 > 0
              ? `지출 계획을 삭제했습니다. 확인 항목 ${할일}건도 함께 삭제됐습니다.`
              : "지출 계획을 삭제했습니다.",
          );
          return;
        }
        // 주의: 하나라도 서버에서 못 지웠으면 '화면을 되돌립니다'. 안 그러면 사라진 것처럼
        //    보이다가 새로고침하면 다시 나타나 같은 잘못된 안내가 반복됩니다.
        persistPlans(이전계획);
        persistSchedules(이전일정);
        notify(
          실패.length === targets.length
            ? "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : `${targets.length}건 중 ${실패.length}건을 삭제하지 못해 되돌렸습니다.`,
        );
      });
    return true;
  };

  if (세션확인중) return null;
  if (!signedIn)
    return (
      <Login
        이어가기={온보딩이어가기}
        재설정={재설정}
        onEnter={(destination) => {
          window.sessionStorage.setItem("checkumait-signed-in", "true");
          // 주의: 안 내리면 로그아웃했을 때 로그인 화면 대신 온보딩이 다시 뜹니다.
          set온보딩이어가기(false);
          set재설정(null);
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
          {/* 2026-09-07 — GPU 상태 배지를 제거했습니다. 판정이 Qwen API 를 사용해
              자체 GPU 를 쓰지 않으므로 GPU 서버 상태는 사용자에게 보여줄 정보가 아닙니다.
              배지 컴포넌트와 `/api/gpu/status` 호출 함수도 함께 삭제했습니다(서버에서 엔드포인트 제거). */}
          <section className="project-mini">
            <span>{데모기관 ? "둘러보기" : "참여 중인 프로젝트"}</span>
            <b>{사업}</b>
            {/* 주의: 데모 세션은 '누를 때마다 새 기관' 입니다. 고정 표기되면 안 됩니다.
                로그인 사용자는 온보딩에서 고른 기관과 실제 협약 종료일을 씁니다. */}
            <small>
              {데모기관 ??
                `${기관}${디데이표기(협약.종료일) && !(협약.예시 && API켜짐()) ? ` · ${디데이표기(협약.종료일)}` : ""}`}
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
                    데모종료();                        // 주의: 안 지우면 다음 사람이 그 기관으로 들어갑니다
                  이메일잊기();
                  초안전부지우기();                  // 주의: 다음 사람이 앞사람의 문의 글을 보면 안 됩니다
                  협약잊기();                        // 주의: 다음 계정이 앞 계정의 협약을 자기 기관에 저장하게 됩니다
                    // 주의: 비우지 않으면 다음 계정이 응답을 받기 전까지 앞 계정의 계획을 봅니다.
                    setPlans(API켜짐() ? [] : INITIAL_PLANS);
                    setSchedules([]);
                    작업바꾸기(() => []);
                    set자료받음(false);
                    set일정실패(false);
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
      <main className={`main-area ${점검화면중 ? "is-judging" : ""}`}>
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
                  "써도돼요"}
            </span>
          </div>
        </header>
        {/* 주의: 지금 보이는 자료가 '서버 것이 아닐 때' 만 뜹니다. 정상이면 아무것도
            안 그립니다 — 잘 되는 날 배너가 있으면 그게 더 나쁩니다. */}
        <DataSourceBanner />
        {/* 판정 중인 작업. 펼친 작업은 페이지 자리에 그려지고(`.judge-run`), 접은 작업과 끝난 작업은 오른쪽 아래 알림입니다. */}
        {작업들.map((작업, 순번) =>
          작업.결과 ? (
            <aside
              key={작업.키}
              className={`judge-pill ${작업.결과.오류 || 작업.결과.저장안됨 ? "failed" : "done"}`}
              role="status"
              style={{ bottom: 20 + 파일높이 * 순번 }}
            >
              <Icon name={작업.결과.오류 || 작업.결과.저장안됨 ? "alert" : "check"} size={18} />
              <span>
                <b>{작업.계획.name}</b>
                <small title={작업.결과.오류}>
                  {작업.결과.오류
                    ? `점검 실패 · ${작업.결과.오류}`
                    : 작업.결과.저장안됨
                      ? "결과가 저장되지 않았어요. 다시 점검해 주세요."
                      : "AI 점검이 끝났어요."}
                </small>
              </span>
              <button
                onClick={() => {
                  작업바꾸기((이전) => 이전.filter((j) => j.키 !== 작업.키));
                  go({ page: "plan-detail", id: 작업.계획.id });
                }}
              >
                {작업.결과.오류 ? "계획 보기" : "결과 보기"}
              </button>
              <button
                aria-label="알림 닫기"
                onClick={() => 작업바꾸기((이전) => 이전.filter((j) => j.키 !== 작업.키))}
              >
                ×
              </button>
            </aside>
          ) : (
            <AiCheckingOverlay
              key={작업.키}
              count={작업.count}
              planId={작업.planId}
              제목={작업.제목}
              대체입력={작업.대체입력}
              답변={작업.답변}
              질문세트={작업.질문세트}
              추가입력값={작업.추가입력값}
              확정세목={작업.확정세목}
              부가세구분={작업.부가세구분}
              조사ID={작업.조사ID}
              조사답변={작업.조사답변}
              이전진행={작업.이전진행}
              이름={작업.계획.name}
              순번={순번}
              최소화={작업.최소화}
              접기={() => {
                작업바꾸기((이전) => 이전.map((j) => (j.키 === 작업.키 ? { ...j, 최소화: true, 접은적: true } : j)));
                // 작성 화면은 이미 제출이 끝났으므로 남아 있으면 같은 내용을 또 낼 수 있습니다.
                if (route.page === "plan-new") go({ page: "plans" });
              }}
              펼치기={() => 작업바꾸기((이전) => 이전.map((j) => (j.키 === 작업.키 ? { ...j, 최소화: false } : j)))}
              onComplete={(판정된계획, 기록) => 판정끝(작업.키, 판정된계획, undefined, 기록)}
              onFail={(메시지, 기록) => 판정끝(작업.키, undefined, 메시지, 기록)}
            />
          ),
        )}
        {route.page === "home" && (
          <HomePage plans={화면계획} schedules={schedules} go={go} 자료받음={자료받음} 일정실패={일정실패} />
        )}
        {route.page === "plans" && (
          <PlansPage
            plans={화면계획}
            판정시작={판정시작}
            지출일변경={지출일변경}
            schedules={schedules}
            go={go}
            자료받음={자료받음}
            notify={notify}
            remove={deletePlan}
            확인={확인}
            update={계획반영}
          />
        )}
        {route.page === "plan-new" && (
          <NewPlanPage
            판정시작={판정시작}
            notify={notify}
            save={(plan, temporary, 점검오류) => {
              계획반영(plan);
              // 지출일이 있는 계획은 서버가 집행 줄을 만들므로 일정도 다시 읽습니다.
              if (API켜짐()) void planService.listSchedules().then(setSchedules).catch(() => undefined);
              if (temporary) {
                go({ page: "plans" });
                notify("지출 계획을 임시저장했습니다.");
              } else if (점검오류) {
                // 주의: 계획은 서버에 저장됐지만 판정은 실패했습니다. 「점검 완료」라고 하면
                //    사용자는 결과가 있다고 믿고 넘어갑니다.
                go({ page: "plan-detail", id: plan.id });
                notify(`지출 계획은 저장했지만 AI 점검을 마치지 못했습니다. ${점검오류}`);
              } else if (plan.저장안됨) {
                // 주의: 서버 장애의 판단불가는 오류가 아니라 정상 응답으로 옵니다.
                go({ page: "plan-detail", id: plan.id });
                notify("지출 계획은 저장했지만 점검 결과는 저장되지 않았습니다. 다시 점검해 주세요.");
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
            plan={화면계획.find((plan) => plan.id === route.id)}
            작업내역={판정기록들[route.id]}
            allPlans={화면계획}
            판정시작={판정시작}
            update={계획반영}
            지출일변경={지출일변경}
            실제지출저장={실제지출저장}
            확인={확인}
            addSchedules={(items) => 일정추가하기(items)}
            할일동기화={할일동기화}
            기준문서보기={() => {
              go({ page: "rules" });
              window.setTimeout(() => document.getElementById("institution-criteria")?.scrollIntoView({ block: "center" }), 400);
            }}
            remove={() => {
              const target = plans.find((plan) => plan.id === route.id);
              if (!target) return;
              void 확인(계획삭제문구(target.name)).then((확인함) => {
                if (확인함 && deletePlan(target.id)) go({ page: "plans" });
              });
            }}
            back={() => go({ page: "plans" })}
            notify={notify}
          />
        )}
        {챗봇_켬 && route.page === "ai-chat" && <AiChat plans={plans} />}
        {route.page === "schedule" && (
          <SchedulePage
            확인={확인}
            plans={plans}
            schedules={schedules}
            자료받음={자료받음}
            일정실패={일정실패}
            save={persistSchedules}
            추가={(item) => 일정추가하기([item], "일정을 저장했습니다.")}
            지우기={일정지우기하기}
            날짜저장={일정날짜저장}
            할일동기화={할일동기화}
            notify={notify}
          />
        )}
        {route.page === "rules" && <MyPage notify={notify} 확인={확인} 계획수={plans.length} />}
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
      {확인대기 && (
        <ConfirmDialog
          요청={확인대기}
          답={(확인함) => {
            확인대기.끝(확인함);
            set확인대기(null);
          }}
        />
      )}
      {지출일창 && (
        <지출일변경창
          {...지출일창}
          닫기={() => set지출일창(null)}
          저장={(일정이동) => {
            지출일저장(지출일창.plan, 지출일창.새날짜, 일정이동, true);
            set지출일창(null);
          }}
        />
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

const 시연이메일 = "prototype@ssudo.kr";

function Login({
  onEnter,
  이어가기,
  재설정,
}: {
  onEnter: (destination: "home" | "plan-new") => void;
  이어가기: boolean;
  재설정: "재설정" | "만료" | null;
}) {
  const [로그인중, set로그인중] = useState(false);
  const [로그인오류, set로그인오류] = useState<string | null>(null);
  const [step, setStep] = useState<
    "welcome" | "signup" | "forgot" | "reset" | "project" | "institution" | "upload" | "ready"
  >(재설정 === "재설정" ? "reset" : 재설정 === "만료" ? "forgot" : 이어가기 ? "project" : "welcome");
  const [찾기이메일, set찾기이메일] = useState("");
  const [찾기상태, set찾기상태] = useState<"입력" | "보내는중" | "보냄">("입력");
  const [찾기오류, set찾기오류] = useState<string | null>(
    재설정 === "만료" ? "재설정 링크가 만료되었거나 이미 사용되었습니다. 메일을 다시 받아 주세요." : null,
  );
  const [새비번, set새비번] = useState({ 비밀번호: "", 확인: "" });
  const [새비번저장중, set새비번저장중] = useState(false);
  const [새비번오류, set새비번오류] = useState<string | null>(null);
  const [변경완료, set변경완료] = useState(false);
  // 다음 로그인부터 온보딩을 건너뛰도록 계정에 남깁니다. 「설정 완료」로 가는 길이 여럿이라 여기서 받습니다.
  useEffect(() => {
    if (step === "ready") void 온보딩마침(선택사업(), 선택기관());
  }, [step]);
  const [program, setProgram] = useState(선택사업);
  const [서버사업, set서버사업] = useState<string[] | null>(null);
  const [institutionQuery, setInstitutionQuery] = useState("");
  // 주의: 주관기관은 서버(`GET /api/orgs`)가 기준 데이터입니다. 예전에는 화면에 1건이 하드코딩되어 있어서
  //    검색도 수정도 안 됐습니다. 서버가 안 되면 예비 1건으로 조용히 내려갑니다.
  //
  // 주의: **빈 목록으로 시작합니다** (2026-09-06). 전에는 초기값이 `[예비기관]` 이라
  //    2단계에 들어서는 순간 「경상국립대학교 창업중심대학사업단」 카드가 한 장
  //    표시되었다가, 250ms 뒤 검색 결과가 도착하면 실제 목록으로 교체됐습니다
  //    — 어느 사업을 골랐든 경상국립대가 먼저 잠깐 보였습니다.
  //    예비 목록은 '서버가 안 될 때' 쓰라고 만든 것이지 첫 렌더링용이 아닙니다.
  //    `기관검색()` 이 실패하면 지금도 `[예비기관]` 을 돌려주므로 그 길은 그대로입니다.
  const [기관목록, set기관목록] = useState<기관[]>([]);
  //
  // 주의: '찾는 중' 으로 시작합니다. 빈 목록 + 찾는중=false 로 시작하면 이번엔 한 프레임 동안
  //    「일치하는 곳이 없습니다」가 번쩍입니다(아래 렌더 두 줄이 그 조합을 그립니다).
  //    2단계에 들어서는 순간 어차피 검색이 시작되므로, 처음부터 그렇게 말합니다.
  const [기관찾는중, set기관찾는중] = useState(true);
  /** 주의: 고른 사업으로 걸렀더니 0건이라 필터를 풀었는가. 그러면 화면이 말해야 합니다. */
  const [사업필터해제, set사업필터해제] = useState(false);
  const [institution, setInstitution] = useState("");
  /**
   * 주의: 고른 기관의 slug. '이름이 아니라 이것' 이 서버가 기관을 되찾는 키입니다
   *    — 「경상국립대학교」·「경상국립대학교 창업지원단」·「…창업중심대학사업단」이
   *    같이 있어서 이름으로 되찾으면 다른 기관에 붙습니다.
   *    「다음」을 누르면 이 값으로 계정을 등록합니다 (`lib/orgs.ts::계정등록`).
   */
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [기관등록중, set기관등록중] = useState(false);
  const [기관등록오류, set기관등록오류] = useState<string | null>(null);
  /** 이미 다른 기관에 등록된 계정일 때 다음 단계에서 보여 줄 안내입니다. */
  const [소속안내, set소속안내] = useState("");
  /** 계정이 속한 기관에 지금 적용 중인 기준 문서의 파일명. 없으면 "" 입니다. */
  const [기관문서, set기관문서] = useState("");
  /**
   * 고른 기관에 계정을 등록하고 다음 단계로 갑니다.
   *
   * 주의: 등록이 안 되면 이 단계에 머뭅니다. 넘어가면 기준 문서 업로드와 그 뒤 API 가 전부 403 입니다.
   *    Supabase·서버 주소 설정 전에는 등록할 대상이 없으므로 예전처럼 넘어갑니다.
   */
  const 기관등록하기 = async () => {
    set기관등록오류(null);
    set소속안내("");
    if (!인증켜짐 || !API켜짐()) {
      기관저장(institution, institutionSlug);
      setStep("upload");
      return;
    }
    if (!institutionSlug) {
      set기관등록오류("기관 목록을 서버에서 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }
    set기관등록중(true);
    try {
      const 등록 = await 계정등록(institutionSlug);
      기관저장(등록.기관명, 등록.slug);
      setInstitution(등록.기관명);
      setInstitutionSlug(등록.slug);
      setInstitutionQuery(등록.기관명);
      if (등록.slug !== institutionSlug) {
        set소속안내(`이 계정은 이미 ${등록.기관명} 소속이라 이 기관 기준으로 진행합니다.`);
      }
      // 조회에 실패해도 업로드는 할 수 있으니 넘어갑니다. 문서가 있다고 지어내지 않습니다.
      const 현재 = await L3현재문서목록().catch(() => null);
      set기관문서(
        현재?.문서.find((d) => d.파싱품질 === "pass" || d.파싱품질 === "warn")?.원본파일명 ?? "",
      );
      setStep("upload");
    } catch (e: unknown) {
      set기관등록오류(
        e instanceof TypeError
          ? "서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요."
          : e instanceof Error
            ? e.message
            : "계정을 등록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      set기관등록중(false);
    }
  };
  /**
   * 주의: 이번에 고른 파일 이름입니다. 기관에 이미 등록된 문서는 여기서 불러오지 않고,
   *    "이미 적재된 파일"을 지어내지도 않으므로 빈 값으로 시작합니다.
   */
  const [criteriaFile, setCriteriaFile] = useState("");
  /* 주의: 2026-09-07 — 여기가 '파일 이름만' 들고 있었습니다. `File` 이 없으니 업로드할
     방법 자체가 없었고, 화면엔 체크가 표시되어 '등록됐다' 로 보였습니다. 운영 서버
     `tenant.l3_documents` 최신 행이 9월 3일자인 걸로 확인했습니다 — 온보딩에서
     올린 문서는 '한 번도' 서버에 간 적이 없습니다.
     마이페이지 「교체하기」에서 고친 것과 '같은 결함이 다른 자리에' 하나 더 있었습니다. */
  const [criteriaBlob, setCriteriaBlob] = useState<File | null>(null);
  // 주의: 드래그로 파일을 얹는 동안만 true — 테두리를 바꿔 '여기 놓으면 된다' 를 보입니다.
  const [기준파일드래그중, set기준파일드래그중] = useState(false);
  const [기준파싱중, set기준파싱중] = useState(false);
  const [기준파싱문구, set기준파싱문구] = useState("");
  /** 기준 문서를 읽지 못했을 때 띄우는 창의 내용. 사용자가 닫거나 다시 올릴 때까지 둡니다. */
  const [기준실패, set기준실패] = useState<L3실패 | null>(null);
  /** 세부기준이 맞는지 물어야 하는 문서. */
  const [기준확인, set기준확인] = useState<L3확인 | null>(null);
  /** 「초대 코드가 있어요」 입력. null 이면 칸을 접어 둡니다. */
  const [초대코드, set초대코드] = useState<string | null>(null);
  const [초대오류, set초대오류] = useState("");
  const [초대처리중, set초대처리중] = useState(false);
  /** 초대 코드로 등록합니다. 기관과 사업은 팀의 것이므로 고르는 단계를 건너뜁니다. */
  const 초대코드로시작 = async () => {
    if (!초대코드?.trim() || 초대처리중) return;
    set초대처리중(true);
    set초대오류("");
    try {
      const r = await 초대코드등록(초대코드.trim());
      사업저장(r.사업명);
      setProgram(r.사업명);
      기관저장(r.기관명, r.slug);
      setInstitution(r.기관명);
      setInstitutionSlug(r.slug);
      // 기관 세부기준은 기관 단위라 팀의 기관에 이미 있을 수 있습니다. 다음 화면 문구가 사실과 맞게 읽어 둡니다.
      const 현재 = await L3현재문서목록().catch(() => null);
      set기관문서(현재?.문서.find((d) => d.파싱품질 === "pass" || d.파싱품질 === "warn")?.원본파일명 ?? "");
      setStep("ready");
    } catch (e) {
      set초대오류(오류사유(e));
    } finally {
      set초대처리중(false);
    }
  };
  /** 기준 문서 칸 아래에 띄우는 안내(형식이 맞지 않음, 쓰지 않은 문서 등). */
  const [기준안내, set기준안내] = useState("");
  /** 서버가 다 읽어 판정 기준에 반영했는가 / 2분이 지나도 아직 읽는 중인가. */
  const [기준반영됨, set기준반영됨] = useState(false);
  const [기준처리중, set기준처리중] = useState(false);
  /**
   * 온보딩 기준 문서 올리기 — 업로드한 뒤 서버가 다 읽을 때까지 기다려 결과대로 갈립니다.
   *
   * 주의: 2026-11-03 — 예전엔 202(접수) 응답만 보고 다음 단계로 넘어가서, 읽지 못한 문서도
   *    등록된 것처럼 보였고 업로드 오류는 1.8초 뒤 사라졌습니다. 이제 실패하면 실패 창을 띄우고
   *    이 단계에 머뭅니다. 기준 문서는 선택사항이라 창에서 「건너뛰고 계속」으로 넘어갈 수 있습니다.
   *    실패한 파일은 선택에서 비웁니다 — 남겨 두면 「설정 완료」가 같은 파일을 또 올립니다.
   */
  const 기준문서올리기 = async (파일: File) => {
    set기준실패(null);
    set기준반영됨(false);
    set기준처리중(false);
    set기준파싱중(true);
    set기준파싱문구("");
    const 결과 = await 기준문서처리(파일);
    if (결과.종류 === "실패") {
      set기준파싱중(false);
      setCriteriaBlob(null);
      setCriteriaFile("");
      set기준실패(결과.실패);
      return;
    }
    if (결과.종류 === "확인") {
      set기준파싱중(false);
      set기준확인(결과.확인);
      return;
    }
    // 완료면 읽은 조 수를, 2분이 지나도 읽는 중이면 서버 안내("끝날 때까지는 기존 규정으로 판정")를
    // 보여 주고 넘어갑니다. 읽는 중인 문서를 '반영됨' 으로 그리지 않습니다(다음 화면 문구도 나뉩니다).
    const 완료 = 결과.종류 === "완료";
    set기준반영됨(완료);
    set기준처리중(!완료);
    set기준파싱문구(
      완료
        ? L3등록사실(결과.결과.조_건수, 결과.결과.파싱품질, 결과.결과.추출방식)
        : 결과.결과.메시지 || "문서를 아직 읽고 있습니다. 끝나면 마이페이지에서 결과를 확인할 수 있습니다.",
    );
    await new Promise((resolve) => setTimeout(resolve, 완료 ? 900 : 2400));
    set기준파싱중(false);
    setStep("ready");
  };
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const 비밀번호칸 = useRef<HTMLInputElement>(null);
  /**
   * 회원가입. 가입을 마치면 온보딩 1단계로 이어지고, 입력한 이메일·팀 이름은 이 탭이
   *    기억해 사이드바·마이페이지에 그대로 보입니다.
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

  // 주의: 사업 목록은 `/api/programs` 가 기준 데이터입니다 (「2026 」 접두사 없이 옵니다).
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

  // 주의: 입력할 때마다 서버에 요청하지 않도록 250ms 기다립니다. 온보딩 2단계에서만 동작합니다.
  //
  // 주의: '1단계에서 고른 사업' 으로 거릅니다. 전에는 전체 420건이 그대로 나와서,
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
     주의: 온보딩과 '같은 레이아웃'(setup-shell → setup-content)를 씁니다. 다만 4단계
        스테퍼는 안 붙입니다 — 가입은 그 4단계 밖이고, 붙이면 「1/4」가 두 번
        도는 것처럼 보입니다. 대신 위쪽에 가입 → 설정 흐름을 한 줄로 말합니다. */
  if (step === "forgot") {
    const 보내기 = async () => {
      set찾기상태("보내는중");
      set찾기오류(null);
      try {
        await 재설정메일보내기(찾기이메일);
        set찾기상태("보냄");
      } catch (e: unknown) {
        set찾기상태("입력");
        set찾기오류(e instanceof Error ? e.message : "메일을 보내지 못했습니다.");
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
        <section className="recovery-page">
          <h1>비밀번호 찾기</h1>
          <p>가입한 이메일을 입력해 주세요. 비밀번호를 다시 정할 수 있는 링크를 보내 드립니다.</p>
          <form
            className="recovery-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (찾기이메일.trim().includes("@") && 찾기상태 !== "보내는중") void 보내기();
            }}
          >
            <section className="recovery-note">
              <b>안내</b>
              <ul>
                <li>가입할 때 쓴 이메일로 재설정 메일을 보내 드립니다.</li>
                <li>메일의 링크를 누르면 새 비밀번호를 정할 수 있습니다.</li>
                <li>링크는 일정 시간이 지나면 만료되니 받은 뒤 바로 진행해 주세요.</li>
              </ul>
            </section>
            <label>
              <span>이메일</span>
              <input
                type="email"
                value={찾기이메일}
                onChange={(e) => {
                  set찾기이메일(e.target.value);
                  set찾기상태("입력");
                }}
                placeholder="가입한 이메일을 입력하세요"
                autoComplete="email"
              />
            </label>
            {찾기오류 && <p className="recovery-message error" role="alert"><Icon name="alert" size={16} />{찾기오류}</p>}
            {찾기상태 === "보냄" && (
              <p className="recovery-message success" role="status">
                <Icon name="check" size={16} />
                입력한 주소로 가입된 계정이 있으면 재설정 메일을 보냈습니다. 메일이 오지 않으면 스팸함을 확인해 주세요.
              </p>
            )}
            <button
              type="submit"
              className="primary large"
              disabled={!찾기이메일.trim().includes("@") || 찾기상태 === "보내는중"}
            >
              {찾기상태 === "보내는중" ? "보내는 중…" : 찾기상태 === "보냄" ? "메일 다시 보내기" : "재설정 메일 보내기"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (step === "reset") {
    const 길이맞음 = 새비번.비밀번호.length >= 8;
    const 일치함 = 새비번.확인.length > 0 && 새비번.비밀번호 === 새비번.확인;
    const 그만두기 = async () => {
      await 재설정끝내기();
      setStep("welcome");
    };
    const 저장하기 = async () => {
      set새비번저장중(true);
      set새비번오류(null);
      try {
        await 새비밀번호저장(새비번.비밀번호);
        await 재설정끝내기();
        set변경완료(true);
        setStep("welcome");
      } catch (e: unknown) {
        set새비번오류(e instanceof Error ? e.message : "비밀번호를 바꾸지 못했습니다.");
      } finally {
        set새비번저장중(false);
      }
    };
    return (
      <main className="onboarding-setup">
        <header className="onboarding-nav">
          <div className="login-brand static">
            <BrandWord />
          </div>
          <button className="outline" disabled={새비번저장중} onClick={() => void 그만두기()}>
            로그인으로
          </button>
        </header>
        <section className="recovery-page">
          <h1>비밀번호 재설정</h1>
          <p>새 비밀번호를 정해 주세요. 변경하면 새 비밀번호로 다시 로그인합니다.</p>
          <form
            className="recovery-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (길이맞음 && 일치함 && !새비번저장중) void 저장하기();
            }}
          >
            <section className="recovery-note">
              <b>유의사항</b>
              <ul className="recovery-rules">
                <li className={길이맞음 ? "met" : undefined}>
                  <Icon name="check" size={14} />
                  8자 이상으로 만들어 주세요.
                </li>
                <li className={일치함 ? "met" : undefined}>
                  <Icon name="check" size={14} />
                  두 칸에 같은 비밀번호를 입력해 주세요.
                </li>
                <li className="hint">
                  이전과 다른 비밀번호를 써 주세요. 영문과 숫자를 섞으면 더 안전합니다.
                </li>
              </ul>
            </section>
            <label>
              <span>새 비밀번호</span>
              <input
                type="password"
                value={새비번.비밀번호}
                onChange={(e) => set새비번((v) => ({ ...v, 비밀번호: e.target.value }))}
                placeholder="8자 이상"
                autoComplete="new-password"
                aria-invalid={새비번.비밀번호.length > 0 && !길이맞음}
              />
              {새비번.비밀번호.length > 0 && !길이맞음 && <small>8자 이상으로 입력해 주세요.</small>}
            </label>
            <label>
              <span>새 비밀번호 확인</span>
              <input
                type="password"
                value={새비번.확인}
                onChange={(e) => set새비번((v) => ({ ...v, 확인: e.target.value }))}
                placeholder="다시 한 번 입력하세요"
                autoComplete="new-password"
                aria-invalid={새비번.확인.length > 0 && !일치함}
              />
              {새비번.확인.length > 0 && !일치함 && <small>비밀번호가 서로 다릅니다.</small>}
            </label>
            {새비번오류 && <p className="recovery-message error" role="alert"><Icon name="alert" size={16} />{새비번오류}</p>}
            <button
              type="submit"
              className="primary large"
              disabled={!길이맞음 || !일치함 || 새비번저장중}
            >
              {새비번저장중 ? "변경 중…" : "비밀번호 변경"}
            </button>
          </form>
        </section>
      </main>
    );
  }

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
     * 주의: **가입은 두 단계입니다.**
     *      ① Supabase 계정 생성            ← 여기서 합니다
     *      ② 우리 서버에 (이메일 → 기관) 등록 ← 온보딩의 기관 선택에서 합니다 (`기관등록하기`)
     *    ②가 끝나기 전에는 서버가 403 「등록되지 않은 계정입니다」를 냅니다.
     *
     * 주의: Supabase 설정 전(인증켜짐=false)에는 예전처럼 '통과' 시킵니다. 설정이
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
          // 계정은 생겼지만 세션이 없습니다 — 다음 화면으로 보내면 전부 게스트로 동작합니다.
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

              {/* 주의: 판정에 필요 없는 개인 식별 정보는 '입력 칸 자체를 만들지 않습니다'.
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
          <span className="onboarding-login-note">회원가입 후 초기 설정이 진행됩니다.</span>
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
                // 주의: Supabase 설정이 없으면 예전처럼 '통과' 시킵니다.
                //    설정 전에 배포돼도 시연이 막히지 않게.
                if (!인증켜짐) {
                  이메일기억(loginEmail);   // 주의: Supabase 에 안 남으므로 화면용으로만 기억
                  setStep("project");
                  return;
                }
                set로그인중(true);
                set로그인오류(null);
                try {
                  await supabase로그인(loginEmail, loginPassword);
                  이메일기억(loginEmail);
                  // 주의: 2026-09-07 — 로그인 직후 GPU 서버 기동 요청을 제거했습니다.
                  //    판정이 Qwen API 로 바뀌어 GPU 가 필요 없는데, 로그인할 때마다
                  //    중지해 둔 GPU 서버를 기동하려 했습니다(`오늘_깨움` 카운터 증가로 확인).
                  //    책임자가 재기동을 금지한 서버라 실제 비용이 발생합니다.
                  //    기동 요청 함수(`GPU깨우기`)와 상태 조회 함수도 `lib/api.ts` 에서 삭제했습니다.
                  const 필요 = await 온보딩기록적용();
                  // 시연 계정은 온보딩까지 보여 주어야 해서 매번 거칩니다.
                  if (필요 || loginEmail.trim().toLowerCase() === 시연이메일) setStep("project");
                  else onEnter("home");
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
                    ref={비밀번호칸}
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                  />
                </label>
                {인증켜짐 && (
                  <button
                    type="button"
                    className="login-forgot-link"
                    onClick={() => {
                      set찾기이메일(loginEmail);
                      set찾기상태("입력");
                      set찾기오류(null);
                      set변경완료(false);
                      setStep("forgot");
                    }}
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                )}
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
              {변경완료 && !로그인오류 && (
                <small className="login-success" role="status">비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.</small>
              )}
              <small>계정이 없으신가요? 회원가입 후 참여 사업과 주관기관을 설정하면 바로 이용할 수 있습니다.</small>
              {/* 주의: 비밀번호는 코드에 넣지 않습니다. 시연 때 직접 입력합니다. */}
              <button
                type="button"
                className="onboarding-demo-link"
                onClick={() => {
                  setLoginEmail(시연이메일);
                  setLoginPassword("");
                  set로그인오류(null);
                  비밀번호칸.current?.focus();
                }}
              >
                시연용 계정으로 접근하기
              </button>
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
              {API켜짐() && (
                <div className="onboarding-invite">
                  {초대코드 === null ? (
                    <button type="button" className="text-button" onClick={() => set초대코드("")}>
                      팀원에게 받은 초대 코드가 있어요
                    </button>
                  ) : (
                    <>
                      <label>
                        초대 코드
                        <input
                          value={초대코드}
                          autoFocus
                          maxLength={20}
                          placeholder="예: ABCD-2345"
                          onChange={(e) => set초대코드(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="outline"
                        disabled={!초대코드.trim() || 초대처리중}
                        onClick={() => void 초대코드로시작()}
                      >
                        {초대처리중 ? "확인 중…" : "이 팀으로 시작"}
                      </button>
                      <small role={초대오류 ? "alert" : undefined}>
                        {초대오류 || "팀의 사업과 주관기관으로 바로 시작합니다."}
                      </small>
                    </>
                  )}
                </div>
              )}
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
                    // 주의: 여기서 고른 사업이 이후 비목 조회·계획 저장·AI 점검에 그대로 쓰입니다.
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
              {/* 주의: 그 사업으로 등록된 기관이 서버에 아직 없으면 목록을 비우지 않고
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
                      // 주의: 이름을 지우면 slug 도 같이 버립니다. 안 버리면 A 기관을
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
                      // 주의: 고른 것을 다시 누르면 해제합니다. 잘못 골랐을 때
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
              <p className="onboarding-notice">
                처음 등록하는 계정은 고른 기관으로 등록되고, 등록한 뒤에는 화면에서 바꿀 수 없습니다.
                이미 등록된 계정은 기존 기관으로 진행합니다.
              </p>
              {기관등록오류 && (
                <p className="onboarding-notice" role="alert" style={{ color: "var(--red, #c23b3b)" }}>
                  {기관등록오류}
                </p>
              )}
              <div className="onboarding-actions">
                <button
                  className="outline large"
                  disabled={기관등록중}
                  onClick={() => setStep("project")}
                >
                  이전
                </button>
                <button
                  className="primary large"
                  disabled={!institution || 기관등록중}
                  onClick={() => void 기관등록하기()}
                >
                  {기관등록중 ? "등록 중…" : "다음"}
                </button>
              </div>
            </>
          )}
          {step === "upload" && (
            <>
              <p className="login-kicker">기관 세부기준 등록</p>
              <h1>주관기관의 세부기준을 확인해주세요.</h1>
              <p>
                주관기관의 세부기준 문서를 올려 주세요. 같은 기관 계정은 이 문서를 함께
                씁니다. 올리지 않아도 다음 단계로 넘어갈 수 있습니다.
              </p>
              {소속안내 && (
                <p className="onboarding-filter-notice">
                  <span>ⓘ</span>
                  {소속안내}
                </p>
              )}
              {기관문서 && (
                <p className="onboarding-filter-notice">
                  <span>ⓘ</span>
                  이 기관에는 「{기관문서}」이(가) 적용 중입니다. 새 문서를 읽고 나면 같은 기관의 모든 계정이 새 문서를 기준으로 판정받습니다.
                </p>
              )}
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
                    {criteriaFile || 기관문서
                      ? "사업 공통 규정 + 기관 세부기준"
                      : "사업 공통 규정"}
                  </dd>
                </div>
              </dl>
              {/* 주의: 2026-09-07 — 드래그&드롭을 받습니다. `<label>` 이 이미 파일 입력을
                  감싸고 있어서 여기에 추가하면 클릭 경로와 '같은 상태' 로 들어갑니다
                  (파일을 두 군데서 따로 들고 있지 않습니다).
                  `onDragOver` 에서 preventDefault 를 '반드시' 해야 drop 이 발생합니다 —
                  안 하면 브라우저가 파일을 새 탭으로 열어버려 온보딩 진행 상태가 전부 사라집니다. */}
              <label
                className={`criteria-upload ${criteriaFile ? "complete" : ""} ${
                  기준파일드래그중 ? "dragging" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!기준파일드래그중) set기준파일드래그중(true);
                }}
                onDragLeave={(e) => {
                  // 자식 요소로 옮겨갈 때도 dragleave 가 뜹니다 — 라벨 '밖' 으로 나갈 때만 끕니다.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) set기준파일드래그중(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  set기준파일드래그중(false);
                  const f = e.dataTransfer.files?.[0] ?? null;
                  if (!f) return;
                  // 클릭 경로의 accept 와 '같은 규칙' 을 여기서도 겁니다. 드롭은 accept 를
                  // 안 거치므로 .docx 를 추가하면 서버가 415 로 거부합니다 — 미리 막습니다.
                  if (!/\.(pdf|hwp|hwpx)$/i.test(f.name)) {
                    // 이 화면에는 `notify` 가 없어 칸 아래 안내 자리에 띄웁니다.
                    set기준안내("PDF·HWP·HWPX 파일만 올릴 수 있습니다.");
                    return;
                  }
                  set기준안내("");
                  setCriteriaBlob(f);
                  setCriteriaFile(f.name);
                }}
              >
                <input
                  type="file"
                  /* 주의: 서버가 .doc·.docx 를 415 로 '거부' 합니다 (파서가 없습니다).
                     고를 수 있게 두면 반드시 실패하는 선택지를 주는 셈입니다.
                     `routes_l3.py` 허용_확장자 = {pdf, hwpx, hwp} */
                  accept=".pdf,.hwp,.hwpx"
                  onChange={(event) => {
                    const f = event.target.files?.[0] ?? null;
                    set기준안내("");
                    setCriteriaBlob(f);
                    setCriteriaFile(f?.name || "");
                  }}
                />
                <span className="criteria-icon">
                  <Icon name={criteriaFile ? "check" : "plus"} size={19} />
                </span>
                <span>
                  <b>{criteriaFile || "기관 세부기준 파일 선택"}</b>
                  <small>
                    {!criteriaBlob
                      ? "선택사항 · 끌어다 놓아도 됩니다 · PDF, HWP, HWPX · 최대 30MB"
                      : "업로드할 파일을 선택했습니다."}
                  </small>
                </span>
                <em>{criteriaFile ? "파일 변경" : "파일 찾기"}</em>
              </label>
              {/* 주의: 2026-11-03 — 기관당 기준 문서는 하나입니다. 서버가 새 문서를 읽으면 바로
                  그 문서로 판정하고, 읽지 못하면 기존 문서를 계속 씁니다(백엔드 `l3_parse.적용문서_정리`).
                  예전 문구 「기관 검토 후 반영」은 실제로 없는 절차였습니다. */}
              <p className="onboarding-notice" role={기준안내 ? "alert" : undefined}>
                {기준안내 ||
                  (!criteriaBlob
                    ? "등록한 문서는 기관별 금액 기준, 사전승인·심의 조건, 필요 증빙 판단에 사용됩니다."
                    : "세부기준 문서가 맞으면 읽은 뒤 바로 이 문서로 판정합니다. 맞는지 불확실하면 먼저 묻고, 읽지 못하면 기존 문서를 계속 씁니다.")}
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
                  disabled={기준파싱중}
                  onClick={async () => {
                    /* 주의: 파일을 '안 골랐으면' 예전과 똑같이 그냥 넘어갑니다 —
                       기준 문서 등록은 선택사항입니다(위 안내 문구). */
                    if (!criteriaBlob) {
                      setStep("ready");
                      return;
                    }
                    await 기준문서올리기(criteriaBlob);
                  }}
                >
                  {기준파싱중 ? "등록 중…" : "설정 완료"}
                </button>
              </div>
            </>
          )}
          {기준파싱중 && <L3읽는중 파일명={criteriaFile} 문구={기준파싱문구} 반영됨={기준반영됨} />}
          {기준확인 && (
            <L3확인창
              확인={기준확인}
              닫기={() => {
                set기준확인(null);
                setCriteriaBlob(null);
                setCriteriaFile("");
                set기준안내("아직 쓰지 않은 문서입니다. 설정을 마친 뒤 마이페이지에서 고를 수 있습니다.");
              }}
              적용={() => {
                set기준확인(null);
                set기준반영됨(true);
                setStep("ready");
              }}
              거절={() => {
                set기준확인(null);
                setCriteriaBlob(null);
                setCriteriaFile("");
                set기준안내("이 문서는 쓰지 않습니다. 다른 문서를 고르거나 그대로 설정을 마칠 수 있습니다.");
              }}
            />
          )}
          {기준실패 && (
            <L3실패창
              실패={기준실패}
              닫기={() => set기준실패(null)}
              넘어가기={{
                문구: "건너뛰고 계속",
                동작: () => {
                  set기준실패(null);
                  setStep("ready");
                },
              }}
              다시올리기={(파일) => {
                setCriteriaBlob(파일);
                setCriteriaFile(파일.name);
                void 기준문서올리기(파일);
              }}
            />
          )}
          {step === "ready" && (
            <>
              <p className="login-kicker">설정 완료</p>
              {/* 주의: 조사가 바뀝니다 — 「써도돼요」는 모음(ㅛ)으로 끝나서 '을' 이 아니라
                  '를' 입니다. 이름만 교체하면 「써도돼요을」이 됩니다. */}
              <h1>준비됐어요. 써도돼요를 둘러볼까요?</h1>
              <p>
                선택한 사업 기준으로 초기 설정을 완료했습니다. 지출 계획을 작성하면{" "}
                {(criteriaFile && !기준처리중) || 기관문서
                  ? "사업 공통 규정과 기관 세부기준을 함께"
                  : "우선 사업 공통 규정을 기준으로"}{" "}
                확인합니다.
                {/* 주의: 2분이 지나도 서버가 읽는 중이면 아직 판정에 쓰이지 않습니다 — 반영된 것처럼 말하지 않습니다. */}
                {기준처리중 && " 올린 기관 세부기준은 다 읽은 뒤 반영되며, 결과는 마이페이지에서 확인할 수 있습니다."}
              </p>
              <div className="ready-project">
                <Icon name="check" size={20} />
                <span>
                  <b>{program}</b>
                  {/* 주의: 사용자가 파일을 바꿔도 판정에 적용되는 것은 기존 문서입니다.
                      2026-09-07 — 게스트 상태에서 「지금 적용 중인 파일」을 지어내지
                      않습니다(고른 적 없으면 안 보여줍니다). */}
                  <small>
                    {institution}
                    {criteriaFile ? ` · ${criteriaFile}${기준처리중 ? " (읽는 중)" : ""}` : ""}
                  </small>
                </span>
              </div>
              <div className="onboarding-demo-notice">
                <Icon name="fileSearch" size={18} />
                <span>
                  <b>이제 지출 계획을 점검할 수 있어요.</b>
                  <small>작성한 지출 계획과 연결된 집행 일정은 홈에서 확인할 수 있습니다.</small>
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

/** 「1,200만」 처럼 만 원 단위로 줄입니다. 만 원 미만은 원 단위 그대로. */
function 만원표기(n: number): string {
  return Math.abs(n) >= 10000 ? `${Math.round(n / 10000).toLocaleString("ko-KR")}만` : won(n);
}

/** 오늘이 든 주의 월요일~일요일 (YYYY-MM-DD, 현지 시간). */
function 이번주날짜(오늘: string): string[] {
  const [y, m, d] = 오늘.split("-").map(Number);
  const 기준 = new Date(y, m - 1, d);
  기준.setDate(d - ((기준.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const n = new Date(기준.getFullYear(), 기준.getMonth(), 기준.getDate() + i);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
}

type 홈할일 = { 제목: string; 설명: string; 종류: "late" | "risk" | "soon" | "warn"; 이동: AppRoute };

/**
 * v032: 배너에 올릴 할 일 순서. 기한 지남 → 불가 지출 → 가까운 마감 → 확인 필요 지출.
 *    배너는 맨 앞 하나만 크게 보이고, 나머지는 「그다음」 한 줄과 개수로만 알립니다.
 */
function 홈할일목록(plans: ExpensePlan[], schedules: ScheduleItem[], 오늘: string): 홈할일[] {
  const 계획이름 = (id: string) => plans.find((p) => p.id === id)?.name;
  const 남은일정 = schedules
    .filter((s) => s.state !== "완료" && !!s.date)
    .sort((x, y) => x.date.localeCompare(y.date));
  const 일정할일 = (s: ScheduleItem, 종류: "late" | "soon"): 홈할일 => ({
    제목: 계획이름(s.planId) ? `${계획이름(s.planId)} — ${s.title}` : s.title,
    설명: 종류 === "late" ? `${월일표기(s.date)} 기한이 지났어요` : `${월일표기(s.date)}까지 · ${s.type}`,
    종류,
    이동: { page: "schedule" },
  });
  const 계획할일 = (p: ExpensePlan, 종류: "risk" | "warn"): 홈할일 => ({
    제목: `${p.name} — ${displayPlanStatus(p.status)}`,
    설명:
      종류 === "risk"
        ? "사업비로 집행할 수 없어요. 계획을 바꾸거나 삭제하세요."
        : p.status === "재점검 필요"
          ? "수정한 내용으로 다시 점검해야 해요."
          : p.nextAction || "결제 전에 확인할 조건이 있어요.",
    종류,
    이동: { page: "plan-detail", id: p.id },
  });
  return [
    ...남은일정.filter((s) => s.date < 오늘).map((s) => 일정할일(s, "late")),
    ...plans.filter((p) => p.status === "위험").map((p) => 계획할일(p, "risk")),
    ...남은일정.filter((s) => s.date >= 오늘).map((s) => 일정할일(s, "soon")),
    ...plans.filter((p) => p.status === "확인 필요" || p.status === "재점검 필요").map((p) => 계획할일(p, "warn")),
  ];
}

function HomePage({
  plans,
  schedules,
  go,
  자료받음,
  일정실패,
}: {
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  go: (route: AppRoute) => void;
  /** 계획·일정 응답을 받았는가. 받기 전에 「할 일이 없습니다」라고 하면 틀린 말입니다. */
  자료받음: boolean;
  일정실패: boolean;
}) {
  const 사업 = use사업();
  const 기관 = use기관();
  const 협약 = use협약();
  const 팀이름 = use팀이름();
  // 주의: 사용자가 입력한 협약이 없으면 남은 기간·예산을 말할 수 없습니다(예시 모드는 시연용으로 보여 줍니다).
  const 협약있음 = !(협약.예시 && API켜짐());
  const 남음 = 협약있음 ? 디데이표기(협약.종료일) : "";
  const 오늘 = 오늘날짜();
  const 할일 = 홈할일목록(plans, schedules, 오늘);
  const [첫할일, 다음할일] = 할일;

  // 사업비: 총액 = 정부지원 + 자기부담 현금(현물은 돈이 나가지 않아 뺍니다).
  //    집행 완료 = 실제 지출을 등록한 계획, 계획 중 = 아직 결제 전인 계획(불가 판정은 쓸 수 없는 돈이라 뺍니다).
  const 총액 = 협약있음 ? 협약.정부지원 + 협약.자기부담 : 0;
  const 집행 = plans
    .filter((p) => p.executionStatus === "결제 완료")
    .reduce((합, p) => 합 + (p.actualAmount || p.amount), 0);
  const 계획 = plans
    .filter((p) => p.executionStatus !== "결제 완료" && p.status !== "위험")
    .reduce((합, p) => 합 + p.amount, 0);
  const 남은예산 = 총액 - 집행 - 계획;
  const 비율 = (n: number) => (총액 > 0 ? Math.min(100, Math.max(0, (n / 총액) * 100)) : 0);
  const 집행비율 = 비율(집행);
  const 계획끝 = Math.min(100, 집행비율 + 비율(계획));

  const 확인할지출 = plans
    .filter((p) => p.status === "위험" || p.status === "확인 필요" || p.status === "재점검 필요")
    .sort(
      (a, b) =>
        Number(b.status === "위험") - Number(a.status === "위험") ||
        b.updatedAt.localeCompare(a.updatedAt, "ko"),
    );
  const 불가수 = 확인할지출.filter((p) => p.status === "위험").length;

  const 주간 = 이번주날짜(오늘);
  const 요일 = ["월", "화", "수", "목", "금", "토", "일"];
  const 남은일정 = schedules.filter((s) => s.state !== "완료" && !!s.date);

  return (
    <div className="page home-v4">
      <header className="home-v4-head">
        <div>
          <h1>안녕하세요, {팀이름 || "체쿠메이트"}님</h1>
          <p>
            {사업} · {기관}
          </p>
        </div>
        <button className="primary" onClick={() => go({ page: "plan-new" })}>
          <Icon name="plus" />새 지출 계획
        </button>
      </header>

      {/* ① 지금 할 일 — 하나만 크게. 부담을 줄이려고 나머지는 개수로만 알립니다. */}
      <section className={`home-v4-next ${자료받음 && !첫할일 ? "is-clear" : ""}`}>
        <div>
          <small>{!자료받음 ? "불러오는 중" : 첫할일 ? "지금 하나만 하면 돼요" : "할 일이 없어요"}</small>
          <h2>{!자료받음 ? "할 일을 확인하고 있어요." : 첫할일 ? 첫할일.제목 : "모두 준비됐어요"}</h2>
          <p>
            {!자료받음
              ? "잠시만 기다려 주세요."
              : 첫할일
                ? 첫할일.설명
                : "새 지출이 생기면 결제 전에 AI 점검부터 받아 보세요."}
          </p>
          {다음할일 && (
            <div className="home-v4-next-sub">
              <span>
                그다음: <b>{다음할일.제목}</b>
              </span>
              <span>
                남은 할 일 <b>{할일.length}개</b>
              </span>
            </div>
          )}
        </div>
        {자료받음 && (
          <button onClick={() => go(첫할일 ? 첫할일.이동 : { page: "plan-new" })}>
            {첫할일 ? "시작하기" : "새 지출 계획"} <Icon name="arrow" size={16} />
          </button>
        )}
      </section>

      {/* ② 이번 주 — 월~일. 지난 날에 남은 일정은 빨간색(기한 지남). */}
      <section className="home-v4-week-wrap">
        <header>
          <h2>이번 주</h2>
          <button className="text-button" onClick={() => go({ page: "schedule" })}>
            캘린더 <Icon name="arrow" size={15} />
          </button>
        </header>
        {일정실패 ? (
          <p className="schedule-detail-empty">일정을 불러오지 못했습니다. 새로고침해 주세요.</p>
        ) : (
          <div className="home-v4-week">
            {주간.map((날, i) => {
              const 그날 = 남은일정.filter((s) => s.date === 날);
              return (
                <button
                  key={날}
                  className={`home-v4-day ${날 === 오늘 ? "is-today" : ""}`}
                  onClick={() => go({ page: "schedule" })}
                >
                  <span className="home-v4-day-head">
                    {요일[i]}
                    {날 === 오늘 && " · 오늘"}
                    <b>{Number(날.slice(8))}</b>
                  </span>
                  {그날.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      title={s.title}
                      className={`home-v4-ev ${날 < 오늘 ? "late" : s.state === "준비 필요" ? "need" : "plan"}`}
                    >
                      {날 < 오늘 && "지남 · "}
                      {s.title}
                    </span>
                  ))}
                  {그날.length > 3 && <small>+{그날.length - 3}개</small>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="home-v4-bottom">
        {/* ③ 사업비 현황 — 협약 금액이 있어야 그릴 수 있습니다. */}
        <section className="home-v4-card home-v4-budget">
          <header>
            <h2>사업비 현황</h2>
            {총액 > 0 && <span>총 {만원표기(총액)}원</span>}
          </header>
          {총액 > 0 ? (
            <div className="home-v4-chart">
              <div
                className="home-v4-donut"
                style={{
                  background: `conic-gradient(var(--brand) 0 ${집행비율}%, #8cc3b3 ${집행비율}% ${계획끝}%, #eef0ef ${계획끝}% 100%)`,
                }}
              >
                <div>
                  <small>{남은예산 < 0 ? "예산 초과" : "남은 예산"}</small>
                  <b>{만원표기(Math.abs(남은예산))}</b>
                  <small>{남은예산 < 0 ? "계획을 줄여 주세요" : `${Math.round(비율(남은예산))}%`}</small>
                </div>
              </div>
              <ul>
                <li>
                  <i className="spent" />
                  집행 완료<b>{만원표기(집행)}</b>
                </li>
                <li>
                  <i className="planned" />
                  계획 중<b>{만원표기(계획)}</b>
                </li>
                <li>
                  <i />
                  남은 예산<b>{만원표기(Math.max(0, 남은예산))}</b>
                </li>
              </ul>
            </div>
          ) : (
            <div className="home-v4-budget-empty">
              <p>협약 금액을 입력하면 남은 예산을 보여 드려요.</p>
              <button className="outline small" onClick={() => go({ page: "rules" })}>
                마이페이지에서 입력
              </button>
            </div>
          )}
          {남음 && (
            <div className="home-v4-dday">
              <span>{남음 === "종료" ? "협약 상태" : "사업 종료까지"}</span>
              <b>{남음}</b>
            </div>
          )}
        </section>

        {/* ④ 확인할 지출 — 날짜가 없어 이번 주 칸에 안 나오는 지출도 여기서 보입니다. */}
        <section className="home-v4-card home-v4-attention">
          <header>
            <h2>확인할 지출</h2>
            <span>
              {확인할지출.length > 0 && (
                <small>
                  {불가수 > 0 && `${displayPlanStatus("위험")} ${불가수} · `}확인 필요 {확인할지출.length - 불가수}
                </small>
              )}
              <button className="text-button" onClick={() => go({ page: "plans" })}>
                전체 보기 <Icon name="arrow" size={15} />
              </button>
            </span>
          </header>
          {!자료받음 ? (
            <p className="schedule-detail-empty">지출 계획을 불러오는 중입니다.</p>
          ) : 확인할지출.length === 0 ? (
            <p className="schedule-detail-empty">확인이 필요한 지출이 없어요.</p>
          ) : (
            확인할지출.slice(0, 4).map((plan) => (
              <button key={plan.id} className="home-v4-row" onClick={() => go({ page: "plan-detail", id: plan.id })}>
                <span className="home-v4-row-text">
                  <b>{plan.name}</b>
                  <small>
                    {(plan.status === "위험" ? plan.aiSummary : plan.nextAction || plan.aiSummary) || plan.category}
                    {" · "}
                    {won(plan.amount)}
                  </small>
                </span>
                <Status value={plan.status} />
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

/** 다른 탭을 보고 있을 때 탭 제목으로 알리고, 돌아오면 되돌립니다. */
function 탭제목알림(제목: string) {
  if (!document.hidden) return;
  const 원래제목 = document.title;
  document.title = 제목;
  const 돌아옴 = () => {
    if (document.hidden) return;
    document.title = 원래제목;
    document.removeEventListener("visibilitychange", 돌아옴);
  };
  document.addEventListener("visibilitychange", 돌아옴);
}

/** 접은 판정 표시 한 줄의 높이. 여러 건이면 위로 쌓습니다. */
const 파일높이 = 66;

/** 서버 진행 상태 → 화면 글자. 서버가 보내는 값은 진행중 · 완료 · 실패 · 건너뜀입니다. */
const 상태표기: Record<string, string> = { 진행중: "진행 중", 완료: "완료", 실패: "실패", 건너뜀: "건너뜀" };

function 초표기(ms: number): string {
  const 초 = Math.max(0, Math.floor(ms / 1000));
  return 초 < 60 ? `${초}초` : `${Math.floor(초 / 60)}분 ${초 % 60}초`;
}

/** 켜져 있는 동안 1초마다 다시 그려 경과 시간을 올립니다. */
function use지금(켜짐: boolean): number {
  const [지금, set지금] = useState(() => Date.now());
  useEffect(() => {
    if (!켜짐) return;
    const 타이머 = window.setInterval(() => set지금(Date.now()), 1000);
    return () => window.clearInterval(타이머);
  }, [켜짐]);
  return 지금;
}

/** 가장 늦게 받은 작업. 한 줄 요약은 이 작업의 문장입니다. */
function 최근항목(항목들: 진행항목[]): 진행항목 | null {
  return 항목들.reduce<진행항목 | null>((a, b) => (!a || (b.갱신 ?? 0) >= (a.갱신 ?? 0) ? b : a), null);
}

/** 출처 사이트 이름. 서버는 `제목` 에 호스트 이름을 넣습니다. 없으면 주소에서 뽑습니다. */
function 사이트이름(출처: { 제목: string; url: string }): string {
  if (출처.제목 && 출처.제목 !== 출처.url) return 출처.제목;
  try {
    return new URL(출처.url).hostname.replace(/^www\./, "");
  } catch {
    return 출처.제목 || 출처.url;
  }
}

/**
 * 서버가 보낸 작업 이벤트를 한 줄 요약 + 펼치는 목록으로 보여 줍니다(판정 · 공개 검색 · 확인 질문 공통).
 * 주의: 이벤트를 지어내지 않습니다. 받은 것이 없으면 `기본문장` 한 줄만 보입니다.
 */
function 작업로그({
  항목들,
  진행중,
  시작,
  끝,
  기본문장,
  끝문장,
  실패,
  펼침기본 = false,
  className = "",
  앞단계이름 = "앞 단계",
  이번단계이름 = "이번 작업",
}: {
  항목들: 진행항목[];
  진행중: boolean;
  /** 이 작업을 시작한 시각(ms). 이보다 먼저 받은 항목(앞 단계 기록)에는 걸린 시간을 적지 않습니다. */
  시작?: number;
  /** 끝난 시각(ms). 없으면 마지막으로 받은 시각입니다. */
  끝?: number;
  /** 아직 받은 이벤트가 없을 때의 한 줄 */
  기본문장: string;
  /** 끝났을 때의 한 줄. 없으면 마지막으로 받은 문장 */
  끝문장?: string;
  /** 있으면 실패로 그립니다. 사용자에게 보이는 문장이어야 합니다. */
  실패?: string;
  펼침기본?: boolean;
  className?: string;
  /** `시작` 전에 받은 항목(예: 판정 전 공개 검색)과 이번 작업 항목을 나눠 보일 때의 소제목 */
  앞단계이름?: string;
  이번단계이름?: string;
}) {
  const [펼침, set펼침] = useState(펼침기본);
  const 지금 = use지금(진행중);
  const 목록id = useId();
  const 목록Ref = useRef<HTMLOListElement>(null);
  // 진행 중에는 새 작업이 보이도록 목록 끝으로 내립니다.
  useEffect(() => {
    if (진행중 && 펼침 && 목록Ref.current) 목록Ref.current.scrollTop = 목록Ref.current.scrollHeight;
  }, [진행중, 펼침, 항목들]);
  const 앞단계수 = 시작 ? 항목들.filter((v) => v.처음 !== undefined && v.처음 < 시작).length : 0;
  const 나눔 = 앞단계수 > 0 && 앞단계수 < 항목들.length;
  const 최근 = 최근항목(항목들);
  const 한줄 = 실패 ?? (진행중 ? (최근?.문장 ?? 기본문장) : (끝문장 ?? 최근?.문장 ?? 기본문장));
  const 마지막 = 끝 ?? Math.max(0, ...항목들.map((v) => v.갱신 ?? 0));
  const 경과 = 시작 ? 초표기((진행중 ? 지금 : 마지막 || 시작) - 시작) : "";
  const 걸린시간 = (v: 진행항목) => {
    if (!v.처음 || (시작 && v.처음 < 시작)) return "";
    const ms = (v.상태 === "진행중" && 진행중 ? 지금 : (v.갱신 ?? v.처음)) - v.처음;
    return ms >= 1000 ? 초표기(ms) : "";
  };
  return (
    <div className={`work-log ${진행중 ? "is-running" : 실패 ? "is-failed" : "is-done"} ${className}`}>
      <p className="sr-only" aria-live={실패 ? "assertive" : "polite"}>{한줄}</p>
      <button type="button" className="work-log-head" aria-expanded={펼침} aria-controls={목록id} onClick={() => set펼침((v) => !v)}>
        <span className="work-log-mark" aria-hidden="true">
          {진행중 ? <span className="work-log-spinner" /> : <Icon name={실패 ? "alert" : "check"} size={16} />}
        </span>
        <span className="work-log-line">{한줄}</span>
        {경과 && <span className="work-log-time">{경과}</span>}
        <span className="work-log-toggle">
          {펼침 ? "접기" : 진행중 ? "자세히" : "작업 내역 보기"}
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      {펼침 && (
        <ol id={목록id} ref={목록Ref} className="work-log-list">
          {!항목들.length && <li className="is-empty">아직 받은 작업 내역이 없어요.</li>}
          {항목들.flatMap((v, i) => {
            const 소제목 = 나눔 && (i === 0 || i === 앞단계수)
              ? [<li key={`구분-${i}`} className="work-log-divider" aria-hidden="true">{i === 0 ? 앞단계이름 : 이번단계이름}</li>]
              : [];
            // 끝난 기록에 남은 「진행중」은 끝나기 전에 멈춘 작업입니다. 계속 도는 것처럼 그리지 않습니다.
            const 종류 = v.상태 in 상태표기 ? (v.상태 === "진행중" && !진행중 ? "멈춤" : v.상태) : 진행중 ? "진행중" : "멈춤";
            const 시간 = 걸린시간(v);
            return [...소제목, (
              <li key={v.id} className={`is-${종류}`}>
                <span className="work-log-icon" aria-hidden="true">
                  {종류 === "진행중" ? <span className="work-log-spinner" /> : 종류 === "완료" ? <Icon name="check" size={14} /> : 종류 === "실패" ? <Icon name="alert" size={14} /> : <i />}
                </span>
                <span className="work-log-text">
                  {v.문장}
                  <span className="sr-only"> ({종류 === "멈춤" ? "끝나기 전에 멈춤" : 상태표기[종류]})</span>
                  {!!v.출처.length && (
                    <span className="work-log-sources">
                      {v.출처.map((c, i) => (
                        <a key={i} href={c.url} target="_blank" rel="noopener noreferrer">{사이트이름(c)}</a>
                      ))}
                    </span>
                  )}
                </span>
                {시간 && <span className="work-log-time">{시간}</span>}
              </li>
            )];
          })}
        </ol>
      )}
    </div>
  );
}

/** 이벤트를 목록에 넣습니다. 같은 id 는 새 상태로 바꾸고, 받은 시각을 붙여 걸린 시간을 셉니다. */
function 진행추가(이전: 진행항목[], 항목: 진행항목): 진행항목[] {
  const 지금 = Date.now();
  const 위치 = 이전.findIndex((v) => v.id === 항목.id);
  if (위치 < 0) return [...이전, { ...항목, 처음: 지금, 갱신: 지금 }];
  return 이전.map((v, i) => (i === 위치 ? { ...항목, 처음: v.처음 ?? 지금, 갱신: 지금 } : v));
}

/** 공개 정보 유형(서버 `web_research.KINDS`) → 화면 이름. 모르는 값은 그대로 내보내지 않습니다. */
const 조사유형이름: Record<string, string> = {
  제품성격: "제품·서비스 성격",
  판매자: "판매자 정보",
  공개등록: "사업자 공개 등록",
  결제안내: "결제 방법 안내",
  통화: "결제 통화",
  가격: "가격",
  증빙안내: "증빙 발급 안내",
  업체이용조건: "업체 이용 조건",
};
const 유형표기 = (유형: string) => 조사유형이름[유형] ?? "공개 정보";

/** 페이지 발췌를 화면용 글로 바꿉니다. 마크다운 기호만 지우고 글자는 바꾸지 않습니다(서버의 발췌 값은 그대로 둡니다). */
function 발췌글(글: string): string {
  return 글
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\r?\n/)
    .map((줄) => 줄.replace(/^\s*(?:#{1,6}|[-*+>]|\d+\.)\s+/, "").replace(/[*_`|~]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * 검색으로 찾은 후보 한 건. 서버가 다듬은 확인 문장(`질문`)을 크게 보이고, 출처 사이트와 원문 발췌는 「출처 보기」로 엽니다.
 * 주의: `질문` 은 화면 표시용이고 판정에는 발췌와 답만 갑니다. 기본 문장(`질문종류`=기본)이거나 옛 서버라 `질문` 이 없으면
 *    발췌를 바로 보여 줍니다 — 무엇을 확인하는지 알 수 있어야 답할 수 있습니다.
 */
function 조사카드({ 항목, children }: { 항목: 조사후보 & { 답?: string; 정정?: string }; children?: React.ReactNode }) {
  const [출처열림, set출처열림] = useState(false);
  const 출처id = useId();
  const 출처들 = (항목.출처 ?? []).filter((c) => /^https?:\/\//i.test(c.url));
  const 인용 = 발췌글(출처들.find((c) => c.발췌)?.발췌 || 항목.내용 || "");
  const 질문 = 항목.질문?.trim();
  const 발췌바로 = !질문 || 항목.질문종류 === "기본";
  const 사이트 = (
    <span className="research-sites">
      {출처들.map((c, i) => (
        <a key={i} className="research-source" href={c.url} target="_blank" rel="noopener noreferrer">
          <span className="research-favicon" aria-hidden="true">{사이트이름(c).slice(0, 1).toUpperCase()}</span>
          {사이트이름(c)}
          <span className="sr-only"> (새 창에서 열기)</span>
        </a>
      ))}
      {!출처들.length && <span className="research-source is-missing">출처 주소 없음</span>}
    </span>
  );
  return (
    <article className="research-card">
      <span className="research-kind">{유형표기(항목.유형)}</span>
      {질문 && <p className="research-question">{질문}</p>}
      {발췌바로 ? (
        <>
          {사이트}
          {인용 && <blockquote>{인용}</blockquote>}
        </>
      ) : (
        <>
          <button type="button" className="research-source-toggle" aria-expanded={출처열림} aria-controls={출처id} onClick={() => set출처열림((v) => !v)}>
            {출처열림 ? "출처 접기" : "출처 보기"}
            <Icon name="chevronDown" size={13} />
          </button>
          {출처열림 && (
            <div id={출처id} className="research-source-body">
              {사이트}
              {인용 && <blockquote>{인용}</blockquote>}
            </div>
          )}
        </>
      )}
      {children}
    </article>
  );
}

/** 공개 정보는 규정이 아니고 확인 전 정보라는 안내. 후보 목록과 결과 화면이 같이 씁니다. */
function 조사안내({ 결과화면 = false }: { 결과화면?: boolean }) {
  return (
    <p className="research-notice">
      <Icon name="alert" size={15} />
      <span>
        {결과화면
          ? "웹에서 찾은 공개 정보예요. 규정이 아니며, 실제 거래와 같은지는 직접 확인한 답을 기준으로 봤어요."
          : "웹에서 찾은 공개 정보예요. 규정이 아니고, 아직 사실로 확인된 내용도 아니에요. 실제로 사려는 것과 맞는지 골라 주세요."}
      </span>
    </p>
  );
}

function 조사확인({ 후보, 답, 변경, 검색어 }: { 후보: 조사후보[]; 답: Record<string, 조사답변>; 변경: (v: 조사답변) => void; 검색어?: string }) {
  const 답한수 = 후보.filter((c) => 답[c.id]).length;
  return (
    <section className="research-results">
      <header className="research-results-head">
        <span className="research-search-icon" aria-hidden="true"><Icon name="search" size={16} /></span>
        <div>
          <b>{검색어 ? `「${검색어}」 검색 결과 ${후보.length}건` : `검색 결과 ${후보.length}건`}</b>
          <small>{답한수 === 후보.length ? "모두 확인했어요" : `${후보.length}건 중 ${답한수}건 확인`}</small>
        </div>
      </header>
      <조사안내 />
      {후보.map((항목) => (
        <조사카드 key={항목.id} 항목={항목}>
          <div className="research-answer" role="group" aria-label={`${유형표기(항목.유형)} 정보가 맞는지 확인`}>
            {(["맞아요", "아니에요", "모르겠어요"] as const).map((선택) => (
              <button
                type="button"
                key={선택}
                aria-pressed={답[항목.id]?.답 === 선택}
                onClick={() => 변경({ id: 항목.id, 답: 선택, 정정: 선택 === "아니에요" ? 답[항목.id]?.정정 : undefined })}
              >
                {선택}
              </button>
            ))}
          </div>
          {답[항목.id]?.답 === "아니에요" && (
            <label className="research-correct">
              실제 내용을 적어 주세요 (선택)
              <input maxLength={500} value={답[항목.id]?.정정 ?? ""} onChange={(e) => 변경({ id: 항목.id, 답: "아니에요", 정정: e.target.value })} />
            </label>
          )}
        </조사카드>
      ))}
    </section>
  );
}

function 조사결과보기({ 결과 }: { 결과: import("../lib/questions").조사결과 | null | undefined }) {
  if (!결과) return null;
  const 정보 = Array.isArray(결과.확인한정보) ? 결과.확인한정보.filter((v) => v.유형 !== "업체이용조건") : [];
  const 조건 = Array.isArray(결과.업체이용조건) ? 결과.업체이용조건 : [];
  const 미확인 = Array.isArray(결과.미확인) ? 결과.미확인.filter((v) => v.유형 !== "업체이용조건") : [];
  if (!정보.length && !조건.length && !미확인.length && !결과.부족정보?.length && !결과.사용자확인?.length) return null;
  const 항목 = (v: 조사후보 & { 답?: string; 정정?: string }, i: number) => (
    <조사카드 key={`${v.id}-${i}`} 항목={v}>
      {v.답 && <p className="research-answered">내 확인: {v.답}</p>}
      {v.정정 && <p className="research-answered">직접 적은 내용: {v.정정}</p>}
    </조사카드>
  );
  return (
    <section className="research-results">
      <header className="research-results-head">
        <span className="research-search-icon" aria-hidden="true"><Icon name="search" size={16} /></span>
        <div><b>검색해 확인한 공개 정보</b></div>
      </header>
      <조사안내 결과화면 />
      {정보.map(항목)}
      {!!미확인.length && <><h4>확인되지 않은 정보</h4>{미확인.map(항목)}</>}
      {!!조건.length && <><h4>업체 이용 조건</h4><p>업체가 안내한 내용입니다.</p>{조건.map(항목)}</>}
      {!!결과.부족정보?.length && <p>더 확인이 필요한 공개 정보: {결과.부족정보.map(유형표기).join(" · ")}</p>}
      <직접확인안내 항목들={결과.사용자확인 ?? []} 결과화면 />
    </section>
  );
}

function 직접확인안내({ 항목들, 결과화면 = false }: { 항목들: { 항목: string; 질문: string }[]; 결과화면?: boolean }) {
  if (!항목들.length) return null;
  return <section className="research-settings"><b>직접 확인할 사항</b><p>{결과화면 ? "공개 정보만으로는 알 수 없는 내용이에요. 집행 전에 직접 확인해 주세요." : "공개 정보만으로는 알 수 없는 내용이에요. 다음 규정 질문에서 해당 내용을 물으면 답해 주세요."}</p><ul>{항목들.map((v, i) => <li key={`${v.항목}-${i}`}>{v.질문}</li>)}</ul></section>;
}

/** 검색창 글을 서버 값으로 나눕니다. 첫 http(s) 주소는 `판매URL`, 나머지 낱말은 `공개검색어` 입니다. */
function 검색입력나누기(글: string): { 공개검색어?: string; 판매URL?: string } {
  const 낱말 = 글.trim().split(/\s+/).filter(Boolean);
  const 위치 = 낱말.findIndex((w) => /^https?:\/\/\S+$/i.test(w));
  // 주소가 여럿이면 첫 주소만 읽고, 나머지 주소는 검색어에 넣지 않습니다(서버가 주소가 섞인 검색어를 받지 않음).
  const 나머지 = 낱말.filter((w) => !/^https?:\/\//i.test(w)).join(" ");
  return { 공개검색어: 나머지 || undefined, 판매URL: 위치 >= 0 ? 낱말[위치] : undefined };
}

/** 눌러서 채워 보는 검색 예시. 서버로 보내는 값은 사용자가 「검색」을 눌렀을 때의 검색창 글뿐입니다. */
const 검색예시 = ["ChatGPT Plus", "아두이노 우노 R3", "노션 플러스"];

/**
 * 공개 정보 검색 칸. 켜면 검색창 하나가 열리고, 제품명이든 판매 페이지 주소든 여기에 적습니다.
 * 검색 중에는 서버가 보내는 작업을 바로 아래에 차례로 보여 줍니다.
 * 주의: 외부 검색 서비스에는 이 검색창의 글(검색어와 주소)만 쓰입니다(서버 `web_research`). 다른 값을 보낸다고 쓰지 않습니다.
 */
function 공개검색설정({
  사용,
  설정,
  검색어,
  검색어변경,
  검색하기,
  검색막힘 = false,
  검색중 = false,
  진행 = [],
  시작,
  오류,
  검색없이계속,
}: {
  사용: boolean;
  설정: (v: boolean) => void;
  /** 검색창의 글 그대로. 보낼 때 `검색입력나누기` 로 나눕니다. */
  검색어: string;
  검색어변경: (v: string) => void;
  /** 검색 버튼 · Enter. 없으면 버튼을 그리지 않습니다. */
  검색하기?: () => void;
  /** 검색어 밖의 이유(비목 미선택 등)로 아직 보낼 수 없을 때 */
  검색막힘?: boolean;
  검색중?: boolean;
  진행?: 진행항목[];
  시작?: number;
  오류?: string;
  검색없이계속?: () => void;
}) {
  const id = useId();
  const 검색가능 = !!검색하기 && !검색중 && !검색막힘 && !!검색어.trim();
  const 나눔 = 검색입력나누기(검색어);
  const 읽을사이트 = 나눔.판매URL ? 사이트이름({ 제목: "", url: 나눔.판매URL }) : "";
  return (
    <section className={`research-search ${사용 ? "is-on" : ""}`} aria-labelledby={`${id}-title`}>
      <header>
        <span className="research-search-icon" aria-hidden="true"><Icon name="sparkSolid" size={16} /></span>
        <div>
          <h3 id={`${id}-title`}>AI 공개 정보 검색 <em>선택</em></h3>
          <p>제품·판매처·가격·결제 방법 같은 공개 정보를 AI가 찾아 출처와 함께 보여 드려요.</p>
        </div>
        <label className="research-switch">
          <input
            type="checkbox"
            role="switch"
            aria-label="AI 공개 정보 검색 사용"
            checked={사용}
            disabled={검색중}
            onChange={(e) => 설정(e.target.checked)}
          />
          <span aria-hidden="true">{사용 ? "켜짐" : "꺼짐"}</span>
        </label>
      </header>
      {사용 && (
        <>
          <div className={`research-search-box ${검색중 ? "is-busy" : ""}`}>
            <span className="research-search-spark" aria-hidden="true">
              {검색중 ? <span className="work-log-spinner" /> : <Icon name="sparkSolid" size={16} />}
            </span>
            <input
              type="search"
              maxLength={2400}
              value={검색어}
              readOnly={검색중}
              aria-label="검색할 제품명이나 판매 페이지 주소"
              aria-describedby={`${id}-help`}
              placeholder="제품명이나 판매 페이지 주소를 입력하세요"
              onChange={(e) => 검색어변경(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && 검색가능) {
                  e.preventDefault();
                  검색하기?.();
                }
              }}
            />
            {검색하기 && (
              <button type="button" className="research-search-go" disabled={!검색가능} onClick={검색하기} aria-label={검색중 ? "검색 중" : "검색"}>
                {검색중 ? "검색 중" : <><Icon name="search" size={15} />검색</>}
              </button>
            )}
          </div>
          {!검색중 && !오류 && !검색어.trim() && (
            <div className="research-examples" aria-label="검색 예시">
              {검색예시.map((예) => (
                <button type="button" key={예} onClick={() => 검색어변경(예)}>{예}</button>
              ))}
            </div>
          )}
          {읽을사이트 && !검색중 && (
            <p className="research-url-note">
              <Icon name="paperclip" size={13} />
              {나눔.공개검색어 ? `「${나눔.공개검색어}」 검색과 함께 ${읽을사이트} 페이지도 읽어요.` : `검색 없이 ${읽을사이트} 페이지만 읽어요.`}
            </p>
          )}
          <p id={`${id}-help`} className="research-search-help">검색창에 적은 글만 외부 검색에 쓰여요. 이름·연락처 같은 개인 정보는 적지 마세요.</p>
          {(검색중 || !!오류) && (
            <작업로그
              className="research-stream"
              항목들={진행}
              진행중={검색중}
              시작={시작}
              기본문장="검색을 준비하고 있어요."
              실패={오류}
              펼침기본
            />
          )}
          {오류 && 검색없이계속 && (
            <div className="research-error-actions">
              <button type="button" className="outline" onClick={검색없이계속}>검색 없이 계속</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** 페이지가 앱 최상단에 맡기는 판정 한 건. 페이지를 옮겨도 판정이 끊기지 않게 최상단이 들고 있습니다. */
type 판정시작입력 = {
  계획: ExpensePlan;
  planId?: string;
  count: number;
  제목?: string;
  대체입력?: ComponentProps<typeof AiCheckingOverlay>["대체입력"];
  답변?: 답변항목[];
  질문세트?: string | null;
  추가입력값?: Record<string, string | number>;
  확정세목?: string | null;
  부가세구분?: 부가세구분;
  조사ID?: string;
  조사답변?: 조사답변[];
  이전진행?: 진행항목[];
  /** 창을 열어 둔 채 끝났을 때만 부릅니다. 접어 두었으면 사용자를 끌고 가지 않고 최상단이 알립니다. */
  끝남: (판정된계획?: ExpensePlan, 오류?: string) => void;
};

/** 판정 한 건에서 받은 작업 내역. 서버 이벤트를 받은 그대로 두고, 결과 화면에서 접어 보여 줍니다(새로고침하면 사라집니다). */
type 판정기록 = { 항목들: 진행항목[]; 시작: number; 끝: number; 오류?: string };

type 판정작업 = 판정시작입력 & {
  키: number;
  최소화: boolean;
  /** 한 번이라도 접었으면 시작한 페이지가 이미 없을 수 있어 최상단이 끝까지 맡습니다. */
  접은적?: boolean;
  결과?: { 오류?: string; 저장안됨?: boolean };
};

function AiCheckingOverlay({
  count,
  planId,
  대체입력,
  답변,
  질문세트,
  추가입력값,
  확정세목,
  부가세구분,
  조사ID,
  조사답변,
  이전진행,
  제목,
  onComplete,
  onFail,
  최소화,
  접기,
  펼치기,
  이름,
  순번,
}: {
  /** 창을 접고 다른 화면을 쓰는 중입니다. 판정은 그대로 진행합니다. */
  최소화: boolean;
  접기: () => void;
  펼치기: () => void;
  이름: string;
  순번: number;
  count: number;
  /**
   * 주의: 새 계획 작성 흐름에서만 문구가 다릅니다 (「AI가 지출계획을 작성하고 있어요」).
   *    목록의 일괄 점검은 '이미 있는' 계획을 보는 것이라 기존 문구가 맞습니다.
   */
  제목?: string;
  /** 주면 '진짜' 판정을 부릅니다. 없으면 예전처럼 애니메이션만 합니다. */
  planId?: string;
  /** 방금 만든 계획처럼 상세 조회가 실패할 수 있을 때의 대비 값 */
  대체입력?: {
    사업명?: string | null;
    확정비목?: string | null;
    정규화?: Record<string, unknown> | null;
    제목?: string | null;
    용도?: string | null;
    금액?: number | null;
    화면수정있음?: boolean;
  };
  /** 확인 질문의 답. 안 주면 답 없이 판정합니다(목록·상세의 재점검). */
  답변?: 답변항목[];
  /** 답변이 속한 질문 묶음의 키. */
  질문세트?: string | null;
  /** 추가 입력 칸에 채운 값. */
  추가입력값?: Record<string, string | number>;
  /** 새 지출 계획 화면에서 확정한 값. 재점검은 안 주고 계획에 저장된 값을 씁니다(`lib/judge.ts`). */
  확정세목?: string | null;
  부가세구분?: 부가세구분;
  조사ID?: string;
  조사답변?: 조사답변[];
  이전진행?: 진행항목[];
  /** 기록은 이번 판정에서 받은 작업 내역입니다. 결과 화면의 「작업 내역 보기」가 씁니다. */
  onComplete: (판정된계획?: ExpensePlan, 기록?: 판정기록) => void;
  onFail?: (메시지: string, 기록?: 판정기록) => void;
}) {
  const [, setStage] = useState(0);
  const [설명, set설명] = useState("");
  const [진행항목들, set진행항목들] = useState<진행항목[]>(이전진행 ?? []);
  const 진행Ref = useRef<진행항목[]>(이전진행 ?? []);
  const [시작시각] = useState(() => Date.now());
  const 기록 = (): 판정기록 => ({ 항목들: 진행Ref.current, 시작: 시작시각, 끝: Date.now() });
  const 진행중 = useRef<Promise<{ 계획: ExpensePlan }> | null>(null);
  // 주의: 마지막으로 「진행」 이벤트나 keep-alive 를 받은 시각을 기록합니다. 아래 타임아웃은 절대시간이
  //    아니라 '마지막 수신 이후 무응답 시간' 을 잽니다. 2026-09-04 에 GPU 콜드 기동
  //    (진행 이벤트가 5초마다 오는 긴 대기) 대응으로 도입했습니다. GPU 경로는 백엔드에서
  //    제거되었지만, 진행 이벤트 기준 타임아웃은 그대로 유효합니다.
  //    `GPU기동중` 은 서버가 예전에 보내던 기동 문구를 감지합니다. 현재 서버는 이 문구를
  //    보내지 않으므로 항상 false 입니다(제거 여부는 별도 결정).
  const 진행시각 = useRef(Date.now());
  const GPU기동중 = /서버를 깨우는 중|서버가 준비/.test(설명);

  useEffect(() => {
    // ── 애니메이션 경로 (백엔드 없음 / 계획 지정 안 함) ──
    if (!planId || !API켜짐()) {
      const first = window.setTimeout(() => setStage(1), 900);
      const second = window.setTimeout(() => setStage(2), 1800);
      const done = window.setTimeout(() => onComplete(undefined, 기록()), 2700);
      return () => {
        window.clearTimeout(first);
        window.clearTimeout(second);
        window.clearTimeout(done);
      };
    }

    // ── 진짜 판정 경로 ──
    //
    // 주의: 판정 1건이 LLM 호출이라 '한 번만' 부릅니다. 자동 재시도 없음.
    //
    // 주의: 개발 모드(`npm run dev`)에서 React 는 effect 를 '두 번' 실행합니다
    //    (StrictMode: 마운트 → 정리 → 다시 마운트). 그래서
    //      · 정리에서 요청을 끊으면  → 첫 호출이 중단되고
    //      · 「한 번만」 가드로 막으면 → 두 번째가 실행되지 않아
    //    영원히 기다리게 됩니다. 그래서 '요청을 끊지 않고' 약속(Promise)을
    //    보관해 두었다가, 다시 마운트되면 그 약속에 그대로 연결합니다.
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
          작업: (항목) => {
            진행Ref.current = 진행추가(진행Ref.current, 항목);
            set진행항목들(진행Ref.current);
          },
          // 주의: 서버는 진행 3개를 처음에 한꺼번에 보내고, 판정이 끝날 때까지는 12초마다
          //    keep-alive 만 보냅니다. 이걸로 다시 재지 않으면 서버 마감(180초) 안에 끝날
          //    판정도 150초에 「오래 걸립니다」로 끊고, 서버는 그 뒤에 저장합니다.
          활동: () => {
            진행시각.current = Date.now();
          },
        },
        { 대체입력, 답변, 질문세트, 추가입력값, 확정세목, 부가세구분, 조사ID, 조사답변 },
      );
    }

    // 주의: 안전장치 — 어떤 이유로도 '영원히' 도는 일이 없게 합니다.
    //    절대시간이 아니라 '마지막 진행·keep-alive 이후 무응답' 을 잽니다. 서버가 살아 있으면
    //    12초마다 keep-alive 가 오므로, 150초 동안 아무것도 안 왔으면 그때는 정말 끊긴 것입니다.
    const 무응답한도 = 150000;
    const 시간초과 = window.setInterval(() => {
      if (!살아있음) return;
      if (Date.now() - 진행시각.current < 무응답한도) return;
      window.clearInterval(시간초과);
      진행중.current = null;
      onFail?.("점검이 예상보다 오래 걸립니다. 잠시 후 다시 시도해 주세요.", 기록());
    }, 5000);

    진행중.current
      .then((r) => {
        window.clearInterval(시간초과);
        if (살아있음) onComplete(r.계획, 기록());
      })
      .catch((e: unknown) => {
        window.clearInterval(시간초과);
        if (!살아있음) return;
        진행중.current = null;          // 다음 시도는 새로 부를 수 있게
        const 메시지 = e instanceof Error ? e.message : "점검에 실패했습니다";
        if (onFail) onFail(메시지, 기록());
        else onComplete(undefined, 기록());
      });

    return () => {
      살아있음 = false;
      window.clearInterval(시간초과);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);
  if (최소화) {
    return (
      <aside className="judge-pill" role="status" style={{ bottom: 20 + 파일높이 * 순번 }}>
        <span className="ai-checking-spinner" aria-hidden="true" />
        <span>
          <b>{이름}</b>
          <small>AI 점검 중 · {최근항목(진행항목들)?.문장 ?? "보통 1분 정도 걸려요"}</small>
        </span>
        <button onClick={펼치기}>열기</button>
      </aside>
    );
  }
  // 주의: 팝업이 아니라 페이지 자체가 바뀝니다. 최상단이 이 화면을 `main` 안에 두고 다른 페이지 내용을 숨깁니다(`.main-area.is-judging`).
  //    한 줄 요약은 서버가 보낸 마지막 작업 문장이고, 누르면 지금까지 받은 작업이 모두 펼쳐집니다.
  return (
    <section className="page judge-run" aria-labelledby={`judge-run-title-${순번}`}>
      <header className="judge-run-head">
        <small>{이름}</small>
        <h1 id={`judge-run-title-${순번}`}>
          {제목 ?? `AI가 지출 계획${count > 1 ? ` ${count}건을` : "을"} 점검하고 있어요`}
        </h1>
      </header>
      <작업로그
        className="judge-run-log"
        앞단계이름="점검 전 확인"
        이번단계이름="AI 점검"
        항목들={진행항목들}
        진행중
        시작={시작시각}
        기본문장={설명 || "서버 응답을 기다리고 있어요."}
      />
      {/* 주의: 2026-09-07(책임자 결정) — 실제 판정은 Qwen 경로에서 1건 약 60초다(판정 LLM 55~59초 실측).
          `GPU기동중` 은 예전 GPU 콜드 기동 안내라 현재 서버에서는 나오지 않습니다. */}
      <p className="judge-run-note">
        {GPU기동중
          ? "AI 서버를 새로 켜는 중입니다. 몇 분 정도 걸릴 수 있어요."
          : count > 1
            ? "AI 판정은 한 건당 1분 정도 걸려요. 끝나면 이 화면에 결과가 나와요."
            : "AI 판정은 보통 1분 정도 걸려요. 끝나면 이 화면에 결과가 나와요."}
        <br />
        다른 화면으로 가도 점검은 계속돼요. 탭을 닫거나 새로고침하면 결과가 저장되지 않을 수 있어요.
      </p>
      <div className="judge-run-actions">
        <button type="button" className="outline" onClick={접기}>점검은 두고 다른 화면 보기</button>
      </div>
    </section>
  );
}

/** 재점검 창에서 받은 답. `AiCheckingOverlay` 로 그대로 넘깁니다. */
type 재점검답 = { 답변: 답변항목[]; 질문세트: string | null; 추가입력값: Record<string, string | number>; 조사ID?: string; 조사답변?: 조사답변[]; 이전진행?: 진행항목[] };

/**
 * 재점검 전 확인 창. 서버 모드는 새 지출 계획과 같은 확인 질문을 묻고, 물을 것이 없으면 바로 점검합니다.
 * 주의: 답 없이 판정하면 전에 「아니오」로 답한 요건이 사라져 틀린 「가능」이 나올 수 있습니다.
 */
function PlanRecheckQuestionsModal({
  plan,
  close,
  start,
}: {
  plan: ExpensePlan;
  close: () => void;
  /** `선택비목` 은 계획에 비목이 없어 이 창에서 고른 값입니다. */
  start: (선택비목?: string, 답?: 재점검답) => void;
}) {
  // 주의: 1단계에서 임시저장한 계획은 비목이 없습니다. 비목 없이 판정하면 서버가 규칙·한도를
  //    확인하지 못하므로(틀린 「가능」 위험) 여기서 먼저 고르게 합니다.
  const [선택비목, set선택비목] = useState("");
  const 비목선택지 = use비목선택지();
  const category = (plan.category || 선택비목).split(" · ")[0];
  const feeSubtype = plan.category.split(" · ")[1] || "멘토링";
  // 주의: 서버 비목 라벨(「기계장치」)도 질문표(「기계장치비」)에 맞게 찾습니다.
  //    그냥 대괄호로 찾으면 못 찾고 '외주용역비 질문' 으로 조용히 떨어집니다.
  const 찾은질문 = 질문찾기(category);
  const questions = !category
    ? []
    : category === "지급수수료"
      ? FEE_QUESTIONS[feeSubtype] || FEE_QUESTIONS["멘토링"]
      : 찾은질문.length
        ? 찾은질문
        : CATEGORY_QUESTIONS["외주용역비"];

  const 서버모드 = API켜짐();
  // 비목을 이 창에서 바꾸면 질문도 바뀌므로 어떤 비목으로 받은 질문인지 같이 둡니다.
  // 주의: 저장된 계획에는 세부유형이 없을 수 있습니다. 예시 모드의 질문표 기본값(멘토링)을 서버로 보내면 안 됩니다.
  const 세부유형 = category === "지급수수료" ? plan.category.split(" · ")[1] || null : null;
  const 질문키 = `${category}|${세부유형}`;
  const [받은, set받은] = useState<{ 키: string; 결과: 질문결과 } | null>(null);
  const [답, set답] = useState<Record<string, string>>({});
  const [칸값, set칸값] = useState<Record<string, string>>({});
  const [검색시작, set검색시작] = useState(false);
  const [웹조사, set웹조사] = useState(false);
  const [공개검색어, set공개검색어] = useState("");
  const [진행항목들, set진행항목들] = useState<진행항목[]>([]);
  const 진행Ref = useRef<진행항목[]>([]);
  const [조사답, set조사답] = useState<Record<string, 조사답변>>({});
  const [조사오류, set조사오류] = useState("");
  const [규정요청, set규정요청] = useState(false);
  const [조사확인ID, set조사확인ID] = useState<string | undefined>();
  const [진행시작, set진행시작] = useState<number>();
  const 받는중 = 서버모드 && 검색시작 && !!category && 받은?.키 !== 질문키;
  // 공개 검색 중이면 검색 칸 안에서 작업을 보여 줍니다. 규정 질문을 다시 받는 중은 아래 일반 진행 표시입니다.
  const 검색중 = 받는중 && 웹조사 && !규정요청;
  const 확인시작 = () => { set조사오류(""); 진행Ref.current = []; set진행항목들([]); set진행시작(Date.now()); set검색시작(true); };
  const 지금결과 = 서버모드 && 받은?.키 === 질문키 ? 받은.결과 : null;
  const 서버질문 = 지금결과?.질문 ?? [];
  const 서버칸 = 지금결과?.추가입력 ?? [];
  // id(Q1…)는 묶음마다 다시 매겨지므로 옛 답이 새 질문의 답이 되지 않게 묶음 키를 붙입니다.
  const 답키 = (q: 확인질문) => `${지금결과?.질문세트}:${q.id}`;

  useEffect(() => {
    if (!서버모드 || !category || !검색시작) return;
    let 살아있음 = true;
    void 계획상세(plan.id).catch(() => null).then((상세) => {
      if (!살아있음) throw new Error("취소됨");
      const n = 상세?.정규화 && Object.keys(상세.정규화).length ? 상세.정규화 : null;
      const 저장값 = 상세 ? 정규화저장값(상세.정규화) : null;
      return 질문가져오기({
      사업명: 상세 ? 상세.사업명 : 현재사업(),
      확정비목: category,
      // 주의: 계획에 저장된 세목과 부가세 구분을 그대로 보냅니다. 이 창에서 고른 비목이면 저장된 세목은 없습니다.
      확정세목: plan.category ? (저장값?.확정세목 ?? plan.확정세목) : undefined,
      부가세구분: 저장값?.부가세구분 ?? plan.부가세구분,
      세부유형,
      품목: n ? (typeof n.품목 === "string" ? n.품목 : "") : (상세 ? 상세.제목 ?? "" : plan.name),
      금액: n ? (typeof n.금액 === "number" ? n.금액 : null) : (상세 ? 상세.금액 ?? 0 : plan.amount),
      용도: n ? (typeof n.용도 === "string" ? n.용도 : "") : (상세 ? 상세.용도 ?? "" : plan.purpose),
      질문원문: n ? [n.질문원문, n.질문, n._원문].find((v): v is string => typeof v === "string" && !!v) : (상세?.질문원문 ?? undefined),
      웹조사, ...(웹조사 ? 검색입력나누기(공개검색어) : {}),
      ...(규정요청 ? { 조사ID: 조사확인ID, 조사답변: Object.values(조사답) } : {}),
      }, (항목) => { if (살아있음) { 진행Ref.current = 진행추가(진행Ref.current, 항목); set진행항목들(진행Ref.current); } });
    }).then((결과) => {
      if (!살아있음) return;
      // 물을 것이 없으면 바로 점검합니다. 이 창에서 비목을 고른 경우는 사용자가 시작을 눌러야 합니다.
      if (!결과.질문.length && !결과.추가입력.length && 결과.상태 !== "조사확인" && plan.category) {
        start(undefined, { 답변: [], 질문세트: 결과.질문세트, 추가입력값: {}, 조사ID: 결과.조사ID, 조사답변: 규정요청 ? Object.values(조사답) : [], 이전진행: 진행Ref.current });
        return;
      }
      set칸값(추가입력초기값(결과.추가입력, plan.수치));
      set받은({ 키: 질문키, 결과 });
    }).catch((오류: unknown) => {
      if (!살아있음) return;
      set조사오류(오류 && typeof 오류 === "object" && "status" in 오류 && 오류.status === 503 ? "규정을 확인하지 못했어요. 잠시 후 다시 확인해 주세요." : 규정요청 ? "규정 질문을 받지 못했어요. 검색 없이 계속하거나 다시 확인해 주세요." : 웹조사 ? "공개 정보를 확인하지 못했어요. 입력한 내용으로 계속 점검하거나 나중에 다시 시도해 주세요." : "확인할 내용을 받지 못했어요. 다시 확인해 주세요.");
      set규정요청(false);
      set조사확인ID(undefined);
      set조사답({});
      set검색시작(false);
    });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [서버모드, 질문키, 검색시작, 규정요청]);

  return (
    <div className="ai-checking-backdrop" role="presentation">
      <section className="plan-recheck-modal" role="dialog" aria-modal="true" aria-labelledby="plan-recheck-title">
        <header>
          <div>
            <small>{plan.name}</small>
            <h2 id="plan-recheck-title">추가로 확인할게요</h2>
            <p>
              {!category
                ? "비목을 고르면 그 비목의 규정으로 점검합니다."
                : !서버모드
                  ? `${category} 규정에서 확인할 사항입니다. 답변은 아직 AI 점검에 반영되지 않습니다.`
                  : 받는중
                    ? "서버 응답을 기다리고 있어요."
                    : 지금결과?.상태 === "조사확인"
                      ? "공개 정보를 확인한 뒤 규정 질문을 준비합니다."
                      : "답변을 반영해 판정합니다. 모르면 모르겠어요를 눌러 주세요."}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="닫기">×</button>
        </header>
        <div className="plan-recheck-questions">
          {!plan.category && (
            <Question
              label="이 지출의 비목을 골라 주세요."
              options={[...비목선택지]}
              value={선택비목}
              onChange={(값) => { set선택비목(값); set검색시작(false); set규정요청(false); set받은(null); set조사답({}); }}
            />
          )}
          {서버모드 && (!검색시작 || 검색중) && (
            <공개검색설정
              사용={웹조사}
              설정={set웹조사}
              검색어={공개검색어}
              검색어변경={set공개검색어}
              검색하기={확인시작}
              검색막힘={!category}
              검색중={검색중}
              진행={진행항목들}
              시작={진행시작}
              오류={웹조사 && 조사오류 ? 조사오류 : undefined}
              검색없이계속={() => { set조사오류(""); set웹조사(false); set검색시작(true); }}
            />
          )}
          {조사오류 && !웹조사 && <p role="alert">{조사오류}</p>}
          {받는중 && !검색중 && <작업로그 항목들={진행항목들} 진행중 시작={진행시작} 기본문장="확인할 내용을 준비하고 있어요." 펼침기본 />}
          {지금결과?.상태 === "조사확인" && !!진행항목들.length && <작업로그 className="research-stream" 항목들={진행항목들} 진행중={false} 시작={진행시작} 기본문장="공개 정보 검색을 마쳤어요." 끝문장="공개 정보 검색을 마쳤어요." />}
          {지금결과?.상태 === "조사확인" && !!지금결과.조사후보?.length && <조사확인 후보={지금결과.조사후보} 답={조사답} 검색어={검색입력나누기(공개검색어).공개검색어} 변경={(v) => set조사답((이전) => ({ ...이전, [v.id]: v }))} />}
          {지금결과?.상태 === "조사확인" && !지금결과.조사후보?.length && <p>확인된 공개 정보가 없어요. 입력한 내용으로 계속 점검할 수 있어요.</p>}
          {지금결과?.상태 === "조사확인" && !!지금결과.부족정보?.length && <p>더 확인이 필요한 공개 정보: {지금결과.부족정보.map(유형표기).join(" · ")}</p>}
          {지금결과?.상태 === "조사확인" && <직접확인안내 항목들={지금결과.사용자확인 ?? []} />}
          {서버모드 && (
            <추가입력칸목록 칸들={서버칸} 값들={칸값} onChange={(키, v) => set칸값((prev) => ({ ...prev, [키]: v }))} />
          )}
          {서버모드
            ? 서버질문.map((q) => (
                <확인질문카드
                  key={답키(q)}
                  질문={q}
                  값={답[답키(q)]}
                  풀이={지금결과?.용어풀이}
                  onChange={(v) => set답((prev) => ({ ...prev, [답키(q)]: v }))}
                />
              ))
            : questions.map((question, index) => (
                <Question key={`${plan.id}-${category}-${index}`} label={question.label} options={question.options} />
              ))}
        </div>
        <footer>
          <button className="outline" onClick={close}>취소</button>
          <button
            className="primary"
            disabled={!category || 받는중 || (웹조사 && !공개검색어.trim()) || 서버질문.some((q) => !답[답키(q)]) || (지금결과?.상태 === "조사확인" && !!지금결과.조사후보?.some((c) => !조사답[c.id]))}
            onClick={() => {
              if (서버모드 && !검색시작) { 확인시작(); return; }
              if (지금결과?.상태 === "조사확인") {
                set조사확인ID(지금결과.조사ID);
                set받은(null);
                set규정요청(true);
                return;
              }
              start(
                plan.category ? undefined : 선택비목,
                서버질문.length || 서버칸.length || 지금결과?.조사ID
                  ? {
                      답변: 서버질문.map((q) => ({ code: q.id, 값: 답[답키(q)] })),
                      질문세트: 지금결과?.질문세트 ?? null,
                      추가입력값: 추가입력값만들기(서버칸, 칸값),
                      조사ID: 지금결과?.조사ID,
                      조사답변: Object.values(조사답),
                      이전진행: 진행항목들,
                    }
                  : undefined,
              );
            }}
          >
            {서버모드 && !검색시작 ? (조사오류 ? "다시 확인" : "계속") : 지금결과?.상태 === "조사확인" ? "규정 확인하기" : "AI 점검 시작"}
          </button>
        </footer>
      </section>
    </div>
  );
}

/** 예상 지출일을 바꿀 때 연결된 일정도 옮길지 묻습니다. 고르기 전에는 아무것도 저장하지 않습니다. */
function 지출일변경창({
  plan,
  새날짜,
  줄들,
  닫기,
  저장,
}: {
  plan: ExpensePlan;
  새날짜: string;
  줄들: ScheduleItem[];
  닫기: () => void;
  저장: (일정이동: boolean) => void;
}) {
  const 일수 = Math.round(
    (new Date(`${새날짜}T00:00:00`).getTime() - new Date(`${plan.plannedDate}T00:00:00`).getTime()) / 86400000,
  );
  const 월일 = (값: string) => {
    const d = new Date(`${값}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const 옮긴날 = (값: string) => {
    const d = new Date(`${값}T00:00:00`);
    d.setDate(d.getDate() + 일수);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <div className="ai-checking-backdrop" role="presentation">
      <section className="recheck-required-modal" role="dialog" aria-modal="true" aria-labelledby="move-schedule-title">
        <h2 id="move-schedule-title">연결된 일정 {줄들.length}건도 옮길까요?</h2>
        <p>
          예상 지출일: {월일(plan.plannedDate)} → {월일(새날짜)}. 완료한 일정은 그대로 둡니다.
        </p>
        <ul className="move-schedule-list">
          {줄들.slice(0, 5).map((s) => (
            <li key={s.id}>
              <span>{s.title}</span>
              <b>{월일(s.date)} → {옮긴날(s.date)}</b>
            </li>
          ))}
          {줄들.length > 5 && <li className="more">외 {줄들.length - 5}건</li>}
        </ul>
        <footer>
          <button className="outline" onClick={닫기}>취소</button>
          <button className="outline" onClick={() => 저장(false)}>지출일만 바꾸기</button>
          <button className="primary" onClick={() => 저장(true)}>같이 옮기기</button>
        </footer>
      </section>
    </div>
  );
}

/** 서버에 보내지 않는 변경의 안내. 저장된 것처럼 말하면 새로고침 뒤 사라졌을 때 알 길이 없습니다. */
const 화면에만반영 = "이 화면에만 반영했습니다. 새로고침하면 사라집니다.";

/**
 * 서버 모드의 계획 수정. 계획 수정 API 가 없어, 비어 있던 비목을 고른 것 말고는 화면에만 남습니다.
 * 주의: 판정은 서버의 저장 값으로 하므로 바뀐 금액 옆에 이전 판정이 그대로 보입니다. 표시를 남겨 알립니다.
 */
function 서버모드수정(이전: ExpensePlan, 입력: ExpensePlan): { 계획: ExpensePlan; 안내: string } {
  // 주의: 예상 지출일은 `지출일변경` 이 따로 저장합니다. 여기서는 옛 값으로 두고 나머지만 봅니다.
  const 수정 = { ...입력, plannedDate: 이전.plannedDate };
  // 주의: 첨부파일은 올리는 즉시 저장되므로 여기서 다루지 않습니다.
  if (JSON.stringify(수정) === JSON.stringify(이전)) {
    return { 계획: 이전, 안내: 입력.plannedDate === 이전.plannedDate ? "저장했습니다." : "" };
  }
  // 서버에 비목이 없는 계획은 여기서 고른 비목으로 점검합니다. 그 외 값은 서버에 저장할 길이 없습니다.
  const 비목반영 = !이전.category || !!이전.비목직접선택;
  const 비목골랐다 = 비목반영 && 수정.category !== 이전.category;
  const 계획 = 비목골랐다 ? { ...수정, 비목직접선택: true } : 수정;
  const 비목외같음 = JSON.stringify({ ...수정, category: "" }) === JSON.stringify({ ...이전, category: "" });
  if (비목외같음 && 비목반영) {
    return { 계획, 안내: "비목을 골랐습니다. AI 점검을 시작하면 이 비목으로 확인합니다." };
  }
  return {
    계획: { ...계획, 화면만수정: true },
    안내: 계획.비목직접선택
      ? "고른 비목 말고 고친 내용은 이 화면에만 반영했습니다. 새로고침하면 사라지고 AI 점검에도 반영되지 않습니다."
      : "이 화면에만 반영했습니다. 새로고침하면 사라지고 AI 점검에도 반영되지 않습니다.",
  };
}

function PlansPage({
  plans,
  schedules,
  go,
  자료받음,
  notify,
  remove,
  확인,
  update,
  판정시작,
  지출일변경,
}: {
  판정시작: (작업: 판정시작입력) => boolean;
  지출일변경: (plan: ExpensePlan, 새날짜: string) => void;
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  go: (route: AppRoute) => void;
  자료받음: boolean;
  notify: (message: string) => void;
  remove: (ids: string | string[]) => boolean;
  확인: (요청: 확인요청) => Promise<boolean>;
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
  const [bulkComplete, setBulkComplete] = useState(false);
  const categories = useMemo(
    () => Array.from(new Set(plans.map((plan) => plan.category).filter(Boolean))).sort(),
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
          ? (a.plannedDate || "9999").localeCompare(b.plannedDate || "9999")   // 날짜 없는 계획은 맨 뒤
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
    // 주의: 금액은 따옴표를 안 씌웁니다. 씌우면 엑셀이 '문자' 로 읽어서 합계가 안 됩니다.
    //    나머지는 쉼표·줄바꿈이 들어올 수 있으니 그대로 감쌉니다.
    const escape = (value: string | number) =>
      typeof value === "number"
        ? String(value)
        : `"${String(value).replaceAll('"', '""')}"`;
    // 주의: 예전 머리글은 사업비 정산표(비목/세목/세세목/현금/현물/신청가능금액…) 양식을
    //    그대로 베낀 것이었는데, 우리가 가진 값이 그 칸의 절반도 안 됐습니다.
    //    10칸 중 5칸이 '항상' 비었고, 「산출 근거」 칸에는 엉뚱하게 지출명이 들어가
    //    있었습니다. 우리가 실제로 아는 것만 남깁니다.
    const header = ["지출항목", "관련 비목", "사용 목적", "예상 지출일", "예상금액"];
    const body = targets.map((plan) => [
      plan.name,
      plan.category,
      plan.purpose,
      plan.plannedDate,
      plan.amount,
    ]);
    const csv =
      "\uFEFF" +
      [header, ...body].map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `써도돼요_지출계획_${new Date().toISOString().slice(0, 10)}.csv`;
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
        {(["전체", "점검전", "점검 중", "확인 필요", "위험", "특이사항 없음"] as const).map(
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
                    <option value="점검 중">점검 중</option>
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
              disabled={selected.length !== 1 || plans.some((plan) => plan.id === selected[0] && plan.status === "점검 중")}
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
                    void 확인({
                      제목: "지출 계획을 삭제할까요?",
                      설명: `선택한 ${selected.length}건을 삭제합니다. 연결된 집행 일정도 모두 함께 삭제됩니다.`,
                      실행문구: "삭제",
                    }).then((확인함) => {
                      if (!확인함) return;
                      remove(selected);
                      setSelected([]);
                    });
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
                  <td className="title-cell">
                    <b>{plan.name}</b>
                    {plan.현재단계 && <small className="plan-current-stage">현재: {plan.현재단계}</small>}
                  </td>
                  <td>{plan.category || "미정"}</td>
                  <td className="amount-cell"><strong>{won(plan.amount)}</strong></td>
                  <td className="status-cell"><Status value={plan.status} /></td>
                  <td className="action-cell planned-date-cell">
                    <span className="planned-date-content">
                    <time>{plan.plannedDate ? plan.plannedDate.replaceAll("-", ".") : "미정"}</time>
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
                              setOpenMenu(null);
                              void 확인(계획삭제문구(plan.name)).then((확인함) => {
                                if (!확인함) return;
                                remove(plan.id);
                                setSelected((value) =>
                                  value.filter((id) => id !== plan.id),
                                );
                              });
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
                  <td colSpan={8}>{자료받음 ? "조건에 맞는 지출 계획이 없습니다." : "지출 계획을 불러오는 중입니다."}</td>
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
      {questionPlan && (
        <PlanRecheckQuestionsModal
          plan={questionPlan}
          close={() => setQuestionPlan(null)}
          start={(선택비목, 답) => {
            const 대상 = 선택비목
              ? { ...questionPlan, category: 선택비목, 비목직접선택: true }
              : questionPlan;
            if (선택비목) update(대상);
            setQuestionPlan(null);
            set점검오류(null);
            // 주의: 2026-09-04 — `planId` 를 안 넘기면 판정 없이 애니메이션만 하고 끝납니다.
            판정시작({
              계획: 대상,
              count: 1,
              planId: API켜짐() ? 대상.id : undefined,
              // 주의: 상세 조회가 404·500 이어도 화면이 든 값으로 대신 판정합니다.
              대체입력: {
                사업명: 현재사업(),
                확정비목: 대상.category.split(" · ")[0],
                제목: 대상.name,
                용도: 대상.purpose,
                금액: 대상.amount,
                화면수정있음: 대상.화면만수정,
              },
              답변: 답?.답변,
              질문세트: 답?.질문세트,
              조사ID: 답?.조사ID,
              조사답변: 답?.조사답변,
              이전진행: 답?.이전진행,
              추가입력값: 답?.추가입력값,
              끝남: (_판정된계획, 오류) => {
                if (오류) {
                  setBulkComplete(false);
                  set점검오류(오류);
                } else setBulkComplete(true);
              },
            });
          }}
        />
      )}
      {bulkComplete && (
        <div className="ai-checking-backdrop">
          <section className="bulk-check-complete" role="dialog" aria-modal="true" aria-labelledby="bulk-complete-title">
            <span className="bulk-complete-icon">
              <Icon name={plans.some((plan) => selected.includes(plan.id) && plan.저장안됨) ? "alert" : "check"} size={23} />
            </span>
            {/* 주의: 서버가 결과를 저장하지 못했는데 「완료」라고 하면 새로고침 뒤 결과가 사라집니다. */}
            {plans.some((plan) => selected.includes(plan.id) && plan.저장안됨) ? (
              <>
                <h2 id="bulk-complete-title">점검 결과가 저장되지 않았어요</h2>
                <p>이 결과는 새로고침하면 사라집니다. 다시 점검해 주세요.</p>
              </>
            ) : (
              <>
                <h2 id="bulk-complete-title">지출 계획 점검이 완료됐어요</h2>
                <p>AI 점검 상태와 예상 지출일을 확인해주세요.</p>
              </>
            )}
            <div className="bulk-complete-summary">
              <span><small>특이사항 없음</small><b>{plans.filter((plan) => selected.includes(plan.id) && plan.status === "특이사항 없음").length}건</b></span>
              <span><small>확인 필요</small><b className="warn">{plans.filter((plan) => selected.includes(plan.id) && plan.status === "확인 필요").length}건</b></span>
              <span><small>위험</small><b className="risk">{plans.filter((plan) => selected.includes(plan.id) && plan.status === "위험").length}건</b></span>
            </div>
            <div className="bulk-complete-list">
              {plans.filter((plan) => selected.includes(plan.id)).map((plan) => (
                <button key={plan.id} onClick={() => go({ page: "plan-detail", id: plan.id })}>
                  <span><b>{plan.name}</b><small>예상 지출일 {plan.plannedDate ? plan.plannedDate.replaceAll("-", ".") : "미정"}</small></span>
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
          확인={확인}
          notify={notify}
          close={() => {
            setEditing(null);
            setDraft(null);
          }}
          save={() => {
            const 이전 = plans.find((item) => item.id === draft.id);
            if (API켜짐() && 이전) {
              const { 계획, 안내 } = 서버모드수정(이전, draft);
              update(계획);
              if (안내) notify(안내);
              if (draft.plannedDate !== 이전.plannedDate) 지출일변경(계획, draft.plannedDate || "");
            } else {
              update(draft);
            }
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
  판정시작,
  notify,
}: {
  판정시작: (작업: 판정시작입력) => boolean;
  notify: (message: string) => void;
  /** `점검오류` 는 계획은 저장됐지만 판정이 실패했을 때의 사유입니다. */
  save: (plan: ExpensePlan, temporary?: boolean, 점검오류?: string) => void;
  cancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  // 주의: 기본은 「모르겠어요」입니다. 고르지 않은 값을 포함으로 두면 한도 비교가 틀린 기준으로 돕니다.
  //    모름이고 비교에 필요하면 서버가 3단계에 부가세 확인 질문을 더합니다.
  const [부가세, set부가세] = useState<부가세구분>("모름");
  // 주의: 비워 둡니다. 예전 기본값(2026-09-30)은 이미 지난 날이었고, 사용자가 안 고치면 그대로
  //    집행예정일로 저장되어 할일 기한까지 지난 날짜로 계산됐습니다.
  const [date, setDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  // 주의: 비워 둡니다. 초기값을 두면 사용자가 고르지 않은 비목이 추천처럼 보이고 그 비목으로 판정됩니다.
  const [category, setCategory] = useState("");
  const [feeSubtype, setFeeSubtype] = useState("멘토링");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [웹조사, set웹조사] = useState(false);
  const [공개검색어, set공개검색어] = useState("");
  const [진행항목들, set진행항목들] = useState<진행항목[]>([]);
  const 진행Ref = useRef<진행항목[]>([]);
  const [진행시작, set진행시작] = useState<number>();
  const [조사오류, set조사오류] = useState("");
  const [조사ID, set조사ID] = useState<string | undefined>();
  const [조사후보들, set조사후보들] = useState<조사후보[]>([]);
  const [직접확인들, set직접확인들] = useState<{ 항목: string; 질문: string }[]>([]);
  const [부족정보들, set부족정보들] = useState<string[]>([]);
  const [조사답, set조사답] = useState<Record<string, 조사답변>>({});
  const [조사확인단계, set조사확인단계] = useState(false);
  // ── 서버 연동 상태 ──
  // 주의: 예전에는 첫 후보 하나만 들고 있었습니다(`서버추천: string`). 서버는 후보를
  //    '여러 개' 줄 수 있고 그때는 배지도 여러 개 붙어야 하므로 배열로 들고 갑니다.
  const [서버후보, set서버후보] = useState<비목후보[]>([]);
  const [서버정규화, set서버정규화] = useState<Record<string, unknown> | null>(null);
  const [정규화조사ID, set정규화조사ID] = useState<string | undefined>();
  // 온톨로지 경로 서버가 준 분류 후보와 지금 고른 후보입니다. 옛 경로 서버면 후보가 비어 있고 비목만 고릅니다.
  // 주의: `선택분류` 가 null 이면 세목 없이 `category` 비목으로만 판정합니다.
  const [서버분류후보, set서버분류후보] = useState<분류값[]>([]);
  const [선택분류, set선택분류] = useState<분류값 | null>(null);
  // 「AI 점검하기」 때 서버에서 받은 확인 질문입니다. 예시 모드에서는 쓰지 않습니다.
  const [서버질문, set서버질문] = useState<확인질문[]>([]);
  const [질문세트, set질문세트] = useState<string | null>(null);
  // 질문 id → 값(예·아니오·모름).
  const [질문답변, set질문답변] = useState<Record<string, string>>({});
  const [서버칸, set서버칸] = useState<추가입력칸[]>([]);
  // 칸 키 → 입력한 글자. 비운 칸은 판정으로 보내지 않습니다.
  const [칸값, set칸값] = useState<Record<string, string>>({});
  const [서버풀이, set서버풀이] = useState<용어풀이항목[]>([]);
  // 지금 들고 있는 질문이 어떤 비목으로 받은 것인지 둡니다. 품목·목적·금액을 고치면 질문 자체가 비워집니다.
  const 질문키 = `${category}|${feeSubtype}|${선택분류?.표시문 ?? ""}|${웹조사}|${공개검색어}`;
  const [받은질문키, set받은질문키] = useState<string | null>(null);
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
  // 주의: 비목 라벨을 화면에 하드코딩하지 않습니다 — `/api/vocab` 이 기준 데이터입니다.
  //    (서버가 「기계장치」를 주고, 프론트의 「기계장치비」는 원문에 없는 말입니다)
  const 비목선택지 = use비목선택지();

  // 주의: 입력을 바꾸면 이전 정규화는 이 계획의 값이 아닙니다. 남겨 두면 판정이 옛 품목·금액으로 돕니다.
  //    AI 가 자동으로 고른 비목도 함께 비웁니다. 사용자가 직접 고른 비목은 둡니다.
  const 자동선택비목 = useRef<string | null>(null);
  useEffect(() => {
    set서버정규화(null);
    set정규화조사ID(undefined);
    set서버후보([]);
    set서버분류후보([]);
    set선택분류(null);
    set서버질문([]);
    set질문세트(null);
    set질문답변({});
    set서버칸([]);
    set칸값({});
    set서버풀이([]);
    set조사ID(undefined);
    set조사후보들([]);
    set직접확인들([]);
    set부족정보들([]);
    set조사답({});
    set조사확인단계(false);
    setCategory((v) => (v && v === 자동선택비목.current ? "" : v));
    자동선택비목.current = null;
  }, [name, purpose, amount, 부가세]);

  // 주의: 이 사업의 비목 목록에 없는 후보는 화면에 칸이 없어 무엇이 골렸는지 보이지 않으므로 뺍니다.
  const 표시후보 = 서버분류후보.filter((c) => 비목선택지.includes(c.비목));
  const 분류경로 = 표시후보.length > 0;
  const 고른비목후보 = 표시후보.filter((c) => c.비목 === category);
  /** 비목 칸을 눌렀을 때. 그 비목의 후보가 있으면 맨 앞 후보를, 없으면 세목 없이 비목만 고릅니다. */
  const 비목고르기 = (비목: string) => {
    setCategory(비목);
    set선택분류((지금) => (지금?.비목 === 비목 ? 지금 : 표시후보.find((c) => c.비목 === 비목) ?? null));
  };
  /**
   * 계획에 저장할 `정규화`. 계획 생성 API 에 세목 · 부가세 칸이 없어 이 값 안에 둡니다. 재점검이 여기서 읽습니다.
   * 주의: `수치` 가 없으면 옛 경로 서버입니다. 판정 캐시 키와 프롬프트에 들어가는 값이라 예전과 똑같이 그대로 보냅니다.
   * 주의: 비운 칸은 `수치` 에서도 지웁니다. 남겨 두면 재점검 때 지운 값이 다시 채워집니다.
   *    코드의 한도 비교는 `추가입력값` 만 읽으므로(`orchestrate.py::게이트_입력`) 이 값이 비교에 쓰이지는 않습니다.
   */
  const 저장할정규화 = () => {
    if (!서버정규화 || typeof 서버정규화["수치"] !== "object" || 서버정규화["수치"] === null) return 서버정규화;
    const 수치: Record<string, unknown> = { ...(서버정규화["수치"] as Record<string, unknown>) };
    for (const 칸 of 서버칸) delete 수치[칸.키];
    return {
      ...서버정규화,
      수치: {
        ...수치,
        ...추가입력값만들기(서버칸, 칸값),
        부가세구분: 부가세확정(부가세, 질문답변[부가세질문id]) ?? 부가세,
      },
      ...(선택분류?.세목 && step >= 2 ? { 확정세목: 선택분류.세목 } : {}),
    };
  };

  /**
   * 배지를 달 비목들. 서버가 후보를 주면 '준 만큼 전부'입니다. 서버 후보가 하나여도 배지는
   * 하나만 붙습니다 — 개수를 화면이 정하지 않고 서버가 정합니다.
   * 주의: 키워드 추정은 서버가 없는 예시 모드에서만 씁니다. 서버가 후보를 못 줬는데 키워드
   *    추정에 배지를 달면 「추천할 비목을 찾지 못했습니다」 문구와 어긋납니다.
   */
  const 추천비목 = useMemo(
    () => new Set(서버후보.length ? 서버후보.map((c) => c.비목) : API켜짐() ? [] : [recommendation]),
    [서버후보, recommendation],
  );
  /** 비목 → 설명. 서버가 `설명` 을 안 보내면 비어 있고, 그러면 설명 줄을 안 그립니다. */
  const 비목설명 = useMemo(
    () => new Map(서버후보.flatMap((c) => (c.설명 ? [[c.비목, c.설명] as const] : []))),
    [서버후보],
  );
  // 예시 모드 전용 질문표입니다. 서버 모드는 `서버질문` 을 그립니다.
  const questions =
    category === "지급수수료" ? FEE_QUESTIONS[feeSubtype] : 질문찾기(category);
  useEffect(() => {
    if (!categoryLoading) return;

    // ── 백엔드 없음 → 예전 애니메이션 그대로 ──
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
      부가세구분: 부가세,
    })
      .then((r) => {
        if (!살아있음) return;
        const { 조사ID: 토큰, ...정규화값 } = r.정규화;
        set정규화조사ID(typeof 토큰 === "string" ? 토큰 : undefined);
        set서버정규화(정규화값);
        // 주의: 후보가 '비어 있는 것도 정상' 입니다 (운영 서버 폼 경로). 그때는 사용자가 고릅니다.
        set서버후보(r.비목후보);
        set서버분류후보(r.분류후보);
        const 첫분류 = r.분류후보.find((c) => 비목선택지.includes(c.비목)) ?? null;
        set선택분류(첫분류);
        // 자동 선택은 가장 확신하는 '하나' 만. 배지는 후보 전부에 붙지만 커서는 하나다.
        // 주의: 후보가 없으면 지금 값을 그대로 둡니다. 처음이면 빈 값이고, 이전 단계로 돌아갔다
        //    다시 온 경우에는 사용자가 직접 고른 비목이 남습니다.
        // 주의: 이 사업의 비목 목록에 없는 후보는 화면에 칸이 없어 무엇이 골렸는지 보이지 않습니다.
        // 주의: 분류 후보가 있으면 그 맨 앞이 먼저입니다. 신뢰도로 다시 세운 비목 후보를 따르면 문구와 칸이 어긋납니다.
        const 첫후보 = 첫분류?.비목 ?? r.비목후보.map((c) => c.비목).find((b) => 비목선택지.includes(b));
        if (첫후보) {
          setCategory(첫후보);
          자동선택비목.current = 첫후보;
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
      부가세구분: 부가세,
      plannedDate: date,
      vendor: vendor || "거래처 미정",
      // 서버가 없는 예시 모드 전용입니다. 1단계 임시저장은 비목이 비어 있어 키워드 추정을 씁니다.
      category: categoryLabel || recommendation,
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
  const 필수입력됨 = Boolean(name.trim() && purpose.trim() && Number(amount.replace(/,/g, "")) > 0);
  /** 서버에 계획을 만들고 plan_id 를 돌려줍니다. */
  const 서버에저장 = () =>
    계획추가({
      사업명: 현재사업(),
      품목: name,
      금액: Number(amount.replace(/,/g, "")) || 0,
      용도: purpose,
      제목: name,
      집행예정일: date || undefined,
      거래처: vendor || undefined,
      // 주의: 화면 9 에서 '사용자가 확정한' 비목입니다. 서버가 enum 10종으로 검증합니다.
      //    1단계에서 임시저장하면 아직 비목을 고르지 않았으므로 보내지 않습니다 — 보내면 초기값이
      //    확정비목으로 저장되고, 나중 판정이 그 비목으로 강제됩니다.
      확정비목: step >= 2 && category ? category.split(" · ")[0] : undefined,
      정규화: 저장할정규화() ?? undefined,
    });

  /**
   * 계획을 만든 직후 고른 파일을 올립니다. 결과는 상세 화면의 첨부 목록에 나타나고, 실패한 파일은
   * 거기서 다시 올릴 수 있습니다.
   * 주의: 점검 시작과 점검 끝에 모두 불리므로 한 번만 올립니다.
   */
  const 첨부넘긴 = useRef(false);
  const 첨부넘기기 = (planId: string) => {
    if (첨부넘긴.current) return;
    첨부넘긴.current = true;
    attachments.forEach((file) => {
      void 첨부올리기(planId, file).then((저장됨) => {
        if (!저장됨) notify(`「${file.name}」 파일을 저장하지 못했습니다. 계획 상세에서 다시 올려 주세요.`);
      });
    });
  };

  const 저장 = (계획: ExpensePlan, 임시?: boolean, 점검오류?: string) => {
    첨부넘기기(계획.id);
    save(계획, 임시, 점검오류);
  };

  const 점검시작 = (계획: ExpensePlan, planId?: string, 받은조사ID?: string, 받은조사답?: 조사답변[], 받은질문세트?: string | null) => {
    // 창을 닫으면 이 화면을 떠나므로 첨부파일을 먼저 올립니다.
    첨부넘기기(계획.id);
    판정시작({
      계획,
      count: 1,
      planId,
      제목: "AI가 지출계획을 작성하고 있어요.",
      대체입력: {
        사업명: 현재사업(),
        확정비목: category.split(" · ")[0],
        정규화: 저장할정규화(),
        제목: name,
        용도: purpose,
        금액: Number(amount.replace(/,/g, "")) || 0,
      },
      답변: 서버질문
        .filter((q) => 질문답변[q.id])
        .map((q) => ({ code: q.id, 값: 질문답변[q.id] })),
      질문세트: 받은질문세트 === undefined ? 질문세트 : 받은질문세트,
      조사ID: 받은조사ID ?? 조사ID,
      조사답변: 받은조사답 ?? Object.values(조사답),
      이전진행: 진행Ref.current,
      추가입력값: 추가입력값만들기(서버칸, 칸값),
      확정세목: 선택분류?.세목 ?? null,
      부가세구분: 부가세,
      끝남: (판정된계획, 오류) => {
        if (오류) {
          set연동오류(오류);
          저장(계획, false, 오류);      // 저장은 됐으니 상세로 보내되, 점검 실패를 알립니다
        } else {
          저장(판정된계획 ?? 계획);
        }
      },
    });
  };

  const submit = (받은조사ID?: string, 받은조사답?: 조사답변[], 받은질문세트?: string | null) => {
    if (!API켜짐()) {
      점검시작(buildPlan(false), undefined, 받은조사ID, 받은조사답, 받은질문세트);
      return Promise.resolve();
    }
    set저장중(true);
    set연동오류(null);
    return 서버에저장()
      .then((d) => {
        점검시작(상세를계획으로(d), String(d.plan_id), 받은조사ID, 받은조사답, 받은질문세트);
      })
      .catch((e: unknown) => {
        set연동오류(e instanceof Error ? e.message : "저장하지 못했습니다");
      })
      .finally(() => set저장중(false));
  };

  useEffect(() => {
    if (!questionsLoading) return;

    // ── 백엔드 없음 → 예전 애니메이션 그대로 ──
    if (!API켜짐()) {
      const timer = window.setTimeout(() => {
        setStep(3);
        setQuestionsLoading(false);
      }, 1600);
      return () => window.clearTimeout(timer);
    }

    // ── 서버에서 확인 질문 받기 ──
    let 살아있음 = true;
    set조사오류("");
    if (!조사확인단계) { 진행Ref.current = []; set진행항목들([]); set진행시작(Date.now()); }
    const 질문원문 = 서버정규화?.["질문원문"];
    void 질문가져오기({
      사업명: 현재사업(),
      확정비목: category.split(" · ")[0],
      확정세목: 선택분류?.세목 ?? null,
      부가세구분: 부가세,
      // 주의: 세부 유형 칸은 분류 후보가 없을 때만 보입니다. 안 보이는 기본값(멘토링)을 서버로 보내면 안 됩니다.
      세부유형: category === "지급수수료" && !분류경로 ? feeSubtype : null,
      품목: 서버정규화 ? (typeof 서버정규화.품목 === "string" ? 서버정규화.품목 : "") : name,
      금액: 서버정규화 ? (typeof 서버정규화.금액 === "number" ? 서버정규화.금액 : null) : Number(amount.replace(/,/g, "")) || 0,
      용도: 서버정규화 ? (typeof 서버정규화.용도 === "string" ? 서버정규화.용도 : "") : purpose,
      질문원문: typeof 질문원문 === "string" && 질문원문 ? 질문원문 : undefined,
      조사ID: 받은질문키 && 받은질문키 !== 질문키 ? undefined : 정규화조사ID,
      웹조사, ...(웹조사 ? 검색입력나누기(공개검색어) : {}),
      ...(조사확인단계 ? { 조사ID, 조사답변: Object.values(조사답) } : {}),
    }, (항목) => { if (살아있음) { 진행Ref.current = 진행추가(진행Ref.current, 항목); set진행항목들(진행Ref.current); } }).then((r) => {
      if (!살아있음) return;
      // 주의: id(Q1…)는 묶음마다 다시 매겨져 옛 답이 다른 질문의 답으로 나가면 안 됩니다.
      set서버질문(r.질문);
      set조사ID(r.조사ID);
      if (!조사확인단계) {
        set조사후보들(r.조사후보 ?? []);
        set직접확인들(r.사용자확인 ?? []);
        set부족정보들(r.부족정보 ?? []);
        set조사답({});
      }
      set조사확인단계(r.상태 === "조사확인");
      set질문세트(r.질문세트);
      set질문답변({});
      set서버칸(r.추가입력);
      set서버풀이(r.용어풀이);
      // 다른 세목으로 다시 받아도 키가 같은 칸에 적은 값은 둡니다. 입력을 고치면 위에서 전부 비웁니다.
      const 수치 = 서버정규화?.["수치"];
      set칸값((지금) => ({
        ...추가입력초기값(r.추가입력, typeof 수치 === "object" && 수치 !== null ? (수치 as Record<string, unknown>) : undefined),
        ...지금,
      }));
      if (r.질문.length || r.추가입력.length || r.상태 === "조사확인") {
        set받은질문키(질문키);
        set연동오류(null);
        setStep(3);
        setQuestionsLoading(false);
        return;
      }
      // 질문이 없거나 실패·제한 시간 초과. 3단계 없이 바로 판정합니다.
      // 주의: 저장이 끝날 때까지 로딩 창을 둡니다. 먼저 닫으면 2단계 화면이 잠깐 비쳤다가 판정 창이 뜹니다.
      set받은질문키(null);
      void submit(r.조사ID, 조사확인단계 ? Object.values(조사답) : [], r.질문세트).finally(() => setQuestionsLoading(false));
    }).catch((오류: unknown) => {
      if (!살아있음) return;
      set정규화조사ID(undefined);
      set조사ID(undefined);
      set조사확인단계(false);
      set조사답({});
      set조사후보들([]);
      set직접확인들([]);
      set부족정보들([]);
      set서버질문([]);
      set질문세트(null);
      set서버칸([]);
      set받은질문키(null);
      setStep(2);
      set조사오류(오류 && typeof 오류 === "object" && "status" in 오류 && 오류.status === 503 ? "규정을 확인하지 못했어요. 잠시 후 다시 확인해 주세요." : 조사확인단계 ? "규정 질문을 받지 못했어요. 검색 없이 계속하거나 다시 확인해 주세요." : 웹조사 ? "공개 정보를 확인하지 못했어요. 입력한 내용으로 계속 점검하거나 나중에 다시 시도해 주세요." : "확인할 내용을 받지 못했어요. 다시 확인해 주세요.");
      setQuestionsLoading(false);
    });
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsLoading]);

  // v025: 검색 칸이 STEP 1 로 옮겨 가서, 검색 중에도 진행 창에서 작업을 보여 줍니다.
  const 검색중 = questionsLoading && 웹조사 && !조사확인단계;
  /** 2단계의 「AI 점검하기」. 확인 질문과 (켜져 있으면) 공개 검색을 한 요청으로 보냅니다. */
  const 둘째단계다음 = () => {
    // 주의: 「이전」으로 왔다가 그대로 돌아가면 다시 받지 않습니다. 다시 받다 실패하면 답이 사라집니다.
    if (API켜짐() && (서버질문.length || 서버칸.length || 조사후보들.length || 웹조사) && 받은질문키 === 질문키) setStep(3);
    else { set조사확인단계(false); set조사ID(undefined); setQuestionsLoading(true); }
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
                  예상 금액 <em className="required-mark">*</em>
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
                부가세 구분
                <select value={부가세} onChange={(e) => set부가세(e.target.value as 부가세구분)}>
                  <option value="포함">부가세 포함 금액이에요</option>
                  <option value="공급가액">공급가액이에요 (부가세 별도)</option>
                  <option value="모름">모르겠어요</option>
                </select>
              </label>
              <label>
                예상 지출일
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
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
                    <small>견적서·과업자료 등이 있다면 첨부해주세요. 보관용이며 AI 점검에는 쓰이지 않습니다.</small>
                  </span>
                  <label className="new-plan-file-button">
                    <input
                      type="file"
                      multiple
                      accept={첨부accept}
                      onChange={(event) => {
                        const { 통과, 안내 } = 첨부검사(attachments.length, Array.from(event.target.files || []));
                        if (안내) set연동오류(안내);
                        if (통과.length) setAttachments((current) => [...current, ...통과]);
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
            {/* v025: 공개 정보 검색은 STEP 1 에서 켜고 검색어를 적습니다. 검색은 비목이 정해진 뒤
                STEP 2 「AI 점검하기」 때 확인 질문 요청과 함께 나갑니다(같은 요청). */}
            {API켜짐() && (
              <공개검색설정 사용={웹조사} 설정={set웹조사} 검색어={공개검색어} 검색어변경={set공개검색어} />
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h2>AI 비목 추천</h2>
            <p className="section-copy">
              {추천비목.size
                ? "입력한 지출 내용과 목적을 바탕으로 가장 가까운 비목을 자동 선택했습니다. 직접 변경할 수 있습니다."
                : "추천할 비목을 찾지 못했습니다. 지출 내용에 맞는 비목을 직접 골라 주세요."}
            </p>
            {/* 주의: 분류 확인은 필수입니다. 첫 후보를 골라 두지만 아래 「AI 점검하기」를 눌러야 그 분류로 판정합니다. */}
            {분류경로 && category && (
              <div className="auto-check-note classification-note">
                <Icon name="check" />
                <span>
                  <b>
                    {선택분류?.표시문 ?? category}
                    {로조사(선택분류?.표시문 ?? category)} 보고 판정해요
                  </b>
                  맞으면 「AI 점검하기」를 눌러 주세요. 다르면 아래에서 고칠 수 있어요.
                </span>
              </div>
            )}
            <div className="category-grid">
              {비목선택지.map((item) => {
                const 추천됨 = 추천비목.has(item);
                const 설명 = 비목설명.get(item);
                return (
                  <button
                    key={item}
                    className={`${category === item ? "selected" : ""} ${추천됨 ? "recommended" : ""}`}
                    onClick={() => 비목고르기(item)}
                  >
                    <span className="category-name">
                      {item}
                      {/* 주의: 서버가 설명을 보낼 때만 그립니다. 없으면 이 줄 자체가 없어
                          카드 높이도 예전 그대로입니다. */}
                      {설명 && <small>{설명}</small>}
                    </span>
                    {추천됨 && (
                      <em>
                        <Icon name="sparkSolid" size={11} />
                        AI 추천
                      </em>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 주의: 세목은 서버가 준 후보 안에서만 고릅니다. 다른 글자를 확정세목으로 보내면 서버가 판단불가로 끝냅니다. */}
            {고른비목후보.some((c) => c.세목) && (
              <section className="fee-subtype-panel">
                <header>
                  <b>어떤 {category}인가요?</b>
                  <span>세목에 따라 한도와 확인 기준이 달라져요. 잘 모르면 세목 없이 점검할 수 있어요.</span>
                </header>
                <div>
                  {고른비목후보.map((c) => (
                    <button
                      key={c.표시문}
                      className={선택분류?.표시문 === c.표시문 ? "selected" : ""}
                      onClick={() => set선택분류(c)}
                    >
                      {c.세목 ?? c.비목}
                    </button>
                  ))}
                  {!고른비목후보.some((c) => !c.세목) && (
                    <button className={!선택분류 ? "selected" : ""} onClick={() => set선택분류(null)}>
                      잘 모르겠어요
                    </button>
                  )}
                </div>
              </section>
            )}
            {category === "지급수수료" && !분류경로 && (
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
            {API켜짐() && 웹조사 && (
              <div className="auto-check-note public-search-note">
                <Icon name="search" />
                <span>
                  <b>공개 정보 검색: {공개검색어}</b>
                  「AI 점검하기」를 누르면 함께 찾아요. 바꾸려면 「이전」을 눌러 주세요.
                </span>
              </div>
            )}
            {조사오류 && (
              <div role="alert">
                <p>{조사오류}</p>
                {웹조사 && (
                  <button type="button" className="outline small" onClick={() => { set웹조사(false); setQuestionsLoading(true); }}>
                    검색 없이 계속
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="additional-check-title">{조사확인단계 ? "공개 정보를 확인해 주세요" : "몇 가지만 추가로 확인할게요"}</h2>
            <p className="section-copy additional-check-copy">
              {조사확인단계
                ? "검색한 내용이 맞는지 확인해 주세요. 확인한 내용으로 규정 질문을 준비합니다."
                : API켜짐()
                ? "입력한 지출에 맞춰 규정에서 확인할 사항을 골랐어요."
                : category === "지급수수료"
                  ? `${feeSubtype} 기준에서 확인할 사항입니다.`
                  : `${category} 규정에서 확인할 사항입니다.`}
            </p>
            {조사확인단계 && !!진행항목들.length && <작업로그 className="research-stream" 항목들={진행항목들} 진행중={false} 시작={진행시작} 기본문장="공개 정보 검색을 마쳤어요." 끝문장="공개 정보 검색을 마쳤어요." />}
            {조사확인단계 && !!조사후보들.length && <조사확인 후보={조사후보들} 답={조사답} 검색어={검색입력나누기(공개검색어).공개검색어} 변경={(v) => set조사답((이전) => ({ ...이전, [v.id]: v }))} />}
            {조사확인단계 && !조사후보들.length && <p>확인된 공개 정보가 없어요. 입력한 내용으로 계속 점검할 수 있어요.</p>}
            {조사확인단계 && !!부족정보들.length && <p>더 확인이 필요한 공개 정보: {부족정보들.map(유형표기).join(" · ")}</p>}
            {조사확인단계 && <직접확인안내 항목들={직접확인들} />}
            <div className="auto-check-note">
              <Icon name="check" />
              <span>
                <b>입력한 내용으로 점검합니다</b>품목·예상 금액·사용
                목적이 자동 점검에 반영됩니다.
              </span>
            </div>
            <div className="question-list">
              {API켜짐() && (
                <추가입력칸목록 칸들={서버칸} 값들={칸값} onChange={(키, v) => set칸값((prev) => ({ ...prev, [키]: v }))} />
              )}
              {조사확인단계 ? null : API켜짐()
                ? 서버질문.map((q) => (
                    <확인질문카드
                      key={`${질문세트}-${q.id}`}
                      질문={q}
                      값={질문답변[q.id]}
                      풀이={서버풀이}
                      onChange={(v) => set질문답변((prev) => ({ ...prev, [q.id]: v }))}
                    />
                  ))
                : questions.map((question, index) => (
                    <Question
                      key={`${category}-${feeSubtype}-${index}`}
                      label={question.label}
                      options={question.options}
                    />
                  ))}
            </div>
            <div className="info-note">
              <Icon name="spark" />
              {/* 주의: 예시 모드는 판정을 부르지 않아 답이 어디에도 쓰이지 않으므로 그 사실을 그대로 둡니다. */}
              {조사확인단계 ? "모르면 모르겠어요를 선택해 주세요." : API켜짐()
                ? 서버질문.length
                  ? "답변을 반영해 판정합니다. 모르면 모르겠어요를 눌러 주세요."
                  : "채운 값을 반영해 판정합니다. 모르면 비워 두세요."
                : "답변은 아직 AI 점검에 반영되지 않습니다. 품목·금액·사용 목적으로 공통 기준과 비목별 기준을 점검합니다."}
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
        {/* 주의: 계획 수정이 서버에 저장되지 않아, 비어 있는 채로 임시저장하면 채울 방법이 없고
            0원·빈 목적으로 판정될 수 있습니다. 필수 항목을 채워야 저장합니다. */}
        <button className="outline draft-save" onClick={saveDraft} disabled={categoryLoading || questionsLoading || 저장중 || !필수입력됨}>
          임시저장
        </button>
        <button
          className="primary"
          disabled={
            categoryLoading ||
            questionsLoading ||
            저장중 ||
            !필수입력됨 ||
            (step === 1 && 웹조사 && !공개검색어.trim()) ||
            (step >= 2 && !category) ||
            (step === 2 && 웹조사 && !공개검색어.trim()) ||
            (step === 3 && (서버질문.some((q) => !질문답변[q.id]) || (조사확인단계 && 조사후보들.some((c) => !조사답[c.id]))))
          }
          onClick={() => {
            if (step === 1) {
              setCategoryLoading(true);
            } else if (step === 2) {
              둘째단계다음();
            } else if (조사확인단계) setQuestionsLoading(true);
            else submit();
          }}
        >
          {step === 1
            ? "비목 확인하기"
            : step === 2
              ? (조사오류 ? "다시 확인" : "AI 점검하기")
              : 조사확인단계 ? "규정 확인하기" : "결과 확인하기"}
        </button>
      </footer>
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
            <h2 id="category-analysis-title">{검색중 ? "공개 정보를 검색하고 있어요." : questionsLoading ? "AI가 내용을 점검하고 있어요." : "입력한 내용을 분석하고 있어요"}</h2>
            <p>{questionsLoading ? "서버 응답을 기다리고 있어요." : "지출 항목과 사용 목적을 바탕으로 적합한 비목을 찾고 있습니다."}</p>
            {questionsLoading && <작업로그 항목들={진행항목들} 진행중 시작={진행시작} 기본문장="확인할 내용을 준비하고 있어요." 펼침기본 />}
            <small>잠시만 기다려주세요.</small>
          </section>
        </div>
      )}
    </div>
  );
}

/**
 * 용어 하나를 찾는 식. 서버 `ontology_terms._식` 과 같은 규칙이어야 합니다:
 * 글자 사이 띄어쓰기 무시(「사전 심의」 = 「사전심의」) · 낱말 앞 경계(「예비창업자」 안의 「창업」 아님) · 영문 · 숫자로 끝나면 뒤 경계.
 */
function 용어식(용어: string): RegExp | null {
  const 글자 = Array.from(용어.replace(/\s+/g, ""));
  if (글자.length < 2) return null;
  const 몸 = 글자.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
  const 뒤 = /[A-Za-z0-9]/.test(글자[글자.length - 1]) ? "(?![A-Za-z0-9])" : "";
  return new RegExp(`(?<![가-힣A-Za-z0-9])${몸}${뒤}`, "g");
}

/**
 * 이 글에 나온 말의 풀이. 서버 `ontology_terms.글에서_찾기` 와 같이 긴 용어가 자리를 먼저 차지하고
 * (「사업비 정산」 안의 「사업비」는 세지 않음), 처음 나온 순서로 돌려줍니다.
 */
function 글에_나온_풀이(글: string, 풀이: 용어풀이항목[]): 용어풀이항목[] {
  const 후보: { 길이: number; 시작: number; 끝: number; i: number }[] = [];
  풀이.forEach((t, i) => {
    const 식 = 용어식(t.용어);
    if (!식) return;
    const 길이 = t.용어.replace(/\s+/g, "").length;
    for (const m of 글.matchAll(식)) 후보.push({ 길이, 시작: m.index ?? 0, 끝: (m.index ?? 0) + m[0].length, i });
  });
  후보.sort((a, b) => b.길이 - a.길이 || a.시작 - b.시작 || a.끝 - b.끝 || a.i - b.i);
  const 덮임 = new Array<boolean>(글.length).fill(false);
  const 첫자리 = new Map<number, number>();
  for (const h of 후보) {
    if (덮임.slice(h.시작, h.끝).some(Boolean)) continue;
    덮임.fill(true, h.시작, h.끝);
    첫자리.set(h.i, Math.min(첫자리.get(h.i) ?? h.시작, h.시작));
  }
  return [...첫자리.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => 풀이[i]);
}

/**
 * 3단계 확인 질문 한 개. 재점검 창이 함께 쓰는 `Question` 과 달리 이유와 규정 원문이 딸려 있습니다.
 * 주의: 세 버튼은 칸 너비까지 같게 둡니다. 「모르겠어요」가 작거나 흐리면 모른다고 답하기 어려워집니다.
 */
function 확인질문카드({
  질문,
  값,
  풀이,
  onChange,
}: {
  질문: 확인질문;
  값?: string;
  /** 서버가 준 어려운 말 풀이 전체. 이 질문 문장에 나오는 말만 그립니다. */
  풀이?: 용어풀이항목[];
  onChange: (값: string) => void;
}) {
  const 근거 = 질문.근거;
  const 이질문풀이 = 글에_나온_풀이(질문.질문문, 풀이 ?? []);
  return (
    <div className="question confirm-question">
      <div className="confirm-question-text">
        <b>{질문.질문문}</b>
        {질문.이유 && <p>{질문.이유}</p>}
        {이질문풀이.map((t) => (
          <p className="confirm-question-term" key={t.용어}>
            <strong>{t.용어}</strong> {t.풀이}
          </p>
        ))}
      </div>
      <div className="confirm-question-options" role="group" aria-label={질문.질문문}>
        {질문.선택지.map((s) => (
          <button
            key={s.값}
            type="button"
            className={값 === s.값 ? "active" : ""}
            aria-pressed={값 === s.값}
            onClick={() => onChange(s.값)}
          >
            {s.라벨}
          </button>
        ))}
      </div>
      {근거 && (
        <details className="confirm-question-source">
          <summary>
            규정 원문 보기
            <Icon name="arrow" size={13} />
          </summary>
          <div>
            <small>
              {[문서명보기(근거.doc_id), 근거.조번호, 근거.조제목, 근거.항호].filter(Boolean).join(" ")}
            </small>
            <규정원문 글={근거.원문} />
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * 3단계 숫자·선택 칸. 코드가 확정 세목의 한도에서 만든 칸이고, 질문과 달리 비워 둬도 넘어갑니다.
 * 칸이 없으면(옛 경로 서버 포함) 아무것도 그리지 않습니다.
 */
function 추가입력칸목록({
  칸들,
  값들,
  onChange,
}: {
  칸들: 추가입력칸[];
  값들: Record<string, string>;
  onChange: (키: string, 값: string) => void;
}) {
  if (!칸들.length) return null;
  return (
    <section className="question extra-inputs">
      <header className="confirm-question-text">
        <b>아는 값만 채워 주세요</b>
        <p>비워 두면 그 기준은 확인하지 않고, 결과에 무엇을 더 알려 주시면 되는지 안내해요.</p>
      </header>
      <div className="field-grid">
        {칸들.map((칸) => (
          <label key={칸.키}>
            {칸.단위 ? `${칸.라벨} (${칸.단위})` : 칸.라벨}
            {칸.형식 === "선택" ? (
              <select value={값들[칸.키] ?? ""} onChange={(e) => onChange(칸.키, e.target.value)}>
                <option value="">모르겠어요</option>
                {칸.선택지?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                inputMode="decimal"
                value={값들[칸.키] ?? ""}
                onChange={(e) => onChange(칸.키, e.target.value.replace(/[^0-9.]/g, ""))}
              />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}

/**
 * 결과 화면의 「확인한 내용」. 답한 내용이 없는 판정(옛 계획·재점검)에는 그리지 않습니다.
 * `조건` 은 질문 화면 선택 칸(거래 상대 등)의 답입니다. 「해당 없음」이면 그 답으로 빠진 「안 되는 경우」 문장을 아래에 둡니다.
 * 주의: 답은 증빙이 아니라서 판정은 조건부로 남습니다. 문장을 지우지 않고 여기로 옮겨 보여 주는 이유입니다.
 */
function 확인한내용({ 항목, 조건 }: { 항목?: 사용자답변항목[]; 조건?: 확인한조건항목[] }) {
  if (!항목?.length && !조건?.length) return null;
  return (
    <section className="ai-confirmed">
      <b>확인한 내용</b>
      <ul>
        {(조건 ?? []).map((c, index) => (
          <li key={`조건-${index}`}>
            <span>{c.항목}</span>
            <strong>{c.답}</strong>
            {c.문장.length > 0 && (
              <small>
                답하신 대로면 아래 경우에 해당하지 않아요. 증빙으로 확인되기 전이라 판정은 조건부예요.
                {c.문장.map((s) => (
                  <span key={s}>· {s}</span>
                ))}
              </small>
            )}
            {c.해당문장.length > 0 && <small>답하신 대로면 위 「이런 경우에는 안 돼요」의 기준에 해당해요.</small>}
          </li>
        ))}
        {(항목 ?? []).map((a, index) => (
          <li key={index}>
            <span>{a.질문문}</span>
            <strong>{답표기(a.답)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 코드가 규범과 입력값을 비교한 결과. 「확인한 내용」과 같은 카드 모양입니다.
 * 주의: 부가세 기준 미정은 두 경우입니다. 입력이 모름이면 사용자가 고르면 풀립니다. 입력을 이미 골랐는데 나왔으면
 *    규범에 부가세 기준이 없는 경우라(`ontology_gate.py::_후보금액`) 다시 골라도 같으므로 다시 점검하라고 하지 않습니다.
 */
/** 복원 문서의 표(`| 칸 | 칸 |`)는 표로 그리고, 쪽 표시(`[p.12]`)와 구분선은 뺍니다. 표가 없는 원문은 문단으로 나옵니다. */
function 규정원문({ 글 }: { 글: string }) {
  type 블록 = { 표: string[][] } | { 문단: string };
  const 블록들: 블록[] = [];
  let 문단: string[] = [];
  let 표이어짐 = false;
  const 문단닫기 = () => {
    if (문단.length) 블록들.push({ 문단: 문단.join(" ") });
    문단 = [];
  };
  for (const 원줄 of 글.replace(/\[p\.\d+\]/g, "").split("\n")) {
    const 줄 = 원줄.trim();
    if (!줄) {
      문단닫기();
      표이어짐 = false;
      continue;
    }
    if (줄.startsWith("|") || 줄.split("|").length >= 3) {
      문단닫기();
      const 칸들 = 줄.replace(/^\|/, "").replace(/\|$/, "").split("|").map((칸) => 칸.trim());
      if (칸들.every((칸) => !칸 || /^-+$/.test(칸))) continue;
      const 끝 = 블록들[블록들.length - 1];
      if (표이어짐 && 끝 && "표" in 끝) 끝.표.push(칸들);
      else 블록들.push({ 표: [칸들] });
      표이어짐 = true;
      continue;
    }
    표이어짐 = false;
    if (줄.startsWith("- ")) 문단닫기();
    문단.push(줄);
  }
  문단닫기();
  return (
    <>
      {블록들.map((블록, i) =>
        "표" in 블록 ? (
          <div className="regulation-table" key={i}>
            <table>
              <tbody>
                {블록.표.map((칸들, r) => (
                  <tr key={r}>
                    {칸들.map((칸, c) => (
                      <td key={c}>{칸}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p key={i}>{블록.문단}</p>
        ),
      )}
    </>
  );
}

const 부가세_고를수있음 = (부가세?: 부가세구분) => 부가세 !== "포함" && 부가세 !== "공급가액";

/** 코드가 낸 결론은 "가능성" 으로 말하지 않습니다. */
function 코드판정제목(판정: 코드판정값 | null | undefined, 분류: string): string | null {
  if (!판정) return null;
  if (판정.종류 === "부가세기준미정") return "부가세 기준을 알아야 판정할 수 있습니다.";
  return `${분류 ? `${분류} ` : ""}규정상 집행할 수 없습니다.`;
}

function 코드판정카드({
  판정,
  부가세,
  문의처,
  다시점검,
}: {
  판정: 코드판정값;
  부가세?: 부가세구분;
  문의처?: string | null;
  다시점검: () => void;
}) {
  const 고를수있음 = 판정.종류 === "부가세기준미정" && 부가세_고를수있음(부가세);
  const 제목 =
    판정.종류 === "한도초과"
      ? "규정의 한도를 넘어요"
      : 판정.종류 === "금지"
        ? "규정에서 집행을 막은 항목이에요"
        : "부가세 기준을 정해야 판정할 수 있어요";
  const 설명 =
    판정.종류 === "한도초과"
      ? 판정.비교값 && 판정.한도
        ? `${판정.비교값} > 한도 ${판정.한도}`
        : null
      : 판정.종류 === "금지"
        ? null
        : 고를수있음
          ? "입력한 금액에 부가세가 포함됐는지에 따라 결과가 달라져요. 부가세 포함 여부를 골라 다시 점검해 주세요."
          : `규정에 금액의 부가세 기준이 적혀 있지 않아 결과를 정하지 못했어요. ${문의처 || "주관기관에"} 확인해 주세요.`;
  return (
    <section className="ai-confirmed ai-code-verdict">
      <b>{제목}</b>
      {설명 && <p>{설명}</p>}
      {판정.발췌 && (
        <div className="ai-code-excerpt">
          <small>규정 원문</small>
          <규정원문 글={판정.발췌} />
        </div>
      )}
      {고를수있음 && (
        <button type="button" className="outline small" onClick={다시점검}>
          부가세 고르고 다시 점검하기
        </button>
      )}
    </section>
  );
}

/** 결과 화면의 조건·근거 경로 목록. 비어 있으면 그리지 않습니다. */
function 결과문장목록({ 제목, 항목 }: { 제목: string; 항목?: string[] }) {
  if (!항목?.length) return null;
  return (
    <section className="ai-confirmed">
      <b>{제목}</b>
      <ul>
        {항목.map((문장, index) => (
          <li key={index}>
            <span>{문장}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * v031: AI 해설 상자 안의 「꼭 알아야 할 것」 — 조건 묶음에서 최대 3개만 보입니다.
 *    우선순위: 안 되는 경우 → 기한 → 조건(같은 종류 안에서는 서버가 보낸 순서). 같은 문장은 한 번만 씁니다.
 *    이미 답으로 해소된 「안 되는 경우」는 빼고, 답대로면 걸리는 것은 맨 앞에 둡니다.
 *    나머지 조건은 지우지 않고 「조건·근거 자세히 보기」에 원래 분류대로 둡니다.
 */
function 꼭알아야할것({ plan }: { plan: ExpensePlan }) {
  // 「확인한조건」: `문장` = 답으로 해소된 금지 기준, `해당문장` = 답대로면 걸리는 금지 기준.
  //    해소된 것은 빼고, 걸리는 것은 맨 앞에 둡니다.
  const 해소 = new Set((plan.확인한조건 ?? []).flatMap((c) => c.문장));
  const 걸림 = new Set((plan.확인한조건 ?? []).flatMap((c) => c.해당문장));
  const 금지 = (plan.금지조건 ?? [])
    .filter((문장) => !해소.has(문장) || 걸림.has(문장))
    .sort((a, b) => Number(걸림.has(b)) - Number(걸림.has(a)));
  const 후보 = [
    ...금지.map((문장) => ({ 문장, 종류: "안 돼요", 색: "risk" })),
    ...(plan.기한조건 ?? []).map((문장) => ({ 문장, 종류: "기한", 색: "warn" })),
    ...(plan.조건 ?? []).map((문장) => ({ 문장, 종류: "조건", 색: "info" })),
  ].filter((x, i, 전체) => 전체.findIndex((y) => y.문장 === x.문장) === i);
  if (!후보.length) return null;
  return (
    <div className="ai-must-know">
      <b>꼭 알아야 할 것</b>
      <ul>
        {후보.slice(0, 3).map((x) => (
          <li key={x.문장}>
            <em className={`must-tag ${x.색}`}>{x.종류}</em>
            <span>{x.문장}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** v031: 「조건·근거 자세히 보기」 안의 조건 묶음. 제목과 개수만 보이고, 필요한 묶음만 폅니다. */
function 결과접는묶음({ 제목, 항목 }: { 제목: string; 항목?: string[] }) {
  if (!항목?.length) return null;
  return (
    <details className="ai-confirmed ai-confirmed-fold">
      <summary>
        <b>
          {제목} <small>{항목.length}</small>
        </b>
        <Icon name="arrow" size={13} />
      </summary>
      <ul>
        {항목.map((문장, index) => (
          <li key={index}>
            <span>{문장}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** 결과 화면의 어려운 말 풀이. 비어 있으면 그리지 않습니다. */
function 결과용어풀이({ 항목 }: { 항목?: 용어풀이항목[] }) {
  if (!항목?.length) return null;
  return (
    <section className="ai-confirmed ai-term-list">
      <b>어려운 말 풀이</b>
      <ul>
        {항목.map((t) => (
          <li key={t.용어}>
            <strong>{t.용어}</strong>
            <span>{t.풀이}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 주의: 2026-09-07 — 예전엔 답을 `useState` 로만 들고 있어 부모가 못 봤습니다.
 *    「확인 필요」를 눌러도 어디로도 안 갔습니다. `value`/`onChange` 를 주면 부모
 *    state 를 그대로 보여주는 '제어' 컴포넌트가 되고, 안 주면 예전 그대로(내부에만
 *    담아두는) 동작이라 다른 호출부(재점검 모달)를 안 건드려도 됩니다.
 */
function Question({
  label,
  options = ["예", "아니오", "확인 필요"],
  value,
  onChange,
  근거조번호,
}: CheckQuestion & {
  value?: string;
  onChange?: (value: string) => void;
  /** 왜 묻는지 — 근거 조번호만 작게 보여줍니다. doc_id 원문은 넘기지 않습니다. */
  근거조번호?: string;
}) {
  const [내부값, set내부값] = useState("");
  const 제어됨 = value !== undefined;
  const 현재값 = 제어됨 ? value : 내부값;
  return (
    <div className="question">
      <b>
        {label}
        {근거조번호 && <small className="question-basis"> · {근거조번호}</small>}
      </b>
      <div>
        {options.map((option) => (
          <button
            key={option}
            className={현재값 === option ? "active" : ""}
            onClick={() => {
              if (!제어됨) set내부값(option);
              onChange?.(option);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 「판단불가」일 때 서버가 함께 보내주는 '주관기관에 보낼 문의 초안'.
 *
 * 주의: 서버가 LLM 을 한 번도 더 부르지 않고 판정이 이미 가진 값(품목·금액·인용·전제)으로
 *    작성합니다(`server/inquiry.py`). 값이 없으면 키 자체가 안 오므로, 부르는 쪽에서
 *    `plan.문의초안` 이 있을 때만 그립니다.
 *
 * 주의: v031부터 펼쳐 둡니다. 판단불가에서 사용자가 할 일이 '문의' 라서, AI 해설 바로
 *    아래로 옮기고 본문을 바로 보이게 했습니다. 접기 버튼은 그대로 둡니다.
 */
function 문의초안카드({
  초안: 서버초안,
  문의처,
  notify,
}: {
  초안: string;
  문의처?: string | null;
  notify: (message: string) => void;
}) {
  const [복사됨, set복사됨] = useState(false);
  // v030: 서버는 팀 이름을 확실히 몰라 「[팀명]」 자리표시자로 보냅니다(`server/inquiry.py`).
  //    팀 이름의 기준은 Supabase 계정 정보라 여기서 채웁니다. 모르면 자리표시자를 남겨 사용자가 채웁니다.
  const 팀이름 = use팀이름();
  const 초안 = 팀이름 ? 서버초안.replaceAll("[팀명]", 팀이름) : 서버초안;

  const 복사 = async () => {
    try {
      // 주의: clipboard API 는 https / localhost 에서만 됩니다. 막히면 조용히 실패하지
      //    않고 '선택해서 복사하세요' 로 안내합니다 — 눌렀는데 아무 일도 안 나는 게
      //    제일 나쁩니다.
      await navigator.clipboard.writeText(초안);
      set복사됨(true);
      window.setTimeout(() => set복사됨(false), 2000);
    } catch {
      notify("복사하지 못했습니다. 아래 글을 직접 선택해 복사해주세요.");
    }
  };

  return (
    <details className="ai-inquiry" open>
      <summary>
        <div className="ai-inquiry-title">
          <Icon name="fileText" size={20} />
          <div>
            <b>{문의처 || "주관기관에"} 보낼 문의 초안</b>
            <small>규정만으로 결론이 안 나서, 물어볼 내용을 정리했습니다.</small>
          </div>
        </div>
        {/* 주의: 열림/닫힘 글자는 CSS 로 바꿉니다. details 의 open 을 React state 로
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
        {/* 주의: 서버가 준 글자를 '한 글자도 안 고칩니다'. 줄바꿈만 살립니다. */}
        <pre className="ai-inquiry-text">{초안}</pre>
        <p className="ai-inquiry-notice">
          <span>ⓘ</span>초안입니다. 보내기 전에 기관명·담당자·사업명이 맞는지
          확인해주세요.
        </p>
      </div>
    </details>
  );
}

/** 첨부파일 한 줄. 올리는 중·실패·완료를 보여 주고 내려받기·다시 올리기·삭제를 합니다. */
function 첨부줄({
  planId,
  file,
  확인,
  notify,
  className,
}: {
  planId: string;
  file: 첨부;
  확인: (요청: 확인요청) => Promise<boolean>;
  notify: (message: string) => void;
  className?: string;
}) {
  const 지우기 = () => {
    const 저장됨 = file.상태 === "완료";
    void (저장됨
      ? 확인({
          제목: "첨부파일을 삭제할까요?",
          설명: `'${file.name}'을(를) 삭제합니다. 되돌릴 수 없습니다.`,
          실행문구: "삭제",
        })
      : Promise.resolve(true)
    ).then((확인함) => {
      if (!확인함) return;
      첨부지우기(planId, file).catch((e: unknown) => notify(`파일을 삭제하지 못했습니다. ${오류사유(e)}`));
    });
  };
  return (
    <li className={`${className ?? ""} ${file.상태 === "실패" ? "attachment-failed" : ""}`}>
      <Icon name="fileText" size={15} />
      <span className="attachment-name">
        <b>{file.name}{file.작성자 && <span className="item-author"> · {file.작성자}</span>}</b>
        <small>
          {file.상태 === "올리는중" ? "올리는 중…" : file.상태 === "실패" ? file.오류 : file.size}
        </small>
      </span>
      {file.상태 === "완료" && (
        <button
          type="button"
          aria-label={`${file.name} 다운로드`}
          onClick={() =>
            void 첨부내려받기(planId, file).catch((e: unknown) =>
              notify(`파일을 내려받지 못했습니다. ${오류사유(e)}`),
            )
          }
        >
          ↓
        </button>
      )}
      {file.상태 === "실패" && file.file && (
        <button type="button" className="attachment-retry" onClick={() => void 첨부다시올리기(planId, file)}>
          다시 올리기
        </button>
      )}
      {file.상태 !== "올리는중" && (
        <button type="button" aria-label={`${file.name} 삭제`} onClick={지우기}>
          ×
        </button>
      )}
    </li>
  );
}

const 틀림이유: { 값: NonNullable<판정피드백["이유"]>; 글: string }[] = [
  { 값: "판정이 다름", 글: "판정이 달라요" },
  { 값: "근거가 다름", 글: "근거가 달라요" },
  { 값: "기타", 글: "기타" },
];

/** 점검 결과의 「맞았어요 / 틀렸어요」. 맞았어요는 바로 저장하고, 틀렸어요는 이유를 받은 뒤 저장합니다. */
function 결과평가칸({
  plan,
  저장됨,
  notify,
}: {
  plan: ExpensePlan;
  저장됨: (값: 판정피드백) => void;
  notify: (message: string) => void;
}) {
  const [현재, set현재] = useState<판정피드백 | null>(plan.내피드백 ?? null);
  const [펼침, set펼침] = useState(false);
  const [이유, set이유] = useState<판정피드백["이유"]>(plan.내피드백?.이유 ?? null);
  const [의견, set의견] = useState(plan.내피드백?.의견 ?? "");
  const [저장중, set저장중] = useState(false);

  const 저장 = (값: 판정피드백, 완료문구: string) => {
    if (plan.latestDecisionId == null) return;
    set저장중(true);
    피드백저장(plan.latestDecisionId, 값)
      .then((결과) => {
        set현재(결과);
        set펼침(false);
        저장됨(결과);
        notify(완료문구);
      })
      .catch((e: unknown) => notify(`평가를 저장하지 못했습니다. ${오류사유(e)}`))
      .finally(() => set저장중(false));
  };

  const 이유글 = 틀림이유.find((항목) => 항목.값 === 현재?.이유)?.글;
  return (
    <section className="result-feedback">
      {!!plan.팀평가?.length && (
        <ul className="result-feedback-team">
          {plan.팀평가.map((평가) => (
            <li key={평가.작성자}>
              <b>{평가.작성자}</b> {평가.평가 === "맞음" ? "맞았어요" : `틀렸어요${평가.이유 ? ` · ${평가.이유}` : ""}`}
              {평가.의견 && <small>{평가.의견}</small>}
            </li>
          ))}
        </ul>
      )}
      <div className="result-feedback-head">
        <b>이 점검 결과가 맞았나요?</b>
        <div>
          <button
            type="button"
            className={현재?.평가 === "맞음" ? "is-selected" : ""}
            aria-pressed={현재?.평가 === "맞음"}
            disabled={저장중}
            onClick={() => 저장({ 평가: "맞음", 이유: null, 의견: null }, "평가를 저장했습니다.")}
          >
            맞았어요
          </button>
          <button
            type="button"
            className={현재?.평가 === "틀림" || 펼침 ? "is-selected is-wrong" : ""}
            aria-pressed={현재?.평가 === "틀림"}
            aria-expanded={펼침}
            disabled={저장중}
            onClick={() => set펼침(true)}
          >
            틀렸어요
          </button>
        </div>
      </div>
      {펼침 ? (
        <form
          className="result-feedback-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (이유) 저장({ 평가: "틀림", 이유, 의견: 의견.trim() || null }, "의견을 저장했습니다. 고맙습니다.");
          }}
        >
          <fieldset>
            <legend>어떤 점이 달랐나요?</legend>
            {틀림이유.map((항목) => (
              <label key={항목.값}>
                <input
                  type="radio"
                  name="result-feedback-reason"
                  checked={이유 === 항목.값}
                  onChange={() => set이유(항목.값)}
                />
                {항목.글}
              </label>
            ))}
          </fieldset>
          <label className="result-feedback-comment">
            <span>자세한 의견 (선택)</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={의견}
              onChange={(e) => set의견(e.target.value)}
              placeholder="담당기관에서 다르게 안내받았다면 그 내용을 적어 주세요."
            />
          </label>
          <footer>
            <button type="button" className="outline" disabled={저장중} onClick={() => set펼침(false)}>
              취소
            </button>
            <button type="submit" className="primary" disabled={저장중 || !이유}>
              저장
            </button>
          </footer>
        </form>
      ) : (
        현재?.평가 === "틀림" && (
          <p className="result-feedback-saved">
            {이유글}
            {현재.의견 ? ` · ${현재.의견}` : ""}
          </p>
        )
      )}
      <small>평가는 서비스 개선에 쓰이며, 이 점검 결과를 바꾸지는 않습니다.</small>
    </section>
  );
}

function PlanDetail({
  plan,
  작업내역,
  allPlans,
  판정시작,
  update,
  지출일변경,
  실제지출저장,
  확인,
  addSchedules,
  할일동기화,
  기준문서보기,
  remove,
  back,
  notify,
}: {
  plan?: ExpensePlan;
  /** 이 화면을 연 동안 마친 마지막 판정의 작업 내역. 없으면 그리지 않습니다. */
  작업내역?: 판정기록;
  allPlans: ExpensePlan[];
  기준문서보기: () => void;
  확인: (요청: 확인요청) => Promise<boolean>;
  판정시작: (작업: 판정시작입력) => boolean;
  update: (plan: ExpensePlan) => void;
  지출일변경: (plan: ExpensePlan, 새날짜: string) => void;
  실제지출저장: (plan: ExpensePlan, 날짜: string, 금액: number) => Promise<void>;
  addSchedules: (items: ScheduleItem[]) => void;
  /** 주의: 체크박스는 이걸로 바꿉니다 — 집행 일정까지 같이 움직이고 서버 저장도 여기서. */
  할일동기화: (planId: string, taskId: string, 완료: boolean) => void;
  remove: () => void;
  back: () => void;
  notify: (message: string) => void;
}) {
  const 사업 = use사업();
  const [editing, setEditing] = useState(false);
  const [recheckPrompt, setRecheckPrompt] = useState(false);
  const [recheckQuestions, setRecheckQuestions] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [scheduleGroup, setScheduleGroup] = useState<
    "aiChecks" | "evidence" | null
  >(null);
  const [draft, setDraft] = useState(plan);
  // 주의: 2026-09-04 — 여기에 「○○ 견적서.pdf」·「○○ 참고자료.pdf」 두 건을 '지어내고'
  //    있었습니다. 이제 '사용자가 실제로 붙인' 파일만 보여줍니다
  //    (새 지출 계획에서 붙인 것 + 이 화면에서 추가한 것).
  const 첨부칸 = use첨부(plan?.id ?? "");
  // 증빙 항목에 올린 파일은 그 항목 옆에 보여 줍니다. 항목이 사라진 파일은 일반 첨부로 돌아옵니다.
  const 증빙id = new Set((plan?.evidence ?? []).map((item) => item.id));
  const planFiles = 첨부칸.목록.filter((file) => !file.taskId || !증빙id.has(file.taskId));
  // 다른 기기에서 올린 파일까지 보이도록 계획을 열 때마다 읽습니다.
  useEffect(() => {
    if (plan?.id) void 첨부새로읽기(plan.id);
  }, [plan?.id]);
  const [actualDate, setActualDate] = useState(plan?.actualDate || plan?.plannedDate || "");
  const [actualAmount, setActualAmount] = useState(
    plan?.actualAmount ? String(plan.actualAmount) : "",
  );
  /**
   * 주의: 「결제 완료」 체크박스를 없앴습니다. 체크와 등록 버튼이 따로 있어서
   *    「체크만 하고 등록을 안 누른」 반쯤 등록된 상태가 만들어졌습니다.
   *    이제 등록 버튼 하나가 확인 창을 띄우고, 누르면 그게 곧 결제 완료입니다.
   *
   *    등록한 뒤에는 '잠깁니다'. 누적 집행액에 이미 반영된 값이라 아무 때나
   *    바뀌면 안 됩니다 — 고치려면 「수정하기」로 명시적으로 풀어야 합니다.
   */
  const 집행등록됨 = plan?.executionStatus === "결제 완료";
  const [집행수정중, set집행수정중] = useState(false);
  const [집행확인, set집행확인] = useState<null | "등록" | "수정">(null);
  // v031: 「AI 점검 결과」와 「집행 준비」를 탭으로 나눠 한 화면이 아래로 길게 늘어지지 않게 합니다.
  const [상세탭, set상세탭] = useState<"ai" | "prep">("ai");
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
    // 주의: 상세 체크박스와 집행 일정의 완료 체크는 '같은 것' 입니다 (서버 plan_tasks 한 행).
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
        // 주의: 어느 할일에서 나왔는지 남깁니다. 이게 있어야 집행 일정에서 완료를
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
  /** 버튼을 눌렀을 때 — 값만 검사하고 '확인 창' 을 엽니다. 저장은 창에서 합니다. */
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
    const 완료문구 = 종류 === "등록" ? "실제 집행 정보를 등록했습니다." : "실제 집행 정보를 수정했습니다.";
    if (API켜짐() && /^\d+$/.test(plan.id)) {
      실제지출저장(plan, actualDate, savedActualAmount)
        .then(() => {
          set집행수정중(false);
          notify(완료문구);
        })
        .catch((e: unknown) => notify(`실제 집행 정보를 저장하지 못했습니다. ${오류사유(e)}`));
      return;
    }
    update({
      ...plan,
      actualDate,
      actualAmount: savedActualAmount,
      executionStatus: "결제 완료",
      updatedAt: 시각표기(new Date().toISOString()),
    });
    set집행수정중(false);
    notify(API켜짐() ? 화면에만반영 : 완료문구);
  };

  /** 수정을 그만둘 때 — 등록돼 있던 값으로 되돌립니다. */
  const 집행수정취소 = () => {
    setActualDate(plan.actualDate || plan.plannedDate || "");
    setActualAmount(plan.actualAmount ? String(plan.actualAmount) : "");
    set집행수정중(false);
  };
  // 이번 판정의 분류를 먼저 쓰고, 새로고침 뒤에는 계획에 저장해 둔 세목으로 같은 모양을 만듭니다.
  // 주의: 수정 창에서 화면에만 고친 비목이면 그 값을 그대로 보여 줍니다. 옛 세목을 붙이면 고친 비목과 어긋납니다.
  // 조건 묶음이나 AI 해설에 이미 있는 문장은 결제 전 확인에 다시 적지 않습니다
  const 조건문장 = [...(plan.조건 ?? []), ...(plan.기한조건 ?? []), ...(plan.금지조건 ?? []), ...(plan.해당시조건 ?? []), ...(plan.공통사항 ?? [])];
  const 결제전항목 = plan.aiChecks.filter((item) => !조건문장.includes(item.label) && item.label !== plan.aiSummary);
  const 표시분류 = plan.화면만수정
    ? plan.category
    : plan.분류?.표시문 ?? (plan.확정세목 ? `${plan.category} > ${plan.확정세목}` : plan.category);
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
            <Info label="관련 비목" value={표시분류 || "미정"} />
            <Info
              label="예상 금액"
              value={`${won(plan.amount)}${부가세표기(plan.부가세구분)}`}
            />
            <Info
              label="예상 지출일"
              value={plan.plannedDate ? plan.plannedDate.replaceAll("-", ".") : "미정"}
            />
            <Info label="거래처" value={plan.vendor} />
            <Info label="사업" value={사업} />
            <Info label="사용 목적" value={plan.purpose} className="wide" />
            <div className="expense-v5-file-row">
              <span>첨부 파일</span>
              <div>
                {planFiles.length === 0 && (
                  <p className="expense-v5-file-empty">
                    {첨부칸.읽기 === "대기"
                      ? "첨부 목록을 불러오는 중입니다."
                      : 첨부칸.읽기 === "실패"
                        ? "첨부 목록을 불러오지 못했습니다. 새로고침해 주세요."
                        : "첨부한 파일이 없습니다. 견적서·과업자료가 있으면 올려 두세요."}
                  </p>
                )}
                <ul>
                  {planFiles.map((file) => (
                    <첨부줄 key={file.id} planId={plan.id} file={file} 확인={확인} notify={notify} />
                  ))}
                </ul>
                <footer>
                  <label className="outline small expense-v5-add-file">
                    <input
                      type="file"
                      multiple
                      accept={첨부accept}
                      onChange={(event) => {
                        const { 통과, 안내 } = 첨부검사(첨부칸.목록.length, Array.from(event.target.files || []));
                        if (안내) notify(안내);
                        통과.forEach((file) => void 첨부올리기(plan.id, file));
                        event.target.value = "";
                      }}
                    />
                    파일 추가
                  </label>
                  <small>최대 10개 / 개별 3MB 이하 · 보관용이며 AI 점검에는 쓰이지 않습니다</small>
                </footer>
              </div>
            </div>
          </dl>
        </section>
        <nav className="plans-v2-tabs expense-v5-tabs" role="tablist" aria-label="지출 상세 보기">
          <button role="tab" aria-selected={상세탭 === "ai"} className={상세탭 === "ai" ? "active" : ""} onClick={() => set상세탭("ai")}>
            AI 점검 결과
          </button>
          <button role="tab" aria-selected={상세탭 === "prep"} className={상세탭 === "prep" ? "active" : ""} onClick={() => set상세탭("prep")}>
            집행 준비{" "}
            <em>
              {[...plan.aiChecks, ...plan.evidence].filter((item) => item.done).length}/
              {plan.aiChecks.length + plan.evidence.length}
            </em>
          </button>
        </nav>
        {상세탭 === "ai" && (
        <section className="expense-v5-section expense-v5-ai">
          {/* 방금 끝난 판정의 작업 내역. 접어 두고 「작업 내역 보기」로 엽니다. 실패면 이유를 머리줄에 그대로 보입니다. */}
          {작업내역 && plan.status !== "점검 중" && (!!작업내역.항목들.length || !!작업내역.오류) && (
            <작업로그
              key={작업내역.끝}
              className="judge-result-log"
              앞단계이름="점검 전 확인"
              이번단계이름="AI 점검"
              항목들={작업내역.항목들}
              진행중={false}
              시작={작업내역.시작}
              끝={작업내역.끝}
              기본문장="AI 점검을 마쳤어요."
              끝문장="AI 점검을 마쳤어요."
              실패={작업내역.오류 ? `AI 점검을 마치지 못했어요. ${작업내역.오류}` : undefined}
            />
          )}
          {plan.status === "점검 중" && (
            <div className="recheck-stale-notice">
              <Icon name="spark" size={19} />
              <span>
                <b>AI가 이 지출 계획을 점검하고 있어요.</b>
                <small>끝나면 알려 드릴게요. 아래 내용은 점검이 끝나면 새 결과로 바뀝니다.</small>
              </span>
            </div>
          )}
          {plan.화면만수정 && (
            <div className="recheck-stale-notice">
              <Icon name="filePenLine" size={19} />
              <span>
                <b>{plan.비목직접선택 ? "고른 비목 말고 이 화면에서 고친 내용은" : "이 화면에서 고친 내용은"} AI 점검에 반영되지 않습니다.</b>
                <small>점검은 처음 저장한 내용으로 합니다. 고친 내용은 서버에 저장되지 않아 새로고침하면 사라집니다.</small>
              </span>
            </div>
          )}
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
            {/* 판단불가는 규정을 끝까지 적용하지 못한 결과라 어느 기준으로 점검했다고 말하지 않습니다. */}
            {plan.기준문서 && plan.판정 && plan.판정 !== "판단불가" && (
              <기준문서줄 정보={plan.기준문서} 기준문서보기={기준문서보기} />
            )}
            <div className="ai-verdict-row">
              <Status value={plan.status === "재점검 필요" ? plan.previousStatus || "확인 필요" : plan.status} />
              <div>
                {/* 주의: 「조건부」와 「판단불가」는 같은 🟡 인데 할 일이 정반대입니다.
                    판정을 받은 계획이면 판정별 문구를, 아니면 기존 문구를 씁니다. */}
                <h3>
                  {plan.status === "점검 전" && !plan.판정
                    ? "아직 AI 점검을 하지 않았습니다."
                    : 코드판정제목(plan.코드판정, 표시분류) ??
                      판정제목(plan.판정, 표시분류) ??
                      `${plan.category} 기준으로 ${
                        plan.status === "특이사항 없음"
                          ? "특이사항이 없습니다."
                          : "추가 확인이 필요합니다."
                      }`}
                </h3>
                {행동문구(plan.판정, Boolean(plan.분류), plan.문의처, 조건칸상태(plan)) && (
                  <p className="ai-verdict-action">
                    <b>
                      {plan.코드판정?.종류 === "부가세기준미정" && 부가세_고를수있음(plan.부가세구분)
                        ? `부가세 포함 여부를 고르면 다시 판정합니다. 모르면 ${plan.문의처 || "주관기관에"} 확인하세요.`
                        : 행동문구(plan.판정, Boolean(plan.분류), plan.문의처, 조건칸상태(plan))}
                    </b>
                  </p>
                )}
                {plan.status === "점검 전" && !plan.판정 && (
                  <p>AI 점검을 실행하면 규정 근거와 확인할 항목이 여기에 표시됩니다.</p>
                )}
              </div>
            </div>
            {plan.코드판정 && (
              <코드판정카드 판정={plan.코드판정} 부가세={plan.부가세구분} 문의처={plan.문의처} 다시점검={() => setRecheckQuestions(true)} />
            )}
            {/* v031: 한 줄 결론(AI 해설)을 조건 목록보다 먼저 보입니다. */}
            <div className="ai-explanation">
              <Icon name="spark" size={20} />
              <div>
                <b>AI 해설</b>
                {/* 주의: 여기는 '서버가 실제로 판단한 문장' 자리입니다.
                    예전에는 화면에 박아 둔 문구라, 어떤 계획을 열어도 같은 해설이
                    나왔습니다. 서버 요약이 있으면 그걸 보여줍니다. */}
                <p>
                  {plan.aiSummary ||
                    (plan.status === "특이사항 없음"
                      ? "현재 조건에서는 주요 사전 준비가 확인됐습니다. 집행 후 증빙을 빠짐없이 보관하세요."
                      : "사업계획과의 연관성은 확인됐습니다. 다만 계약 전에 과업 범위, 결과물, 검수 기준을 문서로 명확히 하고 금액 적정성과 특수관계 여부를 추가로 확인해야 합니다.")}
                </p>
                <꼭알아야할것 plan={plan} />
              </div>
            </div>
            {/* 「판단불가」의 결말입니다 — 할 일이 '문의' 라서 해설 바로 아래에 둡니다.
                서버가 준 값이 있을 때만 나옵니다(빈 카드를 남기지 않습니다). */}
            {plan.문의초안 && <문의초안카드 초안={plan.문의초안} 문의처={plan.문의처} notify={notify} />}
            <조사결과보기 결과={plan.조사} />
            {/* v031: 결제 전 확인 카드는 「집행 준비」 탭 1단계와 같은 내용이라 한 줄 링크로 줄입니다. */}
            {결제전항목.length > 0 && (
              <button className="ai-prep-link" onClick={() => { set상세탭("prep"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <Icon name="clipboardCheck" size={18} />
                <span>결제 전 할 일 <b>{plan.aiChecks.filter((item) => !item.done).length}건</b></span>
                <em>집행 준비 보기 →</em>
              </button>
            )}
            {/* v031: 조건 전체·근거·확인한 내용·용어는 필요한 사람만 폅니다. */}
            <details className="ai-basis-more">
              <summary>조건·근거 자세히 보기</summary>
            <결과접는묶음 제목="이번 지출에 영향 있는 조건" 항목={plan.조건} />
            <결과접는묶음 제목="이런 경우에는 안 돼요" 항목={plan.금지조건} />
            <결과접는묶음 제목="기한이 있는 일" 항목={plan.기한조건} />
            <결과접는묶음 제목="해당할 때만 필요해요" 항목={plan.해당시조건} />
            <결과접는묶음 제목="사업 전체 공통 사항" 항목={plan.공통사항} />
            <section className="ai-basis">
              <header>
                <div>
                  <Icon name="rules" size={20} />
                  <b>지원금 규정 근거</b>
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
                      <규정원문 글={rule.description} />
                    </span>
                  </article>
                ))}
              </div>
            </section>
            <결과문장목록 제목="근거 경로" 항목={plan.근거경로} />
            <확인한내용 항목={plan.사용자답변} 조건={plan.확인한조건} />
            <결과용어풀이 항목={plan.용어풀이} />
            </details>
            {/* 주의: 저장된 최신 판정에만 평가를 받습니다. 재점검하면 번호가 바뀌어 칸이 새로 열립니다. */}
            {plan.latestDecisionId != null && !plan.저장안됨 && plan.status !== "재점검 필요" && (
              <결과평가칸
                key={plan.latestDecisionId}
                plan={plan}
                저장됨={(값) => update({ ...plan, 내피드백: 값 })}
                notify={notify}
              />
            )}
            {plan.저장안됨 && (
              <p className="ai-result-notice">
                <span>ⓘ</span>이번 점검 결과는 저장되지 않았습니다. 새로고침하면 사라지니,
                필요하면 다시 점검해 주세요.
              </p>
            )}
            <p className="ai-result-notice">
              <span>ⓘ</span>AI 점검 결과는 참고용이며, 최종 판단과 책임은
              담당기관의 최신 안내를 확인해주세요.
            </p>
          </div>
        </section>
        )}
        {상세탭 === "prep" && (
        <section className="expense-v5-section expense-v5-prep">
          <header className="expense-v5-section-head">
            <div>
              <p>결제 전 확인부터 지출 후 증빙까지 단계별로 관리하세요.</p>
            </div>
          </header>
          {!!plan.단계요약?.length && (
            <ol className="expense-stage-bar" aria-label="진행 단계">
              {plan.단계요약.map((칸) => (
                <li key={칸.단계} className={`stage-${칸.상태}${칸.단계 === plan.현재단계 ? " current" : ""}`}>
                  <button
                    onClick={() =>
                      document
                        .getElementById(칸.단계 === "집행" ? "execution-card" : 칸.단계 === "증빙" ? "evidence-card" : "payment-before")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                  >
                    <b>{칸.단계}</b>
                    <small>
                      {칸.상태 === "항목없음"
                        ? "항목 없음"
                        : 칸.상태 === "완료"
                          ? "완료"
                          : `${칸.완료}/${칸.전체}`}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          )}
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
            {/* 주의: 1 결제 전 확인 / 2·3 결제 이후 — 세 카드가 한 덩어리로 붙어 있어
                「지금 뭘 해야 하나」가 안 보였습니다. 결제를 기준으로 끊습니다. */}
            <div className="expense-v5-prep-split" role="presentation" />
            <section className="expense-v5-execution-card" id="execution-card">
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
                {/* 주의: 상태에 따라 버튼이 하나씩만 뜹니다 — 「등록」과 「수정」이 같이
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
            <section className="expense-v5-evidence-section" id="evidence-card">
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
                        accept={첨부accept}
                        onChange={(event) => {
                          const { 통과, 안내 } = 첨부검사(
                            첨부칸.목록.length,
                            Array.from(event.target.files || []).slice(0, 1),
                          );
                          event.target.value = "";
                          if (안내) notify(안내);
                          const file = 통과[0];
                          if (!file) return;
                          // 주의: 파일이 저장된 뒤에만 완료로 표시합니다. 체크를 풀어도 파일은 남습니다.
                          void 첨부올리기(plan.id, file, item.id).then((저장됨) => {
                            if (!저장됨) {
                              notify(`「${item.label}」 파일을 올리지 못했습니다. 이유를 확인해 다시 올려 주세요.`);
                              return;
                            }
                            if (item.done) {
                              notify("파일을 저장했습니다.");
                              return;
                            }
                            할일동기화(plan.id, item.id, true);
                            notify(`파일을 저장하고 「${item.label}」을(를) 완료로 표시했습니다.`);
                          });
                        }}
                      />
                      <Icon name="upload" size={14} />
                      파일 업로드
                    </label>
                    {첨부칸.목록.some((file) => file.taskId === item.id) && (
                      <ul className="expense-v5-uploaded-files">
                        {첨부칸.목록
                          .filter((file) => file.taskId === item.id)
                          .map((file) => (
                            <첨부줄
                              key={file.id}
                              planId={plan.id}
                              file={file}
                              확인={확인}
                              notify={notify}
                              className="expense-v5-uploaded-file"
                            />
                          ))}
                      </ul>
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
        )}
      </main>
      {/* 주의: 누적 집행액에 들어가는 값이라 '되돌리기가 쉽지 않습니다'. 한 번 묻습니다. */}
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
          확인={확인}
          notify={notify}
          close={() => setEditing(false)}
          save={() => {
            // 주의: 계획 수정 API 가 아직 없습니다. 서버 모드에서 재점검을 권하면 판정은 서버의 옛 값으로
            //    돌아가는데 「변경된 내용으로」 점검한 것처럼 보입니다.
            if (API켜짐()) {
              const { 계획, 안내 } = 서버모드수정(plan, draft);
              update(계획);
              setEditing(false);
              if (안내) notify(안내);
              if (draft.plannedDate !== plan.plannedDate) 지출일변경(계획, draft.plannedDate || "");
              return;
            }
            update({
              ...draft,
              status: "재점검 필요",
              previousStatus:
                plan.status === "재점검 필요"
                  ? plan.previousStatus || "확인 필요"
                  : plan.status === "점검 전" || plan.status === "점검 중"
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
          start={(선택비목, 답) => {
            const 대상 = 선택비목 ? { ...plan, category: 선택비목, 비목직접선택: true } : plan;
            if (선택비목) update(대상);
            setRecheckQuestions(false);
            판정시작({
              계획: 대상,
              count: 1,
              planId: API켜짐() ? 대상.id : undefined,
              // 주의: 상세가 404·500 이어도 화면이 든 값으로 판정합니다 (목록과 같은 규칙).
              대체입력: {
                사업명: 현재사업(),
                확정비목: 대상.category.split(" · ")[0],
                제목: 대상.name,
                용도: 대상.purpose,
                금액: 대상.amount,
                화면수정있음: 대상.화면만수정,
              },
              답변: 답?.답변,
              질문세트: 답?.질문세트,
              조사ID: 답?.조사ID,
              조사답변: 답?.조사답변,
              이전진행: 답?.이전진행,
              추가입력값: 답?.추가입력값,
              끝남: (판정된계획, 오류) => {
                if (오류) {
                  notify(오류);
                  return;
                }
                if (!판정된계획) {
                  // 서버가 없는 예시 모드입니다.
                  const status: PlanStatus =
                    대상.category.startsWith("광고선전비") ? "특이사항 없음" : "확인 필요";
                  update({
                    ...대상,
                    status,
                    previousStatus: undefined,
                    nextAction: status === "특이사항 없음" ? "집행 준비" : "추가정보 확인",
                    updatedAt: "2026.08.31 방금 전",
                  });
                }
                notify(
                  판정된계획?.저장안됨
                    ? "점검 결과가 저장되지 않았습니다. 다시 점검해 주세요."
                    : "AI 재점검을 완료했습니다.",
                );
              },
            });
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
          확인={() => Promise.resolve(true)}
          notify={() => {}}
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
  확인,
  notify,
}: {
  plan: ExpensePlan;
  setPlan: (plan: ExpensePlan) => void;
  close: () => void;
  save: () => void;
  확인: (요청: 확인요청) => Promise<boolean>;
  notify: (message: string) => void;
}) {
  /**
   * 상세 화면과 같은 첨부 목록(lib/attachments)을 봅니다.
   * 주의: 파일은 다른 입력칸과 달리 올리는 즉시 저장되므로 「취소」로 되돌아가지 않습니다. 화면에 그렇게 씁니다.
   */
  const 편집칸 = use첨부(plan.id);
  const 편집첨부 = 편집칸.목록;
  const [첨부오류, set첨부오류] = useState("");
  const 비목선택지 = use비목선택지();
  useEffect(() => {
    set첨부오류("");
    // 목록에서 바로 연 수정 창은 첨부를 아직 읽지 않았습니다.
    void 첨부새로읽기(plan.id);
  }, [plan.id]);

  return (
    <div className="modal-backdrop">
      <section className="modal wide">
        <header>
          <div>
            <h2>지출 계획 수정</h2>
            <p>
              {API켜짐()
                ? "수정 내용은 아직 서버에 저장되지 않습니다. 이 화면에만 보이고 AI 점검에는 반영되지 않습니다. 비목이 비어 있는 계획만 여기서 고른 비목으로 점검합니다."
                : "입력 내용과 첨부 정보를 모두 수정할 수 있습니다."}
            </p>
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
              {!plan.category && <option value="">비목 선택</option>}
              {plan.category && !비목선택지.includes(plan.category) && <option>{plan.category}</option>}
              {비목선택지.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="full edit-file-box">
            <b>첨부 파일</b>
            {편집첨부.length === 0 ? (
              <p className="edit-file-empty">
                {편집칸.읽기 === "대기"
                  ? "첨부 목록을 불러오는 중입니다."
                  : 편집칸.읽기 === "실패"
                    ? "첨부 목록을 불러오지 못했습니다. 새로고침해 주세요."
                    : "첨부한 파일이 없습니다. 견적서·과업자료가 있으면 올려 두세요."}
              </p>
            ) : (
              <ul>
                {편집첨부.map((file) => (
                  <첨부줄 key={file.id} planId={plan.id} file={file} 확인={확인} notify={notify} />
                ))}
              </ul>
            )}
            <footer>
              <label className="outline small edit-file-add">
                <input
                  type="file"
                  multiple
                  accept={첨부accept}
                  onChange={(event) => {
                    const { 통과, 안내 } = 첨부검사(편집첨부.length, Array.from(event.target.files || []));
                    set첨부오류(안내 ?? "");
                    통과.forEach((file) => void 첨부올리기(plan.id, file));
                    event.target.value = "";
                  }}
                />
                파일 추가
              </label>
              <small>파일은 올리거나 지우는 즉시 저장됩니다 · 최대 10개 / 개별 3MB 이하 · 보관용이며 AI 점검에는 쓰이지 않습니다</small>
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
            onClick={save}
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
  자료받음,
  일정실패,
  save,
  추가,
  지우기,
  날짜저장,
  할일동기화,
  notify,
  확인,
}: {
  확인: (요청: 확인요청) => Promise<boolean>;
  plans: ExpensePlan[];
  schedules: ScheduleItem[];
  자료받음: boolean;
  일정실패: boolean;
  save: (items: ScheduleItem[]) => void;
  /** 주의: '새로 만든' 일정 전용. save 는 상태 변경만 서버에 보냅니다. */
  추가: (item: ScheduleItem) => void;
  지우기: (item: ScheduleItem) => void;
  날짜저장: (item: ScheduleItem, 날짜: string) => void;
  /** 주의: 서버 할일에서 온 일정이면 이걸로 바꿉니다 — 상세 체크박스까지 같이 움직입니다. */
  할일동기화: (planId: string, taskId: string, 완료: boolean) => void;
  notify: (message: string) => void;
}) {
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  /**
   * 주의: 달력이 2026년 8·9·10월로 하드코딩되어 있었고, 오늘 표시는 `month===8 && day===29` 로
   *    고정이었습니다. 그래서 9월에 들어오면 오늘 표시가 아예 나타나지 않았습니다.
   *    이제 실제 오늘을 기준으로 「지난달·이번달·다음달」을 봅니다.
   *
   * 주의: 서버에서 미리 그린 HTML 과 어긋나지 않게(hydration) 첫 렌더링은 고정값으로
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
  // 주의: 달력·통계·다가오는 일정은 날짜 있는 줄만 봅니다. 날짜 없는 줄은 「날짜 미정」에 모읍니다.
  const upcoming = schedules
    .filter((item) => !!item.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const 지났나 = (item: ScheduleItem) =>
    item.state !== "완료" && !!item.date && item.date < 오늘문자;
  const 기한지남 = upcoming.filter(지났나);
  const visibleUpcoming = upcoming.filter(
    (item) => item.state !== "완료" && !지났나(item),
  );
  const activeUpcoming = visibleUpcoming.slice(0, 3);
  const [미정펼침, set미정펼침] = useState(false);
  const [날짜입력, set날짜입력] = useState<{ id: string; 값: string } | null>(null);
  const 날짜미정 = schedules.filter((item) => !item.date && item.state !== "완료");
  const 미정묶음 = [
    ...plans
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        items: 날짜미정.filter((item) => item.planId === plan.id),
      }))
      .filter((group) => group.items.length > 0),
    ...(() => {
      const 나머지 = 날짜미정.filter(
        (item) => !plans.some((plan) => plan.id === item.planId),
      );
      return 나머지.length ? [{ id: "unlinked", name: "기타 일정", items: 나머지 }] : [];
    })(),
  ];
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

    // 주의: 서버 할일에서 온 일정이면 '상세 체크박스와 같이' 움직입니다.
    //    (그쪽에서 서버 저장까지 한 번에 합니다)
    const taskId = 대상.taskId;
    if (taskId && 대상.planId && 대상.planId !== "other") {
      할일동기화(대상.planId, taskId, 완료);
      return;
    }

    // 계획 없는 일정은 묶인 체크박스가 없어 일정만 바꿉니다.
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
      {(!자료받음 || 일정실패) && (
        <p className="schedule-detail-empty">
          {일정실패
            ? "일정을 불러오지 못했습니다. 새로고침해 주세요. 아래 건수와 달력은 실제 일정이 아닙니다."
            : "일정을 불러오는 중입니다."}
        </p>
      )}
      {기한지남.length > 0 && (
        <section className="schedule-overdue" aria-label="기한 지난 일정">
          <header>
            <h2>기한 지난 일정 {기한지남.length}건</h2>
            <p>아직 완료하지 않은 일정입니다. 끝냈다면 체크하고, 미뤄졌다면 날짜를 고쳐 주세요.</p>
          </header>
          <ul>
            {기한지남.map((item) => (
              <li key={item.id}>
                <input
                  type="checkbox"
                  checked={false}
                  aria-label={`${item.title} 완료 처리`}
                  onChange={() => toggleDone(item.id)}
                />
                <button type="button" onClick={() => setViewing(item)}>
                  <time>{월일표기(item.date)}</time>
                  <span>
                    <b>{item.title}{item.작성자 && <span className="item-author"> · {item.작성자}</span>}</b>
                    <small>{plans.find((p) => p.id === item.planId)?.name || "기타"}</small>
                  </span>
                  <em>{-dday(item.date)}일 지남</em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
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
                  <time>
                    {item.date}
                    {지났나(item) && <small className="past-date">지남</small>}
                  </time>
                  <span>
                    <b>{item.title}{item.작성자 && <span className="item-author"> · {item.작성자}</span>}</b>
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
          {upcomingView === "all" && visibleUpcoming.length === 0 && (
            <p className="schedule-detail-empty">
              {!자료받음
                ? "일정을 불러오는 중입니다."
                : 일정실패
                  ? "일정을 불러오지 못했습니다. 새로고침해 주세요."
                  : "앞으로 남은 일정이 없습니다."}
            </p>
          )}
          {upcomingView === "all" ? visibleUpcoming.map((item) => {
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
                      {activeIndex >= 0 ? (
                        <small className="dday">D-{dday(item.date)}</small>
                      ) : null}
                    </time>
                    <span>
                      <b>{item.title}{item.작성자 && <span className="item-author"> · {item.작성자}</span>}</b>
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
                      {/* 주의: 규정 점검이 만든 일정은 지워도 다음 점검이 다시 만들어 버튼을 내지 않습니다. */}
                      {!점검일정인가(item) && !item.지출일연동 && (
                        <button
                          className="danger"
                          onClick={() => {
                            setOpenMenu(null);
                            void 확인({
                              제목: "일정을 삭제할까요?",
                              설명: `'${item.title}' 일정을 삭제합니다.`,
                              실행문구: "삭제",
                            }).then((확인함) => {
                              if (확인함) 지우기(item);
                            });
                          }}
                        >
                          <Icon name="trash" size={14} />
                          삭제
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="upcoming-plan-groups">
              {upcomingGroups.map((group) => {
                const open = expandedPlans.includes(group.id);
                // 주의: 끝낸 일과 지난 일은 「가까운 일정」이 아닙니다. 지난 일은 옆에 따로 셉니다.
                const nearest = group.items.find(
                  (item) => item.state !== "완료" && !지났나(item),
                );
                const 지남수 = group.items.filter(지났나).length;
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
                        <small>{group.category || "비목 미정"}</small>
                      </span>
                      <span className="upcoming-plan-meta">
                        <small>일정 수</small>
                        <b>{group.items.length}건</b>
                      </span>
                      <span className="upcoming-plan-meta nearest-date">
                        <small>가장 가까운 일정</small>
                        <b>{nearest ? nearest.date.replaceAll("-", ".") : "없음"}</b>
                        {지남수 > 0 && <small className="past-date">{지남수}건 지남</small>}
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
                                  {지났나(item) && <small className="past-date">지남</small>}
                                </time>
                                <span>
                                  <b>{item.title}{item.작성자 && <span className="item-author"> · {item.작성자}</span>}</b>
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
      {날짜미정.length > 0 && (
        <section className="schedule-undated">
          <button
            type="button"
            className="schedule-undated-head"
            aria-expanded={미정펼침}
            onClick={() => set미정펼침((v) => !v)}
          >
            <span>
              <b>날짜 미정 {날짜미정.length}건</b>
              <small>규정에 기한이 없거나 아직 날짜를 정하지 않은 일정입니다.</small>
            </span>
            <Icon name="chevronDown" size={16} />
          </button>
          {미정펼침 && 미정묶음.map((group) => (
            <div className="schedule-undated-group" key={group.id}>
              <h3>{group.name} <small>{group.items.length}건</small></h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <input
                      type="checkbox"
                      checked={false}
                      aria-label={`${item.title} 완료 처리`}
                      onChange={() => toggleDone(item.id)}
                    />
                    <button type="button" className="schedule-undated-title" onClick={() => setViewing(item)}>
                      <b>{item.title}{item.작성자 && <span className="item-author"> · {item.작성자}</span>}</b>
                      <small>{item.type}</small>
                    </button>
                    {날짜입력?.id === item.id ? (
                      <span className="schedule-undated-date">
                        <input
                          type="date"
                          aria-label={`${item.title} 날짜`}
                          value={날짜입력.값}
                          onChange={(event) => set날짜입력({ id: item.id, 값: event.target.value })}
                        />
                        <button
                          type="button"
                          className="primary small"
                          disabled={!날짜입력.값}
                          onClick={() => {
                            날짜저장(item, 날짜입력.값);
                            set날짜입력(null);
                          }}
                        >
                          저장
                        </button>
                        <button type="button" className="outline small" onClick={() => set날짜입력(null)}>
                          취소
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="outline small"
                        onClick={() => set날짜입력({ id: item.id, 값: "" })}
                      >
                        날짜 정하기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {modal && (
        <ScheduleFormModal
          plans={plans}
          close={() => setModal(false)}
          save={(item) => {
            // 주의: '새로 만든' 일정이라 전체 목록 저장이 아니라 추가 경로로 보냅니다.
            //    `save()`(=persistSchedules)는 이미 있는 줄의 '변경' 만 서버에 보내므로
            //    새 항목은 그 길로 가면 서버에 안 남습니다. 저장 결과 안내도 추가 경로가 합니다.
            추가(item);
            setModal(false);
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
          remove={
            점검일정인가(viewing) || viewing.지출일연동
              ? undefined
              : () => {
                  const 대상 = viewing;
                  void 확인({
                    제목: "일정을 삭제할까요?",
                    설명: `'${대상.title}' 일정을 삭제합니다.`,
                    실행문구: "삭제",
                  }).then((확인함) => {
                    if (!확인함) return;
                    setViewing(null);
                    지우기(대상);
                  });
                }
          }
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
            // 주의: 상세 모달에서 눌러도 같은 규칙 — 서버 할일이면 체크박스까지 같이.
            if (viewing.taskId && viewing.planId && viewing.planId !== "other") {
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
      planId: plans[0]?.id || "other",
      title: "",
      date: 오늘날짜(),
      type: "사전 확인",
      state: "준비 필요",
      memo: "",
    },
  );
  // 주의: 규정 점검이 다시 쓰는 값은 고쳐도 사라지므로 잠급니다. 계획을 옮기는 API 는 없어 수정 때 잠급니다.
  const 지출일줄 = !!item?.지출일연동;
  const 잠김 = 지출일줄 || (!!item && 점검일정인가(item));
  return (
    <div className="modal-backdrop schedule-modal-backdrop">
      <section className="schedule-create-modal">
        <header>
          <div>
            <h2>{item ? "일정 수정" : "일정 추가"}</h2>
            <p>
              {지출일줄
                ? "예상 지출일 일정입니다. 날짜는 지출 계획에서 바꿀 수 있습니다."
                : 잠김
                ? "규정 점검이 만든 일정이라 날짜와 상태만 바꿀 수 있습니다."
                : "일정 정보와 메모를 관리할 수 있습니다."}
            </p>
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
                  disabled={잠김}
                  maxLength={300}
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
                  disabled={잠김}
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
                  disabled={!!item}
                  onChange={(e) =>
                    setDraft({ ...draft, planId: e.target.value })
                  }
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                  <option value="other">기타 (지출 계획과 무관한 일정)</option>
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
                    disabled={지출일줄}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                  {!지출일줄 && <small>비워 두면 「날짜 미정」으로 모입니다.</small>}
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
                disabled={잠김}
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
  remove,
  toggleComplete,
  edit,
}: {
  item: ScheduleItem;
  plan?: ExpensePlan;
  close: () => void;
  remove?: () => void;
  toggleComplete: () => void;
  edit: () => void;
}) {
  const related = plan
    ? `${plan.name} · ${plan.category || "비목 미정"} · ${won(plan.amount)}`
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
            <dd>{item.date ? item.date.replaceAll("-", ".") : "날짜 미정"}</dd>
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
          {remove && (
            <button className="outline danger" onClick={remove}>
              삭제
            </button>
          )}
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

/**
 * 마이페이지 「팀」 카드. 팀이면 기업 프로필·지출 계획·점검 결과·일정·첨부를 함께 씁니다.
 *
 * 들어가거나 나가면 보이는 데이터가 통째로 바뀌므로 새로고침합니다. 로그인하지 않았으면(401·403) 그리지 않습니다.
 */
function 팀카드({
  notify,
  확인,
  계획수,
}: {
  notify: (message: string) => void;
  확인: (요청: 확인요청) => Promise<boolean>;
  계획수: number;
}) {
  const [상태, set상태] = useState<"조회중" | "표시" | "숨김" | "실패">("조회중");
  const [팀, set팀] = useState<서버팀 | null>(null);
  const [입력, set입력] = useState<"만들기" | "코드" | null>(null);
  const 계정팀이름 = use팀이름();
  const [팀이름입력, set팀이름입력] = useState("");
  const [코드입력, set코드입력] = useState("");
  const [처리중, set처리중] = useState(false);
  const [오류, set오류] = useState("");
  const [보이는코드, set보이는코드] = useState<string | null>(null);

  useEffect(() => {
    let 살아있음 = true;
    if (!API켜짐()) {
      set상태("숨김");
      return;
    }
    팀조회()
      .then((r) => {
        if (!살아있음) return;
        set팀(r.팀);
        set상태("표시");
      })
      .catch((e: unknown) => {
        if (!살아있음) return;
        const 코드 = (e as { status?: number } | null)?.status;
        set상태(코드 === 401 || 코드 === 403 ? "숨김" : "실패");
      });
    return () => {
      살아있음 = false;
    };
  }, []);

  /** 서버 호출 하나를 감쌉니다. 실패 이유는 카드 안에 보여 줍니다. */
  const 실행 = async (작업: () => Promise<void>) => {
    set처리중(true);
    set오류("");
    try {
      await 작업();
    } catch (e) {
      set오류(오류사유(e));
    } finally {
      set처리중(false);
    }
  };
  const 만들기 = () =>
    실행(async () => {
      const r = await 팀만들기(팀이름입력.trim(), 선택사업());
      set팀(r.팀);
      set보이는코드(r.팀?.초대코드 ?? null);
      set입력(null);
    });
  const 들어가기 = async () => {
    const 예 = await 확인({
      제목: "이 팀에 들어갈까요?",
      설명: `팀에 들어가면 지금 내 계획 ${계획수}건은 팀을 나가기 전까지 보이지 않아요. 팀의 계획·일정·첨부를 함께 보게 됩니다.`,
      실행문구: "들어가기",
    });
    if (!예) return;
    await 실행(async () => {
      const r = await 팀들어가기(코드입력.trim());
      if (r.팀?.사업명) 사업저장(r.팀.사업명);
      window.location.reload();
    });
  };
  const 나가기 = async () => {
    const 혼자인대표 = 팀?.내역할 === "대표";
    const 예 = await 확인(
      혼자인대표
        ? { 제목: "팀을 닫을까요?", 설명: "지금까지의 계획과 일정은 이 계정에 그대로 남습니다.", 실행문구: "팀 닫기" }
        : { 제목: "팀에서 나갈까요?", 설명: "팀의 계획은 더 이상 보이지 않고, 들어오기 전 내 계획이 다시 보입니다.", 실행문구: "나가기" },
    );
    if (!예) return;
    await 실행(async () => {
      await 팀나가기();
      window.location.reload();
    });
  };
  const 내보내기 = async (accountId: string, 이메일: string) => {
    const 예 = await 확인({
      제목: `${이메일}을(를) 내보낼까요?`,
      설명: "이 사람은 더 이상 팀 데이터를 볼 수 없고, 들어오기 전 개인 데이터로 돌아갑니다. 지금 초대 코드도 함께 막히므로 다른 팀원을 초대하려면 새 코드를 만들어 주세요.",
      실행문구: "내보내기",
    });
    if (!예) return;
    await 실행(async () => {
      const r = await 팀원내보내기(accountId);
      set팀(r.팀);
      set보이는코드(null);
      notify("구성원을 내보냈습니다. 지금 초대 코드는 더 이상 쓸 수 없습니다.");
    });
  };
  const 코드재발급 = async () => {
    const 예 = await 확인({
      제목: "새 초대 코드를 만들까요?",
      설명: "지금 코드는 더 이상 쓸 수 없습니다.",
      실행문구: "새 코드 만들기",
    });
    if (!예) return;
    await 실행(async () => {
      const r = await 초대코드재발급();
      set팀(r.팀);
      set보이는코드(r.팀?.초대코드 ?? null);
    });
  };
  const 코드복사 = async () => {
    try {
      await navigator.clipboard.writeText(보이는코드 ?? "");
      notify("초대 코드를 복사했습니다.");
    } catch {
      notify("복사하지 못했습니다. 코드를 직접 선택해 복사해 주세요.");
    }
  };

  if (상태 === "숨김" || 상태 === "조회중") return null;
  const 대표 = 팀?.내역할 === "대표";
  const 다른구성원있음 = (팀?.구성원.length ?? 0) > 1;
  const 만료일 = 팀?.초대코드_만료 ? new Date(팀.초대코드_만료) : null;
  return (
    <section className="card team-card">
      <header className="card-head">
        <div>
          <h2>{팀 ? `팀 · ${팀.팀이름}` : "팀"}</h2>
          <p>
            {팀
              ? `${팀.사업명} · 구성원이 지출 계획·점검 결과·일정·첨부를 함께 봅니다.`
              : "팀원과 지출 계획·점검 결과·일정·첨부를 함께 보려면 팀을 만들거나 초대 코드를 입력하세요."}
          </p>
        </div>
      </header>
      {상태 === "실패" && <p className="section-copy">팀 정보를 불러오지 못했습니다. 새로고침해 주세요.</p>}
      {상태 === "표시" && !팀 && (
        <div className="team-actions">
          {입력 === null && (
            <>
              <button
                className="outline"
                onClick={() => {
                  set팀이름입력(계정팀이름);
                  set입력("만들기");
                }}
              >
                팀 만들기
              </button>
              <button className="outline" onClick={() => set입력("코드")}>초대 코드 입력</button>
            </>
          )}
          {입력 === "만들기" && (
            <div className="team-form">
              <label>
                팀 이름
                <input value={팀이름입력} maxLength={40} autoFocus onChange={(e) => set팀이름입력(e.target.value)} />
              </label>
              <button className="primary" disabled={!팀이름입력.trim() || 처리중} onClick={() => void 만들기()}>만들기</button>
              <button className="outline" disabled={처리중} onClick={() => set입력(null)}>취소</button>
            </div>
          )}
          {입력 === "코드" && (
            <div className="team-form">
              <label>
                초대 코드
                <input value={코드입력} maxLength={20} autoFocus placeholder="예: ABCD-2345" onChange={(e) => set코드입력(e.target.value)} />
              </label>
              <button className="primary" disabled={!코드입력.trim() || 처리중} onClick={() => void 들어가기()}>들어가기</button>
              <button className="outline" disabled={처리중} onClick={() => set입력(null)}>취소</button>
            </div>
          )}
        </div>
      )}
      {팀 && (
        <>
          <ul className="team-members">
            {팀.구성원.map((사람) => (
              <li key={사람.account_id}>
                <span>
                  {사람.이메일}
                  {사람.나 && <em>나</em>}
                  {사람.대표 && <em>대표</em>}
                </span>
                {대표 && !사람.나 && (
                  <button className="outline small" disabled={처리중} onClick={() => void 내보내기(사람.account_id, 사람.이메일)}>
                    내보내기
                  </button>
                )}
              </li>
            ))}
          </ul>
          {대표 && (
            <div className="team-code">
              {보이는코드 ? (
                <>
                  <b>{보이는코드}</b>
                  <button className="outline small" onClick={() => void 코드복사()}>복사</button>
                  <small>이 화면을 벗어나면 다시 볼 수 없습니다. 팀원에게 지금 전달해 주세요.</small>
                </>
              ) : (
                <small>
                  초대 코드는 만들 때만 볼 수 있습니다.
                  {만료일 && (만료일.getTime() > Date.now() ? ` 지금 코드는 ${만료일.toLocaleDateString("ko-KR")}까지 쓸 수 있습니다.` : " 지금 코드는 쓸 수 없습니다. 초대하려면 새 코드를 만들어 주세요.")}
                </small>
              )}
              <button className="outline small" disabled={처리중} onClick={() => void 코드재발급()}>새 코드 만들기</button>
            </div>
          )}
          <div className="team-actions">
            <button className="outline small" disabled={처리중 || (대표 && 다른구성원있음)} onClick={() => void 나가기()}>
              {대표 ? "팀 닫기" : "팀 나가기"}
            </button>
            {대표 && 다른구성원있음 && <small>다른 구성원을 먼저 내보내야 팀을 닫을 수 있습니다.</small>}
          </div>
        </>
      )}
      {오류 && <p className="file-replace-notice" role="alert"><span>ⓘ</span>{오류}</p>}
    </section>
  );
}

function MyPage({
  notify,
  확인,
  계획수,
}: {
  notify: (message: string) => void;
  확인: (요청: 확인요청) => Promise<boolean>;
  계획수: number;
}) {
  const [editingProfile, setEditingProfile] = useState(false);
  // 주의: 이메일은 '로그인한 사람' 의 것이어야 합니다 — 예전엔 여기 한 줄이 하드코딩되어 있어서
  //    어느 계정으로 들어와도 team@startup.kr 이 보였습니다.
  const 로그인이메일 = use이메일();
  // 주의: 팀 이름도 같은 규칙입니다 — Supabase 계정에 붙은 값이 기준 데이터입니다.
  /**
   * 주의: 저장한 뒤 '다시 읽어야' 합니다. 훅은 마운트할 때 한 번만 읽는데,
   *    저장 직후 아래 effect 가 도는 시점에는 아직 옛 값을 들고 있어서
   *    방금 저장한 이름을 도로 덮었습니다. 저장이 끝나면 이 키를 올립니다.
   */
  const [팀갱신, set팀갱신] = useState(0);
  const 계정팀이름 = use팀이름(팀갱신);
  const [profile, setProfile] = useState({
    team: "체쿠메이트",   // 주의: 표기 기본값. 이름을 '알아냈을 때만' 덮습니다
    program: 선택사업(),
    // 주의: 온보딩에서 고른 기관입니다. 예전엔 여기 한 줄이 하드코딩되어 있어서 다른 기관을
    //    골라도 마이페이지는 늘 경상국립대로 보였습니다.
    host: 기본기관명,
    duplicateBenefit: "X",
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  /**
   * 「지금 적용 중」인 기관 세부기준 문서 — `GET /api/l3/current` (2026-09-07,
   * `lib/orgs.ts:107 적용중_기준파일` 하드코딩 대체용, 서버 커밋 `7fcd665`).
   * fail 문서는 숨기지 않고 `기준문서.실패목록`으로 따로 받아 구분해서 보여줍니다.
   */
  const [기준재조회, set기준재조회] = useState(0);
  const 기준문서 = use현재기준문서(기준재조회);
  /** 방금 이 화면에서 새로 등록한 파일 — 서버 재조회 전에도 먼저 보여줍니다. */
  const [방금등록, set방금등록] = useState<{ 파일명: string; 안내: string | null; ocr?: boolean } | null>(null);
  const [교체확인, set교체확인] = useState<File | null>(null);
  /** 서버가 읽고 있는 파일 이름 — 이 동안 `L3읽는중` 창을 띄웁니다. */
  const [기준읽는중, set기준읽는중] = useState<string | null>(null);
  const [기준실패, set기준실패] = useState<L3실패 | null>(null);
  const [기준확인, set기준확인] = useState<L3확인 | null>(null);
  const 지금기준파일 = 방금등록?.파일명 ?? 기준문서.파일명;
  /** 조문 연결 확인 창에 띄운 문서(P4-5). */
  const [연결창, set연결창] = useState<L3현재문서 | null>(null);
  /**
   * 서버가 연결 추천을 만드는 동안(업로드 직후) 5초마다 다시 읽어 줄을 바꿉니다. 3분이 지나면 멈춥니다
   * (서버는 30분 넘게 멈춘 추천을 「추천 실패」로 바꿔 줍니다). 창이 열려 있으면 읽지 않습니다(고르던 값이 바뀌지 않게).
   */
  const 추천기다림 = useRef(0);
  const 추천작성중 = 기준문서.연결문서?.연결상태 === "추천작성중";
  useEffect(() => {
    if (!추천작성중 || 연결창 || 추천기다림.current >= 36) return;
    const t = setTimeout(() => {
      추천기다림.current += 1;
      set기준재조회((n) => n + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [추천작성중, 연결창, 기준문서]);

  /**
   * 기준 문서 교체 — 업로드한 뒤 서버가 다 읽을 때까지 기다려 결과대로 갈립니다.
   *
   * 주의: 2026-09-06 — 여기는 '서버를 안 부르고' 화면 이름만 바꾸고 "교체했습니다" 라고
   *    알리고 있었습니다(실측: /api/l3/upload 요청 0건). 이 제품의 핵심 약속이 깨지던 자리입니다.
   * 주의: 2026-11-03 — 그 뒤로도 202(접수) 응답만 보고 「적용 중」을 새 파일로 바꿔서, 서버가 읽지
   *    못한 문서도 적용된 것처럼 보였습니다. 이제 결과를 기다립니다. 완료면 새 문서가 「적용 중」이
   *    되고(서버가 이전 문서를 판정에서 뺍니다), 실패면 실패 창을 띄우고 「적용 중」은 그대로 둡니다.
   *    어느 쪽이든 끝나면 `GET /api/l3/current` 를 다시 읽어 실패 목록까지 서버와 맞춥니다.
   */
  const 기준문서올리기 = async (파일: File) => {
    set기준실패(null);
    set기준읽는중(파일.name);
    // 주의: 실패를 '성공처럼' 넘기지 않습니다. 조용히 넘기면 사용자는 바뀌지 않은 기준으로
    //    판정을 받고도 바뀐 줄 압니다. `기준문서처리` 는 예외를 던지지 않습니다.
    const 결과 = await 기준문서처리(파일);
    set기준읽는중(null);
    if (결과.종류 === "실패") {
      set기준실패(결과.실패);
    } else if (결과.종류 === "확인") {
      set기준확인(결과.확인);
    } else if (결과.종류 === "완료") {
      const r = 결과.결과;
      const 사실 = L3등록사실(r.조_건수, r.파싱품질, r.추출방식);
      // 이름은 서버가 '지금 판정에 쓴다' 고 답한 문서를 씁니다(동시에 올린 다른 문서가 이겼을 수 있음)
      set방금등록({
        파일명: r.적용중_문서 ?? 파일.name,
        안내: r.파싱품질 === "warn" ? 사실 : null,
        ocr: r.추출방식 === "ocr",
      });
      notify(`기준 문서를 교체했습니다 — ${사실}`);
    } else {
      // 2분이 지나도 처리 중 — 서버 안내("끝날 때까지는 기존 규정으로 판정합니다")를 그대로 씁니다
      notify(결과.결과.메시지 || "문서를 아직 읽고 있습니다. 끝나면 이 화면에 반영됩니다.");
    }
    set기준재조회((n) => n + 1);
  };

  /**
   * 협약기간·사업비. 사용자가 고친 값 → 고른 사업의 시연값 순서로 채웁니다.
   * 홈·사이드바가 쓰는 `use협약()` 과 '같은 함수' 를 부르므로 세 화면이 어긋나지 않습니다.
   */
  const [협약, set협약] = useState<협약정보>(지금협약);
  const [협약초안, set협약초안] = useState(협약);
  const [협약저장중, set협약저장중] = useState(false);
  // 서버가 저장된 협약 금액을 규정의 비율 기준과 견줘 준 안내 문장들(없으면 빈 목록)
  const [협약경고, set협약경고] = useState<string[]>([]);
  // 주의: 「예시」는 사용자 값이 아니므로 수정 창에 넣지 않습니다. 하나만 고쳐 저장하면 나머지 예시 값까지
  //    이 계정의 협약으로 저장되어 판정에 쓰입니다. 「실패」면 서버 값을 모르니 덮어쓰지 못하게 막습니다.
  const [협약출처, set협약출처] = useState<"서버" | "이 브라우저" | "예시" | "조회중" | "실패">("조회중");
  // 주의: 읽는 중에 입력하면 도착한 서버 값이 입력을 덮고, 저장하면 읽지 못한 서버 값을 덮어씁니다.
  const 협약잠김 = 협약출처 === "실패" || 협약출처 === "조회중";

  useEffect(() => {
    if (!계정팀이름 || editingProfile) return;
    setProfile((v) => (v.team === 계정팀이름 ? v : { ...v, team: 계정팀이름 }));
    setProfileDraft((v) => (v.team === 계정팀이름 ? v : { ...v, team: 계정팀이름 }));
  }, [계정팀이름, editingProfile]);

  useEffect(() => {
    let 살아있음 = true;
    // 주의: 표기를 서버 문자열에 맞춥니다(「2026 초기창업패키지」→「초기창업패키지」).
    //    선택은 온보딩에서 끝났으므로 여기서는 보여주기만 합니다.
    사업선택지().then((목록) => {
      if (!살아있음 || !목록) return;
      const 맞춘값 = 목록에맞추기(목록, 선택사업());
      setProfile((v) => ({ ...v, program: 맞춘값 }));
      setProfileDraft((v) => ({ ...v, program: 맞춘값 }));
    });
    // 주의: 팀 이름은 아래 `use팀이름()` 이 Supabase 에서 받아 채웁니다 — 여기서
    //    sessionStorage 를 또 읽으면 로그아웃 뒤 빈 값이 서버 값을 덮습니다.
    // 온보딩에서 고른 기관을 반영합니다.
    const 기관 = 선택기관();
    setProfile((v) => ({ ...v, host: 기관 }));
    setProfileDraft((v) => ({ ...v, host: 기관 }));
    // 주의: 서버에 값이 있으면 서버가 기준이고 브라우저 값은 지웁니다. 서버에 값이 없을 때만 브라우저
    //    값을 보여 줍니다(`use협약()` 과 같은 순서 — 자세한 사정은 `lib/profile.ts`).
    const 현재협약 = 지금협약();
    const 기억 = 기억된협약();
    set협약(현재협약);
    set협약초안(기억 ? 현재협약 : 빈협약);
    set협약출처("조회중");
    서버협약조회().then(({ 값: 서버값, 실패, 경고 }) => {
      if (!살아있음) return;
      if (서버값) {
        협약잊기();
        set협약출처("서버");
        set협약(서버값);
        set협약초안(서버값);
        set협약경고(경고);
        return;
      }
      set협약출처(실패 ? "실패" : 기억 ? "이 브라우저" : "예시");
    });
    return () => {
      살아있음 = false;
    };
  }, []);

  const 규정목록 = use적용규정(profile.program);

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
                set협약초안(협약출처 === "서버" || 협약출처 === "이 브라우저" ? 협약 : 빈협약);
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
          <Info
            label="적용 기준"
            value={
              지금기준파일
                ? "사업 공통 규정 + 기관 세부기준"
                : 기준문서.조회실패
                  ? "기관 세부기준을 확인하지 못했습니다"
                  : "사업 공통 규정"
            }
          />
        </dl>
      </section>
      <팀카드 notify={notify} 확인={확인} 계획수={계획수} />
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
          <div><dt>자기부담금 현물</dt><dd>{협약.자기부담현물 == null ? "미입력" : 원(협약.자기부담현물)}</dd></div>
        </dl>
        {협약출처 === "서버" && <협약경고알림 줄들={협약경고} />}
        {협약출처 === "예시" && (
          <p className="section-copy">아직 입력한 협약 정보가 없어 사업 예시 값을 보여 줍니다. 점검에는 쓰이지 않습니다.</p>
        )}
        {협약출처 === "이 브라우저" && (
          <p className="section-copy">이 브라우저에만 남아 있는 값이라 점검에는 쓰이지 않습니다. 맞는 값이면 내 정보 수정에서 저장해 주세요.</p>
        )}
        {협약출처 === "실패" && (
          <p className="section-copy">협약 정보를 불러오지 못했습니다. 지금 보이는 값은 저장된 값이 아닙니다. 새로고침해 주세요.</p>
        )}
        {협약출처 === "조회중" && (
          <p className="section-copy">협약 정보를 불러오는 중입니다.</p>
        )}
      </section>
      <section className="card rule-library">
        <header className="card-head">
          <div>
            <h2>공통 관리 기준</h2>
            {/* 주의: 여기도 조사가 '이' → '가' 로 바뀝니다. */}
            <p>써도돼요가 지출 사전점검에 우선 적용하는 기준입니다.</p>
          </div>
        </header>
        {/* 주의: 사업마다 적용 규정이 '다릅니다'. 예전에는 「창업중심대학사업 운영관리기준」이
            하드코딩되어 있어서, 다른 사업을 골라도 화면은 창업중심대학 기준을 보고 있는 것처럼
            읽혔습니다. 2026-09-07 부터 `GET /api/programs` 가 실제 우선순위규칙을 주므로
            (`lib/norms.ts`), 초격차·모두의창업처럼 상위 규정이 하나 더 있는 사업도
            서버가 준 줄 수 그대로 갈립니다. */}
        {규정목록.map((규정) => (
          <article key={규정.제목}>
            <span className="auto-badge">자동 반영</span>
            <div>
              <b>{규정.제목}</b>
              <small>{규정.설명}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="card rule-library" id="institution-criteria">
        <header className="card-head">
          <div>
            <h2>주관기관 세부 안내</h2>
            <p>
              금액 기준·승인 절차·제출 양식은 기관의 최신 안내를 함께
              적용합니다.
            </p>
          </div>
          {/* 주의: 고르자마자 바꾸지 않습니다 — 이 문서는 판정 기준이라 한 번 묻습니다.
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
          {/* 스캔본을 OCR 로 읽은 문서는 금액·조번호 오인식 가능성을 배지로 먼저 알립니다(안내 문구는 아래 small). */}
          {(방금등록 ? 방금등록.ocr : 기준문서.ocr) ? (
            <span className="institution-badge warn">OCR 인식</span>
          ) : (
            <span className="institution-badge">사용자 등록</span>
          )}
          <div>
            <b>{지금기준파일 ?? (기준문서.조회실패 ? "기준 문서를 불러오지 못했습니다" : "등록된 기준 문서가 없습니다")}</b>
            {/* 주의: 2026-11-03 — 여기 「2026.03.02 등록」이 하드코딩되어 있어서 어떤 문서든
                같은 날짜로 보였습니다. 서버 `등록일` 을 쓰고, 문서가 없으면 판정이 무엇을 쓰는지 밝힙니다. */}
            <small>
              {방금등록
                ? 방금등록.안내 ?? "방금 등록했습니다"
                : 기준문서.안내 ??
                  (기준문서.파일명
                    ? 기준문서.등록일
                      ? `${기준문서.등록일.replace(/-/g, ".")} 등록`
                      : "등록됨"
                    : 기준문서.조회실패
                      ? "새로고침해 주세요. 문서가 없다는 뜻은 아닙니다."
                      : "기관 세부기준 없이 공통 관리 기준만으로 판정합니다")}
            </small>
          </div>
        </article>
        {/* 방금 올린 문서를 서버에서 다시 읽기 전에는 이전 문서의 연결을 보이지 않습니다 */}
        {기준문서.연결문서 && (!방금등록 || 방금등록.파일명 === 기준문서.연결문서.원본파일명) && (() => {
          const 연결 = 기준문서.연결문서;
          const 셈 = 조문연결셈(연결);
          const 작성중 = 연결.연결상태 === "추천작성중";
          const 옛판 = 셈.옛판 > 0 ? ` 옛 판 지침과 같은 문구가 있는 조문이 ${셈.옛판}개 있어요. 지금 판 기준과 다를 수 있어요.` : "";
          const [제목, 설명, 버튼] = 작성중
            ? ["조문 연결 추천을 만들고 있어요", "조문마다 어느 비목에 해당하는지 추천해요. 확인하기 전에는 모든 조문을 함께 보고 판정합니다.", "지금 보기"]
            : 셈.확인전 > 0
              ? [
                  `조문 연결을 확인해 주세요 (확인 전 ${셈.확인전}개 조)`,
                  (연결.연결상태 === "추천실패" ? "자동 추천을 만들지 못했어요. 직접 골라 주세요. " : "") +
                    "비목에 연결하면 판정할 때 그 비목의 조문을 먼저 봅니다. 확인 전에는 모든 조문을 함께 봅니다.",
                  "연결 확인하기",
                ]
              : [`조문 연결을 확인했어요 (${셈.전체}개 조)`, "판정할 때 고른 비목의 조문을 먼저 봅니다.", "연결 고치기"];
          return (
            <article>
              <span className={`institution-badge${셈.확인전 > 0 || 셈.옛판 > 0 ? " warn" : ""}`}>
                {셈.확인전 > 0 ? "연결 확인 전" : "조문 연결"}
              </span>
              <div>
                <b>{제목}</b>
                <small>{설명}{옛판}</small>
              </div>
              <button className="outline small institution-review-button" onClick={() => set연결창(연결)}>
                {버튼}
              </button>
            </article>
          );
        })()}
        {기준문서.확인대기목록.map((문서) => (
          <article key={문서.doc_id} className="institution-file-failed">
            <span className="institution-badge warn">확인 필요</span>
            <div>
              <b>{문서.원본파일명}</b>
              <small>{문서.검토이유 ?? "세부기준 문서가 맞는지 확인이 필요합니다."} 고르기 전까지 판정에 쓰지 않습니다.</small>
              <button
                className="outline small institution-review-button"
                onClick={() =>
                  set기준확인({
                    doc_id: 문서.doc_id,
                    파일명: 문서.원본파일명,
                    조_건수: 문서.조_건수,
                    이유: 문서.검토이유 ?? null,
                    적용중: 지금기준파일 ?? null,
                  })
                }
              >
                확인하기
              </button>
            </div>
          </article>
        ))}
        {/* 주의: 파싱에 실패한(fail) 문서는 '숨기지 않습니다' — 숨기면 사용자가 올린 파일이
            왜 판정에 적용되지 않는지 알 수 없습니다(2026-09-07). */}
        {기준문서.처리중목록.map((문서) => (
          <article key={문서.doc_id}>
            <span className="institution-badge">읽는 중</span>
            <div>
              <b>{문서.원본파일명}</b>
              <small>
                다 읽으면 이 문서로 판정합니다.{" "}
                {지금기준파일 ? "그때까지는 위 문서를 씁니다." : "그때까지는 공통 관리 기준만으로 판정합니다."}
              </small>
            </div>
          </article>
        ))}
        {기준문서.실패목록.map((문서) => (
          <article key={문서.doc_id} className="institution-file-failed">
            <span className="institution-badge warn">읽지 못함</span>
            <div>
              <b>{문서.원본파일명}</b>
              <small>판정에 반영되지 않습니다 — 조·항을 읽지 못했습니다.</small>
            </div>
          </article>
        ))}
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
                <dd>{지금기준파일 ?? "등록된 기준 문서가 없습니다"}</dd>
              </div>
            </dl>
            <p className="file-replace-notice">
              <span>ⓘ</span>
              새 문서를 읽고 나면 기존 문서를 대신해 기관 세부기준으로 판정합니다. 읽지 못하면
              기존 문서를 계속 씁니다.
            </p>
            <footer>
              <button className="outline" onClick={() => set교체확인(null)}>취소</button>
              <button
                className="primary"
                onClick={() => {
                  const 파일 = 교체확인;
                  set교체확인(null);
                  void 기준문서올리기(파일);
                }}
              >
                교체하기
              </button>
            </footer>
          </section>
        </div>
      )}
      {기준읽는중 && <L3읽는중 파일명={기준읽는중} 문구="" />}
      {기준확인 && (
        <L3확인창
          확인={기준확인}
          닫기={() => {
            set기준확인(null);
            set기준재조회((n) => n + 1);
          }}
          적용={(r) => {
            set기준확인(null);
            set방금등록({
              파일명: r.적용중_문서 ?? 기준확인.파일명,
              안내: r.파싱품질 === "warn" ? L3등록사실(r.조_건수, r.파싱품질, r.추출방식) : null,
              ocr: r.추출방식 === "ocr",
            });
            notify("이 문서로 판정합니다.");
            set기준재조회((n) => n + 1);
          }}
          거절={() => {
            set기준확인(null);
            notify("이 문서는 판정에 쓰지 않습니다.");
            set기준재조회((n) => n + 1);
          }}
        />
      )}
      {기준실패 && (
        <L3실패창
          실패={기준실패}
          닫기={() => set기준실패(null)}
          다시올리기={(파일) => void 기준문서올리기(파일)}
        />
      )}
      {연결창 && (
        <L3연결창
          문서={연결창}
          닫기={() => {
            set연결창(null);
            set기준재조회((n) => n + 1);
          }}
          저장됨={() => {
            set연결창(null);
            notify("조문 연결을 저장했어요. 다음 판정부터 반영돼요.");
            set기준재조회((n) => n + 1);
          }}
        />
      )}
      {editingProfile && (
        <div className="modal-backdrop">
          <section className="modal my-profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <header>
              <div>
                <h2 id="profile-edit-title">내 정보 수정</h2>
                <p>
                  {협약출처 === "실패"
                    ? "이메일·참여 사업·주관기관은 확인만 가능합니다. 협약 정보를 불러오지 못해 지금은 팀 이름만 수정할 수 있습니다."
                    : 협약출처 === "조회중"
                      ? "이메일·참여 사업·주관기관은 확인만 가능합니다. 협약 정보를 불러온 뒤에 수정할 수 있습니다."
                      : "이메일·참여 사업·주관기관은 확인만 가능합니다. 팀 이름과 협약 정보를 수정할 수 있습니다."}
                </p>
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
              {/* 주의: 참여 사업과 주관기관은 온보딩에서 정하고, 정해진 순간부터
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
              {/* 주의: 아래 5칸이 서버 기업 프로필의 `협약` 입니다. AI 점검이 「협약기간 밖 지출」·
                  「사업비 초과」·「현물 비율 한도」를 판단할 때 전제로 씁니다. */}
              <label>
                <span>협약 시작일</span>
                <input type="date" disabled={협약잠김} value={협약초안.시작일} onChange={(event) => set협약초안((v) => ({ ...v, 시작일: event.target.value }))} />
              </label>
              <label>
                <span>협약 종료일</span>
                <input type="date" disabled={협약잠김} value={협약초안.종료일} onChange={(event) => set협약초안((v) => ({ ...v, 종료일: event.target.value }))} />
              </label>
              <label>
                <span>정부지원금 (원)</span>
                <input inputMode="numeric" disabled={협약잠김} value={협약초안.정부지원.toLocaleString("ko-KR")} onChange={(event) => set협약초안((v) => ({ ...v, 정부지원: Number(event.target.value.replace(/[^0-9]/g, "")) || 0 }))} />
              </label>
              <label>
                <span>자기부담금 현금 (원)</span>
                <input inputMode="numeric" disabled={협약잠김} value={협약초안.자기부담.toLocaleString("ko-KR")} onChange={(event) => set협약초안((v) => ({ ...v, 자기부담: Number(event.target.value.replace(/[^0-9]/g, "")) || 0 }))} />
              </label>
              {/* 주의: 현물은 비워 두면 「모름」, 0 이면 「현물 없음」입니다. 서버가 「현물은 총사업비의 20% 이하」
                  같은 비율 한도를 이 값으로 계산하므로 빈 칸을 0 으로 바꾸지 않습니다. */}
              <label>
                <span>자기부담금 현물 (원) <small className="profile-fixed-label">없으면 0</small></span>
                <input
                  inputMode="numeric"
                  placeholder="모르면 비워 두세요"
                  disabled={협약잠김}
                  value={협약초안.자기부담현물 == null ? "" : 협약초안.자기부담현물.toLocaleString("ko-KR")}
                  onChange={(event) => {
                    const 숫자만 = event.target.value.replace(/[^0-9]/g, "");
                    set협약초안((v) => ({ ...v, 자기부담현물: 숫자만 ? Number(숫자만) : null }));
                  }}
                />
              </label>
            </div>
            {협약출처 === "서버" && <협약경고알림 줄들={협약경고} 모달 />}
            <footer>
              <button className="outline" onClick={() => setEditingProfile(false)}>취소</button>
              <button className="primary" disabled={!profileDraft.host.trim() || 협약저장중} onClick={() => {
                // 주의: 협약을 '안 고쳤으면' 서버에 보내지 않습니다. 비교 기준은 수정 창을 연 때의 값입니다
                //    (예시를 보여 주던 계정은 빈 값). 이 브라우저에만 있는 값은 안 고쳐도 보냅니다 —
                //    안 보내면 화면에는 보이는데 판정에는 쓰이지 않는 상태가 계속됩니다.
                const 기준 = 협약출처 === "서버" || 협약출처 === "이 브라우저" ? 협약 : 빈협약;
                const 보낼값있음 =
                  !협약잠김 &&
                  (JSON.stringify(협약초안) !== JSON.stringify(기준) || 협약출처 === "이 브라우저");
                // 주의: 일부만 넣으면 나머지가 0·빈 값으로 저장되어 판정의 전제가 됩니다.
                //    다른 값을 바꾸기 전에 막습니다. 뒤에서 막으면 취소를 눌러도 팀 이름이 바뀌어 있습니다.
                if (보낼값있음 && (!협약초안.시작일 || !협약초안.종료일 || !협약초안.정부지원)) {
                  notify("협약 시작일·종료일·정부지원금을 모두 입력해 주세요.");
                  return;
                }
                if (보낼값있음 && 협약초안.시작일 > 협약초안.종료일) {
                  notify("협약 시작일이 종료일보다 늦습니다.");
                  return;
                }
                // 화면은 먼저 바꿉니다 — 서버가 못 받아도 시연이 끊기면 안 됩니다.
                setProfile(profileDraft);
                // 주의: 팀 이름은 Supabase 계정에 붙여야 다음 로그인에도 남습니다.
                //    실패해도 '막지 않습니다' — 화면 표기일 뿐입니다.
                //    쓰기가 끝난 '뒤' 다시 읽습니다. 안 그러면 아래 effect 가
                //    옛 값으로 방금 저장한 이름을 덮습니다.
                팀이름기억(profileDraft.team.trim());
                supabase팀이름쓰기(profileDraft.team)
                  .catch(() => false)
                  .finally(() => set팀갱신((n) => n + 1));
                사업저장(profileDraft.program);
                if (!보낼값있음) {
                  setEditingProfile(false);
                  notify(협약출처 === "실패"
                    ? "내 정보를 저장했습니다. 협약 정보는 불러오지 못해 저장하지 않았습니다."
                    : "내 정보를 저장했습니다.");
                  return;
                }
                const 이전협약 = 협약;
                set협약(협약초안);
                set협약저장중(true);
                협약쓰기(협약초안)
                  .then(({ 결과, 사유, 경고 }) => {
                    // 주의: 서버가 받으면 서버 값이 기준이므로 로컬 값을 지웁니다. 게스트·mock 은 서버에
                    //    안 남아서 이 브라우저에 기억합니다. 서버가 거부하면(422 등) 기억하지 않고 화면도
                    //    되돌립니다 — 거부된 값이 화면에 남으면 판정이 쓰는 값과 어긋납니다.
                    if (결과 === "저장됨") {
                      협약잊기();
                      set협약출처("서버");
                      set협약경고(경고);
                    } else if (결과 === "실패") set협약(이전협약);
                    else {
                      협약기억(협약초안);
                      set협약출처("이 브라우저");
                    }
                    if (결과 !== "실패") {
                      setEditingProfile(false);
                      window.dispatchEvent(new Event(협약저장알림));
                    }
                    notify(
                      결과 === "저장됨"
                        ? "내 정보를 저장했습니다. 다음 점검부터 반영됩니다."
                        : 결과 === "서버가안받음"
                          ? "내 정보를 수정했습니다. (현재 mock 서버라 서버에는 저장되지 않습니다)"
                          : 결과 === "로그인필요"
                            ? "이 브라우저에만 저장했습니다. 로그인하면 서버에 저장되어 점검에 반영됩니다."
                            : 사유
                              ? `서버에 저장하지 못했습니다. ${사유}`
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
            <b>써도돼요 AI</b>
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
