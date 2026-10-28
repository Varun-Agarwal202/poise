import type { Rec } from "./store";

export interface RankData {
  betterThan: number;
  players: number;
  bins: number[];
}

const PLAYER_KEY = "pinpoise:player";
export const REAL_RANK_MINIMUM = 100;
export const USE_LIVE_RANKS = true;
const FALLBACK_CENTER = 350;
const FALLBACK_SPREAD = 70;
const TOP_PERCENT_ANCHORS: [score: number, top: number][] = [
  [0, 99],
  [250, 92],
  [300, 76],
  [350, 50],
  [375, 36],
  [400, 24],
  [425, 16],
  [450, 9],
  [475, 4],
  [490, 2],
  [500, 1],
];

export function fallbackTopPercent(total: number) {
  const score = Math.min(500, Math.max(0, total));
  for (let i = 1; i < TOP_PERCENT_ANCHORS.length; i++) {
    const [highScore, highTop] = TOP_PERCENT_ANCHORS[i];
    if (score > highScore) continue;
    const [lowScore, lowTop] = TOP_PERCENT_ANCHORS[i - 1],
      progress = (score - lowScore) / (highScore - lowScore);
    return Math.round(lowTop + (highTop - lowTop) * progress);
  }
  return 1;
}

export const fallbackRank = (total: number) =>
  `Top ${fallbackTopPercent(total)}%`;

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

/** Submit one anonymous score per browser and puzzle, then return the global distribution. */
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
  if (!USE_LIVE_RANKS || rank.players < REAL_RANK_MINIMUM)
    return fallbackRank(total);
  return `Top ${Math.max(1, 100 - rank.betterThan)}%`;
}
