
-- Tarefa 1: Create verse_views table
CREATE TABLE public.verse_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, seen_date)
);

ALTER TABLE public.verse_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verse_views" ON public.verse_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verse_views" ON public.verse_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Tarefa 2: Add badge columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS badge_lost_seen boolean NOT NULL DEFAULT false;
