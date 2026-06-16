import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
};

const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar/callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function getUserFromAuth(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data } = await client.auth.getUser();
  return data.user;
}

async function refreshAccessToken(refresh_token: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  return r.json();
}

async function getValidToken(user_id: string) {
  const { data } = await admin.from("google_calendar_tokens").select("*").eq("user_id", user_id).maybeSingle();
  if (!data) throw new Error("Not connected");
  if (new Date(data.expiry).getTime() - 60_000 > Date.now()) return data;
  const refreshed = await refreshAccessToken(data.refresh_token);
  if (!refreshed.access_token) throw new Error("Refresh failed");
  const expiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
  await admin.from("google_calendar_tokens").update({
    access_token: refreshed.access_token,
    expiry,
  }).eq("user_id", user_id);
  return { ...data, access_token: refreshed.access_token, expiry };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // OAuth callback (GET, no auth header — uses state)
    if (path === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // user access token
      if (!code || !state) return new Response("Missing code/state", { status: 400 });

      const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${state}` } },
      });
      const { data: { user } } = await client.auth.getUser();
      if (!user) return new Response("Invalid state", { status: 401 });

      const tokRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      const tok = await tokRes.json();
      if (!tok.access_token || !tok.refresh_token) {
        return new Response(`OAuth error: ${JSON.stringify(tok)}`, { status: 400 });
      }
      const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
      await admin.from("google_calendar_tokens").upsert({
        user_id: user.id,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expiry,
        scope: tok.scope,
      });

      const origin = url.searchParams.get("origin") || "/";
      return new Response(
        `<html><body style="font-family:system-ui;text-align:center;padding:40px;background:#0a0a0a;color:#fff">
        <h2>✓ Google Calendar Connected</h2><p>You can close this window.</p>
        <script>setTimeout(()=>{window.close();window.location.href='${origin}/settings/notifications';},1500)</script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const user = await getUserFromAuth(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (path === "auth-url") {
      const body = await req.json().catch(() => ({}));
      const accessToken = body.access_token;
      const origin = body.origin || "";
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: SCOPE,
        access_type: "offline",
        prompt: "consent",
        state: accessToken,
      });
      if (origin) params.set("redirect_uri", REDIRECT_URI); // keep redirect; origin handled via state? Simpler: append origin to state via separate param
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}&origin=${encodeURIComponent(origin)}`;
      return new Response(JSON.stringify({ url: authUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "status") {
      const { data } = await admin.from("google_calendar_tokens").select("user_id, created_at").eq("user_id", user.id).maybeSingle();
      return new Response(JSON.stringify({ connected: !!data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "disconnect") {
      await admin.from("google_calendar_tokens").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "sync") {
      const { task, action } = await req.json();
      const tokens = await getValidToken(user.id).catch(() => null);
      if (!tokens) return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const calBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendar_id)}/events`;
      const headers = { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" };

      if (action === "delete" && task.google_calendar_event_id) {
        await fetch(`${calBase}/${task.google_calendar_event_id}`, { method: "DELETE", headers });
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const start = new Date(task.due_date);
      const end = new Date(start.getTime() + 30 * 60_000);
      const eventBody = {
        summary: `[${task.priority.toUpperCase()}] ${task.title}`,
        description: task.description || "",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }, { method: "email", minutes: 60 }] },
      };

      let eventId = task.google_calendar_event_id;
      if (eventId) {
        const r = await fetch(`${calBase}/${eventId}`, { method: "PATCH", headers, body: JSON.stringify(eventBody) });
        if (r.status === 404) eventId = null;
      }
      if (!eventId) {
        const r = await fetch(calBase, { method: "POST", headers, body: JSON.stringify(eventBody) });
        const j = await r.json();
        if (!j.id) throw new Error(`Calendar create failed: ${JSON.stringify(j)}`);
        eventId = j.id;
        await admin.from("tasks").update({ google_calendar_event_id: eventId }).eq("id", task.id);
      }
      return new Response(JSON.stringify({ ok: true, eventId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown route" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
