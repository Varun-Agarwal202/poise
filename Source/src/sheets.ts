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
} from "./store";
import { track } from "./analytics";
import { home } from "./home";
import { start } from "./game";
import { end } from "./end";
import { LAST_DAY_INDEX } from "./unique";
import {
  account,
  createAccount,
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  updatePassword,
} from "./auth";

export const navBtns = () =>
  `<nav class="primary-nav" aria-label="Main">${ib("hm", "home", "Home")}${ib("ar", "archive", "Archive")}${ib("me", "user", "You")}${ib("hp", "help", "How to play")}</nav>`;
export function bindNav() {
  const actions: Record<string, () => void> = {
    hm: home,
    ar: archive,
    me: you,
    hp: help,
  };
  for (const [id, action] of Object.entries(actions)) {
    const b = $maybe("#" + id);
    if (b) b.onclick = action;
  }
}

export function sheet(title: string, body: string, className = "") {
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
  d.className = className;
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

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

function accountCard() {
  if (!account.configured)
    return `<div class="you-local"><b>Saved on this device</b><p class="mute small">Play without an account. Your streak and results stay in this browser.</p></div>`;
  if (account.loading)
    return `<div class="you-local"><b>Checking your account…</b></div>`;
  if (account.email)
    return `<div class="you-local account-row"><span><b>${esc(account.email)}</b><small class="mute">${account.error || (account.synced ? "Synced across devices" : "Syncing…")}</small></span><button class="text-btn" id="account-out">Sign out</button></div>`;
  return `<div class="you-local account-row"><span><b>Play without an account</b><small class="mute">Sign in only if you want your results on every device.</small></span><button class="btn account-button" id="account-in">Sign in to sync</button></div>`;
}

function signIn() {
  track("sign_in_open", {});
  const dl = sheet(
    "Sign in to sync",
    `<div class="signin">
      <button class="auth-google" id="google-in" type="button"><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"/><path fill="#34a853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A9 9 0 0 0 9 18Z"/><path fill="#fbbc05" d="M3.96 10.71A5.42 5.42 0 0 1 3.68 9c0-.59.1-1.16.28-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.01-2.33Z"/><path fill="#ea4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .95 4.96l3.01 2.33C4.67 5.16 6.66 3.58 9 3.58Z"/></svg><span>Continue with Google</span></button>
      <div class="auth-divider"><span>or use email</span></div>
      <div class="auth-modes" aria-label="Email account action">
        <button type="button" data-auth-mode="signin" aria-pressed="true">Sign in</button>
        <button type="button" data-auth-mode="signup" aria-pressed="false">Create account</button>
      </div>
      <form id="signin-form">
        <label><span>Email</span><input id="signin-email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" placeholder="you@example.com" required></label>
        <label><span>Password</span><input id="signin-password" name="password" type="password" autocomplete="current-password" minlength="8" required></label>
        <button class="btn" id="signin-send" type="submit">Sign in</button>
        <button class="auth-forgot" id="forgot-password" type="button">Forgot password?</button>
      </form>
      <p class="small auth-status" id="signin-status" role="status" aria-live="polite"></p>
    </div>`,
  );
  const form = dl.querySelector<HTMLFormElement>("#signin-form")!;
  const email = dl.querySelector<HTMLInputElement>("#signin-email")!;
  const password = dl.querySelector<HTMLInputElement>("#signin-password")!;
  const button = dl.querySelector<HTMLButtonElement>("#signin-send")!;
  const forgot = dl.querySelector<HTMLButtonElement>("#forgot-password")!;
  const status = dl.querySelector<HTMLElement>("#signin-status")!;
  let mode: "signin" | "signup" = "signin";
  const setMode = (next: typeof mode) => {
    mode = next;
    dl.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach((item) =>
      item.setAttribute("aria-pressed", String(item.dataset.authMode === mode)),
    );
    password.autocomplete =
      mode === "signin" ? "current-password" : "new-password";
    button.textContent = mode === "signin" ? "Sign in" : "Create account";
    forgot.hidden = mode !== "signin";
    status.textContent = "";
  };
  dl.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach(
    (item) =>
      (item.onclick = () => setMode(item.dataset.authMode as typeof mode)),
  );
  dl.querySelector<HTMLButtonElement>("#google-in")!.onclick = async (
    event,
  ) => {
    const google = event.currentTarget as HTMLButtonElement;
    google.disabled = true;
    status.textContent = "Opening Google…";
    const error = await signInWithGoogle();
    if (error) {
      status.textContent = error;
      google.disabled = false;
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = mode === "signin" ? "Signing in…" : "Creating…";
    const result =
      mode === "signin"
        ? {
            error: await signInWithPassword(email.value.trim(), password.value),
            confirmation: false,
          }
        : await createAccount(email.value.trim(), password.value);
    const { error } = result;
    if (error) {
      status.textContent = error;
      button.disabled = false;
      button.textContent = mode === "signin" ? "Sign in" : "Create account";
      return;
    }
    if (result.confirmation) {
      form.innerHTML = `<div class="signin-sent"><b>Confirm your email</b><p class="mute">Open the confirmation link, then sign in with your password.</p></div>`;
      status.textContent = "";
      track("account_created", { confirmation: true });
      return;
    }
    track(mode === "signin" ? "password_sign_in" : "account_created", {
      confirmation: false,
    });
    dl.close();
    setTimeout(you, 0);
  };
  forgot.onclick = async () => {
    if (!email.reportValidity()) return;
    forgot.disabled = true;
    status.textContent = "Sending reset link…";
    const error = await sendPasswordReset(email.value.trim());
    status.textContent = error || "Check your email for a password reset link.";
    forgot.disabled = false;
  };
}

function passwordRecovery() {
  const dl = sheet(
    "Choose a new password",
    `<form class="signin" id="password-reset"><label><span>New password</span><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required></label><button class="btn" type="submit">Save new password</button><p class="small auth-status" role="status" aria-live="polite"></p></form>`,
  );
  const form = dl.querySelector<HTMLFormElement>("#password-reset")!;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>("#new-password")!;
    const button = form.querySelector<HTMLButtonElement>("button")!;
    const status = form.querySelector<HTMLElement>("[role=status]")!;
    button.disabled = true;
    button.textContent = "Saving…";
    const error = await updatePassword(input.value);
    if (error) {
      status.textContent = error;
      button.disabled = false;
      button.textContent = "Save new password";
      return;
    }
    form.innerHTML = `<div class="signin-sent"><b>Password updated</b><p class="mute">Your account is signed in and ready to sync.</p></div>`;
  };
}

addEventListener("pinpoise:password-recovery", passwordRecovery);

function help() {
  track("help_open", {});
  sheet(
    "How to play",
    `<ol class="how">
      <li>Five shapes a day. One attempt each. A new set tomorrow.</li>
      <li>Place the pin where the shape balances. Each colour is a different weight, so steel pulls more than wood. That point can sit in a gap.</li>
      <li>Tap or click inside the dashed box to place it. Drag to adjust. Presses outside the box are ignored, so a near-miss on Drop pin will not move your pin.</li>
      <li>Press <b>Drop pin</b> when you are ready. Closer pins score more. 100 takes a pin within a couple of millimetres.</li>
      <li>A near miss tips a little. A wide miss swings. Distance decides your score, not how much it moves.</li>
    </ol>
    <p class="mute small">Arrow keys move the pin. Shift for bigger steps. Enter or Space drops it. On a phone, drag for a magnified view.</p>
    <p class="mute small">Scores and your streak stay on this device. No account needed.</p>`,
  );
}

function you() {
  const r = Object.values(db.days),
    n = r.length,
    avg = n ? Math.round(r.reduce((a, b) => a + b.tot, 0) / n) : 0,
    gc = [0, 0, 0, 0, 0];
  r.forEach((x) => x.pts.forEach((p) => gc[gi(p)]++));
  const mx = Math.max(1, ...gc);
  track("you_open", { played: n });
  const dl = sheet(
    "You",
    `${accountCard()}
    <section class="sheet-section"><div class="sheet-section-head"><h3>Stats</h3></div>
    <div class="stats"><div><b>${n}</b><span>Played</span></div><div><b>${streakNow()}</b><span>Streak</span></div><div><b>${avg}</b><span>Average</span></div><div><b>${db.best}</b><span>Best</span></div></div>
    ${n ? `<div class="dist">${GRADES.map((g, i) => `<div class="bar"><span>${g[1]}</span><span class="trk"><i class="g${i}" style="width:${gc[i] ? Math.max(6, (gc[i] / mx) * 100) : 0}%"></i></span><b>${gc[i]}</b></div>`).join("")}</div>` : '<p class="mute small">Finish today’s puzzle to start your stats.</p>'}
    ${n ? `<p class="mute small">Best streak: ${db.max}</p>` : ""}</section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>Appearance</h3></div><div class="setl">${seg(
      "theme",
      "Theme",
      [
        ["auto", "Auto"],
        ["light", "Light"],
        ["dark", "Dark"],
      ],
    )}
    ${sw("cb", "Colour-blind friendly", "Use an alternative score palette.", prefs.cb)}
    ${sw("contrast", "Higher contrast", "Strengthen text and outlines.", prefs.contrast)}
    ${sw("big", "Larger text", "Increase type throughout the game.", prefs.big)}</div></section>
    <section class="sheet-section"><div class="sheet-section-head"><h3>Game</h3></div><div class="setl">${seg(
      "homeLayout",
      "Home layout",
      [
        ["auto", "Auto"],
        ["mobile", "Phone"],
        ["desktop", "Desktop"],
      ],
    )}
    ${sw("motion", "Reduce motion", sysRM() ? "On because your device requests reduced motion." : "Skip swinging and bouncing.", prefs.motion === "reduce" || sysRM(), sysRM())}
    ${sw("sound", "Sound", "Play drop and score tones.", prefs.sound)}
    ${"vibrate" in navigator ? sw("haptics", "Vibration", "Tap when you grab and drop the pin.", prefs.haptics) : ""}</div></section>
    <details class="keyboard"><summary>Keyboard controls</summary><p class="mute small">Arrow keys move the pin. Hold Shift for bigger steps. Enter or Space drops it.</p></details>`,
    "you-dialog",
  );
  const accountIn = dl.querySelector<HTMLButtonElement>("#account-in");
  if (accountIn)
    accountIn.onclick = () => {
      dl.close();
      setTimeout(signIn, 0);
    };
  const accountOut = dl.querySelector<HTMLButtonElement>("#account-out");
  if (accountOut)
    accountOut.onclick = async () => {
      accountOut.disabled = true;
      await signOut();
      dl.close();
      setTimeout(you, 0);
    };
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

function archive() {
  track("archive_open", { played: playedCount() });
  const rows: string[] = [];
  for (let n = Math.min(dnOf(TODAY), LAST_DAY_INDEX) + 1; n >= 1; n--) {
    const d = dateOfNo(n),
      r = db.days[d];
    rows.push(
      `<button class="arow" data-d="${d}" aria-label="No. ${noOf(d)}, ${r ? "scored " + r.tot : "not played"}"><span class="al"><b>No. ${noOf(d)}</b><span class="mute small">${d === TODAY ? "Today" : fmtDate(d)}</span></span>${r ? gdots(r.pts) + `<b class="sc">${r.tot}</b>` : `<span class="play">${db.pg[d] ? "Resume" : "Play"}</span>`}</button>`,
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
