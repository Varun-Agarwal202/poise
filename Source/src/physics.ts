import { BOXM, PERFECT_CM, type Shape } from "./gen";
import type { Geo, Pt } from "./stage";

/** Rigid body about a fixed pin. Gravity supplies torque; viscous damping
 * dissipates motion. There is no spring pulling toward the original pose.
 * With screen y pointing down, alpha = g*d*cos(a0+th)/(k²+d²).
 * Exact equilibria stay still, including the unstable inverted equilibrium.
 *
 * Departures from pure physics, for the sake of play:
 * - The pin has grip. A pure pendulum turns until its center hangs below the
 *   pin no matter how small the miss, so a 0.4 cm miss and a 6 cm miss both
 *   rotate 90°. Here the rotation is scaled by tilt(dm): a pin that scores 100
 *   holds still, a near miss tips a few degrees, a wide miss swings fully.
 *   The timing and wobble of the motion are still the pendulum's.
 * - Swing speed never drops below W_MIN. Physically, a near-center pin would
 *   drift for several seconds; here every drop resolves at a similar pace.
 */
export interface Swing {
  a0: number;
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
/** Damping ratio. Low enough that the object visibly overshoots and wobbles two or three times before settling. */
const ZETA = 0.32;
/** Simulation runs this much faster than wall-clock time. */
const TEMPO = 1.25;
/** Minimum angular frequency, rad/s (a period of about 1.25 s). */
const W_MIN = 5;
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
  const ps: Swing = {
    a0: Math.atan2(dy, dx),
    w2: held ? 0 : Math.max((R.gv * dm) / inertia, W_MIN * W_MIN),
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
    const pull = Math.cos(p.a0 + p.u);
    // Avoid numerical drift in a mathematically exact vertical equilibrium.
    const torque = Math.abs(pull) < 1e-12 ? 0 : p.w2 * pull;
    const e = seated(p),
      net = torque * e * e;
    const damping = 2 * ZETA * Math.sqrt(p.w2);
    p.om += (net - (p.fast ? Math.max(damping, 9) : damping) * p.om) * h;
    p.u += p.om * h;
    p.th = p.u * p.amp;
    p.peak = Math.max(p.peak, Math.abs(p.th));
    // Calm is judged on the visible motion, so a slight tilt resolves sooner than a full swing.
    if (
      p.t > p.wait &&
      Math.abs(p.om) * p.amp < 0.22 &&
      Math.abs(net) * p.amp < 0.22
    )
      p.calm += h;
    else p.calm = 0;
  }
}
export const seated = (p: Swing) => (p.wait ? Math.min(1, p.t / p.wait) : 1);
