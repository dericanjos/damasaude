
-- Função de validação para daily_checkins
CREATE OR REPLACE FUNCTION validate_daily_checkin()
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

  IF COALESCE(NEW.noshows_private, 0) + COALESCE(NEW.cancellations_private, 0) > COALESCE(NEW.attended_private, 0) THEN
    RAISE EXCEPTION 'Perdas no particular (%) excedem atendimentos particulares (%)',
      COALESCE(NEW.noshows_private, 0) + COALESCE(NEW.cancellations_private, 0),
      COALESCE(NEW.attended_private, 0);
  END IF;

  IF COALESCE(NEW.noshows_insurance, 0) + COALESCE(NEW.cancellations_insurance, 0) > COALESCE(NEW.attended_insurance, 0) THEN
    RAISE EXCEPTION 'Perdas no convênio (%) excedem atendimentos convênio (%)',
      COALESCE(NEW.noshows_insurance, 0) + COALESCE(NEW.cancellations_insurance, 0),
      COALESCE(NEW.attended_insurance, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa a validação antes de inserir ou atualizar
DROP TRIGGER IF EXISTS trigger_validate_daily_checkin ON daily_checkins;
CREATE TRIGGER trigger_validate_daily_checkin
  BEFORE INSERT OR UPDATE ON daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION validate_daily_checkin();
