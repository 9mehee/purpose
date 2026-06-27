import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sns_result = "", keyword = "", extra_args = "" } = await req.json();

    const systemPrompt = `너는 곽로희야. 방금 분석한 SNS 트렌드를 기반으로 실제로 찍을 수 있는 콘텐츠 기획안을 만들어.

성격: INTP, 분석적, 직접적. 아나운서 출신이라 말이 정확하지만 평소엔 편하게 얘기함.
한국어로 응답해.`;

    const userPrompt = `${sns_result ? `## SNS 트렌드 분석 결과\n${sns_result}\n\n` : ""}${extra_args ? `## 추가 요청사항\n${extra_args}\n\n` : ""}
위 트렌드 분석을 바탕으로 실제 제작 가능한 콘텐츠 기획안을 아래 형식으로 만들어줘.

조건:
- 크리에이터 혼자 또는 소규모로 제작 가능한 수준
- 트렌드 반영하되 차별점 포함
- 최소 3개 에피소드 시리즈

## 📋 콘텐츠 기획안
**기반 트렌드:** [분석한 트렌드 핵심]
**타겟 플랫폼:** [메인 플랫폼]
**기획 일시:** ${new Date().toLocaleDateString("ko-KR")}

### 시리즈 컨셉
**제목:** [시리즈명]
**한 줄 컨셉:** [15자 이내]
**왜 지금이냐:** [트렌드와 연결되는 이유]

---

### 에피소드 기획 (3개)

#### EP.01 — [제목]

##### 🎬 스토리보드 & 컷 구성
| 컷 | 시간 | 앵글/구도 | 피사체 & 동작 | 장소/배경 |
|----|------|-----------|---------------|-----------|
| #1 | 0~2초 | | | |
| #2 | 2~5초 | | | |
| #3 | 5~10초 | | | |
| #4 | 10~20초 | | | |
| #5 | 20~30초 | | | |
| #6 | 30초~ | | | |

##### 📝 대본
\`\`\`
[#1 — 0~2초]
(VO/OC): "[후킹 멘트]"
(행동/표정):

[#2 — 2~5초]
(VO/OC): ""
(행동/표정):

[#3 — 5~10초]
(VO/OC): ""
(행동/표정):

[#4 — 10~20초]
(VO/OC): ""
(행동/표정):

[#5 — 20~30초]
(VO/OC): ""
(행동/표정):

[#6 — 30초~]
(VO/OC): "[CTA 멘트]"
(행동/표정):
\`\`\`

##### 💬 자막 구성
| 컷 | 자막 텍스트 | 스타일 | 위치 | 등장 타이밍 |
|----|-------------|--------|------|-------------|
| #1 | | | | |
| #2 | | | | |
| #3 | | | | |

##### 🎵 편집 가이드
- **BGM:**
- **전환 효과:**
- **속도감:**
- **색감 톤:**

##### 📦 촬영 준비물
- **장소:**
- **소품/준비물:**
- **조명:**
- **촬영 기기:**

##### 📣 캡션 & 해시태그
\`\`\`
[캡션]

#해시태그1 #해시태그2 #해시태그3 #해시태그4 #해시태그5
\`\`\`

---

#### EP.02 — [제목]
[EP.01과 동일한 형식으로 작성]

---

#### EP.03 — [제목]
[EP.01과 동일한 형식으로 작성]

---

### 업로드 전략
| 항목 | 내용 |
|------|------|
| 업로드 순서 | EP.01 → 02 → 03 |
| 권장 요일/시간 | |
| 인터랙션 전략 | |
| 성과 측정 지표 | |

---

### 로희's 한마디 🎯
> [이 기획의 핵심 성공 포인트와 주의사항 — 솔직하게]`;

    const encoder = new TextEncoder();
    let fullText = "";

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
        body: JSON.stringify({ model, messages: chatMessages, stream: true, max_tokens: 8192 }),
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

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        await writer.write(encoder.encode(chunk));

        // SSE 청크에서 텍스트 추출
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content ?? "";
              fullText += delta;
            } catch {
              // 파싱 실패 무시
            }
          }
        }
      }

      // 생성 완료 후 Supabase Storage에 저장
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SB_SERVICE_ROLE_KEY")!
        );

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const kw = keyword || "기획안";
        const fileName = `${date}_${kw}_기획안.md`;

        const { error: uploadError } = await supabase.storage
          .from("rohee-plans")
          .upload(fileName, new TextEncoder().encode(fullText), {
            contentType: "text/markdown",
            upsert: true,
          });

        if (!uploadError) {
          const { data: signedData } = await supabase.storage
            .from("rohee-plans")
            .createSignedUrl(fileName, 3600);

          const donePayload = `\ndata: ${JSON.stringify({
            done: true,
            file_name: fileName,
            file_url: signedData?.signedUrl ?? null,
          })}\n\n`;
          await writer.write(encoder.encode(donePayload));
        }
      } catch {
        // Storage 저장 실패해도 스트리밍은 이미 완료
      }

      await writer.close();
    })();

    return new Response(readable, {
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
