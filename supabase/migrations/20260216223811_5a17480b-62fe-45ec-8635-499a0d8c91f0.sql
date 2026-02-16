
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS subscription_status_valid;

ALTER TABLE public.profiles
ADD CONSTRAINT subscription_status_valid
CHECK (subscription_status IN ('inativo','testando','ativo','vencido','cancelado'));

-- Update any existing rows with old values
UPDATE public.profiles SET subscription_status = 'inativo' WHERE subscription_status = 'inactive';
UPDATE public.profiles SET subscription_status = 'testando' WHERE subscription_status = 'trialing';
UPDATE public.profiles SET subscription_status = 'ativo' WHERE subscription_status = 'active';
UPDATE public.profiles SET subscription_status = 'cancelado' WHERE subscription_status = 'canceled';
UPDATE public.profiles SET subscription_status = 'vencido' WHERE subscription_status IN ('past_due', 'vencido');

-- Update default
ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'inativo';
