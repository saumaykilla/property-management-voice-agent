set check_function_bodies = off;
set search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create type public.onboarding_status as enum (
  'draft',
  'catalog_processing',
  'provisioning',
  'ready',
  'failed'
);

create type public.catalog_ingestion_status as enum (
  'pending',
  'processing',
  'ready',
  'failed'
);

create type public.ticket_status as enum (
  'new',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.ticket_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.call_outcome as enum (
  'ticket_created',
  'guidance_only',
  'transferred',
  'out_of_context',
  'invalid_unit',
  'failed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  office_address text not null,
  contact_number text not null,
  transfer_number text,
  timezone text not null,
  onboarding_status public.onboarding_status not null default 'draft',
  vapi_assistant_id text,
  vapi_phone_number_id text,
  vapi_phone_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agency_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (auth_user_id)
);

create table public.agency_business_hours (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time_local time,
  end_time_local time,
  is_closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agency_id, weekday)
);

create table public.managed_units (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  property_address_line_1 text not null,
  property_address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  unit_number text not null,
  display_address text not null,
  normalized_property_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agency_id, normalized_property_key, unit_number)
);

create table public.service_catalog_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  storage_bucket text not null default 'service-catalogs',
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  byte_size bigint,
  file_hash text,
  ingestion_status public.catalog_ingestion_status not null default 'pending',
  ingestion_error text,
  ingested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.service_catalog_chunks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  document_id uuid not null references public.service_catalog_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768) not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (document_id, chunk_index)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  vapi_call_id text not null unique,
  caller_phone text,
  caller_name text,
  managed_unit_id uuid references public.managed_units(id) on delete set null,
  call_outcome public.call_outcome not null,
  transfer_attempted boolean not null default false,
  transfer_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  managed_unit_id uuid not null references public.managed_units(id) on delete restrict,
  source text not null default 'voice' check (source = 'voice'),
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'medium',
  category text,
  issue_summary text not null,
  issue_details text not null,
  caller_name text not null,
  caller_phone text not null,
  created_by_channel_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  actor_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index managed_units_agency_id_idx on public.managed_units (agency_id);
create index service_catalog_documents_agency_id_idx on public.service_catalog_documents (agency_id);
create index service_catalog_chunks_agency_id_idx on public.service_catalog_chunks (agency_id);
create index calls_agency_id_idx on public.calls (agency_id);
create index tickets_agency_id_idx on public.tickets (agency_id);
create index ticket_events_agency_id_idx on public.ticket_events (agency_id);
create index ticket_events_ticket_id_idx on public.ticket_events (ticket_id);
create index service_catalog_chunks_embedding_idx
  on public.service_catalog_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function public.current_agency_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select agency_id
  from public.agency_users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.bootstrap_agency(
  p_auth_user_id uuid,
  p_name text,
  p_office_address text,
  p_contact_number text,
  p_transfer_number text default null,
  p_timezone text default 'America/New_York'
)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_agency_id uuid;
  new_agency public.agencies;
begin
  select agency_id
  into existing_agency_id
  from public.agency_users
  where auth_user_id = p_auth_user_id
  limit 1;

  if existing_agency_id is not null then
    raise exception 'auth user is already linked to an agency';
  end if;

  insert into public.agencies (
    name,
    office_address,
    contact_number,
    transfer_number,
    timezone,
    onboarding_status
  )
  values (
    p_name,
    p_office_address,
    p_contact_number,
    p_transfer_number,
    p_timezone,
    'draft'
  )
  returning * into new_agency;

  insert into public.agency_users (agency_id, auth_user_id)
  values (new_agency.id, p_auth_user_id);

  return new_agency;
end;
$$;

