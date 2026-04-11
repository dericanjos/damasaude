
-- 1. Trigger que bloqueia modificação de campos sensíveis em referrals
CREATE OR REPLACE FUNCTION public.protect_referral_sensitive_fields()
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

  IF NEW.referrer_id IS DISTINCT FROM OLD.referrer_id THEN
    RAISE EXCEPTION 'Cannot modify referrer_id';
  END IF;

  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'Cannot modify code';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;

  IF NEW.reward_granted IS DISTINCT FROM OLD.reward_granted THEN
    RAISE EXCEPTION 'Cannot modify reward_granted directly';
  END IF;

  IF NEW.reward_granted_at IS DISTINCT FROM OLD.reward_granted_at THEN
    RAISE EXCEPTION 'Cannot modify reward_granted_at directly';
  END IF;

  IF NEW.referred_subscription_status IS DISTINCT FROM OLD.referred_subscription_status THEN
    RAISE EXCEPTION 'Cannot modify referred_subscription_status directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_protect_referral_sensitive_fields ON public.referrals;
CREATE TRIGGER trg_a_protect_referral_sensitive_fields
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_referral_sensitive_fields();

-- 2. Restaurar policy UPDATE com restrição
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;

CREATE POLICY "Users can claim own referral"
  ON public.referrals
  FOR UPDATE
  TO authenticated
  USING (
    referred_id IS NULL
    AND status = 'pending'
  )
  WITH CHECK (
    referred_id = auth.uid()
    AND status = 'completed'
  );
