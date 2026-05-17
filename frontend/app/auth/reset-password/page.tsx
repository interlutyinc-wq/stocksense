"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non corrispondono.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1800);
  }

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

      {/* ── Form ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Glow decorativo */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(ellipse, rgba(255,77,28,0.4) 0%, transparent 70%)",
            }}
            aria-hidden
          />

          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ss-accent">
            Nuova password
          </p>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ss-cream md:text-3xl">
            Scegli una password
            <br />
            <span className="text-ss-accent">sicura.</span>
          </h1>
          <p className="mt-3 font-mono text-sm leading-relaxed text-ss-cream/50">
            Inserisci la nuova password per il tuo account StockSense.
          </p>

          <div className="mt-8 border border-white/[0.06] bg-ss-surface p-6 md:p-8">
            {done ? (
              /* ── Stato successo ── */
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center border border-ss-green/30 bg-ss-green/10 text-ss-green">
                  <CheckIcon />
                </div>
                <div>
                  <p className="font-sans text-sm font-bold text-ss-cream">
                    Password aggiornata!
                  </p>
                  <p className="mt-1 font-mono text-xs text-ss-muted">
                    Redirect alla dashboard in corso…
                  </p>
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="new-password"
                    className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                  >
                    Nuova password
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
                      setError(null);
                    }}
                    className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                  >
                    Conferma password
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
                      setError(null);
                    }}
                    className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                  />
                  {/* Indicatore match in tempo reale */}
                  {confirm.length > 0 && (
                    <p
                      className={`mt-1.5 font-mono text-[10px] ${
                        password === confirm
                          ? "text-ss-green"
                          : "text-ss-accent/70"
                      }`}
                    >
                      {password === confirm
                        ? "✓ Le password corrispondono"
                        : "Le password non corrispondono"}
                    </p>
                  )}
                </div>

                {error && (
                  <p role="alert" className="font-mono text-xs text-ss-accent">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-ss-accent py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#00e5a0] disabled:opacity-50"
                >
                  {busy ? "Aggiornamento…" : "Aggiorna password →"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center font-mono text-[11px] text-ss-muted">
            Ricordi la password?{" "}
            <Link
              href="/onboarding"
              className="text-ss-cream underline-offset-2 hover:underline"
            >
              Torna al login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

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
