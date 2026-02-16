
-- clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  target_fill_rate NUMERIC NOT NULL DEFAULT 0.85,
  target_noshow_rate NUMERIC NOT NULL DEFAULT 0.05,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_clinic UNIQUE (user_id)
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinics" ON public.clinics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clinic" ON public.clinics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinic" ON public.clinics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinic" ON public.clinics FOR DELETE USING (auth.uid() = user_id);

-- daily_checkins table
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  appointments_scheduled INT NOT NULL DEFAULT 0,
  appointments_done INT NOT NULL DEFAULT 0,
  no_show INT NOT NULL DEFAULT 0,
  cancellations INT NOT NULL DEFAULT 0,
  new_appointments INT NOT NULL DEFAULT 0,
  empty_slots INT NOT NULL DEFAULT 0,
  followup_done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_checkin_per_day UNIQUE (clinic_id, date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.daily_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON public.daily_checkins FOR DELETE USING (auth.uid() = user_id);

-- loss_reasons table
CREATE TABLE public.loss_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('no_show', 'cancellation', 'lost_lead')),
  reason TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loss_reasons" ON public.loss_reasons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loss_reasons" ON public.loss_reasons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loss_reasons" ON public.loss_reasons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own loss_reasons" ON public.loss_reasons FOR DELETE USING (auth.uid() = user_id);

-- daily_actions table
CREATE TABLE public.daily_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('confirmations', 'waitlist', 'reactivation', 'fix_empty_slots', 'collect_nps', 'schedule_admin_block')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  done_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions" ON public.daily_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own actions" ON public.daily_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON public.daily_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actions" ON public.daily_actions FOR DELETE USING (auth.uid() = user_id);
