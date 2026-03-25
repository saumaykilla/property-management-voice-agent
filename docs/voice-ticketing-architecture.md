# Property Management Voice Ticketing Architecture

Date: 2026-03-24

## Overview

This document captures the validated design for a multi-tenant SaaS application that helps property management agencies automate maintenance ticket intake over phone calls.

Stack:
- `Next.js` for onboarding, staff dashboard, and authenticated product UI
- `Supabase` for auth, relational data, storage, vector search, and realtime updates
- `FastAPI` for Vapi-facing tool execution and business-rule orchestration
- `Vapi` for inbound phone calls, agency-specific assistants, and call transfers

## Understanding Summary

- The product is a greenfield web app for property management agencies.
- Each agency onboards by entering company information, business hours, office address, contact number, one company-wide service catalog PDF, and the residences it manages.
- Each agency receives a dedicated Vapi assistant and a dedicated Vapi phone number.
- Residents are handled with a low-friction flow: they provide address and unit number, and the assistant validates whether the agency manages that unit.
- The assistant collects caller name and callback phone number, understands the issue, consults the agency service catalog, and creates internal maintenance tickets when appropriate.
- Tickets are stored only in Supabase for v1 and shown on a realtime dashboard where staff can manage ticket workflow.
- Live transfer to the management office is allowed only when the caller asks for it or the assistant cannot resolve the request, and only during configured business hours.

## Assumptions

- v1 is a pilot intended for a small number of agencies and modest concurrent call volume.
- Security target is standard SaaS isolation, not formal compliance-heavy controls.
- There is a single staff role per agency for v1.
- Call transcripts and recordings are not stored in v1.
- Retrieval is scoped only by `agency_id`, not by property or unit metadata.
- The service catalog is agency-wide and stored as one logical knowledge base, even if it is uploaded as one or more files later.
- If transfer fails during business hours, the assistant falls back to ticketing and shares the office number verbally.

## Explicit Non-Goals

- External ticket sync with AppFolio, Buildium, Zendesk, or similar systems
- Per-property service catalogs
- Leaseholder verification or caller identity verification beyond self-reported intake
- Recording retention, transcript QA, or agent analytics beyond basic operational metadata
- Multi-role internal permissioning in v1

## Decision Log

- Chosen `Next.js + Supabase + FastAPI + Vapi` over a Supabase Edge Function backend because Python flexibility is preferred for voice orchestration.
- Chosen a shared multi-tenant platform with strict `agency_id` isolation over one deployment per agency.
- Chosen one dedicated Vapi assistant and one dedicated Vapi number per agency over a shared assistant routing model.
- Chosen low-friction caller verification over caller ID or lease validation.
- Chosen one company-wide service catalog per agency over per-property catalogs.
- Chosen internal-only ticket storage for v1 over external sync or notifications.
- Chosen no transcript or recording retention in v1.
- Chosen a richer ticket lifecycle over a minimal open/closed workflow.
- Chosen transfer only when requested or when self-service fails, never as the default path.
- Chosen explicit out-of-context handling so the assistant can safely redirect unsupported requests.

## System Architecture

### Runtime Layers

- `Next.js`
  - Agency onboarding
  - Residence import
  - Service catalog upload
  - Staff dashboard
  - Operational ticket updates
- `Supabase`
  - Auth and agency staff membership
  - Storage for uploaded service catalog files
  - Relational tenant data
  - Vector store for catalog chunks
  - Realtime subscriptions for ticket activity
- `FastAPI`
  - Vapi custom tool endpoints
  - Vapi assistant and phone-number provisioning
  - Business-hour transfer logic
  - Unit normalization and validation
  - RAG query orchestration against Supabase
- `Vapi`
  - Dedicated phone number per agency
  - Dedicated assistant per agency
  - Built-in telephony controls such as transfer and end-call

### Isolation Boundary

`agency_id` is the tenant boundary across all product and voice data. Every tenant-owned table includes `agency_id`, and every read/write path must enforce it.

## Data Model

### `agencies`

Purpose:
- top-level tenant record

