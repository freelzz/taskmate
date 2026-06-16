import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Mic } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "", label: "Auto (device default)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-IN", label: "English (India)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "es-MX", label: "Español (México)" },
  { code: "fr-FR", label: "Français (France)" },
  { code: "de-DE", label: "Deutsch (Deutschland)" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "pt-PT", label: "Português (Portugal)" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "sv-SE", label: "Svenska" },
  { code: "pl-PL", label: "Polski" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "ru-RU", label: "Русский" },
  { code: "uk-UA", label: "Українська" },
  { code: "ar-SA", label: "العربية" },
  { code: "he-IL", label: "עברית" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "zh-TW", label: "中文 (繁體)" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "th-TH", label: "ไทย" },
];

export default function VoiceLanguage() {
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    setSelected(localStorage.getItem("stt-language") || "");
  }, []);

  const choose = (code: string) => {
    setSelected(code);
    if (code) localStorage.setItem("stt-language", code);
    else localStorage.removeItem("stt-language");
    toast.success("Speech language updated");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-6">
        <p className="text-xs text-muted-foreground">Preferences</p>
        <h1 className="text-2xl font-bold text-foreground">Voice & Language</h1>
      </div>

      <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-4 mb-4 flex gap-3">
        <Mic className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Speech-to-Text Language</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pick the language you usually speak in. This dramatically improves
            accuracy on mobile, especially for accented or mixed speech.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {LANGUAGES.map((lang) => {
          const isActive = selected === lang.code;
          return (
            <button
              key={lang.code || "auto"}
              onClick={() => choose(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "gradient-charcoal-soft ring-luxury text-foreground hover:bg-accent/50"
              }`}
            >
              <span className="flex-1">{lang.label}</span>
              {lang.code && (
                <span className={`text-xs ${isActive ? "opacity-70" : "text-muted-foreground"}`}>
                  {lang.code}
                </span>
              )}
              {isActive && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
