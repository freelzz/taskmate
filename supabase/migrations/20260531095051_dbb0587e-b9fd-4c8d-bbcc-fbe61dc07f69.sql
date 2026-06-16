-- Remove client INSERT/UPDATE on ai_usage; server-side (service role) manages counters
DROP POLICY IF EXISTS "Users can insert own usage" ON public.ai_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.ai_usage;

-- Remove client INSERT on user_subscriptions; handle_new_user trigger (SECURITY DEFINER) creates rows
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;