Key fields:
- `id`
- `name`
- `office_address`
- `contact_number`
- `transfer_number`
- `timezone`
- `onboarding_status`
- `vapi_assistant_id`
- `vapi_phone_number_id`
- `vapi_phone_number`
- timestamps

### `agency_business_hours`

Purpose:
- transfer gating and business-hour messaging

Key fields:
- `id`
- `agency_id`
- `weekday`
- `start_time_local`
- `end_time_local`
- `is_closed`

### `agency_users`

Purpose:
- link Supabase auth users to the agency they belong to

Key fields:
- `id`
- `agency_id`
- `auth_user_id`
- timestamps

### `managed_units`

Purpose:
- authoritative list of residences and units an agency manages

Key fields:
- `id`
- `agency_id`
- `property_address_raw`
- normalized address fields
- `unit_number`
- `display_name`
- `is_active`
- timestamps

Recommended uniqueness:
- unique on normalized property address + `unit_number` within an `agency_id`

### `service_catalog_documents`

Purpose:
- uploaded agency catalog files and ingestion state

Key fields:
- `id`
- `agency_id`
- `storage_path`
- `original_filename`
- `mime_type`
- `file_hash`
- `ingestion_status`
- `ingested_at`
- timestamps

### `service_catalog_chunks`

Purpose:
- chunked and embedded service catalog content for retrieval

Key fields:
- `id`
- `agency_id`
- `document_id`
- `chunk_index`
- `text`
- `embedding`
- `metadata_json`
- timestamps

Recommended indexes:
- btree on `agency_id`
- vector index on `embedding`

### `calls`

Purpose:
- minimal operational record of inbound voice interactions

Key fields:
- `id`
- `agency_id`
- `vapi_call_id`
- `caller_phone`
- `caller_name`
- `managed_unit_id` nullable
- `call_outcome`
- `transfer_attempted`
- `transfer_completed`
- timestamps

### `tickets`

Purpose:
- core maintenance work item created by voice intake or future channels

Key fields:
- `id`
- `agency_id`
- `managed_unit_id`
- `source` with value `voice`
- `status`
- `priority`
- `category`
- `issue_summary`
- `issue_details`
- `caller_name`
- `caller_phone`
- `created_by_channel_metadata`
- timestamps

### `ticket_events`

Purpose:
- append-only audit trail for realtime UI and operational history

Key fields:
- `id`
- `agency_id`
- `ticket_id`
- `event_type`
- `event_payload`
- `actor_type`
- timestamps

## Supabase Policies And Operational Rules

- Enforce Row Level Security on every tenant-owned table.
- Dashboard users can access only rows whose `agency_id` matches their `agency_users` membership.
- FastAPI uses a service role for server-side actions and must always scope queries by `agency_id`.
- Service catalog search must never query across agencies.
- Realtime subscriptions for dashboard ticket feeds are scoped by `agency_id`.

## Onboarding Flow

1. Staff user creates an agency profile.
2. Staff user enters business hours and transfer phone.
3. Staff user uploads residences in bulk.
4. Staff user uploads the agency service catalog PDF.
5. App stores the PDF in Supabase Storage.
6. App creates a `service_catalog_documents` row in `pending` state.
7. Ingestion job parses the PDF, chunks it, embeds it, and inserts `service_catalog_chunks`.
8. FastAPI provisions a dedicated Vapi assistant.
9. FastAPI provisions or assigns a Vapi phone number to that assistant.
10. Vapi identifiers are written back to the agency record.
11. Onboarding is marked `complete`.

## Voice Intake Flow

1. Caller reaches the agency-specific Vapi number.
2. Vapi routes the call to the agency’s dedicated assistant.
3. Assistant identifies as that management company.
4. Assistant collects caller name, callback phone, address, unit number, and issue description.
5. Assistant calls `validate_managed_unit`.
6. If the unit is not found:
   - assistant retries once with clarification
   - if still unresolved, assistant politely exits or handles the request as unsupported
7. If the unit is found:
   - assistant calls `search_service_catalog`
   - assistant decides whether it can provide helpful guidance, create a ticket, or declare the request unsupported
