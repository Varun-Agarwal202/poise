/** Authored volumetric objects. Parts are solid cuboids and connected voxel paths,
 * not the old mostly-flat characters with a token cube added in front. */
export type Point3 = [number, number, number];
const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): Point3[] => {
  const out: Point3[] = [];
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++)
      for (let k = 0; k < d; k++) out.push([x + i, y + j, z + k]);
  return out;
};
const path = (...points: Point3[]): Point3[] => {
  const out: Point3[] = [];
  let at = [...points[0]] as Point3;
  out.push([...at]);
  for (const p of points.slice(1)) {
    const start = [...at] as Point3;
    const steps = Math.max(...p.map((v, i) => Math.abs(v - start[i])));
    for (let step = 1; step <= steps; step++) {
      const target = p.map((v, i) =>
        Math.round(start[i] + ((v - start[i]) * step) / steps),
      );
      for (let axis = 0; axis < 3; axis++)
        while (at[axis] !== target[axis]) {
          at = [...at];
          at[axis] += Math.sign(target[axis] - at[axis]);
          out.push(at);
        }
    }
  }
  return out;
};
const join = (...parts: Point3[][]): Point3[] => [
  ...new Map(parts.flat().map((p) => [p.join(","), p])).values(),
];
const ring = (x: number, y: number, z: number, w: number, h: number, d = 1) =>
  join(
    box(x, y, z, w, 1, d),
    box(x, y + h - 1, z, w, 1, d),
    box(x, y, z, 1, h, d),
    box(x + w - 1, y, z, 1, h, d),
  );
interface Volume {
  id: string;
  name: string;
  make: (random: () => number) => Point3[];
}
export const VOLUME_OBJECTS: Volume[] = [];
const add = (id: string, name: string, make: Volume["make"]) =>
  VOLUME_OBJECTS.push({ id, name, make });
const legs = (
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
) =>
  join(
    box(x, y, z, 1, h, 1),
    box(x + w - 1, y, z, 1, h, 1),
    box(x, y, z + d - 1, 1, h, 1),
    box(x + w - 1, y, z + d - 1, 1, h, 1),
  );

add("elephant", "Elephant", () =>
  join(
    box(-3, -1, -1, 5, 3, 3),
    box(2, -2, -1, 3, 3, 3),
    box(4, 0, 0, 1, 4, 1),
    box(1, -2, -2, 2, 3, 1),
    box(1, -2, 2, 2, 3, 1),
    legs(-3, 2, -1, 5, 3, 3),
    path([-3, 0, 0], [-5, 0, 0], [-5, 2, 0]),
  ),
);
add("giraffe", "Giraffe", () =>
  join(
    box(-3, 0, -1, 5, 2, 3),
    box(1, -6, 0, 1, 7, 1),
    box(1, -7, -1, 3, 2, 2),
    box(1, -8, -1, 1, 1, 1),
    box(2, -8, 0, 1, 1, 1),
    legs(-3, 2, -1, 5, 3, 4),
  ),
);
add("fox", "Fox", () =>
  join(
    box(-2, -1, -1, 4, 3, 3),
    box(1, -3, -1, 3, 3, 3),
    box(3, -2, 0, 2, 1, 1),
    box(1, -4, -1, 1, 1, 1),
    box(2, -4, 1, 1, 1, 1),
    legs(-2, 2, -1, 4, 3, 2),
    path([-2, 0, 0], [-5, 0, 0], [-5, -2, 0]),
    box(-6, -2, -1, 2, 2, 3),
  ),
);
add("rabbit", "Rabbit", () =>
  join(
    box(-2, -1, -1, 4, 4, 3),
    box(1, -3, -1, 3, 3, 3),
    box(1, -7, -1, 1, 4, 1),
    box(2, -6, 1, 1, 3, 1),
    box(-3, 1, 0, 1, 2, 1),
    box(0, 3, -2, 4, 1, 2),
    box(0, 3, 1, 4, 1, 2),
  ),
);
add("turtle", "Tortoise", () =>
  join(
    box(-3, -1, -2, 6, 3, 5),
    box(-2, -2, -1, 4, 1, 3),
    box(3, 0, -1, 2, 2, 2),
    legs(-3, 2, -2, 6, 5, 2),
    path([-3, 1, 0], [-5, 1, 0]),
  ),
);
add("crocodile", "Crocodile", () =>
  join(
    box(-3, 0, -1, 6, 2, 3),
    box(3, 0, -1, 4, 1, 3),
    box(4, 1, 0, 3, 1, 1),
    path([-3, 1, 0], [-7, 1, 0], [-8, 0, 0]),
    legs(-2, 1, -2, 5, 5, 1),
    box(-2, -1, 0, 1, 1, 1),
    box(0, -1, 0, 1, 1, 1),
    box(2, -1, 0, 1, 1, 1),
  ),
);
add("camel", "Camel", () =>
  join(
    box(-3, 0, -1, 6, 2, 3),
    box(-2, -2, -1, 2, 2, 3),
    box(1, -2, -1, 2, 2, 3),
    box(3, -3, 0, 1, 5, 1),
    box(3, -4, -1, 3, 2, 2),
    legs(-3, 2, -1, 6, 3, 4),
  ),
);
add("moose", "Moose", () =>
  join(
    box(-3, 0, -1, 5, 3, 3),
    box(2, -3, -1, 2, 5, 3),
    box(3, -3, -1, 3, 2, 3),
    legs(-3, 3, -1, 5, 3, 3),
    path([3, -3, -1], [3, -5, -1], [3, -5, -4], [3, -7, -4]),
    path([3, -3, 1], [3, -5, 1], [3, -5, 4], [3, -7, 4]),
    box(2, -6, -3, 2, 1, 1),
    box(2, -6, 3, 2, 1, 1),
  ),
);

