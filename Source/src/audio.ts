import { prefs } from "./prefs";
let ac: AudioContext | undefined;
type W = typeof window & { webkitAudioContext?: typeof AudioContext };
addEventListener("pointerdown", () => {
  try {
    ac = ac || new (window.AudioContext || (window as W).webkitAudioContext!)();
    ac.resume();
  } catch {}
});

export const buzz = (p: number | number[]) => {
  if (!prefs.haptics) return;
  try {
    navigator.vibrate?.(p);
  } catch {}
};
export function snd(
  f: number,
  d = 0.1,
  ty: OscillatorType = "sine",
  g = 0.07,
  at = 0,
) {
  if (!ac || !prefs.sound) return;
  try {
    const o = ac.createOscillator(),
      a = ac.createGain(),
      t = ac.currentTime + at;
    o.type = ty;
    o.frequency.value = f;
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(a).connect(ac.destination);
    o.start(t);
    o.stop(t + d);
  } catch {}
}
