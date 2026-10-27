import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { mergeSyncSave, syncSnapshot } from "./store";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
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
  client.auth.onAuthStateChange((_event, next) => {
    setSession(next);
    if (next) setTimeout(() => void syncSession(next), 0);
  });
}

export async function sendSignInLink(email: string) {
  if (!client) return "Account syncing is not configured yet.";
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin },
  });
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
