# Wireframe: Dashboard

Date: 2026-03-24

## Route

- `/dashboard`

## User Job

Review the live ticket queue, understand urgency, and move work forward without losing context.

## Desktop Layout

```text
+-----------+-------------------------------------------------------------------------+
| SIDE RAIL | TOP BAR                                                                 |
|           | Dashboard              Live now      Agency number      View settings     |
+-----------+-------------------------------------------------------------------------+
|           | SUMMARY STRIP                                                          |
|           | [ New today ] [ In progress ] [ Completed ] [ After-hours ]            |
+-----------+-------------------------------------------+-----------------------------+
|           | LIVE TICKET BOARD                           | TICKET DETAIL PANEL        |
|           | Search                                     | Ticket #                  |
|           | Filter chips                               | Status / priority         |
|           |                                             | Property + unit           |
|           | New now                                     | Caller details            |
|           |  - ticket row                               | Summary                   |
|           |  - ticket row                               | Full issue                |
|           |                                             | Event timeline            |
|           | Earlier today                               | Actions                   |
|           |  - ticket row                               | [In progress] [Done]      |
|           |                                             | [Cancel]                  |
|           | In progress                                 |                           |
|           |  - ticket row                               |                           |
+-----------+-------------------------------------------+-----------------------------+
```

## Ticket Row Anatomy

```text
+----------------------------------------------------------------------------+
| NEW | 42 Cedar Street  Unit 3B                High                         |
| Water leaking under kitchen sink              Caller: Maya Patel           |
| 2 min ago                                     Voice intake                 |
+----------------------------------------------------------------------------+
```

## Detail Panel Anatomy

```text
+--------------------------------------------------------------+
| Ticket #1048                          NEW                     |
| 42 Cedar Street / Unit 3B                                     |
| Maya Patel   (212) 555-0199                                   |
|                                                               |
| Summary                                                       |
| Water leaking under kitchen sink                              |
|                                                               |
| Full issue                                                    |
| Caller reports active water on floor near sink cabinet...     |
|                                                               |
| Timeline                                                      |
| 3:18 PM  Ticket created from voice                            |
|                                                               |
| [ Mark in progress ]  [ Mark completed ]  [ Cancel ]          |
+--------------------------------------------------------------+
```

## Mobile Layout

```text
+------------------------------------------------+
| Dashboard      Live now                         |
+------------------------------------------------+
| metric cards scroll horizontally                |
+------------------------------------------------+
| search                                          |
| filter chips                                    |
+------------------------------------------------+
| ticket row                                      |
| ticket row                                      |
| ticket row                                      |
+------------------------------------------------+
| tap row -> full-screen ticket sheet             |
+------------------------------------------------+
```

## Key States

- no ticket selected
- empty queue
- new ticket arrival animation
- realtime disconnected
- action saved confirmation

## Component Map

- SideRail
- ConnectionPill
- SummaryStrip
- TicketListGroup
- TicketRow
- TicketDetailPanel
- EventTimeline
- EmptyStateBlock
