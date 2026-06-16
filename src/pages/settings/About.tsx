import { ArrowLeft, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Info</p>
          <h1 className="text-2xl font-bold text-foreground">About</h1>
        </div>
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-6 shadow-ios text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <CheckSquare className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">TaskMate</h2>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          TaskMate is your AI-powered productivity companion. Manage tasks, set reminders, and stay organized — all in one place. Built for professionals, freelancers, and everyone who wants to get more done.
        </p>
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl shadow-ios divide-y divide-border">
        <div className="flex justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">Developer</span>
          <span className="text-sm text-foreground">TaskMate Team</span>
        </div>
        <div className="flex justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">Platform</span>
          <span className="text-sm text-foreground">Web App</span>
        </div>
        <div className="flex justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">License</span>
          <span className="text-sm text-foreground">Proprietary</span>
        </div>
      </div>
    </div>
  );
}
