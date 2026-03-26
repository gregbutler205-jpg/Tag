-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users primary key,
  display_name text,
  total_points integer default 0,
  streak integer default 0,
  last_daily_date date,
  created_at timestamptz default now()
);

-- Plates
create table public.plates (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  state char(2),
  rarity text default 'common',
  category text,
  ai_primary text,
  ai_alternatives jsonb,
  difficulty integer,
  submitted_by uuid references auth.users,
  has_photo boolean default false,
  validated boolean default true,
  created_at timestamptz default now()
);

-- Daily challenges
create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid references public.plates,
  date date unique not null,
  created_at timestamptz default now()
);

-- Daily submissions
create table public.daily_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.daily_challenges,
  user_id uuid references auth.users,
  guess text not null,
  points integer default 0,
  similarity float,
  submitted_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  owner_id uuid references auth.users,
  created_at timestamptz default now()
);

-- Group members
create table public.group_members (
  group_id uuid references public.groups,
  user_id uuid references auth.users,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Group challenges
create table public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups,
  plate_text text not null,
  state char(2),
  submitted_by uuid references auth.users,
  submitted_by_name text,
  closes_at timestamptz not null,
  revealed boolean default false,
  ai_result jsonb,
  created_at timestamptz default now()
);

-- Group guesses
create table public.group_guesses (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.group_challenges,
  user_id uuid references auth.users,
  guess text not null,
  submitted_at timestamptz default now(),
  speed_penalty float default 1,
  points integer default 0,
  unique(challenge_id, user_id)
);

-- State collection
create table public.state_collection (
  user_id uuid references auth.users,
  state char(2) not null,
  first_seen timestamptz default now(),
  primary key (user_id, state)
);
