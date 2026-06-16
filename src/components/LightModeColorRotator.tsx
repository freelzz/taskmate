import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  PALETTES,
  PALETTE_EVENT,
  applyPalette,
  applyStoredPalette,
  getAutoPaletteIndex,
  getStoredMode,
} from "@/lib/palettes";

export function LightModeColorRotator() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.remove("palette-background");
      return;
    }
    document.documentElement.classList.add("palette-background");

    let intervalId: number | undefined;

    const run = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
      const mode = getStoredMode();
      if (mode !== "auto") {
        applyStoredPalette(mode);
        return;
      }
      // Auto: start from current minute, advance every TICK_MS.
      let i = getAutoPaletteIndex();
      applyPalette(i);
      intervalId = window.setInterval(() => {
        i = (i + 1) % PALETTES.length;
        applyPalette(i);
      }, 60_000);
    };

    run();
    window.addEventListener(PALETTE_EVENT, run);
    return () => {
      window.removeEventListener(PALETTE_EVENT, run);
      if (intervalId) window.clearInterval(intervalId);
      document.documentElement.classList.remove("palette-background");
    };
  }, [resolvedTheme]);

  return null;
}
