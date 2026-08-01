-- ============================================================
-- FREEDOM WALL COMMENTS SCHEMA
-- Persists student comments on Freedom Wall notes across production
-- ============================================================

CREATE TABLE IF NOT EXISTS public.freedom_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.freedom_posts(id) ON DELETE CASCADE,
  author_alias TEXT NOT NULL DEFAULT 'Anon Student',
  department TEXT DEFAULT 'General',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval by post_id
CREATE INDEX IF NOT EXISTS idx_freedom_comments_post_id ON public.freedom_comments(post_id, created_at ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.freedom_comments ENABLE ROW LEVEL SECURITY;

-- Public Read and Insert RLS Policies
DROP POLICY IF EXISTS "Allow public read access to freedom_comments" ON public.freedom_comments;
CREATE POLICY "Allow public read access to freedom_comments" ON public.freedom_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to freedom_comments" ON public.freedom_comments;
CREATE POLICY "Allow public insert to freedom_comments" ON public.freedom_comments FOR INSERT WITH CHECK (true);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.freedom_comments;
