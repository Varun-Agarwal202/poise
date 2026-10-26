import {
  build,
  scoreOf2,
  cmShown,
  EXT,
  MAT,
  type Shape,
  type Twist,
} from "./gen";
import { swing, step, seated, SEAT, type Swing } from "./physics";
import {
  mount,
  geo,
  restY,
  sprite,
  errorLine,
  loupe,
  pin,
  view,
  mid,
  type Pt,
  type Geo,
} from "./stage";
import {
  $,
  $maybe,
  app,
  cl,
  eob,
  RM,
  GRADES,
  gi,
  percentileOf,
  countUp,
  say,
  setTitle,
} from "./dom";
import {
  db,
  save,
  RN,
  TODAY,
  YEST,
  dnOf,
  noOf,
  playedCount,
  puzzleOf,
  available,
  type Mode,
  type Rec,
} from "./store";
import { track } from "./analytics";
import { flag } from "./flags";
import { snd, buzz } from "./audio";
import { vsFor } from "./share";
import { end } from "./end";
import { navBtns, bindNav } from "./sheets";

export type Phase = "home" | "aim" | "swing" | "result" | "end";
export const ui = { ph: "home" as Phase };

interface Result {
  pts: number;
  lp: number[];
  dm: number;
}
interface Drop extends Result {
  e: number;
  P: Pt;
}
interface Game {
  frame: Geo | null;
  m: Mode;
  d: string;
  seed: string;
  fams: string[];
  tw: Twist | null;
  rounds: Shape[];
  r: number;
  res: Result[];
  P: Pt | null;
  t0: number;
  rv: number;
  coach: boolean;
  drag: boolean;
  touch: boolean;
  precision: boolean;
  ps: Swing | null;
  cur: Drop | null;
  out: number;
  armed: boolean;
  kbf: boolean;
}
export let G: Game | null = null;

let today: Shape[] | undefined;
export const todaySet = () => {
  if (!today) {
    const p = puzzleOf(TODAY);
    today = build(p.seed, p.fams);
  }
  return today;
};

const cmOf = (dm: number) => cmShown(dm * 100);
const total = (g: Game) => g.res.reduce((a, b) => a + b.pts, 0);

function verdict(cm: number, p: Swing) {
  const accuracy = `${cm.toFixed(1)} cm from the center of mass.`;
  if (RM) return `${accuracy} Motion is off.`;
  const degrees = (p.peak * 180) / Math.PI;
  const motion =
    degrees < 0.5
      ? "It held still."
      : degrees < 5
        ? "Only a slight rotation."
        : `It swung ${Math.round(degrees)}° from its starting pose.`;
  return `${accuracy} ${motion}`;
}

export function start(m: Mode, d = TODAY) {
  if (!available(d)) return;
  if (db.days[d]) return end(db.days[d], false);
  m = d === TODAY ? "daily" : "archive";
  const { seed, fams, tw } = puzzleOf(d);
  const g: Game = (G = {
    frame: null,
    m,
    d,
    seed,
    fams,
    tw,
    rounds: m === "daily" && d === TODAY ? todaySet() : build(seed, fams),
    r: 0,
    res: [],
    P: null,
    t0: 0,
    rv: 0,
    coach: false,
    drag: false,
    touch: false,
    precision: false,
    ps: null,
    cur: null,
    out: 0,
    armed: false,
    kbf: false,
  });
  const pr = db.pg[d];
  if (pr) {
    g.res = pr.map((q) => ({ pts: q.pts, lp: q.lp, dm: q.cm / 100 }));
    g.r = g.res.length;
  }
  live({ m, d });
  track("game_start", {
    mode: m,
    puzzle: dnOf(d) + 1,
    resumed_at: g.r,
    twist: tw?.id ?? "none",
  });
  if (m !== "daily") track("replay", { mode: m, puzzle: dnOf(d) + 1 });
  g.r >= RN ? finish() : round();
}

/** The game this tab is in the middle of, so a reload drops you back into it rather than on the home page. */
const LIVE = "poise:live";
export function live(v?: { m: Mode; d: string } | null) {
  try {
    if (v === undefined) {
      const s = JSON.parse(sessionStorage.getItem(LIVE) || "null");
      return s && available(s.d) && db.pg[s.d] && !db.days[s.d]
        ? (s as { m: Mode; d: string })
        : null;
    }
    v
      ? sessionStorage.setItem(LIVE, JSON.stringify(v))
      : sessionStorage.removeItem(LIVE);
  } catch {}
  return null;
}

