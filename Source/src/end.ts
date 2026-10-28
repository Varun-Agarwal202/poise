import { build } from "./gen";
import { thumb, stop, dpr } from "./stage";
import { $, app, setTitle } from "./dom";
import { TODAY, noOf, fmtDate, untilNext, type Rec } from "./store";
import { copyResult, copyText } from "./share";
import { ui } from "./game";
import { navBtns, bindNav } from "./sheets";
import {
  fallbackBins,
  fallbackRank,
  rankLabel,
  REAL_RANK_MINIMUM,
  USE_LIVE_RANKS,
  submitRank,
  type RankData,
} from "./rank";
import { track } from "./analytics";

const siteHost = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  "https://poisedaily.com"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

function objects(rec: Rec, names: string[], dprX: number) {
  return rec.pts
    .map(
      (p, i) =>
        `<div class="result-object"><span class="object-number">${i + 1}</span><canvas width="${180 * dprX}" height="${180 * dprX}" aria-hidden="true"></canvas><div class="object-label"><span>${names[i]}</span><span class="mute small">${rec.cm[i].toFixed(1)} cm off</span></div><b class="object-score">${p}<small>/100</small></b></div>`,
    )
    .join("");
}

function distribution(total: number, bins: number[] = Array(20).fill(0)) {
  const left = 8,
    width = 244,
    base = 61,
    max = Math.max(1, ...bins),
    gap = 2,
    barWidth = width / bins.length - gap,
    bars = bins
      .map((amount, i) => {
        const height = amount ? Math.max(3, (amount / max) * 46) : 0;
        return `<rect class="rank-bin" x="${(left + i * (width / bins.length)).toFixed(1)}" y="${(base - height).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" rx="1"/>`;
      })
      .join(""),
    markerX = left + (Math.max(0, Math.min(500, total)) / 500) * width,
    bucket = Math.min(19, Math.floor(total / 25)),
    markerHeight = bins[bucket] ? Math.max(3, (bins[bucket] / max) * 46) : 3,
    markerY = base - markerHeight;
  return `<svg class="rank-curve" data-bins="${bins.join(",")}" viewBox="0 0 260 68" role="img" aria-label="Your score marked on the reference distribution">${bars}<line class="rank-marker" x1="${markerX.toFixed(1)}" y1="${Math.max(7, markerY - 8).toFixed(1)}" x2="${markerX.toFixed(1)}" y2="61"/><circle class="rank-dot" cx="${markerX.toFixed(1)}" cy="${markerY.toFixed(1)}" r="4"/></svg>`;
}

function applyRank(rec: Rec, rank: RankData) {
  const real = USE_LIVE_RANKS && rank.players >= REAL_RANK_MINIMUM,
    label = rankLabel(rank, rec.tot),
    bins = real ? rank.bins : fallbackBins();
  document.querySelectorAll<HTMLElement>(".rank-pill").forEach((el) => {
    el.textContent = label;
  });
  document.querySelectorAll<SVGElement>(".rank-curve").forEach((el) => {
    el.outerHTML = distribution(rec.tot, bins);
  });
  setTitle(`${rec.tot}/500 · ${label}`);
  track("rank_received", {
    puzzle: noOf(rec.d),
    players: rank.players,
    better_than: rank.betterThan,
  });
}

export function end(rec: Rec, isNew: boolean) {
  stop();
  ui.ph = "end";
  app.className = "result-screen";
  const rs = build(rec.seed, rec.fams),
    names = rs.map((s) => s.name),
    waiting = fallbackRank(rec.tot),
    startingBins = fallbackBins();
  app.innerHTML = `<section id="result-sheet" aria-label="Your results">
    <header class="receipt-heading site-header"><button class="wordmark brand-home" id="brand-home" type="button" aria-label="Home">Pinpoise</button><div data-copy-exclude>${navBtns()}</div></header>
    <div class="result-summary"><div class="rank-summary"><p class="mute small">No. ${noOf(rec.d)} · ${fmtDate(rec.d, true)}</p><h1 class="rank-pill" id="eh" tabindex="-1">${waiting}</h1>${distribution(rec.tot, startingBins)}${isNew ? '<p class="mute small">Personal best</p>' : ""}</div><p class="total"><b>${rec.tot}</b><span>/ 500</span></p></div>
    <div class="result-objects">${objects(rec, names, dpr)}</div>
    <div class="receipt-footer"><span class="pin-key"><i class="key-player"></i>Your pin <i class="key-target"></i>Balance point</span></div>
  </section>
  <div id="share-card" class="share-card" aria-hidden="true">
    <div class="share-top"><span class="wordmark">Pinpoise</span><span class="mute small">No. ${noOf(rec.d)} · ${fmtDate(rec.d, true)}</span></div>
    <div class="share-score"><div class="share-rank"><p class="share-tier rank-pill">${waiting}</p>${distribution(rec.tot, startingBins)}</div><p class="total"><b>${rec.tot}</b><span>/ 500</span></p></div>
    <div class="result-objects">${objects(rec, names, 2)}</div>
    <div class="share-foot"><span class="pin-key"><i class="key-player"></i>Your pin <i class="key-target"></i>Balance point</span><span>${siteHost}</span></div>
  </div>
  <div class="result-actions"><div class="copy-pair"><button class="btn" id="copy-result" aria-describedby="copy-description">Copy image</button><button class="text-btn" id="copy-text" aria-describedby="copy-text-description">Copy text</button></div><span id="copy-description" class="vh">Copy these results as an image.</span><span id="copy-text-description" class="vh">Copy these results as text.</span><p class="mute small"${rec.d === TODAY ? " data-next" : ""}>${rec.d === TODAY ? "Next puzzle in " + untilNext() : "Result saved on this device."}</p></div>
  <p class="small mute" id="copy-status" role="status"></p>`;
  app.scrollTop = 0;
  setTitle(`${rec.tot}/500`);
  for (const root of ["#result-sheet", "#share-card"])
    document
      .querySelectorAll<HTMLCanvasElement>(`${root} .result-object canvas`)
      .forEach((c, i) => thumb(c, rs[i], rec.pins[i]));
  $("#eh").focus({ preventScroll: true });
  $("#copy-result").onclick = () => copyResult(rec);
  $("#copy-text").onclick = () => copyText(rec);
  bindNav();
  void submitRank(rec).then((rank) => {
    if (ui.ph !== "end" || !document.querySelector("#result-sheet")) return;
    if (rank) applyRank(rec, rank);
  });
}
