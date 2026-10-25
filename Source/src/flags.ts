// Override per browser with ?ff=name or ?ff=-name (persisted).
const DEFAULTS = { coach: true, challenge: true, archive: true };
export type Flag = keyof typeof DEFAULTS;

const STORE = "poise:ff";
let local: Partial<Record<Flag, boolean>> = {};
try {
  local = JSON.parse(localStorage.getItem(STORE) || "{}");
} catch {}
const qs = new URLSearchParams(location.search).get("ff");
if (qs) {
  qs.split(",")
    .filter(Boolean)
    .forEach((f) => {
      const off = f[0] === "-";
      local[(off ? f.slice(1) : f) as Flag] = !off;
    });
  try {
    localStorage.setItem(STORE, JSON.stringify(local));
  } catch {}
}

export function flag(n: Flag): boolean {
  return n in local ? !!local[n] : DEFAULTS[n];
}
