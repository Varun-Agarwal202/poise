import { build as bundle } from "esbuild";
import { JSDOM } from "jsdom";
import { createCanvas } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const entry = `export * as gen from './src/gen'; export * as unique from './src/unique'; export * as catalogue from './src/forms-v4'; export * as legacy from './tests/fixtures/gen-v2'; export * as store from './src/store'; export * as game from './src/game'; export * as stage from './src/stage'; export * as home from './src/home'; export * as physics from './src/physics'; export * as sharing from './src/share'; export * as dom from './src/dom'; export * as rank from './src/rank'; export * as rankModel from './src/rank-model'; export * as auth from './src/auth'; export * as mode3d from './src/mode3d';`;
const compiled = await bundle({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "testApp",
  define: {
    "import.meta.env.DEV": "true",
    "import.meta.env.PROD": "false",
    "import.meta.env.VITE_POSTHOG_KEY": "undefined",
    "import.meta.env.VITE_POSTHOG_HOST": "undefined",
    "import.meta.env.VITE_SITE_URL": "undefined",
    "import.meta.env.VITE_SUPABASE_URL": '"https://test.supabase.co"',
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"test-key"',
  },
  plugins: [
    {
      name: "image-capture-test",
      setup(b) {
        b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({
          path: "supabase-client",
          namespace: "test",
        }));
        b.onLoad({ filter: /^supabase-client$/, namespace: "test" }, () => ({
          contents: `export const createClient = () => ({ auth: {
              getSession: async () => ({ data: { session: null } }),
              onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
              signInWithOAuth: async () => ({ error: null }),
              signInWithPassword: async () => ({ error: null }),
              signUp: async () => ({ data: { session: null }, error: null }),
              resetPasswordForEmail: async () => ({ error: null }),
              updateUser: async () => ({ error: null }),
              signOut: async () => ({ error: null })
            }});`,
        }));
        b.onResolve({ filter: /^html-to-image$/ }, () => ({
          path: "image-capture",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: `export async function toBlob(node, options) {
      globalThis.captureOptions = options;
      if (globalThis.captureFailure) throw new Error('Capture failed');
      if (globalThis.capturePending) await globalThis.capturePending;
      return new Blob(['image payload'], {type: 'image/png'});
    }`,
        }));
      },
    },
  ],
  logLevel: "silent",
});
const checks = [];
function env(date = "2026-10-25", save, live) {
  const dom = new JSDOM('<main id="app"></main><div id="sr"></div>', {
    url: `http://localhost:5174/?today=${date}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  Object.defineProperty(w.document, "fonts", {
    value: { ready: Promise.resolve() },
  });
  w.matchMedia = () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  });
  w.ResizeObserver = class {
    constructor(f) {
      this.f = f;
    }
    observe() {
      this.f();
    }
    disconnect() {}
  };
  w.HTMLCanvasElement.prototype.getContext = function () {
    if (
      !this._canvas ||
      this._canvas.width !== this.width ||
      this._canvas.height !== this.height
    )
      this._canvas = createCanvas(this.width, this.height);
    const ctx = this._canvas.getContext("2d");
    return new Proxy(ctx, {
      get(t, k) {
        if (k === "drawImage")
          return (im, ...a) => t.drawImage(im._canvas ?? im, ...a);
        const v = t[k];
        return typeof v === "function" ? v.bind(t) : v;
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    });
  };
  w.HTMLCanvasElement.prototype.toDataURL = function () {
    return this._canvas.toDataURL();
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.id === "stage"
      ? {
          left: 0,
          top: 120,
          width: 1024,
          height: 400,
          right: 1024,
          bottom: 520,
        }
      : { left: 0, top: 0, width: 1024, height: 768, right: 1024, bottom: 768 };
  };
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  let callbacks = [];
  w.requestAnimationFrame = (fn) => {
    callbacks.push(fn);
    return callbacks.length;
  };
  w.cancelAnimationFrame = () => {};
  if (save) w.localStorage.setItem("poise:v4", JSON.stringify(save));
  if (live) w.sessionStorage.setItem("poise:live", JSON.stringify(live));
  w.eval(compiled.outputFiles[0].text);
  return {
    w,
    api: w.testApp,
    frame() {
      const work = callbacks;
      callbacks = [];
      work.forEach((f) => f(w.performance.now() + 100));
      return work.length;
    },
    close() {
      w.close();
    },
  };
}
function ok(label) {
  checks.push(label);
  console.log("PASS", label);
}
const e = env(),
  { gen, legacy, store } = e.api;
await e.api.auth.initAccount();
assert.equal(e.api.dom.GRADES[e.api.dom.gi(gen.scoreOf2(1.1))][1], "Excellent");
assert.equal(
  e.api.dom.GRADES[e.api.dom.gi(gen.scoreOf2(1.4))][1],
  "Very close",
);
assert.equal(e.api.dom.GRADES[e.api.dom.gi(33)][1], "Off center");
ok("Accuracy labels follow the steep scoring curve");
assert.equal(
  e.api.rank.rankLabel(
    {
      betterThan: 81,
      players: 42,
      bins: Array(20).fill(1),
    },
    390,
  ),
  "Top 29%",
);
assert.equal(
  e.api.rank.rankLabel(
    { betterThan: 81, players: 250, bins: Array(20).fill(1) },
    390,
  ),
  "Top 19%",
);
assert.equal(
  e.api.rank.rankLabel(
    { betterThan: 50, players: 4, bins: Array(20).fill(0) },
    408,
  ),
  "Top 21%",
);
assert.equal(e.api.rank.fallbackRank(450), "Top 9%");
assert.equal(e.api.rank.fallbackRank(475), "Top 4%");
assert.equal(e.api.rank.fallbackRank(490), "Top 2%");
assert.equal(e.api.rank.fallbackRank(500), "Top 1%");
const sampleDistribution = [
  { score: 100, amount: 5 },
  { score: 240, amount: 40 },
  { score: 330, amount: 85 },
  { score: 400, amount: 80 },
  { score: 470, amount: 40 },
];
const modeledLow = e.api.rankModel.modelScoreDistribution(
    sampleDistribution,
    1,
  ),
  modeledMin = e.api.rankModel.modelScoreDistribution(sampleDistribution, 100),
  modeledMiddle = e.api.rankModel.modelScoreDistribution(
    sampleDistribution,
    350,
  ),
  modeledPerfect = e.api.rankModel.modelScoreDistribution(
    sampleDistribution,
    500,
  );
assert.equal(modeledLow.betterThan, 1);
assert.equal(modeledMin.betterThan, 1);
assert(modeledMiddle.betterThan >= 40 && modeledMiddle.betterThan <= 60);
assert(modeledPerfect.betterThan >= 95 && modeledPerfect.betterThan <= 99);
assert(modeledMin.betterThan <= modeledMiddle.betterThan);
assert(modeledMiddle.betterThan <= modeledPerfect.betterThan);
assert.equal(modeledMiddle.samples, 250);
assert.equal(modeledMiddle.bins.length, 20);
assert(
  Math.abs(modeledMiddle.bins.reduce((sum, n) => sum + n, 0) - 1000) <= 10,
);
const peakBin = modeledMiddle.bins.indexOf(Math.max(...modeledMiddle.bins));
assert(
  modeledMiddle.bins
    .slice(0, peakBin + 1)
    .every((n, i, all) => !i || n >= all[i - 1]) &&
    modeledMiddle.bins
      .slice(peakBin)
      .every((n, i, all) => !i || n <= all[i - 1]),
  "Modeled distribution has a single smooth peak",
);
const denseRank = e.api.rankModel.modelScoreDistribution(
  [
    { score: 400, amount: 200 },
    { score: 450, amount: 1800 },
  ],
  450,
);
assert(denseRank.betterThan >= 50 && denseRank.betterThan <= 60);
ok(
  "Global ranks fit a smooth bell curve that tracks real scores as data grows",
);
for (let n = 0; n < 3; n++) {
  const d = store.dateOfNo(n + 1),
    p = store.puzzleOf(d);
  const oldSeed = n < 2 ? "poise" + d : `p2|poise${d}|${legacy.twistFor(n)}`;
  assert.equal(p.seed, oldSeed);
  assert.deepEqual(
    Array.from(p.fams),
    Array.from(n < 2 ? legacy.famsFor(oldSeed) : legacy.famsFor2(n)),
  );
  const a = gen.build(p.seed, p.fams),
    b = legacy.build(p.seed, p.fams);
  a.forEach((s, i) => {
    assert.equal(JSON.stringify(s.parts), JSON.stringify(b[i].parts));
    assert.equal(s.rot, b[i].rot);
    assert.equal(s.s, b[i].s);
    assert.equal(JSON.stringify(s.c), JSON.stringify(b[i].c));
    assert.equal(s.k2, b[i].k2);
  });
}
ok(
  "All 15 historical objects retain exact geometry, mass centers and scoring inputs",
);
// Independently normalize the actual contour control points against EVERY edge.
// This catches duplicates under translation, arbitrary rotation, reflection and
// uniform scale, rather than trusting an ID, seed, colour or catalogue key.
function contourKey(part) {
  const points = [];
  for (let i = 2; i < part.length; i += 2) points.push([part[i], part[i + 1]]);
  const versions = [];
  for (const order of [points, [...points].reverse()])
    for (let i = 0; i < order.length; i++) {
      const [x, y] = order[i],
        next = order[(i + 1) % order.length];
      const dx = next[0] - x,
        dy = next[1] - y,
        d = dx * dx + dy * dy;
      if (d === 0) continue;
      for (const sign of [-1, 1])
        versions.push(
          Array.from({ length: order.length }, (_, j) => {
            const p = order[(i + j) % order.length],
              u = p[0] - x,
              v = p[1] - y;
            return [
              Math.round(((u * dx + v * dy) / d) * 1e7),
              Math.round(((sign * (v * dx - u * dy)) / d) * 1e7),
            ].join(",");
          }).join(";"),
        );
    }
  return part[1] + ":" + versions.sort()[0];
}
// A separate rendered-alpha check ignores every material, including the inlay.
const mask = createCanvas(96, 96),
  maskCtx = mask.getContext("2d");
function renderedKey(raw) {
  const s = gen.prep({ ...raw, rot: 0, fl: false });
  const original = s.sp._canvas,
    ctx = original.getContext("2d"),
    originalWidth = original.width,
    originalHeight = original.height;
  const pixels = ctx.getImageData(0, 0, original.width, original.height).data;
  let l = originalWidth,
    t = originalHeight,
    r = 0,
    b = 0;
  for (let y = 0; y < originalHeight; y++)
    for (let x = 0; x < originalWidth; x++) {
      if (pixels[(y * originalWidth + x) * 4 + 3] > 127) {
        l = Math.min(l, x);
        r = Math.max(r, x);
        t = Math.min(t, y);
        b = Math.max(b, y);
      }
    }
  const w = r - l + 1,
    h = b - t + 1,
    scale = 80 / Math.max(w, h),
    hashes = [];
  for (let f = 0; f < 2; f++)
    for (let a = 0; a < 4; a++) {
      maskCtx.clearRect(0, 0, 96, 96);
      maskCtx.save();
      maskCtx.translate(48, 48);
      maskCtx.rotate((a * Math.PI) / 2);
      maskCtx.scale(f ? -1 : 1, 1);
      maskCtx.drawImage(
        original,
        l,
        t,
        w,
        h,
        (-w * scale) / 2,
        (-h * scale) / 2,
        w * scale,
        h * scale,
      );
      maskCtx.restore();
      const rgba = maskCtx.getImageData(0, 0, 96, 96).data,
        alpha = Buffer.alloc(96 * 96);
      for (let i = 0; i < alpha.length; i++)
        alpha[i] = rgba[i * 4 + 3] > 127 ? 255 : 0;
      hashes.push(createHash("sha256").update(alpha).digest("hex"));
    }
  const result = hashes.sort()[0];
  original.width = 1;
  original.height = 1;
  return result;
}
const seen = new Set(),
  contours = new Set(),
  rendered = new Set();
for (let n = 0; n < 3; n++) {
  const p = store.puzzleOf(store.dateOfNo(n + 1));
  p.fams.forEach((f, i) =>
    rendered.add(renderedKey(gen.mk(p.seed, i, f, p.tw))),
  );
}
const uniqueContact = createCanvas(1200, 1200),
  uc = uniqueContact.getContext("2d");
uc.fillStyle = "#eceef2";
uc.fillRect(0, 0, 1200, 1200);
for (let n = 3; n <= e.api.unique.LAST_DAY_INDEX; n++) {
  if ((n - 3) % 200 === 0)
    console.log(`Checking catalogue: ${n - 3} / 1,200 days`);
  const p = store.puzzleOf(store.dateOfNo(n + 1));
  assert.equal(p.seed.startsWith(n >= 6 ? "p6|" : "p4|"), true);
  assert.equal(new Set(p.fams).size, 5);
  const dailyRatios = [],
    dailyLayouts = [],
    dailyRendered = new Set();
  p.fams.forEach((f, i) => {
    assert(!seen.has(f), `Repeated ID ${f}`);
    seen.add(f);
    const raw = gen.mk(p.seed, i, f, p.tw),
      raster = renderedKey(raw);
    if (n >= 6) {
      const materials = [
        ...new Set(
          raw.parts
            .map((part) => String(part[0]).replace(/\+$/, ""))
            .filter((name) => name !== "X"),
        ),
      ];
      assert(materials.length >= 2 && materials.length <= 4);
      const densities = materials.map((name) => gen.MAT[name][1]);
      dailyRatios.push(Math.max(...densities) / Math.min(...densities));
      dailyLayouts.push(raw.fam);
    } else {
      const key = contourKey(raw.parts[0]);
      assert(!contours.has(key), `Repeated contour ${f}`);
      contours.add(key);
    }
    assert(!dailyRendered.has(raster), `Repeated silhouette within day ${f}`);
    dailyRendered.add(raster);
    if (n < 6)
      assert(!rendered.has(raster), `Repeated historical silhouette ${f}`);
    rendered.add(raster);
  });
  if (n >= 6) {
    assert(dailyRatios[0] >= 10);
    assert(dailyRatios[3] <= 2.5);
    assert(dailyRatios[4] <= 2.5);
    assert(dailyRatios.filter((ratio) => ratio <= 2.5).length >= 2);
    assert.equal(dailyRatios.filter((ratio) => ratio >= 10).length, 1);
    assert.equal(new Set(dailyLayouts).size, 5);
  }
  const shapes = gen.build(p.seed, p.fams);
  for (const [i, s] of shapes.entries()) {
    assert(s.c.every(Number.isFinite));
    assert(s.k2 > 0);
    assert(s.s > 0);
    if ((n - 3) % 100 === 0) {
      const row = (n - 3) / 100,
        x = i * 240,
        y = row * 100;
      uc.drawImage(s.sp._canvas, x + 70, y + 4, 90, 90);
      uc.fillStyle = "#60646c";
      uc.font = "11px sans-serif";
      uc.fillText(s.fam, x + 8, y + 56);
    }
    s.sp._canvas.width = 1;
    s.sp._canvas.height = 1;
  }
  assert.equal(
    JSON.stringify(p),
    JSON.stringify(store.puzzleOf(store.dateOfNo(n + 1))),
  );
  if (n % 20 === 0) global.gc?.();
}
assert.equal(seen.size, 6000);
assert.equal(contours.size, 15);
assert.equal(store.dateOfNo(e.api.unique.LAST_DAY_INDEX + 1), "2030-02-04");
assert(store.available("2029-10-23")); // Three years, including leap day.
assert.equal(store.puzzleOf("2028-02-29").fams.length, 5);
assert.throws(() => store.puzzleOf("2030-02-05"), /No new shapes/);
assert.equal(store.available("2030-02-05"), false);
mkdirSync(".taste-skill/qa", { recursive: true });
writeFileSync(
  ".taste-skill/qa/unique-catalogue.png",
  uniqueContact.toBuffer("image/png"),
);
ok(
  "1,200 daily sets / 6,000 silhouettes: future sets use five distinct object families with close, medium and wide density puzzles",
);
const exhausted = env("2030-02-05");
exhausted.api.home.home();
assert(exhausted.w.document.body.textContent.includes("new edition"));
exhausted.w.document.querySelector("#ar").click();
assert.equal(exhausted.w.document.querySelectorAll(".arow").length, 1203);
exhausted.close();
ok(
  "Catalogue exhaustion keeps archive, the You panel and home accessible without recycling a puzzle",
);
// Wobble is deterministic, distance-driven and speed-bounded across shapes.
const { physics } = e.api;
const body = gen.build(
  store.puzzleOf("2026-10-26").seed,
  store.puzzleOf("2026-10-26").fams,
)[0];

// The balance point is independently checkable on simple shapes. These known-answer
// cases protect the density, transform and raster paths used by every generated form.
const uniform = gen.prep({
  fam: "test",
  a: "#000",
  rot: 0,
  fl: false,
  parts: [["wood", "r", -0.3, -0.15, 0.6, 0.3]],
  name: "Uniform rectangle",
});
assert(Math.abs(uniform.c[0] - 0.5) < 0.002);
assert(Math.abs(uniform.c[1] - 0.5) < 0.002);
const weighted = gen.prep({
  fam: "test",
  a: "#000",
  rot: 0,
  fl: false,
  parts: [
    ["wood", "r", -0.34, -0.1, 0.2, 0.2],
    ["steel", "r", 0.14, -0.1, 0.2, 0.2],
  ],
  name: "Weighted pair",
});
const rawCenter =
  (-0.24 * gen.MAT.wood[1] + 0.24 * gen.MAT.steel[1]) /
  (gen.MAT.wood[1] + gen.MAT.steel[1]);
const expectedCenter = 0.5 + weighted.s * (rawCenter - weighted.off[0]);
assert(Math.abs(weighted.c[0] - expectedCenter) < 0.004);
assert(Math.abs(weighted.c[1] - 0.5) < 0.002);
const rotatedWeighted = gen.prep({
  fam: "test",
  a: "#000",
  rot: Math.PI,
  fl: false,
  parts: [
    ["wood", "r", -0.34, -0.1, 0.2, 0.2],
    ["steel", "r", 0.14, -0.1, 0.2, 0.2],
  ],
  name: "Rotated weighted pair",
});
assert(Math.abs(rotatedWeighted.c[0] - (1 - weighted.c[0])) < 0.004);
assert(Math.abs(rotatedWeighted.c[1] - (1 - weighted.c[1])) < 0.004);
const cutout = gen.prep({
  fam: "test",
  a: "#000",
  rot: Math.PI,
  fl: true,
  parts: [
    ["glass", "c", 0, 0, 0.36],
    ["X", "c", 0, 0, 0.18],
  ],
  name: "Ring",
});
assert(Math.abs(cutout.c[0] - 0.5) < 0.002);
assert(Math.abs(cutout.c[1] - 0.5) < 0.002);
ok(
  "Center of mass matches known uniform, mixed-density, rotated and cutout shapes",
);

const { mode3d } = e.api;
const voxelPair = mode3d.center3D([
  { p: [-1, 0, 0], mat: "wood" },
  { p: [1, 0, 0], mat: "steel" },
]);
assert(Math.abs(voxelPair[0] - (7.8 - 0.6) / (7.8 + 0.6)) < 1e-12);
assert.equal(voxelPair[1], 0);
assert.equal(voxelPair[2], 0);
let score3dPrevious = 101;
for (let cm = 0; cm <= 20; cm += 0.1) {
  const score = mode3d.score3D(cm);
  assert(score <= score3dPrevious);
  score3dPrevious = score;
}
assert.equal(mode3d.score3D(0), 100);
const trackballCenter = mode3d.trackballPoint(200, 150, 400, 300),
  trackballEdge = mode3d.trackballPoint(400, 150, 400, 300),
  dragRight = mode3d.trackballRotation(200, 150, 300, 150, 400, 300),
  dragLeft = mode3d.trackballRotation(200, 150, 100, 150, 400, 300),
  dragDown = mode3d.trackballRotation(200, 150, 200, 250, 400, 300);
assert.equal(trackballCenter.join(","), "0,0,1");
assert(Math.abs(Math.hypot(...trackballEdge) - 1) < 1e-12);
assert(dragRight[1] > 0);
assert(dragLeft[1] < 0);
assert(dragDown[0] < 0);
assert(Math.abs(Math.hypot(...dragRight) - 1) < 1e-12);
const set3dA = mode3d.make3DSet("2026-10-27"),
  set3dB = mode3d.make3DSet("2026-10-27");
assert.equal(set3dA.length, 3);
assert.equal(new Set(set3dA.map((shape) => shape.id)).size, 3);
assert.deepEqual(set3dA, set3dB);
set3dA.forEach((shape) => {
  assert(shape.voxels.length >= 10);
  assert(new Set(shape.voxels.map((voxel) => voxel.mat)).size >= 2);
  assert(shape.center.every(Number.isFinite));
});
ok("Pinpoise 3D sets are deterministic, varied and density-weighted");
const play3dDate = Array.from({ length: 30 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 27 + i)).toISOString().slice(0, 10),
).find((date) =>
  ["cat", "bot", "comet"].includes(mode3d.make3DSet(date)[0].id),
);
assert(play3dDate);
const play3d = env(play3dDate);
play3d.api.mode3d.start3D();
assert(play3d.w.document.querySelector(".stage3"));
assert.equal(play3d.w.document.querySelectorAll(".density3 > span").length, 2);
assert.equal(play3d.frame(), 1);
assert.equal(play3d.frame(), 0);
const canvas3d = play3d.w.document.querySelector("#cv3"),
  drop3d = play3d.w.document.querySelector("#drop3");
play3d.w.document.querySelector("#pin3").click();
assert.equal(
  play3d.w.document.querySelector("#pin3").getAttribute("aria-pressed"),
  "true",
);
canvas3d.dispatchEvent(
  new play3d.w.KeyboardEvent("keydown", { key: "Enter", cancelable: true }),
);
assert(!drop3d.disabled);
drop3d.click();
play3d.frame();
assert(play3d.w.document.querySelector(".result3"));
play3d.w.document.querySelector("#next3").click();
assert(
  play3d.w.document
    .querySelector(".round-header")
    .textContent.includes("Object 2 of 3"),
);
play3d.close();
ok(
  "Pinpoise 3D has separate tools, idles between input, and supports keyboard play",
);

const result3d = env(play3dDate);
const sample3d = [
  { name: "Comet", cm: 0.8, pts: 92 },
  { name: "Arch", cm: 2.1, pts: 71 },
  { name: "Bot", cm: 4.4, pts: 48 },
];
result3d.api.mode3d.finish3D(sample3d);
assert(result3d.w.document.querySelector("#copy-result"));
assert(result3d.w.document.querySelector("#copy-text"));
assert.match(
  result3d.api.sharing.share3DText(sample3d, play3dDate),
  /211\/300/,
);
assert.equal(
  (await result3d.api.sharing.paint3DShare(sample3d, play3dDate)).type,
  "image/png",
);
result3d.close();
ok("Pinpoise 3D results can be shared as text or a rendered image");

const frame = { B: 400, o: { x: 0, y: 0 }, c: { x: 200, y: 200 } };
const simulate = (P, hz = 60) => {
  const p = physics.swing(body, frame, P, 0).ps;
  for (let i = 0; i < 5 * hz; i++) physics.step(p, 1 / hz);
  return p;
};
const centered = simulate(frame.c);
assert.equal(centered.th, 0);
assert.equal(centered.peak, 0);
assert.equal(physics.seated(physics.swing(body, frame, frame.c, 0).ps), 1);
const hanging = simulate({ x: 200, y: 160 });
const sideways = simulate({ x: 160, y: 200 });
assert(Math.abs(hanging.th - sideways.th) < 0.02);
assert(sideways.peak > 1);
const d1 = physics.swing(body, frame, { x: 200, y: 160 }).dm;
const d2 = physics.swing(body, frame, { x: 160, y: 200 }).dm;
assert.equal(gen.scoreOf2(d1 * 100), gen.scoreOf2(d2 * 100));
assert(gen.scoreOf2(d1 * 100) < 100);
assert(gen.scoreOf2(2) > gen.scoreOf2(3));
assert.equal(gen.scoreOf2(2), gen.scoreOf2(2.04));
assert.equal(gen.cmShown(2.04), 2);
assert.equal(gen.TW.moon.g, gen.TW.classic.g);
assert.equal(gen.TW.jupiter.g, gen.TW.classic.g);
for (const P of [
  { x: 160, y: 200 },
  { x: 195, y: 200 },
  { x: 120, y: 200 },
]) {
  const w = Math.sqrt(physics.swing(body, frame, P, 0).ps.w2);
  assert(w >= physics.W_MIN && w <= physics.W_MAX);
}
let prev = 101;
for (let cm = 0; cm <= 12.01; cm += 0.1) {
  const s = gen.scoreOf2(cm);
  assert(s <= prev, `score rose at ${cm.toFixed(1)} cm: ${s} > ${prev}`);
  prev = s;
}
ok(
  "Exact center stays still; equal-distance misses share a score and comparable wobble",
);
const mirror = simulate({ x: 240, y: 200 });
assert(Math.abs(mirror.th + sideways.th) < 1e-9);
assert.equal(simulate({ x: 160, y: 200 }).th, sideways.th);
assert(Math.abs(simulate({ x: 160, y: 200 }, 30).th - sideways.th) < 1e-9);
assert(Math.abs(simulate({ x: 160, y: 200 }, 120).th - sideways.th) < 1e-9);
// Grip: the rest angle is the pendulum's 90° scaled by tilt(miss), so a wider miss tips further.
assert(physics.tilt(d2) > 0.5 && physics.tilt(d2) < 1);
assert(Math.abs(sideways.th - (physics.tilt(d2) * Math.PI) / 2) < 0.02);
const slight = simulate({ x: 195, y: 200 });
assert(slight.peak > 0 && slight.peak < sideways.peak / 3);
const near = simulate({ x: 200.0001, y: 200 });
assert(Number.isFinite(near.th));
assert.equal(near.th, 0);
const settleSeconds = (cm) => {
  const px = ((cm / 100) * frame.B) / gen.BOXM;
  const p = physics.swing(body, frame, { x: frame.c.x - px, y: frame.c.y }).ps;
  for (let i = 0; i < 4 * 60; i++) {
    physics.step(p, 1 / 60);
    if (p.calm > 0.14) return (i + 1) / 60;
  }
  return 4;
};
const settleTimes = [0.5, 2, 6].map(settleSeconds);
assert(settleTimes.every((seconds) => seconds >= physics.MIN_WOBBLE_TIME));
assert(settleTimes.every((seconds) => seconds < 3.8));
ok(
  "Wobble is deterministic, mirrored, frame-rate independent and settles at the tilt its miss allows",
);

// Make a contact sheet for visual QA of every new authored silhouette.
const names = [
  "scissors",
  "kettle",
  "watering",
  "umbrella",
  "sailboat",
  "bird",
  "fish",
  "leaf",
  "boot",
  "guitar",
  "lock",
  "rook",
  "lamp",
  "trowel",
];
const contact = createCanvas(1120, 560),
  cx = contact.getContext("2d");
cx.fillStyle = "#111";
cx.fillRect(0, 0, 1120, 560);
names.forEach((f, i) => {
  const raw = gen.mk("p3|catalog|classic", i % 5, f, gen.TW.classic);
  raw.rot = 0;
  raw.fl = false;
  const s = gen.prep(raw);
  const x = (i % 7) * 160,
    y = Math.floor(i / 7) * 280;
  cx.drawImage(s.sp._canvas, x + 10, y + 45, 140, 140);
  cx.fillStyle = "#ddd";
  cx.font = "14px sans-serif";
  cx.fillText(s.name, x + 12, y + 246);
});
mkdirSync(".taste-skill/qa", { recursive: true });
writeFileSync(
  ".taste-skill/qa/object-catalog.png",
  contact.toBuffer("image/png"),
);
const { game, stage } = e.api;
game.start("daily");
e.frame();
assert.equal(
  e.w.document.querySelector("#hint").textContent,
  "Tap to place the pin, drag to adjust, then press Drop pin.",
);
const press = (key) =>
  stage.view.cv.dispatchEvent(
    new e.w.KeyboardEvent("keydown", { key, cancelable: true }),
  );
press("ArrowRight");
const button = e.w.document.querySelector("#dp");
button.onclick();
button.onclick();
assert.equal(game.G.res.length, 1);
assert.equal(store.db.pg[store.TODAY].length, 1);
e.frame();
assert.equal(game.ui.ph, "result");
assert(
  e.w.document.querySelector(".running-total").textContent.includes("Total"),
);
assert.equal(
  e.w.document.querySelector(".score-caption").textContent,
  "This shape",
);
ok("Repeated Drop pin callback scores once and persists exactly one round");
assert.equal(game.G.ps.th, 0);
assert(e.w.document.querySelector("#ft").textContent.includes("Motion is off"));
assert.equal(e.w.document.querySelector(".reveal-key"), null);
assert(
  !e.w.document
    .querySelector("#ft")
    .textContent.includes("Distance determines"),
);
ok(
  "Reduced-motion result stays at its original angle with concise result copy",
);
const snapshot = JSON.parse(e.w.localStorage.getItem("poise:v4"));
const resume = env("2026-10-25", snapshot, { m: "daily", d: "2026-10-25" });
const lv = resume.api.game.live();
resume.api.game.start(lv.m, lv.d);
assert.equal(resume.api.game.G.r, 1);
assert.equal(resume.api.game.G.res.length, 1);
resume.close();
ok("Reload resumes at the next unplayed object");
for (let i = 1; i < 5; i++) {
  e.w.document.querySelector("#nx").click();
  await new Promise((r) => setTimeout(r, 10));
  e.frame();
  press("Enter");
  e.frame();
}
e.w.document.querySelector("#nx").click();
await new Promise((r) => setTimeout(r, 10));
assert.equal(game.ui.ph, "end");
const rec = store.db.days[store.TODAY];
assert.equal(rec.pts.length, 5);
assert.equal(rec.pins.length, 5);
assert.equal(
  rec.tot,
  rec.pts.reduce((a, b) => a + b, 0),
);
assert.equal(
  e.w.document.querySelectorAll("#result-sheet .result-object canvas").length,
  5,
);
assert.equal(
  e.w.document.querySelectorAll("#share-card .result-object canvas").length,
  5,
);
assert.match(e.w.document.querySelector("#eh").textContent, /^Top \d+%$/);
assert.equal(e.w.document.querySelectorAll(".rank-curve").length, 2);
assert(
  !e.w.document
    .querySelector("#result-sheet")
    .textContent.includes("Getting closer"),
);
game.start("daily");
assert.equal(game.ui.ph, "end");
assert.equal(store.db.streak, 1);
ok(
  "Full daily run stores five rounds, renders five thumbnails and cannot replay",
);
const syncTarget = env("2026-10-25");
assert(syncTarget.api.store.mergeSyncSave(store.syncSnapshot()));
assert.equal(syncTarget.api.store.playedCount(), 1);
assert.equal(syncTarget.api.store.db.days[store.TODAY].tot, rec.tot);
syncTarget.close();
ok("Account sync imports validated progress into a fresh browser");
// Clipboard tests exercise async capture and write failures; real PNG rendering is browser-tested.
const copyButton = e.w.document.querySelector("#copy-result");
assert.equal(copyButton.textContent, "Copy image");
assert.equal(e.w.document.querySelector("#copy-text").textContent, "Copy text");
assert.equal(
  e.w.document.querySelectorAll("#result-sheet .wordmark").length,
  1,
);
assert.equal(e.w.document.querySelectorAll(".result-actions button").length, 2);
const text = e.api.sharing.shareText(rec);
assert(text.startsWith(`Pinpoise No. ${e.api.store.noOf(rec.d)}`));
assert(text.includes(`${rec.tot}/500`));
assert(/^[🟩🟨🟧🟫⬛]{5}$/u.test(text.split("\n")[1]));
assert(e.w.document.querySelector("#share-card"));
assert(!e.w.document.querySelector("#share-preview"));
let writes = 0,
  writtenTypes = [];
e.w.ClipboardItem = class {
  constructor(data) {
    this.data = data;
  }
};
Object.defineProperty(e.w.navigator, "clipboard", {
  configurable: true,
  value: {
    write: async (items) => {
      writes++;
      writtenTypes = Object.keys(items[0].data);
      const blob = await items[0].data["image/png"];
      assert.equal(blob.type, "image/png");
    },
  },
});
let releaseCapture;
e.w.capturePending = new Promise((resolve) => {
  releaseCapture = resolve;
});
const copying = e.api.sharing.copyResult(rec);
assert.equal(writes, 1, "write starts synchronously within user activation");
assert(copyButton.disabled);
await e.api.sharing.copyResult(rec);
assert.equal(writes, 1, "repeated clicks do not duplicate an in-flight copy");
releaseCapture();
await copying;
e.w.capturePending = null;
assert.deepEqual(writtenTypes, ["image/png"]);
assert.equal(copyButton.textContent, "Copied");
assert(!copyButton.disabled);
assert(!e.w.document.querySelector("#share-card [data-copy-exclude]"));
assert.equal(
  e.w.document.querySelectorAll("#share-card .result-object canvas").length,
  5,
);
ok(
  "Copy writes one PNG directly, preserves user activation, and confirms success without a dialog",
);
for (const failure of ["render", "permission"]) {
  e.w.captureFailure = failure === "render";
  e.w.navigator.clipboard.write = async (items) => {
    await items[0].data["image/png"];
    if (failure === "permission") throw new Error("NotAllowedError");
  };
  await e.api.sharing.copyResult(rec);
  assert(!copyButton.disabled);
  assert.equal(copyButton.textContent, "Copy image");
  assert(
    e.w.document
      .querySelector("#copy-status")
      .textContent.includes("Couldn’t copy"),
  );
}
e.w.captureFailure = false;
Object.defineProperty(e.w.navigator, "clipboard", {
  configurable: true,
  value: undefined,
});
await e.api.sharing.copyResult(rec);
assert(
  e.w.document
    .querySelector("#copy-status")
    .textContent.includes("can’t copy images"),
);
assert(!e.w.document.querySelector("a[download]"));
ok(
  "Capture errors, clipboard denial and unsupported browsers recover inline with no download or sharing fallback",
);
let pasted = "";
Object.defineProperty(e.w.navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (s) => {
      pasted = s;
    },
  },
});
await e.api.sharing.copyText(rec);
assert.equal(pasted, e.api.sharing.shareText(rec));
assert.equal(e.w.document.querySelector("#copy-text").textContent, "Copied");
e.api.home.home();
assert(e.w.document.querySelector(".home-rule").textContent.includes("gap"));
assert(!e.w.document.body.textContent.includes("Practice"));
assert.equal(e.w.document.querySelectorAll(".primary-nav button").length, 4);
assert(e.w.document.querySelector("#hp"));
e.w.document.querySelector("#hp").click();
assert(e.w.document.querySelector("#sht").textContent.includes("How to play"));
e.w.document.querySelector("#xs").click();
assert(e.w.document.querySelector("#me"));
assert(!e.w.document.querySelector("#st"));
assert(e.w.document.querySelector("#se"));
e.w.document.querySelector("#me").click();
assert.equal(e.w.document.querySelector("#sht").textContent, "Account");
assert.equal(e.w.document.querySelectorAll(".stats > div").length, 4);
assert(!e.w.document.querySelector('input[name="theme"]'));
assert(e.w.document.querySelector("#account-in"));
e.w.document.querySelector("#account-in").click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(e.w.document.querySelector("#sht").textContent, "Sign in to sync");
assert(e.w.document.querySelector('#signin-form input[type="email"]'));
assert(e.w.document.querySelector('#signin-form input[type="password"]'));
assert(e.w.document.querySelector("#google-in"));
assert.equal(
  e.w.document.querySelector("#signin-password").autocomplete,
  "current-password",
);
e.w.document.querySelector('[data-auth-mode="signup"]').click();
assert.equal(
  e.w.document.querySelector("#signin-send").textContent,
  "Create account",
);
assert.equal(
  e.w.document.querySelector("#signin-password").autocomplete,
  "new-password",
);
e.w.document.querySelector("#xs").click();
e.w.document.querySelector("#se").click();
assert.equal(e.w.document.querySelector("#sht").textContent, "Settings");
assert(e.w.document.querySelector('input[name="theme"]'));
assert(!e.w.document.querySelector("#account-in"));
e.w.document.querySelector("#xs").click();
ok("Home exposes separate Archive, Account, Settings and How to play actions");
// Archive resumes after midnight must not count as today's completion.
const old = {
  days: {},
  pg: {
    "2026-10-24": Array.from({ length: 5 }, () => ({
      pts: 50,
      cm: 2.8,
      lp: [0.5, 0.5],
    })),
  },
  streak: 0,
  last: "",
  best: 0,
  max: 0,
};
const older = env("2026-10-25", old, { m: "daily", d: "2026-10-24" });
older.api.game.start("daily", "2026-10-24");
assert.equal(older.api.store.db.streak, 0);
assert.equal(older.api.store.db.days["2026-10-24"].m, "archive");
assert(!older.api.store.db.days["2026-10-25"]);
older.close();
ok(
  "Resuming yesterday records an archive result without extending today’s streak",
);
const corrupt = {
  days: {
    "2026-10-25": { ...JSON.parse(JSON.stringify(rec)), pts: [...rec.pts, 23] },
  },
  pg: {},
  streak: 99,
  last: "2026-10-25",
};
const recovery = env("2026-10-25", corrupt);
assert.equal(Object.keys(recovery.api.store.db.days).length, 0);
assert(recovery.api.store.recoveredSave);
assert(recovery.w.localStorage.getItem("poise:v4:recovery-backup"));
recovery.close();
ok("Malformed six-round record is backed up and excluded from scores");
// Keep production free of accidental practice routes and emoji UI.
for (const f of ["home", "end", "game", "sheets", "share"])
  assert(!/start\(['"]free/.test(readFileSync(`src/${f}.ts`, "utf8")));
game.start("archive", "2026-10-24");
e.frame();
stage.view.cv.onpointerdown({
  pointerType: "touch",
  pointerId: 1,
  clientX: 400,
  clientY: 250,
});
assert.equal(game.G.P.x, 400);
assert.equal(game.G.P.y, 250);
assert.equal(game.G.precision, false);
stage.view.cv.onpointermove({ clientX: 415, clientY: 260 });
assert.equal(game.G.P.x, 415);
assert.equal(game.G.P.y, 260);
assert.equal(game.G.precision, true);
e.frame();
ok(
  "Touch drags enable a magnifier without displacing the pin or revealing the answer",
);
stage.view.cv.onpointerup({ type: "pointerup" });
assert.equal(game.ui.ph, "aim");
assert.equal(game.G.res.length, 0);
const before = stage.geo(game.G.rounds[0]);
const unit = [
  (game.G.P.x - before.o.x) / before.B,
  (game.G.P.y - before.o.y) / before.B,
];
stage.view.f = { x: 0, y: 80, w: 390, h: 300 };
e.frame();
const after = stage.geo(game.G.rounds[0]);
assert(Math.abs((game.G.P.x - after.o.x) / after.B - unit[0]) < 1e-9);
assert(Math.abs((game.G.P.y - after.o.y) / after.B - unit[1]) < 1e-9);
ok(
  "Touch places the pin at the actual tap; release does not submit; viewport changes preserve its position on the object",
);
e.close();
writeFileSync(
  ".taste-skill/qa/tests.json",
  JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
);
console.log(`\n${checks.length} checks passed.`);
