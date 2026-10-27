interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface Database {
  prepare(query: string): Statement;
}

interface Env {
  SCORES: Database;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

async function accountId(request: Request, env: Env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      authorization,
    },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: unknown };
  return typeof user.id === "string" ? user.id : null;
}

export async function onRequestGet({ request, env }: Context) {
  const id = await accountId(request, env);
  if (!id) return json({ error: "Sign in required" }, 401);
  const row = await env.SCORES.prepare(
    "SELECT save_json AS save FROM account_saves WHERE account_id = ?",
  )
    .bind(id)
    .first<{ save: string }>();
  if (!row) return json({ save: null }, 404);
  try {
    return json({ save: JSON.parse(row.save) });
  } catch {
    return json({ save: null }, 404);
  }
}

export async function onRequestPost({ request, env }: Context) {
  const id = await accountId(request, env);
  if (!id) return json({ error: "Sign in required" }, 401);
  if (Number(request.headers.get("content-length") || 0) > 500_000)
    return json({ error: "Save is too large" }, 413);
  let save: unknown;
  try {
    const body = (await request.json()) as { save?: unknown };
    save = body.save;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!save || typeof save !== "object")
    return json({ error: "Invalid save" }, 400);
  const encoded = JSON.stringify(save);
  if (encoded.length > 500_000)
    return json({ error: "Save is too large" }, 413);
  await env.SCORES.prepare(
    "INSERT INTO account_saves (account_id, save_json, updated_at) VALUES (?, ?, ?) ON CONFLICT (account_id) DO UPDATE SET save_json = excluded.save_json, updated_at = excluded.updated_at",
  )
    .bind(id, encoded, Date.now())
    .run();
  return json({ ok: true });
}
