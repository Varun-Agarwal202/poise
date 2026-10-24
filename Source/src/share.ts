import { toBlob } from "html-to-image";
import { track } from "./analytics";
import { flag } from "./flags";
import { copy, gi, say } from "./dom";
import { TODAY, dnOf, noOf, dateOfNo, type Rec } from "./store";

/** A friend's result, decoded from a `#vs=<puzzleNo>.<p1>.<p2>.<p3>.<p4>.<p5>` link. Contains scores only, never pin positions. */
export interface Challenge {
  n: number;
  d: string;
  pts: number[];
  tot: number;
}

export const CH: Challenge | null = (() => {
  const m =
    /vs=(\d{1,4})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/.exec(
      location.hash,
    );
  if (!m || !flag("challenge")) return null;
  const n = +m[1],
    pts = m.slice(2).map(Number);
  if (n < 1 || n > dnOf(TODAY) + 1 || pts.some((p) => p > 100)) return null;
  return { n, d: dateOfNo(n), pts, tot: pts.reduce((a, b) => a + b, 0) };
})();

export const vsFor = (d: string) => (CH && CH.d === d ? CH : null);

let resetLabel = 0;
let resetText = 0;

/** Squares by grade: 90+, 70+, 45+, 20+, else. */
const SQUARES = ["🟩", "🟨", "🟧", "🟫", "⬛"];

/** Wordle-style text: title, total, one square per shape. */
export function shareText(r: Rec) {
  const site = String(
    (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL ??
      "",
  ).replace(/\/$/, "");
  const lines = [
    `Poise No. ${noOf(r.d)}  ${r.tot}/500`,
    r.pts.map((p) => SQUARES[gi(p)]).join(""),
  ];
  if (site) lines.push(site);
  return lines.join("\n");
}

export async function copyText(r: Rec) {
  const button = document.querySelector<HTMLButtonElement>("#copy-text");
  const status = document.querySelector<HTMLElement>("#copy-status");
  if (!button || !status || button.disabled) return;
  clearTimeout(resetText);
  status.textContent = "";
  button.disabled = true;
  const ok = await copy(shareText(r));
  if (!button.isConnected) return;
  button.disabled = false;
  if (ok) {
    button.textContent = "Copied";
    say("Result text copied. Ready to paste.");
    track("share", { method: "text_copy", total: r.tot, puzzle: noOf(r.d) });
    resetText = window.setTimeout(() => {
      if (button.isConnected) button.textContent = "Copy text";
    }, 2400);
  } else {
    status.textContent =
      "Couldn’t copy the text. Select it and copy it yourself.";
  }
}

/** One click copies the visible results as PNG, with no dialog or download fallback. */
export async function copyResult(r: Rec) {
  const source = document.querySelector<HTMLElement>("#result-sheet");
  const button = document.querySelector<HTMLButtonElement>("#copy-result");
  const status = document.querySelector<HTMLElement>("#copy-status");
  if (!source || !button || !status || button.disabled) return;
  clearTimeout(resetLabel);
  status.textContent = "";
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    status.textContent =
      "This browser can’t copy images. Use Copy text, or open Poise in Safari, Chrome or Edge.";
    return;
  }
  button.disabled = true;
  button.textContent = "Copying…";
  button.setAttribute("aria-busy", "true");
  try {
    // Pass the PNG promise immediately: Safari requires clipboard.write during
    // the click's user activation, before async font loading or image rendering.
    const png = (async () => {
      await document.fonts.ready;
      const blob = await toBlob(source, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(source).backgroundColor,
        filter: (node) =>
          !(node instanceof Element && node.hasAttribute("data-copy-exclude")),
      });
      if (!blob) throw new Error("Image capture returned no data");
      return blob;
    })();
    // A permission rejection may arrive before rendering finishes.
    void png.catch(() => {});
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    if (!button.isConnected) return;
    button.textContent = "Copied";
    say("Result image copied. Ready to paste.");
    track("share", { method: "image_copy", total: r.tot, puzzle: noOf(r.d) });
    resetLabel = window.setTimeout(() => {
      if (button.isConnected) button.textContent = "Copy image";
    }, 2400);
  } catch {
    if (!button.isConnected) return;
    button.textContent = "Copy image";
    status.textContent =
      "Couldn’t copy the image. Allow clipboard access in your browser, then try again.";
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}
