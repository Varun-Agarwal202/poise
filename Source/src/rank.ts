import type { Rec } from "./store";

export interface RankData {
  betterThan: number;
  players: number;
  bins: number[];
}

const PLAYER_KEY = "pinpoise:player";
export const REAL_RANK_MINIMUM = 20;
const FALLBACK_CENTER = 225;
const FALLBACK_SPREAD = 110;

export function fallbackPercentile(total: number) {
  const z =
    (Math.min(500, Math.max(0, total)) - FALLBACK_CENTER) /
    (FALLBACK_SPREAD * Math.SQRT2);
  const a = 0.147;
  const z2 = z * z;
  const erf =
    Math.sign(z) *
    Math.sqrt(1 - Math.exp((-z2 * (4 / Math.PI + a * z2)) / (1 + a * z2)));
  return Math.min(99, Math.max(1, Math.round(50 * (1 + erf))));
}

export const fallbackRank = (total: number) =>
  `Top ${Math.max(1, 100 - fallbackPercentile(total))}%`;

export function fallbackBins() {
  return Array.from({ length: 20 }, (_, i) => {
    const score = i * 25 + 12.5;
    return Math.max(
      1,
      Math.round(
        100 *
          Math.exp(
            -0.5 * Math.pow((score - FALLBACK_CENTER) / FALLBACK_SPREAD, 2),
          ),
      ),
    );
  });
}

function playerId() {
  try {
    const saved = localStorage.getItem(PLAYER_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function validRank(value: unknown): value is RankData {
  if (!value || typeof value !== "object") return false;
  const rank = value as RankData;
  return (
    Number.isInteger(rank.betterThan) &&
    rank.betterThan >= 1 &&
    rank.betterThan <= 99 &&
    Number.isInteger(rank.players) &&
    rank.players > 0 &&
    Array.isArray(rank.bins) &&
    rank.bins.length === 20 &&
    rank.bins.every((n) => Number.isInteger(n) && n >= 0)
  );
}

/** Submit one anonymous score per browser and puzzle, then return the live distribution. */
export async function submitRank(rec: Rec): Promise<RankData | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/api/rank", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        puzzle: rec.d,
        player: playerId(),
        score: rec.tot,
        scores: rec.pts,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return validRank(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function rankLabel(rank: RankData, total: number) {
  if (rank.players < REAL_RANK_MINIMUM) return fallbackRank(total);
  return `Better than ${rank.betterThan}% of today’s players`;
}
