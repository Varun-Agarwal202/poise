import { FORMS_V4 } from "./forms-v4";
import type { Part } from "./gen";

/** Oct 24, 2026–Feb 4, 2030 inclusive. Frozen IDs never wrap or shuffle again. */
export const UNIQUE_DAYS = FORMS_V4.length / 5;
export const UNIQUE_START = 3;
export const LAST_DAY_INDEX = UNIQUE_START + UNIQUE_DAYS - 1;
export function uniqueIds(day: number): string[] {
  const index = day - UNIQUE_START;
  if (!Number.isInteger(index) || index < 0 || index >= UNIQUE_DAYS)
    throw new RangeError("No new shapes scheduled for this date");
  return Array.from({ length: 5 }, (_, i) => `v4-${index * 5 + i}`);
}
export function formIndex(id: string): number {
  if (!/^v4-(0|[1-9]\d*)$/.test(id)) return -1;
  const n = Number(id.slice(3));
  return n < FORMS_V4.length ? n : -1;
}
type Point = [number, number];
/** Trace the union boundary, not individual cells: no tile seams in the artwork. */
export function outline(index: number): Point[] {
  const code = FORMS_V4[index];
  if (!code) throw new RangeError("Unknown catalogue shape");
  const cells: Point[] = code
    .match(/../g)!
    .map((s) => [parseInt(s[0], 36), parseInt(s[1], 36)]);
  const key = (p: Point) => p.join(",");
  const occupied = new Set(cells.map(key)),
    edges = new Map<string, Point>();
  for (const [x, y] of cells) {
    if (!occupied.has(`${x},${y - 1}`)) edges.set(`${x},${y}`, [x + 1, y]);
    if (!occupied.has(`${x + 1},${y}`))
      edges.set(`${x + 1},${y}`, [x + 1, y + 1]);
    if (!occupied.has(`${x},${y + 1}`))
      edges.set(`${x + 1},${y + 1}`, [x, y + 1]);
    if (!occupied.has(`${x - 1},${y}`)) edges.set(`${x},${y + 1}`, [x, y]);
  }
  const first = edges.keys().next().value!,
    points: Point[] = [];
  let at = first;
  do {
    points.push(at.split(",").map(Number) as Point);
    const next = edges.get(at);
    if (!next || points.length > edges.size)
      throw Error("Invalid catalogue boundary");
    at = key(next);
  } while (at !== first);
  if (points.length !== edges.size)
    throw Error("Disconnected catalogue boundary");
  return points.filter(([x, y], i) => {
    const a = points[(i + points.length - 1) % points.length],
      b = points[(i + 1) % points.length];
    return (x - a[0]) * (b[1] - y) !== (y - a[1]) * (b[0] - x);
  });
}
export function formParts(
  index: number,
  material: (n: number) => string,
): Part[] {
  const style = index % 5;
  let points = outline(index);
  // Chamfers keep the underlying silhouette legible while broad curves provide
  // a softer fifth member. The underlying form is unique regardless of finish.
  if (style === 2 || style === 3)
    points = points.flatMap((p, i) => {
      const a = points[(i + points.length - 1) % points.length],
        b = points[(i + 1) % points.length];
      const towards = (q: Point): Point => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        return [
          p[0] + ((q[0] - p[0]) * 0.24) / d,
          p[1] + ((q[1] - p[1]) * 0.24) / d,
        ];
      };
      return [towards(a), towards(b)];
    });
  const width = Math.max(...points.map((p) => p[0])),
    height = Math.max(...points.map((p) => p[1]));
  const scale = 0.7 / Math.max(width, height);
  const xy = points.flatMap(([x, y]) => [
    (x - width / 2) * scale,
    (y - height / 2) * scale,
  ]);
  const parts: Part[] = [
    [material(0), style === 1 || style === 3 || style === 4 ? "b" : "p", ...xy],
  ];
  // One broad inlay changes mass, never the boundary. No tiny decorative noise.
  parts.push([
    material(1) + "+",
    "r",
    0,
    (-height * scale) / 2 - 0.02,
    (width * scale) / 2 + 0.02,
    height * scale + 0.04,
  ]);
  return parts;
}
export const formName = (index: number) =>
  ["Bracket", "Contour", "Facet", "Cast", "Curve"][index % 5];
