// Deterministic shape generator. Any change here changes every past and future daily puzzle.

export type Rand = () => number;
/** [material(+ for source-atop), kind ('p'|'c'|'r'|'b'|'t'), ...args] */
export type Part = (string | number)[];
type Fam = (r: Rand, rr: (a: number, b: number) => number, m: (j: number) => string, c: number, i: number, seed: string) => Part[];

export interface Shape {
  fam: string; a: string; rot: number; parts: Part[]; name: string;
  /** mirrored (generator v2) */
  fl?: boolean;
  /** gravity, m/s² */
  gv: number;
  /** sprite scale/offset inside its unit box */
  s: number; off: [number, number];
  /** 512px pre-rendered sprite */
  sp: HTMLCanvasElement;
  /** center of mass in unit-box coords, and normalized radius of gyration squared */
  c: [number, number]; k2: number;
}

export const rng = (s: number): Rand => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
export const hash = (str: string) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 };
const shuf = <T>(a: T[], seed: string) => { a = [...a]; const r = rng(hash(seed)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };

const COLORS = ['#ff6b57', '#ffb627', '#2ec4a6', '#7a6cff', '#ff5fa2'], FONT = '"Arial Black","Helvetica Neue",Arial,sans-serif';
export const G0 = 9.81, EXT = .30, BOXM = EXT / .78;
export const MAT: Record<string, [string | null, number]> = { cork: ['#f1dfae', .25], wood: ['#cf9a5e', .6], plastic: [null, 1.2], glass: ['#79d3e6', 2.5], steel: ['#4a5366', 7.8], gold: ['#e3b53a', 19.3] };
const WORDS = ['PLANK', 'ZESTY', 'BRAVE', 'FLAKE', 'TWEAK', 'CRAFT', 'SPARK', 'LUCKY', 'STAGE', 'WALTZ', 'DRAFT', 'BLAZE', 'JUMPS', 'QUAKE', 'TRUCK', 'GRAPE', 'SLEPT', 'DWELT', 'PLUMB', 'SWAMP', 'CRUMB', 'FUZZY', 'WEDGE', 'KNEAD', 'BLUNT', 'SCALP', 'GRAVY', 'STUCK', 'CLASP', 'BEGUN'];
const bar = (a: number[], b: number[], w: number): Part => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2; return ['p', a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny, b[0] - nx, b[1] - ny, a[0] - nx, a[1] - ny] };
const ang = (a: number, l: number) => [Math.cos(a) * l, Math.sin(a) * l];
const ell = (cx: number, cy: number, rx: number, ry: number, n = 28): Part => ['b', ...[...Array(n)].flatMap((_, k) => [cx + Math.cos(k / n * 6.2832) * rx, cy + Math.sin(k / n * 6.2832) * ry])];
const arcP = (R0: number, R1: number, a0: number, a1: number, n = 20): Part => { const p: number[] = [], q: number[][] = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; p.push(Math.cos(a) * R0, Math.sin(a) * R0); q.unshift([Math.cos(a) * R1, Math.sin(a) * R1]) } return ['p', ...p, ...q.flat()] };
/** Scale a part by s and move it by o. */
const xf = (q: Part, s: number, o: number[]): Part => {
  const [t, k, ...a] = q, n = a as number[];
  if (k === 't') return q;
  if (k === 'c') return [t, k, n[0] * s + o[0], n[1] * s + o[1], n[2] * s];
  if (k === 'r') return [t, k, n[0] * s + o[0], n[1] * s + o[1], n[2] * s, n[3] * s];
  return [t, k, ...n.map((v, j) => v * s + o[j % 2])];
};
/** Families a hybrid can be welded from: ones whose origin sits on material, so the weld bar always connects. */
const WELDABLE = ['dumb', 'hammer', 'ring', 'prop', 'star', 'lump', 'wrench', 'spoon', 'anchor', 'gear', 'bone'];
let weldName = '', v2 = false;

