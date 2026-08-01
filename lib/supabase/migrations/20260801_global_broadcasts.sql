-- ============================================================
-- GLOBAL LIVE BROADCAST BANNER SYSTEM SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL DEFAULT 'anon',
  owner_name TEXT NOT NULL DEFAULT 'Anonymous Student',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  action_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired', 'cancelled')) DEFAULT 'pending',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  duration_minutes INT NOT NULL DEFAULT 30,
  impressions_count INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast status querying
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.broadcasts(status, starts_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to everyone
CREATE POLICY "Public Read Access for Broadcasts"
  ON public.broadcasts FOR SELECT
  USING (true);

-- Allow public insert access for creating broadcasts
CREATE POLICY "Public Insert Access for Broadcasts"
  ON public.broadcasts FOR INSERT
  WITH CHECK (true);

-- Allow public update access for impression/click tracking and queue management
CREATE POLICY "Public Update Access for Broadcasts"
  ON public.broadcasts FOR UPDATE
  USING (true);

-- Allow public delete access for administrators
CREATE POLICY "Public Delete Access for Broadcasts"
  ON public.broadcasts FOR DELETE
  USING (true);

-- Enable Supabase Realtime for broadcasts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
