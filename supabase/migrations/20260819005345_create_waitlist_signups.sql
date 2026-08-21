-- New objects in public are private by default. Any future Data API surface must be granted
-- deliberately after RLS and its policies have been reviewed.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  feature_votes text[] not null default '{}',
  consent_scope text not null default 'launch_notice',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_signups_email_unique unique (email),
  constraint waitlist_signups_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  constraint waitlist_signups_feature_count check (
    cardinality(feature_votes) between 0 and 3
  ),
  constraint waitlist_signups_feature_values check (
    feature_votes <@ array[
      'real_world_quests',
      'magnet_journeys',
      'crawler_identities',
      'achievements_leveling',
      'race_class_quiz',
      'event_challenges'
    ]::text[]
  ),
  constraint waitlist_signups_consent_scope check (
    consent_scope = 'launch_notice'
  )
);

comment on table public.waitlist_signups is
  'Launch-notice signups and optional MVP feature preferences.';

alter table public.waitlist_signups enable row level security;
alter table public.waitlist_signups force row level security;

revoke all on table public.waitlist_signups from public, anon, authenticated;
grant select, insert, update on table public.waitlist_signups to service_role;
