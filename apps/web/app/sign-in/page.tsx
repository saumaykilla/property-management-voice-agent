import { Suspense } from "react";
import { PublicTopNav } from "@/components/public-top-nav";
import { SignInForm } from "@/components/sign-in-form";

const valuePoints = [
  "Agency-specific number and assistant identity",
  "Validated unit matching before a ticket is opened",
  "Live desk for intake, follow-up, and completion",
];

export default function SignInPage() {
  return (
    <main className="site-shell public-shell">
      <div className="marketing-shell auth-shell">
        <PublicTopNav mode="auth" />

        <section className="auth-layout">
          <section className="hero-card auth-context-panel">
            <span className="eyebrow">Property management intake</span>
            <div className="page-heading">
              <h1>Property management call intake, without the front-desk bottleneck.</h1>
              <p>
                Bring resident calls, ticket creation, and status follow-up into one
                live workspace.
              </p>
            </div>

            <div className="auth-context-note">
              <span className="console-label">What you get</span>
              <ul className="auth-value-list">
                {valuePoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="sign-in-card auth-card">
            <Suspense fallback={<div className="auth-loading">Loading sign-in...</div>}>
              <SignInForm />
            </Suspense>
          </section>
        </section>
      </div>
    </main>
  );
}
