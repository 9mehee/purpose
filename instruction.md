# 곽로희 에이전트 웹앱 구축 가이드

## 목표

`agent/gwak-rohee.md` 페르소나와 `.claude/commands/` 스킬(sns-analysis, content-plan)을  
Supabase Edge Functions로 배포하고, 웹 브라우저에서 실행할 수 있는 웹앱을 만든다.

---

## 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| LLM | Google Gemini API (AI Studio) | 무료, 신용카드 불필요, 한국어 최상급, 1M 컨텍스트 |
| 모델 | `gemini-3.5-flash` (폴백: 2.5-flash → 2.0-flash) | 최신 모델 우선, 할당량 초과 시 자동 폴백 |
| 웹 검색 | Brave Search API | 무료 2,000 req/월 — **키 없으면 mock 데이터로 동작** |
| 서버리스 | Supabase Edge Functions (Deno) | 500,000 req/월 무료 |
| 파일 저장 | Supabase Storage (`rohee-plans` 버킷) | 1GB 무료 |
| 프론트엔드 | Next.js 15 (App Router) | SSE 스트리밍, Vercel 최적 |
| 배포 | Vercel | 무료, Next.js 네이티브 |

---

## 아키텍처

```
[Web App — Next.js @ Vercel]
          │ HTTPS (SSE 스트리밍)
          ▼
[Supabase Edge Functions]
  ├── POST /rohee-chat        ← 일반 페르소나 대화
  ├── POST /sns-analysis      ← 트렌드 검색 + 분석
  └── POST /content-plan      ← 기획안 생성 + 파일 저장
          │
          ├── Google Gemini API — LLM 추론 (스트리밍)
          ├── Brave Search API  — 실시간 웹 검색 (없으면 mock)
          └── Supabase Storage  — 기획안 .md 파일 저장
```

---

## 필요한 API 키 목록

| 키 이름 | 발급처 | 필수 여부 |
|---------|--------|-----------|
| `GOOGLE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com) → Get API Key | **필수** |
| `BRAVE_API_KEY` | [Brave Search API](https://api.search.brave.com) → Free AI 플랜 | 선택 (없으면 mock 동작) |
| `SB_SERVICE_ROLE_KEY` | Supabase → Settings > API > service_role | **필수** (기획안 저장용) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 예약 접두어라 사용 불가. **`SB_SERVICE_ROLE_KEY`** 로 등록.

---

## 프로젝트 구조

```
purpose/
├── agent/
│   └── gwak-rohee.md                ← 페르소나 정의
├── .claude/
│   └── commands/
│       ├── sns-analysis.md          ← SNS 분석 스킬 프롬프트
│       └── content-plan.md          ← 기획안 생성 스킬 프롬프트
├── CLAUDE.md
└── instruction.md

webapp/
├── supabase/
│   └── functions/
│       ├── rohee-chat/index.ts      ← 페르소나 대화
│       ├── sns-analysis/index.ts    ← 트렌드 분석 (mock 폴백 포함)
│       └── content-plan/index.ts    ← 기획안 생성 + Storage 저장
├── src/
│   └── app/
│       ├── page.tsx                 ← 메인 (스킬 선택)
│       ├── chat/page.tsx            ← 페르소나 대화
│       └── skills/
│           ├── sns/page.tsx         ← sns-analysis 폼 + 스트리밍 결과
│           └── plan/page.tsx        ← content-plan 결과 + 다운로드
├── src/components/
│   └── StreamOutput.tsx             ← 마크다운 스트리밍 렌더러
├── .env.local                       ← Supabase URL + anon key (git 제외)
├── .gitignore
├── package.json
└── README.md                        ← Brave API 키 등록 방법 포함
```

---

## Phase 1 — 인프라 세팅 ✅

### 1-1. Supabase 프로젝트

- Project ref: `rujojddybwiaxhgfjozw`
- URL: `https://rujojddybwiaxhgfjozw.supabase.co`
- Region: Northeast Asia

### 1-2. Supabase Storage 버킷

- 이름: `rohee-plans` (비공개, 서명 URL로만 다운로드)

### 1-3. Supabase CLI 설치

```bash
# Windows — binary 직접 다운로드
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz -o supabase.tar.gz
tar -xzf supabase.tar.gz
# supabase.exe를 PATH에 추가

# Node.js — winget으로 설치
winget install OpenJS.NodeJS.LTS --silent
```