add("trex", "Tyrannosaurus", () =>
  join(
    box(-2, -1, -1, 4, 4, 3),
    box(1, -4, -1, 2, 4, 3),
    box(2, -5, -1, 4, 2, 3),
    legs(-1, 3, -1, 3, 3, 3),
    box(0, 5, -2, 3, 1, 2),
    box(0, 5, 1, 3, 1, 2),
    path([-2, 1, 0], [-6, 1, 0], [-7, 0, 0]),
    path([1, 0, -1], [3, 0, -1], [3, 1, -1]),
    path([1, 0, 1], [3, 0, 1], [3, 1, 1]),
  ),
);
add("stegosaurus", "Stegosaurus", () =>
  join(
    box(-4, 0, -1, 7, 3, 3),
    box(3, 1, 0, 3, 1, 1),
    legs(-3, 3, -1, 6, 3, 2),
    path([-4, 1, 0], [-7, 1, 0]),
    ...[-3, -1, 1].map((x) => box(x, -2, 0, 1, 2, 1)),
  ),
);
add("triceratops", "Triceratops", () =>
  join(
    box(-4, 0, -1, 6, 3, 3),
    box(2, -1, -2, 1, 5, 5),
    box(3, 0, -1, 3, 2, 3),
    box(4, -2, -1, 1, 2, 1),
    box(4, -2, 1, 1, 2, 1),
    box(6, 0, 0, 1, 1, 1),
    legs(-4, 3, -1, 6, 3, 2),
  ),
);
add("pterodactyl", "Pterodactyl", () =>
  join(
    box(-1, -1, -2, 3, 2, 5),
    path([0, 0, 0], [-6, -2, 0]),
    path([0, 0, 0], [6, -2, 0]),
    path([-6, -2, 0], [-3, 1, 2], [0, 0, 2]),
    path([6, -2, 0], [3, 1, 2], [0, 0, 2]),
    box(0, -2, -4, 1, 2, 3),
    box(0, -2, -6, 1, 1, 3),
    path([0, 0, 2], [0, 1, 5]),
  ),
);
add("octopus", "Octopus", () =>
  join(
    box(-1, -3, -1, 3, 4, 3),
    box(0, -4, 0, 1, 1, 1),
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) => path([x, 0, z], [x * 4, 0, z], [x * 4, 2, z * 3])),
    ),
    path([0, 0, -1], [0, 1, -5], [2, 1, -5]),
    path([0, 0, 1], [0, 1, 5], [-2, 1, 5]),
    path([-1, 0, 0], [-5, 1, 0], [-5, 1, 2]),
    path([1, 0, 0], [5, 1, 0], [5, 1, -2]),
  ),
);
add("whale", "Whale", () =>
  join(
    box(-4, -1, -2, 7, 3, 5),
    box(-3, -2, -1, 5, 1, 3),
    box(3, 0, -1, 2, 2, 3),
    box(5, 0, -3, 1, 1, 7),
    box(-1, 1, -4, 2, 1, 3),
    box(-1, 1, 2, 2, 1, 3),
  ),
);
add("seahorse", "Seahorse", () =>
  join(
    box(0, -4, -1, 2, 5, 3),
    box(1, -5, -1, 3, 2, 3),
    box(3, -4, 0, 3, 1, 1),
    box(-1, 0, -1, 3, 3, 3),
    path([0, 2, 0], [0, 5, 0], [-3, 5, 0], [-3, 3, 0], [-2, 3, 0]),
    box(-2, -2, 0, 2, 2, 1),
  ),
);
add("scorpion", "Scorpion", () =>
  join(
    box(-2, 0, -1, 5, 2, 3),
    path([2, 1, 0], [5, 1, 0], [5, -4, 0], [2, -4, 0], [2, -2, 0]),
    ...[-1, 1].map((z) =>
      join(
        path([-2, 0, z], [-4, 0, z * 3], [-6, 0, z * 3]),
        box(-7, -1, z * 3 - 1, 2, 2, 3),
      ),
    ),
    ...[-1, 0, 1].flatMap((x) => [
      path([x, 1, -1], [x - 1, 2, -3]),
      path([x, 1, 1], [x - 1, 2, 3]),
    ]),
  ),
);

