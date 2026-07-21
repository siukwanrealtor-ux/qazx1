import { useEffect, useState } from "react";
import { Cookie, X, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "realtydash-cookie-consent";

type Consent = "accepted" | "rejected";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (value: Consent) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-3xl animate-fade-in-up rounded-2xl border border-ink-100 bg-white p-4 shadow-lift sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-6 text-ink-700">
              We use cookies to keep you signed in, remember your preferences, and
              understand how the platform is used. By clicking "Accept all", you
              agree to our use of cookies. See our{" "}
              <a
                href="#/privacy-policy"
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                Privacy Policy
              </a>
              .
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => choose("accepted")}
                className="btn-primary"
              >
                <ShieldCheck className="h-4 w-4" />
                Accept all
              </button>
              <button
                onClick={() => choose("rejected")}
                className="btn-secondary"
              >
                Reject
              </button>
            </div>
          </div>
          <button
            onClick={() => choose("rejected")}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
