-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('deviation-photos', 'deviation-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('workflow-evidence', 'workflow-evidence', true);

-- Storage policies for deviation-photos
CREATE POLICY "Authenticated users can upload deviation photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deviation-photos');

CREATE POLICY "Anyone can view deviation photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'deviation-photos');

CREATE POLICY "Users can delete their own deviation photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'deviation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for workflow-evidence
CREATE POLICY "Authenticated users can upload workflow evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'workflow-evidence');

CREATE POLICY "Anyone can view workflow evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'workflow-evidence');

CREATE POLICY "Users can delete their own workflow evidence"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'workflow-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Alter workflow_status enum to add new statuses
ALTER TYPE workflow_status ADD VALUE IF NOT EXISTS 'submitted_completed';
ALTER TYPE workflow_status ADD VALUE IF NOT EXISTS 'submitted_blocked';
ALTER TYPE workflow_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE workflow_status ADD VALUE IF NOT EXISTS 'returned';

-- Add new columns to workflows table
ALTER TABLE public.workflows
ADD COLUMN IF NOT EXISTS evidence_photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_notes text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS validator_id uuid,
ADD COLUMN IF NOT EXISTS validated_at timestamptz,
ADD COLUMN IF NOT EXISTS validator_notes text;