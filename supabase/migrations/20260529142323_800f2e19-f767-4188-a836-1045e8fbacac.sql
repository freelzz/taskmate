-- 1. Privilege escalation: drop self-update on user_subscriptions
DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;

-- 2. Lock down SECURITY DEFINER functions from API execution
REVOKE EXECUTE ON FUNCTION public.is_course_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;