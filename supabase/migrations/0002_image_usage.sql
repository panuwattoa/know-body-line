-- Daily image-analysis quota (cost guard). Run after 0001_init.sql.

create table if not exists image_usage (
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table image_usage enable row level security;

-- Atomic per-user/day increment; returns the new count.
create or replace function increment_image_usage(p_user uuid, p_day date)
returns int
language plpgsql
as $$
declare
  new_count int;
begin
  insert into image_usage (user_id, day, count)
  values (p_user, p_day, 1)
  on conflict (user_id, day)
  do update set count = image_usage.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;
