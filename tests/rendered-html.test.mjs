import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app/checkumait-app.tsx", import.meta.url), "utf8");
const data = await readFile(new URL("../lib/mock-data.ts", import.meta.url), "utf8");
const service = await readFile(new URL("../lib/plan-service.ts", import.meta.url), "utf8");
const sendButton = await readFile(new URL("../app/send-button.tsx", import.meta.url), "utf8");
const chatLayout = await readFile(new URL("../app/chat-layout.css", import.meta.url), "utf8");
const workspace = await readFile(new URL("../app/workspace.css", import.meta.url), "utf8");
const detailRefinement = await readFile(new URL("../app/detail-refinement.css", import.meta.url), "utf8");
const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const semanticColors = await readFile(new URL("../app/semantic-colors.css", import.meta.url), "utf8");
const onboarding = await readFile(new URL("../app/onboarding-landing.css", import.meta.url), "utf8");

test("uses one shared application shell without legacy embeds", () => {
  assert.match(app, /className={`app-shell/);
  assert.match(app, /className={`sidebar/);
  assert.doesNotMatch(app, /iframe|legacy-user|srcDoc/);
  assert.equal((app.match(/<aside className={`sidebar/g) ?? []).length, 1);
});

test("keeps the same five navigation items for every page", () => {
  for (const label of ["홈", "지출 계획", "AI CHAT", "집행 일정", "규정·지침"]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /route\.page === "rules" && <RulesPage/);
});

test("ships plan-specific 2026 Initial Startup Package scenarios", () => {
  for (const name of ["UI 디자인 외주 제작", "개발용 노트북 구매", "시장조사 인터뷰 회의비", "서비스 출시 온라인 광고", "제품 촬영용 카메라 구매", "브랜드 전략 멘토링"]) {
    assert.match(data, new RegExp(name));
  }
  assert.match(data, /2026 초기창업패키지/);
});

test("connects lists, details, working checklists, and schedules by plan id", () => {
  assert.match(app, /page: "plan-detail", id: plan\.id/);
  assert.match(app, /input type="checkbox" checked={Boolean\(item\.done\)}/);
  assert.match(app, /planId:plan\.id/);
  assert.match(app, /저장하고 AI 점검/);
});

test("uses a single-column expense detail with separated before and after payment tasks", () => {
  const detail = app.slice(app.indexOf("detail-compact-header"), app.indexOf("function Info"));
  assert.match(workspace, /\.expense-detail-page\{padding-top:154px\}/);
  assert.match(workspace, /\.expense-detail-page \.detail-compact-header,\.expense-detail-page \.expense-info-section\{box-sizing:border-box;padding-inline:18px\}/);
  assert.match(workspace, /\.detail-flow>\.rules-section\{grid-column:1\/-1;grid-row:3\}/);
  assert.match(workspace, /\.detail-flow>\.before-task-section\{grid-column:1;grid-row:4\}/);
  assert.match(workspace, /\.detail-flow>\.evidence-task-section\{grid-column:2;grid-row:4\}/);
  assert.match(workspace, /\.expense-detail-page \.compact-expense-info\{width:100%;max-width:none\}/);
  assert.match(workspace, /\.expense-detail-page \.section-title-with-icon\{gap:12px!important\}/);
  assert.match(workspace, /\.expense-detail-page\{max-width:1040px\}/);
  assert.match(workspace, /\.expense-detail-page \.compact-expense-info\{width:78%\}/);
  assert.match(workspace, /before-task-section::before\{content:"이 지출은 아래 순서로 관리됩니다/);
  assert.match(workspace, /content:"STEP 1 · 결제 전"/);
  assert.match(workspace, /content:"STEP 2 · 결제 후"/);
  assert.match(workspace, /\.detail-compact-header\{margin-bottom:38px\}/);
  assert.match(workspace, /\.detail-summary h1\{font-size:30px;font-weight:780/);
  assert.match(app, /<button className="detail-back-link"[^>]*>.*지출 계획<\/button>/);
  assert.ok(detail.indexOf("지출 정보") < detail.indexOf("AI 점검 결과"));
  assert.ok(detail.indexOf("AI 점검 결과") < detail.indexOf("결제 전 확인"));
  assert.ok(detail.indexOf("결제 전 확인") < detail.indexOf("적용 근거"));
  assert.ok(detail.indexOf("적용 근거") < detail.indexOf("결제 후 필요 증빙"));
  assert.match(app, /결제 전 확인/);
  assert.match(app, /className="evidence-list evidence-checklist"/);
  assert.match(app, /결제 후 필요 증빙/);
  assert.match(app, />일정에 추가<\/button>/);
  assert.match(app, /className="checklist action-checklist"/);
  assert.doesNotMatch(detail, /check-action-icon/);
  assert.match(app, /className="compact-expense-info"/);
  assert.match(app, /<details className="detail-disclosure rules-section">/);
  assert.match(app, /className="card checklist-card detail-section task-section evidence-task-section"/);
  assert.match(detail, /recent-only"><span>최근 수정/);
  assert.doesNotMatch(detail.slice(0, detail.indexOf("지출 정보")), /<Status value=/);
  assert.match(detail, /Icon name="fileText"/);
  assert.match(detail, /Icon name="clipboardCheck"/);
  assert.match(workspace, /\.result-vertical\{display:block!important\}/);
  assert.match(workspace, /\.action-checklist label\{min-height:64px/);
  assert.match(app, /확인사항을 집행 일정에 등록했습니다/);
  assert.doesNotMatch(app, /<h2>집행 일정 연결<\/h2>/);
});

test("renders the redesigned expense detail as a connected work flow", () => {
  assert.match(app, /className="page expense-detail-page expense-detail-redesign expense-v5"/);
  assert.match(app, /className="expense-v5-section expense-v5-plan"/);
  assert.match(app, /className="expense-v5-section expense-v5-ai"/);
  assert.match(app, /className="expense-v5-card expense-v5-rules"/);
  assert.match(app, /className="expense-v5-section expense-v5-prep"/);
  assert.doesNotMatch(app, /className="expense-v5-card expense-v5-manager"/);
  assert.match(app, /결제 전 확인/);
  assert.match(app, /결제 후 필요 증빙/);
  assert.match(app, /id="payment-before"/);
  assert.match(app, /scrollIntoView\(\{behavior:"smooth",block:"center"\}\)/);
  assert.match(workspace, /\.expense-v5\{width:100%;max-width:1180px/);
  assert.match(workspace, /\.expense-v5-prep-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(detailRefinement, /\.expense-v5-prep-grid>section\{overflow:hidden;border:1px solid #e5e5e5/);
  assert.match(workspace, /\.floating-ai\{height:40px/);
});

test("shows plan attachments, interactive checks, and item-level evidence uploads", () => {
  assert.match(app, /지출 계획 정보/);
  assert.match(app, /첨부 파일/);
  assert.match(app, /파일 추가/);
  assert.doesNotMatch(app, /<h2>증빙 관리<\/h2>/);
  assert.match(app, /expense-v5-upload/);
  assert.match(app, /필요 증빙 PDF 다운로드/);
  assert.match(app, /toggle\("aiChecks",item.id\)/);
  assert.match(app, /toggle\("evidence",item.id\)/);
  assert.match(workspace, /\.expense-v5-plan-grid\{display:grid;grid-template-columns:145px/);
  assert.match(detailRefinement, /\.expense-v5-evidence-item\{min-height:72px/);
});

test("uses a neutral global palette with semantic-only accents", () => {
  assert.match(globals, /--brand:#176b5b/);
  assert.match(globals, /--soft:#fcfcfc/);
  assert.match(globals, /--ink:#171717/);
  assert.match(globals, /--line:#e5e5e5/);
  assert.match(semanticColors, /background:#fcfcfc/);
  assert.match(semanticColors, /\.status-warn,.status-action\{border-color:#f1d7a8;background:#fff5e6;color:#b96900\}/);
  assert.match(semanticColors, /\.status-risk\{border-color:#f3caca;background:#fff1f1;color:#c23b3b\}/);
});

test("isolates persistence behind an API-replaceable service", () => {
  assert.match(service, /API 연동 시 이 객체의 구현만 fetch 기반으로 교체/);
  assert.match(service, /listPlans/);
  assert.match(service, /saveSchedules/);
});

test("uses one accessible circular arrow send control in both chat surfaces", () => {
  assert.equal((app.match(/<SendButton/g) ?? []).length, 2);
  assert.doesNotMatch(app, />전송<\/button>/);
  assert.match(sendButton, /aria-label={label}/);
  assert.match(sendButton, /M12 19V5/);
});

test("aligns AI CHAT with the shared page width and uses one solid floating sparkle", () => {
  assert.match(chatLayout, /\.chat-page\{max-width:none\}/);
  assert.match(app, /sparkSolid: <path/);
  assert.match(app, /<Icon name="sparkSolid" size=\{18\}/);
  assert.equal((app.match(/<button className="floating-ai"/g) ?? []).length, 1);
});

test("runs a five-step onboarding through institution criteria setup", () => {
  for (const step of ["welcome", "project", "institution", "upload", "ready"]) assert.match(app, new RegExp(`\\"${step}\\"`));
  assert.match(app, /사업비, 쓰기 전에/);
  assert.match(app, /어떤 지원사업에/);
  for (const program of ["예비창업패키지", "초기창업패키지", "창업도약패키지", "창업중심대학", "재도전성공패키지", "모두의 창업 일반・기술", "초격차 스타트업 1000\+", "민관공동 창업자 발굴·육성"]) assert.match(app, new RegExp(program));
  assert.match(app, /주관기관을/);
  assert.match(app, /건국대학교/);
  assert.match(app, /주관기관의 세부기준을/);
  assert.match(app, /type="file" accept="\.pdf,\.hwp,\.hwpx,\.doc,\.docx"/);
  assert.match(app, /지금 없다면 파일 없이 계속할 수 있습니다/);
  assert.match(app, /기관 세부기준 미등록/);
  assert.doesNotMatch(app, /disabled=\{!criteriaFile\}/);
  assert.match(app, /첫 계획 작성하기/);
  assert.match(app, /홈으로 가기/);
  assert.match(app, /onEnter\("plan-new"\)/);
  assert.match(app, /onEnter\("home"\)/);
  assert.match(app, /<select value={program}/);
  assert.doesNotMatch(app, /support-programs|<datalist/);
});

test("shows a neutral B2B onboarding flow with one static AI check example", () => {
  assert.match(app, /className="onboarding-landing"/);
  assert.match(app, /UI 디자인 외주 제작/);
  assert.match(app, /비교견적 첨부 필요/);
  assert.match(app, /계약서·과업내용 준비/);
  assert.doesNotMatch(app, /checkumait-robot|demo-guide|login-aside/);
  assert.match(app, /onboarding-stepper/);
  assert.match(onboarding, /grid-template-columns:minmax\(0,1fr\) minmax\(420px,\.85fr\)/);
  assert.match(onboarding, /\.setup-content\{width:min\(680px,100%\)/);
  assert.doesNotMatch(app, /1,200\+|25,000\+|98%/);
});

test("starts the AI chat composer at one line and expands upward", () => {
  assert.match(app, /className="chat-composer"><textarea rows={1}/);
  assert.match(app, /e\.key==="Enter"&&!e\.shiftKey/);
});

test("uses one responsive sidebar that can collapse and reopen", () => {
  assert.match(app, /sidebarCollapsed/);
  assert.match(app, /sidebar-collapsed/);
  assert.match(app, /사이드바 펼치기/);
  assert.match(app, /사이드바 접기/);
});

test("offers the full expense category set and fee subtypes", () => {
  for (const category of ["재료비", "외주용역비", "기계장치비", "특허권 등 무형자산 취득비", "인건비", "지급수수료", "교육훈련비", "여비", "광고선전비", "회의비"]) assert.match(app, new RegExp(category));
  for (const subtype of ["기술이전", "학회·세미나", "전시회·박람회", "시험·인증", "멘토링", "기자재 임차", "사무실 임차", "운반", "보험", "보관", "회계감사", "세무기장", "법인설립", "기술보호", "수리", "규제애로 해소 법률컨설팅"]) assert.match(app, new RegExp(subtype));
});

test("maps category and fee subtype questions from the scenario guide", () => {
  for (const question of ["구매한 재료가 시제품의 일부가 되나요", "업체의 사업자등록 업종이 이번 과업과 관련되어 있나요", "최초 협약 시작 이후에 새로 출원하는 건인가요", "해당 직원은 4대사회보험에 가입되어 있나요", "광고비를 미리 충전한 뒤 사용액만 차감하는 방식인가요", "전문기관에서 지정한 회계법인이 진행하는 사업비 회계감사인가요"]) assert.match(app, new RegExp(question));
  assert.match(app, /FEE_QUESTIONS\[feeSubtype\]/);
  assert.match(app, /CATEGORY_QUESTIONS\[category\]/);
});

test("removes the user profile label from both chat surfaces", () => {
  assert.doesNotMatch(app, /message\.role===\"ai\"\?\"AI\":\"나\"/);
  assert.doesNotMatch(app, /<b>나<\/b>/);
});
