-- Cache for the coach's written report analysis. Run after 0002.
-- Keyed by (user, range); `signature` is a hash of the underlying data so we
-- regenerate only when the user's logged intake actually changes.

create table if not exists report_cache (
  user_id uuid not null references app_users(id) on delete cascade,
  range int not null,
  signature text not null,
  analysis text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, range)
);

alter table report_cache enable row level security;
