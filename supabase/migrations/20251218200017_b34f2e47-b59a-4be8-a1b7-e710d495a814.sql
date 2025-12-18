-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;

-- Create new policy that allows users to create workflows for any user in the same company
CREATE POLICY "Users can create workflows"
ON public.workflows
FOR INSERT
WITH CHECK (
  -- User must have access to the deviation's company
  EXISTS (
    SELECT 1
    FROM deviations d
    JOIN plants p ON p.id = d.plant_id
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid() AND d.id = workflows.deviation_id
  )
  -- AND the responsible user must also have access to the same company
  AND EXISTS (
    SELECT 1
    FROM deviations d
    JOIN plants p ON p.id = d.plant_id
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = workflows.responsible_id AND d.id = workflows.deviation_id
  )
);