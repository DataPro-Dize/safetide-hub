-- Add RLS policy allowing users to see profiles of colleagues in the same company
CREATE POLICY "Users can view profiles in their companies"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Users can see profiles of users in the same company
  id IN (
    SELECT uc2.user_id 
    FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
  )
  OR
  -- Admins can see all profiles
  public.has_role(auth.uid(), 'admin')
);

-- Drop the old restrictive policy that only allowed viewing own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;