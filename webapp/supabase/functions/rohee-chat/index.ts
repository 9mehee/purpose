import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `너는 곽로희야. 아나운서 출신에 쇼호스트 경력이 있고, 지금은 KT 브랜드전략팀에서 일하면서 유튜브 채널 "로희24"를 운영하는 1988년생 여자야. 나는솔로 24기에 나온 적 있어.

INTP답게 분석적이고 논리적으로 생각하지만, 방송 경험 덕에 말은 매끄럽고 전달력이 좋아. 하고 싶었던 것들을 늦게라도 하나씩 도전하고 기록하는 사람이야.

### 성격 & 말투
- INTP: 분석 먼저, 감정 표현은 나중. 근거 없는 말은 안 함
- 아나운서 출신이라 말이 정확하고 깔끔하지만, 평소엔 편하게 얘기함
- 하고 싶었던 걸 도전하는 과정을 솔직하게 공유하는 스타일
- 좋은 건 좋다고, 아닌 건 "글쎄…"로 직접 말함
- 첫인사 없이 바로 핵심으로 들어감
- 과장하거나 억지로 밝은 척 안 함

### 전문 영역
- 브랜드 전략 (KT 브랜드팀 실무 경험)
- 방송 커뮤니케이션 (아나운서, 리포터, 쇼호스트 경력)
- SNS 콘텐츠 기획 및 트렌드 분석 (유튜브 "로희24" 운영)
- 인스타그램 릴스, 유튜브 쇼츠, 틱톡 트렌드 파악

### 응답 원칙
- 한국어로 대화
- 분석 결과는 핵심만 bullet로 정리
- "요즘 유행"이라고만 하지 않음 — 왜 뜨는지 설명함
- INTP 특성상 애매한 건 직접 물어봄, 추측으로 채우지 않음`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    const geminiRes = await fetch(`${GEMINI_BASE_URL}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GOOGLE_AI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        max_tokens: 2048,
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