function matsOf(R: Shape) {
  return [
    ...new Set(
      R.parts
        .map((q) => String(q[0]).replace("+", ""))
        .filter((t) => t !== "X"),
    ),
  ].sort((a, b) => MAT[a][1] - MAT[b][1]);
}

function legend(R: Shape) {
  const u = matsOf(R);
  const densities = u.map((t) => MAT[t][1]);
  const minDensity = Math.min(...densities);
  const maxDensity = Math.max(...densities);
  const items = u
    .map((t) => {
      const name = t[0].toUpperCase() + t.slice(1);
      const density = MAT[t][1];
      const ratio = density / minDensity;
      const ratioText = (
        ratio < 10 ? ratio.toFixed(1) : ratio.toFixed(0)
      ).replace(".0", "");
      const width = Math.max(12, (density / maxDensity) * 100);
      const color = MAT[t][0] || R.a;
      return `<span class="lg-item" role="listitem" style="--material:${color}" aria-label="${name}, ${ratioText} times the lightest material, density ${density} grams per cubic centimetre"><span class="lg-name"><i class="lg-swatch"></i><b>${name}</b><em>${ratioText}×</em></span><span class="lg-track" aria-hidden="true"><i style="width:${width}%"></i></span><small class="lg-density">${density} g/cm³</small></span>`;
    })
    .join("");
  return `<div class="lg-wrap"><div class="lg-title"><b>Density</b><span>More density. More pull.</span></div><div class="lg" role="list" aria-label="Material density, lightest first">${items}</div></div>`;
}
const dots = (g: Game) =>
  `<span class="dots" role="img" aria-label="Shape ${Math.min(g.r + 1, RN)} of ${RN}">${[...Array(RN)].map((_, i) => `<i class="${i < g.res.length ? "g" + gi(g.res[i].pts) : i === g.r ? "cur" : ""}"></i>`).join("")}</span>`;

const DRAG_HINT = "Place the pin, adjust it, then press Drop pin.";
const KEY_HINT =
  "Arrow keys move the pin. Shift for bigger steps. Enter drops.";
const TAP_HINT = "Tap to place the pin, drag to adjust, then press Drop pin.";
/** Plain-language description of the object, for the canvas label. Never says where it balances. */
function describe(R: Shape) {
  const u = matsOf(R);
  return `${R.name}. Made of ${u.join(" and ")}${u.length > 1 ? `: ${u[0]} is the lightest, ${u[u.length - 1]} the heaviest` : ""}.`;
}

