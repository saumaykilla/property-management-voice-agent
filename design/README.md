# UI Design Package

Date: 2026-03-24

## Purpose

This folder defines the UI for the property management voice ticketing platform before implementation begins.

The designs are guided by the referenced `design-patterns.md` note:
- avoid cargo-cult screens
- avoid duplicate workspaces that solve the same job
- introduce only the pages and patterns that solve a real workflow

## Product Shape

The product is a focused operations tool, not a generic proptech suite.

That means:
- no separate analytics page in v1
- no separate tickets page if the dashboard already handles live ticket operations
- no fake enterprise modules for vendors, billing, residents, or teams until the product actually needs them

## Route Map

### Public

- `/`
  - product landing page
- `/sign-in`
  - staff sign-in

### Authenticated

- `/onboarding`
  - one multi-step onboarding flow
- `/dashboard`
  - the main operational workspace for live ticket intake and resolution
- `/units`
  - managed residences and units
- `/catalog`
  - service catalog upload and knowledge-base health
- `/settings`
  - agency profile, business hours, transfer number, Vapi number, and assistant health

## Cross-Page Design Decisions

- The dashboard is the primary ticket workspace.
- Ticket detail opens as a right-side detail panel on desktop and a full-screen sheet on mobile.
- Onboarding is a single route with clear steps, not many disconnected pages.
- The visual language should feel trustworthy, operational, and modern without looking like a generic SaaS dashboard.

## Files

- `design-system.md`
- `design-direction.md`
- `component-inventory.md`
- `pages/landing-and-auth.md`
- `pages/onboarding.md`
- `pages/dashboard.md`
- `pages/units.md`
- `pages/catalog.md`
- `pages/settings.md`
- `wireframes/landing.md`
- `wireframes/sign-in.md`
- `wireframes/onboarding.md`
- `wireframes/dashboard.md`
- `wireframes/units.md`
- `wireframes/catalog.md`
- `wireframes/settings.md`
