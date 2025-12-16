-- Allow admins to manage corporate groups
CREATE POLICY "Admins can insert corporate groups" 
ON public.corporate_groups 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update corporate groups" 
ON public.corporate_groups 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete corporate groups" 
ON public.corporate_groups 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage companies
CREATE POLICY "Admins can insert companies" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update companies" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete companies" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage plants
CREATE POLICY "Admins can insert plants" 
ON public.plants 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update plants" 
ON public.plants 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete plants" 
ON public.plants 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage user_companies
CREATE POLICY "Admins can insert user_companies" 
ON public.user_companies 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user_companies" 
ON public.user_companies 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user_companies" 
ON public.user_companies 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user_companies for user management
CREATE POLICY "Admins can view all user_companies" 
ON public.user_companies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all corporate groups
CREATE POLICY "Admins can view all corporate groups" 
ON public.corporate_groups 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all companies
CREATE POLICY "Admins can view all companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all plants
CREATE POLICY "Admins can view all plants" 
ON public.plants 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));