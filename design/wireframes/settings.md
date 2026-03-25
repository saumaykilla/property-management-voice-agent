# Wireframe: Settings

Date: 2026-03-24

## Route

- `/settings`

## User Job

Maintain the core agency configuration and verify the health of the voice setup.

## Desktop Layout

```text
+-----------+------------------------------------------------------------------+
| SIDE RAIL | TOP BAR                                                          |
|           | Settings                                                         |
+-----------+------------------------------------------------------------------+
|           | AGENCY PROFILE CARD                                              |
|           | name                                                             |
|           | office address                                                   |
|           | contact number                                                   |
|           | timezone                                                         |
+-----------+------------------------------------------------------------------+
|           | BUSINESS HOURS CARD                                              |
|           | weekly grid                                                      |
|           | transfer eligibility summary                                     |
+-----------+------------------------------------------------------------------+
|           | VOICE SETUP CARD                                                 |
|           | assigned Vapi number                                             |
|           | assistant status badge                                           |
|           | transfer number                                                  |
|           | last provisioning check                                          |
+-----------+------------------------------------------------------------------+
|           | SAFETY AND BEHAVIOR CARD                                         |
|           | read-only policy summary                                         |
+-----------+------------------------------------------------------------------+
|           | Sticky save bar when dirty                                       |
+-----------+------------------------------------------------------------------+
```

## Mobile Layout

- stacked cards only
- sticky save bar at bottom
- business-hours grid compresses into day cards

## Key States

- clean settings
- unsaved changes
- provisioning failed
- missing transfer number

## Component Map

- SideRail
- FieldGroup
- ScheduleGrid
- StatusBadge
- StickyActionBar
- OperationalAlert
