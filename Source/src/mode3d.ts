import { MAT, hash, rng } from "./gen";
import { app, $, cl, css, GRADES, gi, RM, setTitle, say } from "./dom";
import { TODAY, NO, fmtDate, untilNext } from "./store";
import { stop } from "./stage";
import { ui } from "./game";
import { navBtns, bindNav } from "./sheets";
import { track } from "./analytics";
import { snd, buzz } from "./audio";

type V3 = [number, number, number];
type Q = [number, number, number, number];

export interface Voxel {
  p: V3;
  mat: string;
}

export interface Shape3D {
  id: string;
  name: string;
  voxels: Voxel[];
  center: V3;
  extent: number;
}

interface Result3D {
  pts: number;
  cm: number;
  name: string;
}

interface Save3D {
  days: Record<string, { pts: number[]; cm: number[]; names: string[] }>;
  progress?: { d: string; results: Result3D[] };
}

const KEY = "pinpoise:3d:v1",
  RN3 = 3,
  CUBE_CM = 3.5,
  FACE_DIRS: { n: V3; v: V3[] }[] = [
    {
      n: [0, 0, 1],
      v: [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
      ],
    },
    {
      n: [0, 0, -1],
      v: [
        [0.5, -0.5, -0.5],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
      ],
    },
    {
      n: [1, 0, 0],
      v: [
        [0.5, -0.5, 0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
      ],
    },
    {
      n: [-1, 0, 0],
      v: [
        [-0.5, -0.5, -0.5],
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
      ],
    },
    {
      n: [0, 1, 0],
      v: [
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ],
    },
    {
      n: [0, -1, 0],
      v: [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
    },
  ];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k],
  dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross = (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  mag = (a: V3) => Math.hypot(...a),
  unit = (a: V3): V3 => {
    const m = mag(a) || 1;
    return mul(a, 1 / m);
  };

const qnorm = (q: Q): Q => {
    const m = Math.hypot(...q) || 1;
    return [q[0] / m, q[1] / m, q[2] / m, q[3] / m];
  },
  qmul = (a: Q, b: Q): Q =>
    qnorm([
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ]),
  qaxis = (axis: V3, angle: number): Q => {
    const a = unit(axis),
      s = Math.sin(angle / 2);
    return [a[0] * s, a[1] * s, a[2] * s, Math.cos(angle / 2)];
  },
  qrot = (q: Q, v: V3): V3 => {
    const u: V3 = [q[0], q[1], q[2]],
      t = mul(cross(u, v), 2);
    return add(v, add(mul(t, q[3]), cross(u, t)));
  },
  qfrom = (a0: V3, b0: V3): Q => {
    const a = unit(a0),
      b = unit(b0),
      d = cl(dot(a, b), -1, 1);
    if (d < -0.9999) {
      const axis =
        Math.abs(a[0]) < 0.8 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]);
      return qaxis(axis, Math.PI);
    }
    const c = cross(a, b);
    return qnorm([c[0], c[1], c[2], 1 + d]);
  };

function load3D(): Save3D {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      value &&
      typeof value === "object" &&
      value.days &&
      typeof value.days === "object"
    )
      return value;
  } catch {}
  return { days: {} };
}

let save3d = load3D();
const persist3D = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(save3d));
  } catch {}
};

export const score3D = (cm: number) =>
  Math.round(100 * Math.exp(-Math.pow(Math.max(0, cm - 0.2) / 5.4, 1.3)));

export function center3D(voxels: Voxel[]): V3 {
  let mass = 0,
    sum: V3 = [0, 0, 0];
  for (const voxel of voxels) {
    const m = MAT[voxel.mat][1];
    mass += m;
    sum = add(sum, mul(voxel.p, m));
  }
  return mul(sum, 1 / mass);
}

