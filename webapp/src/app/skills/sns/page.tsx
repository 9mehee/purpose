"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StreamOutput from "@/components/StreamOutput";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PLATFORMS = ["인스타", "유튜브", "틱톡"];
const METRICS = ["조회수", "좋아요", "댓글", "시청지속시간"];
const COUNTRIES = [
  { value: "한국", label: "🇰🇷 한국" },
  { value: "미국", label: "🇺🇸 미국" },
  { value: "both", label: "🇰🇷+🇺🇸 비교" },
];

async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        try {
          const json = JSON.parse(line.slice(6));
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) onChunk(delta);
        } catch {
          // 무시
        }
      }
    }
  }
}

export default function SnsPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [country, setCountry] = useState("한국");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const toggle = (
    arr: string[],
    setArr: (v: string[]) => void,
    val: string
  ) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const run = async () => {
    setOutput("");
    setIsDone(false);
    setIsStreaming(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sns-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ keyword, platforms, metrics, country }),
      });

      if (!res.body) throw new Error("응답 없음");

      await parseSSEStream(res.body, (chunk) => {
        setOutput((prev) => prev + chunk);
      });

      setIsDone(true);
    } catch (e) {
      setOutput(`오류: ${String(e)}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const goToPlan = () => {
    sessionStorage.setItem("sns_result", output);
    sessionStorage.setItem("sns_keyword", keyword);
    router.push("/skills/plan");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 text-sm">
          ← 홈
        </Link>
        <h1 className="font-semibold text-lg">🔥 SNS 트렌드 분석</h1>
      </div>

      {/* 옵션 폼 */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">키워드</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="먹방, 운동, 뷰티... (없으면 전체 트렌드)"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            플랫폼 (복수 선택 가능)
          </label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => toggle(platforms, setPlatforms, p)}
                className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                  platforms.includes(p)
                    ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-xs text-zinc-600 self-center">
              {platforms.length === 0 ? "(전체)" : ""}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            분석 지표 (복수 선택 가능)
          </label>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m}
                onClick={() => toggle(metrics, setMetrics, m)}
                className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                  metrics.includes(m)
                    ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {m}
              </button>
            ))}
            <span className="text-xs text-zinc-600 self-center">
              {metrics.length === 0 ? "(전체)" : ""}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">국가</label>
          <div className="flex gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCountry(c.value)}
                className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                  country === c.value
                    ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={isStreaming}
          className="w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 py-2.5 text-sm font-medium transition-colors"
        >
          {isStreaming ? "분석 중..." : "분석 시작"}
        </button>
      </div>

      {/* 결과 */}
      <StreamOutput content={output} isStreaming={isStreaming} />

      {/* 기획안으로 이동 */}
      {isDone && output && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950 p-4 flex items-center justify-between">
          <p className="text-sm text-emerald-300">
            분석 끝. 바로 기획안 들어갈게 👇
          </p>
          <button
            onClick={goToPlan}
            className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors"
          >
            기획안 생성 →
          </button>
        </div>
      )}
    </div>
  );
}
