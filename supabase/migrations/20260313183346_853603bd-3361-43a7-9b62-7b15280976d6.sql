
-- 1) Create locations table
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations" ON public.locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own locations" ON public.locations FOR DELETE USING (auth.uid() = user_id);

-- 2) Create location_schedules table
CREATE TABLE public.location_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '18:00',
  daily_capacity int NOT NULL DEFAULT 16,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (location_id, weekday)
);

ALTER TABLE public.location_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location_schedules" ON public.location_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location_schedules" ON public.location_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location_schedules" ON public.location_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own location_schedules" ON public.location_schedules FOR DELETE USING (auth.uid() = user_id);

-- 3) Create location_financials table
CREATE TABLE public.location_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE UNIQUE,
  ticket_avg int NOT NULL DEFAULT 250,
  notes text
);

ALTER TABLE public.location_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location_financials" ON public.location_financials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location_financials" ON public.location_financials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location_financials" ON public.location_financials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own location_financials" ON public.location_financials FOR DELETE USING (auth.uid() = user_id);

-- 4) Add location_id to daily_checkins (nullable first)
ALTER TABLE public.daily_checkins ADD COLUMN location_id uuid REFERENCES public.locations(id);

-- 5) Add location_id to daily_actions (nullable first)
ALTER TABLE public.daily_actions ADD COLUMN location_id uuid REFERENCES public.locations(id);

-- 6) Create default "Principal" location for every existing user with a clinic
INSERT INTO public.locations (user_id, clinic_id, name, address, timezone)
SELECT c.user_id, c.id, c.name, '', c.timezone
FROM public.clinics c;

-- 7) Migrate existing checkins to their default location
UPDATE public.daily_checkins dc
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = dc.clinic_id
  LIMIT 1
)
WHERE dc.location_id IS NULL;

-- 8) Migrate existing actions to their default location
UPDATE public.daily_actions da
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.clinic_id = da.clinic_id
  LIMIT 1
)
WHERE da.location_id IS NULL;

-- 9) Create default schedules for existing locations based on clinic working_days
-- We do this via a function to parse the jsonb working_days
DO $$
DECLARE
  loc RECORD;
  clinic_row RECORD;
  day_map CONSTANT text[] := ARRAY['dom','seg','ter','qua','qui','sex','sab'];
  i int;
  day_key text;
  cap int;
BEGIN
  FOR loc IN SELECT l.id, l.user_id, l.clinic_id FROM public.locations l LOOP
    SELECT * INTO clinic_row FROM public.clinics WHERE id = loc.clinic_id;
    IF clinic_row IS NULL THEN CONTINUE; END IF;
    
    FOR i IN 0..6 LOOP
      day_key := day_map[i+1];
      -- Check if this day is in working_days
      IF clinic_row.working_days ? day_key OR 
         (clinic_row.working_days IS NOT NULL AND clinic_row.working_days @> to_jsonb(day_key)) THEN
        -- Get capacity from daily_capacities
        cap := COALESCE((clinic_row.daily_capacities ->> day_key)::int, clinic_row.daily_capacity);
        IF cap > 0 THEN
          INSERT INTO public.location_schedules (user_id, location_id, weekday, daily_capacity, start_time, end_time)
          VALUES (loc.user_id, loc.id, i, cap, '08:00', '18:00')
          ON CONFLICT (location_id, weekday) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 10) Create financials for existing locations
INSERT INTO public.location_financials (user_id, location_id, ticket_avg)
SELECT l.user_id, l.id, COALESCE(
  (SELECT CASE WHEN c.ticket_private > 0 AND c.ticket_insurance > 0 
    THEN ((c.ticket_private + c.ticket_insurance) / 2)::int
    ELSE GREATEST(c.ticket_private, c.ticket_insurance)::int END
   FROM public.clinics c WHERE c.id = l.clinic_id), 250
)
FROM public.locations l
ON CONFLICT (location_id) DO NOTHING;

-- 11) Drop old unique constraint on daily_checkins (clinic_id, date) and add new one with location_id
-- First find and drop the existing constraint
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.daily_checkins'::regclass
    AND contype = 'u'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_checkins DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Add new unique constraint allowing multiple checkins per day for different locations
ALTER TABLE public.daily_checkins ADD CONSTRAINT daily_checkins_clinic_date_location_unique 
  UNIQUE (clinic_id, date, location_id);
