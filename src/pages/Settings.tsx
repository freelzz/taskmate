import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  User, Lock, Moon, Bell, BookOpen, HelpCircle, Info, LogOut, Mic,
  ChevronRight, ArrowRight,
} from "lucide-react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PalettePicker } from "@/components/PalettePicker";

export default function Settings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <p className="text-xs text-muted-foreground">Manage</p>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
      </div>

      {/* Premium Card */}
      <Link to="/settings/subscription" className="block gradient-premium rounded-2xl p-5 shadow-ios-md card-hover">
        <div className="mb-4">
          <p className="text-white font-semibold text-sm">TaskMate PRO</p>
          <p className="text-white/70 text-xs mt-1">Manage your plan and billing</p>
        </div>
        <div className="w-full bg-background text-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          View Plan
          <ArrowRight className="h-4 w-4" />
        </div>
      </Link>

      <div className="space-y-2">
        <SettingLink icon={<User className="h-5 w-5" />} label="Profile Information" to="/settings/profile" />
        <SettingLink icon={<Lock className="h-5 w-5" />} label="Privacy & Security" to="/settings/privacy" />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3">
          Preferences
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-4 py-3 gradient-charcoal-soft ring-luxury rounded-2xl">
            <div className="text-muted-foreground"><Moon className="h-5 w-5" /></div>
            <span className="flex-1 text-sm font-medium text-foreground">Dark Mode</span>
            <ThemeToggle />
          </div>
          <PalettePicker />
          <SettingLink icon={<Bell className="h-5 w-5" />} label="Notifications" to="/settings/notifications" />
          <SettingLink icon={<Mic className="h-5 w-5" />} label="Voice & Language" to="/settings/voice-language" />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3">
          Help & Support
        </h3>
        <div className="space-y-2">
          <SettingLink icon={<BookOpen className="h-5 w-5" />} label="Help Center" to="/settings/help" />
          <SettingLink icon={<Info className="h-5 w-5" />} label="About" to="/settings/about" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 gradient-charcoal-soft ring-luxury rounded-2xl">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold">
            {displayName[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-foreground truncate flex-1">{user?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 text-destructive gradient-charcoal-soft ring-luxury rounded-2xl hover:bg-accent transition-colors font-medium text-sm"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}

function SettingLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-4 py-3 gradient-charcoal-soft ring-luxury rounded-2xl cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