add("dragon", "Dragon", () =>
  join(
    box(-2, -1, -1, 4, 4, 3),
    box(1, -3, -1, 3, 3, 3),
    box(3, -3, 0, 3, 1, 1),
    path([-2, 1, 0], [-6, 1, 0], [-6, -1, 0]),
    legs(-1, 3, -1, 3, 3, 2),
    path([0, 0, -1], [-1, -4, -4], [2, -2, -3], [0, 0, -1]),
    path([0, 0, 1], [-1, -4, 4], [2, -2, 3], [0, 0, 1]),
    box(2, -4, -1, 1, 1, 1),
    box(2, -4, 1, 1, 1, 1),
  ),
);
add("pegasus", "Pegasus", () =>
  join(
    box(-3, 0, -1, 6, 2, 3),
    box(2, -3, 0, 1, 4, 1),
    box(2, -4, -1, 3, 2, 3),
    legs(-3, 2, -1, 6, 3, 4),
    path([0, 0, -1], [-2, -3, -4], [2, -3, -4], [1, -1, -2]),
    path([0, 0, 1], [-2, -3, 4], [2, -3, 4], [1, -1, 2]),
  ),
);
add("unicorn", "Unicorn", () =>
  join(
    box(-3, 0, -1, 6, 2, 3),
    box(2, -3, 0, 1, 4, 1),
    box(2, -4, -1, 3, 2, 3),
    box(3, -7, 0, 1, 3, 1),
    legs(-3, 2, -1, 6, 3, 4),
    path([-3, 1, 0], [-5, 1, 0], [-5, 3, 0]),
  ),
);
add("phoenix", "Phoenix", () =>
  join(
    box(-1, -2, -1, 3, 4, 3),
    box(0, -4, -1, 2, 2, 3),
    box(2, -4, 0, 2, 1, 1),
    path([-1, -1, 0], [-5, -4, 0], [-5, -6, 0]),
    path([1, -1, 0], [5, -4, 0], [5, -6, 0]),
    box(-4, -3, 0, 3, 1, 2),
    box(2, -3, 0, 3, 1, 2),
    path([0, 1, 0], [-2, 5, 0]),
    path([0, 1, 0], [2, 5, 0]),
    box(0, 2, 1, 1, 3, 1),
  ),
);
add("gryphon", "Gryphon", () =>
  join(
    box(-3, 0, -1, 5, 3, 3),
    box(1, -3, -1, 2, 4, 3),
    box(2, -4, -1, 3, 2, 3),
    box(5, -3, 0, 2, 1, 1),
    legs(-3, 3, -1, 5, 3, 3),
    path([0, 0, -1], [-2, -4, -4], [1, -4, -4], [1, -1, -2]),
    path([0, 0, 1], [-2, -4, 4], [1, -4, 4], [1, -1, 2]),
  ),
);
add("hydra", "Three-headed hydra", () =>
  join(
    box(-2, 1, -1, 5, 3, 3),
    ...[-3, 0, 3].map((z) =>
      join(path([1, 1, 0], [1, -2, z], [2, -4, z]), box(2, -5, z - 1, 3, 2, 2)),
    ),
    legs(-2, 4, -1, 5, 3, 2),
    path([-2, 2, 0], [-5, 2, 0], [-5, 0, 0]),
  ),
);
add("wizard-tower", "Wizard tower", () =>
  join(
    ring(-2, -3, -2, 5, 7, 5),
    box(-3, -4, -3, 7, 1, 7),
    box(-2, -5, -2, 5, 1, 5),
    box(-1, -6, -1, 3, 1, 3),
    box(0, -8, 0, 1, 2, 1),
    box(1, -7, 0, 2, 1, 1),
  ),
);
add("mech", "Walking mech", () =>
  join(
    box(-2, -3, -1, 5, 4, 3),
    box(-1, -5, -1, 3, 2, 3),
    box(-4, -2, -1, 2, 4, 2),
    box(3, -2, 0, 3, 2, 1),
    box(-2, 1, -1, 2, 4, 2),
    box(1, 1, 0, 2, 4, 2),
    box(-3, 4, -2, 3, 1, 4),
    box(1, 4, -1, 3, 1, 4),
  ),
);

