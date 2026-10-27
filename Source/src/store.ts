import { famsFor, famsFor2, twistFor, TW, type Twist } from "./gen";
import { uniqueIds, UNIQUE_START, LAST_DAY_INDEX } from "./unique";

export type Mode = "daily" | "archive";
export interface RoundSave {
  pts: number;
  lp: number[];
  cm: number;
}
export interface Rec {
  tot: number;
  pts: number[];
  cm: number[];
  seed: string;
  fams: string[];
  pins: number[][];
  m: Mode;
  d: string;
  at: number;
}
export interface DB {
  days: Record<string, Rec>;
  streak: number;
  last: string;
  best: number;
  max: number;
  pg: Record<string, RoundSave[]>;
  prog?: { d: string; r: RoundSave[] };
}

export const RN = 5,
  EPOCH = "2026-10-21";
const KEY = "poise:v4";

export const ds = (d: Date) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");
export const pd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Puzzles before this day number keep generator v1 forever. */
const V2 = 2,
  MATERIAL_V5 = 7;
export interface Puzzle {
  seed: string;
  fams: string[];
  tw: Twist | null;
}
export function puzzleOf(d: string): Puzzle {
  const n = dnOf(d);
  if (n < V2) {
    const seed = "poise" + d;
    return { seed, fams: famsFor(seed), tw: null };
  }
  let t = twistFor(n);
  if (n >= UNIQUE_START) {
    // The catalogue owns the silhouette. A random cutout must never change it.
    if (t === "holes") t = "classic";
    const version = n >= MATERIAL_V5 ? "p5" : "p4";
    return { seed: `${version}|poise${d}|${t}`, fams: uniqueIds(n), tw: TW[t] };
  }
  return { seed: `p2|poise${d}|${t}`, fams: famsFor2(n), tw: TW[t] };
}
const fake = import.meta.env.DEV
  ? new URLSearchParams(location.search).get("today")
  : null;
/** Dev-only `?today=YYYY-MM-DD` pins the date for QA. */
export const PINNED = !!fake && /^\d{4}-\d\d-\d\d$/.test(fake);
const now = PINNED ? pd(fake!) : new Date();
export const TODAY = ds(now),
  YEST = ds(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
export const dnOf = (s: string) => Math.round((+pd(s) - +pd(EPOCH)) / 864e5);
export const available = (s: string) => {
  const n = dnOf(s);
  return Number.isInteger(n) && n >= 0 && n <= LAST_DAY_INDEX;
};
export const noOf = (s: string) => String(dnOf(s) + 1).padStart(3, "0");
export const NO = noOf(TODAY);
export const dateOfNo = (n: number) => {
  const e = pd(EPOCH);
  return ds(new Date(e.getFullYear(), e.getMonth(), e.getDate() + n - 1));
};
export const fmtDate = (s: string, short = false) =>
  pd(s).toLocaleDateString(
    undefined,
    short
      ? { month: "short", day: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" },
  );
export const untilNext = () => {
  const n = new Date(),
    m = +new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - +n,
    h = Math.floor(m / 36e5),
    mi = Math.floor((m % 36e5) / 6e4);
  return h ? `${h}h ${mi}m` : `${mi || 1}m`;
};

const empty = (): DB => ({
  days: {},
  streak: 0,
  last: "",
  best: 0,
  max: 0,
  pg: {},
});
export let db: DB = empty();
export let recoveredSave = false;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const points = (v: unknown): v is number =>
  finite(v) && Number.isInteger(v) && v >= 0 && v <= 100;
const pair = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 2 && v.every(finite);
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\d$/.test(v) &&
  ds(pd(v)) === v &&
  v >= EPOCH &&
  v <= TODAY;
export function validRecord(r: unknown, d: string): r is Rec {
  if (!r || typeof r !== "object" || !available(d)) return false;
  const v = r as Rec,
    p = puzzleOf(d);
  return (
    Array.isArray(v.pts) &&
    v.pts.length === RN &&
    v.pts.every(points) &&
    v.tot === v.pts.reduce((a, b) => a + b, 0) &&
    Array.isArray(v.cm) &&
    v.cm.length === RN &&
    v.cm.every((x) => finite(x) && x >= 0) &&
    Array.isArray(v.pins) &&
    v.pins.length === RN &&
    v.pins.every(pair) &&
    Array.isArray(v.fams) &&
    v.fams.length === RN &&
    v.seed === p.seed &&
    v.fams.join(",") === p.fams.join(",")
  );
}
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") throw new Error("Invalid save");
    for (const [d, r] of Object.entries(data.days ?? {})) {
      if (date(d) && validRecord(r, d))
        db.days[d] = {
          ...r,
          d,
          m: d === TODAY && r.m === "daily" ? "daily" : "archive",
        };
      else recoveredSave = true;
    }
    const pending = { ...(data.pg ?? {}) };
    if (data.prog?.d) pending[data.prog.d] = data.prog.r;
    for (const [d, r] of Object.entries(pending)) {
      if (
        date(d) &&
        available(d) &&
        !db.days[d] &&
        Array.isArray(r) &&
        r.length <= RN &&
        r.every(
          (q) => q && points(q.pts) && pair(q.lp) && finite(q.cm) && q.cm >= 0,
        )
      )
        db.pg[d] = r;
      else if (!db.days[d]) recoveredSave = true;
    }
    // Keep streak history from valid daily completions; archive play never extends it.
    db.last = date(data.last) && db.days[data.last] ? data.last : "";
    db.streak = Number.isInteger(data.streak)
      ? Math.max(0, Math.min(data.streak, Object.keys(db.days).length))
      : 0;
    db.max = Number.isInteger(data.max)
      ? Math.max(db.streak, Math.min(data.max, Object.keys(db.days).length))
      : db.streak;
    if (recoveredSave) localStorage.setItem(KEY + ":recovery-backup", raw);
  }
} catch {
  recoveredSave = true;
}
db.best = Math.max(0, ...Object.values(db.days).map((r) => r.tot));
export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
};