const FAM: Record<string, Fam> = {
  dumb(r, rr, m) { const L = rr(.3, .45), w = rr(.04, .08), P: Part[] = [[m(0), ...bar([-L, 0], [L, 0], w)], [m(1), 'c', -L, 0, rr(.1, .22)], [m(2), 'c', L, 0, rr(.06, .18)]]; if (r() < .5) P.push([m(1), 'c', rr(-.1, .1), 0, rr(.05, .09)]); return P },
  hammer(r, rr, m) { const L = rr(.35, .5), w = rr(.05, .09), hy = -L + rr(0, .12), hw = rr(.18, .3), hh = rr(.08, .16), s1 = hw * rr(.5, 1.3), s2 = hw * rr(.5, 1.3), P: Part[] = [[m(0), ...bar([0, L], [0, -L], w)], [m(1), 'p', -hw, hy - hh, s1, hy - hh, s2, hy + hh, -hw, hy + hh]]; if (r() < .6) { const x = v2 ? Math.min(s1, s2) - .01 : hw; P.push([m(2), 'p', x, hy - hh * .5, x + rr(.1, .2), hy + hh * .2, x, hy + hh * .6]) } if (r() < .5) P.push([m(2), 'c', 0, L, rr(.05, .09)]); return P },
  ring(r, rr, m) { const R = rr(.2, .3), h = rr(.55, .8), L = rr(.3, .5), w = rr(.05, .09), P: Part[] = [[m(0), 'c', 0, 0, R], ['X', 'c', 0, 0, R * h], [m(1), ...bar([0, R * .92], [0, R + L], w)]], n = Math.floor(rr(0, 3.5)); for (let j = 0; j < n; j++)P.push([m(2), 'r', w / 2, R + L * (.45 + .45 * j / 3), rr(.06, .12), rr(.03, .06)]); if (r() < .5) P.push([m(2), 'c', 0, R + L, rr(.05, .1)]); return P },
  tree(r, rr, m, c) { const L = rr(.3, .45), w = rr(.05, .08), P: Part[] = [[m(0), ...bar([0, L], [0, -L * .6], w)]], n = 3 + Math.round(c * 2 + r()); for (let j = 0; j < n; j++) { const y = rr(-.5, .7) * L, a = (r() < .5 ? -1 : 1) * rr(.4, 1.2), l = rr(.15, .3), ex = Math.sin(a) * l, ey = y - Math.cos(a) * l; P.push([m(1), ...bar([0, y], [ex, ey], w * .7)]); P.push([m(1 + j % 2 + 1), 'c', ex, ey, rr(.05, .12)]) } return P },
  mol(r, rr, m, c) { const n = 4 + Math.round(c * 4 + r() * 2), pts = [[0, 0]], P: Part[] = []; for (let j = 1; j < n; j++) { const par = pts[Math.floor(r() * pts.length)], q = [par[0] + Math.cos(r() * 6.28) * rr(.14, .24), par[1] + Math.sin(r() * 6.28) * rr(.14, .24)]; P.push(['wood', ...bar(par, q, .03)]); pts.push(q) } pts.forEach((q, j) => P.push([m(j), 'c', q[0], q[1], rr(.05, .12)])); return P },
  prop(r, rr, m) { const k = 3 + Math.floor(r() * 3), a0 = r() * 6.28, P: Part[] = []; for (let j = 0; j < k; j++) { const a = a0 + j * 6.2832 / k + rr(-.25, .25), l = rr(.2, .42), w = rr(.06, .13), e = ang(a, l); P.push([m(j % 2), ...bar([0, 0], e, w)]); if (r() < .5) P.push([m(2), 'c', e[0], e[1], w * .7]) } P.push([m(1), 'c', 0, 0, rr(.06, .11)]); if (r() < .5) P.push(['X', 'c', 0, 0, .025]); return P },
  poly(r, _rr, m, c) { const n = 5 + Math.round(c * 3 + r() * 1.5), u = .15, cs = [[0, 0]], has = (x: number, y: number) => cs.some(q => q[0] === x && q[1] === y); while (cs.length < n) { const q = cs[Math.floor(r() * cs.length)], d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(r() * 4)], x = q[0] + d[0], y = q[1] + d[1]; if (!has(x, y)) cs.push([x, y]) } return cs.map(q => [m(Math.floor(r() * 4)), 'r', q[0] * u, q[1] * u, u, u]) },
  chev(_r, rr, m) { const A = rr(.8, 1.5), l1 = rr(.25, .45), l2 = rr(.25, .45), w = rr(.07, .14), e1 = ang(-1.5708 - A, l1), e2 = ang(-1.5708 + A, l2); return [[m(0), ...bar([0, 0], e1, w)], [m(1), ...bar([0, 0], e2, w)], [m(0), 'c', 0, 0, w * .6], [m(2), 'c', e1[0], e1[1], w * .8]] },
  chain(r, rr, m) { const n = 6 + Math.floor(r() * 3), b = [[-.4, rr(-.1, .1)], [rr(-.1, .1), rr(-.3, .3)], [.4, rr(-.1, .1)]], pt = (t: number) => [0, 1].map(k => (1 - t) * (1 - t) * b[0][k] + 2 * t * (1 - t) * b[1][k] + t * t * b[2][k]), ps = [...Array(n)].map((_, j) => pt(j / (n - 1))), rad = rr(.05, .09), dr = rr(.008, .018) * (r() < .5 ? 1 : -1), P: Part[] = []; for (let j = 1; j < n; j++)P.push(['wood', ...bar(ps[j - 1], ps[j], .03)]); ps.forEach((q, j) => P.push([m(j), 'c', q[0], q[1], Math.max(.03, rad + dr * j)])); return P },
  star(r, rr, m) { const k = 5 + Math.floor(r() * 5), ri = rr(.35, .65), R = rr(.3, .42), pts: number[] = []; for (let j = 0; j < k * 2; j++) { const a = j * Math.PI / k, rad = (j % 2 ? R * ri : R) * rr(.8, 1.2); pts.push(Math.cos(a) * rad, Math.sin(a) * rad) } const P: Part[] = [[m(0), 'p', ...pts]]; if (r() < .6) P.push([m(1), 'c', rr(-.1, .1), rr(-.1, .1), rr(.06, .12)]); if (r() < .5) P.push(['X', 'c', rr(-.1, .1), rr(-.1, .1), rr(.03, .07)]); return P },
  arrow(_r, rr, m) { const L = rr(.4, .5), w = rr(.03, .06), hl = rr(.12, .2), hw = rr(.08, .14), f = rr(.08, .15); return [[m(0), ...bar([0, L], [0, -L + hl], w)], [m(1), 'p', -hw, -L + hl, hw, -L + hl, 0, -L], [m(2), 'p', -f, L, 0, L - rr(.1, .18), f, L, 0, L + .05]] },
  lump(r, rr, m, c) {
    const amp = .12 + c * .3, ph = [0, 0, 0, 0].map(() => r() * 6.28), a = [0, 1, 2, 3].map(j => (.4 + r() * .6) * amp / (1 + j * .5)), pts: number[] = []; for (let k = 0; k < 64; k++) { const t = k / 64 * 6.2832; let rd = 1; for (let j = 0; j < 4; j++)rd += a[j] * Math.cos((j + 1) * t + ph[j]); rd = Math.max(.35, rd); pts.push(Math.cos(t) * rd * .38, Math.sin(t) * rd * .38) }
    const P: Part[] = [[m(0), 'b', ...pts]], n = 1 + Math.floor(c * 2 + r() * 1.5); for (let j = 0; j < n; j++) { const q = Math.floor(r() * 64); P.push([m(1 + j % 3) + '+', 'c', pts[q * 2] * .55, pts[q * 2 + 1] * .55, rr(.05, .1)]) } if (r() < .6) { const q = Math.floor(r() * 64); P.push(['X', 'c', pts[q * 2] * .45, pts[q * 2 + 1] * .45, rr(.04, .08)]) } return P
  },
  letter(_r, _rr, m, _c, i, seed) { return [[m(0), 't', WORDS[hash(seed) % WORDS.length][i % 5]]] },
  // Generator v2 families (puzzle No. 003 onward)
  wrench(r, rr, m) { const L = rr(.32, .45), w = rr(.06, .09), R = rr(.1, .15), hy = -L * .65, jw = R * rr(.55, .8), P: Part[] = [[m(0), ...bar([0, L], [0, hy], w)], [m(1), 'c', 0, hy, R], ['X', 'r', -jw / 2, hy - R - .02, jw, R * rr(.9, 1.2)]]; if (r() < .6) { const R2 = rr(.06, .1); P.push([m(1), 'c', 0, L, R2], ['X', 'c', 0, L, R2 * .5]) } return P },
  spoon(r, rr, m) { const L = rr(.32, .45), w = rr(.035, .06), rx = rr(.1, .16), ry = rx * rr(1.15, 1.6), by = -L * .35 - ry * .85, P: Part[] = [[m(0), ...bar([0, L], [0, -L * .35], w)], [m(1), ...ell(0, by, rx, ry)]]; if (r() < .5) P.push([m(2), 'c', 0, L, rr(.03, .06)]); if (r() < .4) P.push([m(2) + '+', 'c', 0, by, rx * .5]); return P },
  anchor(_r, rr, m) { const L = rr(.32, .42), w = rr(.05, .08), a = rr(.5, .9), l = rr(.18, .28), cb = rr(.12, .2), R = rr(.06, .09), P: Part[] = [[m(0), ...bar([0, -L], [0, L], w)], [m(0), ...bar([-cb, -L * .55], [cb, -L * .55], w * .8)]]; for (const s of [-1, 1]) { const e = [s * Math.sin(a) * l * rr(.8, 1.2), L - Math.cos(a) * l]; P.push([m(1), ...bar([0, L], e, w)], [m(2), 'c', e[0], e[1], w * .9]) } P.push([m(1), 'c', 0, -L - R * .6, R], ['X', 'c', 0, -L - R * .6, R * .5]); return P },
  mush(_r, rr, m) { const R = rr(.22, .32), q = rr(.6, .9), sh = rr(.18, .3), sw = rr(.08, .14), pts: number[] = []; for (let k = 0; k <= 24; k++) { const t = Math.PI * k / 24; pts.push(-Math.cos(t) * R, -Math.sin(t) * R * q) } const P: Part[] = [[m(0), 'r', -sw / 2 + rr(-.03, .03), -.03, sw, sh], [m(1), 'p', ...pts]], n = Math.floor(rr(1, 4)); for (let j = 0; j < n; j++)P.push([m(2) + '+', 'c', rr(-.6, .6) * R, -rr(.25, .55) * R * q, rr(.03, .06)]); return P },
  magnet(_r, rr, m) { const R = rr(.18, .26), t = rr(.07, .11), l1 = rr(.12, .3), l2 = l1 * rr(.6, 1.4), x = R - t / 2, ch = rr(.05, .09); return [[m(0), ...arcP(R, R - t, Math.PI, 2 * Math.PI)], [m(0), ...bar([-x, -.005], [-x, l1], t)], [m(0), ...bar([x, -.005], [x, l2], t)], [m(1), 'r', -R, l1 - .01, t, ch], [m(1), 'r', R - t, l2 - .01, t, ch]] },
  moon(r, rr, m) { const R = rr(.28, .36), a = r() * 6.2832, d = R * rr(.35, .6), P: Part[] = [[m(0), 'c', 0, 0, R], ['X', 'c', Math.cos(a) * d, Math.sin(a) * d, R * rr(.75, .95)]], n = Math.floor(rr(0, 3)); for (let j = 0; j < n; j++) { const b = a + Math.PI + rr(-.9, .9), q = R * rr(.55, .8); P.push([m(1) + '+', 'c', Math.cos(b) * q, Math.sin(b) * q, rr(.03, .07)]) } return P },
  gear(r, rr, m) { const n = 7 + Math.floor(r() * 6), R = rr(.26, .34), d = R * rr(.12, .2), pts: number[] = []; for (let j = 0; j < n; j++) for (const [f, rd] of [[0, R - d], [.18, R], [.5, R], [.68, R - d]]) { const a = (j + f) / n * 6.2832; pts.push(Math.cos(a) * rd, Math.sin(a) * rd) } const ha = r() * 6.2832, hd = R * rr(.15, .35), P: Part[] = [[m(0), 'p', ...pts], ['X', 'c', Math.cos(ha) * hd, Math.sin(ha) * hd, R * rr(.2, .35)]]; if (r() < .7) { const b = ha + Math.PI + rr(-.6, .6); P.push([m(1), 'c', Math.cos(b) * R * .5, Math.sin(b) * R * .5, rr(.04, .08)]) } return P },
  bone(_r, rr, m) { const L = rr(.28, .4), w = rr(.07, .11), a = rr(.06, .1), P: Part[] = [[m(0), ...bar([-L, 0], [L, 0], w)]]; for (const [x, rad] of [[-L, a], [L, a * rr(.8, 1.5)]]) P.push([m(1), 'c', x, -rad * .7, rad], [m(1), 'c', x, rad * .7, rad]); return P },
  weld(r, rr, m, c, i, seed) {
    const a = WELDABLE[Math.floor(r() * WELDABLE.length)], rest = WELDABLE.filter(f => f !== a), b = rest[Math.floor(r() * rest.length)];
    const A = FAM[a](r, rr, m, c, i, seed), B = FAM[b](r, rr, j => m(j + 1), c, i, seed), o = ang(r() * 6.2832, rr(.28, .4)), s = rr(.55, .75);
    const pick = (f: string) => NOUN[f][Math.floor(r() * NOUN[f].length)];
    weldName = pick(a) + '-' + pick(b).toLowerCase();
    return [...A, [m(0), ...bar([0, 0], o, .05)], ...B.map(q => xf(q, s, o))];
  },
};
const ADJ = ['Lopsided', 'Wonky', 'Top-heavy', 'Sneaky', 'Awkward', 'Crooked', 'Stubborn', 'Tricky', 'Chunky', 'Odd', 'Heavy-handed', 'Fickle'];
const ADJ2 = [...ADJ, 'Restless', 'Shifty', 'Bottom-heavy', 'Moody', 'Off-kilter', 'Uneven', 'Wobbly', 'Bashful', 'Devious', 'Clumsy', 'Smug', 'Grumpy'];
const NOUN: Record<string, string[]> = { dumb: ['Barbell', 'Dumbbell', 'Weight'], hammer: ['Mallet', 'Hammer', 'Gavel'], ring: ['Racket', 'Key', 'Mirror'], tree: ['Mobile', 'Branch', 'Twig'], mol: ['Molecule', 'Cluster', 'Compound'], prop: ['Propeller', 'Windmill', 'Fan'], poly: ['Block', 'Tile', 'Piece'], chev: ['Boomerang', 'Wishbone', 'Hook'], chain: ['Caterpillar', 'Chain', 'Snake'], star: ['Star', 'Splat', 'Burst'], arrow: ['Arrow', 'Dart', 'Spear'], lump: ['Lump', 'Pebble', 'Rock'], letter: ['Letter'], wrench: ['Wrench', 'Spanner'], spoon: ['Spoon', 'Ladle', 'Scoop'], anchor: ['Anchor', 'Grapnel'], mush: ['Mushroom', 'Toadstool'], magnet: ['Magnet', 'Horseshoe'], moon: ['Moon', 'Crescent', 'Sliver'], gear: ['Gear', 'Cog', 'Sprocket'], bone: ['Bone', 'Chew toy'] };
const POOLS = [['dumb', 'hammer', 'ring', 'chev', 'arrow'], ['dumb', 'hammer', 'ring', 'chev', 'arrow', 'tree', 'star'], ['tree', 'prop', 'poly', 'chain', 'star', 'ring', 'hammer'], ['prop', 'poly', 'chain', 'star', 'mol', 'tree'], ['mol', 'lump', 'letter', 'poly', 'chain']];
const POOLS2 = [
  ['dumb', 'hammer', 'ring', 'chev', 'arrow', 'wrench', 'spoon', 'bone', 'mush'],
  ['dumb', 'hammer', 'ring', 'chev', 'arrow', 'tree', 'star', 'anchor', 'magnet', 'spoon', 'wrench'],
  ['tree', 'prop', 'poly', 'chain', 'star', 'ring', 'hammer', 'gear', 'moon', 'anchor', 'magnet'],
  ['prop', 'poly', 'chain', 'star', 'mol', 'tree', 'gear', 'moon', 'lump'],
  ['weld', 'mol', 'lump', 'letter', 'weld', 'poly', 'chain', 'gear'],
];
const PALS = [COLORS, ['#ff6b57', '#ffb627', '#ff5fa2', '#ff8c42', '#f25f5c'], ['#2ec4a6', '#3fa7d6', '#7a6cff', '#59cd90', '#4cc9f0'], ['#ff5fa2', '#c77dff', '#7a6cff', '#ff8fab', '#4cc9f0'], ['#ffb627', '#c5e063', '#2ec4a6', '#ff9f1c', '#f9c74f']];