add("rocket", "Rocket", () =>
  join(
    box(-1, -5, -1, 3, 8, 3),
    box(0, -7, 0, 1, 2, 1),
    box(-3, 1, 0, 2, 3, 1),
    box(2, 1, 0, 2, 3, 1),
    box(0, 1, -3, 1, 3, 2),
    box(0, 1, 2, 1, 3, 2),
    box(0, 3, 0, 1, 2, 1),
  ),
);
add("lander", "Lunar lander", () =>
  join(
    box(-2, -3, -2, 5, 3, 5),
    box(-1, -4, -1, 3, 1, 3),
    box(-2, 0, -2, 5, 1, 5),
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        join(
          path([x * 2, 0, z * 2], [x * 4, 3, z * 4]),
          box(x * 4 - 1, 3, z * 4 - 1, 3, 1, 3),
        ),
      ),
    ),
  ),
);
add("rover", "Mars rover", () =>
  join(
    box(-3, -1, -2, 6, 2, 5),
    ...[-2, 0, 2].flatMap((x) => [
      box(x, 0, -3, 1, 3, 1),
      box(x, 0, 3, 1, 3, 1),
    ]),
    box(1, -5, 0, 1, 4, 1),
    box(0, -6, -1, 3, 1, 3),
    path([-3, 0, 0], [-5, 0, 0], [-5, 1, 0]),
  ),
);
add("telescope", "Space telescope", () =>
  join(
    box(-1, -2, -4, 3, 3, 8),
    box(-2, -3, -4, 5, 5, 1),
    box(-6, -1, -1, 5, 1, 3),
    box(2, -1, -1, 5, 1, 3),
    box(-6, -2, -2, 1, 3, 5),
    box(6, -2, -2, 1, 3, 5),
    box(0, 1, 0, 1, 3, 1),
  ),
);
add("station", "Orbital station", () =>
  join(
    box(-1, -1, -2, 3, 3, 5),
    box(-6, 0, 0, 5, 1, 1),
    box(2, 0, 0, 5, 1, 1),
    box(-7, -2, -2, 2, 5, 5),
    box(6, -2, -2, 2, 5, 5),
    box(0, -4, -1, 1, 3, 3),
    box(0, 2, 0, 1, 3, 1),
  ),
);
add("shuttle", "Space shuttle", () =>
  join(
    box(-1, -1, -4, 3, 3, 9),
    box(0, -1, -6, 1, 2, 2),
    box(-5, 0, 1, 4, 1, 4),
    box(2, 0, 1, 4, 1, 4),
    box(0, -4, 3, 1, 3, 2),
    box(-2, -1, 4, 1, 2, 2),
    box(2, -1, 4, 1, 2, 2),
  ),
);
add("ufo", "Flying saucer", () =>
  join(
    box(-4, 0, -4, 9, 1, 9),
    box(-3, -1, -3, 7, 1, 7),
    box(-1, -3, -1, 3, 2, 3),
    box(-2, 1, -2, 5, 1, 5),
    legs(-3, 1, -3, 7, 7, 2),
  ),
);
add("radio-dish", "Radio telescope", () =>
  join(
    box(-1, 0, -1, 3, 5, 3),
    box(-3, 4, -3, 7, 1, 7),
    ring(-4, -4, -1, 9, 5, 1),
    box(-3, -1, -2, 7, 1, 3),
    box(-2, -3, -2, 5, 2, 1),
    path([0, -1, -1], [0, -3, -5]),
  ),
);

