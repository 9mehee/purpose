import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">로희24</h1>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            곽로희 에이전트 — SNS 트렌드 분석 & 콘텐츠 기획
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href="/chat"
            className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left hover:border-zinc-600 hover:bg-zinc-800 transition-all"
          >
            <div className="text-lg font-semibold">💬 페르소나 대화</div>
            <div className="mt-1 text-sm text-zinc-400">
              곽로희와 직접 얘기해봐
            </div>
          </Link>

          <Link
            href="/skills/sns"
            className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left hover:border-zinc-600 hover:bg-zinc-800 transition-all"
          >
            <div className="text-lg font-semibold">🔥 SNS 트렌드 분석</div>
            <div className="mt-1 text-sm text-zinc-400">
              인스타 / 유튜브 / 틱톡 실시간 트렌드 분석
            </div>
          </Link>

          <Link
            href="/skills/plan"
            className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left hover:border-zinc-600 hover:bg-zinc-800 transition-all"
          >
            <div className="text-lg font-semibold">📋 콘텐츠 기획안</div>
            <div className="mt-1 text-sm text-zinc-400">
              대본 · 스토리보드 · 자막 포함 기획안 생성
            </div>
          </Link>
        </div>

        <p className="text-xs text-zinc-600">
          [@9mehee](https://www.instagram.com/9mehee) · 로희24
        </p>
      </div>
    </main>
  );
}
