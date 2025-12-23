-- Add sequence_id columns for numeric IDs
ALTER TABLE public.deviations ADD COLUMN IF NOT EXISTS sequence_id SERIAL;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS sequence_id SERIAL;

-- Create unique indexes on sequence_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_deviations_sequence_id ON public.deviations(sequence_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflows_sequence_id ON public.workflows(sequence_id);