export const syncSnapshot = (): DB => JSON.parse(JSON.stringify(db)) as DB;

/** Merge an account save into this browser. The already-synced account wins same-day conflicts. */
export function mergeSyncSave(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const remote = value as Partial<DB>;
  let changed = false;
  if (remote.days && typeof remote.days === "object")
    for (const [d, record] of Object.entries(remote.days))
      if (date(d) && validRecord(record, d)) {
        const next: Rec = {
          ...record,
          d,
          m: d === TODAY && record.m === "daily" ? "daily" : "archive",
        };
        if (JSON.stringify(db.days[d]) !== JSON.stringify(next)) changed = true;
        db.days[d] = next;
        delete db.pg[d];
      }
  if (remote.pg && typeof remote.pg === "object")
    for (const [d, rounds] of Object.entries(remote.pg))
      if (
        date(d) &&
        !db.days[d] &&
        !db.pg[d] &&
        Array.isArray(rounds) &&
        rounds.length <= RN &&
        rounds.every(
          (q) => q && points(q.pts) && pair(q.lp) && finite(q.cm) && q.cm >= 0,
        )
      ) {
        db.pg[d] = rounds;
        changed = true;
      }
  if (
    remote.last &&
    date(remote.last) &&
    db.days[remote.last] &&
    remote.last >= db.last
  ) {
    if (db.last !== remote.last || db.streak !== remote.streak) changed = true;
    db.last = remote.last;
    db.streak = Number.isInteger(remote.streak)
      ? Math.max(
          0,
          Math.min(Number(remote.streak), Object.keys(db.days).length),
        )
      : db.streak;
  }
  if (Number.isInteger(remote.max))
    db.max = Math.max(db.max, db.streak, Number(remote.max));
  db.best = Math.max(0, ...Object.values(db.days).map((record) => record.tot));
  if (changed) save();
  return changed;
}

export const streakNow = () =>
  db.last === TODAY || db.last === YEST ? db.streak : 0;
export const playedCount = () => Object.keys(db.days).length;
