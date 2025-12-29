-- Create user_modules table to store individual user module access
CREATE TABLE public.user_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Admins can manage all user modules
CREATE POLICY "Admins can manage user modules"
ON public.user_modules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own modules
CREATE POLICY "Users can view their own modules"
ON public.user_modules
FOR SELECT
USING (user_id = auth.uid());