-- KnowBody schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- users ----------
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  status text not null default 'active',
  onboarding_state text not null default 'new', -- new | in_progress | done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- profile / goals ----------
create table if not exists profiles (
  user_id uuid primary key references app_users(id) on delete cascade,
  sex text,                 -- male | female
  age int,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  activity_level text,      -- sedentary | light | moderate | active | very_active
  goal text,                -- lose | maintain | gain | recomp
  rate_kg_per_week numeric default 0.5,
  tdee numeric,
  target_kcal numeric,
  target_protein_g numeric,
  target_carb_g numeric,
  target_fat_g numeric,
  target_sodium_mg numeric default 2000,
  target_sugar_g numeric default 50,
  updated_at timestamptz not null default now()
);

-- ---------- meals ----------
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  meal_type text,           -- breakfast | lunch | dinner | snack
  eaten_at timestamptz not null default now(),
  portion_g numeric,
  kcal numeric,
  protein_g numeric,
  carb_g numeric,
  fat_g numeric,
  sodium_mg numeric,
  sugar_g numeric,
  image_url text,
  source text,              -- photo | text | label
  note text,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists meals_user_eaten_idx on meals (user_id, eaten_at);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  name text not null,
  amount_g numeric,
  kcal numeric,
  protein_g numeric,
  carb_g numeric,
  fat_g numeric,
  sodium_mg numeric,
  sugar_g numeric,
  sort_order int not null default 0
);
create index if not exists meal_items_meal_idx on meal_items (meal_id);

-- ---------- weight logs ----------
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  weight_kg numeric not null,
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- ---------- workout plans ----------
create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  week_start date,
  plan jsonb,
  created_at timestamptz not null default now()
);

-- ---------- reminders ----------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  kind text not null,       -- meal_log | workout | weigh_in
  time_local text not null, -- "HH:MM" Asia/Bangkok
  days int[] not null default '{0,1,2,3,4,5,6}',
  enabled boolean not null default true,
  last_sent_on date,
  created_at timestamptz not null default now()
);
create index if not exists reminders_due_idx on reminders (enabled, time_local);

-- ---------- chat state (onboarding steps, pending drafts) ----------
create table if not exists chat_states (
  user_id uuid primary key references app_users(id) on delete cascade,
  state text,
  context jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- RLS ----------
-- All access is via the server (service role), which bypasses RLS. We enable RLS
-- with no policies so the anon/public keys cannot read or write these tables.
alter table app_users enable row level security;
alter table profiles enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table weight_logs enable row level security;
alter table workout_plans enable row level security;
alter table reminders enable row level security;
alter table chat_states enable row level security;
