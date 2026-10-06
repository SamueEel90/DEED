-- ============================================================
-- Minimálne prostredie Supabase pre čistú Postgres DB v CI (Zadanie 5 · 5.2).
-- Len to, čo migrácie potrebujú zo Supabase: roly, auth.users + auth.uid/role/jwt,
-- storage.buckets/objects a publikácia realtime. pg_cron je skutočné rozšírenie (CI ho nainštaluje).
-- V ostrej Supabase to už existuje — tento súbor sa tam NIKDY nespúšťa.
-- ============================================================
-- roly platia pre celý server — vytvoriť len ak chýbajú
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create schema storage;
create schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
create publication supabase_realtime;
create extension if not exists pgcrypto with schema extensions;   -- ako v Supabase (extensions.hmac, crypt…)
-- Supabase dáva rolám API prístup ku všetkému v public (obmedzuje sa cez RLS a revoke v migráciách)
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant select on auth.users to service_role;
-- search_path ako v Supabase (rozšírenia v schéme extensions sú viditeľné bez prefixu); platí pre ďalšie spojenia
do $$ begin execute format('alter database %I set search_path = "$user", public, extensions', current_database()); end $$;
