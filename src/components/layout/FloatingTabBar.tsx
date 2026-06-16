import { Link, useLocation } from "react-router-dom";
import { Home, CheckSquare, Calendar, User, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const tabs = [
  { icon: Home, label: "Home", href: "/dashboard", key: "home" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", key: "tasks" },
  { icon: Sparkles, label: "AI Chat", href: "/ai-chat", key: "ai-chat" },
  { icon: Calendar, label: "Calendar", href: "/calendar", key: "calendar" },
  { icon: User, label: "Account", href: "/settings", key: "account" },
];

export function FloatingTabBar() {
  const location = useLocation();
  const [pulseIndex, setPulseIndex] = useState(-1);

  // Heartbeat: pulse each icon one after the other every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      let i = 0;
      setPulseIndex(i);
      const step = setInterval(() => {
        i++;
        if (i >= tabs.length) {
          setPulseIndex(-1);
          clearInterval(step);
        } else {
          setPulseIndex(i);
        }
      }, 450);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (key: string) => {
    switch (key) {
      case "home": return location.pathname === "/dashboard";
      case "tasks": return location.pathname === "/tasks";
      case "ai-chat": return location.pathname === "/ai-chat";
      case "calendar": return location.pathname === "/calendar";
      case "account": return location.pathname.startsWith("/settings");
      default: return false;
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center px-4 pointer-events-none z-40"
      style={{ paddingBottom: `max(env(safe-area-inset-bottom, 8px), 12px)` }}
    >
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          20% { transform: scale(1.22); }
          40% { transform: scale(0.97); }
          60% { transform: scale(1.15); }
          80% { transform: scale(1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="glass-card rounded-3xl flex items-center justify-around w-full max-w-md px-2 py-1.5 pointer-events-auto">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const active = isActive(tab.key);
          const isPulsing = pulseIndex === idx;
          return (
            <Link
              key={tab.key}
              to={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-primary" : ""}`}
                style={isPulsing ? {
                  animation: "heartbeat 1.2s ease-in-out",
                  filter: tab.key === "ai-chat"
                    ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))"
                    : undefined
                } : undefined}
              />
              <span className={`text-[10px] font-medium leading-tight ${active ? "text-primary" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
