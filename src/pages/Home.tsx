import { useState, FormEvent } from "react";
import {
  Building2,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

type Mode = "signin" | "signup" | "forgot";

export default function Home() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (session) {
    if (!window.location.hash || window.location.hash === "#/") {
      window.location.hash = "#/agent/dashboard";
    }
  }

  const resetState = () => {
    setError(null);
    setMessage(null);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    resetState();

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        setError(
          signInError.message.includes("Invalid login")
            ? "Incorrect email or password. If you haven't set a password yet, use \"Forgot password\" to get a setup link."
            : signInError.message,
        );
        return;
      }

      if (data.session) {
        window.location.hash = "#/agent/dashboard";
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    resetState();

    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const res = await fetch(funcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          role: "agent",
          redirectTo: window.location.origin + window.location.pathname,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");

      setMessage(
        json.isNew
          ? "Your agent account has been created. Check your email for a link to set your password."
          : "An account already exists for this email. We've sent a link to set your password.",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    resetState();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}${window.location.pathname}?action=setup`,
        },
      );

      if (resetError) throw resetError;

      setMessage("Password reset link sent. Check your email to set a new password.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Sign in to your account",
    signup: "Create your agent account",
    forgot: "Reset your password",
  };

  const subtitles: Record<Mode, string> = {
    signin: "Enter your email and password to access your dashboard.",
    signup: "We'll create your account and email you a link to set your password.",
    forgot: "Enter your email and we'll send you a link to set a new password.",
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Left — brand / marketing */}
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-ink-950 p-8 text-white lg:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #38a061 0, transparent 45%), radial-gradient(circle at 80% 70%, #25824c 0, transparent 40%)",
            }}
          />
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              EstateSync
            </span>
          </div>

          <div className="relative z-10 max-w-md">
            <h1 className="font-display text-4xl font-semibold leading-tight lg:text-5xl">
              Manage every client, every listing, in one elegant place.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-300">
              EstateSync gives real estate agents a private workspace to onboard
              clients, build saved searches, and track listings — with a shared
              dashboard your clients can actually use.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-ink-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                Invite clients by email
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                Shared listing dashboards
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                Unlimited saved searches
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-xs text-ink-400">
              © {new Date().getFullYear()} EstateSync. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-300">
              <a href="#/about-us" className="transition hover:text-white">About Us</a>
              <a href="#/privacy-policy" className="transition hover:text-white">Privacy Policy</a>
              <a href="#/terms-of-service" className="transition hover:text-white">Terms of Service</a>
              <a href="#/data-policy" className="transition hover:text-white">Data Policy</a>
              <a href="#/dmca-policy" className="transition hover:text-white">DMCA Policy</a>
            </div>
          </div>
        </div>

        {/* Right — auth form */}
        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm animate-fade-in-up">
            {mode === "forgot" && (
              <button
                onClick={() => {
                  setMode("signin");
                  resetState();
                }}
                className="mb-4 flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            )}

            <h2 className="font-display text-2xl font-semibold text-ink-900">
              {titles[mode]}
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">{subtitles[mode]}</p>

            {/* Sign In */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="mt-8 space-y-4">
                <div>
                  <label className="label" htmlFor="email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      className="input pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@brokerage.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        resetState();
                      }}
                      className="text-xs font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      className="input pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Sign Up */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="mt-8 space-y-4">
                <div>
                  <label className="label" htmlFor="name">
                    Name <span className="text-ink-400">(optional)</span>
                  </label>
                  <input
                    id="name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Rivera"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="signup-email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      className="input pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@brokerage.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
                <div>
                  <label className="label" htmlFor="forgot-email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      className="input pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@brokerage.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            )}

            {/* Toggle between sign in / sign up */}
            {mode !== "forgot" && (
              <p className="mt-6 text-center text-sm text-ink-500">
                {mode === "signin" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        resetState();
                      }}
                      className="inline-flex items-center gap-1 font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signin");
                        resetState();
                      }}
                      className="font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
