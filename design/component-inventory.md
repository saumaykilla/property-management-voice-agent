# Component Inventory

Date: 2026-03-24

## Purpose

This document inventories the reusable components needed to build the v1 product without inventing unnecessary abstractions.

The rule is simple:
- a component belongs here only if it appears in multiple places or solves a clearly repeated UI problem

## Global Shell

### `TopNav`

Purpose:
- public-site navigation and app-level top utility bar

Used on:
- landing
- sign-in
- dashboard

Content variants:
- marketing mode
- app mode

### `SideRail`

Purpose:
- primary navigation for authenticated pages

Used on:
- dashboard
- units
- catalog
- settings

Items:
- dashboard
- units
- catalog
- settings

## Core Status Components

### `StatusBadge`

Purpose:
- compact visual state for tickets, ingestion, and provisioning

Variants:
- new
- in_progress
- completed
- cancelled
- pending
- failed
- healthy

Used on:
- dashboard
- catalog
- settings
- onboarding

### `ConnectionPill`

Purpose:
- show live connection or sync status

Variants:
- live
- reconnecting
- offline

Used on:
- dashboard

## Summary Components

### `MetricCard`

Purpose:
- operational summary with a strong number and short explanation

Props:
- label
- value
- delta or helper note
- optional status tint

Used on:
- dashboard
- units

### `SummaryStrip`

Purpose:
- horizontal group of metric cards

Used on:
- dashboard
- units

## Form And Wizard Components

### `StepProgress`

Purpose:
- indicate wizard progress and future steps

Used on:
- onboarding

### `FieldGroup`

Purpose:
- label, helper text, control, validation, and optional inline note

Used on:
- onboarding
- settings
- sign-in

### `StickyActionBar`

Purpose:
- fixed bottom actions for long forms or workflows

Used on:
- onboarding
- settings

### `ScheduleGrid`

Purpose:
- edit weekly working hours in one repeated structure

Columns:
- weekday
- open toggle
- start time
- end time

Used on:
- onboarding
- settings

## Upload And Ingestion Components

### `UploadDropzone`

Purpose:
- drag-and-drop upload surface with file feedback

Used on:
- onboarding
- catalog

### `UploadProgressCard`

Purpose:
- show file state, progress, and validation

Used on:
- onboarding
- catalog

### `IngestionTimeline`

Purpose:
- visualize processing stages after upload

Stages:
- uploaded
- parsing
- chunking
- embedded
- searchable

Used on:
- onboarding
- catalog

## Unit Management Components

### `ImportAuditPanel`

Purpose:
- show CSV import validity, row counts, and correction guidance

Used on:
- onboarding
- units

### `GroupedUnitList`

Purpose:
- display units grouped by property address

Used on:
- units

### `UnitEditorDrawer`

Purpose:
- edit a selected managed unit without leaving the listing context

Used on:
- units

## Ticketing Components

### `TicketRow`

Purpose:
- compact operational summary of one ticket in the live list

Content:
- status
- address
- unit
- issue summary
- caller
- priority
- created time

Used on:
- dashboard

### `TicketListGroup`

Purpose:
- group ticket rows by operational bucket

Variants:
- new now
- earlier today
- in progress

Used on:
- dashboard

### `TicketDetailPanel`

Purpose:
- inspect and act on a selected ticket without losing the queue

Sections:
- ticket header
- property info
- caller info
- issue details
- status control
- event timeline
- action buttons

Used on:
- dashboard

### `EventTimeline`

Purpose:
- show ticket history as an operational log

Used on:
- dashboard

## Catalog Components

### `CatalogHealthCard`

Purpose:
- display current catalog file, chunk count, and health

Used on:
- catalog

### `KnowledgeMatchCard`

Purpose:
- show one retrieved chunk in a readable knowledge format

Content:
- document name
- confidence or rank
- excerpt

Used on:
- catalog

### `SearchPreviewWorkbench`

Purpose:
- let staff test issue text against the agency catalog

Used on:
- catalog

## Empty And Error States

### `EmptyStateBlock`

Purpose:
- clear blank-slate explanation with one or two next actions

Used on:
- dashboard
- units
- catalog

### `OperationalAlert`

Purpose:
- visible but calm error or warning message

Variants:
- warning
- failure
- info

Used on:
- onboarding
- catalog
- settings
- dashboard

## Reuse Map By Route

### Landing

- TopNav
- MetricCard variant for trust highlights

### Sign-in

- TopNav
- FieldGroup

### Onboarding

- StepProgress
- FieldGroup
- ScheduleGrid
- UploadDropzone
- UploadProgressCard
- ImportAuditPanel
- IngestionTimeline
- StickyActionBar
- OperationalAlert

### Dashboard

- SideRail
- ConnectionPill
- SummaryStrip
- MetricCard
- TicketRow
- TicketListGroup
- TicketDetailPanel
- EventTimeline
- EmptyStateBlock
- StatusBadge

### Units

- SideRail
- SummaryStrip
- ImportAuditPanel
- GroupedUnitList
- UnitEditorDrawer
- EmptyStateBlock

### Catalog

- SideRail
- CatalogHealthCard
- UploadDropzone
- UploadProgressCard
- IngestionTimeline
- SearchPreviewWorkbench
- KnowledgeMatchCard
- EmptyStateBlock

### Settings

- SideRail
- FieldGroup
- ScheduleGrid
- StickyActionBar
- OperationalAlert
- StatusBadge