/** A daily twist. Twists change the shapes or the swing, never how points are scored. */
export interface Twist { id: string; e: string; name: string; blurb: string; g: number; at?: string }
export const TW: Record<string, Twist> = Object.fromEntries((<[string, string, string, string, number, string?][]>[
  ['classic', '', 'Classic', 'Earth gravity, no tricks.', G0],
  ['moon', '', 'Moon day', 'Low gravity. Every miss swings slow and floaty.', 1.62, 'on the Moon'],
  ['jupiter', '', 'Jupiter day', 'Crushing gravity. Misses snap back hard.', 24.8, 'on Jupiter'],
  ['metal', '', 'Heavy metal', 'Every shape hides a chunk of steel or gold.', G0],
  ['feather', '', 'Featherweight', 'Only cork, wood and plastic. Read the grain.', G0],
  ['holes', '', 'Swiss cheese', 'Holes punched through everything.', G0],
  ['mixed', '', 'Mixed media', 'One extra material in every shape.', G0],
]).map(([id, e, name, blurb, g, at]) => [id, { id, e, name, blurb, g, at }]));

/** Shuffle-bag: every item once per cycle, and no repeat across a cycle boundary. */
function bag(pool: string[], key: string, n: number) {
  const L = pool.length, cy = Math.floor(n / L), b = shuf(pool, key + cy);
  if (cy > 0 && b[0] === shuf(pool, key + (cy - 1))[L - 1]) [b[0], b[1]] = [b[1], b[0]];
  return b;
}
export const twistFor = (n: number) => { const ids = Object.keys(TW); return bag(ids, 'tw:', n)[n % ids.length] };
export const famsFor2 = (n: number) => {
  const used: string[] = [];
  POOLS2.forEach((p, s) => { const b = bag(p, 'bag' + s + ':', n); let j = n % p.length; while (used.includes(b[j % p.length])) j++; used.push(b[j % p.length]) });
  return used;
};
/** v2 seeds look like `p2|<base>|<twist id>`, so a saved result can always be rebuilt exactly. */
export const twistOf = (seed: string) => { const [v, , t] = seed.split('|'); return v === 'p2' ? TW[t] ?? TW.classic : null };
const holes = (P: Part[], r: Rand): Part[] => P.filter(q => q[0] !== 'X' && ((q[1] === 'c' && +q[4] > .055) || q[1] === 'r') && r() < .75)
  .map(q => q[1] === 'c' ? ['X', 'c', q[2], q[3], +q[4] * .45] : ['X', 'c', +q[2] + +q[4] / 2, +q[3] + +q[5] / 2, Math.min(+q[4], +q[5]) * .3]);

