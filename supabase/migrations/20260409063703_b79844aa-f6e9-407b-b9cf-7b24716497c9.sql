-- Add content column for full article text
ALTER TABLE public.medical_news
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Make external_url optional
ALTER TABLE public.medical_news
  ALTER COLUMN external_url DROP NOT NULL;