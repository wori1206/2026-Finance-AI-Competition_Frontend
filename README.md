# 써도돼요 · 프론트엔드

> 창업지원금, 쓰기 전에 AI 가 규정에 비춰 먼저 확인해 드려요.

창업지원사업 참여 기업이 **지출 계획**을 적으면, AI 가 사업 규정 · 협약에 비춰 **가능 · 확인 필요 · 불가**로 점검하고
결제 전에 챙길 증빙과 일정을 알려 주는 서비스의 화면입니다.
판정 엔진과 API 는 별도 백엔드 저장소(FastAPI)에 있고, 이 저장소는 화면만 다룹니다.

## 주요 화면

| 화면 | 하는 일 |
|---|---|
| 홈 | 미완료 일정, 이번 주 일정, 사업비 현황(원그래프), 확인할 지출 계획 |
| 지출 계획 | 전체 지출 계획 목록, 점검 결과 그래프, 상태별 탭 · 검색 · 필터 |
| 새 지출 계획 | 한 문장으로 적으면 비목 · 금액 · 사용 목적을 정리하고 AI 점검 |
| 지출 상세 | 판정과 근거 조문, 결제 전 확인 목록, 담당자 문의 초안 |
| 집행 일정 | 달력 · 다가오는 일정, 기한 지난 일정, 사전 준비 · 집행 · 완료 |
| 마이페이지 · 온보딩 | 참여 사업 · 주관기관 · 협약 정보 |

## 기술 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5.9**
- **Tailwind CSS 4** (기반) + 화면별 CSS · 디자인 토큰(`app/globals.css`)
- **Supabase Auth** (로그인만), 데이터는 백엔드 API
- 배포: **Vercel** (`main` 머지 = 운영 배포)

## 시작하기

Node.js 22.13 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 「환경 변수」)
npm run dev                  # http://localhost:3000
```

- 화면만 볼 때는 **모의 백엔드**를 씁니다. 백엔드 저장소에서 `SUDDOE_MOCK=1` 로 켜면 `http://127.0.0.1:8080` 에 뜹니다.
  모의 백엔드의 CORS 는 `localhost:3000` 만 허용합니다.
- `node_modules` 가 심볼릭 링크 · 정션이면 Turbopack 이 거부합니다. 그때는 `npx next dev --webpack`.

### 환경 변수

| 이름 | 설명 | 비우면 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | 백엔드 주소 | 내 컴퓨터에서는 `http://localhost:8080`(모의 백엔드), 그 밖에서는 예시 데이터로 동작 |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 로그인 | Supabase 로그인을 쓰지 않음 |

실제 값은 `.env.local` 에만 두고 커밋하지 않습니다(`.gitignore` 에서 `.env*` 제외, `.env.example` 만 올림).

## 폴더 구조

```text
.
├── app/
│   ├── page.tsx · layout.tsx    # 진입점
│   ├── checkumait-app.tsx       # 화면 대부분(홈 · 지출 계획 · 새 지출 계획 · 지출 상세 · 집행 일정 · 온보딩)
│   ├── send-button.tsx          # 보내기 버튼
│   ├── globals.css · tokens.css # 기본 스타일 · 디자인 토큰
│   └── *-v###.css               # 화면별 스타일(이름의 v### 는 만든 이슈 번호)
├── lib/
│   ├── api.ts · http.ts · config.ts   # 백엔드 호출 · 주소
│   ├── adapt.ts                       # 서버 응답 → 화면 모델, 판정 문구
│   ├── types.ts · server-types.ts     # 화면 타입 · 서버 응답 타입(서버 필드 이름 그대로)
│   ├── judge.ts · normalize.ts · questions.ts · sse.ts   # AI 점검 흐름
│   ├── tasks.ts · attachments.ts · inquiry-store.ts      # 할일 · 첨부 · 문의 초안
│   ├── profile.ts · program.ts · orgs.ts · norms.ts      # 협약 · 사업 · 주관기관 · 규정
│   ├── supabase.ts · session.ts       # 로그인 · 토큰
│   └── mock-data.ts · plan-service.ts · data-source.ts   # 예시 데이터 · 출처
├── public/                      # 로고 · 아이콘
└── docs/
    ├── design-system.md         # 디자인 규칙(색 · 글자 · 간격 · 모서리 · 부품 크기 단계)
    └── planning/                # 기능명세서 · 프론트 정리 · 인수인계 문서
```

`app/checkumait-app.tsx` 는 약 1.1만 줄입니다. 고칠 때는 `grep -n` 으로 위치를 찾고 그 부분만 읽으세요.

## 작업 규칙

- **디자인:** 화면을 만들거나 고치기 전에 [`docs/design-system.md`](docs/design-system.md) 를 읽고 따릅니다. hex 대신 토큰, 크기는 단계(XS · S · M · L) 단위.
- **판정 값(가능 · 확인 필요 · 불가)은 화면에서 바꾸지 않습니다.** 서버 필드 이름도 그대로 씁니다.
- **브랜치:** `main` 에서 `fix/v###-짧은-설명` 또는 `feat/v###-…` (`v###` 는 노션 이슈 번호)
- **커밋:** `fix(v###): 무엇을 왜` — 한국어
- **PR:** 템플릿(화면에서 바뀌는 것 · 검증)을 채우고, 리뷰 후 머지합니다. `main` 에 직접 푸시하지 않습니다.
- **올리기 전 확인**

  ```bash
  npx tsc --noEmit   # 통과
  npx eslint app lib # 기존 지적이 있어 main 보다 늘지 않으면 됨
  ```

  화면 변경은 브라우저에서 직접 확인하고 콘솔 오류가 없는지 봅니다.

더 자세한 작업 안내(지켜 온 결정 · 용어 원칙)는 [`CLAUDE.md`](CLAUDE.md) 에 있습니다.

## 배포

`main` 에 머지하면 Vercel 이 운영에 배포합니다. PR 마다 Vercel 미리보기가 만들어지니, 머지 전에 통과했는지 봅니다.