type Raw = Pick<Shape, 'fam' | 'a' | 'rot' | 'parts' | 'name' | 'fl'>;
/** Without a twist this is generator v1, which must stay byte-identical for puzzles No. 001–002. */
export function mk(seed: string, i: number, fam: string, T?: Twist | null): Raw {
  const r = rng(hash(seed + ':' + i + fam)), rr = (a: number, b: number) => a + (b - a) * r(), c = i / 4;
  let k = 2 + Number(i >= 2) + Number(i >= 4), pool = i < 2 ? ['wood', 'plastic', 'glass', 'steel'] : ['cork', 'wood', 'plastic', 'glass', 'steel', 'gold'];
  if (T?.id === 'feather') { pool = ['cork', 'wood', 'plastic']; k = Math.min(k + 1, 3) }
  if (T?.id === 'mixed') k = Math.min(k + 1, pool.length);
  const M = shuf(pool, seed + i + fam).slice(0, k), m = (j: number) => M[j % M.length];
  if (T?.id === 'metal' && !M.some(t => t === 'steel' || t === 'gold')) M[1] = hash(seed + i) % 2 ? 'gold' : 'steel';
  const a = (T ? PALS[hash(seed) % PALS.length] : COLORS)[Math.floor(r() * 5)], rot = r() * 6.2832, fl = T ? fam !== 'letter' && r() < .5 : undefined;
  v2 = !!T; const parts = FAM[fam](r, rr, m, c, i, seed);
  if (T?.id === 'holes') parts.push(...holes(parts, r));
  const adj = T ? ADJ2 : ADJ, A = adj[Math.floor(r() * adj.length)];
  const name = fam === 'letter' ? 'Letter ' + parts[0][2] : fam === 'weld' ? A + ' ' + weldName : A + ' ' + NOUN[fam][Math.floor(r() * NOUN[fam].length)];
  return { fam, a, rot, parts, name, fl };
}

