-- Feedback table for user-submitted bug reports, suggestions, and content reports
CREATE TABLE IF NOT EXISTS public.feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL DEFAULT 'other',   -- 'bug' | 'suggestion' | 'content' | 'other'
  message     text NOT NULL,
  contact     text,                             -- optional email/username for follow-up
  user_id     uuid REFERENCES auth.users,       -- null if submitted anonymously
  created_at  timestamptz DEFAULT now()
);

-- Index for admin panel sorting
CREATE INDEX IF NOT EXISTS feedback_created_idx ON public.feedback (created_at DESC);

-- Enable Row Level Security (read by service role only; writes are open)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (anon or authenticated)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- Only service role (backend) can read feedback
CREATE POLICY "Service role reads feedback"
  ON public.feedback FOR SELECT
  USING (false);   -- frontend never reads directly; only via backend admin API
