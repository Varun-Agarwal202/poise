import type { Rec } from "./store";

export interface RankData {
  betterThan: number;
  players: number;
  bins: number[];
}

const PLAYER_KEY = "pinpoise:player";

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

export function rankLabel(rank: RankData) {
  if (rank.players < 10)
    return rank.players === 1
      ? "First score today"
      : `${rank.players} players today`;
  return `Better than ${rank.betterThan}% of today’s players`;
}
