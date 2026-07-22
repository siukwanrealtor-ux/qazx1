import { useState, FormEvent, useEffect } from "react";
import {
  Building2,
  Lock,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SetupPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    let sub:
      | { subscription: { unsubscribe: () => void } }
      | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      await new Promise((r) => setTimeout(r, 300));
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setVerifying(false);
        setHasSession(true);
        return;
      }

      const { data: subData } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            (event === "SIGNED_IN" ||
              event === "PASSWORD_RECOVERY" ||
              event === "USER_UPDATED") &&
            session
          ) {
            setVerifying(false);
            setHasSession(true);
            if (timeout) clearTimeout(timeout);
          }
        },
      );
      sub = subData;

      timeout = setTimeout(() => {
        setVerifying(false);
        setLinkExpired(true);
      }, 5000);
    };

    init();

    return () => {
      sub?.subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLinkExpired(true);
      setHasSession(false);
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + "#/";
      window.history.replaceState(null, "", cleanUrl);
      window.dispatchEvent(new Event("hashchange"));
    }, 2000);
  };

  const goHome = () => {
    const cleanUrl = window.location.origin + window.location.pathname + "#/";
    window.history.replaceState(null, "", cleanUrl);
    window.dispatchEvent(new Event("hashchange"));
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-4 text-sm text-ink-500">Verifying your link…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
            Realty Dash
          </span>
        </div>

        <div className="card p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-brand-500" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                Password set!
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                Taking you to your dashboard…
              </p>
            </div>
          ) : linkExpired || !hasSession ? (
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                Link expired or invalid
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                This password-setup link has already been used or has expired.
                Go to sign in to request a new password link using the
                "Forgot password?" option.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={goHome}
                  className="btn-primary w-full"
                >
                  <ArrowLeft className="h-4 w-4" /> Go to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                Set your password
              </h2>
              <p className="mt-1.5 text-sm text-ink-500">
                Choose a password to activate your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="pw">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="pw"
                      type={show ? "text" : "password"}
                      required
                      minLength={8}
                      className="input pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-600"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="confirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="confirm"
                      type={show ? "text" : "password"}
                      required
                      className="input pl-9"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Set password & continue"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
