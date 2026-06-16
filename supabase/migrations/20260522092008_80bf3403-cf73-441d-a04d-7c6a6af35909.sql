
-- Email priority filter
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS email_priorities text[] NOT NULL DEFAULT ARRAY['urgent']::text[];

-- Track synced calendar event per task
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

-- Google Calendar tokens per user
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  user_id uuid PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expiry timestamptz NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gcal tokens" ON public.google_calendar_tokens
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own gcal tokens" ON public.google_calendar_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own gcal tokens" ON public.google_calendar_tokens
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own gcal tokens" ON public.google_calendar_tokens
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_gcal_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
