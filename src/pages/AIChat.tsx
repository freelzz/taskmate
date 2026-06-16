import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, User, Loader2, Plus, Trash2, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

const WELCOME_MSG: Message = {
  role: "assistant",
  content:
    "Hi! I'm your AI assistant. I can help you manage tasks and set reminders. Try saying:\n\n• \"Remind me to submit the report by Friday 5pm\"\n• \"Create a task to call the dentist tomorrow at 9am\"\n• \"What productivity tips do you have?\"",
};

export default function AIChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, speakingId } = useTTS();
  const sttBaseRef = useRef("");
  const { isListening, startListening, stopListening, isSupported: sttSupported } = useSpeechToText(
    (text) => setInput(sttBaseRef.current ? sttBaseRef.current + " " + text : text)
  );

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      sttBaseRef.current = input;
      startListening();
    }
  };

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("chat_conversations")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await (supabase as any)
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    } else {
      setMessages([WELCOME_MSG]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-select most recent conversation or start fresh
  useEffect(() => {
    if (conversations.length > 0 && !activeConvId) {
      const latest = conversations[0];
      setActiveConvId(latest.id);
      loadMessages(latest.id);
    }
  }, [conversations, activeConvId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createNewConversation = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("chat_conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select("id, title, created_at")
      .single();
    if (error) {
      toast.error("Failed to create conversation");
      return;
    }
    setActiveConvId(data.id);
    setMessages([WELCOME_MSG]);
    setConversations((prev) => [data, ...prev]);
  };

  const switchConversation = (convId: string) => {
    setActiveConvId(convId);
    loadMessages(convId);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await (supabase as any).from("chat_conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([WELCOME_MSG]);
    }
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await (supabase as any).from("chat_messages").insert({ conversation_id: convId, role, content });
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !user) return;

    let convId = activeConvId;

    // Create conversation if none active
    if (!convId) {
      const { data, error } = await (supabase as any)
        .from("chat_conversations")
        .insert({ user_id: user.id, title: trimmed.slice(0, 50) })
        .select("id, title, created_at")
        .single();
      if (error || !data) {
        toast.error("Failed to start conversation");
        return;
      }
      convId = data.id;
      setActiveConvId(convId);
      setConversations((prev) => [data, ...prev]);
    }

    // Update conversation title if it's the first user message
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) {
      await (supabase as any)
        .from("chat_conversations")
        .update({ title: trimmed.slice(0, 50) })
        .eq("id", convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: trimmed.slice(0, 50) } : c))
      );
    }

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message
    await saveMessage(convId, "user", trimmed);

    try {
      // Build message history (exclude welcome message)
      const allMessages = [...messages.filter((m) => m.id || m.role === "user"), userMsg].map(
        ({ role, content }) => ({ role, content })
      );

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error("Session expired. Please log in again.");
        setIsLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ messages: allMessages, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        }
      );

      if (resp.status === 429) {
        toast.error("Too many requests. Please wait a moment.");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI usage limit reached. Please try again later.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok) {
        toast.error("Failed to get AI response");
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      
      if (data.limit_reached) {
        const limitMsg: Message = { role: "assistant", content: data.content };
        setMessages((prev) => [...prev, limitMsg]);
        await saveMessage(convId, "assistant", data.content);
        setIsLoading(false);
        inputRef.current?.focus();
        return;
      }
      
      const assistantContent = data.content || "Sorry, I couldn't process that.";

      const assistantMsg: Message = { role: "assistant", content: assistantContent };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message
      await saveMessage(convId, "assistant", assistantContent);

      // If tasks were created or deleted, invalidate tasks query
      if (data.tasks_changed) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast.success(data.tasks_created ? "Task created! Check your Tasks page." : "Tasks updated");
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try again.");
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-screen">
      {/* Sidebar - conversations list (desktop only) */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-muted/30">
        <div className="p-3 border-b border-border">
          <Button onClick={createNewConversation} variant="outline" className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm hover:bg-muted transition-colors group ${
                activeConvId === conv.id ? "bg-muted" : ""
              }`}
            >
              <span className="truncate flex-1 text-foreground">{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 max-w-3xl mx-auto px-4 py-4 md:py-6">
        {/* Header: just the new chat button */}
        <div className="flex items-center justify-end mb-3 md:mb-4">
          <Button onClick={createNewConversation} variant="ghost" size="icon" className="glass-pill rounded-full">
            <Plus className="h-5 w-5" />
          </Button>
        </div>


        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pb-4 pr-1">
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2.5 md:px-4 md:py-3 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "glass-card text-foreground rounded-br-md"
                      : "glass-card rounded-bl-md"
                  }`}
                >

                  {msg.content}
                </div>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => speak(msg.content, msg.id || `msg-${i}`)}
                    className="self-start ml-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={speakingId === (msg.id || `msg-${i}`) ? "Stop speaking" : "Read aloud"}
                  >
                    {speakingId === (msg.id || `msg-${i}`) ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 md:gap-3 justify-start">
              <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
              </div>
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>

            </div>
          )}
        </div>

        {/* Input */}
        <div className="glass-card rounded-full flex gap-1.5 p-1.5 items-center">
          {sttSupported && (
            <Button
              onClick={handleMicToggle}
              variant={isListening ? "destructive" : "ghost"}
              className={`rounded-full h-9 w-9 md:h-10 md:w-10 p-0 flex-shrink-0 ${isListening ? "animate-pulse" : ""}`}
              disabled={isLoading}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask me anything or set a reminder..."}
            className="flex-1 h-9 md:h-10 rounded-full bg-transparent border-0 text-sm focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/70"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="rounded-full h-9 w-9 md:h-10 md:w-10 p-0 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
}
