
CREATE TABLE public.medical_news (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  source text NOT NULL,
  external_url text NOT NULL,
  category text NOT NULL,
  image_url text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active medical_news"
  ON public.medical_news
  FOR SELECT
  TO authenticated
  USING (is_active = true);
