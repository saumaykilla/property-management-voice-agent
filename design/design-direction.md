# Design Direction

Date: 2026-03-24

## Direction Summary

- Aesthetic name: `Civic Service Ledger`
- Purpose: operational clarity with enough warmth to feel human
- Dominant tone: `industrial utilitarian`
- Secondary tone: `editorial`

This interface should feel like a modern city service desk crossed with a well-designed operations ledger.

## DFII

- Aesthetic Impact: `4`
- Context Fit: `5`
- Implementation Feasibility: `4`
- Performance Safety: `4`
- Consistency Risk: `4`

DFII = `(4 + 5 + 4 + 4) - 4 = 13`

Interpretation:
- strong direction
- distinctive enough to avoid generic SaaS output
- realistic to implement cleanly in a production app

## Why This Direction Fits The Product

- Property management staff need trust, legibility, and speed more than novelty.
- The product lives at the intersection of customer service, operational intake, and real-time monitoring.
- Warm neutral surfaces help the interface feel less cold when dealing with resident problems.
- Editorial typography creates a memorable brand signature without undermining usability.

## Differentiation Anchor

If a screenshot lost its logo, it should still be recognizable because of:
- warm paper-toned operational surfaces
- blue-ink headings with municipal-document character
- split workspaces that feel like a live service board rather than a generic admin table
- ticket rows that resemble clipped service slips rather than standard dashboard cards

## Avoiding Generic UI

This avoids generic UI by doing the following instead of default SaaS patterns:
- using paper and ledger tones instead of plain white or dark-mode gradients
- using `Space Grotesk` and `Source Sans 3` instead of Inter-based dashboard typography
- designing the dashboard as a live service board instead of a metrics-first analytics screen
- using grouped operational panels and ticket slips instead of bare table-heavy layouts

## Design System Snapshot

### Fonts

- Display: `Space Grotesk`
- Body: `Source Sans 3`
- Utility and structured data: `IBM Plex Mono`

Rationale:
- `Space Grotesk` adds civic signage character
- `Source Sans 3` keeps forms and dense content readable
- `IBM Plex Mono` gives timestamps, IDs, and intake metadata a disciplined operational voice

### Color Variables

```text
--canvas: #F5F1E8
--surface: #FFFDF8
--surface-elevated: #F8F5EE
--border: #D9D1C2
--text-strong: #1E2A2F
--text-muted: #5C6A70
--ink-blue: #234B63
--signal-green: #2F7D5C
--warning-amber: #C7862F
--alert-rust: #B65A3C
--info-blue: #5A87A6
```

### Spacing Rhythm

- base unit: `8px`
- compact vertical rhythm: `8 / 12 / 16`
- standard card padding: `20-24`
- page gutters: `24 mobile`, `32 tablet`, `40 desktop`
- section spacing: `40-56`

### Motion Philosophy

- one decisive entrance motion per area
- realtime arrivals should feel visible but not theatrical
- side panels should move like drawers, not float like modals
- loading states should be calm and textual, with restrained shimmer only where necessary

## Surface Language

- Cards have restrained radius and visible borders.
- Shadows are soft and short, like lifted paper rather than glossy glass.
- Large surfaces can use a faint grid or rule-line texture.
- Dividers should feel like document rules, not decorative separators.

## Page-Level Intent

- Landing: persuasive but grounded
- Sign-in: calm and direct
- Onboarding: guided and confidence-building
- Dashboard: urgent but controlled
- Units: precise and administrative
- Catalog: knowledge-console feel
- Settings: stable infrastructure page
