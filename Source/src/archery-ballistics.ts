/** Each target has three increasingly distant, windier shots. */
export function shotConditions(shot: number, random: () => number) {
  const index = Math.min(2, Math.max(0, shot));
  const speed = Math.round((2 + index * 3 + random() * 2) * 10) / 10;
  return { distance: 12 + index * 6, wind: speed * (random() < 0.5 ? -1 : 1) };
}
/** Longer flights accumulate more wind drift and drop. These units are target
 * coordinates; changing the camera never changes where the pin physically lands. */
export function landing(
  x: number,
  y: number,
  power: number,
  wind: number,
  distance = 12,
) {
  const time =
    (1.25 - Math.min(1, Math.max(0, power)) * 0.7) * Math.sqrt(distance / 12);
  return { x: x + wind * 10 * time ** 2, y: y + 58 * time ** 2, time };
}
