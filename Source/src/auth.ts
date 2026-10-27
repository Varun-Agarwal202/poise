import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { mergeSyncSave, syncSnapshot } from "./store";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const url = (() => {
  if (!configuredUrl) return undefined;
  try {
    // Cloudflare values are easy to paste from a REST screen with `/rest/v1`
    // attached. The client needs the project origin only.
    return new URL(configuredUrl).origin;
  } catch {
    return undefined;
  }
})();
const client: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const account = {
  configured: !!client,
  loading: !!client,
  email: "",
  synced: false,
  error: "",
};

let session: Session | null = null;
let syncing: Promise<boolean> | null = null;

const announce = () => dispatchEvent(new Event("pinpoise:account"));

function setSession(next: Session | null) {
  session = next;
  account.loading = false;
  account.email = next?.user.email || "";
  account.synced = false;
  account.error = "";
  announce();
}

async function syncSession(active: Session) {
  if (syncing) return syncing;
  syncing = (async () => {
    account.error = "";
    try {
      const headers = { Authorization: `Bearer ${active.access_token}` };
      const remote = await fetch("/api/sync", { headers });
      if (remote.ok) {
        const body = (await remote.json()) as { save?: unknown };
        if (body.save && mergeSyncSave(body.save))
          dispatchEvent(new Event("pinpoise:sync"));
      } else if (remote.status !== 404) throw new Error("Sync unavailable");
      const upload = await fetch("/api/sync", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ save: syncSnapshot() }),
      });
      if (!upload.ok) throw new Error("Sync unavailable");
      account.synced = true;
      announce();
      return true;
    } catch {
      account.error =
        "Couldn’t sync. Your results are still safe on this device.";
      announce();
      return false;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export async function initAccount() {
  if (!client) return;
  const { data } = await client.auth.getSession();
  setSession(data.session);
  if (data.session) await syncSession(data.session);
  client.auth.onAuthStateChange((event, next) => {
    setSession(next);
    if (next) setTimeout(() => void syncSession(next), 0);
    if (event === "PASSWORD_RECOVERY")
      setTimeout(
        () => dispatchEvent(new Event("pinpoise:password-recovery")),
        0,
      );
  });
}

export async function signInWithGoogle() {
  if (!client) return "Account syncing is not configured yet.";
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin },
  });
  return error ? error.message : "";
}

export async function signInWithPassword(email: string, password: string) {
  if (!client) return "Account syncing is not configured yet.";
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? error.message : "";
}

export async function createAccount(email: string, password: string) {
  if (!client)
    return {
      error: "Account syncing is not configured yet.",
      confirmation: false,
    };
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin },
  });
  return { error: error?.message || "", confirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  if (!client) return "Account syncing is not configured yet.";
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin,
  });
  return error ? error.message : "";
}

export async function updatePassword(password: string) {
  if (!client) return "Account syncing is not configured yet.";
  const { error } = await client.auth.updateUser({ password });
  return error ? error.message : "";
}

export async function signOut() {
  if (!client) return;
  await client.auth.signOut();
  setSession(null);
}

export async function syncAccount() {
  if (!session) return false;
  return syncSession(session);
}
