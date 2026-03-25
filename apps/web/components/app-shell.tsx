"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useAppAccess } from "@/components/app-access-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const links =
  [
    {
      href: "/dashboard",
      label:
        "Dashboard",
    },
    {
      href: "/onboarding",
      label:
        "Onboarding",
    },
    {
      href: "/units",
      label:
        "Units",
    },
    {
      href: "/catalog",
      label:
        "Catalog",
    },
    {
      href: "/settings",
      label:
        "Settings",
    },
  ];

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname =
    usePathname();
  const router =
    useRouter();
  const {
    access,
    session,
  } =
    useAppAccess();
  const onboardingLocked =
    access?.onboardingLocked ??
    true;

  async function handleSignOut() {
    const supabase =
      createBrowserSupabaseClient();
    if (
      !supabase
    ) {
      router.replace(
        "/sign-in",
      );
      return;
    }

    await supabase.auth.signOut();
    router.replace(
      "/sign-in",
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="brand-dot" />
          <span>
            Voice
            Desk
          </span>
        </div>
        <div className="sidebar-status">
          <span
            className={`status-pill ${onboardingLocked ? "status-caution" : "status-live"}`}
          >
            {onboardingLocked
              ? "Setup in progress"
              : "Desk unlocked"}
          </span>
          <p className="muted-text">
            {onboardingLocked
              ? "Complete onboarding to open your dashboard, units, catalog, and settings."
              : "Your workspace is open and ready for daily operations."}
          </p>
        </div>
        <nav aria-label="Primary">
          {links.map(
            (
              link,
            ) => {
              const locked =
                onboardingLocked &&
                link.href !==
                  "/onboarding";

              if (
                locked
              ) {
                return (
                  <Link
                    key={
                      link.href
                    }
                    className="nav-link locked"
                    href="/onboarding"
                  >
                    <span>
                      {
                        link.label
                      }
                    </span>
                    <span className="nav-lock-note">
                      Finish
                      setup
                      to
                      open
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={
                    link.href
                  }
                  className={`nav-link${pathname === link.href ? " active" : ""}`}
                  href={
                    link.href
                  }
                >
                  {
                    link.label
                  }
                </Link>
              );
            },
          )}
        </nav>
        {session ? (
          <button
            className="button-ghost"
            onClick={
              handleSignOut
            }
            type="button"
          >
            Sign
            out
          </button>
        ) : null}
      </aside>

      <main className="app-main">
        {
          children
        }
      </main>
    </div>
  );
}
