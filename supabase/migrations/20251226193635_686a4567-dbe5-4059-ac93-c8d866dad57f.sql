-- Drop existing restrictive policies on audit_templates
DROP POLICY IF EXISTS "Admins can manage templates" ON public.audit_templates;
DROP POLICY IF EXISTS "Admins and moderators can manage templates" ON public.audit_templates;

-- Create new policy for admin AND moderator to manage templates
CREATE POLICY "Admins and moderators can manage templates" ON public.audit_templates
  FOR ALL 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Drop existing restrictive policies on audit_template_sections
DROP POLICY IF EXISTS "Admins can manage sections" ON public.audit_template_sections;
DROP POLICY IF EXISTS "Admins and moderators can manage sections" ON public.audit_template_sections;

-- Create new policy for admin AND moderator to manage sections
CREATE POLICY "Admins and moderators can manage sections" ON public.audit_template_sections
  FOR ALL 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Drop existing restrictive policies on audit_template_questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.audit_template_questions;
DROP POLICY IF EXISTS "Admins and moderators can manage questions" ON public.audit_template_questions;

-- Create new policy for admin AND moderator to manage questions
CREATE POLICY "Admins and moderators can manage questions" ON public.audit_template_questions
  FOR ALL 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
  );