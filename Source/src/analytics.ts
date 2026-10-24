import type { PostHog } from "posthog-js";

type Props = Record<string, unknown>;
const QS = new URLSearchParams(location.search);
export const DEBUG = QS.has("debug");
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

const events: { ev: string; props: Props }[] = [];
(window as unknown as { poiseEvents: typeof events }).poiseEvents = events;
let ph: PostHog | null = null;

export const posthog = () => ph;

export function track(ev: string, p: Props = {}) {
  const props = { ...p, app_v: 6 };
  events.push({ ev, props });
  if (DEBUG) console.info("[poise]", ev, props);
  ph?.capture(ev, props);
}

if (KEY) {
  import("posthog-js")
    .then(({ default: client }) => {
      client.init(KEY, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: false,
        persistence: "localStorage",
        disable_session_recording: true,
      });
      ph = client;
      events.forEach((e) => client.capture(e.ev, e.props));
    })
    .catch(() => {});
}
