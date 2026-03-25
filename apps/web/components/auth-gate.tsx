"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppAccess } from "@/components/app-access-provider";

export function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { access, environmentReady, error, isLoading, session } = useAppAccess();

  useEffect(() => {
    if (!isLoading && !session && pathname !== "/sign-in") {
      router.replace("/sign-in");
    }
  }, [isLoading, pathname, router, session]);

  useEffect(() => {
    if (!isLoading && session && access?.onboardingLocked && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [access?.onboardingLocked, isLoading, pathname, router, session]);

  if (!environmentReady) {
    return <div className="auth-loading">This workspace is getting ready.</div>;
  }

  if (isLoading) {
    return <div className="auth-loading">Checking your session...</div>;
  }

  if (error) {
    return <div className="auth-loading">We couldn&apos;t load your workspace just yet.</div>;
  }

  if (!session) {
    return <div className="auth-loading">Checking your session...</div>;
  }

  if (access?.onboardingLocked && pathname !== "/onboarding") {
    return <div className="auth-loading">Opening your setup flow...</div>;
  }

  return <>{children}</>;
}
