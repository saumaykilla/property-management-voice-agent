# Property Management Voice Ticketing Implementation Plan

Date: 2026-03-24

## Goal

Build the first production-capable pilot of the property management voice ticketing platform using the validated architecture and keep the delivery sequence simple, observable, and reversible.

## Delivery Principles

- Build the tenant boundary first.
- Keep voice tools small and deterministic.
- Prefer explicit states over implicit workflow magic.
- Ship the narrowest useful pilot before adding integrations or analytics.

## Phase 0: Project Scaffolding

Outputs:
- `Next.js` application scaffold
- `FastAPI` service scaffold
- `supabase/` folder for migrations and seed helpers
- environment variable contract

Acceptance criteria:
- local web app boots
- local FastAPI app boots
- Supabase project variables are documented
- Vapi credentials and webhook base URL are documented

Recommended structure:

```text
apps/web
services/voice-api
supabase/migrations
docs
```

## Phase 1: Auth, Tenancy, And Core Schema

Scope:
- create `agencies`
- create `agency_business_hours`
- create `agency_users`
- create `managed_units`
- create `service_catalog_documents`
- create `service_catalog_chunks`
- create `calls`
- create `tickets`
- create `ticket_events`
- enable RLS on tenant-owned tables

Acceptance criteria:
- a staff user can belong to exactly one agency in v1
- a tenant-scoped dashboard query only returns that agency’s rows
- unit uniqueness is enforced within an agency
- ticket workflow states are represented in schema

## Phase 2: Onboarding Flow

Scope:
- agency profile form
- business-hours form
- managed-unit import
- service catalog upload
- onboarding state machine

Acceptance criteria:
- a new agency can complete onboarding from the UI
- uploaded residences are stored and queryable
- uploaded catalog file is stored in Supabase Storage
- onboarding clearly shows whether catalog ingestion and Vapi provisioning succeeded

## Phase 3: Service Catalog Ingestion

Scope:
- PDF parsing
- chunking strategy
- embedding generation
- insert into `service_catalog_chunks`
- ingestion failure reporting

Acceptance criteria:
- agency catalog becomes searchable after ingestion
- search is always filtered by `agency_id`
- the system can report whether a catalog is ready, pending, or failed

Implementation notes:
- keep chunk metadata minimal in v1
- store document linkage and chunk order for debugging
- do not add property-level metadata filtering

## Phase 4: FastAPI Voice Tool Layer

Scope:
- implement Vapi-facing endpoints for:
  - `validate_managed_unit`
  - `search_service_catalog`
  - `create_ticket`
  - `check_transfer_eligibility`
  - `handle_out_of_context`
- add shared request validation
- add structured logging

Acceptance criteria:
- each tool can be exercised independently outside Vapi
- every tool requires or derives the correct `agency_id`
- ticket creation writes both `tickets` and `ticket_events`
- transfer logic respects agency timezone and business hours

## Phase 5: Vapi Provisioning

Scope:
- create one reusable assistant template
- provision one dedicated assistant per agency
- provision one phone number per agency
- persist Vapi identifiers back to Supabase

Acceptance criteria:
- a completed agency has a saved `vapi_assistant_id`
- a completed agency has a saved inbound phone number
- the assistant can answer as the correct agency
- the assistant has access to the FastAPI tools

## Phase 6: Voice Intake Workflow

Scope:
- connect the assistant prompt to the custom tools
- validate unit before catalog search
- create tickets from the voice flow
- gate transfers by request and business hours

Acceptance criteria:
- a valid call can produce a ticket end-to-end
- invalid units are handled safely without ticket creation
- transfers only occur when requested or when the assistant cannot resolve the request
- after-hours calls still create tickets

## Phase 7: Dashboard And Realtime Operations

Scope:
- ticket list
- ticket detail view
- status updates
- realtime subscription for newly created tickets

Acceptance criteria:
- newly created voice tickets appear without a manual refresh
- staff can move tickets through workflow states
- ticket history is visible through `ticket_events`

## Phase 8: Out-of-Context And Safety Hardening

Scope:
- out-of-context request classifications
- fallback messaging
- emergency-safe phrasing
- transfer-failure fallback behavior

Acceptance criteria:
- unsupported questions do not trigger hallucinated answers
- the assistant can redirect or politely refuse unsupported requests
- transfer failure does not block ticket creation or call closure

## Recommended Prompt Acceptance Checklist

The Vapi assistant prompt should explicitly require:
- introduce itself as the agency
- gather caller name and callback phone number
- gather property address and unit number
- validate the unit before proceeding
- avoid inventing office policies or service promises
- create tickets when the issue is actionable
- use transfer only when requested or when the assistant cannot complete the workflow
- use out-of-context handling for unsupported requests

## Suggested Build Order For The First Working Demo

1. Core schema and RLS
2. Manual onboarding forms
3. Managed-unit validation API
4. Ticket creation API
5. Basic Vapi assistant connected to FastAPI
6. Dashboard with realtime new-ticket feed
7. Catalog ingestion and search
8. Transfer logic
9. Out-of-context handling polish

## Open Build Decisions To Finalize During Implementation

- embedding model choice
- PDF parser choice
- chunk size and overlap policy
- address normalization library or service
- whether ingestion runs inline, in a background worker, or through a scheduled task
- whether Vapi provisioning is synchronous during onboarding or queued

## Definition Of Done For v1 Pilot

- agency can onboard fully without manual database edits
- agency receives a dedicated Vapi number and assistant
- caller can report an issue for a managed unit
- assistant can create an internal maintenance ticket
- dashboard receives new tickets in realtime
- staff can manage ticket status
- transfer behavior respects request-driven and business-hour rules
