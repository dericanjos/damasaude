
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS subscription_status_valid;

ALTER TABLE public.profiles
ADD CONSTRAINT subscription_status_valid
CHECK (subscription_status IN ('inactive','trialing','active','past_due','canceled','vencido'));
