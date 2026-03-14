
ALTER TABLE public.daily_checkins 
  ADD COLUMN cancellations_private integer NOT NULL DEFAULT 0,
  ADD COLUMN cancellations_insurance integer NOT NULL DEFAULT 0,
  ADD COLUMN rescheduled integer NOT NULL DEFAULT 0;

-- Migrate existing data: put old cancellations into cancellations_private as default
UPDATE public.daily_checkins SET cancellations_private = cancellations WHERE cancellations > 0;
