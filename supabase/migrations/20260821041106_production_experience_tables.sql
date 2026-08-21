create table if not exists public.sticker_claims (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  email text,
  wants_launch_notice boolean not null default false,
  notice_status text not null default 'not_requested',
  download_token_hash text not null unique,
  claim_count integer not null default 1,
  download_count integer not null default 0,
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_downloaded_at timestamptz,
  retention_expires_at timestamptz,
  constraint sticker_claims_email_hash_format check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint sticker_claims_token_hash_format check (download_token_hash ~ '^[0-9a-f]{64}$'),
  constraint sticker_claims_email_format check (
    email is null or (
      email = lower(btrim(email)) and
      char_length(email) between 3 and 254 and
      email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint sticker_claims_notice_state check (
    (wants_launch_notice and email is not null and notice_status in ('pending_verification', 'verified')) or
    (not wants_launch_notice and email is null and notice_status = 'not_requested')
  ),
  constraint sticker_claims_nonnegative_counts check (claim_count >= 1 and download_count >= 0)
);

comment on table public.sticker_claims is
  'Privacy-minimized sticker claims. Raw email is retained only when an opening notice is requested.';
comment on column public.sticker_claims.retention_expires_at is
  'Set to the launch date plus 90 days when the launch date becomes known.';

create table if not exists public.feature_votes (
  voter_hash text primary key,
  choice text not null,
  created_at timestamptz not null default now(),
  constraint feature_votes_voter_hash_format check (voter_hash ~ '^[0-9a-f]{64}$'),
  constraint feature_votes_choice check (
    choice in (
      'quest_board',
      'artifact_trails',
      'crawler_identity',
      'loot_leveling',
      'race_class_trial',
      'trading_outpost'
    )
  )
);

comment on table public.feature_votes is
  'Anonymous one-per-browser feature votes. Stores a random-cookie hash, never an email or IP address.';

create table if not exists public.volunteer_interests (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  email text not null,
  roles text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_expires_at timestamptz not null default (now() + interval '12 months'),
  constraint volunteer_interests_email_hash_format check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint volunteer_interests_email_format check (
    email = lower(btrim(email)) and
    char_length(email) between 3 and 254 and
    email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint volunteer_interests_role_count check (cardinality(roles) between 1 and 3),
  constraint volunteer_interests_roles_allowed check (
    roles <@ array[
      'caffeinated_technomancer',
      'chromatic_bard',
      'chaos_custodian',
      'diplomatic_barbarian',
      'mischief_architect'
    ]::text[]
  )
);

comment on table public.volunteer_interests is
  'Adult volunteer-interest submissions retained for 12 months unless reviewed or deleted sooner.';

alter table public.sticker_claims enable row level security;
alter table public.sticker_claims force row level security;
alter table public.feature_votes enable row level security;
alter table public.feature_votes force row level security;
alter table public.volunteer_interests enable row level security;
alter table public.volunteer_interests force row level security;

revoke all on table public.sticker_claims from public, anon, authenticated;
revoke all on table public.feature_votes from public, anon, authenticated;
revoke all on table public.volunteer_interests from public, anon, authenticated;

grant select, insert, update, delete on table public.sticker_claims to service_role;
grant select, insert, update, delete on table public.feature_votes to service_role;
grant select, insert, update, delete on table public.volunteer_interests to service_role;

create or replace function public.claim_sticker(
  p_email_hash text,
  p_email text,
  p_wants_launch_notice boolean,
  p_download_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email_hash !~ '^[0-9a-f]{64}$' or p_download_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid claim fingerprint';
  end if;

  if p_wants_launch_notice then
    if p_email is null or p_email <> lower(btrim(p_email)) or char_length(p_email) not between 3 and 254 or
      p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Invalid email';
    end if;
  elsif p_email is not null then
    raise exception 'Email must be omitted without notice consent';
  end if;

  insert into public.sticker_claims (
    email_hash,
    email,
    wants_launch_notice,
    notice_status,
    download_token_hash
  ) values (
    p_email_hash,
    case when p_wants_launch_notice then p_email else null end,
    p_wants_launch_notice,
    case when p_wants_launch_notice then 'pending_verification' else 'not_requested' end,
    p_download_token_hash
  )
  on conflict (email_hash) do update set
    email = excluded.email,
    wants_launch_notice = excluded.wants_launch_notice,
    notice_status = excluded.notice_status,
    download_token_hash = excluded.download_token_hash,
    claim_count = public.sticker_claims.claim_count + 1,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.validate_sticker_download(p_download_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if p_download_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;

  update public.sticker_claims
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    updated_at = now()
  where download_token_hash = p_download_token_hash;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

create or replace function public.cast_feature_vote(p_voter_hash text, p_choice text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer;
begin
  if p_voter_hash !~ '^[0-9a-f]{64}$' or p_choice not in (
    'quest_board',
    'artifact_trails',
    'crawler_identity',
    'loot_leveling',
    'race_class_trial',
    'trading_outpost'
  ) then
    raise exception 'Invalid vote';
  end if;

  insert into public.feature_votes (voter_hash, choice)
  values (p_voter_hash, p_choice)
  on conflict (voter_hash) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

create or replace function public.get_feature_vote_counts()
returns table(choice text, vote_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select options.choice, count(votes.choice)::bigint as vote_count
  from unnest(array[
    'quest_board',
    'artifact_trails',
    'crawler_identity',
    'loot_leveling',
    'race_class_trial',
    'trading_outpost'
  ]::text[]) as options(choice)
  left join public.feature_votes as votes on votes.choice = options.choice
  group by options.choice;
$$;

create or replace function public.register_volunteer_interest(
  p_email_hash text,
  p_email text,
  p_roles text[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email_hash !~ '^[0-9a-f]{64}$' or
    p_email <> lower(btrim(p_email)) or
    char_length(p_email) not between 3 and 254 or
    p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
    cardinality(p_roles) not between 1 and 3 or
    not (p_roles <@ array[
      'caffeinated_technomancer',
      'chromatic_bard',
      'chaos_custodian',
      'diplomatic_barbarian',
      'mischief_architect'
    ]::text[]) or
    cardinality(p_roles) <> (select count(distinct role) from unnest(p_roles) as role)
  then
    raise exception 'Invalid volunteer interest';
  end if;

  insert into public.volunteer_interests (email_hash, email, roles)
  values (p_email_hash, p_email, p_roles)
  on conflict (email_hash) do update set
    email = excluded.email,
    roles = excluded.roles,
    updated_at = now(),
    retention_expires_at = now() + interval '12 months';

  return true;
end;
$$;

revoke all on function public.claim_sticker(text, text, boolean, text) from public;
revoke all on function public.validate_sticker_download(text) from public;
revoke all on function public.cast_feature_vote(text, text) from public;
revoke all on function public.get_feature_vote_counts() from public;
revoke all on function public.register_volunteer_interest(text, text, text[]) from public;

grant execute on function public.claim_sticker(text, text, boolean, text) to service_role;
grant execute on function public.validate_sticker_download(text) to service_role;
grant execute on function public.cast_feature_vote(text, text) to service_role;
grant execute on function public.get_feature_vote_counts() to service_role;
grant execute on function public.register_volunteer_interest(text, text, text[]) to service_role;
