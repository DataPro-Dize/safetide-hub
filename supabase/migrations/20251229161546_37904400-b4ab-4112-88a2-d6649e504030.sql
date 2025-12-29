-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('pass_fail', 'text', 'rating', 'single_choice', 'multiple_choice');

-- Add question_type column to audit_template_questions
ALTER TABLE public.audit_template_questions 
ADD COLUMN question_type public.question_type NOT NULL DEFAULT 'pass_fail';

-- Add options column for choice-based questions (JSON array of options)
ALTER TABLE public.audit_template_questions 
ADD COLUMN options JSONB DEFAULT NULL;

-- Add rating_scale column for rating questions (max value, e.g., 5 or 10)
ALTER TABLE public.audit_template_questions 
ADD COLUMN rating_scale INTEGER DEFAULT NULL;