
-- Add daily_capacity to clinics table
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS daily_capacity integer NOT NULL DEFAULT 16;

-- Add insight_text to daily_checkins table
ALTER TABLE public.daily_checkins
ADD COLUMN IF NOT EXISTS insight_text text NULL;
