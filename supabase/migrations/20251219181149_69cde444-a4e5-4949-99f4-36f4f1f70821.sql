-- Create table for client module access
CREATE TABLE public.client_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.corporate_groups(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, module_id)
);

-- Enable RLS
ALTER TABLE public.client_modules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage client modules"
ON public.client_modules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client modules"
ON public.client_modules
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_companies uc
  JOIN companies c ON c.id = uc.company_id
  WHERE uc.user_id = auth.uid() AND c.group_id = client_modules.group_id
));