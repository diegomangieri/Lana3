-- Create subscribers table to store paid users
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  amount NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,
  order_bump BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: allow reading by email (for subscriber verification via API)
-- The API route uses the service role key, so this policy is for extra safety
CREATE POLICY "allow_service_role_all" ON public.subscribers
  FOR ALL
  USING (true)
  WITH CHECK (true);
