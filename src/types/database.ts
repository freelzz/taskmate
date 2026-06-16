export interface Course {
  id: string;
  user_id: string;
  name: string;
  professor: string | null;
  schedule: string | null;
  color: string;
  outline_text: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "urgent" | "important" | "normal";
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface StudyMaterial {
  id: string;
  course_id: string;
  type: "summary" | "flashcards" | "quiz" | "resource";
  title: string;
  content: Record<string, unknown>;
  external_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
  browser_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const COURSE_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
];
