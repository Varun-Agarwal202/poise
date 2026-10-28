import { modelScoreDistribution } from "../../src/rank-model";

interface D1Result<T> {
  results?: T[];
}

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

interface Database {
  prepare(query: string): Statement;
}

interface Env {
  SCORES: Database;
}

interface Context {
  request: Request;
  env: Env;
}

interface ScoreBody {
  puzzle?: unknown;
  player?: unknown;
  score?: unknown;
  scores?: unknown;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const validDate = (value: unknown): value is string =>
  typeof value === "string" && /^20\d\d-\d\d-\d\d$/.test(value);

const validPlayer = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const validScore = (value: unknown, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max;

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }: Context) {
  if (!env.SCORES)
    return json({ error: "Score database is not connected" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return json({ error: "Request is too large" }, 413);

  let body: ScoreBody;
  try {
    body = (await request.json()) as ScoreBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (
    !validDate(body.puzzle) ||
    !validPlayer(body.player) ||
    !validScore(body.score, 500) ||
    !Array.isArray(body.scores) ||
    body.scores.length !== 5 ||
    !body.scores.every((score) => validScore(score, 100)) ||
    body.scores.reduce((sum, score) => sum + Number(score), 0) !== body.score
  )
    return json({ error: "Invalid score" }, 400);

  const playerHash = await hash(body.player);
  await env.SCORES.prepare(
    "INSERT INTO scores (puzzle, player_hash, score, submitted_at) VALUES (?, ?, ?, ?) ON CONFLICT (puzzle, player_hash) DO NOTHING",
  )
    .bind(body.puzzle, playerHash, body.score, Date.now())
    .run();

  const distribution = await env.SCORES.prepare(
    "SELECT score, COUNT(*) AS amount FROM scores GROUP BY score ORDER BY score",
  ).all<{ score: number; amount: number }>();
  const modeled = modelScoreDistribution(
    distribution.results || [],
    Number(body.score),
  );

  return json({
    betterThan: modeled.betterThan,
    players: modeled.samples,
    bins: modeled.bins,
  });
}

export const onRequestGet = () => json({ error: "Use POST" }, 405);
