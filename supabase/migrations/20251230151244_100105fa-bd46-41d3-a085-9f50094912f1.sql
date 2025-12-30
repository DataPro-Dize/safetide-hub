
-- Add modality enum for training sessions
CREATE TYPE training_modality AS ENUM ('ead', 'presencial');

-- Add new fields to training_sessions for better training management
ALTER TABLE public.training_sessions 
ADD COLUMN institution TEXT,
ADD COLUMN modality training_modality DEFAULT 'presencial',
ADD COLUMN expiration_date DATE,
ADD COLUMN certificate_url TEXT;

-- Create index for better performance on expiration date queries
CREATE INDEX idx_training_sessions_expiration ON public.training_sessions(expiration_date);
