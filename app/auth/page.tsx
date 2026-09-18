"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLoading(false);
      return setMessage("Please enter both email and password.");
    }

    const supabase = createClient();
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = requestedNext?.startsWith("/") ? requestedNext : "/dashboard";

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (error) { setLoading(false); return setMessage(error.message); }
      if (!data.session) { setLoading(false); return setMessage("Email confirmation is still enabled in Supabase."); }
      window.location.replace(`/onboarding?next=${encodeURIComponent(next)}`);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });
    if (error) { setLoading(false); return setMessage(error.message); }
    const destination = data.user.user_metadata.full_name ? next : `/onboarding?next=${encodeURIComponent(next)}`;
    window.location.replace(destination);
  }

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setMessage("");
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f0f8ef,_#eef4ef_35%,_#edf1ef_100%)] px-4 py-10 text-[#10231d]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,69,52,0.08),rgba(255,255,255,0.15))]" />

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[32px] border border-[#dfe8e2] bg-white/75 p-7 shadow-[0_30px_100px_rgba(10,32,25,0.12)] backdrop-blur-sm sm:p-8">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#123f31] text-lg font-black text-white shadow-lg shadow-[#123f31]/25">CG</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f736d]">CircleGuard</p>
                <h1 className="text-2xl font-bold text-[#112a23]">Secure ajo, together</h1>
              </div>
            </div>

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#d9e7df] bg-[#f2faf5] px-3 py-2 text-sm font-medium text-[#1d5a45]">
              <Sparkles size={15} className="text-[#1d5a45]" />
              Trusted by saving groups that value transparency
            </div>

            <h2 className="max-w-md text-4xl font-black tracking-tight text-[#142d26] sm:text-5xl">
              Protect every contribution with confidence.
            </h2>

            <p className="mt-4 max-w-lg text-base leading-7 text-[#5f736d]">
              CircleGuard helps members predict risk early, spot affordability issues, and keep informal savings circles safer without exposing private banking details.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              "Early risk detection before default happens",
              "Safer circle onboarding for every member",
              "Private, verifiable trust signals for groups",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#e3ece7] bg-[#f8faf8] px-4 py-3 text-sm font-medium text-[#30463f]">
                <CheckCircle2 size={18} className="text-[#1f785d]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e3ece7] bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-[#123f31]">
                <Users size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">Members</span>
              </div>
              <p className="text-2xl font-black text-[#112a23]">2x</p>
              <p className="text-sm text-[#60736d]">more confidence in circle decisions</p>
            </div>
            <div className="rounded-2xl border border-[#e3ece7] bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-[#123f31]">
                <ShieldCheck size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">Protection</span>
              </div>
              <p className="text-2xl font-black text-[#112a23]">24/7</p>
              <p className="text-sm text-[#60736d]">monitoring for affordability risk</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#dfe8e2] bg-white p-6 shadow-[0_30px_100px_rgba(10,32,25,0.12)] sm:p-8">
          <div className="mb-8 grid grid-cols-2 rounded-2xl border border-[#e6ece8] bg-[#f7faf8] p-1.5">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mode === "signin" ? "bg-white text-[#123f31] shadow-sm ring-1 ring-[#e7eeea]" : "text-[#75827d]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mode === "signup" ? "bg-white text-[#123f31] shadow-sm ring-1 ring-[#e7eeea]" : "text-[#75827d]"}`}
            >
              Create account
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5f736d]">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-[#112a23]">
              {mode === "signin" ? "Access your circle" : "Start building trust"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#64736f]">
              {mode === "signin"
                ? "Use your email and password to continue securely."
                : "Create your account and set up your profile in minutes."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={authenticate}>
            <label className="block text-sm font-semibold text-[#1a2d28]">
              Email address
              <input
                className="input mt-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#1a2d28]">
              Password
              <input
                className="input mt-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="At least 6 characters"
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
            </label>

            {message && (
              <p className="rounded-2xl border border-[#f1debe] bg-[#fff8ed] px-4 py-3 text-sm font-medium text-[#8a5a13]" role="status">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#123f31] px-4 py-3.5 text-base font-semibold text-white shadow-[0_18px_35px_rgba(18,63,49,0.28)] transition hover:bg-[#0d3327] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e7ece9] bg-[#f8faf8] p-3 text-xs leading-5 text-[#66766f]">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#2b7659]" />
            <p>No confirmation email is sent. Your session is protected by Supabase.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
