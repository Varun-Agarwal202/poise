import { BOXM, PERFECT_CM, type Shape } from "./gen";
import type { Geo, Pt } from "./stage";

/** Distance-driven rotational feedback around a fixed pin.
 * Shape inertia still affects the pace, but a narrow frequency range keeps
 * equally accurate guesses feeling consistent. Viscous damping gives the
 * object one readable overshoot before it settles. */
export interface Swing {
  /** Unscaled resting angle, signed so mirrored placements fall opposite ways. */
  target: number;
  w2: number;
  /** Fraction of the full pendulum rotation this pin allows, 0..1. */
  amp: number;
  /** Raw pendulum angle, before grip is applied. */
  u: number;
  /** Displayed angle: u * amp. */
  th: number;
  om: number;
  peak: number;
  t: number;
  acc: number;
  calm: number;
  fast: number;
  wait: number;
}
/** Damping ratio: one soft overshoot rather than several fast oscillations. */
export const ZETA = 0.46;
/** Simulation speed relative to wall-clock time. */
export const TEMPO = 1;
/** Angular-frequency limits keep different shapes close in presentation speed. */
export const W_MIN = 4.1;
export const W_MAX = 5.4;
/** A visible miss should never flash through before the player can read it. */
export const MIN_WOBBLE_TIME = 0.8;
export const SEAT = 0.2;
/** How much of the pendulum's full rotation a miss of dm metres produces.
 * 0 inside the 100-point zone, then (in degrees of a sideways miss)
 * 0.5 cm→5°, 1→18°, 2→41°, 3→59°, 4→71°, 6→83°, 8→88°. */
export const tilt = (dm: number) => {
  const cm = dm * 100;
  return cm <= PERFECT_CM
    ? 0
    : 1 - Math.exp(-Math.pow((cm - PERFECT_CM) / 2.6, 1.2));
};

export function swing(R: Shape, g: Geo, P: Pt, wait = SEAT) {
  const dx = g.c.x - P.x,
    dy = g.c.y - P.y;
  const dm = (Math.hypot(dx, dy) / g.B) * BOXM;
  const inertia = R.k2 * BOXM * BOXM + dm * dm;
  const amp = tilt(dm);
  const held = amp <= 0 || inertia <= 0;
  const direction = Math.abs(dx) > 1e-6 ? Math.sign(dx) : dy >= 0 ? 1 : -1;
  const natural = (R.gv * dm) / inertia;
  const ps: Swing = {
    target: direction * (Math.PI / 2),
    w2: held ? 0 : Math.min(Math.max(natural, W_MIN * W_MIN), W_MAX * W_MAX),
    amp,
    u: 0,
    th: 0,
    om: 0,
    peak: 0,
    t: 0,
    acc: 0,
    calm: 0,
    fast: 0,
    wait: Math.max(0, wait),
  };
  return { dm, ps };
}

export function step(p: Swing, dt: number) {
  const h = 1 / 240;
  p.acc += Math.max(0, dt) * TEMPO;
  while (p.acc + 1e-12 >= h) {
    p.acc = Math.max(0, p.acc - h);
    p.t += h;
    const e = seated(p),
      goal = p.target * e * e,
      net = p.w2 * (goal - p.u);
    const damping = 2 * ZETA * Math.sqrt(p.w2);
    p.om += (net - (p.fast ? Math.max(damping, 9) : damping) * p.om) * h;
    p.u += p.om * h;
    p.th = p.u * p.amp;
    p.peak = Math.max(p.peak, Math.abs(p.th));
    // Calm is judged on the visible motion, so a slight tilt resolves sooner than a full swing.
    const readableUntil =
      p.amp > 0 ? Math.max(p.wait, MIN_WOBBLE_TIME) : p.wait;
    if (
      p.t > readableUntil &&
      Math.abs(p.om) * p.amp < 0.22 &&
      Math.abs(net) * p.amp < 0.22
    )
      p.calm += h;
    else p.calm = 0;
  }
}
export const seated = (p: Swing) => (p.wait ? Math.min(1, p.t / p.wait) : 1);