create or replace function public.agency_is_open(
  filter_agency_id uuid,
  at_ts timestamptz
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  local_timestamp timestamp;
  local_weekday smallint;
  local_time time;
begin
  select at_ts at time zone a.timezone
  into local_timestamp
  from public.agencies as a
  where a.id = filter_agency_id;

  if local_timestamp is null then
    return false;
  end if;

  local_weekday := extract(dow from local_timestamp);
  local_time := local_timestamp::time;

  return exists (
    select 1
    from public.agency_business_hours as hours
    where hours.agency_id = filter_agency_id
      and hours.weekday = local_weekday
      and hours.is_closed = false
      and hours.start_time_local is not null
      and hours.end_time_local is not null
      and local_time >= hours.start_time_local
      and local_time < hours.end_time_local
  );
end;
$$;

create or replace function public.match_service_catalog_chunks(
  filter_agency_id uuid,
  query_embedding vector(768),
  match_count integer default 5
)
returns table (
  id uuid,
  agency_id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  metadata_json jsonb,
  similarity real
)
language sql
stable
set search_path = public
as $$
  select
    chunk.id,
    chunk.agency_id,
    chunk.document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.metadata_json,
    (1 - (chunk.embedding <=> query_embedding))::real as similarity
  from public.service_catalog_chunks as chunk
  where chunk.agency_id = filter_agency_id
  order by chunk.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create trigger agencies_set_updated_at
before update on public.agencies
for each row
execute function public.set_updated_at();

create trigger agency_users_set_updated_at
before update on public.agency_users
for each row
execute function public.set_updated_at();

create trigger agency_business_hours_set_updated_at
before update on public.agency_business_hours
for each row
execute function public.set_updated_at();

create trigger managed_units_set_updated_at
before update on public.managed_units
for each row
execute function public.set_updated_at();

create trigger service_catalog_documents_set_updated_at
before update on public.service_catalog_documents
for each row
execute function public.set_updated_at();

create trigger service_catalog_chunks_set_updated_at
before update on public.service_catalog_chunks
for each row
execute function public.set_updated_at();

create trigger calls_set_updated_at
before update on public.calls
for each row
execute function public.set_updated_at();

create trigger tickets_set_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();

create trigger ticket_events_set_updated_at
before update on public.ticket_events
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-catalogs',
  'service-catalogs',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

grant usage on schema public to authenticated;
grant usage on schema public to anon;

grant execute on function public.current_agency_id() to authenticated;
grant execute on function public.agency_is_open(uuid, timestamptz) to authenticated;
grant execute on function public.match_service_catalog_chunks(uuid, vector(768), integer) to authenticated;
grant execute on function public.bootstrap_agency(uuid, text, text, text, text, text) to authenticated;

grant select, update on public.agencies to authenticated;
grant select on public.agency_users to authenticated;
grant select, insert, update, delete on public.agency_business_hours to authenticated;
grant select, insert, update, delete on public.managed_units to authenticated;
grant select, insert, update, delete on public.service_catalog_documents to authenticated;
grant select on public.ticket_events to authenticated;
grant select on public.tickets to authenticated;
grant update (status) on public.tickets to authenticated;

grant select, insert, update, delete on storage.objects to authenticated;

alter table public.agencies enable row level security;
alter table public.agency_users enable row level security;
alter table public.agency_business_hours enable row level security;
alter table public.managed_units enable row level security;
alter table public.service_catalog_documents enable row level security;
alter table public.service_catalog_chunks enable row level security;
alter table public.calls enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;

create policy "agencies_select_own"
on public.agencies
for select
to authenticated
using (id = public.current_agency_id());

create policy "agencies_update_own"
on public.agencies
for update
to authenticated
using (id = public.current_agency_id())
with check (id = public.current_agency_id());

create policy "agency_users_select_self"
on public.agency_users
for select
to authenticated
using (auth_user_id = auth.uid());

create policy "agency_business_hours_manage_own"
on public.agency_business_hours
for all
to authenticated
using (agency_id = public.current_agency_id())
with check (agency_id = public.current_agency_id());

create policy "managed_units_manage_own"
on public.managed_units
for all
to authenticated
using (agency_id = public.current_agency_id())
with check (agency_id = public.current_agency_id());

create policy "service_catalog_documents_manage_own"
on public.service_catalog_documents
for all
to authenticated
using (agency_id = public.current_agency_id())
with check (agency_id = public.current_agency_id());

create policy "tickets_select_own"
on public.tickets
for select
to authenticated
using (agency_id = public.current_agency_id());

create policy "tickets_update_status_own"
on public.tickets
for update
to authenticated
using (agency_id = public.current_agency_id())
with check (agency_id = public.current_agency_id());

create policy "ticket_events_select_own"
on public.ticket_events
for select
to authenticated
using (agency_id = public.current_agency_id());

create policy "service_catalog_objects_access_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-catalogs'
  and ((storage.foldername(name))[1])::uuid = public.current_agency_id()
);

create policy "service_catalog_objects_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-catalogs'
  and ((storage.foldername(name))[1])::uuid = public.current_agency_id()
);

create policy "service_catalog_objects_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-catalogs'
  and ((storage.foldername(name))[1])::uuid = public.current_agency_id()
)
with check (
  bucket_id = 'service-catalogs'
  and ((storage.foldername(name))[1])::uuid = public.current_agency_id()
);

create policy "service_catalog_objects_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-catalogs'
  and ((storage.foldername(name))[1])::uuid = public.current_agency_id()
);

