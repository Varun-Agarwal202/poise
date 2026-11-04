import { mk, prep, hash, rng, MAT, type Shape } from "./gen";
import { app, $, cl, css, RM, setTitle, say } from "./dom";
import { mount, shapeImage, stop, view, watch } from "./stage";
import { ui, live } from "./game";
import { dnOf, puzzleOf, TODAY } from "./store";
import { LAST_DAY_INDEX, UNIQUE_START, uniqueIds } from "./unique";
import { home } from "./home";
import { snd, buzz } from "./audio";
import {
  drawRange,
  rangePoint,
  targetPoint,
  type RangeShot,
} from "./archery-scene";
import { swing, step, SEAT, type Swing } from "./physics";
import { sweptPower } from "./archery-power";
import { bindDrawInput } from "./archery-input";
let disposeInput: (() => void) | undefined;

import { landing, shotConditions } from "./archery-ballistics";
export { landing } from "./archery-ballistics";
const POWER_DIAL = `<div id="arch-power-dial" class="arch-power-dial" hidden><span class="arch-power-title">Time your shot</span><svg viewBox="0 0 180 136" fill="none" aria-hidden="true"><path class="arch-power-track" d="M25 110a65 65 0 0 1 130 0"/><path id="arch-power-fill" d="M25 110a65 65 0 0 1 130 0" stroke-dasharray="204.2"/><path class="arch-power-ticks" d="M25 110h7M44 64l5 5M90 45v7M136 64l-5 5M155 110h-7"/><g id="arch-power-needle"><path d="M90 110 31 110"/><circle cx="90" cy="110" r="4"/></g><text x="13" y="132">35</text><text x="167" y="132">100</text></svg><output id="arch-power-value" role="meter" aria-label="Shot strength" aria-valuemin="35" aria-valuemax="100" aria-valuenow="35">35%</output><button id="arch-meter-fire" type="button">Shoot now</button><button id="arch-meter-pause" type="button">Pause meter</button></div>`;
const WIND_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a2 2 0 1 1-2 2M3 16h6a3 3 0 1 1-3 3"/></svg>';
export function archeryShapesFor(date: string) {
  const daily = puzzleOf(date),
    normalNames = new Set(
      daily.fams.map((family, index) =>
        mk(daily.seed, index, family, daily.tw).name.toLowerCase(),
      ),
    ),
    chosen = new Set<string>(),
    raws: ReturnType<typeof mk>[] = [],
    span = LAST_DAY_INDEX - UNIQUE_START + 1,
    start = dnOf(date);
  for (let step = 0; step < span && raws.length < 3; step++) {
    const day =
        UNIQUE_START +
        ((((start - UNIQUE_START + 17 + step * 37) % span) + span) % span),
      seed = `p7|archery${date}:${day}|classic`;
    uniqueIds(day).forEach((family, index) => {
      if (raws.length >= 3) return;
      const raw = mk(seed, index, family);
      const name = raw.name.toLowerCase();
      if (normalNames.has(name) || chosen.has(name)) return;
      raw.parts = raw.parts.map((part) => {
        if (part[0] === "X") return [...part];
        const overlay = String(part[0]).endsWith("+") ? "+" : "";
        return [`wood${overlay}`, ...part.slice(1)];
      });
      chosen.add(name);
      raws.push(raw);
    });
  }
  if (raws.length < 3) throw new Error("Could not build Archery targets");
  return raws.map((raw, index) => {
    raw.rot += (index - 1) * 0.08;
    return prep(raw);
  });
}
export function startArchery() {
  disposeInput?.();
  stop();
  live(null);
  ui.ph = "archery";
  setTitle("Poise Archery");
  app.className = "archery-screen";
  app.innerHTML = `<header class="arch-header"><button class="brand-home" id="arch-home" aria-label="Back to Pinpoise">Pinpoise</button><h1>Poise Archery</h1><button class="arch-text-btn" id="arch-restart">Restart</button></header>
  <div class="arch-hud"><div><b id="arch-round">Target 1 of 3</b><span id="arch-shots" aria-label="Three shots remaining"></span></div><div id="arch-wind">${WIND_ICON}<span></span></div><b id="arch-total">0 <small>pts</small></b></div>
  <div id="stage" class="arch-range"><canvas id="cv" tabindex="0" role="img" aria-describedby="arch-help"></canvas><div class="arch-range-caption"><span id="arch-target-name"></span><span id="arch-distance">12 m · Shot 1 of 3</span></div><div id="arch-impact" hidden><span id="arch-impact-label"></span><strong id="arch-impact-score"></strong><span id="arch-impact-detail"></span></div>${POWER_DIAL}<div class="arch-sight-wind" id="arch-sight-wind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg><b></b></div></div>
  <div class="arch-bottom"><div><p id="arch-status" role="status">Drag to aim. Release to lock. Then time your power.</p><p id="arch-help">Each shot is farther away, with stronger wind.<span>Keyboard: Enter locks aim; Space fires. Arrows can set power precisely.</span></p></div><div class="arch-shot-controls"><button class="btn" id="arch-fire">Lock aim</button><button class="arch-text-btn" id="arch-adjust" hidden>Adjust aim</button><button class="btn" id="arch-next" hidden>Next shot</button></div></div>`;
  app.scrollTop = 0;
  const random = rng(hash(`archery:${TODAY}`));
  // Archery uses a separate daily set so the normal puzzle never reveals its
  // balance points. One material keeps the challenge on aim, wind and power.
  const shapes = archeryShapesFor(TODAY);
  const rounds: RangeShot[][] = [[], [], []];
  let round = 0,
    wind = 0,
    distance = 12,
    aimLocked = false,
    power = 0.7,
    powerStarted = 0,
    powerElapsed = 0,
    powerPaused = false,
    aim = { x: 300, y: 170 },
    review = false,
    zoom = 0;
  // The target swings about the pin that just landed, then eases back to rest.
  let wobble: { ps: Swing; x: number; y: number; settled: number } | null =
    null;
  let flight: {
    start: number;
    end: ReturnType<typeof landing>;
    aim: typeof aim;
  } | null = null;
  let drag: {
    id: number;
    x: number;
    y: number;
    aim: typeof aim;
  } | null = null;
  const cv = $<HTMLCanvasElement>("#cv"),
    fire = $<HTMLButtonElement>("#arch-fire"),
    next = $<HTMLButtonElement>("#arch-next"),
    status = $("#arch-status"),
    impact = $("#arch-impact");
  const sightWind = $("#arch-sight-wind");
  const dial = $("#arch-power-dial"),
    meterFire = $<HTMLButtonElement>("#arch-meter-fire"),
    pause = $<HTMLButtonElement>("#arch-meter-pause"),
    powerValue = $("#arch-power-value");
  function currentPower(now = performance.now()) {
    return powerPaused ? power : sweptPower(powerElapsed + now - powerStarted);
  }
  function paintPower() {
    const amount = cl((power - 0.35) / 0.65, 0, 1);
    $("#arch-power-needle").style.transform = `rotate(${amount * 180}deg)`;
    $("#arch-power-fill").style.strokeDashoffset = String((1 - amount) * 204.2);
    powerValue.textContent = `${Math.round(power * 100)}%`;
    powerValue.setAttribute("aria-valuenow", String(Math.round(power * 100)));
    pause.textContent = powerPaused ? "Resume meter" : "Pause meter";
    $(".arch-power-title").textContent = powerPaused
      ? "Choose your power"
      : "Time your shot";
  }
  const shots = () => rounds[round],
    total = () => rounds.flat().reduce((n, s) => n + s.pts, 0);
  const windWords = () =>
    Math.abs(wind) < 0.05
      ? "Still air"
      : `${Math.abs(wind).toFixed(1)} m/s ${wind < 0 ? "left" : "right"}`;
  const aimWords = () =>
    `Aim ${Math.round((aim.x - 110) / 3.8)} percent from the target's left, ${Math.round((aim.y - 20) / 3.8)} percent from its top. Draw ${Math.round(power * 100)} percent. Wind ${windWords()}.`;
  function update() {
    cv.setAttribute(
      "aria-label",
      `First-person archery range. Target: ${shapes[round].name}. A weightless striped mesh spans its gaps. Materials: ${[...new Set(shapes[round].parts.map((p) => String(p[0])).filter((m) => m in MAT))].map((m) => `${m}, density ${MAT[m][1]}`).join("; ")}. ${aimWords()} ${aimLocked ? (powerPaused ? "Aim locked. Meter paused. Arrow keys adjust power; Space shoots." : "Aim locked. Watch the moving power dial; tap or press Space to shoot. Arrow keys pause and adjust power.") : "Arrow keys aim; Enter locks aim."}`,
    );
    $("#arch-round").textContent = `Target ${round + 1} of 3`;
    $("#arch-target-name").textContent = shapes[round].name;
    $("#arch-wind span").textContent = windWords();
    $("#arch-distance").textContent =
      `${distance} m · Shot ${Math.min(shots().length + (review ? 0 : 1), 3)} of 3`;
    $("#arch-sight-wind b").textContent = `${Math.abs(wind).toFixed(1)} m/s`;
    $("#arch-sight-wind svg").style.transform =
      wind < 0 ? "rotate(180deg)" : "";
    sightWind.setAttribute("aria-label", `Wind ${windWords()}`);
    sightWind.hidden = review || !!flight;
    $("#arch-shots").innerHTML = Array.from(
      { length: 3 },
      (_, i) => `<i class="${i < shots().length ? "used" : ""}"></i>`,
    ).join("");
    $("#arch-shots").setAttribute(
      "aria-label",
      `${3 - shots().length} shots remaining`,
    );
    $("#arch-total").innerHTML = `${total()} <small>pts</small>`;
    fire.disabled = !!flight || review;
    fire.textContent = aimLocked ? "Shoot now" : "Lock aim";
    dial.hidden = !aimLocked || !!flight || review;
    meterFire.disabled = !aimLocked || !!flight || review;
    $("#arch-adjust").hidden = !aimLocked || !!flight || review;
    fire.hidden = review || aimLocked;
    next.hidden = !review;
    paintPower();
  }
  function setWind() {
    ({ wind, distance } = shotConditions(shots().length, random));
  }
  function shoot() {
    if (flight || review || !aimLocked || drag) return;
    power = currentPower();
    paintPower();
    flight = {
      start: performance.now(),
      end: landing(aim.x, aim.y, power, wind, distance),
      aim: { ...aim },
    };
    snd(155, 0.18, "triangle", 0.06);
    buzz(12);
    status.textContent = "Pin in flight…";
    update();
  }
  function finish() {
    if (!flight) return;
    const { x, y } = flight.end,
      shape = shapes[round],
      u = (x - 110) / 380,
      v = (y - 20) / 380;
    const hit = onShape(shape, u, v),
      distance = Math.hypot((u - shape.c[0]) * 380, (v - shape.c[1]) * 380);
    const pts = hit
      ? Math.round(
          100 * Math.exp(-Math.pow(Math.max(0, distance - 16) / 85, 1.35)),
        )
      : 0;
    shots().push({ x, y, pts, hit, cm: (distance / 380) * 38.5 });
    wobble = null;
    if (hit && !RM) {
      const { ps } = swing(
        shape,
        {
          B: 380,
          o: { x: -190, y: -190 },
          c: { x: (shape.c[0] - 0.5) * 380, y: (shape.c[1] - 0.5) * 380 },
        },
        { x: x - 300, y: y - 210 },
        SEAT,
      );
      if (ps.amp > 0) wobble = { ps, x: x - 300, y: y - 210, settled: 0 };
    }
    flight = null;
    aimLocked = false;
    review = true;
    snd(hit ? (pts === 100 ? 880 : 440) : 130, 0.16, "triangle", 0.08);
    buzz(hit ? [15, 35, 20] : 15);
    impact.hidden = false;
    $("#arch-impact-label").textContent = hit
      ? pts === 100
        ? "Perfect balance"
        : pts >= 70
          ? "Beautiful shot"
          : "On the shape"
      : "Off target";
    $("#arch-impact-score").textContent = hit ? `+${pts}` : "Miss";
    const complete = shots().length === 3;
    $("#arch-impact-detail").textContent = complete
      ? "Three shots used · balance point revealed"
      : `${3 - shots().length} ${shots().length === 2 ? "shot" : "shots"} left · drag the range to aim again`;
    status.textContent = complete
      ? `${hit ? `${pts} points.` : "Miss."} Three shots used. Now the balance point is revealed.`
      : `${hit ? `${pts} points.` : "Miss."} Drag the range to aim your next shot.`;
    next.textContent =
      shots().length < 3
        ? "Next shot"
        : round < 2
          ? "Next target"
          : "See results";
    update();
    say(`${status.textContent} ${next.textContent}.`);
    next.focus({ preventScroll: true });
  }
  function pointer(e: PointerEvent) {
    const r = cv.getBoundingClientRect(),
      scale = r.width / 600;
    return rangePoint(
      (e.clientX - r.left) / scale,
      (e.clientY - r.top) / scale,
      r.height / scale,
      distance,
    );
  }
  function continueShooting() {
    if (shots().length === 3) {
      if (round === 2) {
        status.textContent =
          "All nine shots are used. Choose See results for your recap.";
        return false;
      }
      round++;
      aim = { x: 300, y: 170 };
    }
    review = false;
    aimLocked = false;
    wobble = null;
    impact.hidden = true;
    setWind();
    update();
    return true;
  }
  disposeInput = bindDrawInput(cv, {
    start: (event) => {
      if (flight) return false;
      if (aimLocked) {
        shoot();
        return false;
      }
      if (review && !continueShooting()) {
        say(status.textContent || "");
        return false;
      }
      cv.focus({ preventScroll: true });
      drag = {
        id: event.pointerId,
        ...pointer(event),
        aim: { ...aim },
      };
      status.textContent =
        "Aiming… release to lock your sight. Strength comes next.";
      return true;
    },
    move: (event) => {
      if (!drag) return;
      const p = pointer(event);
      aim = {
        x: cl(drag.aim.x + p.x - drag.x, 45, 555),
        y: cl(drag.aim.y + p.y - drag.y, -45, 425),
      };
    },
    release: () => {
      if (!drag) return;
      drag = null;
      lockAim();
    },
    cancel: () => {
      if (!drag) return;
      aim = drag.aim;
      drag = null;
      status.textContent = "Aim cancelled. Drag the range again to aim.";
      update();
      say(status.textContent);
    },
  });
  function lockAim() {
    if (flight || review || drag) return;
    aimLocked = true;
    powerPaused = RM;
    power = RM ? 0.7 : 0.35;
    powerElapsed = RM
      ? (Math.acos(1 - (2 * (power - 0.35)) / 0.65) * 2000) / Math.PI
      : 0;
    powerStarted = performance.now();
    status.textContent = RM
      ? "Aim locked. Use arrow keys to choose power, then shoot."
      : "Aim locked. Watch the power dial, then tap the range or press Space to shoot.";
    update();
    meterFire.focus({ preventScroll: true });
    say(status.textContent);
  }
  $("#arch-adjust").onclick = () => {
    aimLocked = false;
    status.textContent = "Drag to adjust your aim. Release to lock again.";
    update();
    cv.focus({ preventScroll: true });
  };
  function powerKeys(e: KeyboardEvent) {
    if (!aimLocked || flight || review) return;
    if (e.repeat && [" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      power = cl(
        currentPower() +
          (["ArrowLeft", "ArrowDown"].includes(e.key) ? -0.05 : 0.05),
        0.35,
        1,
      );
      powerPaused = true;
      powerElapsed =
        (Math.acos(1 - (2 * (power - 0.35)) / 0.65) * 2000) / Math.PI;
      status.textContent = `Power paused at ${Math.round(power * 100)}%. Tap the range or press Space to shoot.`;
      update();
      say(`Power ${Math.round(power * 100)} percent. Press Space to shoot.`);
    } else if ([" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      shoot();
    }
  }
  cv.onkeydown = (e) => {
    if (flight || review || drag) return;
    if (aimLocked) {
      powerKeys(e);
      return;
    }
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "Enter",
      ].includes(e.key)
    )
      e.preventDefault();
    const d = e.shiftKey ? 12 : 4;
    if (e.key === "ArrowLeft") aim.x -= d;
    if (e.key === "ArrowRight") aim.x += d;
    if (e.key === "ArrowUp") aim.y -= d;
    if (e.key === "ArrowDown") aim.y += d;
    aim.x = cl(aim.x, 45, 555);
    aim.y = cl(aim.y, -45, 425);
    if (e.key.startsWith("Arrow")) {
      update();
      say(aimWords());
    }
    if (!e.repeat && [" ", "Enter"].includes(e.key)) lockAim();
  };
  meterFire.onclick = shoot;
  meterFire.onkeydown = powerKeys;
  fire.onkeydown = (e) => {
    if (aimLocked) powerKeys(e);
  };
  pause.onclick = () => {
    if (!aimLocked || flight || review) return;
    if (powerPaused) {
      powerStarted = performance.now();
      powerPaused = false;
    } else {
      power = currentPower();
      powerElapsed += performance.now() - powerStarted;
      powerPaused = true;
    }
    status.textContent = powerPaused
      ? `Meter paused at ${Math.round(power * 100)}%. Tap the range or press Space to shoot.`
      : "Watch the moving dial. Tap the range or press Space to shoot.";
    update();
    say(
      `Meter ${powerPaused ? "paused" : "moving"}. ${Math.round(power * 100)} percent.`,
    );
    meterFire.focus({ preventScroll: true });
  };
  fire.onclick = () => (aimLocked ? shoot() : lockAim());
  $("#arch-home").onclick = () => {
    disposeInput?.();
    stop();
    home();
  };
  $("#arch-restart").onclick = startArchery;
  next.onclick = () => {
    if (shots().length === 3 && round === 2) {
      showResults(shapes, rounds);
      return;
    }
    if (!continueShooting()) return;
    status.textContent = `Drag to aim. Release to lock. Then time your power. Wind ${windWords()}.`;
    say(`${shapes[round].name}. ${status.textContent}`);
    cv.focus({ preventScroll: true });
  };
  setWind();
  update();
  let theme = {
    ink: view.ink,
    bg: view.bg,
    card: css("--card"),
    mute: css("--mute"),
    line: css("--line"),
    accent: css("--k0"),
  };
  mount((t, dt) => {
    if (aimLocked && !flight && !review) {
      power = currentPower(t);
      paintPower();
    }
    const desired = review ? 1 : 0;
    zoom = RM ? desired : zoom + (desired - zoom) * (1 - Math.exp(-dt * 7));
    const c = view.cx,
      scale = view.f.w / 600,
      h = view.f.h / scale;
    c.save();
    c.scale(scale, scale);
    let swayAngle = 0;
    if (wobble) {
      step(wobble.ps, dt);
      if (!wobble.settled && (wobble.ps.calm > 0.14 || wobble.ps.t > 4))
        wobble.settled = t;
      const u = wobble.settled ? cl((t - wobble.settled) / 260, 0, 1) : 0;
      swayAngle = wobble.ps.th * (1 - u) ** 3;
      if (u >= 1) wobble = null;
    }
    let flying: null | { u: number; x: number; y: number } = null;
    if (flight) {
      const u = RM ? 1 : cl((t - flight.start) / (flight.end.time * 950), 0, 1);
      flying = {
        u,
        x: flight.aim.x + (flight.end.x - flight.aim.x) * u * u,
        y: flight.aim.y + (flight.end.y - flight.aim.y) * u * u,
      };
    }
    if (theme.bg !== view.bg || theme.ink !== view.ink)
      theme = {
        ink: view.ink,
        bg: view.bg,
        card: css("--card"),
        mute: css("--mute"),
        line: css("--line"),
        accent: css("--k0"),
      };
    drawRange(c, shapes[round], shots(), {
      theme,
      distance,
      aimLocked,
      height: h,
      time: t,
      wind,
      aim,
      power,
      draw: aimLocked ? power : 0,
      zoom,
      review,
      reduced: RM,
      flight: flying,
      wobble: wobble ? { x: wobble.x, y: wobble.y, th: swayAngle } : null,
    });
    c.restore();
    const sight = targetPoint(300, 8, { height: h, zoom: 0, distance });
    sightWind.style.left = `${cl(sight.x * scale, 72, view.f.w - 72)}px`;
    sightWind.style.top = `${cl(sight.y * scale - 40, 36, view.f.h - 48)}px`;
    if (flying?.u === 1) finish();
  }, true);
}
function showResults(shapes: Shape[], rounds: RangeShot[][]) {
  disposeInput?.();
  stop();
  setTitle("Archery results");
  app.className = "archery-results";
  const all = rounds.flat(),
    total = all.reduce((n, s) => n + s.pts, 0),
    hits = all.filter((s) => s.hit).length,
    perfect = all.filter((s) => s.pts === 100).length;
  const title =
    total >= 750
      ? "A natural."
      : total >= 500
        ? "A steady hand."
        : total >= 250
          ? "Finding your range."
          : "One more round?";
  app.innerHTML = `<header class="arch-header"><button class="brand-home" id="arch-home">Pinpoise</button><span>Poise Archery</span><span>Range complete</span></header>
  <div class="arch-result-intro"><h1 tabindex="-1" id="arch-result-title">${title}</h1><p class="arch-final-score">${total}<span> / 900</span></p><p>${hits} of 9 pins landed${perfect ? ` · ${perfect} perfect ${perfect === 1 ? "shot" : "shots"}` : ""}. Best shot: ${Math.max(...all.map((s) => s.pts))} points.</p></div>
  <div class="arch-result-targets">${shapes.map((shape, i) => `<section class="arch-result-target"><div class="arch-result-target-title"><h2>${shape.name}</h2><b>${rounds[i].reduce((n, s) => n + s.pts, 0)}<small> / 300</small></b></div><canvas width="600" height="600" aria-label="${shape.name}: three shot locations with the balance point marked in green"></canvas><ol>${rounds[i].map((s, j) => `<li><span>Shot ${j + 1}</span><span>${s.hit ? `${s.cm.toFixed(1)} cm off` : "Miss"}</span><b>${s.pts}<small> pts</small></b></li>`).join("")}</ol></section>`).join("")}</div>
  <p class="arch-result-key"><i></i>Your pins <i></i>Balance point</p><div class="arch-result-actions"><button class="btn" id="arch-again">Play again</button><button class="btn ghost" id="arch-copy">Copy score</button><button class="arch-text-btn" id="arch-back">Back to Pinpoise</button></div><p class="small mute" id="arch-copy-status" role="status"></p>`;
  app.scrollTop = 0;
  const renderRecaps = () =>
    document
      .querySelectorAll<HTMLCanvasElement>(".arch-result-target canvas")
      .forEach((canvas, i) => drawRecap(canvas, shapes[i], rounds[i]));
  renderRecaps();
  watch($(".arch-result-targets"), renderRecaps);
  $("#arch-again").onclick = startArchery;
  $("#arch-home").onclick = $("#arch-back").onclick = home;
  $("#arch-copy").onclick = async () => {
    const text = `Poise Archery · ${total}/900\n${hits}/9 pins landed${perfect ? ` · ${perfect} perfect ${perfect === 1 ? "shot" : "shots"}` : ""}\n\n${rounds.map((r, i) => `${shapes[i].name}: ${r.map((s) => s.pts).join(" · ")}`).join("\n")}\n\nhttps://poisedaily.com/`;
    try {
      await navigator.clipboard.writeText(text);
      $("#arch-copy-status").textContent = "Score copied.";
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      $("#arch-copy-status").textContent = copied
        ? "Score copied."
        : `Copy this score:\n\n${text}`;
    }
  };
  $("#arch-result-title").focus({ preventScroll: true });
  say(`Range complete. ${total} of 900 points. ${hits} pins landed.`);
}
function drawRecap(
  canvas: HTMLCanvasElement,
  shape: Shape,
  shots: RangeShot[],
) {
  const c = canvas.getContext("2d")!;
  c.fillStyle = css("--card");
  c.fillRect(0, 0, 600, 600);
  shapeImage(c, shape, 80, 80, 440, 440);
  const cx = 80 + shape.c[0] * 440,
    cy = 80 + shape.c[1] * 440;
  c.strokeStyle = css("--bg");
  c.lineWidth = 9;
  c.beginPath();
  c.arc(cx, cy, 18, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = css("--k0");
  c.lineWidth = 4;
  c.stroke();
  // Keep labels readable in CSS pixels, including the compact phone recap.
  const pixel = 600 / Math.max(1, canvas.getBoundingClientRect().width);
  const radius = 11 * pixel;
  const points = shots
    .map((shot, index) => ({
      index,
      x: cl(80 + ((shot.x - 110) / 380) * 440, 20, 580),
      y: cl(80 + ((shot.y - 20) / 380) * 440, 20, 580),
    }))
    .sort((a, b) => a.y - b.y);
  points.forEach((p, rank) => {
    const labelX = 600 - radius - 14 * pixel,
      labelY = 120 + rank * 180;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(labelX - radius, labelY);
    c.strokeStyle = "#faf4e4";
    c.lineWidth = 3.5 * pixel;
    c.stroke();
    c.strokeStyle = "#8d3c28";
    c.lineWidth = 1.3 * pixel;
    c.stroke();
    c.beginPath();
    c.arc(p.x, p.y, 3 * pixel, 0, Math.PI * 2);
    c.fillStyle = "#b34d33";
    c.fill();
  });
  points.forEach((p, rank) => {
    const labelX = 600 - radius - 14 * pixel,
      labelY = 120 + rank * 180;
    c.beginPath();
    c.arc(labelX, labelY, radius, 0, Math.PI * 2);
    c.fillStyle = "#8d3c28";
    c.fill();
    c.strokeStyle = "#fff4dd";
    c.lineWidth = 1.5 * pixel;
    c.stroke();
    c.fillStyle = "#fff";
    c.font = `700 ${13 * pixel}px "Bricolage Grotesque", sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(p.index + 1), labelX, labelY);
  });
}
function onShape(shape: Shape, u: number, v: number) {
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  const hasVisiblePixel = (canvas: HTMLCanvasElement) => {
    const x = Math.floor(u * canvas.width),
      y = Math.floor(v * canvas.height),
      left = Math.max(0, x - 5),
      top = Math.max(0, y - 5);
    const data = canvas
      .getContext("2d")!
      .getImageData(
        left,
        top,
        Math.min(11, canvas.width - left),
        Math.min(11, canvas.height - top),
      ).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 10) return true;
    return false;
  };
  return hasVisiblePixel(shape.sp) || hasVisiblePixel(shape.mesh);
}
