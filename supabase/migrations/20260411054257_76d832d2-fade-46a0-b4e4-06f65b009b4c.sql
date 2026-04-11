
-- ═══ 1. REFERRALS: Tighten INSERT to prevent reward self-grant ═══
DROP POLICY IF EXISTS "Users can insert own referrals" ON public.referrals;

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referrer_id = auth.uid()
    AND reward_granted = false
    AND referred_subscription_status = 'pending'
    AND status = 'pending'
  );

-- ═══ 2. STORAGE: Deny all access to verse-images bucket ═══
-- Block all SELECT on verse-images
CREATE POLICY "Deny all reads on verse-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id != 'verse-images');

-- Block all INSERT on verse-images  
CREATE POLICY "Deny all uploads on verse-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id != 'verse-images');

-- Block all UPDATE on verse-images
CREATE POLICY "Deny all updates on verse-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id != 'verse-images');

-- Block all DELETE on verse-images
CREATE POLICY "Deny all deletes on verse-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id != 'verse-images');
