import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, Bell, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/use-profile";
import { useTaskNotifications } from "@/hooks/use-notifications";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { displayName, avatarUrl, initials } = useProfile();
  const { upcomingCount } = useTaskNotifications();

  const upcomingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const overdueCount = upcomingTasks.filter((t) => isPast(new Date(t.due_date))).length;

  const todayTasks = tasks.filter((t) => isToday(new Date(t.due_date)));
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayTotal = todayTasks.length;
  const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (todayPct / 100) * ringCircumference;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Combined Header + Today's Tasks */}
      <div className="gradient-charcoal-soft ring-luxury rounded-3xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            </div>
          </div>
          <button className="relative p-2 hover:bg-accent rounded-full transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            {(overdueCount > 0 || upcomingCount > 0) && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
            )}
          </button>
        </div>

        <div className="pt-4 border-t border-border/60">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Today's Tasks</p>
          <p className="text-sm text-foreground/80 mt-1">{format(new Date(), "MMM d")}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative h-[92px] w-[92px]">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={ringRadius} stroke="currentColor" strokeOpacity="0.15" strokeWidth="7" fill="none" />
                <circle
                  cx="50" cy="50" r={ringRadius}
                  stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-semibold">{todayPct}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {todayCompleted}<span className="text-muted-foreground/60 text-lg">/{todayTotal}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">tasks done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 shadow-ios card-hover">
            <p className="text-xs text-muted-foreground mb-3">Progress</p>
            <p className="text-lg font-semibold text-foreground mb-2">
              {completedTasks.length}/{tasks.length}
            </p>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all rounded-full"
                style={{
                  width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 shadow-ios card-hover">
            <p className="text-xs text-muted-foreground mb-3">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
            <p className="text-xs text-muted-foreground mt-1">need attention</p>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-6 shadow-ios card-hover">
        <p className="text-xs text-muted-foreground mb-1">Weekly Summary</p>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Stay consistent. Complete your tasks and hit your weekly goals.
        </h3>
        <div className="flex items-end justify-between">
          <Link
            to="/tasks"
            className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            View all
          </Link>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{completedTasks.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Tasks</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {tasks.length} tasks • {format(new Date(), "MMM d, yyyy")}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 shadow-ios animate-pulse">
                <div className="h-5 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : upcomingTasks.length > 0 ? (
          <div className="space-y-2">
            {upcomingTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 shadow-ios card-hover">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      isPast(new Date(task.due_date))
                        ? "bg-destructive/10"
                        : "bg-muted"
                    }`}
                  >
                    {isPast(new Date(task.due_date)) ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.due_date), "MMM d 'at' h:mm a")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(new Date(task.due_date), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            No upcoming tasks. Create one to get started!
          </p>
        )}
      </div>
    </div>
  );
}
