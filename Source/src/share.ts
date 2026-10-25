import { track } from "./analytics";
import { flag } from "./flags";
import { copy, css, gi, say } from "./dom";
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
const SQUARES = [
  "\u{1f7e9}",
  "\u{1f7e8}",
  "\u{1f7e7}",
  "\u{1f7eb}",
  "\u{2b1b}",
];

/** Wordle-style text: title, total, one square per shape. */
export function shareText(r: Rec) {
  const site = (
    (import.meta.env.VITE_SITE_URL as string | undefined) || ""
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
  const source = document.querySelector<HTMLElement>("#share-card");
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
      const hook = globalThis as {
        captureFailure?: boolean;
        capturePending?: Promise<void>;
      };
      if (hook.captureFailure)
        throw new Error("Image capture returned no data");
      if (hook.capturePending) await hook.capturePending;
      return paintShare(source);
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

const CARD_W = 720;
const SCALE = 2;
const FACE = '"Bricolage Grotesque", system-ui, sans-serif';

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking = 0,
  align: "left" | "right" = "left",
) {
  ctx.letterSpacing = tracking ? `${tracking}em` : "0px";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
  ctx.letterSpacing = "0px";
}

function blobOf(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const url = cv.toDataURL("image/png");
      const comma = url.indexOf(",");
      if (comma < 0) throw new Error("empty");
      const bin = atob(url.slice(comma + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      resolve(new Blob([bytes], { type: "image/png" }));
    } catch {
      reject(new Error("Image capture returned no data"));
    }
  });
}

/** Draw the off-screen scorecard. html-to-image leaves a blank PNG when the node sits at left: -10000px. */
export async function paintShare(source: HTMLElement): Promise<Blob> {
  const bg = css("--bg") || "#eceef2";
  const ink = css("--ink") || "#171a21";
  const mute = css("--mute") || "#5f6674";
  const line = css("--line") || "#cdd2db";
  const wordmark =
    source.querySelector(".wordmark")?.textContent?.trim() || "Poise";
  const date =
    source.querySelector(".share-top .mute")?.textContent?.trim() || "";
  const tier = source.querySelector(".share-tier")?.textContent?.trim() || "";
  const total =
    source.querySelector(".share-score .total b")?.textContent?.trim() || "";
  const site =
    [...source.querySelectorAll(".share-foot > span")]
      .pop()
      ?.textContent?.trim() || "";
  const items = [...source.querySelectorAll(".result-object")].map((el) => ({
    n: el.querySelector(".object-number")?.textContent?.trim() || "",
    name:
      el.querySelector(".object-label span:not(.mute)")?.textContent?.trim() ||
      "",
    off: el.querySelector(".object-label .mute")?.textContent?.trim() || "",
    pts: (
      el.querySelector(".object-score")?.childNodes[0]?.textContent || ""
    ).trim(),
    thumb: el.querySelector("canvas"),
  }));

  const padX = 44;
  const inner = CARD_W - padX * 2;
  const colGap = 18;
  const col = (inner - colGap * 4) / 5;
  const padTop = 40;
  const scoreTop = padTop + 28 + 28;
  const scoreBottom = scoreTop + 100;
  const objectsTop = scoreBottom + 20 + 24;
  const objH = 22 + col + 10 + 40 + 10 + 22;
  const footTop = objectsTop + objH + 22;
  const h = footTop + 16 + 14 + 32;

  const cv = document.createElement("canvas");
  cv.width = CARD_W * SCALE;
  cv.height = Math.ceil(h) * SCALE;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("Image capture returned no data");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, h);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = ink;
  ctx.font = `800 28px ${FACE}`;
  drawText(ctx, wordmark, padX, padTop + 22, -0.06);
  ctx.fillStyle = mute;
  ctx.font = `600 14px ${FACE}`;
  drawText(ctx, date, CARD_W - padX, padTop + 20, 0, "right");

  ctx.fillStyle = ink;
  ctx.font = `800 17px ${FACE}`;
  const pillW = ctx.measureText(tier).width + 26;
  ctx.beginPath();
  ctx.roundRect(padX, scoreTop, pillW, 34, 17);
  ctx.fill();
  ctx.fillStyle = bg;
  drawText(ctx, tier, padX + 13, scoreTop + 23, 0.055);
  const curveX = padX;
  const curveW = 220;
  const curveBase = scoreBottom - 4;
  const curveH = 46;
  const curveY = (score: number) =>
    curveBase - curveH * Math.exp(-0.5 * Math.pow((score - 225) / 85, 2));
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const score = i * 10;
    const x = curveX + (score / 500) * curveW;
    const y = curveY(score);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.lineTo(curveX + curveW, curveBase);
  ctx.lineTo(curveX, curveBase);
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const score = i * 10;
    const x = curveX + (score / 500) * curveW;
    const y = curveY(score);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.strokeStyle = mute;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const numericTotal = Number(total) || 0;
  const markerX = curveX + (numericTotal / 500) * curveW;
  const markerY = curveY(numericTotal);
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(markerX, Math.max(scoreTop + 28, markerY - 8));
  ctx.lineTo(markerX, curveBase);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 14px ${FACE}`;
  const frac = "/ 500";
  const fracW = ctx.measureText(frac).width;
  ctx.font = `600 80px ${FACE}`;
  drawText(ctx, total, CARD_W - padX - fracW - 8, scoreBottom, -0.045, "right");
  ctx.fillStyle = mute;
  ctx.font = `600 14px ${FACE}`;
  ctx.fillText(frac, CARD_W - padX - fracW, scoreBottom - 10);

  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, scoreBottom + 20);
  ctx.lineTo(CARD_W - padX, scoreBottom + 20);
  ctx.stroke();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const x = padX + i * (col + colGap);
    let y = objectsTop;
    ctx.fillStyle = mute;
    ctx.font = `600 12px ${FACE}`;
    ctx.fillText(it.n, x, y + 10);
    y += 22;
    if (it.thumb) ctx.drawImage(it.thumb, x, y, col, col);
    y += col + 10;
    ctx.fillStyle = ink;
    ctx.font = `600 14px ${FACE}`;
    ctx.fillText(it.name, x, y + 13);
    ctx.fillStyle = mute;
    ctx.fillText(it.off, x, y + 31);
    y += 50;
    ctx.fillStyle = ink;
    ctx.font = `600 22px ${FACE}`;
    ctx.fillText(it.pts, x, y + 18);
    const ptsW = ctx.measureText(it.pts).width;
    ctx.fillStyle = mute;
    ctx.font = `600 12px ${FACE}`;
    ctx.fillText("/100", x + ptsW + 3, y + 18);
  }

  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(padX, footTop);
  ctx.lineTo(CARD_W - padX, footTop);
  ctx.stroke();

  const mid = footTop + 16;
  let fx = padX + 4.5;
  ctx.fillStyle = "#1b1f27";
  ctx.beginPath();
  ctx.arc(fx, mid, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.stroke();
  fx += 12;
  ctx.fillStyle = mute;
  ctx.font = `600 12px ${FACE}`;
  ctx.fillText("Your pin", fx, mid + 4);
  fx += ctx.measureText("Your pin").width + 16;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(fx, mid, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.stroke();
  fx += 12;
  ctx.fillStyle = mute;
  ctx.fillText("Balance point", fx, mid + 4);
  ctx.fillText(site, CARD_W - padX - ctx.measureText(site).width, mid + 4);

  return blobOf(cv);
}
