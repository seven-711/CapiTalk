-- Migration: Create loudspeaker_bookings table for persistent PA broadcast scheduling
-- Timestamp: 2026-08-28

CREATE TABLE IF NOT EXISTS public.loudspeaker_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  author_alias TEXT NOT NULL,
  department TEXT NOT NULL,
  message TEXT NOT NULL,
  theme_color TEXT NOT NULL DEFAULT '#701a31',
  song_title TEXT,
  song_artist TEXT,
  scheduled_at TEXT NOT NULL,
  slot_label TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'live' | 'completed' | 'cancelled'
  reaction_counts JSONB NOT NULL DEFAULT '{"fire": 0, "heart": 0, "clap": 0, "horn": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries by scheduled time & status
CREATE INDEX IF NOT EXISTS idx_loudspeaker_bookings_scheduled_at ON public.loudspeaker_bookings (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_loudspeaker_bookings_status ON public.loudspeaker_bookings (status);
CREATE INDEX IF NOT EXISTS idx_loudspeaker_bookings_created_at ON public.loudspeaker_bookings (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.loudspeaker_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all bookings
CREATE POLICY "Allow public read on loudspeaker_bookings"
  ON public.loudspeaker_bookings
  FOR SELECT
  USING (true);

-- Allow authenticated and anonymous users to insert bookings
CREATE POLICY "Allow public insert on loudspeaker_bookings"
  ON public.loudspeaker_bookings
  FOR INSERT
  WITH CHECK (true);

-- Allow updating bookings (status, reactions)
CREATE POLICY "Allow public update on loudspeaker_bookings"
  ON public.loudspeaker_bookings
  FOR UPDATE
  USING (true);

-- Enable Realtime Replication for instant cross-device broadcast
ALTER TABLE public.loudspeaker_bookings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'loudspeaker_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loudspeaker_bookings;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

