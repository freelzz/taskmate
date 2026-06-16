import { useState, useRef, TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";

const slides = [
  {
    icon: Sparkles,
    headline: "Stay on top of everything",
    sub: "Your AI-powered task manager that thinks ahead for you.",
    detail: "Smart reminders, zero stress.",
    accent: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Brain,
    headline: "Let AI do the heavy lifting",
    sub: "Just tell your assistant what you need.",
    detail: "It'll create tasks, set reminders, and keep you on track automatically.",
    accent: "from-accent/40 to-accent/10",
    iconBg: "bg-accent",
    iconColor: "text-accent-foreground",
  },
  {
    icon: Rocket,
    headline: "Start free, stay organized",
    sub: "Get 1 month of Pro completely free.",
    detail: "Unlimited AI reminders, smart scheduling, and more — no credit card needed.",
    accent: "from-primary/15 to-accent/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [phase, setPhase] = useState<"in" | "out">("in");
  const touchStart = useRef(0);

  const slide = slides[current];
  const Icon = slide.icon;
  const isLast = current === slides.length - 1;

  const goTo = (idx: number) => {
    if (idx === current || phase === "out") return;
    setDirection(idx > current ? "left" : "right");
    setPhase("out");
    setTimeout(() => {
      setCurrent(idx);
      setPhase("in");
    }, 300);
  };

  const handleNext = () => {
    if (isLast) navigate("/signup");
    else goTo(current + 1);
  };

  const onTouchStart = (e: TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < slides.length - 1) goTo(current + 1);
      else if (diff < 0 && current > 0) goTo(current - 1);
    }
  };

  const enterClass = direction === "left" ? "translate-x-0 opacity-100" : "translate-x-0 opacity-100";
  const exitClass = direction === "left" ? "-translate-x-12 opacity-0" : "translate-x-12 opacity-0";
  const preEnterClass = direction === "left" ? "translate-x-12 opacity-0" : "-translate-x-12 opacity-0";
  const contentClass = phase === "out" ? exitClass : phase === "in" ? enterClass : preEnterClass;

  return (
    <div
      className="flex min-h-screen flex-col bg-background relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Glow background */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${slide.accent} pointer-events-none transition-all duration-700`}
      />

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-8 text-center relative z-10">
        <div
          key={current}
          className={`max-w-md space-y-6 transition-all duration-300 ease-out ${contentClass}`}
        >
          {/* Icon */}
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${slide.iconBg}`}
          >
            <Icon className={`h-10 w-10 ${slide.iconColor}`} />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            {slide.headline}
          </h1>

          {/* Sub */}
          <p className="text-lg text-muted-foreground">{slide.sub}</p>

          {/* Detail */}
          <p className="text-sm text-muted-foreground/80">{slide.detail}</p>

          {/* Trial badges on last slide */}
          {current === 2 && (
            <div className="flex flex-col gap-2 items-center pt-2">
              {["No credit card required", "Cancel anytime", "Full Pro features"].map((t) => (
                <span key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-8 pb-12 pt-4 space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 max-w-md mx-auto">
          {!isLast && (
            <Button
              variant="ghost"
              className="flex-1 rounded-full h-12 text-muted-foreground"
              onClick={() => navigate("/signup")}
            >
              Skip
            </Button>
          )}
          <Button className="flex-1 rounded-full h-12" onClick={handleNext}>
            {isLast ? "Get Started" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
