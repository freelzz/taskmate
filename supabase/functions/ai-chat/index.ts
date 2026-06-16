import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task/reminder for the user with a title, optional description, due date, and priority.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          description: { type: "string", description: "Optional longer description" },
          due_date: { type: "string", description: "ISO 8601 date-time string for when the task is due" },
          priority: { type: "string", enum: ["urgent", "important", "normal"], description: "Task priority level" },
        },
        required: ["title", "due_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's current (incomplete) tasks. Use this before deleting/updating to find the right task id when the user references a task by name.",
      parameters: {
        type: "object",
        properties: {
          include_completed: { type: "boolean", description: "Whether to include completed tasks" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by id. Call list_tasks first if you don't know the id.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "UUID of the task to delete" },
        },
        required: ["task_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_all_tasks",
      description: "Delete all of the user's tasks. Use this when the user asks to clear, delete, or remove all tasks/reminders.",
      parameters: {
        type: "object",
        properties: {
          include_completed: { type: "boolean", description: "Whether completed tasks should also be deleted. Default true." },
        },
        additionalProperties: false,
      },
    },
  },
];

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user_id = user.id;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Check subscription & usage limits ---
    let { data: sub } = await supabaseAdmin
      .from("user_subscriptions").select("*").eq("user_id", user_id).single();

    if (!sub) {
      const { data: newSub } = await supabaseAdmin
        .from("user_subscriptions").insert({ user_id }).select("*").single();
      sub = newSub;
    }

    const now = new Date();
    const trialActive = sub?.is_trial_active && sub?.trial_ends_at && new Date(sub.trial_ends_at) > now;

    // Admin bypass: emails listed in ADMIN_EMAILS (comma-separated) get unlimited access
    const adminEmails = (Deno.env.get("ADMIN_EMAILS") || "")
      .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

    const isPro = isAdmin || sub?.plan === "pro" || trialActive;

    // Check weekly AI usage for free users
    const weekStart = getWeekStart();
    let { data: usage } = await supabaseAdmin
      .from("ai_usage").select("*").eq("user_id", user_id).eq("week_start", weekStart).single();

    if (!usage) {
      const { data: newUsage } = await supabaseAdmin
        .from("ai_usage").insert({ user_id, week_start: weekStart, ai_requests_count: 0 }).select("*").single();
      usage = newUsage;
    }

    const FREE_WEEKLY_LIMIT = 10;
    if (!isPro && (usage?.ai_requests_count || 0) >= FREE_WEEKLY_LIMIT) {
      return new Response(JSON.stringify({
        content: "You've used your 10 AI reminder suggestions for this week. Your limit resets on Monday — or upgrade to Pro for unlimited access.",
        limit_reached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Increment usage (skip for admins)
    if (!isAdmin) {
      await supabaseAdmin.from("ai_usage")
        .update({ ai_requests_count: (usage?.ai_requests_count || 0) + 1 })
        .eq("user_id", user_id).eq("week_start", weekStart);
    }

    // --- Parse request ---
    const body = await req.json();
    const { messages, timezone: rawTz } = body;
    const timezone = typeof rawTz === "string" && rawTz.length > 0 && rawTz.length < 60 ? rawTz : "UTC";

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = messages
      .filter((m: any) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      .slice(-50);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build trial warning if applicable
    let trialNote = "";
    if (trialActive && sub?.trial_ends_at) {
      const daysLeft = Math.ceil((new Date(sub.trial_ends_at).getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 3 && daysLeft > 0) {
        trialNote = `\n\nIMPORTANT: The user's free Pro trial ends in ${daysLeft} day(s). Mention this ONCE in a friendly, non-pushy way: "Just a heads-up — your free Pro trial ends in ${daysLeft} days. After that you'll move to the free plan (10 AI reminders/week) unless you upgrade."`;
      }
    }

    const usageNote = isAdmin
      ? "\nThe user is an ADMIN with unlimited AI access."
      : !isPro
        ? `\nThe user is on the FREE plan. They have ${FREE_WEEKLY_LIMIT - (usage?.ai_requests_count || 0)} AI requests remaining this week.`
        : "\nThe user has Pro access (unlimited AI reminders).";

    // Local time in user's timezone for accurate due-date parsing
    let localTimeStr = "";
    let tzOffsetStr = "";
    try {
      localTimeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone, dateStyle: "full", timeStyle: "long",
      }).format(now);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone, timeZoneName: "longOffset",
      }).formatToParts(now);
      tzOffsetStr = parts.find((p) => p.type === "timeZoneName")?.value || "";
    } catch {
      localTimeStr = now.toISOString();
    }

    const systemPrompt = `You are TaskMate AI, a smart personal task management assistant. You help users create tasks, set smart reminders, and stay on top of their goals.

YOUR CAPABILITIES:
- Create and organize tasks with due dates, priorities, and labels
- Set AI-powered smart reminders based on context
- Suggest task breakdowns for complex goals
- Recommend optimal times to tackle tasks
- Send proactive nudges when deadlines are approaching

IMPORTANT RULES:
- When a user asks to set a reminder or create a task, USE the create_task tool.
- When a user asks to delete/clear/remove all tasks or all reminders, USE the delete_all_tasks tool. Confirm how many were deleted if the tool returns a count.
- When a user asks to delete/remove/cancel a task or reminder, USE the delete_task tool. If you don't know its id, first call list_tasks to find it by title, then call delete_task with that id. Confirm afterwards (e.g. "Done — I deleted 'Math homework'.").
- When a user asks what's on their list / what tasks they have, USE list_tasks.
- After creating a task, respond in a friendly conversational way. Example: "Done! I've set a reminder for your exam on Wednesday at 8am. Would you like to set any other reminders?"
- NEVER output raw JSON, tool call data, or technical details in your response.
- Be concise, warm, and practical — users are busy people.
- Never be preachy or lecture about productivity.
- When suggesting reminders, briefly explain the "why" (e.g. "I'd suggest Tuesday morning when you tend to have lighter commitments").
- Ask clarifying questions if a task is vague, but max one question per response.
- Always confirm when a task or reminder has been set.
- Parse dates naturally (e.g. "tomorrow at 9am", "next Friday 5pm", "Wednesday by 8").
- Only help with tasks, reminders, scheduling, and productivity.
- Politely redirect off-topic requests: "I'm focused on helping you stay on top of your tasks — is there something I can help you plan or schedule?"

TIMEZONE — CRITICAL:
- The user's timezone is "${timezone}" (${tzOffsetStr}). Current local time: ${localTimeStr}.
- When the user says a time like "8pm" or "tomorrow at 9am", they mean that LOCAL time in their timezone.
- When calling create_task, the due_date MUST be an ISO 8601 string that includes the correct UTC offset for "${timezone}" so it represents that LOCAL time. For example, if the user is in -05:00 and says "8pm today", produce "YYYY-MM-DDT20:00:00-05:00", NOT "YYYY-MM-DDT20:00:00Z".
- Never send a Z (UTC) timestamp unless the user explicitly said UTC.
${usageNote}${trialNote}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const assistantMessage = choice?.message;

    // --- Handle tool calls ---
    if (assistantMessage?.tool_calls?.length > 0) {
      const toolResults: any[] = [];
      let tasksChanged = false;
      let tasksCreated = false;

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === "create_task") {
          const args = JSON.parse(toolCall.function.arguments);
          const title = typeof args.title === "string" ? args.title.trim().slice(0, 120) : null;
          if (!title) {
            toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: false, error: "Invalid task title" }) });
            continue;
          }
          const parsedDate = new Date(args.due_date);
          if (isNaN(parsedDate.getTime())) {
            toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: false, error: "Invalid due date" }) });
            continue;
          }
          const description = typeof args.description === "string" ? args.description.slice(0, 1000) : null;
          const validPriorities = ["urgent", "important", "normal"];
          const priority = validPriorities.includes(args.priority) ? args.priority : "normal";

          let { data: courses } = await supabaseAdmin.from("courses").select("id").eq("user_id", user_id).limit(1);
          let courseId: string;
          if (!courses || courses.length === 0) {
            const { data: newCourse } = await supabaseAdmin
              .from("courses").insert({ user_id, name: "General", color: "#6366f1" }).select("id").single();
            courseId = newCourse!.id;
          } else {
            courseId = courses[0].id;
          }

          const { error } = await supabaseAdmin.from("tasks").insert({
            course_id: courseId, title, description,
            due_date: parsedDate.toISOString(), priority,
          });

          if (!error) {
            tasksCreated = true;
            tasksChanged = true;
          }
          toolResults.push({
            role: "tool", tool_call_id: toolCall.id,
            content: error
              ? JSON.stringify({ success: false, error: error.message })
              : JSON.stringify({ success: true, title, due_date: parsedDate.toISOString(), priority }),
          });
        } else if (toolCall.function.name === "list_tasks") {
          const args = (() => { try { return JSON.parse(toolCall.function.arguments || "{}"); } catch { return {}; } })();
          const includeCompleted = !!args.include_completed;
          const { data: courseRows } = await supabaseAdmin.from("courses").select("id").eq("user_id", user_id);
          const courseIds = (courseRows || []).map((c: any) => c.id);
          let list: any[] = [];
          if (courseIds.length > 0) {
            let q = supabaseAdmin.from("tasks")
              .select("id, title, due_date, priority, completed")
              .in("course_id", courseIds)
              .order("due_date", { ascending: true })
              .limit(50);
            if (!includeCompleted) q = q.eq("completed", false);
            const { data } = await q;
            list = data || [];
          }
          toolResults.push({
            role: "tool", tool_call_id: toolCall.id,
            content: JSON.stringify({ success: true, tasks: list }),
          });
        } else if (toolCall.function.name === "delete_task") {
          const args = (() => { try { return JSON.parse(toolCall.function.arguments || "{}"); } catch { return {}; } })();
          const taskId = typeof args.task_id === "string" ? args.task_id : null;
          if (!taskId) {
            toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: false, error: "Missing task_id" }) });
            continue;
          }
          // Verify ownership via course
          const { data: taskRow } = await supabaseAdmin
            .from("tasks")
            .select("id, course_id")
            .eq("id", taskId)
            .single();
          const { data: courseRow } = taskRow
            ? await supabaseAdmin.from("courses").select("user_id").eq("id", taskRow.course_id).single()
            : { data: null } as any;
          if (!taskRow || courseRow?.user_id !== user_id) {
            toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: false, error: "Task not found" }) });
            continue;
          }
          const { error } = await supabaseAdmin.from("tasks").delete().eq("id", taskId);
          if (!error) tasksChanged = true;
          toolResults.push({
            role: "tool", tool_call_id: toolCall.id,
            content: error
              ? JSON.stringify({ success: false, error: error.message })
              : JSON.stringify({ success: true, deleted_id: taskId }),
          });
        } else if (toolCall.function.name === "delete_all_tasks") {
          const args = (() => { try { return JSON.parse(toolCall.function.arguments || "{}"); } catch { return {}; } })();
          const includeCompleted = args.include_completed !== false;
          const { data: courseRows } = await supabaseAdmin.from("courses").select("id").eq("user_id", user_id);
          const courseIds = (courseRows || []).map((c: any) => c.id);
          let deletedCount = 0;
          let deleteError: any = null;

          if (courseIds.length > 0) {
            let q = supabaseAdmin
              .from("tasks")
              .delete({ count: "exact" })
              .in("course_id", courseIds);
            if (!includeCompleted) q = q.eq("completed", false);
            const { count, error } = await q;
            deletedCount = count || 0;
            deleteError = error;
          }

          if (!deleteError) tasksChanged = true;
          toolResults.push({
            role: "tool", tool_call_id: toolCall.id,
            content: deleteError
              ? JSON.stringify({ success: false, error: deleteError.message })
              : JSON.stringify({ success: true, deleted_count: deletedCount }),
          });
        }
      }

      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...safeMessages, assistantMessage, ...toolResults],
          stream: false,
        }),
      });

      if (!followUp.ok) {
        console.error("Follow-up error:", followUp.status, await followUp.text());
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const followUpData = await followUp.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || "Done.";
      return new Response(JSON.stringify({ content: finalContent, tasks_created: tasksCreated, tasks_changed: tasksChanged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ content: assistantMessage?.content || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
