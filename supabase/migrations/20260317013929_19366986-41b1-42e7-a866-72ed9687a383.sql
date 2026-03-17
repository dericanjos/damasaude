CREATE POLICY "Users can delete own reports" ON public.weekly_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);