type Pattern = { id: string; name: string; make: (r: () => number) => V3[] };
const patterns: Pattern[] = [
  {
    id: "cat",
    name: "Space cat",
    make: (r) => {
      const p: V3[] = [];
      for (let y = 0; y <= 2; y++)
        for (let x = -1; x <= 1; x++) p.push([x, y, 0]);
      for (let y = -2; y <= -1; y++)
        for (let x = -1; x <= 1; x++) p.push([x, y, 0]);
      p.push(
        [-1, -3, 0],
        [1, -3, 0],
        [0, 0, 1],
        [2, 1, 0],
        [3, 0, 0],
        [3, -1, 0],
      );
      if (r() > 0.5) p.push([-2, 2, 0]);
      return p;
    },
  },
  {
    id: "bot",
    name: "Pocket bot",
    make: (r) => {
      const p: V3[] = [];
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++) p.push([x, y, 0]);
      for (let x = -1; x <= 1; x++) p.push([x, -2, 0]);
      p.push([-2, 0, 0], [2, 0, 0], [-1, 2, 0], [1, 2, 0], [0, 0, 1]);
      if (r() > 0.45) p.push([0, -3, 0]);
      return p;
    },
  },
  {
    id: "crab",
    name: "Moon crab",
    make: (r) => {
      const p: V3[] = [];
      for (let x = -2; x <= 2; x++) p.push([x, 0, 0]);
      for (let x = -1; x <= 1; x++) p.push([x, -1, 0]);
      p.push([-3, -1, 0], [-3, -2, 0], [3, -1, 0], [3, -2, 0]);
      p.push([-2, 1, 0], [-1, 2, 0], [2, 1, 0], [1, 2, 0], [0, 0, 1]);
      if (r() > 0.5) p.push([0, 1, 1]);
      return p;
    },
  },
  {
    id: "arch",
    name: "Hollow arch",
    make: (r) => {
      const p: V3[] = [];
      for (let y = -2; y <= 2; y++) p.push([-2, y, 0], [2, y, 0]);
      for (let x = -2; x <= 2; x++) p.push([x, -2, 0]);
      p.push([-1, -1, 1], [0, -1, 1], [1, -1, 1]);
      if (r() > 0.5) p.push([2, 2, 1]);
      return p;
    },
  },
  {
    id: "satellite",
    name: "Tiny satellite",
    make: (r) => {
      const p: V3[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++) p.push([x, y, 0]);
      for (let x = -4; x <= -2; x++) p.push([x, 0, 0]);
      for (let x = 2; x <= 4; x++) p.push([x, 0, 0]);
      p.push([0, -2, 0], [0, -3, r() > 0.5 ? 1 : 0], [0, 0, 1]);
      return p;
    },
  },
  {
    id: "stair",
    name: "Impossible stair",
    make: (r) => {
      const p: V3[] = [];
      for (let i = -3; i <= 3; i++) {
        p.push([i, i < 0 ? -i - 2 : i - 1, 0]);
        if (i % 2 === 0) p.push([i, i < 0 ? -i - 2 : i - 1, 1]);
      }
      p.push([-3, 2, -1], [3, 2, -1]);
      if (r() > 0.5) p.push([0, -1, 2]);
      return p;
    },
  },
  {
    id: "comet",
    name: "Block comet",
    make: (r) => {
      const p: V3[] = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++) p.push([x, y, 0]);
      p.push([-2, 0, 0], [-3, 1, 0], [-4, 1, 1], [-3, -1, -1]);
      if (r() > 0.5) p.push([0, 0, 1]);
      return p;
    },
  },
];

function normalizePoints(points: V3[]) {
  const lo: V3 = [Infinity, Infinity, Infinity],
    hi: V3 = [-Infinity, -Infinity, -Infinity];
  points.forEach((p) =>
    p.forEach((v, i) => {
      lo[i] = Math.min(lo[i], v);
      hi[i] = Math.max(hi[i], v);
    }),
  );
  const c = mul(add(lo, hi), 0.5);
  return points.map((p) => sub(p, c));
}

