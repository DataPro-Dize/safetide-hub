-- Simplify training_sessions policies to allow easier registration

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create training sessions" ON public.training_sessions;

-- Create simpler INSERT policy - authenticated users can create if they are the instructor
CREATE POLICY "Authenticated users can create training sessions"
ON public.training_sessions
FOR INSERT
TO authenticated
WITH CHECK (instructor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Add policy for moderators and admins to view all sessions
CREATE POLICY "Moderators and admins can view all sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Drop and recreate UPDATE policy to include moderators
DROP POLICY IF EXISTS "Instructors and admins can update sessions" ON public.training_sessions;

CREATE POLICY "Instructors moderators and admins can update sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (
  instructor_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Simplify training_enrollments policies
DROP POLICY IF EXISTS "Instructors and admins can manage enrollments" ON public.training_enrollments;

CREATE POLICY "Authenticated users can manage enrollments"
ON public.training_enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_enrollments.session_id
    AND ts.instructor_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM training_sessions ts
    WHERE ts.id = training_enrollments.session_id
    AND ts.instructor_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);