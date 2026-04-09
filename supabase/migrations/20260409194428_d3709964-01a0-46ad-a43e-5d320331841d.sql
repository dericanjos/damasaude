-- DENY explícito de INSERT no verse-images
-- Impede qualquer usuário autenticado de fazer upload neste bucket
DROP POLICY IF EXISTS "Block all user inserts on verse-images" ON storage.objects;

CREATE POLICY "Block all user inserts on verse-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id != 'verse-images');