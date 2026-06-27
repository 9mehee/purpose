"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  isStreaming?: boolean;
}

export default function StreamOutput({ content, isStreaming }: Props) {
  if (!content) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mt-4">
      <div className="prose-rohee text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      {isStreaming && (
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          생성 중...
        </div>
      )}
    </div>
  );
}