8. If a ticket is needed:
   - assistant calls `create_ticket`
   - assistant confirms that the issue has been logged
9. If the caller asks for a human or the assistant cannot resolve the issue:
   - assistant calls `check_transfer_eligibility`
   - if transfer is allowed, assistant initiates transfer
   - if transfer is not allowed, assistant communicates office hours and falls back to ticketing

## FastAPI Tool Contract

These are the custom tools exposed to Vapi.

### `validate_managed_unit`

Purpose:
- confirm that the provided address and unit belong to the agency

Input:
- `agency_id`
- `property_address`
- `unit_number`

Output:
- `is_managed`
- `managed_unit_id` nullable
- `normalized_address`
- `clarification_needed`
- `message_for_agent`

### `search_service_catalog`

Purpose:
- retrieve relevant agency-specific catalog context for the issue

Input:
- `agency_id`
- `issue_description`
- optional `top_k`

Output:
- `matched_chunks`
- `suggested_category`
- `suggested_priority`
- `confidence`
- `message_for_agent`

Rules:
- query only rows with matching `agency_id`
- do not allow cross-agency retrieval

### `create_ticket`

Purpose:
- create a maintenance ticket and initial audit event

Input:
- `agency_id`
- `managed_unit_id`
- `caller_name`
- `caller_phone`
- `issue_summary`
- `issue_details`
- `category`
- `priority`
- `source_metadata`

Output:
- `ticket_id`
- `status`
- `confirmation_message`

### `check_transfer_eligibility`

Purpose:
- determine whether the call may be transferred right now

Input:
- `agency_id`
- optional `reason`

Output:
- `transfer_allowed`
- `transfer_number` nullable
- `message_for_agent`
- `reason_code`

### `handle_out_of_context`

Purpose:
- classify unsupported or off-domain requests and produce a safe response strategy

Input:
- `agency_id`
- `user_request`

Output:
- `classification`
- `recommended_response`
- `offer_transfer`
- `offer_ticket`

Recommended classifications:
- `leasing_or_sales`
- `billing_or_account`
- `general_office_info`
- `emergency_outside_catalog`
- `unsupported`

## Vapi Assistant Design

### Assistant Variables

Each agency-specific assistant should be provisioned with:
- agency name
- office phone number
- transfer phone number
- timezone
- business-hour summary

### Assistant Responsibilities

- answer as the property management company
- collect structured intake details
- validate the address and unit before proceeding
- use the catalog to guide issue handling
- create tickets when appropriate
- avoid hallucinating office policies, lease terms, pricing, or emergency guarantees
- transfer only when requested or when the assistant cannot resolve the request

### Tool Policy

- Use `validate_managed_unit` before catalog search or ticket creation.
- Use `search_service_catalog` only after a valid unit is identified.
- Use `create_ticket` when the issue is actionable and should be logged.
- Use `check_transfer_eligibility` only after the caller asks for a human or the assistant cannot continue.
- Use `handle_out_of_context` when the request is not a maintenance intake problem.

## Realtime Dashboard Flow

Dashboard features for v1:
- live ticket feed
- ticket detail view
- workflow updates
- mark complete

Realtime behavior:
- `tickets` and `ticket_events` drive the live UI
- new voice-created tickets appear immediately
- status updates are appended as events and reflected in the dashboard

Suggested workflow states:
- `new`
- `in_progress`
- `completed`
- `cancelled`

## Risks And Edge Cases

- Address normalization quality directly affects successful unit validation.
- Duplicate tickets may occur in v1 if the same caller reports the same issue repeatedly.
- Emergency language needs careful prompting so the assistant does not over-promise support.
- Vapi transfer failure must not break the caller experience; ticketing remains the fallback.
- Ingestion failures should not silently leave agencies with an unusable assistant; onboarding status should surface catalog readiness.

## Suggested Initial Repository Shape

```text
docs/
  voice-ticketing-architecture.md
  voice-ticketing-implementation-plan.md
apps/
  web/
services/
  voice-api/
supabase/
  migrations/
```
