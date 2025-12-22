-- Create enums for training module
CREATE TYPE training_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE training_enrollment_status AS ENUM ('pending', 'present', 'absent');

-- Create training_types table (Course Catalog)
CREATE TABLE public.training_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  validity_months INTEGER NOT NULL DEFAULT 12,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_sessions table (Training Events)
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_type_id UUID NOT NULL REFERENCES public.training_types(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status training_session_status NOT NULL DEFAULT 'scheduled',
  location_room TEXT,
  max_participants INTEGER DEFAULT 30,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_enrollments table (Attendance List)
CREATE TABLE public.training_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status training_enrollment_status NOT NULL DEFAULT 'pending',
  grade NUMERIC(5,2),
  digital_signature_url TEXT,
  certificate_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create training_evidence table
CREATE TABLE public.training_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for training files
INSERT INTO storage.buckets (id, name, public) VALUES ('training-files', 'training-files', false);

-- Enable RLS on all tables
ALTER TABLE public.training_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_types
CREATE POLICY "Admins can manage training types"
  ON public.training_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view training types"
  ON public.training_types FOR SELECT
  USING (true);

-- RLS Policies for training_sessions
CREATE POLICY "Users can view sessions for their plants"
  ON public.training_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plants p
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND p.id = training_sessions.plant_id
  ));

CREATE POLICY "Instructors and admins can create sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Instructors and admins can update sessions"
  ON public.training_sessions FOR UPDATE
  USING (
    instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for training_enrollments
CREATE POLICY "Users can view enrollments for their sessions"
  ON public.training_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN plants p ON p.id = ts.plant_id
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND ts.id = training_enrollments.session_id
  ));

CREATE POLICY "Instructors and admins can manage enrollments"
  ON public.training_enrollments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_enrollments.session_id
    AND (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_enrollments.session_id
    AND (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- RLS Policies for training_evidence
CREATE POLICY "Users can view evidence for their sessions"
  ON public.training_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN plants p ON p.id = ts.plant_id
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND ts.id = training_evidence.session_id
  ));

CREATE POLICY "Instructors can manage evidence"
  ON public.training_evidence FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_evidence.session_id
    AND (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_evidence.session_id
    AND (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- Storage policies for training-files bucket
CREATE POLICY "Users can view training files from their companies"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'training-files'
    AND EXISTS (
      SELECT 1 FROM training_sessions ts
      JOIN plants p ON p.id = ts.plant_id
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid()
      AND ts.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Instructors can upload training files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'training-files'
    AND EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      AND ts.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Instructors can delete training files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'training-files'
    AND EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE (ts.instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      AND ts.id::text = (storage.foldername(name))[1]
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_training_types_updated_at
  BEFORE UPDATE ON public.training_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_enrollments_updated_at
  BEFORE UPDATE ON public.training_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();