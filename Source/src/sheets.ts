import { $, $maybe, ib, gdots, GRADES, gi, sysRM } from "./dom";
import { prefs, setPref, type Prefs } from "./prefs";
import {
  db,
  TODAY,
  dnOf,
  noOf,
  dateOfNo,
  fmtDate,
  streakNow,
  playedCount,
  puzzleOf,
} from "./store";
import { track } from "./analytics";
import { home } from "./home";
import { start } from "./game";
import { end } from "./end";
import { LAST_DAY_INDEX } from "./unique";

export const navBtns = () =>
  `<nav class="primary-nav" aria-label="Main">${ib("hm", "home", "Home")}${ib("ar", "archive", "Archive")}${ib("st", "stats", "Stats")}${ib("se", "tune", "Settings")}${ib("hp", "help", "How to play")}</nav>`;
export function bindNav() {
  const actions: Record<string, () => void> = {
    hm: home,
    st: stats,
    ar: archive,
    se: settings,
    hp: help,
  };
  for (const [id, action] of Object.entries(actions)) {
    const b = $maybe("#" + id);
    if (b) b.onclick = action;
  }
}

export function sheet(title: string, body: string) {
  let d = $maybe<HTMLDialogElement>("#sheet");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "sheet";
    d.setAttribute("aria-labelledby", "sht");
    document.body.append(d);
    d.addEventListener("click", (e) => {
      if (e.target === d) d!.close();
    });
    // Give focus back to whatever opened the sheet, so keyboard and screen-reader users keep their place.
    d.addEventListener("close", () => {
      const o = opener;
      opener = null;
      if (o?.isConnected) o.focus({ preventScroll: true });
    });
  }
  opener = document.activeElement as HTMLElement | null;
  d.innerHTML = `<div class="sh"><div class="shh"><h2 id="sht">${title}</h2>${ib("xs", "close", "Close")}</div>${body}</div>`;
  d.showModal();
  $("#xs").onclick = () => d!.close();
  return d;
}
let opener: HTMLElement | null = null;

