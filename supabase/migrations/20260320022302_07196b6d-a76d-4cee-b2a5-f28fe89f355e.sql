
-- Create protocols catalog table
CREATE TABLE public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  default_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own protocols" ON public.protocols FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own protocols" ON public.protocols FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own protocols" ON public.protocols FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own protocols" ON public.protocols FOR DELETE USING (auth.uid() = user_id);

-- Create checkin_protocols table
CREATE TABLE public.checkin_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid NOT NULL REFERENCES public.daily_checkins(id) ON DELETE CASCADE,
  protocol_id uuid REFERENCES public.protocols(id),
  name text NOT NULL,
  description text DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_protocols ENABLE ROW LEVEL SECURITY;

-- RLS via join to daily_checkins.user_id
CREATE POLICY "Users can view own checkin_protocols" ON public.checkin_protocols FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_checkins dc WHERE dc.id = checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can insert own checkin_protocols" ON public.checkin_protocols FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_checkins dc WHERE dc.id = checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can update own checkin_protocols" ON public.checkin_protocols FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.daily_checkins dc WHERE dc.id = checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can delete own checkin_protocols" ON public.checkin_protocols FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.daily_checkins dc WHERE dc.id = checkin_id AND dc.user_id = auth.uid()));

-- Add has_protocols flag to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS has_protocols boolean NOT NULL DEFAULT false;
