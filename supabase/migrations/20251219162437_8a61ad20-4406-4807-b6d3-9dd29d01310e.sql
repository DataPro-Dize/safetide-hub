-- Create enum for workflow nature
CREATE TYPE public.workflow_nature AS ENUM ('corrective', 'preventive');

-- Create enum for deviation phase
CREATE TYPE public.deviation_phase AS ENUM ('operations', 'construction');

-- Add new columns to workflows table
ALTER TABLE public.workflows ADD COLUMN deadline timestamp with time zone;
ALTER TABLE public.workflows ADD COLUMN nature public.workflow_nature;

-- Add phase column to deviations table
ALTER TABLE public.deviations ADD COLUMN phase public.deviation_phase;