function round() {
  const g = G!,
    R = g.rounds[g.r];
  app.className = "play-screen";
  ui.ph = "aim";
  g.P = null;
  g.frame = null;
  g.armed = false;
  g.drag = false;
  g.precision = false;
  g.t0 = performance.now();
  g.coach = g.r === 0 && flag("coach") && !playedCount();
  setTitle(`${"No. " + noOf(g.d)} · Shape ${g.r + 1} of ${RN}`);
  const hint = g.coach
    ? "Heavier parts pull more. Place the pin, then drop it."
    : matchMedia("(pointer:coarse)").matches
      ? TAP_HINT
      : DRAG_HINT;
  app.innerHTML = `<header class="site-header"><span class="wordmark">Pinpoise</span>${navBtns()}</header>
  <div class="round-header"><span class="mute">No. ${noOf(g.d)} / Object ${g.r + 1} of ${RN}</span>${dots(g)}<span><b id="sc">${total(g)}</b><span class="mute"> / 500</span></span></div>
  <div id="stage"><canvas id="cv"></canvas></div><div class="foot fx" id="ft"><div class="object-heading"><h1 class="lede">${R.name}</h1>${legend(R)}</div><p class="small rule">Aim for the center of mass. It can lie in a gap.</p><span class="mute small" id="hint">${hint}</span><button class="btn" id="dp" disabled>Drop pin</button></div>`;
  app.scrollTop = 0;
  bindNav();
  mount(draw);
  const cv = view.cv,
    ft = $("#ft");
  cv.tabIndex = 0;
  cv.setAttribute("role", "application");
  cv.setAttribute(
    "aria-label",
    `${describe(R)} The center of mass can lie in a gap. Use the arrow keys to move the pin, and Enter to drop it.`,
  );
  const say1 = debounce((p: Pt) => {
    const gm = geo(R);
    say(
      `Pin ${Math.round(((p.x - gm.o.x) / gm.B) * 100)} percent across, ${Math.round(((p.y - gm.o.y) / gm.B) * 100)} percent down.`,
    );
  }, 450);
  const setHint = (t: string) => {
    const h = $maybe("#hint");
    if (h && ui.ph === "aim") h.textContent = t;
  };
  const arm = () => {
    g.armed = true;
    $<HTMLButtonElement>("#dp").disabled = false;
  };
  $("#dp").onclick = commit;
  let origin: Pt | null = null;
  /** The pin can only live inside the object's box; presses just outside it are ignored. */
  const SLACK = 10;
  const bounds = () => {
    const gm = geo(R);
    return {
      x0: Math.max(0, gm.o.x),
      y0: Math.max(0, gm.o.y),
      x1: Math.min(view.W, gm.o.x + gm.B),
      y1: Math.min(view.H, gm.o.y + gm.B),
    };
  };
  const move = (e: PointerEvent) => {
    if (ui.ph !== "aim") return;
    if (
      g.touch &&
      origin &&
      Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 8
    )
      g.precision = true;
    const r = cv.getBoundingClientRect(),
      b = bounds();
    g.P = {
      x: cl(e.clientX - r.left, b.x0, b.x1),
      y: cl(e.clientY - r.top, b.y0, b.y1),
    };
    arm();
  };
  cv.onpointerdown = (e) => {
    if (ui.ph === "swing") {
      g.ps!.fast = 1;
      return;
    }
    if (ui.ph !== "aim") return;
    // Ignore presses outside the play area (e.g. a near-miss on the Drop pin button).
    {
      const r = cv.getBoundingClientRect(),
        b = bounds(),
        px = e.clientX - r.left,
        py = e.clientY - r.top;
      if (
        px < b.x0 - SLACK ||
        px > b.x1 + SLACK ||
        py < b.y0 - SLACK ||
        py > b.y1 + SLACK
      )
        return;
    }
    cv.setPointerCapture(e.pointerId);
    g.touch = e.pointerType !== "mouse";
    g.drag = true;
    g.precision = false;
    origin = { x: e.clientX, y: e.clientY };
    move(e);
    snd(520, 0.04, "sine", 0.04);
    buzz(6);
    cv.onpointermove = move;
    cv.onpointerup = cv.onpointercancel = () => {
      cv.onpointermove = cv.onpointerup = cv.onpointercancel = null;
      g.drag = false;
      g.precision = false;
      if (ui.ph === "aim") arm();
    };
  };

  cv.onkeydown = (e) => {
    if (ui.ph !== "aim") return;
    const k = e.key,
      d = e.shiftKey ? 12 : 3,
      P = g.P || (g.P = { ...mid() }),
      b = bounds();
    if (k === "ArrowLeft") P.x = cl(P.x - d, b.x0, b.x1);
    else if (k === "ArrowRight") P.x = cl(P.x + d, b.x0, b.x1);
    else if (k === "ArrowUp") P.y = cl(P.y - d, b.y0, b.y1);
    else if (k === "ArrowDown") P.y = cl(P.y + d, b.y0, b.y1);
    else if (k === "Enter" || k === " ") {
      commit();
      e.preventDefault();
      return;
    } else if (k === "Escape" && g.armed) {
      cv.blur();
      return;
    } else return;
    e.preventDefault();
    arm();
    say1(P);
  };
  cv.onfocus = () => {
    g.kbf = cv.matches(":focus-visible");
    if (g.kbf) setHint(KEY_HINT);
  };
  cv.onblur = () => {
    g.kbf = false;
    setHint(hint);
  };
  // Move focus to the object each round, so keyboard and screen-reader users continue where they left off.
  if (g.r > 0 || document.activeElement === document.body)
    cv.focus({ preventScroll: true });
  void ft;
}

const debounce = <A extends unknown[]>(f: (...a: A) => void, ms: number) => {
  let t = 0;
  return (...a: A) => {
    clearTimeout(t);
    t = window.setTimeout(() => f(...a), ms);
  };
};

