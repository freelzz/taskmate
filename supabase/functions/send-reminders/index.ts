import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") ?? "TaskMate <onboarding@resend.dev>";

interface Pref {
  user_id: string;
  reminder_enabled: boolean;
  email_notifications_enabled: boolean;
  reminder_days_before: number;
  email_priorities: string[];
}

interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  last_email_reminder_at: string | null;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend ${res.status}: ${t}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find users who want reminder emails
    const { data: prefs, error: prefErr } = await admin
      .from("user_preferences")
      .select("user_id, reminder_enabled, email_notifications_enabled, reminder_days_before, email_priorities")
      .eq("reminder_enabled", true)
      .eq("email_notifications_enabled", true);

    if (prefErr) throw prefErr;

    const now = new Date();
    const results: Array<{ user_id: string; sent: number; skipped: number }> = [];

    for (const pref of (prefs ?? []) as Pref[]) {
      const priorities = pref.email_priorities ?? ["urgent"];
      if (priorities.length === 0) {
        results.push({ user_id: pref.user_id, sent: 0, skipped: 0 });
        continue;
      }

      // Get user email
      const { data: profile } = await admin
        .from("profiles")
        .select("email, display_name")
        .eq("id", pref.user_id)
        .maybeSingle();
      if (!profile?.email) continue;

      // Get user's course ids
      const { data: courses } = await admin
        .from("courses")
        .select("id")
        .eq("user_id", pref.user_id);
      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) {
        results.push({ user_id: pref.user_id, sent: 0, skipped: 0 });
        continue;
      }

      const windowEnd = new Date(now.getTime() + pref.reminder_days_before * 24 * 60 * 60 * 1000);

      // PRIORITY FILTER applied here — only fetch tasks whose priority is in the user's chosen list
      const { data: tasks } = await admin
        .from("tasks")
        .select("id, course_id, title, description, due_date, priority, last_email_reminder_at")
        .in("course_id", courseIds)
        .in("priority", priorities)
        .eq("completed", false)
        .lte("due_date", windowEnd.toISOString());

      let sent = 0;
      let skipped = 0;

      for (const task of (tasks ?? []) as Task[]) {
        // Skip if we've already emailed in the last 24h
        if (task.last_email_reminder_at) {
          const last = new Date(task.last_email_reminder_at).getTime();
          if (now.getTime() - last < 24 * 60 * 60 * 1000) {
            skipped++;
            continue;
          }
        }

        const dueDate = new Date(task.due_date);
        const isOverdue = dueDate < now;
        const subject = `${isOverdue ? "⚠️ Overdue" : "📋 Reminder"}: ${task.title}`;
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">${isOverdue ? "This task is overdue" : "Upcoming task reminder"}</h2>
            <p style="font-size:16px;margin:0 0 8px"><strong>${task.title}</strong></p>
            ${task.description ? `<p style="color:#555;margin:0 0 12px">${task.description}</p>` : ""}
            <p style="color:#555;margin:0 0 4px">Priority: <strong>${task.priority}</strong></p>
            <p style="color:#555;margin:0 0 16px">Due: <strong>${dueDate.toLocaleString()}</strong></p>
            <p style="color:#888;font-size:12px;margin-top:24px">You're receiving this because <strong>${task.priority}</strong> is enabled in your email reminder priorities. Update preferences in Settings → Notifications.</p>
          </div>`;

        try {
          await sendEmail(profile.email, subject, html);
          await admin
            .from("tasks")
            .update({ last_email_reminder_at: now.toISOString() })
            .eq("id", task.id);
          sent++;
        } catch (e) {
          console.error("send fail", task.id, e);
        }
      }

      results.push({ user_id: pref.user_id, sent, skipped });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
