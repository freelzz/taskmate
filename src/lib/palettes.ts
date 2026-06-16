// Shared palette definitions for the light-mode background rotator + manual picker.
export type Palette = {
  name: string;
  tints: [string, string, string]; // HSL strings (no hsl() wrapper)
  swatch: string; // hex preview for the picker UI
};

export const PALETTES: Palette[] = [
  { name: "Lavender",  tints: ["260 95% 78%", "280 90% 82%", "230 95% 82%"], swatch: "#b9a8ff" },
  { name: "Mint",      tints: ["175 85% 72%", "195 90% 78%", "155 80% 78%"], swatch: "#7ee8d5" },
  { name: "Peach",     tints: ["20 95% 78%",  "340 90% 82%", "40 95% 80%"],  swatch: "#ffb38a" },
  { name: "Sage",      tints: ["140 75% 72%", "95 70% 78%",  "165 75% 78%"], swatch: "#94e0a8" },
  { name: "Sunshine",  tints: ["48 100% 72%", "28 95% 78%",  "62 95% 78%"],  swatch: "#ffe070" },
  { name: "Orchid",    tints: ["300 80% 80%", "275 80% 82%", "320 80% 82%"], swatch: "#e7a8f0" },
  { name: "Sky",       tints: ["210 95% 78%", "230 90% 82%", "190 85% 78%"], swatch: "#8fc4ff" },
  { name: "Rose",      tints: ["8 90% 80%",   "350 85% 82%", "25 95% 80%"],  swatch: "#ffa599" },
];

export const PALETTE_STORAGE_KEY = "taskmate.palette";
// "auto" or numeric index
export const PALETTE_EVENT = "taskmate:palette-change";
export const PALETTE_TICK_MS = 60_000;

export function applyPalette(index: number) {
  const p = PALETTES[index % PALETTES.length];
  const root = document.documentElement;
  root.style.setProperty("--bg-tint-1", p.tints[0]);
  root.style.setProperty("--bg-tint-2", p.tints[1]);
  root.style.setProperty("--bg-tint-3", p.tints[2]);
}

export function getAutoPaletteIndex() {
  return Math.floor(Date.now() / PALETTE_TICK_MS) % PALETTES.length;
}

export function applyStoredPalette(mode: "auto" | number = getStoredMode()) {
  applyPalette(mode === "auto" ? getAutoPaletteIndex() : mode);
}

export function getStoredMode(): "auto" | number {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(PALETTE_STORAGE_KEY);
  if (!v || v === "auto") return "auto";
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : "auto";
}

export function setStoredMode(mode: "auto" | number) {
  window.localStorage.setItem(PALETTE_STORAGE_KEY, mode === "auto" ? "auto" : String(mode));
  applyStoredPalette(mode);
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}
