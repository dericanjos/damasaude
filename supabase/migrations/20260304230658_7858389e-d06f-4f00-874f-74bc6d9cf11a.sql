
-- Table for daily checklist answers
CREATE TABLE public.daily_checklist_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1=Monday...5=Friday
  answers JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{question: string, answered: boolean}]
  completed BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, date)
);

ALTER TABLE public.daily_checklist_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist answers"
  ON public.daily_checklist_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist answers"
  ON public.daily_checklist_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist answers"
  ON public.daily_checklist_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist answers"
  ON public.daily_checklist_answers FOR DELETE
  USING (auth.uid() = user_id);
