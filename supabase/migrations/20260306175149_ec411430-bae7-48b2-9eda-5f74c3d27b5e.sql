
CREATE TABLE public.daily_verses (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  verse_text text NOT NULL,
  verse_reference text NOT NULL,
  day_of_year integer NOT NULL UNIQUE CHECK (day_of_year >= 1 AND day_of_year <= 366)
);

ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily verses" ON public.daily_verses FOR SELECT USING (true);
