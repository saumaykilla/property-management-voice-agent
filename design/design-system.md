# Design System

Date: 2026-03-24

## Visual Direction

The product should feel like:
- a calm service control room
- a municipal operations desk with modern polish
- trustworthy enough for office staff
- warm enough to feel resident-centered rather than mechanical

It should not feel like:
- a neon startup dashboard
- a finance app
- a dark-mode-only cyber interface
- a generic Tailwind admin template

## Core Aesthetic

- Backgrounds use warm paper tones and pale concrete neutrals rather than plain white.
- Data surfaces use soft cards with visible structure, thin borders, and subtle shadow.
- Accent colors are functional and operational rather than decorative.
- Ticket activity uses color sparingly so urgency remains meaningful.

## Typography

- Headings: `Space Grotesk`
- Body: `Source Sans 3`
- Monospace and structured data: `IBM Plex Mono`

Typography role guidance:
- Page titles feel assertive and architectural.
- Body text is highly readable and compact.
- Numeric operational data uses monospaced treatment only where it improves scanning.

## Color System

### Base

- Canvas: `#F5F1E8`
- Surface: `#FFFDF8`
- Elevated surface: `#F8F5EE`
- Border: `#D9D1C2`
- Text strong: `#1E2A2F`
- Text muted: `#5C6A70`

### Accent

- Primary ink blue: `#234B63`
- Signal green: `#2F7D5C`
- Warning amber: `#C7862F`
- Alert rust: `#B65A3C`
- Info blue: `#5A87A6`

### Status

- New: pale blue badge
- In progress: amber badge
- Completed: green badge
- Cancelled: muted gray badge

## Motion

- Ticket rows fade and slide in when created in realtime.
- New tickets pulse once with a soft left-border glow, then settle.
- Right-side detail panels use a quick 180ms slide and fade.
- Onboarding steps use a horizontal progress motion rather than bouncing transitions.

Avoid:
- decorative floating animation
- excessive spring physics
- loading shimmer on every surface

## Layout Principles

- Max content width on marketing and onboarding screens: `1200px`
- Operational app shell uses a fixed left rail and flexible main workspace on desktop.
- Tables should never be the only way to understand the system; each data-heavy area needs summary chips or grouped cards as well.
- Mobile layouts should collapse side panels into full-screen sheets and stack key actions above dense metadata.

## Component Vocabulary

### Primary components

- Top navigation bar
- Left navigation rail
- Step progress bar
- Summary metric cards
- Live ticket list
- Ticket detail sheet
- Data import card
- Upload progress module
- Status badge
- Knowledge match card
- Empty state block

### Reusable interaction patterns

- Split workspace: list on left, detail on right
- Wizard steps with save-and-continue
- Inline validation with calm helper text
- Sticky action bar on long forms
- Slide-over detail sheet for operational edits

## Pattern Restraint

Based on the referenced `design-patterns.md`, use UI patterns only where they solve real repeated problems:

- The split workspace pattern is justified because ticket review and action happen repeatedly.
- The wizard pattern is justified because onboarding has a real sequence and partial completion states.
- A separate analytics pattern is not justified in v1 because the product’s real task is ticket intake and resolution.
- A second ticket page is not justified because it would duplicate the dashboard’s main job.

## Accessibility Baseline

- AA contrast minimum
- Clear keyboard focus rings in `Primary ink blue`
- All status meaning supported by text, not color alone
- Mobile touch targets at least 44px
- Upload, import, and realtime updates must expose visible text feedback
