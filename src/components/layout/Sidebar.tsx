import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/use-profile";
import {
  Calendar,
  CheckSquare,
  Home,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home, animClass: "nav-icon-home" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, animClass: "nav-icon-tasks" },
  { to: "/ai-chat", label: "AI Assistant", icon: Sparkles, animClass: "nav-icon-ai" },
  { to: "/calendar", label: "Calendar", icon: Calendar, animClass: "nav-icon-calendar" },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const { displayName, avatarUrl, initials } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col glass-card rounded-r-3xl border-r-0 sticky top-0">
      <style>{`
        @keyframes home-bounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          60% { transform: translateY(-1px); }
        }
        @keyframes tasks-check {
          0%, 100% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.1) rotate(-4deg); }
          60% { transform: scale(1.05) rotate(2deg); }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0) rotate(0deg); filter: drop-shadow(0 0 2px hsl(var(--primary) / 0.3)); }
          25% { transform: translateY(-3px) rotate(5deg); filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.5)); }
          50% { transform: translateY(-1px) rotate(-3deg); filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.6)); }
          75% { transform: translateY(-2px) rotate(2deg); filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.4)); }
        }
        @keyframes calendar-tick {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(3deg); }
          75% { transform: rotate(-3deg); }
        }
        .nav-icon-home { animation: home-bounce 3s ease-in-out infinite; display: inline-block; }
        .nav-icon-tasks { animation: tasks-check 4s ease-in-out infinite; display: inline-block; }
        .nav-icon-ai { animation: ai-float 3s ease-in-out infinite; display: inline-block; }
        .nav-icon-calendar { animation: calendar-tick 3.5s ease-in-out infinite; display: inline-block; }

        .nav-link-item:hover .nav-icon-home { animation: none; transform: translateY(-2px) scale(1.15); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .nav-link-item:hover .nav-icon-tasks { animation: none; transform: scale(1.15) rotate(-8deg); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .nav-link-item:hover .nav-icon-ai { animation: none; transform: scale(1.2) rotate(12deg); filter: drop-shadow(0 0 10px hsl(var(--primary) / 0.7)); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .nav-link-item:hover .nav-icon-calendar { animation: none; transform: scale(1.15) rotate(6deg); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>

      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <CheckSquare className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">TaskMate</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "nav-link-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className={cn("h-5 w-5", item.animClass)} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-sidebar-accent px-3 py-2">
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-7 w-7">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-sidebar-foreground">
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
