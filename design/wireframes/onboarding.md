# Wireframe: Onboarding

Date: 2026-03-24

## Route

- `/onboarding`

## User Job

Set up an agency with enough clarity and feedback that staff feel confident the assistant will answer correctly once provisioning is complete.

## Desktop Shell

```text
+--------------------------------------------------------------------------------------+
| Step 1 of 5    Agency profile   Hours   Units   Catalog   Review                     |
+----------------------------------------------+---------------------------------------+
| MAIN STEP AREA                               | CONTEXT RAIL                          |
|                                              | Why this matters                      |
| step title                                   | What the assistant will use           |
| helper copy                                  | What happens next                     |
| fields or upload modules                     | validation reminders                  |
|                                              |                                       |
+----------------------------------------------+---------------------------------------+
| Back                                                     Save draft     Continue     |
+--------------------------------------------------------------------------------------+
```

## Step 1: Agency Profile

```text
+-----------------------------------------------------------+
| Agency profile                                            |
| Name                                                      |
| Office address                                            |
| Contact number                                            |
| Timezone                                                  |
|                                                           |
| Preview: "Thanks for calling [Agency Name]..."            |
+-----------------------------------------------------------+
```

## Step 2: Business Hours And Transfer

```text
+------------------------------------------------------------------+
| Business hours                                                   |
| Mon  [open]  09:00  17:00                                        |
| Tue  [open]  09:00  17:00                                        |
| ...                                                              |
|                                                                  |
| Transfer number                                                  |
| Policy note: tickets anytime, transfers only during open hours   |
+------------------------------------------------------------------+
```

## Step 3: Managed Units Import

```text
+----------------------------------------+-------------------------+
| Upload CSV                             | Import audit            |
| [ dropzone ]                           | Rows uploaded           |
| Manual add                             | Valid rows              |
| Accepted columns                       | Needs attention         |
+----------------------------------------+-------------------------+
| Preview table or grouped rows                                    |
+------------------------------------------------------------------+
```

## Step 4: Service Catalog Upload

```text
+----------------------------------------+-------------------------+
| Upload service catalog PDF             | Knowledge prep          |
| [ dropzone ]                           | uploaded                |
| file info                              | parsing                 |
| replace action                         | chunking                |
|                                        | searchable              |
+----------------------------------------+-------------------------+
| How the assistant uses this catalog                              |
+------------------------------------------------------------------+
```

## Step 5: Review And Provisioning

```text
+------------------------------------------------------------------+
| Review setup                                                     |
| Agency summary                                                   |
| Hours summary                                                    |
| Units imported                                                   |
| Catalog ready                                                    |
|                                                                  |
| Provisioning status                                              |
| [ Create assistant and assign number ]                           |
+------------------------------------------------------------------+
| Success panel: Your number is +1 (xxx) xxx-xxxx                  |
+------------------------------------------------------------------+
```

## Mobile Layout

- progress converts to a compact horizontal progress rail
- context rail moves below the main step area
- action bar stays pinned at bottom
- preview table becomes stacked cards

## Key States

- unsaved edits
- CSV import errors
- PDF ingestion in progress
- provisioning success
- provisioning failed with retry

## Component Map

- StepProgress
- FieldGroup
- ScheduleGrid
- UploadDropzone
- UploadProgressCard
- ImportAuditPanel
- IngestionTimeline
- StickyActionBar
