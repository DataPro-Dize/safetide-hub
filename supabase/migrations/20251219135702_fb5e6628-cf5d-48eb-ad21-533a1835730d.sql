-- Create enums for audit module
CREATE TYPE public.audit_status AS ENUM ('planned', 'in_progress', 'completed');
CREATE TYPE public.audit_answer AS ENUM ('pass', 'fail', 'na');

-- Create audit templates table (defines the audit type/template)
CREATE TABLE public.audit_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'safety',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit template sections (PPE, Machinery, etc.)
CREATE TABLE public.audit_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit template questions
CREATE TABLE public.audit_template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.audit_template_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audits table (actual audit instances)
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.audit_templates(id),
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  auditor_id UUID NOT NULL REFERENCES auth.users(id),
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status audit_status NOT NULL DEFAULT 'planned',
  score_percentage DECIMAL(5,2),
  signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit items table (answers to questions)
CREATE TABLE public.audit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.audit_template_questions(id),
  answer audit_answer,
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_templates (readable by all authenticated, manageable by admins)
CREATE POLICY "Authenticated users can view templates" ON public.audit_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage templates" ON public.audit_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for audit_template_sections
CREATE POLICY "Authenticated users can view sections" ON public.audit_template_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sections" ON public.audit_template_sections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for audit_template_questions
CREATE POLICY "Authenticated users can view questions" ON public.audit_template_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage questions" ON public.audit_template_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for audits (users can see audits for plants they have access to)
CREATE POLICY "Users can view audits for their plants" ON public.audits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = audits.plant_id
    )
  );

CREATE POLICY "Users can create audits for their plants" ON public.audits
  FOR INSERT WITH CHECK (
    auditor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = audits.plant_id
    )
  );

CREATE POLICY "Users can update audits they created" ON public.audits
  FOR UPDATE USING (
    auditor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for audit_items
CREATE POLICY "Users can view audit items" ON public.audit_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM audits a
      JOIN plants p ON p.id = a.plant_id
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND a.id = audit_items.audit_id
    )
  );

CREATE POLICY "Users can manage audit items for their audits" ON public.audit_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_items.audit_id AND a.auditor_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_items.audit_id AND a.auditor_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_audit_templates_updated_at
  BEFORE UPDATE ON public.audit_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audit_items_updated_at
  BEFORE UPDATE ON public.audit_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audit evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-evidence', 'audit-evidence', false);

-- Storage policies for audit evidence
CREATE POLICY "Users can upload audit evidence" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audit-evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view audit evidence" ON storage.objects
  FOR SELECT USING (bucket_id = 'audit-evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their audit evidence" ON storage.objects
  FOR DELETE USING (bucket_id = 'audit-evidence' AND auth.uid() IS NOT NULL);