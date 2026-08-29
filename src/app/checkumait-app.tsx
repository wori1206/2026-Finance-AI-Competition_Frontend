"use client";
import { useEffect, useMemo, useState } from "react";
import { INITIAL_PLANS } from "../lib/mock-data";
import { planService } from "../lib/plan-service";
import type { AppRoute, ExpensePlan, PlanStatus, ScheduleItem } from "../lib/types";
import { SendButton } from "./send-button";
import "./detail-refinement.css";

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

const iconPaths: Record<string, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></>,
  plans: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  chat: <><path d="M5 17.5 3.5 21l4-1.5A9 9 0 1 0 5 17.5Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  rules: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z"/><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z"/></>,
  sparkSolid: <path d="M12 2.5c.9 4.8 3.7 7.6 8.5 8.5-4.8.9-7.6 3.7-8.5 8.5-.9-4.8-3.7-7.6-8.5-8.5 4.8-.9 7.6-3.7 8.5-8.5Z" fill="currentColor" stroke="none"/>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  back: <path d="m15 18-6-6 6-6"/>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  alert: <><path d="M12 3 2.8 20h18.4Z"/><path d="M12 9v4M12 17h.01"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2.5 19h19"/></>,
  edit: <><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8Z"/><path d="m14.5 6.3 3.2 3.2"/></>,
  paperclip: <path d="m9 12 5.2-5.2a3 3 0 1 1 4.2 4.2l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.1-7.1"/>,
  fileText: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  fileAlert: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5M12 11v4M12 18h.01"/></>,
  clipboardCheck: <><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8.5 13l2.2 2.2 4.8-5"/></>,
  bulb: <><path d="M9 18h6M10 22h4"/><path d="M8.2 14.8A7 7 0 1 1 15.8 14.8C14.7 15.6 14.5 16.5 14.5 18h-5c0-1.5-.2-2.4-1.3-3.2Z"/></>,
  upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></>,
  filter: <><path d="M4 5h16l-6.5 7v6l-3 1v-7Z"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{iconPaths[name]}</svg>;
}

const navItems = [
  { page: "home", label: "홈", icon: "home" },
  { page: "plans", label: "지출 계획", icon: "plans" },
  { page: "ai-chat", label: "AI CHAT", icon: "chat" },
  { page: "schedule", label: "집행 일정", icon: "calendar" },
  { page: "rules", label: "규정·지침", icon: "rules" },
] as const;

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
  "회의비",
] as const;

const FEE_SUBTYPES = [
  "기술이전", "학회·세미나", "전시회·박람회", "시험·인증",
  "멘토링", "기자재 임차", "사무실 임차", "운반",
  "보험", "보관", "회계감사", "세무기장",
  "법인설립", "기술보호", "수리", "규제애로 해소 법률컨설팅",
] as const;

type CheckQuestion = { label: string; options?: string[] };

const CATEGORY_QUESTIONS: Record<string, CheckQuestion[]> = {
  "재료비": [{ label: "구매한 재료가 시제품의 일부가 되나요?" }, { label: "어떤 방식으로 준비하나요?", options: ["완성된 재료 구매", "맞춤 제작 의뢰", "확인 필요"] }, { label: "구매 수량은 시제품 제작에 필요한 범위인가요?" }, { label: "협약기간 안에 모두 납품하고 사용할 예정인가요?" }],
  "외주용역비": [{ label: "업체의 사업자등록 업종이 이번 과업과 관련되어 있나요?" }, { label: "해당 업체가 이 분야에서 1년 이상 사업을 수행했나요?" }, { label: "대표자나 임직원이 현재 또는 최근 2년 내 해당 업체에서 근무한 적이 있나요?" }, { label: "이번 사업에 참여 중인 다른 창업기업인가요?" }, { label: "프리랜서 중개 서비스를 통한 계약인가요?" }, { label: "제품을 대량 생산하기 위한 용역인가요?" }],
  "기계장치비": [{ label: "사업비로 구매한 PC·장비를 이미 보유하고 있나요?" }, { label: "구매하려는 제품은 어떤 상태인가요?", options: ["신품", "중고", "확인 필요"] }, { label: "충전 후 차감되는 방식으로 결제하나요?" }],
  "특허권 등 무형자산 취득비": [{ label: "최초 협약 시작 이후에 새로 출원하는 건인가요?" }, { label: "출원인은 누구인가요?", options: ["창업기업 법인", "대표자 개인", "공동 출원", "확인 필요"] }, { label: "다른 기관 또는 기업과 공동출원하나요?" }, { label: "변리사 성공보수료가 포함되어 있나요?" }],
  "인건비": [{ label: "해당 직원은 4대사회보험에 가입되어 있나요?" }, { label: "대표자의 배우자 또는 직계존비속인가요?" }, { label: "다른 정부지원사업의 자기부담금 또는 현물 인력으로 등록되어 있나요?" }, { label: "최근 3년 이내 근로소득이 있나요?" }, { label: "두루누리 사회보험료 지원 대상자인가요?" }],
  "교육훈련비": [{ label: "교육 대상자가 4대사회보험에 가입되어 있나요?" }, { label: "교재 등 문헌 구매 비용이 포함되어 있나요?" }, { label: "정부에서 교육비 일부를 환급해주는 과정인가요?" }, { label: "고용노동부 등이 운영하는 교육의 본인부담금인가요?" }],
  "여비": [{ label: "실제 사업 목적의 출장인가요?" }, { label: "다른 정부부처·지자체·기관에서 이 출장비를 지원받고 있나요?" }],
  "광고선전비": [{ label: "광고대행사와 별도 계약을 체결하나요?" }, { label: "광고비를 미리 충전한 뒤 사용액만 차감하는 방식인가요?" }, { label: "충전한 금액은 협약기간 안에 모두 사용할 예정인가요?" }],
  "회의비": [{ label: "회의 목적과 참석자가 사업 수행에 직접 관련되어 있나요?" }, { label: "외부 참석자가 포함되어 있나요?" }, { label: "기관의 1인당 회의비 기준을 확인했나요?" }],
};

const FEE_QUESTIONS: Record<string, CheckQuestion[]> = {
  "기술이전": [{ label: "법적 권리를 보장받는 기술이전 계약인가요?" }, { label: "기술이전 금액의 산정 근거가 있나요?" }, { label: "기술평가 비용을 창업기업이 부담하나요?" }],
  "학회·세미나": [{ label: "참가자는 대표자 또는 4대사회보험 가입 임직원인가요?" }, { label: "행사 개최일이 협약기간 안인가요?" }],
  "전시회·박람회": [{ label: "어떤 비용이 포함되어 있나요?", options: ["참가·부스·통역비", "숙식·체제비", "교통비", "확인 필요"] }],
  "시험·인증": [{ label: "어떤 인증인가요?", options: ["제품 인증", "신규 시스템 인증", "시스템 인증 갱신", "확인 필요"] }, { label: "컨설팅 비용이 함께 포함되어 있나요?" }],
  "멘토링": [{ label: "멘토가 창업지원사업 전담조직 소속 인력인가요?" }, { label: "1인 1일 지급액이 30만원 이하인가요?" }],
  "기자재 임차": [{ label: "임차기간이 1개월 이상인가요?" }, { label: "어디에서 임차하나요?", options: ["대학·연구소 등 전문기관", "민간기업", "확인 필요"] }],
  "사무실 임차": [{ label: "어떤 공간인가요?", options: ["사업장 사무실", "공장·연구소", "공유오피스", "기타"] }, { label: "임대인의 사업자등록증에 부동산업·임대업이 등록되어 있나요?" }, { label: "보증금 또는 관리비가 포함되어 있나요?" }],
  "운반": [{ label: "창업아이템 수출 과정에서 발생하는 비용인가요?" }], "보험": [{ label: "창업아이템 수출과 관련된 보험인가요?" }], "보관": [{ label: "수출 과정에서 발생하는 보관료인가요?" }],
  "회계감사": [{ label: "전문기관에서 지정한 회계법인이 진행하는 사업비 회계감사인가요?" }], "세무기장": [{ label: "연간 기장료를 미리 한 번에 지급하나요?" }, { label: "세무사무소에 직접 지급하나요?" }],
  "법인설립": [{ label: "온라인법인설립시스템을 이용하나요?" }, { label: "어떤 비용인가요?", options: ["잔액고 증명 수수료", "법인등록면허세", "법인등기수수료", "기타"] }], "기술보호": [{ label: "창업기업지원 서비스 바우처 사업에 선정되어 있나요?" }, { label: "어떤 비용인가요?", options: ["기술임치", "기술임치 갱신", "기타 기술보호", "확인 필요"] }],
  "수리": [{ label: "외부 업체를 통한 수리인가요?" }, { label: "어떤 작업인가요?", options: ["고장·파손 복구", "기능향상 업그레이드", "확인 필요"] }], "규제애로 해소 법률컨설팅": [{ label: "창업아이템 관련 규제 개선·법률 검토인가요?" }, { label: "컨설팅 완료 후 비용을 지급하나요?" }],
};

function Status({ value }: { value: PlanStatus }) {
  const key = value === "특이사항 없음" ? "safe" : value === "위험" ? "risk" : "warn";
  return <span className={`status status-${key}`}><Icon name={key === "safe" ? "check" : key === "warn" ? "fileAlert" : "alert"} size={14}/>{value}</span>;
}

export default function CheckumaitApp() {
  const [signedIn, setSignedIn] = useState(false);
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
    Promise.all([planService.listPlans(), planService.listSchedules()]).then(([planRows, scheduleRows]) => {
      setPlans(planRows); setSchedules(scheduleRows);
    });
    const onPop = (event: PopStateEvent) => setRoute((event.state as AppRoute) || { page: "home" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (next: AppRoute) => {
    window.history.pushState(next, "");
    setRoute(next); setMobileNav(false); setAccountOpen(false); window.scrollTo(0, 0);
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2300); };
  const persistPlans = (next: ExpensePlan[]) => { setPlans(next); void planService.savePlans(next); };
  const persistSchedules = (next: ScheduleItem[]) => { setSchedules(next); void planService.saveSchedules(next); };
  const deletePlan = (id: string) => {
    const target = plans.find(plan => plan.id === id);
    if (!target || !window.confirm(`'${target.name}' 지출 계획을 삭제할까요? 연결된 집행 일정도 함께 삭제됩니다.`)) return;
    persistPlans(plans.filter(plan => plan.id !== id));
    persistSchedules(schedules.filter(item => item.planId !== id));
    notify("지출 계획과 연결된 일정을 삭제했습니다.");
  };

  if (!signedIn) return <Login onEnter={(destination) => { window.sessionStorage.setItem("checkumait-signed-in", "true"); setRoute({ page: destination }); setSignedIn(true); }} />;
  const activePage = route.page === "plan-detail" || route.page === "plan-new" ? "plans" : route.page;

  return <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <button className="brand" onClick={() => go({ page: "home" })} aria-label="CHECKUMAIT 홈"><span className="brand-mark"><Icon name="check" size={20}/></span><strong>CHECKUMAIT</strong></button>
      <nav className="side-nav" aria-label="주요 메뉴">{navItems.map(item => <button key={item.page} className={activePage === item.page ? "active" : ""} onClick={() => go({ page: item.page } as AppRoute)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="side-bottom"><section className="project-mini"><span>참여 중인 프로젝트</span><b>2026 초기창업패키지</b><small>한빛대학교 창업지원센터 · D-129</small></section><div className="account-row"><button className="account-main" onClick={() => setProfileOpen(true)}><span className="avatar">홍</span><span><b>홍길동</b><small>팀 루멘</small></span></button><button className="more-button" aria-label="계정 메뉴" onClick={() => setAccountOpen(v => !v)}><Icon name="more"/></button>{accountOpen && <div className="account-menu"><button onClick={() => setProfileOpen(true)}>내 정보</button><button className="danger" onClick={() => { window.sessionStorage.removeItem("checkumait-signed-in"); setSignedIn(false); setAccountOpen(false); }}>로그아웃</button></div>}</div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="메뉴 닫기" onClick={() => setMobileNav(false)}/>} 
    <main className="main-area"><header className="topbar"><div className="topbar-leading"><button className="sidebar-toggle" onClick={() => window.innerWidth <= 800 ? setMobileNav(true) : setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}>☰</button><span className="top-title">{route.page === "plan-detail" ? "지출 상세" : navItems.find(item => item.page === activePage)?.label || "CHECKUMAIT"}</span></div></header>
      {route.page === "home" && <HomePage plans={plans} schedules={schedules} go={go}/>} 
      {route.page === "plans" && <PlansPage plans={plans} go={go} remove={deletePlan} update={(plan)=>persistPlans(plans.map(item=>item.id===plan.id?plan:item))}/>} 
      {route.page === "plan-new" && <NewPlanPage save={(plan) => { persistPlans([plan, ...plans]); go({ page: "plan-detail", id: plan.id }); notify("지출 계획을 저장하고 AI 점검을 완료했습니다."); }} cancel={() => go({ page: "plans" })}/>} 
      {route.page === "plan-detail" && <PlanDetail plan={plans.find(plan => plan.id === route.id)} update={(plan) => persistPlans(plans.map(row => row.id === plan.id ? plan : row))} addSchedule={(item) => { persistSchedules([...schedules, item]); notify("집행 일정에 추가했습니다."); }} back={() => go({ page: "plans" })} notify={notify}/>} 
      {route.page === "ai-chat" && <AiChat plans={plans}/>} 
      {route.page === "schedule" && <SchedulePage plans={plans} schedules={schedules} save={persistSchedules} notify={notify}/>} 
      {route.page === "rules" && <RulesPage notify={notify}/>} 
    </main>
    <button className="floating-ai" onClick={() => setChatOpen(v => !v)}><span><Icon name="sparkSolid" size={18}/></span>AI에게 물어보기</button>
    {chatOpen && <FloatingChat plans={plans} route={route} close={() => setChatOpen(false)}/>} 
    {profileOpen && <ProfileModal close={() => setProfileOpen(false)} notify={notify}/>} 
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function OnboardingDemo() {
  return <section className="onboarding-demo" aria-label="AI 점검 결과 예시">
    <div className="demo-plan-card">
      <header><span>실제 AI 점검 예시</span><Status value="확인 필요"/></header>
      <h2>UI 디자인 외주 제작</h2>
      <strong>3,000,000원</strong>
      <dl><div><dt>예상 비목</dt><dd>외주용역비</dd></div><div><dt>예상 집행일</dt><dd>2026.09.30</dd></div><div><dt>거래처</dt><dd>㈜디자인랩</dd></div></dl>
    </div>
    <div className="demo-result-card">
      <span className="demo-result-label"><Icon name="sparkSolid" size={14}/>AI 종합 판단</span>
      <h3>결제 전에 확인이 필요해요</h3>
      <p>과업 범위와 가격 적정성을 확인할 수 있도록 아래 자료를 준비해주세요.</p>
      <ul><li className="done"><Icon name="check" size={14}/>사업 목적과 직접 관련성 확인</li><li><i/>비교견적 첨부 필요</li><li><i/>계약서·과업내용 준비</li></ul>
    </div>
  </section>;
}

function Login({ onEnter }: { onEnter: (destination: "home" | "plan-new") => void }) {
  const [step, setStep] = useState<"welcome" | "project" | "institution" | "upload" | "ready">("welcome");
  const [program, setProgram] = useState("2026 초기창업패키지");
  const [institutionQuery, setInstitutionQuery] = useState("");
  const [institution, setInstitution] = useState("");
  const [criteriaFile, setCriteriaFile] = useState("");
  const setupSteps = ["project", "institution", "upload", "ready"] as const;
  const stepIndex = Math.max(0, setupSteps.indexOf(step as typeof setupSteps[number]));
  const programs = [
    "2026 예비창업패키지",
    "2026 초기창업패키지",
    "2026 창업도약패키지",
    "2026 창업중심대학",
    "2026 재도전성공패키지",
    "2026 모두의 창업 일반・기술",
    "2026 초격차 스타트업 1000+",
    "2026 민관공동 창업자 발굴·육성",
  ];

  if (step === "welcome") return <main className="onboarding-landing">
    <header className="onboarding-nav"><div className="login-brand static"><span><Icon name="check" size={25}/></span>CHECKUMAIT</div><button className="outline" onClick={() => setStep("project")}>시작하기</button></header>
    <section className="onboarding-hero">
      <div className="onboarding-hero-copy"><p className="login-kicker">창업지원금, 쓰기 전에 AI가 먼저 확인해드려요</p><h1>사업비, 쓰기 전에<br/><em>AI가 먼저</em> 확인해드려요.</h1><p>지출 계획을 입력하면 비목부터 사전절차, 필요 증빙, 위험요소까지 현재 사업 기준으로 미리 점검합니다.</p><button className="primary large" onClick={() => setStep("project")}>시작하기</button></div>
      <OnboardingDemo/>
    </section>
    <section className="onboarding-feature-strip" aria-label="주요 기능"><article><Icon name="plans"/><div><b>비목 자동 판단</b><span>지출 목적에 맞는 비목을 추천해요.</span></div></article><article><Icon name="rules"/><div><b>규정·기준 점검</b><span>현재 사업과 기관 기준을 함께 확인해요.</span></div></article><article><Icon name="check"/><div><b>필요 증빙 안내</b><span>결제 전후에 필요한 자료를 정리해요.</span></div></article><article><Icon name="calendar"/><div><b>사전절차 체크</b><span>승인·견적·계약 일정을 놓치지 않게 해요.</span></div></article></section>
  </main>;

  return <main className="onboarding-setup"><header className="onboarding-nav"><div className="login-brand static"><span><Icon name="check" size={25}/></span>CHECKUMAIT</div><button className="outline" onClick={() => setStep("welcome")}>처음으로</button></header><section className="setup-shell"><nav className="onboarding-stepper" aria-label={`온보딩 ${stepIndex + 1}/4`}>{setupSteps.map((item, index) => <span key={item} className={`${index === stepIndex ? "current" : ""} ${index < stepIndex ? "complete" : ""}`}><i>{index < stepIndex ? <Icon name="check" size={13}/> : index + 1}</i>{["사업 선택","주관기관 선택","기관 기준 등록","설정 완료"][index]}</span>)}</nav><section className={`setup-content setup-${step}`}>
    {step === "project" && <><p className="login-kicker">선정 사업 설정</p><h1>어떤 지원사업에 선정되셨나요?</h1><p>선택한 사업의 공통 규정을 기준으로 지출 계획을 점검합니다.</p><label className="onboarding-select">선정 사업<select value={program} onChange={event => setProgram(event.target.value)}>{programs.map(item => <option key={item} value={item}>{item}</option>)}</select></label><div className="project-choice active"><b>{program}</b><span>중소벤처기업부 · 창업진흥원</span><small>최초에는 주로 사용하는 사업 1개만 설정합니다.</small></div><div className="onboarding-actions"><button className="outline large" onClick={() => setStep("welcome")}>이전</button><button className="primary large" onClick={() => setStep("institution")}>다음</button></div></>}
    {step === "institution" && <><p className="login-kicker">주관기관 설정</p><h1>주관기관을 선택해주세요.</h1><p>기관별 사업비 집행기준을 함께 적용하기 위해 주관기관을 확인합니다.</p><label className="institution-search">주관기관 검색<span><Icon name="search" size={17}/><input value={institutionQuery} onChange={event => { setInstitutionQuery(event.target.value); setInstitution(""); }} placeholder="학교·기관 이름을 입력하세요"/></span></label><div className="institution-results"><small>검색 결과</small>{(!institutionQuery || "건국대학교".includes(institutionQuery)) ? <button className={institution === "건국대학교" ? "selected" : ""} onClick={() => { setInstitution("건국대학교"); setInstitutionQuery("건국대학교"); }}><span><b>건국대학교</b><small>서울특별시 광진구 · 창업지원단</small></span>{institution === "건국대학교" ? <Icon name="check" size={18}/> : <Icon name="arrow" size={16}/>}</button> : <p>일치하는 주관기관이 없습니다.</p>}</div><div className="onboarding-actions"><button className="outline large" onClick={() => setStep("project")}>이전</button><button className="primary large" disabled={!institution} onClick={() => setStep("upload")}>다음</button></div></>}
    {step === "upload" && <><p className="login-kicker">기관 세부기준 등록</p><h1>주관기관의 세부기준을 등록해주세요.</h1><p>기관에서 받은 사업비 집행기준이나 운영지침이 있다면 업로드해주세요. 지금 없다면 파일 없이 계속할 수 있습니다.</p><dl className="onboarding-standards"><div><dt>선정 사업</dt><dd>{program}</dd></div><div><dt>주관기관</dt><dd>{institution}</dd></div><div><dt>적용 기준</dt><dd>{criteriaFile ? "사업 공통 규정 + 기관 세부기준" : "사업 공통 규정 우선 적용"}</dd></div></dl><label className={`criteria-upload ${criteriaFile ? "complete" : ""}`}><input type="file" accept=".pdf,.hwp,.hwpx,.doc,.docx" onChange={event => setCriteriaFile(event.target.files?.[0]?.name || "")}/><span className="criteria-icon"><Icon name={criteriaFile ? "check" : "plus"} size={19}/></span><span><b>{criteriaFile || "기관 세부기준 파일 선택"}</b><small>{criteriaFile ? "업로드할 파일을 선택했습니다." : "선택사항 · PDF, HWP, HWPX, DOC, DOCX · 최대 20MB"}</small></span><em>{criteriaFile ? "파일 변경" : "파일 찾기"}</em></label><p className="onboarding-notice">{criteriaFile ? "등록한 문서는 기관별 금액 기준, 사전승인·심의 조건, 필요 증빙 판단에 사용됩니다." : "파일 없이 계속하면 사업 공통 규정을 우선 적용하며, 기관별 기준은 이후 추가할 수 있습니다."}</p><div className="onboarding-actions"><button className="outline large" onClick={() => setStep("institution")}>이전</button><button className="primary large" onClick={() => setStep("ready")}>설정 완료</button></div></>}
    {step === "ready" && <><p className="login-kicker">설정 완료</p><h1>준비됐어요. 첫 지출을 점검해볼까요?</h1><p>지출 계획을 작성하면 {criteriaFile ? "사업 공통 규정과 기관 세부기준을 함께" : "우선 사업 공통 규정을 기준으로"} 확인합니다.</p><div className="ready-project"><Icon name="check" size={20}/><span><b>{program}</b><small>{institution} · {criteriaFile || "기관 세부기준 미등록"}</small></span></div><div className="ready-actions"><button className="primary large" onClick={() => onEnter("home")}>홈으로 가기</button><button className="outline large" onClick={() => onEnter("plan-new")}>첫 계획 작성하기</button></div></>}
  </section></section></main>;
}

function HomePage({ plans, schedules, go }: { plans: ExpensePlan[]; schedules: ScheduleItem[]; go: (route: AppRoute) => void }) {
  const counts = { all: plans.length, safe: plans.filter(p => p.status === "특이사항 없음").length, warn: plans.filter(p => p.status === "확인 필요").length, risk: plans.filter(p => p.status === "위험").length };
  const attentionPlans = plans.filter(p => p.status !== "특이사항 없음").sort((a,b) => Number(b.status === "위험") - Number(a.status === "위험"));
  return <div className="page home-v3">
    <header className="home-v3-heading"><div><span>안녕하세요! <b>홍길동님.</b></span><h1>지출 계획을 점검하고 필요한 준비를 미리 확인해보세요.</h1></div><button className="primary home-v3-new" onClick={() => go({ page: "plan-new" })}><Icon name="plus"/>새 지출 계획</button></header>
    <div className="home-v3-overview"><section className="home-v3-project"><div className="home-v3-project-top"><span>진행 중인 사업</span><div><small>사업 종료까지</small><b>D-129</b></div></div><h2>2026 초기창업패키지</h2><p>한빛대학교 창업지원센터 · 사업화 자금</p><dl><div><Icon name="calendar" size={16}/><span><dt>사업기간</dt><dd>2026.03.01 ~ 2026.12.31</dd></span></div><div><Icon name="rules" size={16}/><span><dt>적용 기준</dt><dd>기관 최신 집행 안내 확인</dd></span></div></dl><button onClick={() => go({ page: "rules" })}>사업 정보 보기 <Icon name="arrow" size={15}/></button></section>
    <section className="home-v3-status"><header><h2>전체 지출 계획 현황</h2><button className="text-button" onClick={() => go({ page: "plans" })}>전체 보기 <Icon name="arrow" size={17}/></button></header><div className="home-v3-metrics"><div><Icon name="plans" size={26}/><span>전체</span><b>{counts.all}건</b></div><div className="warn"><Icon name="fileAlert" size={26}/><span>확인 필요</span><b>{counts.warn}건</b></div><div className="risk"><Icon name="alert" size={26}/><span>위험</span><b>{counts.risk}건</b></div><div className="safe"><Icon name="check" size={26}/><span>특이사항 없음</span><b>{counts.safe}건</b></div></div><p className="home-v3-status-note"><Icon name="bulb" size={17}/>계획 단계에서 점검할수록 문제없이 집행할 수 있어요.</p></section></div>
    <div className="home-v3-main"><section className="home-v3-panel home-v3-attention"><header><div><h2>지금 확인해주세요</h2><p>결제 전에 확인이 필요한 지출입니다.</p></div><button className="text-button" onClick={() => go({ page: "plans" })}>전체 보기 <Icon name="arrow" size={17}/></button></header><div className="home-v3-plan-list">{attentionPlans.slice(0,5).map(plan => <button className="home-v3-plan-row" key={plan.id} onClick={() => go({ page: "plan-detail", id: plan.id })}><span><b>{plan.name}</b><small>{plan.category} · {won(plan.amount)}</small></span><Status value={plan.status}/></button>)}</div><footer><span>더 많은 지출 계획을 점검하고 안전하게 집행하세요.</span><button className="outline small" onClick={() => go({ page: "plans" })}>전체 지출 계획 보기</button></footer></section>
    <section className="home-v3-panel home-v3-schedule"><header><div><h2>다가오는 일정</h2><p>주요 일정과 준비가 필요한 내용을 확인하세요.</p></div><button className="text-button" onClick={() => go({ page: "schedule" })}>전체 일정 보기 <Icon name="arrow" size={17}/></button></header><div className="home-v3-timeline">{schedules.slice(0,4).map(item => <button className="home-v3-schedule-row" key={item.id} onClick={() => go({ page: "schedule" })}><span className="timeline-marker"><i/></span><time><b>{item.date.slice(5).replace("-", ".")}</b><small>{item.type}</small></time><span><b>{item.title}</b><small>{plans.find(p => p.id === item.planId)?.name}</small></span><em className={item.state === "준비 필요" ? "need" : ""}>{item.state}</em></button>)}</div><footer><button className="outline" onClick={() => go({ page: "schedule" })}><Icon name="calendar" size={17}/>캘린더로 보기</button></footer></section></div>
  </div>;
}

function PlansPage({ plans, go, remove, update }: { plans: ExpensePlan[]; go: (route: AppRoute) => void; remove:(id:string)=>void; update:(plan:ExpensePlan)=>void }) {
  const [filter, setFilter] = useState<"전체" | PlanStatus>("전체"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<string[]>(plans.slice(0,3).map(plan=>plan.id));
  const [openMenu,setOpenMenu]=useState<string|null>(null); const [editing,setEditing]=useState<ExpensePlan|null>(null); const [draft,setDraft]=useState<ExpensePlan|null>(null);
  const rows = plans.filter(plan => (filter === "전체" || plan.status === filter) && (!query || `${plan.name} ${plan.vendor}`.toLowerCase().includes(query.toLowerCase())));
  const toggle = (id: string) => setSelected(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  const counts = { all: plans.length, safe: plans.filter(p=>p.status==="특이사항 없음").length, warn: plans.filter(p=>p.status==="확인 필요").length, risk: plans.filter(p=>p.status==="위험").length };
  return <div className="page plans-v2"><header className="plans-v2-heading"><div><h1>지출 계획</h1><p>전체 지출 계획을 등록하고, 점검이 필요한 항목을 선택해 AI 점검을 시작하세요.</p></div><div><label className="outline plans-v2-upload"><input type="file" accept=".pdf,.hwp,.hwpx,.doc,.docx,.xlsx"/><Icon name="upload" size={16}/>계획서 업로드</label><button className="primary" onClick={() => go({ page: "plan-new" })}><Icon name="plus"/>새 지출 계획</button></div></header>
    <section className="plans-v2-metrics"><button onClick={()=>setFilter("전체")}><span className="metric-icon all"><Icon name="plans"/></span><span><small>전체</small><b>{counts.all}건</b></span></button><button onClick={()=>setFilter("확인 필요")}><span className="metric-icon warn"><Icon name="fileText"/></span><span><small>확인 필요</small><b>{counts.warn}건</b></span></button><button onClick={()=>setFilter("위험")}><span className="metric-icon risk"><Icon name="alert"/></span><span><small>위험</small><b>{counts.risk}건</b></span></button><button onClick={()=>setFilter("특이사항 없음")}><span className="metric-icon safe"><Icon name="check"/></span><span><small>특이사항 없음</small><b>{counts.safe}건</b></span></button></section>
    <nav className="plans-v2-tabs" aria-label="지출 상태 필터">{(["전체","확인 필요","위험","특이사항 없음"] as const).map(label => <button className={filter === label ? "active" : ""} key={label} onClick={() => setFilter(label)}>{label}</button>)}</nav>
    <div className="plans-v2-tools"><div><label className="plans-v2-search"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="지출명, 거래처로 검색"/></label><button className="outline"><Icon name="filter" size={16}/>필터</button></div><button className="outline plans-v2-sort">최근 수정순 <span>⌄</span></button></div>
    <section className="plans-v2-table">{selected.length > 0 && <div className="plans-v2-selection"><b>{selected.length}건 선택됨</b><div><button className="primary small" onClick={() => go({ page: "plan-detail", id: selected[0] })}><Icon name="spark" size={15}/>선택한 {selected.length}건 AI 점검</button><button className="outline small" onClick={() => setSelected([])}>선택 해제</button></div></div>}<div className="plans-v2-head"><label><input type="checkbox" checked={rows.length>0&&rows.every(plan=>selected.includes(plan.id))} onChange={()=>setSelected(rows.every(plan=>selected.includes(plan.id))?[]:rows.map(plan=>plan.id))}/></label><span>지출명</span><span>사용 목적</span><span>예상 금액</span><span>예상 비목</span><span>AI 점검 상태</span><span>다음 행동</span><span>최근 수정일</span><span>더보기</span></div>{rows.map(plan => <div className="plans-v2-row" key={plan.id} onClick={() => go({ page: "plan-detail", id: plan.id })}><label onClick={event=>event.stopPropagation()}><input type="checkbox" checked={selected.includes(plan.id)} onChange={()=>toggle(plan.id)}/></label><b>{plan.name}</b><span>{plan.purpose}</span><strong>{won(plan.amount)}</strong><span>{plan.category}</span><Status value={plan.status}/><em>{plan.nextAction}</em><time>{plan.updatedAt}</time><div className="row-menu" onClick={event=>event.stopPropagation()}><button aria-label={`${plan.name} 메뉴`} onClick={()=>setOpenMenu(value=>value===plan.id?null:plan.id)}><Icon name="more" size={17}/></button>{openMenu===plan.id&&<div><button onClick={()=>{setEditing(plan);setDraft(plan);setOpenMenu(null);}}><Icon name="edit" size={14}/>수정</button><button className="danger" onClick={()=>{remove(plan.id);setSelected(value=>value.filter(id=>id!==plan.id));setOpenMenu(null);}}><Icon name="trash" size={14}/>삭제</button></div>}</div></div>)}<footer><span>전체 {plans.length}건</span><nav aria-label="페이지 이동"><button aria-label="이전 페이지">‹</button><button className="active">1</button><button>2</button><button>3</button><button aria-label="다음 페이지">›</button></nav><button className="outline small">10개씩 <span>⌄</span></button></footer></section>
    {editing&&draft&&<EditPlan plan={draft} setPlan={setDraft} close={()=>{setEditing(null);setDraft(null);}} save={()=>{update(draft);setEditing(null);setDraft(null);}}/>}
  </div>;
}

function NewPlanPage({ save, cancel }: { save: (plan: ExpensePlan) => void; cancel: () => void }) {
  const [step, setStep] = useState(1); const [name, setName] = useState(""); const [purpose, setPurpose] = useState(""); const [amount, setAmount] = useState(""); const [date, setDate] = useState("2026-09-30"); const [vendor, setVendor] = useState(""); const [category, setCategory] = useState("외주용역비"); const [feeSubtype, setFeeSubtype] = useState("멘토링");
  const recommendation = useMemo(() => name.includes("노트북") || name.includes("카메라") ? "기계장치비" : name.includes("특허") || name.includes("상표") ? "특허권 등 무형자산 취득비" : name.includes("급여") || name.includes("인건비") ? "인건비" : name.includes("교육") || name.includes("훈련") ? "교육훈련비" : name.includes("출장") || name.includes("교통") ? "여비" : name.includes("회의") ? "회의비" : name.includes("광고") ? "광고선전비" : name.includes("멘토") || name.includes("임차") || name.includes("인증") ? "지급수수료" : name.includes("부품") || name.includes("원단") || name.includes("재료") ? "재료비" : "외주용역비", [name]);
  const questions = category === "지급수수료" ? FEE_QUESTIONS[feeSubtype] : CATEGORY_QUESTIONS[category];
  const submit = () => { const base = INITIAL_PLANS.find(p => p.category === category) || INITIAL_PLANS[0]; const categoryLabel = category === "지급수수료" ? `${category} · ${feeSubtype}` : category; save({ ...base, id: `plan-${Date.now()}`, name: name || "새 지출 계획", purpose: purpose || "사업 수행을 위한 지출", amount: Number(amount.replace(/,/g, "")) || 0, plannedDate: date, vendor: vendor || "거래처 미정", category: categoryLabel, status: category === "광고선전비" ? "특이사항 없음" : "확인 필요", nextAction: category === "기계장치비" ? "구매 필요성 보완" : category === "회의비" ? "단가 기준 확인" : category === "지급수수료" ? `${feeSubtype} 조건 확인` : "추가정보 확인", updatedAt: "2026.08.24 방금 전", aiSummary: `${categoryLabel}로 분류했습니다. 입력한 목적과 금액을 바탕으로 결제 전 확인할 항목과 증빙을 정리했습니다.` }); };
  return <div className="page narrow"><header className="detail-top"><button className="back-button" onClick={cancel}><Icon name="back"/></button><div><span className="breadcrumb">지출 계획 / 새 지출 계획</span><h1>새 지출 계획</h1><p>기본 정보를 입력하면 AI가 비목과 확인 항목을 추천합니다.</p></div></header><div className="stepper"><span className={step >= 1 ? "active" : ""}>1 기본 정보</span><i/><span className={step >= 2 ? "active" : ""}>2 비목 확인</span><i/><span className={step >= 3 ? "active" : ""}>3 추가 확인</span></div><section className="form-card">{step === 1 && <><h2>기본 정보</h2><div className="field-grid"><label className="full"><span className="field-label">지출 항목 <em className="required-mark">*</em></span><input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 개발용 노트북 구매"/></label><label className="full"><span className="field-label">사용 목적 <em className="required-mark">*</em></span><textarea value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="사업 수행에 왜 필요한지 작성해주세요."/></label><label><span className="field-label">예상 금액 <em className="required-mark">*</em></span><input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9]/g,""))} placeholder="0"/></label><label>예상 지출일<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="full">거래처<input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="미정인 경우 비워둘 수 있어요."/></label><div className="full file-field"><span className="field-label">첨부파일</span><small>견적서·과업자료 등이 있다면 첨부해주세요.</small><button type="button">+ 파일 첨부</button></div></div></>}{step === 2 && <><h2>AI 비목 추천</h2><p className="section-copy">입력한 지출 내용과 목적을 바탕으로 가장 가까운 비목을 자동 선택했습니다. 직접 변경할 수 있습니다.</p><div className="category-grid">{EXPENSE_CATEGORIES.map(item => <button key={item} className={`${category === item ? "selected" : ""} ${recommendation === item ? "recommended" : ""}`} onClick={()=>setCategory(item)}><span>{item}</span>{recommendation === item && <em>AI 추천</em>}</button>)}</div>{category === "지급수수료" && <section className="fee-subtype-panel"><header><b>어떤 지급수수료인가요?</b><span>세부 유형에 따라 확인 기준과 필요 증빙이 달라집니다.</span></header><div>{FEE_SUBTYPES.map(item => <button key={item} className={feeSubtype === item ? "selected" : ""} onClick={() => setFeeSubtype(item)}>{item}</button>)}</div></section>}</>}{step === 3 && <><h2>추가로 확인할게요</h2><p className="section-copy">{category === "지급수수료" ? `${feeSubtype} 기준으로 필요한 정보만 확인합니다.` : `${category} 판단에 필요한 정보만 확인합니다.`}</p><div className="auto-check-note"><Icon name="check"/><span><b>입력 내용으로 먼저 확인했어요</b>예상 금액·지출일·사용 목적·거래처 정보는 자동 점검에 반영됩니다.</span></div><div className="question-list">{questions.map((question,index)=><Question key={`${category}-${feeSubtype}-${index}`} label={question.label} options={question.options}/>)}</div><div className="info-note"><Icon name="spark"/>답변을 반영해 공통 기준과 비목별 기준을 함께 점검합니다.</div></>}</section><footer className="form-actions"><button className="outline" onClick={step === 1 ? cancel : () => setStep(step-1)}>{step === 1 ? "취소" : "이전"}</button><button className="primary" disabled={step===1 && (!name || !purpose || !amount)} onClick={() => { if (step === 1) { setCategory(recommendation); setStep(2); } else if (step === 2) setStep(3); else submit(); }}>{step === 1 ? "비목 확인하기" : step === 2 ? "추가 확인하기" : "저장하고 AI 점검"}</button></footer></div>;
}

function Question({ label, options = ["예", "아니오", "확인 필요"] }: CheckQuestion) { const [value,setValue]=useState(""); return <div className="question"><b>{label}</b><div>{options.map(option=><button key={option} className={value===option?"active":""} onClick={()=>setValue(option)}>{option}</button>)}</div></div>; }

function PlanDetail({ plan, update, addSchedule, back, notify }: { plan?: ExpensePlan; update:(plan:ExpensePlan)=>void; addSchedule:(item:ScheduleItem)=>void; back:()=>void; notify:(message:string)=>void }) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(plan);
  if(!plan || !draft) return <div className="page"><div className="empty-state"><h1>지출 계획을 찾을 수 없습니다.</h1><button className="primary" onClick={back}>목록으로</button></div></div>;
  const toggle=(group:"aiChecks"|"evidence",id:string)=>{ const next={...plan,[group]:plan[group].map(item=>item.id===id?{...item,done:!item.done}:item)}; update(next); };
  const scheduleCheck=()=>{const target=plan.aiChecks.find(item=>!item.done)?.label||plan.nextAction;addSchedule({id:`schedule-${Date.now()}`,planId:plan.id,title:target,date:plan.plannedDate,type:"기타",state:"준비 필요"});notify("확인사항을 집행 일정에 등록했습니다.");};
  const pendingChecks=plan.aiChecks.filter(item=>!item.done).length;
  const files=[{name:`${plan.name} 견적서.pdf`,size:"245KB"},{name:`${plan.category} 참고자료.pdf`,size:"312KB"}];
  return <div className="page expense-detail-page expense-detail-redesign expense-v5">
    <header className="expense-v5-header">
      <div className="expense-v5-toolbar"><button className="detail-back-link" onClick={back}><Icon name="back" size={16}/>지출 계획</button><div className="detail-actions"><button className="outline" onClick={()=>{setDraft(plan);setEditing(true);}}>수정</button><button className="more-square" aria-label="더보기" onClick={()=>notify("삭제 기능은 프로토타입에서 실행하지 않습니다.")}><Icon name="more"/></button></div></div>
      <span className="expense-v5-breadcrumb">지출 계획 <b>›</b> 지출 상세</span><h1>{plan.name}</h1><p>최근 수정 {plan.updatedAt}</p>
    </header>
    <main className="expense-v5-flow">
      <section className="expense-v5-section expense-v5-plan"><header className="expense-v5-section-head"><h2>지출 계획 정보</h2></header><dl className="expense-v5-plan-grid"><Info label="지출 항목" value={plan.name}/><Info label="관련 비목" value={plan.category}/><Info label="예상 금액" value={`${won(plan.amount)} (부가세 포함)`}/><Info label="예상 지출일" value={plan.plannedDate.replaceAll("-", ".")}/><Info label="거래처" value={plan.vendor}/><Info label="사업" value="2026 초기창업패키지"/><Info label="사용 목적" value={plan.purpose} className="wide"/><Info label="상세 설명" value={`${plan.purpose}에 필요한 산출물과 검수 기준을 포함합니다.`} className="wide"/><div className="expense-v5-file-row"><span>첨부 파일</span><div><ul>{files.map(file=><li key={file.name}><Icon name="fileText" size={15}/><b>{file.name}</b><small>{file.size}</small><button aria-label={`${file.name} 다운로드`} onClick={()=>notify(`${file.name} 다운로드를 준비했습니다.`)}>↓</button><button aria-label={`${file.name} 삭제`} onClick={()=>notify("첨부 파일 삭제는 프로토타입에서 실행하지 않습니다.")}>×</button></li>)}</ul><footer><button className="outline small" onClick={()=>notify("첨부 파일 선택 창을 열었습니다.")}>파일 추가</button><small>최대 10개 / 개별 20MB 이하</small></footer></div></div></dl></section>
      <section className="expense-v5-section expense-v5-ai"><header className="expense-v5-section-head"><div><Icon name="alert" size={17}/><h2>AI 점검 결과</h2></div></header><div className="expense-v5-ai-panel"><div className="expense-v5-ai-verdict"><Status value={plan.status}/><h3>{plan.category} 기준으로 {plan.status === "특이사항 없음" ? "특이사항이 없습니다." : "추가 확인이 필요합니다."}</h3></div><div className="expense-v5-ai-comment"><Icon name="spark" size={16}/><span><b>AI 코멘트</b><small>{plan.status === "특이사항 없음" ? "현재 조건에서는 주요 사전 준비가 확인됐습니다. 집행 후 증빙을 빠짐없이 보관하세요." : "외주 과업과 사업계획의 연관성은 확인됐습니다. 계약 전 과업 범위, 결과물, 검수 기준을 문서로 명확히 해야 합니다."}</small></span></div><button className="expense-v5-scroll-cta" onClick={()=>document.getElementById("payment-before")?.scrollIntoView({behavior:"smooth",block:"center"})}>결제 전 확인 사항 {pendingChecks}건 <Icon name="arrow" size={15}/></button></div></section>
      <details className="expense-v5-card expense-v5-rules"><summary><div><Icon name="rules" size={17}/><span><h2>적용 근거</h2><small>이번 판단에 사용된 규정과 조항입니다.</small></span></div><b>{plan.rules.length}건 <Icon name="arrow" size={14}/></b></summary><div className="expense-v5-rule-list">{plan.rules.map((rule,index)=><article key={index}><span>{index+1}</span><div><b>{rule.title}</b><small>{rule.source}</small><p>{rule.description}</p></div></article>)}</div></details>
      <section className="expense-v5-section expense-v5-prep"><header className="expense-v5-section-head"><div><h2>집행 준비</h2><p>결제 전 확인부터 지출 후 증빙까지 단계별로 관리하세요.</p></div></header><div className="expense-v5-prep-grid"><section id="payment-before"><header><div><h3>결제 전 확인</h3><small>결제 전에 완료해야 하는 항목</small></div><b>{plan.aiChecks.filter(item=>item.done).length}/{plan.aiChecks.length}</b></header><div className="expense-v5-checks">{plan.aiChecks.map((item,index)=><label key={item.id} className={item.done?"done":""}><input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggle("aiChecks",item.id)}/><span><b>{item.label}</b><small>{item.description}</small></span><em>{item.done?"완료":index===1?"필수":"권장"}</em></label>)}</div><footer><button className="outline small" onClick={scheduleCheck}>일정에 추가</button></footer></section><section><header><div><h3>결제 후 필요 증빙</h3><small>실제 지출 후 등록해야 하는 자료</small></div><b>{plan.evidence.filter(item=>item.done).length}/{plan.evidence.length}</b></header><div className="expense-v5-checks evidence">{plan.evidence.map(item=><div key={item.id} className={`expense-v5-evidence-item ${item.done?"done":""}`}><label><input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggle("evidence",item.id)}/><span><b>{item.label}</b><small>{item.description}</small></span></label><label className="outline small expense-v5-upload"><input type="file" onChange={()=>notify(`${item.label} 파일을 업로드했습니다.`)}/><Icon name="upload" size={14}/>파일 업로드</label></div>)}</div><footer><button className="outline small expense-v5-pdf" onClick={()=>notify("필요 증빙 목록 PDF 다운로드를 준비했습니다.")}><Icon name="fileText" size={14}/>필요 증빙 PDF 다운로드</button></footer></section></div></section>
    </main>
    {editing && <EditPlan plan={draft} setPlan={setDraft} close={()=>setEditing(false)} save={()=>{update(draft);setEditing(false);notify("지출 계획을 수정했습니다.");}}/>}
  </div>;
}

function LegacyPlanDetail({ plan, update, addSchedule, back, notify }: { plan?: ExpensePlan; update:(plan:ExpensePlan)=>void; addSchedule:(item:ScheduleItem)=>void; back:()=>void; notify:(message:string)=>void }) {
  const [editing,setEditing]=useState(false); const [draft,setDraft]=useState(plan); if(!plan || !draft) return <div className="page"><div className="empty-state"><h1>지출 계획을 찾을 수 없습니다.</h1><button className="primary" onClick={back}>목록으로</button></div></div>;
  const toggle=(group:"aiChecks"|"evidence",id:string)=>{ const next={...plan,[group]:plan[group].map(item=>item.id===id?{...item,done:!item.done}:item)}; update(next); };
  const scheduleCheck=()=>{const target=plan.aiChecks.find(item=>!item.done)?.label||plan.nextAction;addSchedule({id:`schedule-${Date.now()}`,planId:plan.id,title:target,date:plan.plannedDate,type:"기타",state:"준비 필요"});notify("확인사항을 집행 일정에 등록했습니다.");};
  return <div className="page expense-detail-page"><header className="detail-compact-header"><div className="detail-header-bar"><button className="detail-back-link" onClick={back}><Icon name="back" size={16}/>지출 계획</button><div className="detail-actions"><button className="outline" onClick={()=>{setDraft(plan);setEditing(true);}}>수정</button><button className="more-square" aria-label="더보기" onClick={()=>notify("삭제 기능은 프로토타입에서 실행하지 않습니다.")}><Icon name="more"/></button></div></div><div className="detail-summary"><h1>{plan.name}</h1><div className="detail-status-line recent-only"><span>최근 수정 {plan.updatedAt}</span></div></div></header><main className="detail-flow"><section className="detail-flat-section expense-info-section"><header className="detail-flat-head"><div className="section-title-with-icon"><Icon name="fileText" size={18}/><div><h2>지출 정보</h2><p>AI 점검에 사용한 작성 내용입니다.</p></div></div></header><dl className="compact-expense-info"><Info label="예상 비목" value={plan.category}/><Info label="예상 금액" value={won(plan.amount)}/><Info label="예상 지출일" value={plan.plannedDate.replaceAll("-", ".")}/><Info label="거래처" value={plan.vendor}/><Info label="사용 목적" value={plan.purpose} className="purpose"/></dl></section><section className="card ai-result detail-section emphasis-section"><header className="card-head detail-section-head"><div className="section-title-with-icon"><Icon name="alert" size={18}/><div className="card-title-copy"><h2>AI 점검 결과</h2><p>입력 내용과 적용 기준을 함께 분석했습니다.</p></div></div><Status value={plan.status}/></header><div className="result-body result-vertical"><div className="result-summary"><div><b>{plan.category} 기준으로 {plan.status === "특이사항 없음" ? "주요 준비가 확인됐습니다." : "추가 확인이 필요합니다."}</b><p>{plan.aiSummary}</p><strong className="result-action-count">결제 전 확인사항 {plan.aiChecks.filter(item=>!item.done).length}건</strong></div></div><div className="ai-comment compact-comment"><Icon name="spark" size={17}/><div><b>AI 코멘트</b><p>{plan.status === "특이사항 없음" ? "현재 입력된 조건에서는 주요 사전 준비가 확인됐습니다. 집행 후 거래·결과 증빙을 빠짐없이 보관하세요." : "기관별 승인 기준과 최신 안내를 추가로 확인한 뒤 결제를 진행하세요."}</p></div></div></div></section><section className="card checklist-card detail-section task-section before-task-section"><header className="card-head detail-section-head"><div className="section-title-with-icon"><Icon name="clipboardCheck" size={18}/><div className="card-title-copy"><h2>결제 전 확인</h2><p>결제 전에 완료해야 하는 항목입니다.</p></div></div><strong>{plan.aiChecks.filter(item=>item.done).length}/{plan.aiChecks.length}</strong></header><Checklist items={plan.aiChecks} toggle={id=>toggle("aiChecks",id)}/><div className="quick-schedule"><span><b>확인사항을 일정으로 관리</b><small>필요한 준비를 예상 지출일에 연결합니다.</small></span><button className="outline small" onClick={scheduleCheck}><Icon name="calendar"/>일정에 추가</button></div></section><details className="detail-disclosure rules-section"><summary><div className="section-title-with-icon"><Icon name="rules" size={18}/><div><h2>적용 근거</h2><p>이번 판단에 사용된 규정과 조항입니다.</p></div></div><span className="disclosure-action">{plan.rules.length}건 <Icon name="arrow" size={14}/></span></summary><div className="rule-list">{plan.rules.map((rule,index)=><article key={index}><span>{index+1}</span><div><b>{rule.title}</b><small>{rule.source}</small><p>{rule.description}</p></div></article>)}<button className="text-button rule-source-link" onClick={()=>notify("규정 원문 링크를 열었습니다.")}>규정 원문 보기</button></div></details><section className="card checklist-card detail-section task-section evidence-task-section"><header className="card-head detail-section-head"><div className="section-title-with-icon"><Icon name="paperclip" size={18}/><div className="card-title-copy"><h2>결제 후 필요 증빙</h2><p>지출 후 등록해야 하는 자료입니다.</p></div></div><strong>{plan.evidence.filter(item=>item.done).length}/{plan.evidence.length}</strong></header><EvidenceList items={plan.evidence} toggle={id=>toggle("evidence",id)}/><div className="after-payment-note"><b>결제 후 진행</b><span>실제 지출이 완료되면 자료를 하나씩 확인해 등록해주세요.</span></div></section></main>{editing && <EditPlan plan={draft} setPlan={setDraft} close={()=>setEditing(false)} save={()=>{update(draft);setEditing(false);notify("지출 계획을 수정했습니다.");}}/>}</div>;
}

void LegacyPlanDetail;

function Info({label,value,className=""}:{label:string;value:string;className?:string}){return <div className={className}><dt>{label}</dt><dd>{value}</dd></div>}
function Checklist({items,toggle}:{items:ExpensePlan["aiChecks"];toggle:(id:string)=>void}){return <div className="checklist action-checklist">{items.map(item=><label key={item.id}><input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggle(item.id)}/><span><b>{item.label}</b><small>{item.description}</small></span></label>)}</div>}
function EvidenceList({items,toggle}:{items:ExpensePlan["evidence"];toggle:(id:string)=>void}){return <div className="evidence-list evidence-checklist">{items.map(item=><label key={item.id} className={item.done?"done":""}><input type="checkbox" checked={Boolean(item.done)} onChange={()=>toggle(item.id)}/><span><b>{item.label}</b><small>{item.description}</small></span></label>)}</div>}

function EditPlan({plan,setPlan,close,save}:{plan:ExpensePlan;setPlan:(plan:ExpensePlan)=>void;close:()=>void;save:()=>void}){return <div className="modal-backdrop"><section className="modal wide"><header><div><h2>지출 계획 수정</h2><p>입력 내용과 첨부 정보를 모두 수정할 수 있습니다.</p></div><button onClick={close}>×</button></header><div className="field-grid"><label className="full">지출 항목<input value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})}/></label><label className="full">사용 목적<textarea value={plan.purpose} onChange={e=>setPlan({...plan,purpose:e.target.value})}/></label><label>예상 금액<input value={plan.amount} onChange={e=>setPlan({...plan,amount:Number(e.target.value)})}/></label><label>예상 지출일<input type="date" value={plan.plannedDate} onChange={e=>setPlan({...plan,plannedDate:e.target.value})}/></label><label>거래처<input value={plan.vendor} onChange={e=>setPlan({...plan,vendor:e.target.value})}/></label><label>비목<select value={plan.category} onChange={e=>setPlan({...plan,category:e.target.value})}>{EXPENSE_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select></label><label className="full file-drop">첨부 파일<button type="button">+ 파일 교체·추가</button><span>기존 파일과 새 파일을 함께 관리할 수 있습니다.</span></label></div><footer><button className="outline" onClick={close}>취소</button><button className="primary" onClick={save}>수정 저장</button></footer></section></div>}

function AiChat({ plans }: { plans: ExpensePlan[] }) { const [messages,setMessages]=useState([{role:"ai",text:"현재 사업 기준과 작성한 지출 계획을 함께 확인해 답변해드릴게요. 무엇이 궁금하신가요?"}]); const [input,setInput]=useState(""); const ask=(text=input)=>{if(!text.trim())return;setMessages(value=>[...value,{role:"user",text},{role:"ai",text:`2026 초기창업패키지 공통 기준과 작성된 ${plans.length}건의 지출 계획을 함께 확인했습니다. 결제 전에는 사업 직접 관련성, 기관별 사전절차, 견적 기준, 필요 증빙을 순서대로 확인하는 것이 좋습니다. 특정 지출명을 말씀해주시면 해당 계획을 우선해서 설명해드릴게요.`}]);setInput("")}; return <div className="page chat-page"><header className="page-heading"><div><h1>AI CHAT</h1><p>사업비·비목·규정·증빙을 현재 사업과 작성한 계획을 바탕으로 질문하세요.</p></div></header><section className="chat-workspace"><div className="chat-context"><span>현재 참조 범위</span><b>2026 초기창업패키지</b><p>작성한 지출 계획 {plans.length}건 · 최신 규정 안내</p></div><div className="conversation">{messages.map((message,index)=><div key={index} className={`message ${message.role}`}>{message.role==="ai"&&<span>AI</span>}<p>{message.text}</p></div>)}</div><div className="quick-prompts">{["노트북 구매 전에 뭘 준비해야 해?","회의비 단가를 확인해줘","외주 계약 증빙이 궁금해"].map(text=><button key={text} onClick={()=>ask(text)}>{text}</button>)}</div><div className="chat-composer"><textarea rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="궁금한 내용을 입력하세요."/><SendButton onClick={()=>ask()} disabled={!input.trim()}/></div></section></div> }

function SchedulePage({plans,schedules,save,notify}:{plans:ExpensePlan[];schedules:ScheduleItem[];save:(items:ScheduleItem[])=>void;notify:(message:string)=>void}) {
  const [modal,setModal]=useState(false);
  const [recommend,setRecommend]=useState(false);
  const [view,setView]=useState<"calendar"|"list">("calendar");
  const [openMenu,setOpenMenu]=useState<string|null>(null);
  const [editing,setEditing]=useState<ScheduleItem|null>(null);
  const upcoming=[...schedules].sort((a,b)=>a.date.localeCompare(b.date));
  const stats={all:upcoming.length,need:upcoming.filter(s=>s.state==="준비 필요").length,planned:upcoming.filter(s=>s.state==="예정").length,done:upcoming.filter(s=>s.state==="완료").length};
  const toggleDone=(id:string)=>save(schedules.map(item=>item.id===id?{...item,state:(item.state==="완료"?"예정":"완료") as ScheduleItem["state"]}:item));
  return <div className="page schedule-v2">
    <nav className="schedule-v2-breadcrumb">지출 계획 <span>›</span> 집행 일정</nav>
    <header className="schedule-v2-heading">
      <div><h1>집행 일정</h1><p>사전 준비 일정과 예상 집행일을 한눈에 확인하세요.</p></div>
      <div><button className="outline" onClick={()=>setRecommend(true)}><Icon name="spark"/>추천 일정 불러오기</button><button className="primary" onClick={()=>setModal(true)}><Icon name="plus"/>일정 추가</button></div>
    </header>
    <section className="schedule-v2-metrics">
      <article><span className="schedule-metric-icon all"><Icon name="calendar"/></span><span><small>이번 달 예정</small><b>{stats.all}<em>건</em></b></span></article>
      <article><span className="schedule-metric-icon need"><Icon name="clipboardCheck"/></span><span><small>준비 필요</small><b>{stats.need}<em>건</em></b></span></article>
      <article><span className="schedule-metric-icon planned"><Icon name="clock"/></span><span><small>예정</small><b>{stats.planned}<em>건</em></b></span></article>
      <article><span className="schedule-metric-icon done"><Icon name="check"/></span><span><small>완료</small><b>{stats.done}<em>건</em></b></span></article>
    </section>
    <div className="schedule-v2-layout">
      <section className="schedule-v2-calendar">
        <header><div><button aria-label="이전 달">‹</button><h2>2026년 9월</h2><button aria-label="다음 달">›</button></div><div><button className="outline small">오늘</button><span className="schedule-v2-view"><button className={view==="calendar"?"active":""} onClick={()=>setView("calendar")}><Icon name="calendar" size={14}/>캘린더</button><button className={view==="list"?"active":""} onClick={()=>setView("list")}><Icon name="plans" size={14}/>리스트</button></span></div></header>
        {view==="calendar" ? <>
          <div className="schedule-v2-week">{["일","월","화","수","목","금","토"].map(day=><span key={day}>{day}</span>)}</div>
          <div className="schedule-v2-grid">{Array.from({length:35},(_,i)=>{const day=i-1;const items=upcoming.filter(s=>Number(s.date.slice(-2))===day);return <div key={i} className={`${day===24?"today":""} ${day<1||day>30?"outside":""}`}><span>{day<1?day+31:day>30?day-30:day}</span>{items.slice(0,2).map(item=><button key={item.id} className={item.state==="준비 필요"?"need":item.state==="완료"?"done":"planned"} onClick={()=>notify(`${item.title} · ${item.date}`)}>{item.title}</button>)}</div>})}</div>
          <footer className="schedule-v2-legend"><span><i className="planned"/>예정</span><span><i className="need"/>준비 필요</span><span><i className="done"/>완료</span></footer>
        </> : <div className="schedule-v2-list-view">{upcoming.map(item=><button key={item.id} onClick={()=>notify(`${item.title} · ${item.date}`)}><time>{item.date}</time><span><b>{item.title}</b><small>{plans.find(p=>p.id===item.planId)?.name}</small></span><em className={item.state==="준비 필요"?"need":""}>{item.state}</em></button>)}</div>}
      </section>
      <aside className="schedule-v2-upcoming"><header><h2>다가오는 일정</h2></header>{upcoming.map((item,index)=><div className="upcoming-delete-row" key={item.id}><label><input type="checkbox" checked={item.state==="완료"} onChange={()=>toggleDone(item.id)}/><time><b>{Number(item.date.slice(5,7))}/{Number(item.date.slice(8))}</b><small>{index===0?"D-2":item.type}</small></time><span><b>{item.title}</b><small>{plans.find(p=>p.id===item.planId)?.name}</small></span><em className={item.state==="준비 필요"?"need":item.state==="완료"?"done":"planned"}>{item.state}</em></label><div className="row-menu"><button aria-label={`${item.title} 메뉴`} onClick={()=>setOpenMenu(value=>value===item.id?null:item.id)}><Icon name="more" size={16}/></button>{openMenu===item.id&&<div><button onClick={()=>{setEditing(item);setOpenMenu(null);}}><Icon name="edit" size={14}/>수정</button><button className="danger" onClick={()=>{if(window.confirm(`'${item.title}' 일정을 삭제할까요?`)){save(schedules.filter(schedule=>schedule.id!==item.id));notify("일정을 삭제했습니다.");}setOpenMenu(null);}}><Icon name="trash" size={14}/>삭제</button></div>}</div></div>)}</aside>
    </div>
    {modal&&<ScheduleModal plans={plans} close={()=>setModal(false)} save={item=>{save([...schedules,item]);setModal(false);notify("일정을 저장했습니다.");}}/>}
    {recommend&&<RecommendModal plans={plans} schedules={schedules} close={()=>setRecommend(false)} save={items=>{save([...schedules,...items]);setRecommend(false);notify(`${items.length}개 추천 일정을 추가했습니다.`);}}/>}
    {editing&&<EditScheduleModal item={editing} plans={plans} close={()=>setEditing(null)} save={item=>{save(schedules.map(schedule=>schedule.id===item.id?item:schedule));setEditing(null);notify("일정을 수정했습니다.");}}/>}
  </div>;
}

function EditScheduleModal({item,plans,close,save}:{item:ScheduleItem;plans:ExpensePlan[];close:()=>void;save:(item:ScheduleItem)=>void}) { const [draft,setDraft]=useState(item); return <div className="modal-backdrop"><section className="modal"><header><div><h2>일정 수정</h2><p>연결된 지출과 일정 정보를 수정하세요.</p></div><button onClick={close}>×</button></header><div className="field-grid one"><label>관련 지출<select value={draft.planId} onChange={e=>setDraft({...draft,planId:e.target.value})}>{plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label>일정명<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>예정일<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>상태<select value={draft.state} onChange={e=>setDraft({...draft,state:e.target.value as ScheduleItem["state"]})}><option>예정</option><option>준비 필요</option><option>완료</option></select></label></div><footer><button className="outline" onClick={close}>취소</button><button className="primary" onClick={()=>save(draft)}>수정 저장</button></footer></section></div> }

function ScheduleModal({plans,close,save}:{plans:ExpensePlan[];close:()=>void;save:(item:ScheduleItem)=>void}) {
  const [planId,setPlanId]=useState(plans[0]?.id||"");
  const [title,setTitle]=useState("");
  const [type,setType]=useState<ScheduleItem["type"]>("사전 확인");
  const [date,setDate]=useState("2026-09-09");
  const [state,setState]=useState<ScheduleItem["state"]>("예정");
  const [reminder,setReminder]=useState("3일 전 알림");
  const [memo,setMemo]=useState("");
  const [checks,setChecks]=useState(["지출 가능 여부 최종 확인","필요 서류 준비","담당자 승인 요청"]);
  const updateCheck=(index:number,value:string)=>setChecks(items=>items.map((item,i)=>i===index?value:item));
  const formatted=`${Number(date.slice(5,7))}/${Number(date.slice(8))}`;
  return <div className="modal-backdrop schedule-modal-backdrop"><section className="schedule-create-modal">
    <header><div><h2>일정 추가</h2><p>집행 일정에 새로운 일정을 등록하고 체크 항목까지 함께 관리할 수 있습니다.</p></div><button onClick={close}>×</button></header>
    <div className="schedule-create-body">
      <section><h3>기본 정보</h3><div className="schedule-create-grid"><label>일정 제목<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="예: 외주계약서 검토"/></label><label>일정 유형<select value={type} onChange={e=>setType(e.target.value as ScheduleItem["type"])}><option>사전 확인</option><option>사전승인</option><option>비교견적</option><option>계약</option><option>집행</option><option>증빙</option><option>기타</option></select></label><label className="full">관련 지출 계획<select value={planId} onChange={e=>setPlanId(e.target.value)}>{plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label></div></section>
      <section><h3>일정 정보</h3><div className="schedule-info-grid"><div><label>예정일<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>상태<select value={state} onChange={e=>setState(e.target.value as ScheduleItem["state"])}><option>예정</option><option>준비 필요</option><option>완료</option></select></label><label className="full">알림<select value={reminder} onChange={e=>setReminder(e.target.value)}><option>알림 없음</option><option>1일 전 알림</option><option>3일 전 알림</option><option>7일 전 알림</option></select></label></div><aside><span>예정일 미리보기</span><b>{formatted}</b><small>{new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR",{weekday:"long"})}</small></aside></div></section>
      <section><h3>체크 항목</h3><div className="schedule-check-editor">{checks.map((check,index)=><label key={index}><input type="checkbox"/><input value={check} onChange={event=>updateCheck(index,event.target.value)}/><button aria-label="체크 항목 삭제" onClick={()=>setChecks(items=>items.filter((_,i)=>i!==index))}>×</button></label>)}<button className="add-check" onClick={()=>setChecks(items=>[...items,"새 체크 항목"])}><Icon name="plus" size={14}/>체크 항목 추가</button></div></section>
      <section><label className="schedule-memo">메모<textarea maxLength={500} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="추가로 기록할 내용을 입력하세요."/><small>{memo.length}/500</small></label></section>
    </div>
    <footer><button className="outline" onClick={close}>취소</button><button className="primary" disabled={!title.trim()||!planId} onClick={()=>save({id:`s-${Date.now()}`,planId,title:title.trim(),date,type,state})}>일정 추가</button></footer>
  </section></div>
}

function RecommendModal({plans,schedules,close,save}:{plans:ExpensePlan[];schedules:ScheduleItem[];close:()=>void;save:(items:ScheduleItem[])=>void}) { const candidates=plans.filter(p=>p.status!=="특이사항 없음").slice(0,4).map((p,i)=>({id:`r-${p.id}`,planId:p.id,title:p.nextAction,date:`2026-09-${String(10+i*3).padStart(2,"0")}`,type:"기타" as const,state:"준비 필요" as const})); const [selected,setSelected]=useState(candidates.map(c=>c.id)); return <div className="modal-backdrop"><section className="modal wide"><header><div><h2>추천 일정 불러오기</h2><p>AI 점검 결과에서 필요한 사전 준비 일정을 추천했습니다.</p></div><button onClick={close}>×</button></header><div className="recommend-list">{candidates.map(item=><label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>setSelected(v=>v.includes(item.id)?v.filter(id=>id!==item.id):[...v,item.id])}/><span><b>{item.title}</b><small>{plans.find(p=>p.id===item.planId)?.name} · {item.date}</small></span><em>추천</em></label>)}</div><footer><button className="outline" onClick={close}>취소</button><button className="primary" onClick={()=>save(candidates.filter(c=>selected.includes(c.id)&&!schedules.some(s=>s.planId===c.planId&&s.title===c.title)))}>선택 일정 불러오기</button></footer></section></div> }

function RulesPage({notify}:{notify:(message:string)=>void}) { return <div className="page"><header className="page-heading"><div><h1>규정·지침</h1><p>현재 사업에 적용되는 공통 기준과 참여기관의 세부 안내를 확인하세요.</p></div></header><section className="rules-overview"><div><span className="rule-mark"><Icon name="rules"/></span><div><b>현재 적용 사업</b><h2>2026 초기창업패키지</h2><p>한빛대학교 창업지원센터 · 사업기간 2026.03.01 – 2026.12.31</p></div></div><span className="soft-label">최신 기준 확인</span></section><section className="card rule-library"><header className="card-head"><div><h2>공통 관리 기준</h2><p>CHECKUMAIT이 지출 사전점검에 우선 적용하는 기준입니다.</p></div></header><article><span className="auto-badge">자동 반영</span><div><b>2026년 초기창업패키지 창업기업 모집공고·사업화 자금 범위</b><small>중소벤처기업부·창업진흥원 · 현재 사업 기준</small></div><button className="outline small" onClick={()=>notify("공통 기준 원문을 열었습니다.")}>원문 보기</button></article><article><span className="auto-badge">자동 반영</span><div><b>중소기업 창업지원사업 통합관리지침</b><small>사업비 집행의 공통 원칙과 제한 기준</small></div><button className="outline small" onClick={()=>notify("통합관리지침 원문을 열었습니다.")}>원문 보기</button></article></section><section className="card rule-library"><header className="card-head"><div><h2>참여기관 세부 안내</h2><p>금액 기준·승인 절차·제출 양식은 기관의 최신 안내를 함께 적용합니다.</p></div><button className="outline small" onClick={()=>notify("파일 교체 창을 열었습니다.")}>파일 교체</button></header><article><span className="institution-badge">기관 등록</span><div><b>2026 한빛대학교 초기창업패키지 사업비 집행 안내.pdf</b><small>2026.03.02 등록 · 87개 점검 조항 연결</small></div><button className="outline small" onClick={()=>notify("기관 지침 파일을 열었습니다.")}>파일 보기</button></article></section><section className="card strict-table"><header className="card-head"><div><h2>기관 기준을 추가로 확인할 항목</h2><p>공통 기준만으로 결론내리지 않고 기관 안내를 함께 확인합니다.</p></div></header><div className="strict-head"><span>항목</span><span>공통 기준</span><span>기관 확인</span></div><div><b>회의비 1인 단가</b><span>사업 목적·참석자 적정성</span><strong>기관별 금액 기준 확인</strong></div><div><b>범용성 기자재</b><span>직접 필요성·전용 사용</span><strong>사전절차·자산관리 확인</strong></div><div><b>외주용역 계약</b><span>과업·금액·거래처 적정성</span><strong>금액별 견적·심의 기준 확인</strong></div></section><div className="rule-caution"><Icon name="alert"/><p><b>안내</b> AI 점검 결과는 입력한 정보와 연결된 규정에 기반한 사전 참고자료입니다. 최종 집행 가능 여부와 기관의 승인 절차는 담당기관의 최신 안내를 확인해야 합니다.</p></div></div> }

function FloatingChat({plans,route,close}:{plans:ExpensePlan[];route:AppRoute;close:()=>void}) { const current=route.page==="plan-detail"?plans.find(p=>p.id===route.id):undefined; const [messages,setMessages]=useState<string[]>([]); const [input,setInput]=useState(""); const send=()=>{if(!input.trim())return;setMessages(v=>[...v,input]);setInput("")}; return <aside className="floating-chat"><header><div><span><Icon name="spark"/></span><div><b>CHECKUMAIT AI</b><small>{current?`${current.name} 우선 참조`:"현재 사업·작성 문서 참조"}</small></div></div><button onClick={close}>×</button></header>{current&&<div className="current-context"><span>현재 지출</span><b>{current.name}</b><small>{current.category} · {won(current.amount)} · {current.status}</small></div>}<div className="floating-messages"><p>현재 사업 기준과 지금까지 작성한 지출 계획을 함께 확인해 답변합니다.</p>{messages.map((m,i)=><div key={i}>{m}<small>AI: 관련 지출과 규정 근거를 확인했습니다. 결제 전 필요한 행동을 먼저 안내드릴게요.</small></div>)}</div><div className="floating-quick"><button onClick={()=>setInput("이 지출에서 가장 먼저 할 일은?")}>가장 먼저 할 일</button><button onClick={()=>setInput("필요 증빙을 알려줘")}>필요 증빙</button></div><footer><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="AI에게 물어보세요"/><SendButton onClick={send} disabled={!input.trim()}/></footer></aside> }

function ProfileModal({close,notify}:{close:()=>void;notify:(message:string)=>void}) { return <div className="modal-backdrop"><section className="modal"><header><div><h2>내 정보</h2><p>계정과 참여 사업 정보를 확인하세요.</p></div><button onClick={close}>×</button></header><dl className="profile-list"><Info label="이름" value="홍길동"/><Info label="이메일" value="team@startup.kr"/><Info label="연락처" value="010-0000-0000"/><Info label="소속" value="팀 루멘 · 한빛대학교"/><Info label="선정사업" value="2026 초기창업패키지"/></dl><footer><button className="outline" onClick={close}>닫기</button><button className="primary" onClick={()=>notify("내 정보 수정 기능을 열었습니다.")}>정보 수정</button></footer></section></div> }
