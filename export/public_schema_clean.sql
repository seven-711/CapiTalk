--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: banned_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banned_users (
    user_id text NOT NULL,
    banned_at timestamp with time zone DEFAULT now()
);


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    blocker_id text NOT NULL,
    blocked_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id text DEFAULT 'anon'::text NOT NULL,
    owner_name text DEFAULT 'Anonymous Student'::text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image_url text,
    action_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    impressions_count integer DEFAULT 0 NOT NULL,
    clicks_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT broadcasts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: campus_map_pins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campus_map_pins (
    id text NOT NULL,
    author_id text,
    author_alias text DEFAULT 'Anon Student'::text,
    department text NOT NULL,
    spot_name text NOT NULL,
    message text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    color text DEFAULT '#ffc900'::text,
    likes_count integer DEFAULT 0,
    liked_by_users jsonb DEFAULT '[]'::jsonb,
    liked_by_profiles jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_one uuid NOT NULL,
    user_two uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    CONSTRAINT chat_rooms_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'ended'::character varying])::text[])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: device_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    device_id text NOT NULL,
    ip_address text,
    post_count integer DEFAULT 0,
    risk_score integer DEFAULT 0,
    is_banned boolean DEFAULT false,
    last_post_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    username text DEFAULT 'Anonymous Student'::text,
    category text NOT NULL,
    rating integer DEFAULT 5,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedback_category_check CHECK ((category = ANY (ARRAY['bug'::text, 'suggestion'::text, 'ui_ux'::text, 'general'::text]))),
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: freedom_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freedom_comments (
    id text NOT NULL,
    post_id text NOT NULL,
    author_alias text DEFAULT 'Anon Student'::text NOT NULL,
    department text DEFAULT 'General'::text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: freedom_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freedom_posts (
    id text NOT NULL,
    author_alias text DEFAULT 'Anon Student'::text,
    department text DEFAULT 'General'::text,
    message text NOT NULL,
    color text DEFAULT '#ffc900'::text,
    likes_count integer DEFAULT 0,
    liked_by_users jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    is_pinned boolean DEFAULT false,
    author_id text,
    status text DEFAULT 'approved'::text,
    song_title text,
    song_artist text,
    song_image_url text,
    song_preview_url text,
    song_link text,
    dedicated_to text,
    liked_by_profiles jsonb DEFAULT '{}'::jsonb
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text,
    image_url text,
    reply_to_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    target_user_id text NOT NULL,
    post_id text NOT NULL,
    type character varying(20) NOT NULL,
    actor_alias text NOT NULL,
    actor_department text,
    message_snippet text NOT NULL,
    comment_text text,
    admin_remark text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['like'::character varying, 'comment'::character varying, 'admin_remark'::character varying])::text[])))
);


--
-- Name: queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    filter character varying(20) DEFAULT 'anyone'::character varying,
    searching_since timestamp with time zone DEFAULT now(),
    CONSTRAINT queue_filter_check CHECK (((filter)::text = ANY ((ARRAY['anyone'::character varying, 'same'::character varying, 'different'::character varying])::text[])))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    reason character varying(50) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    admin_remark text,
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    username character varying(20) NOT NULL,
    department text NOT NULL,
    avatar_url text,
    bio character varying(80),
    status character varying(20) DEFAULT 'online'::character varying,
    is_banned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['online'::character varying, 'searching'::character varying, 'in_chat'::character varying, 'offline'::character varying])::text[])))
);


--
-- Name: banned_users banned_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_pkey PRIMARY KEY (user_id);


--
-- Name: blocks blocks_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: campus_map_pins campus_map_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campus_map_pins
    ADD CONSTRAINT campus_map_pins_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: device_sessions device_sessions_device_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_sessions
    ADD CONSTRAINT device_sessions_device_id_key UNIQUE (device_id);


--
-- Name: device_sessions device_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_sessions
    ADD CONSTRAINT device_sessions_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: freedom_comments freedom_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freedom_comments
    ADD CONSTRAINT freedom_comments_pkey PRIMARY KEY (id);


--
-- Name: freedom_posts freedom_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freedom_posts
    ADD CONSTRAINT freedom_posts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (id);


--
-- Name: queue queue_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_user_id_key UNIQUE (user_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_broadcasts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_status ON public.broadcasts USING btree (status, starts_at DESC);


--
-- Name: idx_freedom_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_freedom_comments_post_id ON public.freedom_comments USING btree (post_id, created_at);


--
-- Name: chat_rooms chat_rooms_user_one_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_user_one_fkey FOREIGN KEY (user_one) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_user_two_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_user_two_fkey FOREIGN KEY (user_two) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freedom_comments freedom_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freedom_comments
    ADD CONSTRAINT freedom_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.freedom_posts(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: queue queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: banned_users Allow public all access on banned_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public all access on banned_users" ON public.banned_users USING (true) WITH CHECK (true);


--
-- Name: reports Allow public all access on reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public all access on reports" ON public.reports USING (true) WITH CHECK (true);


--
-- Name: feedback Allow public insert to feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to feedback" ON public.feedback FOR INSERT WITH CHECK (true);


--
-- Name: freedom_comments Allow public insert to freedom_comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to freedom_comments" ON public.freedom_comments FOR INSERT WITH CHECK (true);


--
-- Name: freedom_comments Allow public read access to freedom_comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to freedom_comments" ON public.freedom_comments FOR SELECT USING (true);


--
-- Name: feedback Allow public select from feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public select from feedback" ON public.feedback FOR SELECT USING (true);


--
-- Name: banned_users Public Banned Users Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Banned Users Access" ON public.banned_users USING (true);


--
-- Name: blocks Public Blocks Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Blocks Access" ON public.blocks USING (true) WITH CHECK (true);


--
-- Name: campus_map_pins Public Campus Map Pins Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Campus Map Pins Access" ON public.campus_map_pins USING (true) WITH CHECK (true);


--
-- Name: freedom_comments Public Comments Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Comments Access" ON public.freedom_comments USING (true) WITH CHECK (true);


--
-- Name: broadcasts Public Delete Access for Broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Delete Access for Broadcasts" ON public.broadcasts FOR DELETE USING (true);


--
-- Name: device_sessions Public Device Sessions Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Device Sessions Access" ON public.device_sessions USING (true);


--
-- Name: freedom_posts Public Freedom Posts Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Freedom Posts Access" ON public.freedom_posts USING (true) WITH CHECK (true);


--
-- Name: broadcasts Public Insert Access for Broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Insert Access for Broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (true);


--
-- Name: messages Public Messages Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Messages Access" ON public.messages USING (true);


--
-- Name: notifications Public Notifications Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Notifications Access" ON public.notifications USING (true);


--
-- Name: queue Public Queue Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Queue Access" ON public.queue USING (true);


--
-- Name: broadcasts Public Read Access for Broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Read Access for Broadcasts" ON public.broadcasts FOR SELECT USING (true);


--
-- Name: reports Public Reports Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Reports Access" ON public.reports USING (true);


--
-- Name: chat_rooms Public Rooms Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Rooms Access" ON public.chat_rooms USING (true);


--
-- Name: broadcasts Public Update Access for Broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Update Access for Broadcasts" ON public.broadcasts FOR UPDATE USING (true);


--
-- Name: users Public Users Access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public Users Access" ON public.users USING (true);


--
-- Name: banned_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

--
-- Name: blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: campus_map_pins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campus_map_pins ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: device_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: freedom_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freedom_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: freedom_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freedom_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


