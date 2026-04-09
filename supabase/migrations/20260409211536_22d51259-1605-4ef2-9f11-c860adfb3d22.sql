-- Reverter a policy permissiva ruim do Prompt 12
DROP POLICY IF EXISTS "Block all user inserts on verse-images" ON storage.objects;

-- Drop das outras policies de verse-images
DROP POLICY IF EXISTS "Anyone can read verse images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload verse images" ON storage.objects;
DROP POLICY IF EXISTS "Block user updates on verse-images" ON storage.objects;
DROP POLICY IF EXISTS "Block user deletes on verse-images" ON storage.objects;