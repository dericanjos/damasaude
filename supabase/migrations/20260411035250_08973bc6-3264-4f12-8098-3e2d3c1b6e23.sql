-- Hardening: restringir policies ao role authenticated (defesa em profundidade)

-- ═══ clinics ═══
DROP POLICY IF EXISTS "Users can view own clinics" ON public.clinics;
DROP POLICY IF EXISTS "Users can insert own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can update own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users can delete own clinic" ON public.clinics;

CREATE POLICY "Users can view own clinics" ON public.clinics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clinic" ON public.clinics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinic" ON public.clinics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinic" ON public.clinics
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ daily_checkins ═══
DROP POLICY IF EXISTS "Users can view own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can insert own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can update own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can delete own checkins" ON public.daily_checkins;

CREATE POLICY "Users can view own checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON public.daily_checkins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ loss_reasons ═══
DROP POLICY IF EXISTS "Users can view own loss_reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Users can insert own loss_reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Users can update own loss_reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Users can delete own loss_reasons" ON public.loss_reasons;

CREATE POLICY "Users can view own loss_reasons" ON public.loss_reasons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loss_reasons" ON public.loss_reasons
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loss_reasons" ON public.loss_reasons
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own loss_reasons" ON public.loss_reasons
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ daily_actions ═══
DROP POLICY IF EXISTS "Users can view own actions" ON public.daily_actions;
DROP POLICY IF EXISTS "Users can insert own actions" ON public.daily_actions;
DROP POLICY IF EXISTS "Users can update own actions" ON public.daily_actions;
DROP POLICY IF EXISTS "Users can delete own actions" ON public.daily_actions;

CREATE POLICY "Users can view own actions" ON public.daily_actions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own actions" ON public.daily_actions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON public.daily_actions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own actions" ON public.daily_actions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);