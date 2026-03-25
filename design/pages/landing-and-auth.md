# Landing And Auth

Date: 2026-03-24

## Goal

Create a clear front door for property management companies that explains the product quickly and gets staff into setup without marketing noise.

## Page: `/`

### Purpose

- explain what the product does
- establish trust fast
- move the right user into sign-up or sign-in

### Structure

1. Top bar
   - logo
   - `How it works`
   - `Sign in`
   - `Start setup`
2. Hero
   - headline focused on phone-to-ticket automation
   - supporting paragraph for property management teams
   - primary CTA: `Start setup`
   - secondary CTA: `See dashboard`
   - right-side product illustration showing live ticket intake
3. How it works strip
   - `Agency uploads units and service catalog`
   - `Each agency gets its own Vapi number`
   - `Calls become validated tickets in realtime`
4. Trust section
   - dedicated phone number per agency
   - agency-specific assistant identity
   - multi-tenant data isolation
5. Product preview
   - dashboard mock
   - onboarding mock
6. Footer

### Visual Notes

- Use a layered paper-and-grid background rather than flat white.
- The hero should feel operational, not glossy marketing.
- Product mockups should look like a real service desk, with tickets visibly arriving.

### Wireframe

```text
+-------------------------------------------------------------+
| Logo       How it works                Sign in  Start setup |
+-------------------------------------------------------------+
| Automate maintenance calls into real tickets               |
| Each agency gets its own number, its own assistant,        |
| and a live dashboard for ticket intake.                    |
| [Start setup] [See dashboard]        [product mockup]      |
+-------------------------------------------------------------+
| Upload units | Get a number | Receive tickets live         |
+-------------------------------------------------------------+
| Why agencies trust this                                    |
+-------------------------------------------------------------+
| Dashboard preview                                          |
+-------------------------------------------------------------+
```

## Page: `/sign-in`

### Purpose

- get staff into the product quickly
- avoid a bloated auth experience

### Structure

- left: brand promise and one-line explanation
- right: sign-in card
- options:
  - email/password or magic link
  - return to landing

### Visual Notes

- Keep this page quiet and compact.
- Use the same background language as the landing page but with less ornament.

## Notes

- No separate sign-up marketing funnel is needed in the design package yet.
- `Start setup` can route to auth first and then into onboarding.
