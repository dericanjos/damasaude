-- Add updated_at column to daily_checkins for realtime change detection
ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create function to auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION public.update_daily_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Trigger to run the function before each UPDATE
DROP TRIGGER IF EXISTS daily_checkins_updated_at_trigger ON public.daily_checkins;
CREATE TRIGGER daily_checkins_updated_at_trigger
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_checkins_updated_at();