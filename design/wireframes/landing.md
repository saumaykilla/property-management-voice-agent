# Wireframe: Landing

Date: 2026-03-24

## Route

- `/`

## User Job

Help a property management operator immediately understand:
- what the product does
- who it is for
- why it is different
- what they should do next

## Desktop Layout

```text
+----------------------------------------------------------------------------------+
| LOGO                         How it works            Sign in       Start setup    |
+----------------------------------------------------------------------------------+
| HERO LEFT                                              HERO RIGHT                |
| Automated maintenance calls, turned into             [ layered product           |
| validated tickets in real time.                        illustration ]            |
|                                                                              |
| Each agency gets its own number, its own assistant, and a live desk that        |
| captures resident issues without adding another phone tree.                     |
|                                                                              |
| [ Start setup ]   [ See dashboard ]                                            |
| Small trust note: Dedicated number. Agency-specific assistant. Internal-only.   |
+----------------------------------------------------------------------------------+
| THREE STEP STRIP                                                                |
| [ Upload units ]  [ Get your Vapi number ]  [ Watch tickets arrive live ]      |
+----------------------------------------------------------------------------------+
| TRUST BAND                                                                      |
| Dedicated assistant     Agency-scoped knowledge     Tenant-isolated data        |
+----------------------------------------------------------------------------------+
| PRODUCT PREVIEW                                                                  |
| [ Onboarding preview ]                [ Live dashboard preview ]                |
+----------------------------------------------------------------------------------+
| FOOTER                                                                          |
+----------------------------------------------------------------------------------+
```

## Section Notes

### Header

- compact and disciplined
- CTA button in ink blue fill
- no oversized nav

### Hero

- left side uses large editorial heading and tight copy
- right side is a composed app mock, not an illustration of a fake phone call
- include one memorable visual anchor:
  - a ticket slip appears to peel out from the right-side mock

### Three-Step Strip

- card-like sequence with subtle connector rules
- should feel procedural, like a field manual

### Product Preview

- split into two large surfaces
- left: onboarding step summary
- right: dashboard with arriving ticket rows

## Mobile Layout

```text
+----------------------------------------------+
| LOGO                               Menu/CTA  |
+----------------------------------------------+
| Headline                                     |
| Supporting copy                              |
| [Start setup] [See dashboard]                |
| Product mock                                 |
+----------------------------------------------+
| Step 1                                       |
| Step 2                                       |
| Step 3                                       |
+----------------------------------------------+
| Trust cards                                  |
+----------------------------------------------+
| Product preview stack                        |
+----------------------------------------------+
```

## Key States

- default landing state
- CTA hover state
- mobile collapsed nav state

## Component Map

- TopNav
- Hero CTA group
- Step cards
- Trust cards
- Preview panels
