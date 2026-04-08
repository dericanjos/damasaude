CREATE OR REPLACE FUNCTION public.validate_daily_checkin()
RETURNS TRIGGER AS $$
DECLARE
  effective_capacity INTEGER;
  total_outcomes INTEGER;
BEGIN
  effective_capacity := NEW.appointments_scheduled + COALESCE(NEW.extra_appointments, 0);

  total_outcomes := COALESCE(NEW.attended_private, 0) + COALESCE(NEW.attended_insurance, 0)
                  + COALESCE(NEW.noshows_private, 0) + COALESCE(NEW.noshows_insurance, 0)
                  + COALESCE(NEW.cancellations_private, 0) + COALESCE(NEW.cancellations_insurance, 0);

  IF total_outcomes > effective_capacity THEN
    RAISE EXCEPTION 'Total de desfechos (%) excede a capacidade efetiva (%)', total_outcomes, effective_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;