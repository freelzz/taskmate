import { useState, useEffect } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  CalendarIcon,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { format, isToday, isSameDay, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { syncTaskToCalendar } from "@/lib/google-calendar";

type FilterStatus = "all" | "active" | "completed";
type TaskPriority = "urgent" | "important" | "normal";

type TaskFormState = {
  title: string;
  description: string;
  dueDate?: Date;
  dueTime: string;
  priority: TaskPriority;
};

const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or less"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  dueDate: z.date({ required_error: "Please choose a due date" }),
  dueTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please enter a valid time"),
  priority: z.enum(["urgent", "important", "normal"]),
});

const defaultFormData: TaskFormState = {
  title: "",
  description: "",
  dueDate: undefined,
  dueTime: "09:00",
  priority: "normal",
};

const combineDateAndTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filter, setFilter] = useState<FilterStatus>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<TaskFormState>(defaultFormData);
  const [defaultCourseId, setDefaultCourseId] = useState<string | null>(null);

  // Auto-create/fetch a "General" course behind the scenes
  useEffect(() => {
    if (!user) return;
    const ensureDefaultCourse = async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (courses && courses.length > 0) {
        setDefaultCourseId(courses[0].id);
      } else {
        const { data: newCourse } = await supabase
          .from("courses")
          .insert({ user_id: user.id, name: "General", color: "#6366f1" })
          .select("id")
          .single();
        if (newCourse) setDefaultCourseId(newCourse.id);
      }
    };
    ensureDefaultCourse();
  }, [user]);

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

  const createTask = useMutation({
    mutationFn: async (payload: { title: string; description: string | null; due_date: string; priority: string; course_id: string }) => {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created!");
      resetForm();
      if (task) syncTaskToCalendar(task);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: updated, error } = await supabase.from("tasks").update(data).eq("id", id).select().single();
      if (error) throw error;
      return updated;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated!");
      resetForm();
      if (task) syncTaskToCalendar(task);
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
      if (task) syncTaskToCalendar(task, "delete");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingTask(null);
    setDialogOpen(false);
  };

  const handleEdit = (task: any) => {
    const dueAt = new Date(task.due_date);
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      dueDate: dueAt,
      dueTime: format(dueAt, "HH:mm"),
      priority: task.priority as TaskPriority,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const courseId = editingTask?.course_id ?? defaultCourseId;
    if (!courseId) {
      toast.error("Setting up your account, please try again in a moment");
      return;
    }

    const parsed = taskFormSchema.safeParse({
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      priority: formData.priority,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the task details");
      return;
    }

    const dueAt = combineDateAndTime(parsed.data.dueDate, parsed.data.dueTime);

    if (Number.isNaN(dueAt.getTime())) {
      toast.error("Please choose a valid due date and time");
      return;
    }

    const payload = {
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: dueAt.toISOString(),
      priority: parsed.data.priority,
      course_id: courseId,
    };

    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data: payload });
    } else {
      createTask.mutate(payload);
    }
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "active") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    })
    .filter((task) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description || "").toLowerCase().includes(q)
      );
    });

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive/10 text-destructive dark:bg-destructive/20";
      case "important":
        return "bg-warning/10 text-warning dark:bg-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // ===== Stats for luxury dashboard =====
  const todayTasks = tasks.filter((t) => isToday(new Date(t.due_date)));
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayTotal = todayTasks.length;
  const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const last7Due = tasks.filter((t) => {
    const d = new Date(t.due_date);
    return d >= startOfDay(subDays(new Date(), 6));
  });
  const last7Completed = last7Due.filter((t) => t.completed).length;
  const productivity = last7Due.length > 0 ? Math.round((last7Completed / last7Due.length) * 100) : 0;

  const heatmapWeeks = 12;
  const heatmapDays = heatmapWeeks * 7;
  const today = startOfDay(new Date());
  const heatmap = Array.from({ length: heatmapDays }).map((_, i) => {
    const date = subDays(today, heatmapDays - 1 - i);
    const count = tasks.filter(
      (t) => t.completed && t.completed_at && isSameDay(new Date(t.completed_at), date),
    ).length;
    return { date, count };
  });
  const heatColor = (c: number) => {
    if (c === 0) return "bg-foreground/[0.04]";
    if (c === 1) return "bg-foreground/25";
    if (c === 2) return "bg-foreground/45";
    if (c === 3) return "bg-foreground/65";
    return "bg-foreground";
  };

  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (todayPct / 100) * ringCircumference;

  return (
    <div className="min-h-screen text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between pb-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">
              {format(new Date(), "EEEE, MMM d")}
            </p>
            <h1 className="text-5xl font-bold tracking-tight">Tasks</h1>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="Filter tasks"
                  className="h-11 w-11 rounded-full gradient-charcoal ring-luxury flex items-center justify-center text-foreground/80 hover:text-foreground transition-all"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 rounded-2xl gradient-charcoal-soft border-border/60 p-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">View</p>
                {([
                  { label: "All tasks", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Completed", value: "completed" },
                ] as { label: string; value: FilterStatus }[]).map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setFilter(b.value)}
                    className={cn(
                      "w-full text-left text-sm px-3 py-2 rounded-xl transition-colors",
                      filter === b.value
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
                <div className="px-2 pt-3 pb-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-8 rounded-xl bg-foreground/[0.04] border-border/60 text-xs"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <button
              aria-label="Add task"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="h-11 w-11 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity shadow-ios-md"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top stat grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="gradient-charcoal-soft ring-luxury rounded-3xl p-5 flex flex-col justify-between min-h-[180px]">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Today's Tasks</p>
              <p className="text-sm text-foreground/80 mt-1">{format(new Date(), "MMM d")}</p>
            </div>
            <div className="flex items-center gap-4">
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

          <div className="gradient-charcoal-soft ring-luxury rounded-3xl p-5 flex flex-col justify-between min-h-[180px]">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Tasks Pending</p>
              <p className="text-sm text-foreground/80 mt-1">All open</p>
            </div>
            <div>
              <p className="text-6xl font-semibold tracking-tight leading-none">{pendingCount}</p>
              <p className="text-[11px] text-muted-foreground mt-3">Updated just now</p>
            </div>
          </div>
        </div>

        {/* Activity heatmap */}
        <div className="gradient-charcoal-soft ring-luxury rounded-3xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Activity</p>
              <h3 className="text-lg font-semibold mt-1">Last {heatmapWeeks} weeks</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-foreground/[0.06]" />
              <span className="h-2 w-2 rounded-sm bg-foreground/25" />
              <span className="h-2 w-2 rounded-sm bg-foreground/45" />
              <span className="h-2 w-2 rounded-sm bg-foreground/65" />
              <span className="h-2 w-2 rounded-sm bg-foreground" />
            </div>
          </div>
          <div className="grid grid-flow-col gap-[5px]" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}>
            {heatmap.map((d, i) => (
              <div
                key={i}
                title={`${format(d.date, "MMM d")} • ${d.count} done`}
                className={cn("aspect-square rounded-[3px]", heatColor(d.count))}
              />
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Work · Study · Personal</p>
              <p className="text-xs text-muted-foreground mt-0.5">All recurring schedules</p>
            </div>
            <p className="text-xs text-muted-foreground">{tasks.filter(t => t.completed).length} completed</p>
          </div>
        </div>

        {/* Productivity score */}
        <div className="gradient-charcoal-soft ring-luxury rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Productivity Score</p>
            <p className="text-5xl font-semibold tracking-tight mt-2">{productivity}%</p>
            <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
          </div>
          <div className="h-14 w-14 rounded-full bg-foreground/[0.06] flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-foreground/80" />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">
              {filter === "completed" ? "Completed" : filter === "all" ? "All Tasks" : "Active"}
            </h2>
            <span className="text-xs text-muted-foreground">{filteredTasks.length}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 animate-pulse">
                  <div className="h-5 w-3/4 rounded bg-foreground/[0.06]" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 group transition-all hover:bg-foreground/[0.03]">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleComplete.mutate({ id: task.id, completed: !task.completed })}
                      className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all flex items-center justify-center",
                        task.completed ? "bg-foreground border-foreground" : "border-foreground/30 hover:border-foreground",
                      )}
                    >
                      {task.completed && <CheckCircle2 className="w-full h-full text-background" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-sm", task.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {format(new Date(task.due_date), "MMM d 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide",
                        task.priority === "urgent" ? "bg-destructive/15 text-destructive"
                          : task.priority === "important" ? "bg-warning/15 text-warning"
                          : "bg-foreground/[0.06] text-muted-foreground",
                      )}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-2 hover:bg-foreground/[0.06] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(task.id); }}
                        className="p-2 hover:bg-foreground/[0.06] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 gradient-charcoal-soft ring-luxury rounded-2xl">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No tasks match your search." : "No tasks yet. Tap + to begin."}
              </p>
            </div>
          )}
        </div>

        {/* Bottom add button */}
        <div className="pt-4 pb-2 flex justify-center">
          <button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            aria-label="Create task"
            className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-ios-lg"
          >
            <Plus className="h-7 w-7" strokeWidth={1.5} />
          </button>
        </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Update your task details" : "Add a new task"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Buy groceries"
                  maxLength={120}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-between rounded-xl border-input bg-background font-normal",
                          !formData.dueDate && "text-muted-foreground",
                        )}
                      >
                        {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                        <CalendarIcon className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(dueDate) => setFormData({ ...formData, dueDate })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_time">Time *</Label>
                  <Input
                    id="due_time"
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any notes or details..."
                  rows={3}
                  maxLength={1000}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm} className="rounded-full">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || updateTask.isPending}
                className="rounded-full"
              >
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
