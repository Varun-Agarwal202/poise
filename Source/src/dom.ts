export const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s) as T;
export const $maybe = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s);
export const app = $("#app");
export const css = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const cl = (x: number, a: number, b: number) =>
  Math.min(b, Math.max(a, x));
const rmq = matchMedia("(prefers-reduced-motion: reduce)");
/** Reduced motion: the OS setting, or the in-game override. Live binding, so importers always see the current value. */
export let RM = rmq.matches;
export const sysRM = () => rmq.matches;
export const setRM = (v: boolean) => {
  RM = v;
};

/** Announce a message to screen readers without moving focus. */
export function say(msg: string) {
  const r = $maybe("#sr");
  if (!r) return;
  r.textContent = "";
  setTimeout(() => {
    r.textContent = msg;
  }, 60);
}
export const setTitle = (s: string) => {
  document.title = s ? `${s} · Pinpoise` : "Pinpoise: Find the Balance Point";
};
export const eob = (u: number) =>
  1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);

/** Minimum points and the readable grade. */
export const GRADES: [number, string][] = [
  [90, "Excellent aim"],
  [70, "Very close"],
  [45, "Close"],
  [20, "Off center"],
  [0, "Way off"],
];
export const gi = (p: number) => GRADES.findIndex((q) => p >= q[0]);
/** Shared estimated score distribution used by the rank label and both curve renders. */
export const SCORE_CENTER = 225;
export const SCORE_SPREAD = 110;

export function percentileOf(total: number) {
  const z = (cl(total, 0, 500) - SCORE_CENTER) / (SCORE_SPREAD * Math.SQRT2);
  const a = 0.147;
  const z2 = z * z;
  const erf =
    Math.sign(z) *
    Math.sqrt(1 - Math.exp((-z2 * (4 / Math.PI + a * z2)) / (1 + a * z2)));
  return cl(Math.round(50 * (1 + erf)), 1, 99);
}
export const topPercentOf = (total: number) =>
  Math.max(1, 100 - percentileOf(total));
export const rankOf = (total: number) => `Top ${topPercentOf(total)}%`;

export const gdots = (pts: number[], lg = false) =>
  `<span class="dots${lg ? " lg" : ""}" role="img" aria-label="Grades: ${pts.map((p) => GRADES[gi(p)][1]).join(", ")}">${pts.map((p, i) => `<i class="g${gi(p)}${lg ? " pop" : ""}"${lg ? ` style="animation-delay:${0.85 + i * 0.07}s"` : ""}></i>`).join("")}</span>`;

const IC = {
  home: '<path d="M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10"/>',
  stats: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  archive:
    '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  tune: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.6a2.8 2.8 0 1 1 4 2.5c-.7.4-1.2 1-1.2 1.9"/><path d="M12 17.2h.01"/>',
};
export const ib = (id: string, ic: keyof typeof IC, label: string) =>
  `<button class="ib" id="${id}" aria-label="${label}" title="${label}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${IC[ic]}</svg></button>`;

let toastTimer = 0;
export function toast(s: string) {
  let t = $maybe("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.setAttribute("role", "status");
    document.body.append(t);
  }
  t.textContent = s;
  t.className = "show";
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t!.className = ""), 2200);
}

export async function copy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const a = document.createElement("textarea");
    a.value = s;
    a.style.cssText = "position:fixed;opacity:0";
    document.body.append(a);
    a.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    a.remove();
    return ok;
  }
}

export function countUp(
  el: HTMLElement | null,
  to: number,
  ms: number,
  pre = "",
  delay = 0,
  from = 0,
) {
  if (!el) return;
  if (RM) {
    el.textContent = pre + to;
    return;
  }
  const t0 = performance.now() + delay;
  const f = (n: number) => {
    const p = cl((n - t0) / ms, 0, 1);
    el.textContent =
      pre + Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1 && el.isConnected) requestAnimationFrame(f);
  };
  f(t0 - 1);
}
