
-- Habilita RLS na tabela realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados se inscrevam APENAS em canais
-- cujo topic = 'checkin-realtime-<próprio_user_id>'
CREATE POLICY "Users can subscribe to own checkin channel only"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'checkin-realtime-' || auth.uid()::text
  );

-- Permite que o servidor faça broadcast nos canais (necessário para
-- postgres_changes funcionar)
CREATE POLICY "Server can broadcast to checkin channels"
  ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() = 'checkin-realtime-' || auth.uid()::text
  );
