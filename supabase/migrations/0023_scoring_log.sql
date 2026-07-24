-- ============================================================
-- 0023 · AI Hodnotenie — kalibračný log (DEED_AI Doplnok v1.1 §4)
-- Append-only zárodok referenčnej DB — NIKDY nemazať riadky.
-- Prístup VÝHRADNE cez service role (backend /api/score, /api/score-log):
-- RLS zapnuté BEZ policies → anon/authenticated sa nedostanú k ničomu.
-- ============================================================

create table if not exists public.scoring_log (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null unique,
  ts              timestamptz not null default now(),
  user_id         text,
  config_version  text not null,
  kolo            int  not null default 1,
  verdikt         text,                    -- ok | doplnit | zamietnut | null (parseError)
  vstup           jsonb not null,          -- { opis, miesto, anonymne, dokazyMeta } — NIE base64
  surovy_vystup   jsonb,                   -- { text, json, parseRetry } — surová odpoveď Opusa
  dopocitane      jsonb,                   -- { skore, pasmo } — dopočítal backend z configu
  trvanie_ms      int,
  parse_error     boolean not null default false,
  injection_flag  boolean not null default false
);

comment on table public.scoring_log is
  'AI Hodnotenie — kalibračný log (1 riadok = 1 beh Opusa). Append-only, NEMAZAŤ. Číta/píše len service role.';

create index if not exists scoring_log_ts_idx on public.scoring_log (ts desc);

-- RLS: zapnúť bez policies = frontend (anon key) nevidí a nezapíše nič;
-- service role RLS obchádza — presne to chceme.
alter table public.scoring_log enable row level security;

-- Fotky dôkazov sa ukladajú VEDĽA logu (nie base64 v riadku):
-- privátny bucket scoring-dokazy/{run_id}/{n}.jpg — bez public prístupu,
-- bez storage policies (upload/read robí backend service rolou).
insert into storage.buckets (id, name, public)
values ('scoring-dokazy', 'scoring-dokazy', false)
on conflict (id) do nothing;
