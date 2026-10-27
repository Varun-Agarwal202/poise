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

  const summary = await env.SCORES.prepare(
    "SELECT COUNT(*) AS players, SUM(CASE WHEN score < ? THEN 1 ELSE 0 END) AS lower, SUM(CASE WHEN score = ? THEN 1 ELSE 0 END) AS tied FROM scores WHERE puzzle = ?",
  )
    .bind(body.score, body.score, body.puzzle)
    .first<{ players: number; lower: number; tied: number }>();
  const distribution = await env.SCORES.prepare(
    "SELECT CASE WHEN score = 500 THEN 19 ELSE CAST(score / 25 AS INTEGER) END AS bucket, COUNT(*) AS amount FROM scores WHERE puzzle = ? GROUP BY bucket ORDER BY bucket",
  )
    .bind(body.puzzle)
    .all<{ bucket: number; amount: number }>();

  const players = Number(summary?.players || 1);
  const lower = Number(summary?.lower || 0);
  const tied = Number(summary?.tied || 1);
  const betterThan = Math.max(
    1,
    Math.min(99, Math.round(((lower + tied * 0.5) / players) * 100)),
  );
  const bins = Array(20).fill(0) as number[];
  for (const row of distribution.results || []) {
    const bucket = Number(row.bucket);
    if (bucket >= 0 && bucket < bins.length) bins[bucket] = Number(row.amount);
  }

  return json({ betterThan, players, bins });
}

export const onRequestGet = () => json({ error: "Use POST" }, 405);
