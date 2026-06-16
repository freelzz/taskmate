import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isPast, addDays, isAfter, isBefore } from "date-fns";

export function useTaskNotifications() {
  const { user } = useAuth();

  const { data: prefs } = useQuery({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("completed", false)
        .order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  useEffect(() => {
    if (!prefs?.browser_notifications_enabled || !prefs?.reminder_enabled) return;
    if (!tasks.length) return;

    const checkAndNotify = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const now = new Date();
      const reminderWindow = addDays(now, prefs.reminder_days_before);
      const notifiedKey = `notified_tasks_${now.toDateString()}`;
      const notified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || "[]"));

      tasks.forEach((task) => {
        if (notified.has(task.id)) return;
        const dueDate = new Date(task.due_date);
        
        if (isPast(dueDate)) {
          new Notification("⚠️ Overdue Task", {
            body: `"${task.title}" is overdue!`,
            icon: "/placeholder.svg",
          });
          notified.add(task.id);
        } else if (isBefore(dueDate, reminderWindow)) {
          new Notification("📋 Upcoming Task", {
            body: `"${task.title}" is due soon`,
            icon: "/placeholder.svg",
          });
          notified.add(task.id);
        }
      });

      localStorage.setItem(notifiedKey, JSON.stringify([...notified]));
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 300000); // every 5 min
    return () => clearInterval(interval);
  }, [prefs, tasks, requestPermission]);

  const upcomingCount = tasks.filter((t) => {
    const due = new Date(t.due_date);
    return isPast(due) || isBefore(due, addDays(new Date(), 1));
  }).length;

  return { upcomingCount, requestPermission };
}
