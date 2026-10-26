import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fontPath = fileURLToPath(
  new URL("../public/fonts/bricolage-latin.woff2", import.meta.url),
);
GlobalFonts.registerFromPath(fontPath, "Bricolage Grotesque");

const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext("2d");
const ink = "#f1f3f7";
const mute = "#9ca3b0";
const bg = "#16181d";

ctx.fillStyle = bg;
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = ink;
ctx.font = '800 132px "Bricolage Grotesque"';
ctx.fillText("Pinpoise", 72, 252);

ctx.font = '700 43px "Bricolage Grotesque"';
ctx.fillText("Pin each shape at its balance point.", 78, 340);

ctx.fillStyle = mute;
ctx.font = '600 31px "Bricolage Grotesque"';
ctx.fillText("Five new shapes every day.", 78, 552);

ctx.save();
ctx.translate(918, 322);
ctx.rotate((-8 * Math.PI) / 180);
ctx.fillStyle = "#ffb627";
ctx.beginPath();
ctx.roundRect(-150, 27, 300, 54, 27);
ctx.fill();
ctx.restore();

ctx.strokeStyle = "#8b93a1";
ctx.lineWidth = 18;
ctx.lineCap = "round";
ctx.beginPath();
ctx.moveTo(918, 356);
ctx.lineTo(918, 210);
ctx.stroke();

ctx.fillStyle = ink;
ctx.beginPath();
ctx.arc(918, 175, 54, 0, Math.PI * 2);
ctx.fill();

await writeFile(
  fileURLToPath(new URL("../public/og.png", import.meta.url)),
  canvas.toBuffer("image/png"),
);
