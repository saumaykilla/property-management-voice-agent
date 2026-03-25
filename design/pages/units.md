# Units Page

Date: 2026-03-24

## Route

- `/units`

## Purpose

Let staff review the residences and units the agency manages, correct import mistakes, and confirm that the assistant’s validation source is accurate.

## Layout

- title and description
- top utility row
- unit health summary
- searchable list
- right-side edit drawer on desktop

### Top Utility Row

- search input
- filter by active/inactive
- `Import CSV`
- `Add unit`

### Summary Blocks

- total managed units
- active properties
- recently imported
- rows needing attention

## Main Workspace

The main content is a sortable list with lightweight grouping by property address.

Each list row shows:
- property address
- unit number
- import source
- last updated
- active flag

## Detail Drawer

Open on row click.

Contains:
- normalized address fields
- unit number
- display label
- active toggle
- save action

## Visual Notes

- This page should feel administrative but not dry.
- Use grouped property headers so rows do not become a flat spreadsheet.
- Avoid trying to turn this into a full GIS or CRM page.

## Empty State

- explain that unit data powers caller validation
- give clear import and manual add actions