add("submarine", "Submarine", () =>
  join(
    box(-4, -1, -1, 9, 3, 3),
    box(-3, 0, -2, 7, 1, 5),
    box(-1, -3, -1, 3, 2, 3),
    path([0, -3, 0], [0, -5, 0], [2, -5, 0]),
    box(5, 0, -3, 1, 1, 7),
    box(5, -2, 0, 1, 5, 1),
  ),
);
add("pirate-ship", "Pirate ship", () =>
  join(
    box(-4, 1, -2, 9, 2, 5),
    box(-3, 3, -1, 7, 1, 3),
    box(-5, 0, -2, 1, 2, 5),
    box(5, 0, -2, 1, 2, 5),
    box(0, -6, 0, 1, 7, 1),
    box(-3, -5, 0, 3, 4, 1),
    box(1, -4, 0, 3, 3, 1),
    box(-3, -3, 0, 7, 1, 1),
  ),
);
add("train", "Steam locomotive", () =>
  join(
    box(-4, -1, -1, 6, 3, 3),
    box(2, -3, -2, 3, 5, 5),
    box(1, -4, -2, 5, 1, 5),
    box(-3, -3, 0, 1, 2, 1),
    ...[-3, 0, 3].flatMap((x) => [
      box(x, 1, -2, 1, 3, 1),
      box(x, 1, 2, 1, 3, 1),
    ]),
  ),
);
add("helicopter", "Helicopter", () =>
  join(
    box(-2, -1, -1, 5, 3, 3),
    box(3, 0, 0, 5, 1, 1),
    box(7, -2, 0, 1, 3, 1),
    box(0, -3, 0, 1, 2, 1),
    box(-5, -3, 0, 11, 1, 1),
    box(0, -3, -5, 1, 1, 11),
    path([-1, 2, -1], [-1, 3, -2], [3, 3, -2]),
    path([-1, 2, 1], [-1, 3, 2], [3, 3, 2]),
  ),
);
add("biplane", "Biplane", () =>
  join(
    box(0, -1, -4, 1, 3, 9),
    box(-5, -2, -1, 11, 1, 3),
    box(-5, 2, -1, 11, 1, 3),
    box(-4, -1, 0, 1, 3, 1),
    box(4, -1, 0, 1, 3, 1),
    box(-2, 0, 3, 5, 1, 2),
    box(0, -2, 4, 1, 2, 1),
  ),
);
add("airship", "Airship", () =>
  join(
    box(-4, -2, -1, 9, 5, 3),
    box(-3, -1, -2, 7, 3, 5),
    box(-1, 3, -1, 3, 2, 3),
    box(4, -3, 0, 2, 7, 1),
    box(4, 0, -3, 2, 1, 7),
  ),
);
add("excavator", "Excavator", () =>
  join(
    box(-3, 1, -3, 7, 1, 2),
    box(-3, 1, 2, 7, 1, 2),
    box(-2, -1, -2, 5, 2, 5),
    box(-2, -4, -1, 3, 3, 3),
    path([2, -1, 0], [3, -4, 0], [6, -4, 0], [6, 0, 0]),
    box(5, 0, -1, 3, 2, 3),
  ),
);
add("balloon", "Hot-air balloon", () =>
  join(
    box(-2, -5, -2, 5, 5, 5),
    box(-1, -6, -1, 3, 1, 3),
    box(-1, 0, -1, 3, 1, 3),
    path([-1, 0, -1], [-1, 4, -1]),
    path([1, 0, 1], [1, 4, 1]),
    box(-1, 4, -1, 3, 2, 3),
  ),
);