function ghost(t: number, gm: ReturnType<typeof geo>) {
  const g = G!,
    u = ((t - g.t0) % 2200) / 2200,
    e = u < 0.7 ? 1 - Math.pow(1 - u / 0.7, 3) : 1,
    y0 = restY(gm),
    y = y0 - e * (y0 - (mid().y + gm.B * 0.08)),
    a = u < 0.08 ? u / 0.08 : u > 0.85 ? (1 - u) / 0.15 : 1,
    x = view.cx;
  x.save();
  x.globalAlpha = 0.22 * a;
  x.fillStyle = view.ink;
  x.beginPath();
  x.arc(mid().x, y + 34, 22, 0, 6.2832);
  x.fill();
  x.restore();
  return { x: mid().x, y };
}

function draw(t: number, dt: number) {
  const g = G!,
    R = g.rounds[g.r],
    gm = geo(R),
    M = mid(),
    x = view.cx;
  // Keep a placed pin attached to the same point on the object when the viewport changes.
  if (g.frame && g.P && g.frame.B > 0) {
    const before = g.frame;
    g.P = {
      x: gm.o.x + ((g.P.x - before.o.x) / before.B) * gm.B,
      y: gm.o.y + ((g.P.y - before.o.y) / before.B) * gm.B,
    };
    if (g.cur)
      g.cur.P = {
        x: gm.o.x + g.cur.lp[0] * gm.B,
        y: gm.o.y + g.cur.lp[1] * gm.B,
      };
  }
  g.frame = gm;
  if (!RM && ui.ph === "swing") step(g.ps!, dt);
  if (ui.ph === "swing" && (RM || g.ps!.calm > 0.14 || g.ps!.t > 4)) result();
  // Once the reveal is done and the object is at rest, stop redrawing until something changes.
  view.hold = ui.ph === "result" && !g.out && t - g.rv > 900;
  if (ui.ph === "aim") {
    const P = g.P || M,
      u = RM ? 1 : cl((t - g.t0) / 320, 0, 1),
      s = 0.6 + 0.4 * eob(u);
    x.save();
    x.globalAlpha = u;
    x.translate(M.x, M.y);
    x.scale(s, s);
    x.translate(-M.x, -M.y);
    sprite(R, gm, P, 0);
    x.restore();
    const q =
      g.P ||
      (g.coach && !RM
        ? ghost(t, gm)
        : {
            x: M.x + (RM ? 0 : Math.sin((t - g.t0) / 500) * gm.B * 0.06),
            y: restY(gm),
          });
    x.save();
    x.strokeStyle = view.ink;
    x.globalAlpha = 0.14 * u;
    x.lineWidth = 1.5;
    x.setLineDash([5, 6]);
    x.beginPath();
    x.roundRect(gm.o.x, gm.o.y, gm.B, gm.B, 16);
    x.stroke();
    x.restore();
    pin(q.x, q.y);
    if (g.touch && g.drag && g.precision && g.P) loupe(R, gm, g.P);
    if (g.kbf) focusFrame();
  } else if (g.cur) {
    const fade = g.out ? 1 - cl((t - g.out) / OUT, 0, 1) : 1,
      press = ui.ph === "swing" && !RM ? Math.sin(Math.PI * seated(g.ps!)) : 0;
    x.globalAlpha = fade;
    const reveal = ui.ph === "result";
    const u = RM ? 1 : cl((t - g.rv) / 260, 0, 1);
    const angle = RM ? 0 : reveal ? g.ps!.th * (1 - u) ** 3 : g.ps!.th;
    sprite(R, gm, g.cur.P, angle);
    if (reveal && u >= 1) errorLine(g.cur.P, gm.c);
    pin(g.cur.P.x, g.cur.P.y, false, press);
    x.globalAlpha = 1;
  }
}
/** Keyboard focus indicator: a dashed frame around the play area. */
function focusFrame() {
  const x = view.cx,
    f = view.f,
    i = 8;
  x.save();
  x.strokeStyle = view.ink;
  x.lineWidth = 2;
  x.setLineDash([7, 6]);
  x.globalAlpha = 0.7;
  x.beginPath();
  x.roundRect(f.x + i, f.y + i, f.w - 2 * i, f.h - 2 * i, 14);
  x.stroke();
  x.restore();
}
/** Fade-out before the next round, ms. */
const OUT = 180;

