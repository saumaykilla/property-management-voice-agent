import Link from "next/link";

type PublicTopNavProps =
  {
    mode:
      | "landing"
      | "auth";
  };

export function PublicTopNav({
  mode,
}: Readonly<PublicTopNavProps>) {
  return (
    <header className="public-topbar">
      <Link
        className="brand-mark"
        href="/"
      >
        <span className="brand-dot" />
        <span>
          Property
          Management
          Voice
          Desk
        </span>
      </Link>

      {mode ===
      "landing" ? (
        <nav
          className="public-nav"
          aria-label="Primary"
        >
          <Link
            className="button-ghost"
            href="/sign-in?mode=sign-in"
          >
            Sign
            in
          </Link>
          <Link
            className="button-primary"
            href="/sign-in?mode=create-account"
          >
            Start
            setup
          </Link>
        </nav>
      ) : (
        <div className="public-nav">
          <Link
            className="button-ghost"
            href="/"
          >
            Return
            home
          </Link>
        </div>
      )}
    </header>
  );
}
