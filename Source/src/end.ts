import { build, twistOf } from "./gen";
import { thumb, stop, dpr } from "./stage";
import { $, app, tierOf, setTitle } from "./dom";
import { TODAY, noOf, fmtDate, untilNext, type Rec } from "./store";
import { copyResult } from "./share";
import { ui } from "./game";
import { navBtns, bindNav } from "./sheets";

export function end(rec: Rec, isNew: boolean) {
  stop();
  ui.ph = "end";
  app.className = "result-screen";
  const rs = build(rec.seed, rec.fams),
    tw = twistOf(rec.seed);
  app.innerHTML = `<section id="result-sheet" aria-label="Your results">
    <header class="receipt-heading site-header"><span class="wordmark">Poise</span><div data-copy-exclude>${navBtns()}</div></header>
    <div class="result-summary"><div><p class="mute small">No. ${noOf(rec.d)} · ${fmtDate(rec.d, true)}</p><h1 id="eh" tabindex="-1">${tierOf(rec.tot)}</h1><p class="mute small">${tw?.name ?? "Classic"}${isNew ? " · Personal best" : ""}</p></div><p class="total"><b>${rec.tot}</b><span>/ 500</span></p></div>
    <div class="result-objects">${rec.pts.map((p, i) => `<div class="result-object"><span class="object-number">${i + 1}</span><canvas width="${180 * dpr}" height="${180 * dpr}" aria-hidden="true"></canvas><div class="object-label"><span>${rs[i].name}</span><span class="mute small">${rec.cm[i].toFixed(1)} cm off</span></div><b class="object-score">${p}<small>/100</small></b></div>`).join("")}</div>
    <div class="receipt-footer"><span class="pin-key"><i class="key-player"></i>Your pin <i class="key-target"></i>Balance point</span></div>
  </section>
  <div class="result-actions"><button class="btn" id="copy-result" aria-describedby="copy-description">Copy</button><span id="copy-description" class="vh">Copy these results as an image.</span><p class="mute small"${rec.d === TODAY ? " data-next" : ""}>${rec.d === TODAY ? "Next puzzle in " + untilNext() : "Result saved on this device."}</p></div>
  <p class="small mute" id="copy-status" role="status"></p>`;
  app.scrollTop = 0;
  setTitle(`${rec.tot}/500 · ${tierOf(rec.tot)}`);
  document
    .querySelectorAll<HTMLCanvasElement>(".result-object canvas")
    .forEach((c, i) => thumb(c, rs[i], rec.pins[i]));
  $("#eh").focus({ preventScroll: true });
  $("#copy-result").onclick = () => copyResult(rec);
  bindNav();
}
