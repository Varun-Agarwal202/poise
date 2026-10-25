type Props = Record<string, unknown>;
const QS = new URLSearchParams(location.search);
export const DEBUG = QS.has("debug");

const events: { ev: string; props: Props }[] = [];
(window as unknown as { poiseEvents: typeof events }).poiseEvents = events;

export function track(ev: string, p: Props = {}) {
  const props = { ...p, app_v: 6 };
  events.push({ ev, props });
  if (DEBUG) console.info("[poise]", ev, props);
}
