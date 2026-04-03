
-- M8: Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update own referrals" ON public.referrals
  FOR UPDATE USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- M9: Upsell dismissed tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upsell_dismissed_at TIMESTAMPTZ;

-- M10: NPS responses table
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own nps" ON public.nps_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own nps" ON public.nps_responses
  FOR SELECT USING (user_id = auth.uid());

-- M10: NPS prompted flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nps_prompted BOOLEAN DEFAULT false;
