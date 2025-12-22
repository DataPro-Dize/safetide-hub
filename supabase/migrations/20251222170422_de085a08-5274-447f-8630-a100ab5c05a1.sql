-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view audit evidence" ON storage.objects;

-- Create company-scoped SELECT policy for audit-evidence bucket
CREATE POLICY "Users can view their company's audit evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-evidence' AND
  EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = (storage.foldername(name))[1]::uuid
  )
);

-- Also update the DELETE policy to be company-scoped
DROP POLICY IF EXISTS "Users can delete their own audit evidence" ON storage.objects;

CREATE POLICY "Users can delete their company's audit evidence"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audit-evidence' AND
  EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = (storage.foldername(name))[1]::uuid
  )
);