export function make3DSet(date = TODAY): Shape3D[] {
  const r = rng(hash("3d:" + date)),
    order = [...patterns];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const pools = [
    ["wood", "steel"],
    ["plastic", "ceramic", "aluminum"],
    ["cork", "glass", "brass"],
  ];
  return order.slice(0, RN3).map((pattern, round) => {
    const points = normalizePoints(pattern.make(r)),
      pool = pools[round],
      voxels = points.map((p, i) => ({
        p,
        mat: pool[
          Math.abs(
            (i + Math.round(p[0] * 3 + p[1] * 5 + p[2] * 7)) % pool.length,
          )
        ],
      })),
      extent = Math.max(
        ...points.flatMap((p) => p.map((v) => Math.abs(v) + 0.5)),
      );
    return {
      id: pattern.id,
      name: pattern.name,
      voxels,
      center: center3D(voxels),
      extent,
    };
  });
}

const label = (name: string) => name[0].toUpperCase() + name.slice(1),
  materialLegend = (shape: Shape3D) => {
    const names = [...new Set(shape.voxels.map((v) => v.mat))],
      min = Math.min(...names.map((name) => MAT[name][1]));
    return `<div class="density3" aria-label="Material density">${names
      .map(
        (name) =>
          `<span><i style="--mat:${MAT[name][0]}"></i><b>${label(name)}</b><strong>${MAT[name][1]}</strong><small>${Math.round(MAT[name][1] / min)}×</small></span>`,
      )
      .join("")}</div>`;
  };

export const threeDStatus = () => ({
  complete: !!save3d.days[TODAY],
  progress: save3d.progress?.d === TODAY ? save3d.progress.results.length : 0,
});

interface FaceDraw {
  pts: [number, number][];
  local: V3[];
  depth: number;
  normal: V3;
  color: string;
}

let cleanup3d: (() => void) | null = null;

export function start3D() {
  stop();
  cleanup3d?.();
  ui.ph = "mode3d";
  setTitle("Pinpoise 3D");
  const done = save3d.days[TODAY];
  if (done)
    return finish3D(
      done.pts.map((pts, i) => ({ pts, cm: done.cm[i], name: done.names[i] })),
    );
  const set = make3DSet(),
    saved = save3d.progress?.d === TODAY ? save3d.progress.results : [],
    results = saved
      .filter((result) => Number.isFinite(result.pts))
      .slice(0, RN3);
  playRound(set, results);
}

