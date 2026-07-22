import { useState, FormEvent, useEffect } from "react";
import { Building2, Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SetupPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Supabase redirects back with auth tokens in the URL hash
  // (#access_token=...&type=recovery or type=invite). The supabase client
  // is configured with detectSessionInUrl: true, so it should pick these up.
  // We also explicitly call getSession to check.
  useEffect(() => {
    const init = async () => {
      // detectSessionInUrl should have already processed the hash on client init.
      // Give it a moment, then check for a session.
      await new Promise((r) => setTimeout(r, 300));
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setVerifying(false);
        return;
      }

      // If no session yet, try listening for the auth event that fires when
      // the URL is processed.
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") && session) {
          setVerifying(false);
        }
      });

      // Timeout after 5s if nothing happens.
      const timeout = setTimeout(() => {
        setVerifying(false);
        setError(
          "This password-setup link is invalid or has expired. Please request a new one."
        );
      }, 5000);

      return () => {
        sub.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };
    init();
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
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setDone(true);
    // Redirect after a short delay. Clean the URL so the Router's
    // isSetupFlow check no longer matches, then let the Router send
    // the user to the correct dashboard based on their role.
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + "#/";
      window.history.replaceState(null, "", cleanUrl);
      window.dispatchEvent(new Event("hashchange"));
    }, 2000);
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
