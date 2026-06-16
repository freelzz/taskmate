import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function PrivacySecurity() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Settings</p>
          <h1 className="text-2xl font-bold text-foreground">Privacy & Security</h1>
        </div>
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-6 shadow-ios space-y-4">
        <h3 className="font-semibold text-foreground">Change Password</h3>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11"
          />
        </div>
        <Button onClick={handleChangePassword} disabled={saving} className="rounded-full">
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-6 shadow-ios space-y-3">
        <h3 className="font-semibold text-foreground">Account Security</h3>
        <p className="text-sm text-muted-foreground">
          Your account is protected with email-based authentication. Enable two-factor authentication for additional security.
        </p>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-foreground">Two-Factor Authentication</span>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
