-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view deviation photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view workflow evidence" ON storage.objects;

-- Create company-scoped SELECT policy for deviation-photos
-- Users can only view photos uploaded by users in their same company
CREATE POLICY "Users can view their company's deviation photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deviation-photos' AND
  EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = (storage.foldername(name))[1]::uuid
  )
);

-- Create company-scoped SELECT policy for workflow-evidence
CREATE POLICY "Users can view their company's workflow evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'workflow-evidence' AND
  EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = (storage.foldername(name))[1]::uuid
  )
);