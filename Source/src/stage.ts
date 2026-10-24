import type { Shape } from "./gen";
import { $, css, eob, cl } from "./dom";

export interface Pt {
  x: number;
  y: number;
}
export interface Geo {
  B: number;
  o: Pt;
  c: Pt;
}
export type Draw = (t: number, dt: number) => void;

export const dpr = Math.min(devicePixelRatio || 1, 2);
/** Backing-store pixel budget for the full-window canvas. Retina laptops would otherwise push ~6M pixels a frame. */
const PIXELS = 4.2e6;
/**
 * The canvas covers the whole window so a swinging object is never clipped.
 * f is the #stage element's rect: the area the object is framed in.
 */
export const view = {
  cv: null as unknown as HTMLCanvasElement,
  cx: null as unknown as CanvasRenderingContext2D,
  W: 0,
  H: 0,
  k: 1,
  hold: false,
  ms: 0,
  f: { x: 0, y: 0, w: 0, h: 0 },
  ink: "#171a21",
  bg: "#eceef2",
};
export const mid = (): Pt => ({
  x: view.f.x + view.f.w / 2,
  y: view.f.y + view.f.h / 2,
});
let ro: ResizeObserver | undefined,
  raf = 0,
  onWin: (() => void) | undefined,
  cleanup: (() => void) | undefined;

export function stop() {
  cleanup?.();
  cleanup = undefined;
  ro?.disconnect();
  cancelAnimationFrame(raf);
  if (onWin) removeEventListener("resize", onWin);
}

/** Run fn whenever el or the window resizes (replaces any running stage). */
export function watch(el: HTMLElement, fn: () => void) {
  stop();
  ro = new ResizeObserver(fn);
  ro.observe(el);
  onWin = fn;
  addEventListener("resize", fn);
}

export function mount(draw: Draw) {
  const cv = $<HTMLCanvasElement>("#cv"),
    st = $("#stage");
  view.cv = cv;
  view.cx = cv.getContext("2d")!;
  view.ink = css("--ink") || view.ink;
  view.bg = css("--bg") || view.bg;
  watch(st, () => {
    const W = innerWidth,
      H = innerHeight,
      r = st.getBoundingClientRect(),
      k = Math.max(1, Math.min(dpr, Math.sqrt(PIXELS / (W * H))));
    if (cv.width !== Math.round(W * k) || cv.height !== Math.round(H * k)) {
      view.W = W;
      view.H = H;
      view.k = k;
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      cv.width = Math.round(W * k);
      cv.height = Math.round(H * k);
    }
    view.f = { x: r.left, y: r.top, w: r.width, h: r.height };
    view.hold = false;
  });
  const sc = $("#app");
  const scroll = () => {
    const r = st.getBoundingClientRect();
    view.f = { x: r.left, y: r.top, w: r.width, h: r.height };
    view.hold = false;
  };
  const theme = () => {
    view.ink = css("--ink");
    view.bg = css("--bg");
    view.hold = false;
  };
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  sc.addEventListener("scroll", scroll, { passive: true });
  addEventListener("poise:prefs", theme);
  colorScheme.addEventListener("change", theme);
  cleanup = () => {
    sc.removeEventListener("scroll", scroll);
    removeEventListener("poise:prefs", theme);
    colorScheme.removeEventListener("change", theme);
  };
  let last = performance.now();
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (!view.W || !view.H || view.hold) return;
    const t0 = performance.now();
    view.cx.setTransform(view.k, 0, 0, view.k, 0, 0);
    view.cx.clearRect(0, 0, view.W, view.H);
    draw(t, dt);
    view.ms = view.ms * 0.9 + (performance.now() - t0) * 0.1;
  };
  raf = requestAnimationFrame(loop);
}

/** Box the shape sprite is drawn into, and its true balance point in canvas pixels. */
export function geo(R: Shape, k = 1): Geo {
  const f = view.f,
    B = Math.min(f.w * 0.94, f.h * 0.92) * k,
    o = { x: f.x + (f.w - B) / 2, y: f.y + (f.h - B) / 2 };
  return { B, o, c: { x: o.x + R.c[0] * B, y: o.y + R.c[1] * B } };
}
/** Where the idle pin waits, just below the shape. */
export const restY = (g: Geo) =>
  Math.min(view.f.y + view.f.h - 6, mid().y + g.B * 0.39 + 44);

export function sprite(R: Shape, g: Geo, P: Pt, th: number, reveal = 0) {
  const x = view.cx;
  x.save();
  x.translate(P.x, P.y);
  x.rotate(th);
  x.translate(-P.x, -P.y);
  x.drawImage(R.sp, g.o.x, g.o.y, g.B, g.B);
  if (reveal) mark(g.c.x, g.c.y, eob(cl(reveal / 0.6, 0, 1)));
  x.restore();
}

/** The true balance point: an ink ring with a paper keyline, so it reads on any material. */
function mark(cx: number, cy: number, s: number) {
  const x = view.cx,
    r = 9 * s;
  if (r <= 0) return;
  x.save();
  x.beginPath();
  x.arc(cx, cy, r, 0, 6.2832);
  x.lineWidth = 6;
  x.strokeStyle = view.bg;
  x.stroke();
  x.lineWidth = 2.5;
  x.strokeStyle = view.ink;
  x.stroke();
  x.beginPath();
  x.arc(cx, cy, 1.75 * s, 0, 6.2832);
  x.fillStyle = view.ink;
  x.fill();
  x.restore();
}