function sh(x: CanvasRenderingContext2D, s: Part, fillOnly: boolean) {
  x.beginPath(); const t = s[0], a = s.slice(1) as number[];
  if (t === 't') { const ch = String(a[0]); x.save(); x.scale(.01, .01); x.font = `900 100px ${FONT}`; const q = x.measureText(ch), f = 100 * 80 / Math.max(q.actualBoundingBoxLeft + q.actualBoundingBoxRight, q.actualBoundingBoxAscent + q.actualBoundingBoxDescent); x.font = `900 ${f}px ${FONT}`; const z = x.measureText(ch); x.textBaseline = 'alphabetic'; x.fillText(ch, -(z.actualBoundingBoxRight - z.actualBoundingBoxLeft) / 2, -(z.actualBoundingBoxDescent - z.actualBoundingBoxAscent) / 2); x.restore(); return }
  if (t === 'c') x.arc(a[0], a[1], a[2], 0, 6.2832); else if (t === 'r') x.rect(a[0], a[1], a[2], a[3]);
  else if (t === 'b') { const n = a.length / 2, X = (i: number) => a[(i % n) * 2], Y = (i: number) => a[(i % n) * 2 + 1]; x.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2); for (let i = 1; i <= n; i++)x.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2) }
  else { x.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2)x.lineTo(a[i], a[i + 1]); x.closePath() }
  x.fill(); if (!fillOnly) x.stroke()
}
function paint(R: Raw, x: CanvasRenderingContext2D, N: number, mass: boolean, s: number, off: [number, number]) {
  x.save(); x.translate(N / 2, N / 2); x.scale(s * N, s * N); x.translate(-off[0], -off[1]); x.rotate(R.rot); if (R.fl) x.scale(-1, 1); x.lineWidth = .007; x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.22)';
  R.parts.forEach(q => {
    let t = String(q[0]); const atop = t.endsWith('+'); if (atop) t = t.slice(0, -1);
    x.globalCompositeOperation = t === 'X' ? 'destination-out' : atop ? 'source-atop' : 'source-over';
    if (t === 'X') x.fillStyle = '#000'; else x.fillStyle = mass ? `rgb(${Math.round(MAT[t][1] * 12)},0,0)` : (MAT[t][0] || R.a);
    sh(x, q.slice(1), mass || t === 'X')
  });
  x.restore()
}
export function prep(raw: Raw, gv = G0): Shape {
  const R = raw as Shape; R.gv = gv;
  const mk2 = (n: number) => { const c = document.createElement('canvas'); c.width = c.height = n; return c }, ctx = (c: HTMLCanvasElement, rf = false) => c.getContext('2d', { willReadFrequently: rf })!;
  const mc = mk2(192), mx = ctx(mc, true);
  paint(R, mx, 192, false, .35, [0, 0]); let d = mx.getImageData(0, 0, 192, 192).data, x0 = 192, x1 = 0, y0 = 192, y1 = 0;
  for (let k = 0; k < 36864; k++)if (d[k * 4 + 3] > 30) { const px = k % 192, py = (k / 192) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py }
  const ex = Math.max(x1 - x0 + 1, y1 - y0 + 1) / 192 / .35; R.s = .78 / ex; R.off = [((x0 + x1 + 1) / 2 / 192 - .5) / .35, ((y0 + y1 + 1) / 2 / 192 - .5) / .35];
  const SP = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1500 ? 1024 : 512;
  const sp = mk2(SP); paint(R, ctx(sp), SP, false, R.s, R.off);
  const mm = mk2(160), my = ctx(mm, true); paint(R, my, 160, true, R.s, R.off); d = my.getImageData(0, 0, 160, 160).data;
  let s = 0, sx = 0, sy = 0; for (let k = 0; k < 25600; k++)if (d[k * 4 + 3] > 127) { const w = d[k * 4] / 12; s += w; sx += w * ((k % 160) + .5); sy += w * (((k / 160) | 0) + .5) }
  const cx0 = sx / s, cy0 = sy / s; let I = 0; for (let k = 0; k < 25600; k++)if (d[k * 4 + 3] > 127) { const w = d[k * 4] / 12, px = (k % 160) + .5, py = ((k / 160) | 0) + .5; I += w * ((px - cx0) ** 2 + (py - cy0) ** 2) }
  R.sp = sp; R.c = [cx0 / 160, cy0 / 160]; R.k2 = I / s / 25600; return R
}
export const build = (seed: string, fams: string[]) => { const T = twistOf(seed); return fams.map((f, i) => prep(mk(seed, i, f, T), T?.g)) };
export const famsFor = (seed: string) => { const r = rng(hash(seed)), used: string[] = []; POOLS.forEach(p => { const q = p.filter(f => !used.includes(f)); used.push(q[Math.floor(r() * q.length)]) }); return used };
export const scoreOf = (e: number) => Math.round(100 * Math.exp(-e / .075));
/** Scoring from No. 003 on, by centimetres off: 0.5→93, 1→84, 2→64, 3→46, 4→32, 6→14. */
export const scoreOf2 = (cm: number) => Math.round(100 * Math.exp(-Math.pow(cm / 3.6, 1.35)));
