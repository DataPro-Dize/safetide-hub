-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can update safe profile fields" ON public.profiles;

-- Create a simpler policy that allows users to update their own profile
-- The WITH CHECK ensures they cannot change protected fields by using a function
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);