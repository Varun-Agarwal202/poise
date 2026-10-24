import { setRM, sysRM } from "./dom";

/** Per-device display and feedback settings. Nothing here touches puzzles, scoring or share results. */
export interface Prefs {
  theme: "auto" | "light" | "dark";
  homeLayout: "auto" | "mobile" | "desktop";
  motion: "auto" | "reduce";
  sound: boolean;
  haptics: boolean;
  cb: boolean;
  contrast: boolean;
  big: boolean;
}
const KEY = "poise:prefs",
  DEF: Prefs = {
    theme: "auto",
    homeLayout: "auto",
    motion: "auto",
    sound: true,
    haptics: true,
    cb: false,
    contrast: false,
    big: false,
  };

export const prefs: Prefs = { ...DEF };
try {
  Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}"));
} catch {}

const metas = [
    ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ],
  orig = metas.map((m) => m.content);
const BG = { light: "#eceef2", dark: "#16181d" };

const homeWidth = matchMedia("(min-width: 640px)");

export function applyPrefs() {
  const h = document.documentElement;
  h.setAttribute(
    "data-home-layout",
    prefs.homeLayout === "desktop" ||
      (prefs.homeLayout !== "mobile" && homeWidth.matches)
      ? "desktop"
      : "mobile",
  );
  prefs.theme === "auto"
    ? h.removeAttribute("data-theme")
    : h.setAttribute("data-theme", prefs.theme);
  h.toggleAttribute("data-cb", prefs.cb);
  h.toggleAttribute("data-contrast", prefs.contrast);
  h.toggleAttribute("data-big", prefs.big);
  setRM(prefs.motion === "reduce" || sysRM());
  h.toggleAttribute("data-reduce", prefs.motion === "reduce" || sysRM());
  metas.forEach(
    (m, i) => (m.content = prefs.theme === "auto" ? orig[i] : BG[prefs.theme]),
  );
}

export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]) {
  prefs[k] = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  applyPrefs();
  dispatchEvent(new Event("poise:prefs"));
}

applyPrefs();
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  applyPrefs,
);

homeWidth.addEventListener("change", applyPrefs);
