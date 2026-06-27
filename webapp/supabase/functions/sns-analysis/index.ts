import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODEL = "gemini-2.0-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function braveSearch(query: string): Promise<string> {
  const apiKey = Deno.env.get("BRAVE_API_KEY");
  if (!apiKey) return `[Brave Search API 키 없음 — 검색 건너뜀: ${query}]`;

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

    const geminiRes = await fetch(`${GEMINI_BASE_URL}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GOOGLE_AI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: err }), {
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
