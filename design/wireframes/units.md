# Wireframe: Units

Date: 2026-03-24

## Route

- `/units`

## User Job

Inspect, search, and correct the unit records that power caller validation.

## Desktop Layout

```text
+-----------+---------------------------------------------------------------------+
| SIDE RAIL | TOP BAR                                                             |
|           | Units                                         Import CSV  Add unit   |
+-----------+---------------------------------------------------------------------+
|           | SUMMARY STRIP                                                      |
|           | [ Total units ] [ Active properties ] [ Recent import ] [ Errors ] |
+-----------+---------------------------------------------------+-----------------+
|           | LIST AREA                                         | EDIT DRAWER     |
|           | Search                                            | Unit details    |
|           | Filter chips                                      | Address fields  |
|           |                                                   | Unit number     |
|           | Property: 42 Cedar Street                         | Display name    |
|           |   Unit 1A                                         | Active toggle   |
|           |   Unit 1B                                         | Save            |
|           |                                                   |                 |
|           | Property: 8 Hanover Place                         |                 |
|           |   Unit 4C                                         |                 |
+-----------+---------------------------------------------------+-----------------+
```

## Import State

```text
+----------------------------------------+---------------------------+
| CSV upload                             | Import audit              |
| accepted columns                       | 232 rows uploaded         |
| [dropzone]                             | 227 valid                 |
|                                        | 5 need fixes              |
+----------------------------------------+---------------------------+
```

## Mobile Layout

- summary strip becomes stacked cards
- grouped list remains grouped by property
- editor becomes a full-screen sheet

## Key States

- empty units dataset
- search with no matches
- imported rows needing correction
- successful edit save

## Component Map

- SideRail
- SummaryStrip
- GroupedUnitList
- UnitEditorDrawer
- ImportAuditPanel
- EmptyStateBlock
