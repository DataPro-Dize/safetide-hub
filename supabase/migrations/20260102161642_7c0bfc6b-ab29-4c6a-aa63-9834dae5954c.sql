-- Create a security definer function to get current profile sensitive fields
-- This avoids infinite recursion when checking profile fields in RLS policies
CREATE OR REPLACE FUNCTION public.get_profile_sensitive_fields(_user_id uuid)
RETURNS TABLE(is_admin boolean, role user_role, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_admin, p.role, p.is_active
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1
$$;

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new policy that enforces field-level protection for non-admins
-- Non-admin users can only update their own profile AND cannot change sensitive fields
CREATE POLICY "Users can update own safe profile fields"
ON public.profiles 
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  (
    -- Admins can update anything
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Non-admins cannot change sensitive fields - they must match current values
    (
      is_admin = (SELECT f.is_admin FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
      role = (SELECT f.role FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
      is_active = (SELECT f.is_active FROM public.get_profile_sensitive_fields(auth.uid()) f)
    )
  )
);