ALTER TABLE public.location_financials 
ADD COLUMN ticket_private integer NOT NULL DEFAULT 250,
ADD COLUMN ticket_insurance integer NOT NULL DEFAULT 100;