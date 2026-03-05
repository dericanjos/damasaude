
-- Create checklists table for the card deck system
CREATE TABLE public.checklists (
  id serial PRIMARY KEY,
  category text NOT NULL,
  task_1 text NOT NULL,
  tip_1 text NOT NULL,
  task_2 text NOT NULL,
  tip_2 text NOT NULL,
  task_3 text NOT NULL,
  tip_3 text NOT NULL,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 3)
);

-- Enable RLS on checklists (read-only for authenticated)
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read checklists" ON public.checklists FOR SELECT TO authenticated USING (true);

-- Add new fields to clinics for onboarding
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS has_secretary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS num_doctors integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'ambos',
  ADD COLUMN IF NOT EXISTS monthly_revenue_target numeric;

-- Add onboarding_completed to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Allow users to update own profile (needed for onboarding)
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
