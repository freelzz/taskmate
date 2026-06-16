import { ArrowLeft, MessageSquare, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const helpItems = [
  {
    icon: FileText,
    title: "Getting Started",
    description: "Learn how to create projects, add tasks, and set reminders with the AI assistant.",
  },
  {
    icon: MessageSquare,
    title: "Using AI Assistant",
    description: "The AI chatbot can help you set reminders, manage tasks, and provide productivity tips. Just type naturally!",
  },
  {
    icon: Mail,
    title: "Contact Support",
    description: "Need help? Reach out to our support team at support@taskmate.app",
  },
];

export default function HelpCenter() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Support</p>
          <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        </div>
      </div>

      <div className="space-y-3">
        {helpItems.map((item, i) => (
          <div key={i} className="gradient-charcoal-soft ring-luxury rounded-2xl p-5 shadow-ios card-hover">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-xl">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-6 shadow-ios">
        <h3 className="font-semibold text-foreground mb-2">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {[
            { q: "How do I create a task?", a: "Go to the Tasks page and tap 'Create Task', or ask the AI assistant to create one for you." },
            { q: "Can I set recurring reminders?", a: "Currently, reminders are one-time. Recurring reminders are coming soon!" },
            { q: "Is my data secure?", a: "Yes, all data is encrypted and stored securely. Only you can access your information." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
              <p className="text-sm font-medium text-foreground">{faq.q}</p>
              <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
