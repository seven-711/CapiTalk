DO $do$
BEGIN
  -- Enable Realtime for key tables
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.freedom_posts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.freedom_comments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loudspeaker_bookings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.banned_users;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $do$;

-- Ensure storage bucket 'freedom_media' exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('freedom_media', 'freedom_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public storage access policies
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access freedom_media') THEN
    CREATE POLICY "Public Access freedom_media" ON storage.objects FOR SELECT USING (bucket_id = 'freedom_media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Upload freedom_media') THEN
    CREATE POLICY "Public Upload freedom_media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'freedom_media');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $do$;