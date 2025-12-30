-- Create storage bucket for training files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-files', 'training-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload training files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own training files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own training files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);