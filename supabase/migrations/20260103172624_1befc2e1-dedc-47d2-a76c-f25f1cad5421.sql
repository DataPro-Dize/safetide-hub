-- Create workflow_history table to track all status changes, comments, and actions
CREATE TABLE public.workflow_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'created', 'submitted_completed', 'submitted_blocked', 'approved', 'returned', 'resubmitted'
  notes text,
  photos text[] DEFAULT '{}',
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can view history for workflows they have access to
CREATE POLICY "Users can view workflow history" 
ON public.workflow_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM workflows w
  JOIN deviations d ON d.id = w.deviation_id
  JOIN plants p ON p.id = d.plant_id
  JOIN user_companies uc ON uc.company_id = p.company_id
  WHERE uc.user_id = auth.uid() AND w.id = workflow_history.workflow_id
));

-- Users can insert history for workflows they have access to
CREATE POLICY "Users can insert workflow history" 
ON public.workflow_history 
FOR INSERT 
WITH CHECK (
  performed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM workflows w
    JOIN deviations d ON d.id = w.deviation_id
    JOIN plants p ON p.id = d.plant_id
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND w.id = workflow_history.workflow_id
  )
);

-- Create index for faster lookups
CREATE INDEX idx_workflow_history_workflow_id ON public.workflow_history(workflow_id);
CREATE INDEX idx_workflow_history_created_at ON public.workflow_history(created_at DESC);