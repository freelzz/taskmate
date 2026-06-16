import { useEffect, useState } from "react";
import { Palette as PaletteIcon, Check } from "lucide-react";
import {
  applyStoredPalette,
  PALETTES,
  PALETTE_EVENT,
  getStoredMode,
  setStoredMode,
} from "@/lib/palettes";

export function PalettePicker() {
  const [mode, setMode] = useState<"auto" | number>("auto");

  useEffect(() => {
    const sync = () => {
      const storedMode = getStoredMode();
      setMode(storedMode);
      applyStoredPalette(storedMode);
    };
    sync();
    window.addEventListener(PALETTE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PALETTE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const choose = (m: "auto" | number) => {
    setStoredMode(m);
    setMode(m);
  };

  return (
    <div className="gradient-charcoal-soft ring-luxury rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-muted-foreground"><PaletteIcon className="h-5 w-5" /></div>
        <span className="flex-1 text-sm font-medium text-foreground">Background Colour</span>
        <button
          onClick={() => choose("auto")}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            mode === "auto"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Auto
        </button>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {PALETTES.map((p, i) => {
          const active = mode === i;
          return (
            <button
              key={p.name}
              onClick={() => choose(i)}
              title={p.name}
              aria-label={p.name}
              className={`relative aspect-square rounded-full transition-transform hover:scale-110 ${
                active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
              }`}
              style={{ backgroundColor: p.swatch }}
            >
              {active && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-foreground" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2.5">
        {mode === "auto" ? "Rotates every minute in light mode." : "Locked to your pick."}
      </p>
    </div>
  );
}
