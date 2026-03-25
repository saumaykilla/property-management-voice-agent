"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchUserAgencyAccess } from "@/lib/app-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "create-account";

type ModeCopy = {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
};

const COPY_BY_MODE: Record<AuthMode, ModeCopy> = {
  "sign-in": {
    eyebrow: "Sign in",
    title: "Access your live desk",
    description: "Use your work email to get back to your tickets, units, and settings.",
    submitLabel: "Sign in",
  },
  "create-account": {
    eyebrow: "Create account",
    title: "Start your agency setup",
    description: "Create your account and continue straight into agency onboarding.",
    submitLabel: "Create account",
  },
};

function normalizeMode(value: string | null): AuthMode {
  return value === "create-account" ? "create-account" : "sign-in";
}

function formatAuthError(mode: AuthMode, message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "That email and password combination didn't match our records.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }

  if (mode === "create-account") {
    return "We couldn't create your account right now. Please try again.";
  }

  return "We couldn't sign you in right now. Please try again.";
}

async function getPostAuthDestination(
  supabase: Exclude<ReturnType<typeof createBrowserSupabaseClient>, null>,
) {
  try {
    const access = await fetchUserAgencyAccess(supabase);
    return access.onboardingLocked ? "/onboarding" : "/dashboard";
  } catch {
    return "/onboarding";
  }
}

export function SignInForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mode = normalizeMode(searchParams.get("mode"));
  const copy = COPY_BY_MODE[mode];

  useEffect(() => {
    setFeedback(null);
    setIsError(false);
  }, [mode]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        return;
      }

      const destination = await getPostAuthDestination(supabase);
      startTransition(() => {
        router.replace(destination);
      });
    });
  }, [router, supabase]);

  function handleModeChange(nextMode: AuthMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsError(false);
    setIsSubmitting(true);

    if (!supabase) {
      setIsError(true);
      setFeedback("The sign-in service is temporarily unavailable.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "create-account") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsError(true);
        setFeedback(formatAuthError(mode, error.message));
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        setFeedback("Taking you to setup...");
        setIsSubmitting(false);
        startTransition(() => {
          router.replace("/onboarding");
        });
        return;
      }

      setFeedback("Account created. Check your email to continue.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setIsError(true);
      setFeedback(formatAuthError(mode, error.message));
      setIsSubmitting(false);
      return;
    }

    const destination = await getPostAuthDestination(supabase);
    setFeedback(destination === "/dashboard" ? "Opening your desk..." : "Taking you to setup...");
    setIsSubmitting(false);
    startTransition(() => {
      router.replace(destination);
    });
  }

  return (
    <div className="auth-form-shell">
      <div className="auth-card-header">
        <span className="eyebrow">{copy.eyebrow}</span>
        <div className="page-heading">
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Authentication mode">
        <button
          aria-selected={mode === "sign-in"}
          className={`mode-toggle-button${mode === "sign-in" ? " active" : ""}`}
          onClick={() => handleModeChange("sign-in")}
          role="tab"
          type="button"
        >
          Sign in
        </button>
        <button
          aria-selected={mode === "create-account"}
          className={`mode-toggle-button${mode === "create-account" ? " active" : ""}`}
          onClick={() => handleModeChange("create-account")}
          role="tab"
          type="button"
        >
          Create account
        </button>
      </div>

      <form className="field-stack" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            disabled={isSubmitting}
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="agency.staff@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        <div className="field-group">
          <label htmlFor="password">Password</label>
          <input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            disabled={isSubmitting}
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            type="password"
            value={password}
          />
        </div>

        {feedback ? (
          <p className={isError ? "feedback-error" : "feedback-success"}>{feedback}</p>
        ) : null}

        <div className="button-row">
          <button className="button-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Working..." : copy.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
