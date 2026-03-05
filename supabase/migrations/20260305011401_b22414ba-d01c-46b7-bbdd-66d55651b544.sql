-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Authenticated users can read checklists" ON public.checklists;

CREATE POLICY "Anyone can read checklists"
  ON public.checklists
  FOR SELECT
  TO authenticated
  USING (true);