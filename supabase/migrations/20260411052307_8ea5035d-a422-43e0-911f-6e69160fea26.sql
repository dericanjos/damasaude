
-- ═══════════════════════════════════════════════════════════════
-- SECURITY HARDENING — Fix privilege escalation + public role policies
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 1. REMOVE UPDATE POLICY ON REFERRALS (prevent reward fraud) │
-- └─────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 2. HARDEN: TO authenticated on remaining {public} tables    │
-- └─────────────────────────────────────────────────────────────┘

-- ═══ checkin_protocols ═══
DROP POLICY IF EXISTS "Users can view own checkin_protocols" ON public.checkin_protocols;
DROP POLICY IF EXISTS "Users can insert own checkin_protocols" ON public.checkin_protocols;
DROP POLICY IF EXISTS "Users can update own checkin_protocols" ON public.checkin_protocols;
DROP POLICY IF EXISTS "Users can delete own checkin_protocols" ON public.checkin_protocols;

CREATE POLICY "Users can view own checkin_protocols" ON public.checkin_protocols
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_checkins dc WHERE dc.id = checkin_protocols.checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can insert own checkin_protocols" ON public.checkin_protocols
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM daily_checkins dc WHERE dc.id = checkin_protocols.checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can update own checkin_protocols" ON public.checkin_protocols
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_checkins dc WHERE dc.id = checkin_protocols.checkin_id AND dc.user_id = auth.uid()));
CREATE POLICY "Users can delete own checkin_protocols" ON public.checkin_protocols
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM daily_checkins dc WHERE dc.id = checkin_protocols.checkin_id AND dc.user_id = auth.uid()));

-- ═══ daily_checklist_answers ═══
DROP POLICY IF EXISTS "Users can view own checklist answers" ON public.daily_checklist_answers;
DROP POLICY IF EXISTS "Users can insert own checklist answers" ON public.daily_checklist_answers;
DROP POLICY IF EXISTS "Users can update own checklist answers" ON public.daily_checklist_answers;
DROP POLICY IF EXISTS "Users can delete own checklist answers" ON public.daily_checklist_answers;

CREATE POLICY "Users can view own checklist answers" ON public.daily_checklist_answers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checklist answers" ON public.daily_checklist_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklist answers" ON public.daily_checklist_answers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checklist answers" ON public.daily_checklist_answers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ locations ═══
DROP POLICY IF EXISTS "Users can view own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;

CREATE POLICY "Users can view own locations" ON public.locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own locations" ON public.locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ location_financials ═══
DROP POLICY IF EXISTS "Users can view own location_financials" ON public.location_financials;
DROP POLICY IF EXISTS "Users can insert own location_financials" ON public.location_financials;
DROP POLICY IF EXISTS "Users can update own location_financials" ON public.location_financials;
DROP POLICY IF EXISTS "Users can delete own location_financials" ON public.location_financials;

CREATE POLICY "Users can view own location_financials" ON public.location_financials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location_financials" ON public.location_financials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location_financials" ON public.location_financials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own location_financials" ON public.location_financials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ location_schedules ═══
DROP POLICY IF EXISTS "Users can view own location_schedules" ON public.location_schedules;
DROP POLICY IF EXISTS "Users can insert own location_schedules" ON public.location_schedules;
DROP POLICY IF EXISTS "Users can update own location_schedules" ON public.location_schedules;
DROP POLICY IF EXISTS "Users can delete own location_schedules" ON public.location_schedules;

CREATE POLICY "Users can view own location_schedules" ON public.location_schedules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location_schedules" ON public.location_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location_schedules" ON public.location_schedules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own location_schedules" ON public.location_schedules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ protocols ═══
DROP POLICY IF EXISTS "Users can view own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can insert own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can update own protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can delete own protocols" ON public.protocols;

CREATE POLICY "Users can view own protocols" ON public.protocols
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own protocols" ON public.protocols
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own protocols" ON public.protocols
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own protocols" ON public.protocols
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ═══ feedback ═══
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;

CREATE POLICY "Users can insert own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid());
