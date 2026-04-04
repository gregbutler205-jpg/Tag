-- Add mode to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'plates';

-- Group-specific state collection (separate from personal states)
CREATE TABLE IF NOT EXISTS public.group_state_collection (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state        TEXT NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id, state)
);

-- Daily group competition results
CREATE TABLE IF NOT EXISTS public.group_daily_results (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  base_score   INTEGER DEFAULT 0,
  speed_bonus  INTEGER DEFAULT 0,
  total_score  INTEGER DEFAULT 0,
  time_seconds INTEGER DEFAULT 0,
  guess        TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id, date)
);
