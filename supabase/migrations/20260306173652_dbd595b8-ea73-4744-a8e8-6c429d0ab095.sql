
-- Add private/insurance ticket columns to clinics
ALTER TABLE public.clinics ADD COLUMN ticket_private numeric NOT NULL DEFAULT 250;
ALTER TABLE public.clinics ADD COLUMN ticket_insurance numeric NOT NULL DEFAULT 100;

-- Migrate existing data from ticket_medio
UPDATE public.clinics SET ticket_private = ticket_medio, ticket_insurance = ROUND(ticket_medio * 0.4);

-- Add private/insurance split columns to daily_checkins
ALTER TABLE public.daily_checkins ADD COLUMN attended_private integer NOT NULL DEFAULT 0;
ALTER TABLE public.daily_checkins ADD COLUMN attended_insurance integer NOT NULL DEFAULT 0;
ALTER TABLE public.daily_checkins ADD COLUMN noshows_private integer NOT NULL DEFAULT 0;
ALTER TABLE public.daily_checkins ADD COLUMN noshows_insurance integer NOT NULL DEFAULT 0;

-- Migrate existing data (assume all existing were private)
UPDATE public.daily_checkins SET attended_private = appointments_done, noshows_private = no_show;
