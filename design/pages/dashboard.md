# Dashboard

Date: 2026-03-24

## Route

- `/dashboard`

## Purpose

This is the core product page.

It should let an agency:
- watch tickets arrive in realtime
- understand operational state at a glance
- update ticket status quickly
- inspect ticket details without losing the live stream

## Core Design Decision

There is no separate primary tickets page in v1.

The dashboard itself is the ticket workspace because that is the real repeated job the user performs.

## Layout

### Desktop

- left rail navigation
- top utility bar
- summary strip
- main split workspace

```text
+---------+------------------------------------------------------+
| Nav     | Top bar                                              |
|         +------------------------------------------------------+
|         | Summary cards                                        |
|         +-----------------------------+------------------------+
|         | Live ticket list            | Ticket detail panel    |
|         |                             | or empty helper state  |
|         | filters                     |                        |
|         | grouped rows                |                        |
|         | realtime arrivals           |                        |
|         |                             |                        |
+---------+-----------------------------+------------------------+
```

### Mobile

- summary cards become a horizontal scroll strip
- live ticket list becomes the default view
- ticket detail opens as a full-screen sheet

## Sections

### Top Bar

- agency switch is not needed in v1
- show:
  - page title
  - live connection state
  - current agency phone number
  - quick action: `View settings`

### Summary Cards

- new tickets today
- in progress
- completed today
- after-hours tickets

These are operational summaries, not vanity analytics.

### Live Ticket List

Grouping:
- `New now`
- `Earlier today`
- `In progress`

Each row shows:
- status badge
- address and unit
- issue summary
- caller name
- created time
- priority

New rows should visibly arrive and settle.

### Ticket Detail Panel

Open when a row is selected.

Contains:
- property and unit
- caller details
- status control
- priority
- issue summary
- full issue details
- event timeline
- actions:
  - mark in progress
  - mark completed
  - cancel

## Empty State

When no ticket is selected:
- show a calm guidance panel
- explain that new voice-created tickets will appear here in realtime

## Visual Notes

- Ticket list should feel like an air-traffic desk, but warm and readable.
- Use a pale board background with slightly darker list rows.
- Keep the detail panel denser and more document-like.

## States To Design

- no tickets yet
- new ticket arrives while another ticket is open
- realtime disconnected
- ticket update saved
