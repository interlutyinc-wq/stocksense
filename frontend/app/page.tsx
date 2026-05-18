import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute -right-48 top-0 h-[480px] w-[560px] rounded-full opacity-100"
        style={{
          background:
            "radial-gradient(ellipse, rgba(255,77,28,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-[400px] w-[440px] rounded-full opacity-100"
        style={{
          background:
            "radial-gradient(ellipse, rgba(0,229,160,0.06) 0%, transparent 65%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-ss-black/90 px-6 py-5 backdrop-blur-md md:px-12">
        <Link href="/" className="font-sans text-lg font-extrabold tracking-tight">
          Stock<em className="not-italic text-ss-accent">Sense</em>
        </Link>
        <span className="border border-ss-accent/30 px-3 py-1 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-ss-accent">
          AI-native
        </span>
        <Link
          href="/onboarding"
          className="font-sans text-xs font-bold tracking-wide text-ss-cream underline-offset-4 transition hover:text-ss-accent hover:underline"
        >
          Get started
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 py-20 md:px-12">
        <p className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-ss-accent">
          <span className="h-px w-7 bg-ss-accent" aria-hidden />
          Your AI supply chain agent
        </p>
        <h1 className="max-w-4xl font-sans text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] text-ss-cream md:text-7xl">
          Not a tool.{" "}
          <span className="text-ss-accent">An agent</span> that thinks.
        </h1>
        <p className="mt-8 max-w-lg font-mono text-sm leading-relaxed text-ss-cream/55">
          StockSense reasons through your Shopify data, understands your
          suppliers, and prepares reorder recommendations you can approve—
          with full explanations in plain language.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center bg-ss-accent px-10 py-4 font-sans text-sm font-bold tracking-wide text-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#00e5a0]"
          >
            Start onboarding →
          </Link>
          <Link
            href="/marketing"
            className="font-mono text-xs text-ss-muted transition hover:text-ss-cream"
          >
            View marketing site
          </Link>
        </div>
      </main>
    </div>
  );
}