function playRound(set: Shape3D[], results: Result3D[]) {
  const round = results.length,
    shape = set[round];
  if (!shape) return finish3D(results);
  app.className = "mode3d-screen";
  app.innerHTML = `<header class="site-header"><button class="wordmark brand-home" id="brand-home" type="button" aria-label="Home">Pinpoise</button>${navBtns()}</header>
    <div class="round-header"><span class="mute">Pinpoise 3D / Object ${round + 1} of ${RN3}</span><span class="dots">${Array.from({ length: RN3 }, (_, i) => `<i class="${i < round ? `g${gi(results[i].pts)}` : ""}"></i>`).join("")}</span><span class="running-total"><span class="mute">Total</span> <b>${results.reduce((sum, result) => sum + result.pts, 0)}</b><span class="mute"> / 300</span></span></div>
    <div class="stage3" id="stage3"><canvas id="cv3" tabindex="0" aria-label="Rotatable three-dimensional object. Drag to rotate. Tap a visible face to place the pin."></canvas></div>
    <div class="foot foot3" id="foot3"><div class="object-heading"><div><h1 class="lede">${shape.name}</h1><p class="mute small">Rotate it. Pin a surface above the center of mass.</p></div>${materialLegend(shape)}</div>
      <p class="small rule">Density is mass per cube. Depth counts.</p>
      <span class="mute small" id="hint3">Drag to rotate. Tap a face to place the pin.</span>
      <button class="btn" id="drop3" disabled>Drop pin</button></div>`;
  app.scrollTop = 0;
  bindNav();
  track("mode3d_round", { round: round + 1, shape: shape.id });

  const stage = $("#stage3"),
    canvas = $<HTMLCanvasElement>("#cv3"),
    ctx = canvas.getContext("2d")!,
    drop = $<HTMLButtonElement>("#drop3"),
    hint = $("#hint3");
  let W = 1,
    H = 1,
    scale = 40,
    q: Q = qmul(qaxis([1, 0, 0], -0.42), qaxis([0, 1, 0], 0.62)),
    pinLocal: V3 | null = null,
    pinScreen: [number, number] | null = null,
    cursor: [number, number] = [0, 0],
    phase: "aim" | "drop" | "result" = "aim",
    startQ: Q = q,
    axis: V3 = [0, 0, 1],
    angle = 0,
    errorCm = 0,
    startTime = 0,
    raf = 0,
    down: { x: number; y: number; q: Q; moved: boolean } | null = null;

  const resize = () => {
    const rect = stage.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(W, H) / (shape.extent * 2.8);
    if (!cursor[0]) cursor = [W / 2, H / 2];
  };

  const project = (p: V3): { p: [number, number]; z: number; world: V3 } => {
    const pivoted = phase !== "aim" && pinLocal && pinScreen,
      world = qrot(q, pivoted ? sub(p, pinLocal!) : p),
      origin: [number, number] = pivoted ? pinScreen! : [W / 2, H / 2];
    return {
      p: [origin[0] + world[0] * scale, origin[1] + world[1] * scale],
      z: world[2],
      world,
    };
  };

  const faces = () => {
    const occupied = new Set(shape.voxels.map((voxel) => voxel.p.join(","))),
      out: FaceDraw[] = [];
    for (const voxel of shape.voxels)
      for (const face of FACE_DIRS) {
        const neighbor = add(voxel.p, face.n);
        if (occupied.has(neighbor.join(","))) continue;
        const local = face.v.map((v) => add(voxel.p, v)),
          projected = local.map(project),
          normal = qrot(q, face.n);
        if (normal[2] < -0.08) continue;
        out.push({
          pts: projected.map((p) => p.p),
          local,
          depth: projected.reduce((sum, p) => sum + p.z, 0) / 4,
          normal,
          color: MAT[voxel.mat][0]!,
        });
      }
    return out.sort((a, b) => a.depth - b.depth);
  };

  const shade = (hex: string, normal: V3) => {
    const n = hex.replace("#", ""),
      rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)),
      light = cl(
        0.68 + dot(unit(normal), unit([-0.4, -0.7, 0.8])) * 0.24,
        0.48,
        1.05,
      );
    return `rgb(${rgb.map((v) => Math.round(cl(v * light, 0, 255))).join(",")})`;
  };

  const drawPin = (point: [number, number], target = false) => {
    ctx.save();
    ctx.strokeStyle = target ? css("--ink") : css("--bg");
    ctx.fillStyle = target ? css("--bg") : css("--ink");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point[0], point[1] - 8);
    ctx.lineTo(point[0], point[1] - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point[0], point[1] - 36, target ? 7 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawCenter = (point: [number, number]) => {
    ctx.save();
    ctx.strokeStyle = css("--ink");
    ctx.fillStyle = css("--bg");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point[0], point[1], 2.5, 0, Math.PI * 2);
    ctx.fillStyle = css("--ink");
    ctx.fill();
    ctx.restore();
  };

  const render = (time: number) => {
    if (!canvas.isConnected) {
      cleanup3d?.();
      return;
    }
    if (phase === "drop") {
      const t = (time - startTime) / 1000,
        settle = RM
          ? 1
          : 1 -
            Math.exp(-4.2 * t) * (Math.cos(7.2 * t) + 0.58 * Math.sin(7.2 * t)),
        spin = RM
          ? 0
          : Math.min(0.45, errorCm / 18) *
            Math.sin(Math.min(1, t / 1.25) * Math.PI);
      q = qmul(
        qaxis([0, 1, 0], spin),
        qmul(qaxis(axis, angle * settle), startQ),
      );
      if (t > (RM ? 0.05 : 1.65)) {
        phase = "result";
        q = qmul(qaxis(axis, angle), startQ);
        showResult();
      }
    }
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = css("--ink");
    ctx.beginPath();
    ctx.ellipse(
      W / 2,
      H * 0.78,
      Math.min(W * 0.24, 150),
      16,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    for (const face of faces()) {
      ctx.beginPath();
      face.pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
      ctx.closePath();
      ctx.fillStyle = shade(face.color, face.normal);
      ctx.fill();
      ctx.strokeStyle = css("--ink");
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (pinLocal) drawPin(project(pinLocal).p);
    if (phase === "result" && pinLocal) {
      const cp = project(shape.center).p,
        pp = project(pinLocal).p;
      ctx.save();
      ctx.strokeStyle = css("--ink");
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(...pp);
      ctx.lineTo(...cp);
      ctx.stroke();
      ctx.restore();
      drawCenter(cp);
    } else if (!pinLocal) {
      ctx.save();
      ctx.strokeStyle = css("--mute");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursor[0] - 7, cursor[1]);
      ctx.lineTo(cursor[0] + 7, cursor[1]);
      ctx.moveTo(cursor[0], cursor[1] - 7);
      ctx.lineTo(cursor[0], cursor[1] + 7);
      ctx.stroke();
      ctx.restore();
    }
    raf = requestAnimationFrame(render);
  };

  const pointInFace = (face: FaceDraw, x: number, y: number) => {
    const a = face.pts[0],
      b = face.pts[1],
      d = face.pts[3],
      bx = b[0] - a[0],
      by = b[1] - a[1],
      dx = d[0] - a[0],
      dy = d[1] - a[1],
      px = x - a[0],
      py = y - a[1],
      det = bx * dy - by * dx;
    if (Math.abs(det) < 0.001) return null;
    const u = (px * dy - py * dx) / det,
      v = (py * bx - px * by) / det;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [u, v] : null;
  };

  const place = (x: number, y: number) => {
    if (phase !== "aim") return;
    const hit = [...faces()]
      .reverse()
      .map((face) => ({ face, uv: pointInFace(face, x, y) }))
      .find((item) => item.uv && item.face.normal[2] > 0.06);
    if (!hit || !hit.uv) {
      hint.textContent = "Tap a visible face of the object.";
      buzz(16);
      return;
    }
    const [u, v] = hit.uv,
      e1 = sub(hit.face.local[1], hit.face.local[0]),
      e2 = sub(hit.face.local[3], hit.face.local[0]);
    pinLocal = add(hit.face.local[0], add(mul(e1, u), mul(e2, v)));
    cursor = [x, y];
    drop.disabled = false;
    hint.textContent = "Pin placed. Drag to inspect it or drop when ready.";
    snd(520, 0.04, "sine", 0.035);
    buzz(6);
    say("Pin placed on the three-dimensional object.");
  };

  const localPoint = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as [
      number,
      number,
    ];
  };

  canvas.onpointerdown = (event) => {
    if (phase !== "aim") return;
    const [x, y] = localPoint(event);
    canvas.setPointerCapture(event.pointerId);
    down = { x, y, q, moved: false };
    cursor = [x, y];
  };
  canvas.onpointermove = (event) => {
    if (!down || phase !== "aim") return;
    const [x, y] = localPoint(event),
      dx = x - down.x,
      dy = y - down.y;
    cursor = [x, y];
    if (Math.hypot(dx, dy) > 5) down.moved = true;
    if (down.moved) {
      q = qmul(
        qaxis([1, 0, 0], dy * 0.009),
        qmul(qaxis([0, 1, 0], dx * 0.009), down.q),
      );
      hint.textContent = "Release, then tap a face to place the pin.";
    }
  };
  canvas.onpointerup = canvas.onpointercancel = (event) => {
    if (!down) return;
    const [x, y] = localPoint(event),
      moved = down.moved;
    down = null;
    if (!moved) place(x, y);
  };
  canvas.onkeydown = (event) => {
    if (phase !== "aim") return;
    const step = event.shiftKey ? 0.12 : 7;
    if (event.shiftKey && event.key.startsWith("Arrow")) {
      const axis: V3 =
        event.key === "ArrowLeft" || event.key === "ArrowRight"
          ? [0, 1, 0]
          : [1, 0, 0];
      const direction =
        event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      q = qmul(qaxis(axis, step * direction), q);
    } else if (event.key === "ArrowLeft")
      cursor[0] = cl(cursor[0] - step, 0, W);
    else if (event.key === "ArrowRight") cursor[0] = cl(cursor[0] + step, 0, W);
    else if (event.key === "ArrowUp") cursor[1] = cl(cursor[1] - step, 0, H);
    else if (event.key === "ArrowDown") cursor[1] = cl(cursor[1] + step, 0, H);
    else if (event.key === "Enter" || event.key === " ") place(...cursor);
    else return;
    event.preventDefault();
  };

  const showResult = () => {
    const pts = score3D(errorCm),
      grade = GRADES[gi(pts)][1],
      foot = $("#foot3");
    foot.innerHTML = `<div class="result3"><div><span class="big">${grade}</span><p class="mute small">${errorCm.toFixed(1)} cm from the balance line</p></div><strong>+${pts}</strong></div><button class="btn" id="next3">${round === RN3 - 1 ? "See 3D result" : "Next object"}</button>`;
    const next = $<HTMLButtonElement>("#next3");
    next.onclick = () => {
      const updated = [...results, { pts, cm: errorCm, name: shape.name }];
      if (updated.length === RN3) {
        save3d.days[TODAY] = {
          pts: updated.map((result) => result.pts),
          cm: updated.map((result) => result.cm),
          names: updated.map((result) => result.name),
        };
        delete save3d.progress;
        persist3D();
        finish3D(updated);
      } else {
        save3d.progress = { d: TODAY, results: updated };
        persist3D();
        cleanup3d?.();
        playRound(set, updated);
      }
    };
    track("mode3d_complete", {
      round: round + 1,
      pts,
      cm: +errorCm.toFixed(1),
    });
  };

  drop.onclick = () => {
    if (!pinLocal || phase !== "aim") return;
    phase = "drop";
    drop.disabled = true;
    pinScreen = project(pinLocal).p;
    startQ = q;
    const offset = qrot(q, sub(shape.center, pinLocal)),
      lateral = Math.hypot(offset[0], offset[2]);
    errorCm = lateral * CUBE_CM;
    const delta = qfrom(offset, [0, 1, 0]),
      half = Math.acos(cl(delta[3], -1, 1));
    angle = half * 2;
    axis =
      Math.abs(Math.sin(half)) < 0.0001
        ? [0, 0, 1]
        : unit([delta[0], delta[1], delta[2]]);
    startTime = performance.now();
    hint.textContent = "Released.";
    snd(190, 0.1, "triangle", 0.06);
    buzz(12);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  raf = requestAnimationFrame(render);
  cleanup3d = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.onpointerdown =
      canvas.onpointermove =
      canvas.onpointerup =
      canvas.onpointercancel =
        null;
    canvas.onkeydown = null;
    cleanup3d = null;
  };
}

