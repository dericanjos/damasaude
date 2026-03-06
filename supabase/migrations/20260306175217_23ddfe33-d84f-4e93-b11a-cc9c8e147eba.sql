
INSERT INTO storage.buckets (id, name, public) VALUES ('verse-images', 'verse-images', true);

CREATE POLICY "Anyone can read verse images" ON storage.objects FOR SELECT USING (bucket_id = 'verse-images');
CREATE POLICY "Authenticated users can upload verse images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verse-images');
