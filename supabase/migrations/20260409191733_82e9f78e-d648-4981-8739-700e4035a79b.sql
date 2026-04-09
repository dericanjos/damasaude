-- Remover policy de INSERT em verse-images (app não faz upload do client)
DROP POLICY IF EXISTS "Authenticated users can upload verse images" ON storage.objects;

-- Bloquear UPDATE e DELETE explicitamente (só service_role pode modificar)
CREATE POLICY "Block user updates on verse-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'verse-images' AND false);

CREATE POLICY "Block user deletes on verse-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'verse-images' AND false);