const seg = (name: keyof Prefs, label: string, opts: [string, string][]) =>
  `<fieldset class="fs"><legend>${label}</legend><div class="seg">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"${prefs[name] === v ? " checked" : ""}><span>${t}</span></label>`).join("")}</div></fieldset>`;
const sw = (
  name: keyof Prefs,
  label: string,
  hint: string,
  on: boolean,
  off = false,
) =>
  `<label class="sw"><span><b>${label}</b><small>${hint}</small></span><input type="checkbox" role="switch" data-k="${name}"${on ? " checked" : ""}${off ? " disabled" : ""}></label>`;

function help() {
  track("help_open", {});
  sheet(
    "How to play",
    `<ol class="how">
      <li>Five shapes a day. One attempt each. A new set tomorrow.</li>
      <li>Place the pin where the shape balances, at its center of mass. That point can sit in a gap, not only on the material.</li>
      <li>Tap or click inside the dashed box to place it. Drag to adjust. Presses outside the box are ignored, so a near-miss on Drop pin will not move your pin.</li>
      <li>Press <b>Drop pin</b> when you are ready. Closer pins score more. 100 takes a pin within a couple of millimetres.</li>
      <li>A near miss tips a little. A wide miss swings. Distance decides your score, not how much it moves.</li>
    </ol>
    <p class="mute small">Arrow keys move the pin. Shift for bigger steps. Enter or Space drops it. On a phone, drag for a magnified view.</p>
    <p class="mute small">Scores and your streak stay on this device. No account needed.</p>`,
  );
}

function settings() {
  track("settings_open", {});
  const dl = sheet(
    "Settings",
    `<div class="setl">${seg("theme", "Theme", [
      ["auto", "Auto"],
      ["light", "Light"],
      ["dark", "Dark"],
    ])}
  ${seg("homeLayout", "Home layout", [
    ["auto", "Auto"],
    ["mobile", "Phone"],
    ["desktop", "Desktop"],
  ])}
  <p class="mute small">Auto fits your window. Choose Phone for a stacked page or Desktop for a side-by-side layout.</p>
  ${sw("motion", "Reduce motion", sysRM() ? "On, because your device asks for calmer animation." : "Reveal the answer without swinging or bouncing.", prefs.motion === "reduce" || sysRM(), sysRM())}
  ${sw("sound", "Sound", "Soft tones when you drop and when a score lands.", prefs.sound)}
  ${"vibrate" in navigator ? sw("haptics", "Vibration", "A light tap when you grab and drop the pin.", prefs.haptics) : ""}
  ${sw("cb", "Colour-blind friendly colours", "Use an alternative palette for score indicators.", prefs.cb)}
  ${sw("contrast", "Higher contrast", "Stronger text and outlines.", prefs.contrast)}
  ${sw("big", "Larger text", "Bigger type across the game.", prefs.big)}</div>
  <h3>Keyboard</h3><p class="mute small">Tab to the shape, then use the arrow keys to move the pin. Hold Shift for bigger steps. Press Enter or Space to drop it. Tap anywhere in the play area to place the pin, even in a gap. Drag for a magnified view, then press Drop pin.</p>
  <p class="mute small">Settings stay on this device and never change the puzzle or your score.</p>`,
  );
  dl.querySelectorAll<HTMLInputElement>(".setl input").forEach(
    (i) =>
      (i.onchange = () => {
        if (i.type === "radio") {
          if (i.name === "homeLayout")
            setPref("homeLayout", i.value as Prefs["homeLayout"]);
          else setPref("theme", i.value as Prefs["theme"]);
        } else {
          const k = i.dataset.k as keyof Prefs;
          setPref(
            k,
            (k === "motion"
              ? i.checked
                ? "reduce"
                : "auto"
              : i.checked) as never,
          );
        }
      }),
  );
}

function stats() {
  const r = Object.values(db.days),
    n = r.length,
    avg = n ? Math.round(r.reduce((a, b) => a + b.tot, 0) / n) : 0,
    gc = [0, 0, 0, 0, 0];
  r.forEach((x) => x.pts.forEach((p) => gc[gi(p)]++));
  const mx = Math.max(1, ...gc);
  track("stats_open", { played: n });
  sheet(
    "Your stats",
    `<div class="stats"><div><b>${n}</b><span>Played</span></div><div><b>${avg}</b><span>Average</span></div><div><b>${db.best}</b><span>Best</span></div><div><b>${streakNow()}</b><span>Streak</span></div><div><b>${db.max}</b><span>Max streak</span></div></div>
  <h3>Every shape you’ve pinned</h3><div class="dist">${GRADES.map((g, i) => `<div class="bar"><span>${g[1]}</span><span class="trk"><i class="g${i}" style="width:${gc[i] ? Math.max(6, (gc[i] / mx) * 100) : 0}%"></i></span><b>${gc[i]}</b></div>`).join("")}</div>
  <p class="mute small">${n ? "Stats live on this device. No account needed." : "Finish a daily puzzle to start your stats."}</p>`,
  );
}

function archive() {
  track("archive_open", { played: playedCount() });
  const rows: string[] = [];
  for (let n = Math.min(dnOf(TODAY), LAST_DAY_INDEX) + 1; n >= 1; n--) {
    const d = dateOfNo(n),
      r = db.days[d],
      tw = puzzleOf(d).tw,
      tl = tw && tw.id !== "classic" ? tw : null;
    rows.push(
      `<button class="arow" data-d="${d}" aria-label="No. ${noOf(d)}${tl ? ", " + tl.name : ""}, ${r ? "scored " + r.tot : "not played"}"><span class="al"><b>No. ${noOf(d)}</b><span class="mute small">${d === TODAY ? "Today" : fmtDate(d)}${tl ? " · " + tl.name : ""}</span></span>${r ? gdots(r.pts) + `<b class="sc">${r.tot}</b>` : `<span class="play">${db.pg[d] ? "Resume" : "Play"}</span>`}</button>`,
    );
  }
  const dl = sheet(
    "Archive",
    `<p class="mute small">Missed a day? Play it here. Archive games don’t count toward your streak.</p><div class="alist">${rows.join("")}</div>`,
  );
  dl.querySelectorAll<HTMLButtonElement>(".arow").forEach(
    (b) =>
      (b.onclick = () => {
        const d = b.dataset.d!,
          r = db.days[d];
        dl.close();
        if (r) end(r, false);
        else start(d === TODAY ? "daily" : "archive", d);
      }),
  );
}
