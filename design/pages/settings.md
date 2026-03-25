# Settings Page

Date: 2026-03-24

## Route

- `/settings`

## Purpose

Provide one operational settings page for agency-level configuration without fragmenting v1 into many sub-settings screens.

## Core Design Decision

One settings page is enough for the pilot because there is one internal role and one agency scope.

Separate pages for profile, telephony, and hours would add navigation complexity without solving a real user problem.

## Sections

### Agency Profile

- agency name
- office address
- contact number
- timezone

### Business Hours

- weekday schedule editor
- transfer eligibility summary

### Voice Setup

- assigned Vapi number
- assistant status
- transfer number
- last provisioning check

### Safety And Behavior

- brief read-only summary of current assistant policy:
  - low-friction unit validation
  - internal ticket creation
  - no transcript retention
  - transfer only on request or failed resolution

This section is intentionally not a giant prompt editor in v1.

## Layout

- stacked settings sections inside large bordered cards
- sticky save bar only when changes exist
- status indicators at the right edge of each card heading

## Visual Notes

- settings should feel stable and administrative
- use denser spacing than onboarding but preserve readability
- telephony data should stand out as operational infrastructure, not decorative metadata

## Empty And Error States

- provisioning failed
- missing transfer number
- invalid business-hour configuration
