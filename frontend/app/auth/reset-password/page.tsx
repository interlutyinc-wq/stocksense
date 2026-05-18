"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─────────────────────────────────────────────
   Inner component — must be inside <Suspense>
   because it calls useSearchParams()
───────────────────────────────────────────── */
function ResetPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  type Stage = "loading" | "ready" | "done" | "error";
  const [stage, setStage] = useState<Stage>("loading");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Establish session on mount ── */
  useEffect(() => {
    const code = searchParams.get("code");

    async function bootstrap() {
      if (code) {
        // PKCE flow: Supabase redirected here with ?code=xxx
        // Exchange the code for a session directly on this page —
        // no dependency on the /auth/callback route preserving query params.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setLinkError(
            "The link is invalid or has expired. Please request a new one.",
          );
          setStage("error");
        } else {
          setStage("ready");
        }
        return;
      }

      // No code in the URL — the /auth/callback route may have already
      // exchanged the code and set the session in the cookie (legacy path).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setStage("ready");
        return;
      }

      // Neither a code nor an existing session — link is invalid / expired.
      setLinkError(
        "No session found. The link may have expired.",
      );
      setStage("error");
    }

    void bootstrap();
  }, [supabase, searchParams]);

  /* ── Update password ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setStage("done");
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  /* ── Loading ── */
  if (stage === "loading") {
    return (
      <div className="flex items-center justify-center border border-white/[0.06] bg-ss-surface py-14">
        <span className="font-mono text-sm text-ss-cream/40">
          Verifying link…
        </span>
      </div>
    );
  }

  /* ── Error: invalid / expired link ── */
  if (stage === "error") {
    return (
      <div className="border border-white/[0.06] bg-ss-surface p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-ss-accent/30 bg-ss-accent/10 text-ss-accent">
            <XIcon />
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-ss-cream">
              Invalid link
            </p>
            <p className="mt-1 font-mono text-xs text-ss-muted">{linkError}</p>
          </div>
          <Link
            href="/onboarding"
            className="mt-2 border border-white/[0.08] px-5 py-2.5 font-mono text-xs text-ss-cream transition hover:border-ss-accent/40 hover:text-ss-accent"
          >
            Request a new link →
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (stage === "done") {
    return (
      <div className="border border-white/[0.06] bg-ss-surface p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-ss-green/30 bg-ss-green/10 text-ss-green">
            <CheckIcon />
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-ss-cream">
              Password updated!
            </p>
            <p className="mt-1 font-mono text-xs text-ss-muted">
              Redirecting to dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="border border-white/[0.06] bg-ss-surface p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="new-password"
            className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFormError(null);
            }}
            className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setFormError(null);
            }}
            className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
          />
          {confirm.length > 0 && (
            <p
              className={`mt-1.5 font-mono text-[10px] ${
                password === confirm ? "text-ss-green" : "text-ss-accent/70"
              }`}
            >
              {password === confirm
                ? "✓ Passwords match"
                : "Passwords don't match"}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="font-mono text-xs text-ss-accent">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-ss-accent py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#00e5a0] disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password →"}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page shell — wraps the form in Suspense
   (required by Next.js when useSearchParams
    is used inside a client component)
───────────────────────────────────────────── */
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ss-black">
      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5 md:px-12">
        <Link
          href="/"
          className="font-sans text-lg font-extrabold tracking-tight text-ss-cream"
        >
          Stock<em className="not-italic text-ss-accent">Sense</em>
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ss-muted">
          Reset password
        </span>
      </header>

      {/* ── Content ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ss-accent">
            New password
          </p>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ss-cream md:text-3xl">
            Choose a secure
            <br />
            <span className="text-ss-accent">password.</span>
          </h1>
          <p className="mt-3 font-mono text-sm leading-relaxed text-ss-cream/50">
            Enter your new password for your StockSense account.
          </p>

          <div className="mt-8">
            <Suspense
              fallback={
                <div className="flex items-center justify-center border border-white/[0.06] bg-ss-surface py-14">
                  <span className="font-mono text-sm text-ss-cream/40">
                    Loading…
                  </span>
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center font-mono text-[11px] text-ss-muted">
            Remember your password?{" "}
            <Link
              href="/onboarding"
              className="text-ss-cream underline-offset-2 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ── Icone ── */
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.5 9.5L7 13L14.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
