// Build once, then commit. Never regenerate an existing edition's catalogue.
// Each free polyform occurs once, even under translation, rotation or reflection.
import { writeFileSync } from "node:fs";
let state = 0x504f4953;
const random = () => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
};
const key = (x, y) => `${x},${y}`;
function canonical(cells) {
  const versions = [];
  for (let flip = 0; flip < 2; flip++)
    for (let turn = 0; turn < 4; turn++) {
      const points = cells.map(([a, b]) => {
        let x = flip ? -a : a,
          y = b;
        for (let i = 0; i < turn; i++) [x, y] = [-y, x];
        return [x, y];
      });
      const minX = Math.min(...points.map((p) => p[0])),
        minY = Math.min(...points.map((p) => p[1]));
      versions.push(
        points
          .map(([x, y]) => [x - minX, y - minY])
          .sort((a, b) => a[1] - b[1] || a[0] - b[0])
          .map(([x, y]) => x.toString(36) + y.toString(36))
          .join(""),
      );
    }
  return versions.sort()[0];
}
function suitable(cells) {
  const s = new Set(cells.map(([x, y]) => key(x, y)));
  const xs = cells.map((p) => p[0]),
    ys = cells.map((p) => p[1]);
  const l = Math.min(...xs),
    r = Math.max(...xs),
    t = Math.min(...ys),
    b = Math.max(...ys);
  if (
    r - l < 2 ||
    b - t < 2 ||
    Math.max(r - l + 1, b - t + 1) / Math.min(r - l + 1, b - t + 1) > 2
  )
    return false;
  // Exclude point-touching boundaries and enclosed holes. Deep open gaps remain.
  for (let y = t - 1; y <= b; y++)
    for (let x = l - 1; x <= r; x++) {
      const a = s.has(key(x, y)),
        c = s.has(key(x + 1, y)),
        d = s.has(key(x, y + 1)),
        e = s.has(key(x + 1, y + 1));
      if (a === e && c === d && a !== c) return false;
    }
  const air = new Set(),
    queue = [[l - 1, t - 1]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i],
      k = key(x, y);
    if (
      x < l - 1 ||
      x > r + 1 ||
      y < t - 1 ||
      y > b + 1 ||
      s.has(k) ||
      air.has(k)
    )
      continue;
    air.add(k);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return air.size + s.size === (r - l + 3) * (b - t + 3);
}
const forms = [],
  seen = new Set();
let attempts = 0;
while (forms.length < 6000) {
  if (++attempts > 1000000) throw Error("Catalogue could not be filled");
  const n = 8 + Math.floor(random() * 5),
    cells = [[0, 0]],
    occupied = new Set(["0,0"]);
  while (cells.length < n) {
    const [x, y] = cells[Math.floor(random() * cells.length)];
    const [dx, dy] = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ][Math.floor(random() * 4)];
    if (!occupied.has(key(x + dx, y + dy))) {
      cells.push([x + dx, y + dy]);
      occupied.add(key(x + dx, y + dy));
    }
  }
  if (!suitable(cells)) continue;
  const code = canonical(cells);
  if (seen.has(code)) continue;
  seen.add(code);
  forms.push(code);
}
// Fixed shuffle breaks discovery-order difficulty trends. Five different contour
// treatments per day; no cell arrangement is reused across those treatments.
for (let i = forms.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [forms[i], forms[j]] = [forms[j], forms[i]];
}
writeFileSync(
  "src/forms-v4.ts",
  "// Frozen v4 catalogue. Append a new version; never reorder these entries.\nexport const FORMS_V4 = " +
    JSON.stringify(forms, null, 2) +
    " as const;\n",
);
console.log(
  `${forms.length} distinct free polyforms; ${attempts} candidates inspected.`,
);
