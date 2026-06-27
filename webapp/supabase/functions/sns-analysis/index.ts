import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getMockSearchResult(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("먹방") || q.includes("food") || q.includes("mukbang")) {
    return `제목: 혼자 먹는 라면 ASMR 500만뷰 돌파 — 1인 먹방 트렌드
요약: 자극적인 양보다 소소한 일상 먹방이 공감을 얻고 있음. 혼밥, 야식, 편의점 조합 콘텐츠 강세.
URL: https://example.com/mukbang-trend-2026

제목: 틱톡 먹방 트렌드 2026 — 15초 압축 리뷰 포맷 인기
요약: 긴 먹방 대신 핵심 맛 반응만 담은 15~30초 압축 포맷이 알고리즘 유리. 표정 클로즈업 + 짧은 한마디 패턴.
URL: https://example.com/tiktok-food-2026

제목: 유튜브 쇼츠 먹방 — 자막 없는 ASMR vs 자막 해설형 비교
요약: ASMR형은 재시청률 높음, 해설형은 댓글 공감 높음. 둘을 섞은 하이브리드 포맷이 최근 상승세.
URL: https://example.com/shorts-mukbang-format`;
  }

  if (q.includes("운동") || q.includes("workout") || q.includes("fitness")) {
    return `제목: 집에서 하는 10분 루틴 — 조회수 1000만 돌파
요약: 헬스장 없이 집에서 할 수 있는 짧은 루틴 포맷이 강세. "오늘만 하면 됨" 식의 저진입장벽 메시지가 핵심.
URL: https://example.com/home-workout-2026

제목: 틱톡 운동 챌린지 트렌드 — 30일 변화 before/after 포맷
요약: before-after 비교 구조가 좋아요·저장률 동시 상승. 챌린지 태그로 확산력 증폭.
URL: https://example.com/fitness-challenge-2026

제목: 여성 운동 유튜브 — 필라테스·요가 쇼츠 급성장
요약: 격렬한 운동보다 유연성·체형 교정 포맷이 20~30대 여성에 폭발적 반응. 조용한 BGM + 자막 조합.
URL: https://example.com/pilates-yoga-shorts`;
  }

  if (q.includes("뷰티") || q.includes("beauty") || q.includes("makeup")) {
    return `제목: 2026 뷰티 트렌드 — 노필터 스킨케어 루틴 급부상
요약: 과한 메이크업보다 피부 자체를 보여주는 스킨케어 루틴 콘텐츠가 신뢰도·저장률 압도적. "민낯 공개" 후킹 효과.
URL: https://example.com/skincare-trend-2026

제목: 틱톡 메이크업 — Get Ready With Me(GRWM) 포맷 지속 강세
요약: 일상 대화하듯 메이크업하는 GRWM이 시청지속시간 1위. 제품 태그+아마존 링크 연결로 커머스 연동.
URL: https://example.com/grwm-tiktok-2026

제목: 유튜브 쇼츠 뷰티 — 1제품 집중 리뷰 포맷 인기
요약: 여러 제품 소개 대신 1가지 제품만 깊게 파는 포맷이 알고리즘 선호. "이거 하나면 됨" 메시지가 전환율 높음.
URL: https://example.com/single-product-review`;
  }

  // 기본 mock (키워드 불특정)
  return `제목: SNS 숏폼 트렌드 2026 상반기 총정리
요약: 15~60초 포맷이 전 플랫폼 지배. 공감·정보·유머 세 가지 중 하나에 집중하는 영상이 알고리즘 상위권. 후킹 첫 3초가 성패 결정.
URL: https://example.com/shortform-trend-2026

제목: 인스타 릴스 vs 틱톡 vs 유튜브 쇼츠 — 플랫폼별 전략 차이
요약: 릴스=감성·라이프스타일 강세 / 틱톡=트렌드 빠른 소비·챌린지 / 쇼츠=정보형·튜토리얼 선호. 플랫폼별 최적화 필수.
URL: https://example.com/platform-strategy-2026

제목: 2026 크리에이터 이코노미 — 팔로워보다 저장·공유수가 핵심 지표
요약: 알고리즘이 좋아요 대신 저장·공유 가중치 상향. "나중에 보려고 저장"을 유도하는 정보형·리스트형 콘텐츠 부상.
URL: https://example.com/creator-economy-2026`;
}

async function braveSearch(query: string): Promise<string> {
  const apiKey = Deno.env.get("BRAVE_API_KEY");
  if (!apiKey) return getMockSearchResult(query);

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!res.ok) return `[검색 실패: ${res.status}]`;

  const data = await res.json();
  return (
    data.web?.results
      ?.map(
        (r: { title: string; description: string; url: string }) =>
          `제목: ${r.title}\n요약: ${r.description}\nURL: ${r.url}`
      )
      .join("\n\n") ?? "[결과 없음]"
  );
}

