import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getCalendarStatus, connectGoogleCalendar, disconnectGoogleCalendar } from "@/lib/google-calendar";

type Priority = "urgent" | "important" | "normal";
const PRIORITIES: { value: Priority; label: string; desc: string }[] = [
  { value: "urgent", label: "Urgent", desc: "Critical deadlines" },
  { value: "important", label: "Important", desc: "High-priority work" },
  { value: "normal", label: "Normal", desc: "Everyday tasks" },
];

export default function Notifications() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    reminder_enabled: true,
    browser_notifications_enabled: true,
    email_notifications_enabled: true,
    reminder_days_before: 1,
    email_priorities: ["urgent"] as string[],
  });
  const [calConnected, setCalConnected] = useState(false);
  const [calLoading, setCalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            reminder_enabled: data.reminder_enabled,
            browser_notifications_enabled: data.browser_notifications_enabled,
            email_notifications_enabled: data.email_notifications_enabled,
            reminder_days_before: data.reminder_days_before,
            email_priorities: (data as any).email_priorities ?? ["urgent"],
          });
        }
      });
    getCalendarStatus().then(setCalConnected);

    // Refresh status when oauth popup closes
    const onFocus = () => getCalendarStatus().then(setCalConnected);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  const updatePref = async (key: string, value: any) => {
    if (!user) return;
    setPrefs((p) => ({ ...p, [key]: value }));
    const { error } = await supabase
      .from("user_preferences")
      .update({ [key]: value })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Preference updated");
  };

  const togglePriority = (p: Priority) => {
    const next = prefs.email_priorities.includes(p)
      ? prefs.email_priorities.filter((x) => x !== p)
      : [...prefs.email_priorities, p];
    updatePref("email_priorities", next);
  };

  const handleConnect = async () => {
    setCalLoading(true);
    try {
      await connectGoogleCalendar();
      toast.info("Complete sign-in in the popup window");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCalLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setCalLoading(true);
    await disconnectGoogleCalendar();
    setCalConnected(false);
    setCalLoading(false);
    toast.success("Google Calendar disconnected");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Settings</p>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
      </div>

      {/* Reminders */}
      <div className="gradient-charcoal-soft ring-luxury rounded-2xl shadow-ios divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Task Reminders</p>
            <p className="text-xs text-muted-foreground">Get notified before deadlines</p>
          </div>
          <Switch checked={prefs.reminder_enabled} onCheckedChange={(v) => updatePref("reminder_enabled", v)} />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Browser Notifications</p>
            <p className="text-xs text-muted-foreground">Push notifications in your browser</p>
          </div>
          <Switch checked={prefs.browser_notifications_enabled} onCheckedChange={(v) => updatePref("browser_notifications_enabled", v)} />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Email Notifications</p>
            <p className="text-xs text-muted-foreground">Receive updates via email</p>
          </div>
          <Switch checked={prefs.email_notifications_enabled} onCheckedChange={(v) => updatePref("email_notifications_enabled", v)} />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Remind Days Before</p>
            <p className="text-xs text-muted-foreground">How many days before a deadline</p>
          </div>
          <select
            value={prefs.reminder_days_before}
            onChange={(e) => updatePref("reminder_days_before", Number(e.target.value))}
            className="bg-accent border-0 rounded-lg px-3 py-1.5 text-sm"
          >
            {[1, 2, 3, 5, 7].map((d) => (
              <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Email priority filter */}
      <div className="gradient-charcoal-soft ring-luxury rounded-2xl shadow-ios p-5 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Email me for these priorities</p>
          <p className="text-xs text-muted-foreground">Choose which task priorities trigger reminder emails</p>
        </div>
        <div className="space-y-2 pt-1">
          {PRIORITIES.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={prefs.email_priorities.includes(p.value)}
                onCheckedChange={() => togglePriority(p.value)}
                disabled={!prefs.email_notifications_enabled}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="gradient-charcoal-soft ring-luxury rounded-2xl shadow-ios p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Google Calendar</p>
            <p className="text-xs text-muted-foreground">
              Sync reminders to your personal Google Calendar with built-in alerts
            </p>
          </div>
          {calConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <Check className="h-3.5 w-3.5" /> Connected
            </span>
          )}
        </div>
        {calConnected ? (
          <Button variant="outline" className="w-full" onClick={handleDisconnect} disabled={calLoading}>
            Disconnect
          </Button>
        ) : (
          <Button className="w-full" onClick={handleConnect} disabled={calLoading}>
            Connect Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
}
