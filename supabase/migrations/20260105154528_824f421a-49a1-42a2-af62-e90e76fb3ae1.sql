-- Fix notification spoofing vulnerability: Replace permissive INSERT policy with restrictive one
-- Triggers (SECURITY DEFINER) and service role will still be able to insert

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Only triggers and service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);