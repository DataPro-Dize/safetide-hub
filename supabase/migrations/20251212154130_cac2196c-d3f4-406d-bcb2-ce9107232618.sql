-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('technician', 'supervisor', 'admin');

-- Create enum for deviation categories
CREATE TYPE public.deviation_category AS ENUM (
  'access_exit',
  'chemical_products',
  'electrical',
  'fire',
  'ergonomics',
  'ppe',
  'machinery',
  'fall_protection',
  'confined_space',
  'other'
);

-- Create enum for deviation status
CREATE TYPE public.deviation_status AS ENUM ('open', 'in_progress', 'done');

-- Create enum for workflow status
CREATE TYPE public.workflow_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for company size
CREATE TYPE public.company_size AS ENUM ('small', 'medium', 'large', 'enterprise');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  phone TEXT,
  language_pref TEXT NOT NULL DEFAULT 'pt_br',
  photo_url TEXT,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create corporate_groups table (Matriz)
CREATE TABLE public.corporate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  cover_photo_url TEXT,
  address_street TEXT,
  address_number TEXT,
  address_zip TEXT,
  address_district TEXT,
  address_state TEXT,
  address_city TEXT,
  website_url TEXT,
  size_type company_size DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companies table (Filiais)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.corporate_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  cover_photo_url TEXT,
  address_street TEXT,
  address_number TEXT,
  address_zip TEXT,
  address_district TEXT,
  address_state TEXT,
  address_city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_companies junction table
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create plants table (Areas/Locais)
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deviations table (Core Table)
CREATE TABLE public.deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  category deviation_category NOT NULL DEFAULT 'other',
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 3),
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 3),
  risk_rating INTEGER GENERATED ALWAYS AS (probability * severity) STORED,
  status deviation_status NOT NULL DEFAULT 'open',
  description TEXT,
  location_details TEXT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflows table (Fluxo de Trabalho)
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deviation_id UUID NOT NULL REFERENCES public.deviations(id) ON DELETE CASCADE,
  responsible_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status workflow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_corporate_groups_updated_at BEFORE UPDATE ON public.corporate_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deviations_updated_at BEFORE UPDATE ON public.deviations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, language_pref)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'language_pref', 'pt_br')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for corporate_groups (users can view groups they belong to via companies)
CREATE POLICY "Users can view corporate groups" ON public.corporate_groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    JOIN public.companies c ON c.id = uc.company_id
    WHERE uc.user_id = auth.uid() AND c.group_id = corporate_groups.id
  )
);

-- RLS Policies for companies
CREATE POLICY "Users can view their companies" ON public.companies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = companies.id
  )
);

-- RLS Policies for user_companies
CREATE POLICY "Users can view their company associations" ON public.user_companies FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for plants
CREATE POLICY "Users can view plants" ON public.plants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = plants.company_id
  )
);

-- RLS Policies for deviations
CREATE POLICY "Users can view deviations" ON public.deviations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.plants p
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND p.id = deviations.plant_id
  )
);

CREATE POLICY "Users can create deviations" ON public.deviations FOR INSERT WITH CHECK (
  creator_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.plants p
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND p.id = plant_id
  )
);

CREATE POLICY "Users can update deviations" ON public.deviations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.plants p
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND p.id = deviations.plant_id
  )
);

-- RLS Policies for workflows
CREATE POLICY "Users can view workflows" ON public.workflows FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deviations d
    JOIN public.plants p ON p.id = d.plant_id
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND d.id = workflows.deviation_id
  )
);

CREATE POLICY "Users can create workflows" ON public.workflows FOR INSERT WITH CHECK (
  responsible_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.deviations d
    JOIN public.plants p ON p.id = d.plant_id
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND d.id = deviation_id
  )
);

CREATE POLICY "Users can update workflows" ON public.workflows FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.deviations d
    JOIN public.plants p ON p.id = d.plant_id
    JOIN public.user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND d.id = workflows.deviation_id
  )
);