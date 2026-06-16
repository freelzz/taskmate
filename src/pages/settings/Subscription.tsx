import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Zap, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Subscription = {
  plan: string;
  is_trial_active: boolean;
  trial_ends_at: string | null;
};

type Usage = {
  ai_requests_count: number;
  week_start: string;
};

export default function Subscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: subData } = await (supabase as any)
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setSub(subData);

      // Get current week usage
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split("T")[0];

      const { data: usageData } = await (supabase as any)
        .from("ai_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .single();
      setUsage(usageData);
      setLoading(false);
    };
    load();
  }, [user]);

  const now = new Date();
  const trialActive = sub?.is_trial_active && sub?.trial_ends_at && new Date(sub.trial_ends_at) > now;
  const isPro = sub?.plan === "pro" || trialActive;
  const daysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - now.getTime()) / 86400000))
    : 0;
  const aiUsed = usage?.ai_requests_count || 0;
  const aiLimit = 10;

  const handleUpgrade = () => {
    toast.info("Stripe payments coming soon! You'll be able to upgrade to Pro here.");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Manage</p>
          <h1 className="text-2xl font-bold text-foreground">Plan & Billing</h1>
        </div>
      </div>

      {/* Current Plan Status */}
      <div className={`rounded-2xl p-5 border ${isPro ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
        <div className="flex items-center gap-3 mb-3">
          {isPro ? <Crown className="h-6 w-6 text-primary" /> : <Zap className="h-6 w-6 text-muted-foreground" />}
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isPro ? "Pro Plan" : "Free Plan"}
              {trialActive && <span className="text-xs ml-2 text-primary font-normal">(Trial — {daysLeft} days left)</span>}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isPro ? "Unlimited AI reminders & advanced features" : "10 AI reminders per week"}
            </p>
          </div>
        </div>

        {!isPro && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>AI reminders this week</span>
              <span>{aiUsed}/{aiLimit}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (aiUsed / aiLimit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resets every Monday</p>
          </div>
        )}
      </div>

      {/* Plans Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Free Plan */}
        <div className={`rounded-2xl border p-5 ${!isPro ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
          <h3 className="font-bold text-foreground text-lg">Free</h3>
          <p className="text-2xl font-bold text-foreground mt-1">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          <ul className="mt-4 space-y-2">
            {["10 AI reminders/week", "Unlimited manual tasks", "Basic calendar view", "Browser notifications"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <p className="mt-4 text-xs text-center text-primary font-medium">Current Plan</p>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`rounded-2xl border p-5 relative overflow-hidden ${isPro ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            POPULAR
          </div>
          <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
            Pro <Sparkles className="h-4 w-4 text-primary" />
          </h3>
          <p className="text-2xl font-bold text-foreground mt-1">$4.99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          <ul className="mt-4 space-y-2">
            {[
              "Unlimited AI reminders",
              "Priority AI responses",
              "Smart scheduling",
              "Advanced recurring patterns",
              "Cross-device sync",
              "Email reminders",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <p className="mt-4 text-xs text-center text-primary font-medium">Current Plan</p>
          ) : (
            <Button onClick={handleUpgrade} className="w-full mt-4 rounded-full gap-2">
              <Crown className="h-4 w-4" /> Upgrade to Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
