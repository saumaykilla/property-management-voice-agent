# Wireframe: Sign-in

Date: 2026-03-24

## Route

- `/sign-in`

## User Job

Get staff into the product quickly without friction or visual noise.

## Desktop Layout

```text
+--------------------------------------------------------------------------------+
| LOGO                                                            Return home    |
+-------------------------------------------+------------------------------------+
| LEFT PANEL                                | RIGHT PANEL                        |
| Property management call intake,          | Sign in                            |
| without the front-desk bottleneck.        |                                    |
|                                           | Email                              |
| Small note about agency number            | Password or magic link             |
| and live ticket dashboard                 |                                    |
|                                           | [ Sign in ]                        |
|                                           | Secondary: Send magic link         |
+-------------------------------------------+------------------------------------+
```

## Visual Notes

- left panel uses the design language, but in a muted way
- right sign-in card is elevated and compact
- no unnecessary testimonials or marketing clutter

## Mobile Layout

```text
+--------------------------------------------+
| LOGO                           Return home  |
+--------------------------------------------+
| Brand statement                             |
| Sign-in card                                |
| Email                                       |
| Password or magic link                      |
| [ Sign in ]                                 |
| Secondary action                            |
+--------------------------------------------+
```

## Key States

- default
- loading
- invalid credentials
- magic link sent

## Component Map

- TopNav
- FieldGroup
- Primary button
- Inline validation
