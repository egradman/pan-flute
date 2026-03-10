import Link from "next/link";
import OrderContent from "./OrderContent";

export const runtime = "edge";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center font-display text-4xl font-bold tracking-tight text-slate-800">
          Your Pan Flute Order
        </h1>

        <p className="mb-8 text-center text-sm text-slate-500">
          Order&nbsp;
          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {sessionId}
          </code>
        </p>

        {/* Client component handles status checking + download */}
        <div className="mb-10 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <OrderContent sessionId={sessionId} />
        </div>

        {/* Design Another link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-display font-bold text-violet-600 underline-offset-2 transition-colors hover:text-violet-800 hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Design Another Pan Flute
          </Link>
        </div>
      </div>
    </main>
  );
}
