import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LightModeColorRotator } from "@/components/LightModeColorRotator";


// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

import Tasks from "./pages/Tasks";
import CalendarPage from "./pages/Calendar";
import AIChat from "./pages/AIChat";
import Settings from "./pages/Settings";
import ProfileInfo from "./pages/settings/ProfileInfo";
import PrivacySecurity from "./pages/settings/PrivacySecurity";
import Notifications from "./pages/settings/Notifications";
import VoiceLanguage from "./pages/settings/VoiceLanguage";
import HelpCenter from "./pages/settings/HelpCenter";
import About from "./pages/settings/About";
import Subscription from "./pages/settings/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <LightModeColorRotator />
      <TooltipProvider>
        <Toaster />
      <Sonner />

      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
            <Route
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/profile" element={<ProfileInfo />} />
              <Route path="/settings/privacy" element={<PrivacySecurity />} />
              <Route path="/settings/notifications" element={<Notifications />} />
              <Route path="/settings/voice-language" element={<VoiceLanguage />} />
              <Route path="/settings/help" element={<HelpCenter />} />
              <Route path="/settings/about" element={<About />} />
              <Route path="/settings/subscription" element={<Subscription />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
