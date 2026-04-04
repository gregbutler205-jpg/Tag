-- Daily plate pool (replaces hardcoded SEED_PLATES array)
CREATE TABLE IF NOT EXISTS public.daily_pool (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_text         TEXT NOT NULL UNIQUE,
  state              TEXT,
  meaning            TEXT NOT NULL,
  alternatives       TEXT[],
  category           TEXT,
  difficulty         TEXT DEFAULT 'medium',
  rarity             TEXT DEFAULT 'common',
  is_family_friendly BOOLEAN DEFAULT true,
  source             TEXT DEFAULT 'seed',
  status             TEXT DEFAULT 'approved',
  submitted_by       UUID REFERENCES users(id),
  pending_since      TIMESTAMPTZ,
  goes_live_at       TIMESTAMPTZ,
  times_shown        INTEGER DEFAULT 0,
  last_shown_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_pool_status_idx ON public.daily_pool(status);
CREATE INDEX IF NOT EXISTS daily_pool_shown_idx  ON public.daily_pool(times_shown, last_shown_at);
