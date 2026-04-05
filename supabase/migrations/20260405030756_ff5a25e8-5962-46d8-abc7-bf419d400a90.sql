
-- Add new referral tracking columns to referrals table
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_user_id uuid;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_subscription_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_granted boolean NOT NULL DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_granted_at timestamptz;

-- Add referral credits to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_credits integer NOT NULL DEFAULT 0;

-- Create trigger function to grant referral credit when referred user pays
CREATE OR REPLACE FUNCTION public.grant_referral_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When referred_subscription_status changes to 'paid' and reward not yet granted
  IF NEW.referred_subscription_status = 'paid' AND OLD.referred_subscription_status <> 'paid' AND NEW.reward_granted = false THEN
    -- Mark reward as granted
    NEW.reward_granted := true;
    NEW.reward_granted_at := now();
    -- Increment referral_credits for the referrer
    UPDATE public.profiles
    SET referral_credits = referral_credits + 1
    WHERE user_id = NEW.referrer_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on referrals table
DROP TRIGGER IF EXISTS trg_grant_referral_credit ON public.referrals;
CREATE TRIGGER trg_grant_referral_credit
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_referral_credit();
