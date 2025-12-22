-- Create kpi_reports table for monthly safety indicators
CREATE TABLE public.kpi_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  
  -- Work hours data
  horas_trabalhadas_empresa INTEGER NOT NULL DEFAULT 0,
  horas_trabalhadas_contratados INTEGER NOT NULL DEFAULT 0,
  horas_treinadas_empresa INTEGER NOT NULL DEFAULT 0,
  horas_treinadas_contratados INTEGER NOT NULL DEFAULT 0,
  
  -- Workforce data
  efetivo_empresa INTEGER NOT NULL DEFAULT 0,
  efetivo_contratados INTEGER NOT NULL DEFAULT 0,
  
  -- Accident data
  acidente_fatal INTEGER NOT NULL DEFAULT 0,
  acidente_afastamento INTEGER NOT NULL DEFAULT 0,
  acidente_restricao_trabalho INTEGER NOT NULL DEFAULT 0,
  acidente_tratamento_medico INTEGER NOT NULL DEFAULT 0,
  acidente_prim_socorros INTEGER NOT NULL DEFAULT 0,
  acidente_veiculos INTEGER NOT NULL DEFAULT 0,
  quase_acidente INTEGER NOT NULL DEFAULT 0,
  dias_perdidos INTEGER NOT NULL DEFAULT 0,
  
  -- Safety activities
  inspecoes_seg_empresa INTEGER NOT NULL DEFAULT 0,
  inspecoes_seg_contratados INTEGER NOT NULL DEFAULT 0,
  safety_walks_empresa INTEGER NOT NULL DEFAULT 0,
  safety_walks_contratados INTEGER NOT NULL DEFAULT 0,
  perigos_desvios INTEGER NOT NULL DEFAULT 0,
  acoes_abertas INTEGER NOT NULL DEFAULT 0,
  acoes_fechadas INTEGER NOT NULL DEFAULT 0,
  
  -- Edit control fields
  is_locked BOOLEAN NOT NULL DEFAULT false,
  edit_count INTEGER NOT NULL DEFAULT 0,
  last_edit_reason TEXT,
  last_edited_by UUID REFERENCES public.profiles(id),
  last_edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one report per plant/month/year
  CONSTRAINT unique_plant_month_year UNIQUE (plant_id, month, year)
);

-- Create audit log table for tracking changes
CREATE TABLE public.kpi_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.kpi_reports(id) ON DELETE CASCADE,
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_reports
CREATE POLICY "Users can view KPI reports for their plants"
  ON public.kpi_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = kpi_reports.plant_id
    )
  );

CREATE POLICY "Users can create KPI reports for their plants"
  ON public.kpi_reports
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = kpi_reports.plant_id
    )
  );

CREATE POLICY "Users can update KPI reports they have access to"
  ON public.kpi_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = kpi_reports.plant_id
    )
  );

-- RLS Policies for kpi_audit_logs
CREATE POLICY "Users can view audit logs for their plants"
  ON public.kpi_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kpi_reports kr
      JOIN plants p ON p.id = kr.plant_id
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND kr.id = kpi_audit_logs.report_id
    )
  );

CREATE POLICY "Users can create audit logs"
  ON public.kpi_audit_logs
  FOR INSERT
  WITH CHECK (
    changed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM kpi_reports kr
      JOIN plants p ON p.id = kr.plant_id
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND kr.id = kpi_audit_logs.report_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_kpi_reports_updated_at
  BEFORE UPDATE ON public.kpi_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_kpi_reports_plant_id ON public.kpi_reports(plant_id);
CREATE INDEX idx_kpi_reports_year_month ON public.kpi_reports(year, month);
CREATE INDEX idx_kpi_audit_logs_report_id ON public.kpi_audit_logs(report_id);