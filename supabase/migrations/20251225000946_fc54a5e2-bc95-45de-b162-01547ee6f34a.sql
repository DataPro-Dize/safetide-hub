-- Add training_link to training_types
ALTER TABLE public.training_types 
ADD COLUMN IF NOT EXISTS training_link TEXT;

-- Add notification_days to training_types (for expiration alerts: 30, 60, 90, 120)
ALTER TABLE public.training_types 
ADD COLUMN IF NOT EXISTS notification_days INTEGER[] DEFAULT '{30, 60, 90}'::INTEGER[];

-- Create KPI definitions table for custom KPIs per plant/company
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT NOT NULL,
  unit TEXT DEFAULT '%',
  target_value NUMERIC,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, biannual, annual
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_definitions
CREATE POLICY "Admins can manage KPI definitions"
ON public.kpi_definitions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Users can view KPI definitions for their companies"
ON public.kpi_definitions
FOR SELECT
USING (
  company_id IN (
    SELECT c.id FROM companies c
    JOIN user_companies uc ON uc.company_id = c.id
    WHERE uc.user_id = auth.uid()
  )
  OR
  plant_id IN (
    SELECT p.id FROM plants p
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add project/unit columns to RiskManagement list display
-- We need to fetch company and plant info - no migration needed, just update the query

-- Update has_role function to also support 'moderator' for supervisor role
-- The app uses 'supervisor' role in profiles but 'moderator' in app_role enum