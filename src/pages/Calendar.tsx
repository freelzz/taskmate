import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Task, Course } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, course:courses(*)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as (Task & { course: Course })[];
    },
    enabled: !!user,
  });

  const getTasksForDay = (day: Date) =>
    tasks.filter((task) => isSameDay(new Date(task.due_date), day));

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive/10 text-destructive";
      case "important":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Schedule</p>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevWeek} className="rounded-full h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="rounded-full text-xs h-8 px-3">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek} className="rounded-full h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Today's Focus */}
      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-5 shadow-ios card-hover">
        <p className="text-xs text-muted-foreground mb-2">Today's Focus</p>
        {getTasksForDay(new Date()).filter((t) => !t.completed).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due today! 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {getTasksForDay(new Date())
              .filter((t) => !t.completed)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: task.course?.color }}
                  />
                  <span className="text-xs font-medium">{task.title}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Weekly View */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()} className="min-h-[160px]">
              <div className={cn("mb-2 text-center", isCurrentDay && "text-foreground")}>
                <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
                <p
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isCurrentDay && "bg-foreground text-background"
                  )}
                >
                  {format(day, "d")}
                </p>
              </div>
              <div className="space-y-1.5">
                {dayTasks.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">—</p>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-xl border border-border p-2 text-xs shadow-ios transition-all card-hover",
                        task.completed && "opacity-50"
                      )}
                      style={{ borderLeftWidth: "3px", borderLeftColor: task.course?.color }}
                    >
                      <p className={cn("font-medium leading-tight", task.completed && "line-through")}>
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{task.course?.name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