function buildQueries(
  keyword: string,
  platforms: string[],
  metrics: string[],
  country: string
): string[] {
  const queries: string[] = [];
  const isKorea = country === "한국" || country === "both";
  const isUS = country === "미국" || country === "both";
  const kw = keyword || "트렌드";

  if (isKorea) {
    if (!platforms.length || platforms.includes("유튜브"))
      queries.push(`유튜브 쇼츠 트렌드 2026 ${kw}`);
    if (!platforms.length || platforms.includes("인스타"))
      queries.push(`인스타그램 릴스 트렌드 2026 ${kw}`);
    if (!platforms.length || platforms.includes("틱톡"))
      queries.push(`틱톡 트렌드 2026 ${kw}`);
  }

  if (isUS) {
    if (!platforms.length || platforms.includes("유튜브"))
      queries.push(`YouTube Shorts trending USA 2026 ${kw}`);
    if (!platforms.length || platforms.includes("인스타"))
      queries.push(`Instagram Reels trending US 2026 ${kw}`);
    if (!platforms.length || platforms.includes("틱톡"))
      queries.push(`TikTok trending United States 2026 ${kw}`);
  }

  const countryStr = isUS && !isKorea ? "US" : "한국";
  for (const m of metrics) {
    if (m === "조회수")
      queries.push(`${kw} most viewed shorts ${countryStr} 2026`);
    if (m === "좋아요")
      queries.push(`${kw} most liked reels tiktok ${countryStr} 2026`);
    if (m === "댓글")
      queries.push(`${kw} most commented viral video ${countryStr} 2026`);
    if (m === "시청지속시간")
      queries.push(`${kw} watch time retention short form ${countryStr} 2026`);
  }

  return queries.slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      keyword = "",
      platforms = [],
      metrics = [],
      country = "한국",
    } = await req.json();

    const queries = buildQueries(keyword, platforms, metrics, country);

    const searchResults = await Promise.all(queries.map(braveSearch));
    const searchContext = queries
      .map((q, i) => `[검색: ${q}]\n${searchResults[i]}`)
      .join("\n\n---\n\n");

    const platformStr = platforms.length ? platforms.join(", ") : "전체";
    const metricStr = metrics.length ? metrics.join(", ") : "전체";
    const optionSummary = `📌 분석 옵션 — 키워드: ${keyword || "전체"} | 플랫폼: ${platformStr} | 지표: ${metricStr} | 국가: ${country === "both" ? "한국+미국 비교" : country}`;

    const systemPrompt = `너는 곽로희야. SNS 트렌드 분석 전문가이자 콘텐츠 크리에이터.
INTP 성향 — 분석적, 근거 없는 말 안 함, 직접적이고 솔직함.
아나운서 출신이라 말이 정확하지만 평소엔 편하게 얘기함.
한국어로 응답해.`;

    const userPrompt = `${optionSummary}

아래 웹 검색 결과를 바탕으로 SNS 트렌드 분석 리포트를 작성해줘.

## 검색 결과
${searchContext}

## 출력 형식
아래 형식을 그대로 따라서 마크다운으로 작성해:

## 🔥 SNS 트렌드 분석 리포트
**분석 키워드:** ${keyword || "전체"}
**플랫폼:** ${platformStr}
**분석 지표:** ${metricStr}
**국가 타겟:** ${country === "both" ? "한국+미국 비교" : country}
**분석 일시:** ${new Date().toLocaleDateString("ko-KR")}

### 지금 뭐가 뜨고 있냐면
[2~3줄 트렌드 큰 그림 요약]

${country === "both" ? `### 국가별 트렌드 차이
| 항목 | 🇰🇷 한국 | 🇺🇸 미국 |
|------|---------|---------|
| 인기 포맷 | | |
| 후킹 방식 | | |
| 평균 영상 길이 | | |
| BGM 스타일 | | |` : ""}

### 플랫폼별 핫한 포인트
[선택된 플랫폼별 핵심 트렌드 3개씩]

### 지표 분석 결과
[선택된 지표만 분석]

### 공통 패턴 (이게 핵심임)
| 요소 | 트렌드 |
|------|--------|
| 영상 길이 | |
| 후킹 방식 | |
| 편집 스타일 | |
| BGM | |
| 자막 | |

### 왜 이게 뜨는가
[알고리즘 + 심리 관점 2~3가지]

### 로희's 픽 🎯
> [가장 중요한 인사이트 1가지, 솔직한 평가 포함]`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let geminiRes: Response | null = null;
    let lastError = "";
    for (const model of MODELS) {
      const res = await fetch(`${GEMINI_BASE_URL}chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("GOOGLE_AI_API_KEY")}`,
        },
        body: JSON.stringify({ model, messages: chatMessages, stream: true, max_tokens: 4096 }),
      });
      if (res.ok) { geminiRes = res; break; }
      lastError = await res.text();
      const status = res.status;
      if (status !== 429 && status !== 404) break;
    }

    if (!geminiRes) {
      return new Response(JSON.stringify({ error: lastError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(geminiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
