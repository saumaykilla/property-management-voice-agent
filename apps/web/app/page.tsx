import Link from "next/link";
import { PublicTopNav } from "@/components/public-top-nav";

const steps =
  [
    {
      title:
        "Upload units",
      detail:
        "Bring in the homes and unit numbers your team supports.",
    },
    {
      title:
        "Get your Vapi number",
      detail:
        "Each agency receives a dedicated voice line and assistant identity.",
    },
    {
      title:
        "Watch tickets arrive live",
      detail:
        "Resident issues land in a real-time desk with the right property context.",
    },
  ];

const trustPoints =
  [
    {
      title:
        "Dedicated assistant",
      detail:
        "Each agency answers with its own name, phone line, and working-hours rules.",
    },
    {
      title:
        "Agency-scoped knowledge",
      detail:
        "Service catalog retrieval stays focused on the company behind the call.",
    },
    {
      title:
        "Tenant-isolated data",
      detail:
        "Units, tickets, and catalog context stay separated by agency membership.",
    },
  ];

export default function HomePage() {
  return (
    <main className="site-shell public-shell">
      <div className="marketing-shell">
        <PublicTopNav mode="landing" />

        <section className="landing-hero">
          <div className="hero-card hero-copy">
            <span className="status-pill">
              Dedicated
              number
              /
              Agency-specific
              assistant
            </span>
            <h1>
              Automated
              maintenance
              calls,
              turned
              into
              validated
              tickets
              in
              real
              time.
            </h1>
            <p>
              Each
              agency
              gets
              its
              own
              number,
              its
              own
              assistant,
              and
              a
              live
              service
              desk
              that
              captures
              resident
              issues
              without
              adding
              another
              phone
              tree.
            </p>
            <div className="button-row">
              <Link
                className="button-primary"
                href="/sign-in?mode=create-account"
              >
                Start
                setup
              </Link>
              <Link
                className="button-secondary"
                href="/sign-in?mode=sign-in"
              >
                See
                dashboard
              </Link>
            </div>
            <p className="hero-note">
              Dedicated
              number.
              Agency-specific
              assistant.
              Internal-only
              ticket
              flow.
            </p>
          </div>

          <div className="hero-card hero-console">
            <div className="console-ticket-slip">
              <span className="console-label">
                New
                call
              </span>
              <strong>
                219
                Cedar
                Street,
                Unit
                3B
              </strong>
              <p>
                Kitchen
                sink
                leak.
                Caller
                asked
                what
                happens
                next.
              </p>
            </div>

            <div className="console-board">
              <div className="console-header">
                <span className="console-label">
                  Live
                  desk
                </span>
                <span className="console-meta">
                  3
                  incoming
                  /
                  1
                  in
                  progress
                </span>
              </div>
              <div className="console-row">
                <strong>
                  Open
                  intake
                </strong>
                <span>
                  1048
                  Maple
                  Ave
                  /
                  Unit
                  12
                </span>
                <em>
                  Plumbing
                </em>
              </div>
              <div className="console-row">
                <strong>
                  Validation
                </strong>
                <span>
                  88
                  Harbor
                  Lane
                  /
                  Unit
                  2F
                </span>
                <em>
                  HVAC
                </em>
              </div>
              <div className="console-row">
                <strong>
                  Ready
                  to
                  dispatch
                </strong>
                <span>
                  219
                  Cedar
                  Street
                  /
                  Unit
                  3B
                </span>
                <em>
                  Water
                  leak
                </em>
              </div>
            </div>

            <div className="console-side">
              <div className="console-section">
                <span className="console-label">
                  Resident
                  check
                </span>
                <strong>
                  Matched
                  to
                  managed
                  unit
                </strong>
                <p>
                  Address
                  and
                  unit
                  are
                  confirmed
                  before
                  the
                  issue
                  is
                  logged.
                </p>
              </div>
              <div className="console-section">
                <span className="console-label">
                  Service
                  context
                </span>
                <strong>
                  Catalog
                  guidance
                  ready
                </strong>
                <p>
                  Repair
                  rules
                  and
                  escalation
                  paths
                  appear
                  before
                  a
                  ticket
                  is
                  created.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-section"
          id="how-it-works"
        >
          <div className="section-heading">
            <span className="eyebrow">
              How
              it
              works
            </span>
            <h2>
              Three
              steps
              from
              setup
              to
              live
              intake.
            </h2>
          </div>
          <div className="step-strip">
            {steps.map(
              (
                step,
                index,
              ) => (
                <article
                  className="step-card"
                  key={
                    step.title
                  }
                >
                  <span className="step-index">
                    0
                    {index +
                      1}
                  </span>
                  <strong>
                    {
                      step.title
                    }
                  </strong>
                  <p className="muted-text">
                    {
                      step.detail
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="landing-section">
          <div className="section-heading">
            <span className="eyebrow">
              Why
              agencies
              trust
              it
            </span>
            <h2>
              Built
              like
              an
              operations
              desk,
              not
              another
              call
              tree.
            </h2>
          </div>
          <div className="trust-band">
            {trustPoints.map(
              (
                point,
              ) => (
                <article
                  className="trust-card"
                  key={
                    point.title
                  }
                >
                  <strong>
                    {
                      point.title
                    }
                  </strong>
                  <p className="muted-text">
                    {
                      point.detail
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="landing-section">
          <div className="section-heading">
            <span className="eyebrow">
              Product
              preview
            </span>
            <h2>
              One
              side
              sets
              the
              desk
              up.
              The
              other
              keeps
              work
              moving.
            </h2>
          </div>
          <div className="preview-grid">
            <article className="preview-surface">
              <div className="preview-header">
                <span className="console-label">
                  Onboarding
                </span>
                <strong>
                  Agency
                  setup
                </strong>
              </div>
              <div className="preview-checklist">
                <div className="preview-line">
                  <span className="preview-dot" />
                  <span>
                    Agency
                    profile
                    and
                    office
                    hours
                  </span>
                </div>
                <div className="preview-line">
                  <span className="preview-dot" />
                  <span>
                    Managed
                    units
                    and
                    property
                    roster
                  </span>
                </div>
                <div className="preview-line">
                  <span className="preview-dot" />
                  <span>
                    Service
                    catalog
                    upload
                    and
                    review
                  </span>
                </div>
              </div>
            </article>

            <article className="preview-surface">
              <div className="preview-header">
                <span className="console-label">
                  Dashboard
                </span>
                <strong>
                  Live
                  ticket
                  board
                </strong>
              </div>
              <div className="preview-ticket-list">
                <div className="preview-ticket">
                  <strong>
                    New
                  </strong>
                  <span>
                    88
                    Harbor
                    Lane
                    /
                    Unit
                    2F
                  </span>
                  <em>
                    Cooling
                    issue
                  </em>
                </div>
                <div className="preview-ticket">
                  <strong>
                    In
                    progress
                  </strong>
                  <span>
                    219
                    Cedar
                    Street
                    /
                    Unit
                    3B
                  </span>
                  <em>
                    Water
                    leak
                  </em>
                </div>
                <div className="preview-ticket">
                  <strong>
                    Completed
                  </strong>
                  <span>
                    1048
                    Maple
                    Ave
                    /
                    Unit
                    12
                  </span>
                  <em>
                    Gate
                    access
                    reset
                  </em>
                </div>
              </div>
            </article>
          </div>
        </section>

        <footer className="public-footer">
          <p>
            Property
            management
            call
            intake,
            without
            the
            front-desk
            bottleneck.
          </p>
        </footer>
      </div>
    </main>
  );
}
