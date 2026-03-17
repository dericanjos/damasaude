CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly reports" ON public.monthly_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);