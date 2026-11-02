/** A slow, repeating draw: two seconds to full strength, two back down.
 * A cosine sweep gives players more time near either end without an auto-shot. */
export function sweptPower(elapsed: number) {
  return (
    0.35 + (0.65 * (1 - Math.cos((Math.max(0, elapsed) * Math.PI) / 2000))) / 2
  );
}
