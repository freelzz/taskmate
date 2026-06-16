import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function getCalendarStatus(): Promise<boolean> {
  const headers = await authHeaders();
  const r = await fetch(`${FN_URL}/status`, { headers });
  if (!r.ok) return false;
  const j = await r.json();
  return !!j.connected;
}

export async function connectGoogleCalendar() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  const headers = await authHeaders();
  const r = await fetch(`${FN_URL}/auth-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ access_token: session.access_token, origin: window.location.origin }),
  });
  const { url } = await r.json();
  window.open(url, "google-cal-oauth", "width=500,height=700");
}

export async function disconnectGoogleCalendar() {
  const headers = await authHeaders();
  await fetch(`${FN_URL}/disconnect`, { method: "POST", headers });
}

export async function syncTaskToCalendar(task: any, action: "upsert" | "delete" = "upsert") {
  try {
    const headers = await authHeaders();
    await fetch(`${FN_URL}/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify({ task, action }),
    });
  } catch (e) {
    console.warn("Calendar sync failed:", e);
  }
}
