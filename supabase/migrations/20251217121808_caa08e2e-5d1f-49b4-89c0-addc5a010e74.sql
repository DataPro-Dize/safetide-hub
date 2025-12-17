-- Make storage buckets private
UPDATE storage.buckets SET public = false 
WHERE id IN ('deviation-photos', 'workflow-evidence');

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view deviation photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view workflow evidence" ON storage.objects;

-- Create new authenticated-only SELECT policies
CREATE POLICY "Authenticated users can view deviation photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'deviation-photos');

CREATE POLICY "Authenticated users can view workflow evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'workflow-evidence');