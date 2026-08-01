-- ============================================================
-- ADMIN DATABASE SETUP MIGRATION
-- Enables permanent cross-device persistence for Reports and Banned Users
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT,
  reporter_username TEXT,
  reported_user_id TEXT NOT NULL,
  reported_username TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banned_users (
  user_id TEXT PRIMARY KEY,
  banned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access
DROP POLICY IF EXISTS "Allow public all access on reports" ON public.reports;
CREATE POLICY "Allow public all access on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on banned_users" ON public.banned_users;
CREATE POLICY "Allow public all access on banned_users" ON public.banned_users FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for instant cross-device updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banned_users;
