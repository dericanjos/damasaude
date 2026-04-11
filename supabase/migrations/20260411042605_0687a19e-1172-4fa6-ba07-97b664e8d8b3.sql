-- ═══════════════════════════════════════════════════════════════
-- SECURITY HARDENING — correções do security scan
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 1. BLOQUEAR SELF-MODIFICATION DE CAMPOS SENSÍVEIS EM PROFILES│
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'Cannot modify subscription_status directly';
  END IF;

  IF NEW.current_period_end IS DISTINCT FROM OLD.current_period_end THEN
    RAISE EXCEPTION 'Cannot modify current_period_end directly';
  END IF;

  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_customer_id directly';
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Cannot modify tier directly';
  END IF;

  IF NEW.referral_credits IS DISTINCT FROM OLD.referral_credits THEN
    RAISE EXCEPTION 'Cannot modify referral_credits directly';
  END IF;

  IF NEW.has_efficiency_badge IS DISTINCT FROM OLD.has_efficiency_badge THEN
    RAISE EXCEPTION 'Cannot modify has_efficiency_badge directly';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify user_id';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();


-- ┌─────────────────────────────────────────────────────────────┐
-- │ 2. LIMPAR POLICIES RESIDUAIS DO BUCKET verse-images         │
-- └─────────────────────────────────────────────────────────────┘
-- O bucket não pode ser deletado via SQL (trigger protect_delete),
-- mas sem policies ele fica completamente inacessível via client.

DROP POLICY IF EXISTS "Anyone can read verse images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload verse images" ON storage.objects;
DROP POLICY IF EXISTS "Block user updates on verse-images" ON storage.objects;
DROP POLICY IF EXISTS "Block user deletes on verse-images" ON storage.objects;
DROP POLICY IF EXISTS "Block all user inserts on verse-images" ON storage.objects;


-- ┌─────────────────────────────────────────────────────────────┐
-- │ 3. HARDENING: TO authenticated em referrals e nps_responses │
-- └─────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;

CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update own referrals" ON public.referrals
  FOR UPDATE TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid())
  WITH CHECK (referrer_id = auth.uid() OR referred_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own nps" ON public.nps_responses;
DROP POLICY IF EXISTS "Users can read own nps" ON public.nps_responses;

CREATE POLICY "Users can insert own nps" ON public.nps_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own nps" ON public.nps_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());