/** Accuracy is read in the original pose; both points and their distance stay visible. */
export function errorLine(P: Pt, C: Pt) {
  const x = view.cx;
  x.save();
  x.beginPath();
  x.moveTo(P.x, P.y);
  x.lineTo(C.x, C.y);
  x.strokeStyle = view.bg;
  x.lineWidth = 6;
  x.stroke();
  x.strokeStyle = view.ink;
  x.lineWidth = 2;
  x.setLineDash([4, 4]);
  x.stroke();
  x.restore();
  mark(C.x, C.y, 1);
}

/** A magnified view above the finger, never an offset to the saved placement. */
export function loupe(R: Shape, g: Geo, P: Pt) {
  const x = view.cx,
    r = 43,
    zoom = 2.4;
  const cx = cl(P.x, r + 8, view.W - r - 8);
  const cy = P.y > 150 ? P.y - 105 : P.y + 105;
  x.save();
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.clip();
  x.fillStyle = view.bg;
  x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  x.translate(cx, cy);
  x.scale(zoom, zoom);
  x.translate(-P.x, -P.y);
  x.drawImage(R.sp, g.o.x, g.o.y, g.B, g.B);
  x.restore();
  x.save();
  x.strokeStyle = view.bg;
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(cx - 9, cy);
  x.lineTo(cx + 9, cy);
  x.moveTo(cx, cy - 9);
  x.lineTo(cx, cy + 9);
  x.stroke();
  x.strokeStyle = view.ink;
  x.lineWidth = 1.5;
  x.stroke();
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.stroke();
  x.restore();
}

const pins = new Map<string, HTMLCanvasElement>();
const PW = 72,
  PH = 96;
/** The pin is drawn once per theme and lift state, then stamped. Flat ink with a paper keyline so it reads on any material. */
function pinSprite(lift: boolean) {
  const key = view.ink + view.bg + lift + view.k;
  let c = pins.get(key);
  if (c) return c;
  const k = view.k;
  c = document.createElement("canvas");
  c.width = PW * k;
  c.height = PH * k;
  const x = c.getContext("2d")!;
  x.scale(k, k);
  x.translate(PW / 2, PH - 14);
  const head = (r: number, y: number) => {
    x.beginPath();
    x.arc(0, y, r, 0, 6.2832);
  };
  x.lineCap = "round";
  x.lineJoin = "round";
  x.save();
  x.globalAlpha = lift ? 0.22 : 0.3;
  x.fillStyle = "#000";
  x.beginPath();
  x.ellipse(0, lift ? 5 : 2, lift ? 8 : 6, lift ? 3 : 2.2, 0, 0, 6.2832);
  x.fill();
  x.restore();
  if (lift) {
    x.strokeStyle = view.ink;
    x.globalAlpha = 0.45;
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(0, 0, 7, 0, 6.2832);
    x.stroke();
    x.globalAlpha = 1;
  }
  const y = lift ? -4 : 0;
  x.strokeStyle = view.bg;
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(0, y);
  x.lineTo(0, y - 26);
  x.stroke();
  x.strokeStyle = view.ink;
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(0, y);
  x.lineTo(0, y - 26);
  x.stroke();
  head(11, y - 31);
  x.lineWidth = 4;
  x.strokeStyle = view.bg;
  x.stroke();
  x.fillStyle = view.ink;
  x.fill();
  pins.set(key, c);
  return c;
}

/** Draw the pin with its tip at (px, py). */
export function pin(px: number, py: number, lift = false, press = 0) {
  const x = view.cx,
    c = pinSprite(lift);
  x.drawImage(c, px - PW / 2, py + press * 3 - (PH - 14), PW, PH);
}

/** Flat-color silhouette of a shape. */
export function chip(c: HTMLCanvasElement, R: Shape, col: string) {
  const x = c.getContext("2d")!,
    W = c.width;
  x.drawImage(R.sp, 0, 0, W, W);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = col;
  x.fillRect(0, 0, W, W);
}

/** Result thumbnail: shape, the player's pin, and the true balance point. */
export function thumb(c: HTMLCanvasElement, R: Shape, pl: number[]) {
  const x = c.getContext("2d")!,
    W = c.width,
    r = W * 0.05;
  x.drawImage(R.sp, 0, 0, W, W);
  const cxp = R.c[0] * W,
    cyp = R.c[1] * W,
    px = pl[0] * W,
    py = pl[1] * W;
  x.strokeStyle = "#fff";
  x.lineWidth = r * 0.5;
  x.beginPath();
  x.moveTo(px, py);
  x.lineTo(cxp, cyp);
  x.stroke();
  x.fillStyle = "#fff";
  x.beginPath();
  x.arc(cxp, cyp, r, 0, 6.2832);
  x.fill();
  x.fillStyle = "#1b1f27";
  x.beginPath();
  x.arc(px, py, r, 0, 6.2832);
  x.fill();
  x.strokeStyle = "#fff";
  x.lineWidth = Math.max(1, r * 0.2);
  x.stroke();
}
