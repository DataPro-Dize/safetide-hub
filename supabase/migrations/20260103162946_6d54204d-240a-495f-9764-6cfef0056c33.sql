-- Adicionar coluna group_id à tabela audit_templates para isolamento multiempresa
ALTER TABLE public.audit_templates 
ADD COLUMN group_id uuid REFERENCES public.corporate_groups(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX idx_audit_templates_group_id ON public.audit_templates(group_id);

-- Criar function helper para obter group_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_group_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cg.id
  FROM corporate_groups cg
  JOIN companies c ON c.group_id = cg.id
  JOIN user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = _user_id
  LIMIT 1
$$;

-- Remover policies antigas de audit_templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.audit_templates;
DROP POLICY IF EXISTS "Admins and moderators can manage templates" ON public.audit_templates;

-- Policies para audit_templates com isolamento por empresa
CREATE POLICY "Users can view templates from their group" ON public.audit_templates
  FOR SELECT TO authenticated
  USING (
    group_id IS NULL OR
    group_id = public.get_user_group_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can manage templates from their group" ON public.audit_templates
  FOR ALL TO authenticated
  USING (
    (group_id = public.get_user_group_id(auth.uid()) AND 
     (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (group_id = public.get_user_group_id(auth.uid()) AND 
     (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Atualizar policies para audit_template_sections
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.audit_template_sections;
DROP POLICY IF EXISTS "Admins and moderators can manage sections" ON public.audit_template_sections;

CREATE POLICY "Users can view sections from their group" ON public.audit_template_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_templates at
      WHERE at.id = audit_template_sections.template_id
      AND (at.group_id IS NULL OR at.group_id = public.get_user_group_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can manage sections from their group" ON public.audit_template_sections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_templates at
      WHERE at.id = audit_template_sections.template_id
      AND at.group_id = public.get_user_group_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_templates at
      WHERE at.id = audit_template_sections.template_id
      AND at.group_id = public.get_user_group_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Atualizar policies para audit_template_questions
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.audit_template_questions;
DROP POLICY IF EXISTS "Admins and moderators can manage questions" ON public.audit_template_questions;

CREATE POLICY "Users can view questions from their group" ON public.audit_template_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_template_sections ats
      JOIN audit_templates at ON at.id = ats.template_id
      WHERE ats.id = audit_template_questions.section_id
      AND (at.group_id IS NULL OR at.group_id = public.get_user_group_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can manage questions from their group" ON public.audit_template_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM audit_template_sections ats
      JOIN audit_templates at ON at.id = ats.template_id
      WHERE ats.id = audit_template_questions.section_id
      AND at.group_id = public.get_user_group_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_template_sections ats
      JOIN audit_templates at ON at.id = ats.template_id
      WHERE ats.id = audit_template_questions.section_id
      AND at.group_id = public.get_user_group_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );