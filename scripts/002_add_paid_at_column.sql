-- Add paid_at column to subscribers table
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
