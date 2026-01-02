
-- Drop the conflicting INSERT policies
DROP POLICY IF EXISTS "Instructors and admins can create sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can create training sessions for their plants" ON public.training_sessions;

-- Create a single unified INSERT policy that allows users to create sessions
-- when they are the instructor AND the plant belongs to their companies, OR they are admin
CREATE POLICY "Users can create training sessions"
ON public.training_sessions
FOR INSERT
WITH CHECK (
  (
    instructor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM plants p
      JOIN user_companies uc ON uc.company_id = p.company_id
      WHERE uc.user_id = auth.uid() AND p.id = training_sessions.plant_id
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
