-- ==========================================
-- CapiTalk — Supabase Database Setup Script
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Capitol University Departments
INSERT INTO public.departments (name) VALUES
  ('College of Computer Studies'),
  ('College of Engineering'),
  ('College of Nursing'),
  ('College of Medical Technology'),
  ('College of Business Administration'),
  ('College of Education'),
  ('College of Criminology'),
  ('College of Arts and Sciences'),
  ('Senior High School')
ON CONFLICT (name) DO NOTHING;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(20) UNIQUE NOT NULL,
  department TEXT NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(80),
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'searching', 'in_chat', 'offline')),
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matchmaking Queue
CREATE TABLE IF NOT EXISTS public.queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  filter VARCHAR(20) DEFAULT 'anyone' CHECK (filter IN ('anyone', 'same', 'different')),
  searching_since TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Chat Rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_two UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  image_url TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for demonstration & anonymous user interaction
CREATE POLICY "Public Users Access" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Queue Access" ON public.queue FOR ALL USING (true);
CREATE POLICY "Public Rooms Access" ON public.chat_rooms FOR ALL USING (true);
CREATE POLICY "Public Messages Access" ON public.messages FOR ALL USING (true);
CREATE POLICY "Public Reports Access" ON public.reports FOR ALL USING (true);
CREATE POLICY "Public Blocks Access" ON public.blocks FOR ALL USING (true);

-- Enable Supabase Realtime for Messages, Rooms, Queue, and Broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;

-- 9. Global Broadcasts Table
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

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Broadcasts Access" ON public.broadcasts FOR ALL USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
