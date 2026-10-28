import { mk, prep, TW, type Shape } from "./gen";
import { swing, step, type Swing } from "./physics";
import {
  mount,
  stop,
  geo,
  restY,
  sprite,
  pin,
  chip,
  view,
  mid,
  dpr,
  type Pt,
  type Geo,
} from "./stage";
import { $, $maybe, app, css, cl, RM, setTitle } from "./dom";
import {
  db,
  RN,
  TODAY,
  NO,
  fmtDate,
  untilNext,
  recoveredSave,
  available,
} from "./store";
import { start, todaySet, ui, live } from "./game";
import { end } from "./end";
import { navBtns, bindNav } from "./sheets";

/** Easy-to-read families for the home lesson, which changes daily. */
let demo: Shape | undefined;
let demoFrame: Geo | null = null;
let D: {
  k: number;
  t0: number;
  ps: Swing | null;
  P: Pt | null;
  end: number;
} | null = null;

function caption(s: string) {
  const c = $maybe("#cap");
  if (!c || c.textContent === s) return;
  c.classList.add("off");
  setTimeout(() => {
    c.textContent = s;
    c.classList.toggle("off", !s);
  }, 200);
}

/** Looping lesson: a pin dropped off-center swings, one dropped on the balance point stays put. */
function homeDemo(t: number, dt: number) {
  const R = demo!,
    g = geo(R, 0.98),
    x = view.cx;
  if (
    demoFrame &&
    (Math.abs(demoFrame.B - g.B) > 1 ||
      Math.abs(demoFrame.o.x - g.o.x) > 1 ||
      Math.abs(demoFrame.o.y - g.o.y) > 1)
  )
    D = null;
  demoFrame = g;
  if (RM) {
    sprite(R, g, g.c, 0);
    pin(g.c.x, g.c.y);
    caption("On the balance point, it stays put.");
    return;
  }
  if (!D) D = { k: 0, t0: t, ps: null, P: null, end: 0 };
  const T = t - D.t0,
    miss = D.k % 2 === 0,
    tg = {
      x: g.c.x + (miss ? g.B * 0.12 : 0),
      y: g.c.y - (miss ? g.B * 0.03 : 0),
    },
    fr = { x: mid().x, y: restY(g) };
  let a = Math.min(1, T / 300);
  if (!D.ps) {
    const u = Math.min(1, Math.max(0, T - 500) / 1100),
      e = 1 - Math.pow(1 - u, 3);
    D.P = { x: fr.x + (tg.x - fr.x) * e, y: fr.y + (tg.y - fr.y) * e };
    if (u >= 1) {
      D.ps = swing(R, g, D.P).ps;
      caption(
        miss
          ? "An off-center pin can make it swing."
          : "Hit it, and it stays put.",
      );
    }
  } else {
    step(D.ps, dt);
    if (!D.end && (D.ps.calm > 0.25 || D.ps.t > 4)) D.end = t;
    if (D.end) {
      const h = t - D.end,
        hold = miss ? 900 : 1700;
      a = 1 - cl((h - hold) / 300, 0, 1);
      if (h > hold + 350) {
        D = { k: D.k + 1, t0: t, ps: null, P: null, end: 0 };
        caption("");
      }
    }
  }
  if (!D.P) return;
  x.globalAlpha = a;
  sprite(R, g, D.P, D.ps ? D.ps.th : 0);
  pin(D.P.x, D.P.y);
  x.globalAlpha = 1;
}

export function home() {
  ui.ph = "home";
  live(null);
  setTitle("");
  app.className = "home-screen";
  if (!available(TODAY)) {
    stop();
    app.innerHTML = `<header class="site-header"><span class="edition">Pinpoise</span>${navBtns()}</header><div class="intro"><h1>Pinpoise</h1><p class="pitch">Every shape in this edition has had its day.</p><p class="home-rule mute">A new edition is needed for fresh daily puzzles. Your archive and results are still here.</p></div>`;
    bindNav();
    return;
  }
  const d = db.days[TODAY],
    cont = db.pg[TODAY],
    today = todaySet();
  if (!demo) {
    const raw = mk("p3|demo" + TODAY + "|classic", 1, "spoon", TW.classic);
    raw.rot = -0.45;
    raw.fl = false;
    demo = prep(raw);
  }
  D = null;
  demoFrame = null;
  const label = d
    ? "View today’s result"
    : cont
      ? `Continue · ${Math.min(cont.length + 1, RN)} of ${RN}`
      : "Play today’s five";
  app.innerHTML = `<header class="site-header"><span class="edition">No. ${NO}<br><span class="mute">${fmtDate(TODAY, true)}</span></span>${navBtns()}</header>
  <div class="intro"><h1>Pinpoise</h1><p class="pitch">Pin each shape at its balance point.</p><p class="home-rule mute small">Aim for the center of mass, even in a gap.<br>Closer pins score more.</p></div>
  <div id="stage"><canvas id="cv" aria-hidden="true"></canvas></div>
  <p class="cap mute small" id="cap" aria-hidden="true"></p>
  <div class="foot home-foot"><div class="edition"><span>${d ? "Today’s five · Complete" : "Today’s five"}</span></div>
  <div class="set" role="img" aria-label="Today’s five objects">${today.map(() => `<canvas width="${80 * dpr}" height="${80 * dpr}"></canvas>`).join("")}</div>
  ${recoveredSave ? '<p class="small mute">An invalid score was set aside. Valid results are safe.</p>' : ""}
  <button class="btn" id="go">${label}</button>
  <button class="mode3d-link" id="go3" type="button" aria-label="Play Pinpoise 3D, three objects"><span class="mode3d-mark" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><path d="m22 5 13 7.5v15L22 35 9 27.5v-15L22 5Z"/><path d="m9 12.5 13 7.5 13-7.5M22 20v15"/><circle cx="22" cy="10" r="3"/><path d="M22 13v8"/></svg></span><span class="mode3d-copy"><b>Pinpoise 3D</b><small>Rotate. Pin. Drop.</small></span><span class="mode3d-cta">3 objects <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg></span></button>
  <p class="small mute" data-next>Next puzzle in ${untilNext()}</p></div>`;
  app.scrollTop = 0;
  const mc = css("--mute");
  document
    .querySelectorAll<HTMLCanvasElement>(".set canvas")
    .forEach((c, i) => chip(c, today[i], mc));
  mount(homeDemo);
  bindNav();
  $("#go").onclick = () => (d ? end(d, false) : start("daily"));
  $("#go3").onclick = async () => (await import("./mode3d")).start3D();
}
