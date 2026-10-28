import "./style.css";
import "./prefs";
import { track } from "./analytics";
import {
  db,
  TODAY,
  PINNED,
  ds,
  dnOf,
  streakNow,
  playedCount,
  untilNext,
  puzzleOf,
} from "./store";
import { CH } from "./share";
import { G, ui, start, live } from "./game";
import { home } from "./home";
import { geo, view, sprite, pin } from "./stage";
import { build, famsFor, scoreOf, scoreOf2 } from "./gen";
import { swing, step } from "./physics";
import { initAccount } from "./auth";

void initAccount();
addEventListener("pinpoise:sync", () => {
  if (ui.ph === "home") home();
});

track("landing", {
  puzzle: dnOf(TODAY) + 1,
  returning: playedCount() > 0,
  played_today: !!db.days[TODAY],
  streak: streakNow(),
  via: CH ? "challenge" : "direct",
  ref: document.referrer ? new URL(document.referrer).hostname : "",
});
if (CH)
  track("challenge_open", {
    puzzle: CH.n,
    their_total: CH.tot,
    already_played: !!db.days[CH.d],
  });

setInterval(() => {
  if (!PINNED && ds(new Date()) !== TODAY) {
    if (ui.ph === "home" || ui.ph === "end" || ui.ph === "mode3d")
      location.reload();
    return;
  }
  document
    .querySelectorAll("[data-next]")
    .forEach((e) => (e.textContent = "Next puzzle in " + untilNext()));
}, 30000);

const lv = live();
if (lv && !CH) start(lv.m, lv.d);
else home();

// Dev-only hooks for the Playwright QA scripts in .qa/
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  Object.defineProperties(w, {
    ph: { get: () => ui.ph },
    G: { get: () => G },
    cv: { get: () => view.cv },
  });
  Object.assign(w, {
    geo,
    home,
    __ms: () => view.ms,
    streakNow,
    db,
    __poise: {
      sprite,
      pin,
      build,
      famsFor,
      scoreOf,
      scoreOf2,
      puzzleOf,
      swing,
      step,
    },
  });
}

// Offline support, in production builds only so dev reloads are never served stale.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  !new URLSearchParams(location.search).has("debug")
) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