function commit() {
  if (ui.ph !== "aim" || !G || G.res.length !== G.r || G.r >= RN) return;
  const g = G,
    R = g.rounds[g.r],
    gm = geo(R),
    P = g.P;
  if (!P) return;
  $<HTMLButtonElement>("#dp").disabled = true;
  const { dm, ps } = swing(R, gm, P, RM ? 0 : SEAT),
    e = dm / EXT,
    pts = scoreOf2(cmOf(dm));
  if (RM) ps.th = 0;
  g.ps = ps;
  g.cur = {
    e,
    pts,
    dm,
    P: { ...P },
    lp: [(P.x - gm.o.x) / gm.B, (P.y - gm.o.y) / gm.B],
  };
  g.res.push(g.cur);
  ui.ph = "swing";
  snd(220, 0.09, "triangle", 0.07);
  buzz(10);
  {
    db.pg[g.d] = g.res.map((q) => ({ pts: q.pts, lp: q.lp, cm: cmOf(q.dm) }));
    save();
  }
  track("round_complete", {
    mode: g.m,
    puzzle: dnOf(g.d) + 1,
    round: g.r + 1,
    pts,
    cm: cmOf(dm),
  });
}

function result() {
  if (ui.ph === "result") return;
  const g = G!,
    c = g.cur!,
    lastR = g.r === RN - 1,
    cm = c.dm * 100,
    k = gi(c.pts),
    tot = total(g);
  ui.ph = "result";
  g.rv = performance.now();
  [[784, 988, 1319], [659, 880], [587], [294], [196]][k].forEach((f, i) =>
    snd(f, 0.24, k < 3 ? "triangle" : "sine", 0.06, 0.18 + i * 0.09),
  );
  buzz(k === 0 ? [12, 40, 12, 40, 24] : k < 2 ? [15, 30, 15] : k < 3 ? 20 : 40);
  $(".round-header .dots").outerHTML = dots(g);
  const vs = vsFor(g.d);
  $("#ft").innerHTML =
    `<div class="row pop"><span class="big c${k}">${GRADES[k][1]}</span><span class="ptw"><span class="pts" id="rp">+0</span>${vs ? `<span class="mute small">Friend +${vs.pts[g.r]}</span>` : ""}</span></div>
  <span class="mute small">${verdict(cm, g.ps!)}</span>
  <span class="vh" id="rs">${GRADES[k][1]}. ${verdict(cm, g.ps!)} ${c.pts} points. Total ${tot} so far.</span>
  <button class="btn" id="nx" aria-describedby="rs">${lastR ? "See results" : "Next shape"}</button>`;
  setTitle(`${GRADES[k][1]} +${c.pts} · Shape ${g.r + 1} of ${RN}`);
  countUp($("#rp"), c.pts, 520, "+", 180);
  countUp($("#sc"), tot, 520, "", 180, tot - c.pts);
  const nx = $("#nx");
  nx.onclick = () => {
    if (g.out) return;
    view.hold = false;
    g.out = performance.now();
    setTimeout(
      () => {
        if (G !== g || ui.ph !== "result") return;
        g.out = 0;
        if (lastR) finish();
        else {
          g.r++;
          round();
        }
      },
      RM ? 0 : OUT,
    );
  };
  nx.focus({ preventScroll: true });
}

function finish() {
  const g = G!;
  if (g.res.length !== RN) return;
  const tot = total(g);
  live(null);
  const rec: Rec = {
    tot,
    pts: g.res.map((r) => r.pts),
    cm: g.res.map((r) => cmOf(r.dm)),
    seed: g.seed,
    fams: g.fams,
    pins: g.res.map((r) => r.lp),
    m: g.m,
    d: g.d,
    at: Date.now(),
  };
  let isNew = false;
  {
    if (!db.days[g.d]) {
      isNew = db.best > 0 && tot > db.best;
      db.best = Math.max(db.best, tot);
      db.days[g.d] = rec;
      if (g.m === "daily" && g.d === TODAY) {
        db.streak =
          db.last === YEST ? db.streak + 1 : db.last === TODAY ? db.streak : 1;
        db.last = TODAY;
        db.max = Math.max(db.max, db.streak);
      }
    }
    delete db.pg[g.d];
    save();
  }
  if (g.m === "daily")
    track("daily_complete", {
      puzzle: dnOf(g.d) + 1,
      total: tot,
      percentile: percentileOf(tot),
      streak: db.streak,
      twist: g.tw?.id ?? "none",
    });
  end(rec, isNew);
}
