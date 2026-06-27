"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StreamOutput from "@/components/StreamOutput";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  onDone?: (data: { file_name?: string; file_url?: string }) => void
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
          if (json.done && onDone) {
            onDone(json);
          } else {
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) onChunk(delta);
          }
        } catch {
          // 무시
        }
      }
    }
  }
}

export default function PlanPage() {
  const [snsResult, setSnsResult] = useState("");
  const [keyword, setKeyword] = useState("");
  const [extraArgs, setExtraArgs] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("sns_result");
    const savedKw = sessionStorage.getItem("sns_keyword");
    if (saved) setSnsResult(saved);
    if (savedKw) setKeyword(savedKw);
  }, []);

  const run = async () => {
    setOutput("");
    setFileUrl(null);
    setFileName(null);
    setIsStreaming(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/content-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          sns_result: snsResult,
          keyword,
          extra_args: extraArgs,
        }),
      });

      if (!res.body) throw new Error("응답 없음");

      await parseSSEStream(
        res.body,
        (chunk) => setOutput((prev) => prev + chunk),
        (data) => {
          if (data.file_url) setFileUrl(data.file_url);
          if (data.file_name) setFileName(data.file_name);
        }
      );
    } catch (e) {
      setOutput(`오류: ${String(e)}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 text-sm">
          ← 홈
        </Link>
        <h1 className="font-semibold text-lg">📋 콘텐츠 기획안</h1>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">키워드</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="먹방, 운동, 뷰티..."
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            SNS 분석 결과{" "}
            {snsResult ? (
              <span className="text-emerald-400">(자동 연결됨 ✓)</span>
            ) : (
              <span className="text-zinc-500">(없으면 직접 입력)</span>
            )}
          </label>
          <textarea
            value={snsResult}
            onChange={(e) => setSnsResult(e.target.value)}
            rows={4}
            placeholder="/sns-analysis 결과를 붙여넣거나 SNS 분석 페이지에서 바로 연결하세요"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">
            추가 요청사항 (선택)
          </label>
          <input
            value={extraArgs}
            onChange={(e) => setExtraArgs(e.target.value)}
            placeholder="예: 30초 이내 릴스, 혼자 찍기 가능한 것만"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <button
          onClick={run}
          disabled={isStreaming}
          className="w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 py-2.5 text-sm font-medium transition-colors"
        >
          {isStreaming ? "기획안 생성 중..." : "기획안 생성"}
        </button>
      </div>

      <StreamOutput content={output} isStreaming={isStreaming} />

      {fileUrl && fileName && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-300 font-medium">
              📁 저장 완료
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">{fileName}</p>
          </div>
          <a
            href={fileUrl}
            download={fileName}
            className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors"
          >
            다운로드
          </a>
        </div>
      )}
    </div>
  );
}
