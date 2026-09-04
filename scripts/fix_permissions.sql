-- 1. Grant usage and create on schema public to Supabase client roles
GRANT USAGE, CREATE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant permissions on all existing tables, sequences, and functions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Ensure future tables created also have permissions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 4. Enable RLS and verify policies
ALTER TABLE IF EXISTS public.freedom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.freedom_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loudspeaker_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.midterm_reactions ENABLE ROW LEVEL SECURITY;