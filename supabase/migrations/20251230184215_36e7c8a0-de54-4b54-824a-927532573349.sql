-- Allow any user to register a completed training session for plants they have access to
-- (This supports the "Cadastrar Treinamento Realizado" flow where the registrar may not be the instructor.)

CREATE POLICY "Users can create training sessions for their plants"
ON public.training_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM plants p
    JOIN user_companies uc ON uc.company_id = p.company_id
    WHERE uc.user_id = auth.uid()
      AND p.id = training_sessions.plant_id
  )
);
