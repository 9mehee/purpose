# 로희24 에이전트 웹앱

곽로희 페르소나 기반 SNS 트렌드 분석 & 콘텐츠 기획 웹앱.

## 기술 스택

| 레이어 | 선택 |
|--------|------|
| LLM | Google Gemini 2.0 Flash |
| 웹 검색 | Brave Search API |
| 서버리스 | Supabase Edge Functions |
| 파일 저장 | Supabase Storage (`rohee-plans`) |
| 프론트엔드 | Next.js 15 (App Router) |
| 배포 | Vercel |

---

## 로컬 실행

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## 환경변수

`.env.local` 파일에 아래 값 설정:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rujojddybwiaxhgfjozw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## Supabase Edge Function Secrets

Supabase 대시보드 또는 CLI로 설정:

```bash
supabase secrets set GOOGLE_AI_API_KEY=<your-key>
supabase secrets set SB_SERVICE_ROLE_KEY=<your-key>
supabase secrets set BRAVE_API_KEY=<your-key>   # 아래 참고
```

---

## Brave Search API 키 등록 방법

현재 `BRAVE_API_KEY`가 없을 경우 `sns-analysis` 함수는 **mock 데이터**로 동작합니다.  
실제 실시간 검색을 활성화하려면 아래 순서대로 진행하세요.

### 1. Brave Search API 키 발급

1. [https://api.search.brave.com](https://api.search.brave.com) 접속
2. 무료 계정 생성 → **Free AI** 플랜 선택 (월 2,000 req 무료)
3. **API Keys** 메뉴에서 키 복사

### 2. Supabase Secret에 등록

```bash
# webapp/ 디렉토리에서 실행
export SUPABASE_ACCESS_TOKEN=<your-personal-access-token>
supabase secrets set BRAVE_API_KEY=<발급받은-키>
```

또는 Supabase 대시보드에서:  
**Project → Settings → Edge Functions → Secrets → Add secret**  
- Name: `BRAVE_API_KEY`  
- Value: 발급받은 키

### 3. sns-analysis 함수 재배포

```bash
supabase functions deploy sns-analysis --no-verify-jwt
```

재배포 없이 Secret만 추가해도 다음 함수 호출 시 자동 반영됩니다.

---

## Edge Functions 배포

```bash
export SUPABASE_ACCESS_TOKEN=<your-personal-access-token>

supabase link --project-ref rujojddybwiaxhgfjozw
supabase functions deploy rohee-chat --no-verify-jwt
supabase functions deploy sns-analysis --no-verify-jwt
supabase functions deploy content-plan --no-verify-jwt
```

---

## Vercel 배포

```bash
npx vercel --prod
```

Vercel 환경변수 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
