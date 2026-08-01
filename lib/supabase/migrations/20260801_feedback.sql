-- Create public.feedback table for student bug reports and feature suggestions
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    username TEXT DEFAULT 'Anonymous Student',
    category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'ui_ux', 'general')),
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public insert to feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select from feedback" 
ON public.feedback 
FOR SELECT 
USING (true);