add("castle", "Castle", () =>
  join(
    box(-3, 0, -3, 7, 3, 7),
    box(-3, -4, -3, 2, 4, 2),
    box(2, -4, -3, 2, 4, 2),
    box(-3, -4, 2, 2, 4, 2),
    box(2, -4, 2, 2, 4, 2),
    box(0, -5, 0, 1, 5, 1),
  ),
);
add("pagoda", "Pagoda", () =>
  join(
    box(-1, -5, -1, 3, 10, 3),
    box(-3, -3, -3, 7, 1, 7),
    box(-2, -6, -2, 5, 1, 5),
    box(-4, 1, -4, 9, 1, 9),
    box(-5, 4, -5, 11, 1, 11),
    box(0, -8, 0, 1, 2, 1),
  ),
);
add("windmill", "Windmill", () =>
  join(
    box(-1, -3, -1, 3, 8, 3),
    box(-2, 4, -2, 5, 1, 5),
    box(0, -2, -2, 1, 1, 1),
    path([-4, -6, -2], [4, 2, -2]),
    path([-4, 2, -2], [4, -6, -2]),
    box(-1, -5, -1, 3, 2, 3),
  ),
);
add("lighthouse", "Lighthouse", () =>
  join(
    box(-1, -5, -1, 3, 10, 3),
    box(-2, -6, -2, 5, 1, 5),
    box(-1, -8, -1, 3, 2, 3),
    box(0, -9, 0, 1, 1, 1),
    box(-3, 4, -3, 7, 1, 7),
  ),
);
add("ferris", "Ferris wheel", () =>
  join(
    ring(-4, -4, 0, 9, 9),
    path([-3, 7, -2], [0, 0, 0], [3, 7, 2]),
    path([-3, 7, 2], [0, 0, 0], [3, 7, -2]),
    box(-4, 0, 0, 9, 1, 1),
    box(0, -4, 0, 1, 9, 1),
    ...([-4, 0, 4] as number[]).flatMap((x) => [
      box(x, -5, -1, 1, 2, 3),
      box(x, 4, -1, 1, 2, 3),
    ]),
  ),
);
add("drawbridge", "Drawbridge", () =>
  join(
    box(-5, -3, -2, 2, 8, 5),
    box(4, -3, -2, 2, 8, 5),
    path([-4, 1, 0], [0, -2, 0], [4, 1, 0]),
    box(-3, 1, -1, 2, 1, 3),
    box(2, 1, -1, 2, 1, 3),
    path([-4, -2, -2], [0, -2, -2], [4, -2, -2]),
    box(0, -2, -2, 1, 1, 3),
  ),
);
add("canyon-bridge", "Canyon bridge", () =>
  join(
    box(-6, 0, -1, 13, 1, 3),
    box(-5, 1, -1, 2, 5, 3),
    box(4, 1, -1, 2, 5, 3),
    path([-6, -2, -1], [-3, -4, -1], [0, -2, -1], [3, -4, -1], [6, -2, -1]),
    box(-6, -2, -1, 1, 3, 1),
    box(0, -2, -1, 1, 3, 1),
    box(6, -2, -1, 1, 3, 1),
  ),
);
add("treehouse", "Treehouse", () =>
  join(
    box(0, -1, 0, 1, 8, 1),
    box(-3, -1, -2, 7, 1, 5),
    ring(-2, -5, -1, 5, 5, 3),
    box(-3, -6, -2, 7, 1, 5),
    box(-2, -7, -1, 5, 1, 3),
    box(-1, -8, 0, 3, 1, 1),
    path([3, -1, 1], [4, 5, 1]),
    path([4, -1, 1], [5, 5, 1]),
  ),
);

// A fixed, dispersed permutation gives 16 full days before any family returns.
const CALENDAR = [
  ["elephant", "rocket", "castle"],
  ["octopus", "biplane", "wizard-tower"],
  ["trex", "airship", "lighthouse"],
  ["pegasus", "rover", "drawbridge"],
  ["giraffe", "submarine", "ferris"],
  ["scorpion", "balloon", "pagoda"],
  ["gryphon", "telescope", "treehouse"],
  ["triceratops", "helicopter", "canyon-bridge"],
  ["whale", "mech", "lander"],
  ["moose", "pterodactyl", "crocodile"],
  ["dragon", "station", "windmill"],
  ["turtle", "radio-dish", "unicorn"],
  ["train", "stegosaurus", "ufo"],
  ["seahorse", "excavator", "hydra"],
  ["fox", "shuttle", "phoenix"],
  ["camel", "pirate-ship", "rabbit"],
];
export function volumeSet(day: number, random: () => number) {
  return Array.from({ length: 3 }, (_, slot) => {
    const id = CALENDAR[((day % 16) + 16) % 16][slot];
    const recipe = VOLUME_OBJECTS.find((recipe) => recipe.id === id)!;
    const base = recipe.make(random);
    // Alternate genuine thickness, not just material colors or camera rotation.
    const axis = Math.floor(random() * 3),
      extra = random() < 0.5;
    const points = extra
      ? join(
          base,
          base.map((p) => p.map((v, i) => v + (i === axis ? 1 : 0)) as Point3),
        )
      : join(base);
    return { id: `v2-${recipe.id}`, name: recipe.name, points };
  });
}