### 1-4. Supabase 프로젝트 연결

```bash
export SUPABASE_ACCESS_TOKEN=<personal-access-token>  # supabase.com/dashboard/account/tokens
cd webapp
supabase link --project-ref rujojddybwiaxhgfjozw
```

### 1-5. Supabase Secrets 등록

```bash
supabase secrets set GOOGLE_AI_API_KEY=<your-key>
supabase secrets set SB_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set BRAVE_API_KEY=<your-key>   # 선택사항
```

---

## Phase 2 — Edge Functions ✅

### 공통 설정

```typescript
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
// 모델 폴백: 429(할당량 초과) 또는 404(모델 없음) 시 다음 모델 자동 시도
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
```

### 2-1. `rohee-chat` — 페르소나 대화

**요청:**
```json
{ "message": "요즘 뭐 찍고 싶어?", "history": [] }
```
**응답:** SSE 스트리밍 (OpenAI chat.completions 형식)

### 2-2. `sns-analysis` — SNS 트렌드 분석

**요청:**
```json
{
  "keyword": "먹방",
  "platforms": ["인스타", "유튜브"],
  "metrics": ["조회수", "댓글"],
  "country": "한국"
}
```
**응답:** SSE 스트리밍 (분석 리포트 마크다운)

> `BRAVE_API_KEY` 없으면 키워드 기반 mock 데이터로 동작 (먹방/운동/뷰티/기본 4종)

### 2-3. `content-plan` — 콘텐츠 기획안 생성

**요청:**
```json
{
  "sns_result": "...(분석 리포트 전문)...",
  "keyword": "먹방",
  "extra_args": ""
}
```
**응답:** SSE 스트리밍 (기획안 마크다운) + 완료 시 `{ "done": true, "file_name": "...", "file_url": "..." }`

Storage 저장 경로: `rohee-plans/[YYYYMMDD]_[키워드]_기획안.md`  
서명 URL 유효기간: 1시간

### 배포

```bash
export SUPABASE_ACCESS_TOKEN=<token>
supabase functions deploy rohee-chat --no-verify-jwt
supabase functions deploy sns-analysis --no-verify-jwt
supabase functions deploy content-plan --no-verify-jwt
```

---

## Phase 3 — 웹앱 ✅

### 설치 및 실행

```bash
cd webapp
npm install
npm run dev   # → http://localhost:3000
```

### 환경변수 (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://rujojddybwiaxhgfjozw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 주요 페이지

| 경로 | 기능 |
|------|------|
| `/` | 메인 (스킬 선택) |
| `/chat` | 곽로희 페르소나 채팅 |
| `/skills/sns` | SNS 트렌드 분석 (폼 + 스트리밍) |
| `/skills/plan` | 콘텐츠 기획안 생성 + 파일 다운로드 |

### SSE 스트리밍 클라이언트 패턴

```typescript
const res = await fetch(`${SUPABASE_URL}/functions/v1/rohee-chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
  },
  body: JSON.stringify({ message, history }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // SSE 파싱: "data: {...}" 줄에서 choices[0].delta.content 추출
}
```

---

## Phase 4 — 배포

### Vercel 배포

```bash
cd webapp
npx vercel --prod
```

Vercel 환경변수 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Brave Search API 키 등록 (나중에)

`webapp/README.md` 참고. 요약:

```bash
# 1. https://api.search.brave.com → Free AI 플랜 가입 → 키 복사
# 2. Supabase Secret 등록
export SUPABASE_ACCESS_TOKEN=<token>
cd webapp
supabase secrets set BRAVE_API_KEY=<발급받은-키>
# 3. 재배포 (Secret 추가만으로 자동 반영되지만 명시적으로)
supabase functions deploy sns-analysis --no-verify-jwt
```

---

## 무료 한도 요약

| 서비스 | 무료 한도 | 초과 시 |
|--------|-----------|---------|
| Gemini 3.5 Flash | 할당량은 Google AI Studio 대시보드에서 확인 | 폴백 모델 자동 시도 |
| Brave Search | 2,000 req/월 | mock 데이터로 폴백 |
| Supabase Edge Functions | 500,000 req/월 | 유료 전환 |
| Supabase Storage | 1GB | 유료 전환 |
| Vercel | 100GB 대역폭/월 | 유료 전환 |
