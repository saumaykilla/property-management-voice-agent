# Onboarding

Date: 2026-03-24

## Route

- `/onboarding`

## Why A Single Wizard

The onboarding flow has a real sequential dependency:
- agency info
- hours and transfer details
- units
- service catalog
- provisioning

This justifies a wizard.

Separate disconnected pages would add navigation overhead without solving a real problem.

## Step Map

1. Agency profile
2. Business hours and transfer setup
3. Managed units import
4. Service catalog upload
5. Review and provisioning

## Overall Layout

- top progress bar with step labels
- main content card
- contextual right rail on desktop
- sticky footer with `Back` and `Continue`

### Desktop Wireframe

```text
+---------------------------------------------------------------+
| Step 1 of 5   Agency profile   Hours   Units   Catalog   Go  |
+-----------------------------------+---------------------------+
| Main form area                    | Right rail               |
|                                   | Why we need this         |
| inputs                            | What happens next        |
| helper text                       | Validation reminders     |
|                                   |                          |
+-----------------------------------+---------------------------+
| Back                                              Continue   |
+---------------------------------------------------------------+
```

## Step 1: Agency Profile

Fields:
- agency name
- office address
- contact number
- timezone

Design notes:
- keep the form narrow and readable
- show a live preview card: `How callers will hear your agency name`

## Step 2: Business Hours And Transfer Setup

Fields:
- weekday schedule editor
- closed/open toggle per day
- transfer phone number

Design notes:
- use a schedule grid, not seven unrelated forms
- include a small policy summary:
  - tickets can still be created after hours
  - transfer happens only during business hours

## Step 3: Managed Units Import

Fields and modules:
- CSV upload
- manual add button
- preview table
- import validation panel

Design notes:
- import errors must be grouped and readable
- display accepted columns clearly
- show count badges:
  - rows uploaded
  - valid units
  - rows needing fixes

## Step 4: Service Catalog Upload

Modules:
- PDF upload dropzone
- upload progress
- ingestion status
- explanation of how the assistant uses the catalog

Design notes:
- show this as knowledge-base preparation, not a generic file upload
- success state should explicitly say the catalog becomes searchable by the assistant

## Step 5: Review And Provisioning

Modules:
- summary of agency profile
- business-hour summary
- units imported count
- catalog status
- Vapi setup status

States:
- ready to provision
- provisioning in progress
- provisioning complete
- provisioning failed with retry option

Design notes:
- the final step should feel ceremonial and clear
- once complete, show the assigned phone number prominently

## Mobile Behavior

- right rail content moves below the main form
- sticky action bar remains visible
- import preview becomes stacked cards instead of wide tables
