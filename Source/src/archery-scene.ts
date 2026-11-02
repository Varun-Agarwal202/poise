import type { Shape } from "./gen";
export interface RangeShot {
  x: number;
  y: number;
  pts: number;
  hit: boolean;
  cm: number;
}
export interface RangeCamera {
  height: number;
  zoom: number;
  distance?: number;
}
function targetScale(height: number, zoom: number, distance = 12) {
  const depth = 12 / distance;
  return (
    Math.min(0.76, height * 0.00135) *
    (depth + (1 - depth) * zoom) *
    (1 + zoom * 0.42)
  );
}
export function targetPoint(x: number, y: number, camera: RangeCamera) {
  const k = targetScale(camera.height, camera.zoom, camera.distance);
  return {
    x: 300 + (x - 300) * k,
    y: camera.height * (0.38 + camera.zoom * 0.04) + (y - 210) * k,
  };
}
export function rangePoint(
  x: number,
  y: number,
  height: number,
  distance = 12,
) {
  return {
    x: 300 + (x - 300) / targetScale(height, 0, distance),
    y: 210 + (y - height * 0.38) / targetScale(height, 0, distance),
  };
}
export interface RangeTheme {
  ink: string;
  bg: string;
  card: string;
  mute: string;
  line: string;
  accent: string;
}
function mix(a: string, b: string, ratio: number) {
  const parse = (color: string) => {
    const hex = color.slice(1);
    return Number.parseInt(
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex,
      16,
    );
  };
  const av = parse(a),
    bv = parse(b);
  return (
    "#" +
    [16, 8, 0]
      .map((shift) =>
        Math.round(
          ((av >> shift) & 255) * (1 - ratio) + ((bv >> shift) & 255) * ratio,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
interface Scene {
  theme: RangeTheme;
  distance: number;
  aimLocked: boolean;
  height: number;
  time: number;
  wind: number;
  aim: { x: number; y: number };
  power: number;
  draw: number;
  zoom: number;
  review: boolean;
  reduced: boolean;
  flight: { u: number; x: number; y: number } | null;
}
function line(
  c: CanvasRenderingContext2D,
  points: number[],
  color: string,
  width = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.stroke();
}
function tree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x - size * 0.34, y - size * 0.3);
  c.lineTo(x - size * 0.15, y - size * 0.3);
  c.lineTo(x - size * 0.48, y);
  c.lineTo(x + size * 0.48, y);
  c.lineTo(x + size * 0.15, y - size * 0.3);
  c.lineTo(x + size * 0.34, y - size * 0.3);
  c.closePath();
  c.fill();
  c.fillRect(x - size * 0.035, y, size * 0.07, size * 0.2);
}
/** A fixed first-person camera; only the impact inspection moves toward the target. */
export function drawRange(
  c: CanvasRenderingContext2D,
  shape: Shape,
  shots: RangeShot[],
  s: Scene,
) {
  const h = s.height,
    horizon = h * 0.55,
    t = s.theme;
  c.fillStyle = t.bg;
  c.fillRect(0, 0, 600, h);
  c.fillStyle = mix(t.bg, t.ink, 0.035);
  c.beginPath();
  c.moveTo(0, horizon);
  c.bezierCurveTo(90, horizon - 95, 135, horizon - 75, 240, horizon - 25);
  c.bezierCurveTo(390, horizon - 120, 475, horizon - 90, 600, horizon - 40);
  c.lineTo(600, horizon + 30);
  c.lineTo(0, horizon + 30);
  c.fill();
  for (let i = 0; i < 19; i++)
    tree(
      c,
      i * 37 - 22,
      horizon + 10,
      38 + ((i * 23) % 48),
      mix(t.bg, t.ink, 0.075),
    );
  c.fillStyle = mix(t.bg, t.ink, 0.06);
  c.fillRect(0, horizon + 12, 600, h);
  c.fillStyle = mix(t.bg, t.ink, 0.025);
  c.beginPath();
  c.moveTo(276, horizon + 12);
  c.lineTo(324, horizon + 12);
  c.lineTo(560, h);
  c.lineTo(40, h);
  c.closePath();
  c.fill();
  // Converging ground marks place the archer on a lane rather than above a diagram.
  for (let i = 0; i < 4; i++) {
    const y = horizon + (h - horizon) * Math.pow((i + 1) / 5, 1.9),
      half = 20 + (y - horizon) * 0.47;
    line(c, [300 - half, y, 300 + half, y], mix(t.bg, t.ink, 0.12), 1);
  }
  c.fillStyle = mix(t.bg, t.ink, 0.14);
  c.beginPath();
  const ground = targetPoint(300, 467, {
    height: h,
    zoom: s.zoom,
    distance: s.distance,
  });
  const shadowScale = targetScale(h, s.zoom, s.distance);
  c.ellipse(
    ground.x,
    ground.y,
    139 * shadowScale,
    14 * shadowScale,
    0,
    0,
    Math.PI * 2,
  );
  c.fill();
  // Speed, length and direction all use the same wind as the shot physics.
  if (Math.abs(s.wind) > 0.05) {
    const direction = Math.sign(s.wind),
      speed = 15 + Math.abs(s.wind) * 12;
    c.save();
    c.globalAlpha = 0.48;
    c.strokeStyle = t.mute;
    c.lineWidth = 1.3;
    for (let i = 0; i < 13; i++) {
      const drift = s.reduced ? 0 : (s.time / 1000) * speed * direction;
      const x = ((((i * 113 + drift) % 720) + 720) % 720) - 60;
      const y = 50 + ((i * 83) % Math.max(80, h - 110));
      const length = 14 + Math.abs(s.wind) * 5;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(
        x + direction * length * 0.35,
        y - 6,
        x + direction * length * 0.7,
        y + 5,
        x + direction * length,
        y,
      );
      c.stroke();
      c.beginPath();
      c.moveTo(x + direction * (length - 5), y - 3);
      c.lineTo(x + direction * length, y);
      c.lineTo(x + direction * (length - 5), y + 3);
      c.stroke();
    }
    c.restore();
  }
  const camera = { height: h, zoom: s.zoom, distance: s.distance },
    center = targetPoint(300, 210, camera),
    k = targetScale(h, s.zoom, s.distance);
  c.save();
  c.translate(center.x, center.y);
  c.scale(k, k);
  line(c, [-118, 147, -153, 257], mix(t.bg, t.ink, 0.4), 12);
  line(c, [118, 147, 153, 257], mix(t.bg, t.ink, 0.4), 12);
  line(c, [-125, 205, 125, 205], mix(t.bg, t.ink, 0.4), 7);
  c.fillStyle = t.line;
  c.fillRect(-202, -202, 404, 404);
  c.fillStyle = t.card;
  c.fillRect(-194, -194, 388, 388);
  c.strokeStyle = t.line;
  c.lineWidth = 1;
  c.strokeRect(-186, -186, 372, 372);
  c.fillStyle = t.mute;
  for (const x of [-186, 186])
    for (const y of [-186, 186]) {
      c.beginPath();
      c.arc(x, y, 3, 0, Math.PI * 2);
      c.fill();
    }
  c.save();
  c.shadowColor = "#00000020";
  c.shadowBlur = 7;
  c.shadowOffsetY = 5;
  c.drawImage(shape.sp, -190, -190, 380, 380);
  c.restore();
  if (s.review && shots.length === 3) {
    const cx = (shape.c[0] - 0.5) * 380,
      cy = (shape.c[1] - 0.5) * 380;
    c.strokeStyle = t.bg;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(cx, cy, 16, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = t.accent;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = t.accent;
    c.beginPath();
    c.arc(cx, cy, 3, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i],
      x = shot.x - 300,
      y = shot.y - 210;
    if (x < -195 || x > 195 || y < -195 || y > 195) continue;
    line(c, [x, y, x + 7, y - 18], t.bg, 5);
    line(c, [x, y, x + 7, y - 18], t.ink, 2);
    c.fillStyle = shot.hit ? t.ink : t.mute;
    c.beginPath();
    c.arc(x + 7, y - 18, 5, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  // Windsock at target depth. Its direction is the same wind used by the shot.
  const flagX = 83,
    flagY = horizon - 108;
  line(c, [flagX, flagY, flagX, horizon + 29], t.mute, 3);
  const direction = s.wind < 0 ? -1 : 1,
    length = 16 + Math.abs(s.wind) * 4;
  c.fillStyle = t.accent;
  c.beginPath();
  c.moveTo(flagX, flagY);
  c.lineTo(
    flagX + direction * length,
    flagY + 6 + (s.reduced ? 0 : Math.sin(s.time * 0.004) * 3),
  );
  c.lineTo(flagX + direction * length, flagY + 16);
  c.lineTo(flagX, flagY + 13);
  c.fill();
  c.fillStyle = t.mute;
  c.font = '600 11px "Bricolage Grotesque", sans-serif';
  c.textAlign = "center";
  c.fillText(`${s.distance} m`, 300, horizon + 87);
  if (!s.review && !s.flight) {
    const p = targetPoint(s.aim.x, s.aim.y, {
      height: h,
      zoom: 0,
      distance: s.distance,
    });
    c.strokeStyle = t.bg;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(p.x, p.y, 12, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = t.ink;
    c.lineWidth = s.aimLocked ? 2.5 : 1.5;
    c.stroke();
    line(c, [p.x - 21, p.y, p.x - 7, p.y], t.ink, 1.5);
    line(c, [p.x + 7, p.y, p.x + 21, p.y], t.ink, 1.5);
    line(c, [p.x, p.y - 21, p.x, p.y - 7], t.ink, 1.5);
    line(c, [p.x, p.y + 7, p.x, p.y + 21], t.ink, 1.5);
  }
  if (s.flight) {
    const p = targetPoint(s.flight.x, s.flight.y, camera),
      u = s.flight.u,
      depth = 1 - Math.pow(1 - u, 2);
    const x = 330 + (p.x - 330) * depth,
      y = h + 35 + (p.y - h - 35) * depth,
      size = 52 * (1 - u) + 4;
    c.save();
    c.translate(x, y);
    c.rotate(-0.2 * (1 - u));
    line(c, [0, 0, 0, size * 2], t.ink, Math.max(1.8, 5 * (1 - u)));
    c.fillStyle = t.ink;
    c.beginPath();
    c.arc(0, size * 1.5, Math.max(3, size * 0.16), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  if (!s.review) {
    c.save();
    const kick = s.flight ? Math.min(1, s.flight.u * 5) : 0;
    const bowScale = Math.min(1, h / 450);
    c.translate(385, h - 95 * bowScale + kick * 170 * bowScale);
    c.scale(bowScale, bowScale);
    c.rotate(0.12 + (s.aim.x - 300) * 0.00035);
    // Near recurve limbs, grip and string surround the forward-facing pin.
    c.lineCap = "round";
    c.strokeStyle = mix(t.bg, t.ink, 0.7);
    c.lineWidth = 18;
    c.beginPath();
    c.moveTo(62, -230);
    c.bezierCurveTo(100, -195, 16, -85, 0, 0);
    c.bezierCurveTo(-16, 80, 35, 135, -13, 205);
    c.stroke();
    c.strokeStyle = t.mute;
    c.lineWidth = 10;
    c.stroke();
    c.strokeStyle = t.line;
    c.lineWidth = 3;
    c.stroke();
    const pull = s.draw * 40;
    line(c, [62, -230, -54 - pull, 25, -13, 205], mix(t.bg, t.ink, 0.35), 2);
    c.fillStyle = mix(t.bg, t.ink, 0.8);
    c.beginPath();
    c.roundRect(-19, -25, 37, 67, 10);
    c.fill();
    // Forearm and wrapped fingers sit on the near side of the grip.
    c.fillStyle = mix(t.bg, t.ink, 0.45);
    c.beginPath();
    c.moveTo(-29, 28);
    c.bezierCurveTo(-68, 49, -85, 118, -117, 210);
    c.lineTo(-23, 215);
    c.lineTo(16, 58);
    c.quadraticCurveTo(23, 28, -29, 28);
    c.fill();
    c.fillStyle = mix(t.bg, t.ink, 0.6);
    c.beginPath();
    c.moveTo(-72, 115);
    c.lineTo(-7, 137);
    c.lineTo(-23, 225);
    c.lineTo(-117, 225);
    c.closePath();
    c.fill();
    c.fillStyle = mix(t.bg, t.ink, 0.52);
    c.beginPath();
    c.roundRect(-27, -6, 39, 59, 13);
    c.fill();
    for (let i = 0; i < 3; i++)
      line(c, [-22, 9 + i * 11, 8, 12 + i * 11], mix(t.bg, t.ink, 0.72), 2);
    if (!s.flight) {
      line(c, [-54 - pull, 25, -61 - pull, -9], t.ink, 2.5);
      c.fillStyle = t.ink;
      c.beginPath();
      c.arc(-61 - pull, -9, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = t.bg;
      c.lineWidth = 1.5;
      c.stroke();
    }
    c.restore();
  }
}