function finish3D(results: Result3D[]) {
  cleanup3d?.();
  ui.ph = "mode3d";
  const total = results.reduce((sum, result) => sum + result.pts, 0);
  app.className = "result-screen result3-screen";
  app.innerHTML = `<header class="receipt-heading site-header"><button class="wordmark brand-home" id="brand-home" type="button" aria-label="Home">Pinpoise</button><div>${navBtns()}</div></header>
    <div class="result-summary"><div><p class="mute small">Pinpoise 3D · No. ${NO} · ${fmtDate(TODAY, true)}</p><h1>Three dimensions. Three pins.</h1></div><p class="total"><b>${total}</b><span>/ 300</span></p></div>
    <div class="results3">${results.map((result, i) => `<div><span>${i + 1}</span><b>${result.name}</b><small class="mute">${result.cm.toFixed(1)} cm</small><strong>${result.pts}</strong></div>`).join("")}</div>
    <div class="result-actions"><button class="btn" id="home3">Back to Pinpoise</button><p class="mute small" data-next>Next set in ${untilNext()}</p></div>`;
  bindNav();
  $("#home3").onclick = () => {
    dispatchEvent(new Event("pinpoise:navigate"));
    import("./home").then(({ home }) => home());
  };
  track("mode3d_result", { total });
}
