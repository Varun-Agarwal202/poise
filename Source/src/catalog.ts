import type { Part, Rand } from "./gen";

type Family = (
  r: Rand,
  between: (a: number, b: number) => number,
  material: (i: number) => string,
) => Part[];
const oval = (m: string, x: number, y: number, w: number, h: number): Part => [
  m,
  "b",
  ...Array.from({ length: 32 }, (_, i) => [
    x + Math.cos((i * Math.PI) / 16) * w,
    y + Math.sin((i * Math.PI) / 16) * h,
  ]).flat(),
];

/** Authored silhouettes. Small dimensional variations retain the identity of each object. */
export const OBJECTS: Record<string, { name: string; make: Family }> = {
  scissors: {
    name: "Scissors",
    make: (_r, rr, m) => {
      const w = rr(0.09, 0.13);
      return [
        [m(0), "p", -0.06, 0.1, -0.27, -0.44, -0.08, -0.28, 0.08, 0.12],
        [m(0), "p", -0.08, 0.12, 0.18, -0.42, 0.23, -0.23, 0.06, 0.17],
        oval(m(1), -0.12, 0.29, w, 0.15),
        oval("X", -0.12, 0.29, w * 0.52, 0.09),
        oval(m(1), 0.14, 0.29, w, 0.15),
        oval("X", 0.14, 0.29, w * 0.52, 0.09),
        [m(2), "c", 0, 0.08, 0.045],
      ];
    },
  },
  kettle: {
    name: "Tea kettle",
    make: (_r, rr, m) => {
      const w = rr(0.22, 0.28);
      return [
        oval(m(1), 0.25, 0.02, 0.17, 0.2),
        oval("X", 0.25, 0.02, 0.11, 0.14),
        [
          m(0),
          "p",
          -0.15,
          0.2,
          -0.4,
          -0.17,
          -0.46,
          -0.18,
          -0.39,
          -0.24,
          -0.22,
          -0.12,
          -0.06,
          0.02,
        ],
        oval(m(0), 0, 0.07, w, 0.25),
        [m(1), "r", -0.16, -0.2, 0.32, 0.045],
        [m(2), "c", 0, -0.24, 0.05],
      ];
    },
  },
  watering: {
    name: "Watering can",
    make: (_r, rr, m) => {
      const h = rr(0.28, 0.38);
      return [
        oval(m(1), 0.23, -0.02, 0.2, 0.23),
        oval("X", 0.23, -0.02, 0.14, 0.16),
        [m(0), "p", -0.2, 0.08, -0.42, -0.28, -0.47, -0.26, -0.3, 0.22],
        [m(1), "p", -0.52, -0.32, -0.4, -0.36, -0.38, -0.24, -0.48, -0.2],
        [m(0), "p", -0.22, -0.16, 0.2, -0.16, 0.24, h, -0.22, h],
        [m(2), "r", -0.24, -0.18, 0.46, 0.04],
      ];
    },
  },
  umbrella: {
    name: "Umbrella",
    make: (_r, rr, m) => {
      const w = rr(0.32, 0.43);
      return [
        [m(1), "r", -0.02, -0.3, 0.04, 0.64],
        oval(m(1), -0.07, 0.34, 0.09, 0.09),
        oval("X", -0.07, 0.32, 0.05, 0.07),
        [
          m(0),
          "b",
          -w,
          -0.04,
          -w * 0.7,
          -0.33,
          0,
          -0.48,
          w * 0.7,
          -0.33,
          w,
          -0.04,
          w * 0.5,
          -0.13,
          0,
          -0.04,
          -w * 0.5,
          -0.13,
        ],
      ];
    },
  },
  sailboat: {
    name: "Sailboat",
    make: (_r, rr, m) => {
      const w = rr(0.3, 0.4);
      return [
        [m(0), "p", -w, 0.18, w, 0.18, w * 0.6, 0.34, -w * 0.65, 0.34],
        [m(1), "r", -0.025, -0.42, 0.04, 0.62],
        [m(2), "p", -0.06, -0.4, -0.06, 0.12, -w, 0.12],
        [m(2), "p", 0.04, -0.33, 0.04, 0.12, w * 0.75, 0.12],
      ];
    },
  },
  bird: {
    name: "Songbird",
    make: (_r, rr, m) => [
      [m(0), "p", -0.15, 0.13, -0.47, -0.1, -0.4, 0.2, -0.12, 0.24],
      oval(m(0), 0, 0.07, 0.27, rr(0.17, 0.22)),
      [m(0), "c", 0.19, -0.12, 0.14],
      [m(1), "p", 0.29, -0.16, 0.44, -0.1, 0.3, -0.06],
      oval(m(1), -0.06, 0.04, 0.15, 0.085),
      [m(2), "c", 0.23, -0.15, 0.02],
    ],
  },
  fish: {
    name: "Fish",
    make: (_r, rr, m) => [
      [m(1), "p", -0.2, 0, -0.47, -0.21, -0.42, 0, -0.47, 0.21],
      [m(1), "p", -0.12, -0.1, 0.03, -0.32, 0.14, -0.12],
      oval(m(0), 0.02, 0, rr(0.27, 0.33), 0.19),
      [m(2), "c", 0.22, -0.045, 0.025],
    ],
  },
  leaf: {
    name: "Leaf",
    make: (_r, rr, m) => [
      [m(0), "r", -0.018, 0.1, 0.036, 0.36],
      [
        m(1),
        "b",
        0,
        -0.46,
        rr(0.2, 0.3),
        -0.18,
        0.28,
        0.1,
        0,
        0.3,
        -0.23,
        0.1,
        -0.2,
        -0.18,
      ],
      [m(0), "p", -0.012, 0.26, -0.006, -0.36, 0.014, 0.23],
    ],
  },
  boot: {
    name: "Boot",
    make: (_r, rr, m) => {
      const toe = rr(0.3, 0.43);
      return [
        [
          m(0),
          "p",
          -0.25,
          -0.4,
          0.05,
          -0.4,
          0.03,
          0.12,
          toe,
          0.2,
          toe,
          0.36,
          -0.27,
          0.36,
        ],
        [m(1), "r", -0.28, 0.34, toe + 0.29, 0.06],
        [m(2), "r", -0.27, -0.41, 0.34, 0.075],
        [m(2), "r", -0.02, -0.25, 0.065, 0.035],
        [m(2), "r", -0.025, -0.13, 0.065, 0.035],
        [m(2), "r", -0.03, -0.01, 0.065, 0.035],
      ];
    },
  },
  guitar: {
    name: "Guitar",
    make: (_r, rr, m) => [
      oval(m(0), 0, 0.22, rr(0.2, 0.24), 0.2),
      oval(m(0), 0, -0.01, 0.15, 0.15),
      [m(1), "r", -0.035, -0.44, 0.07, 0.42],
      [m(1), "r", -0.055, -0.55, 0.11, 0.14],
      ["X", "c", 0, 0.07, 0.055],
      [m(2), "r", -0.09, 0.27, 0.18, 0.035],
    ],
  },
  lock: {
    name: "Padlock",
    make: (_r, rr, m) => {
      const w = rr(0.16, 0.22);
      return [
        oval(m(1), 0, -0.18, w, 0.25),
        oval("X", 0, -0.18, w - 0.055, 0.19),
        [m(0), "r", -0.26, -0.12, 0.52, 0.46],
        ["X", "c", 0, 0.08, 0.05],
        ["X", "p", -0.025, 0.1, 0.025, 0.1, 0.04, 0.21, -0.04, 0.21],
      ];
    },
  },
  rook: {
    name: "Chess rook",
    make: (_r, rr, m) => {
      const w = rr(0.16, 0.23);
      return [
        [m(0), "p", -w, -0.3, w, -0.3, 0.12, 0.28, -0.12, 0.28],
        [m(1), "r", -0.28, 0.27, 0.56, 0.09],
        [m(1), "r", -0.24, -0.42, 0.48, 0.16],
        ["X", "r", -0.15, -0.43, 0.08, 0.09],
        ["X", "r", 0.07, -0.43, 0.08, 0.09],
      ];
    },
  },
  lamp: {
    name: "Desk lamp",
    make: (_r, rr, m) => {
      const reach = rr(0.22, 0.34);
      return [
        oval(m(1), -0.12, 0.35, 0.24, 0.045),
        [m(1), "p", -0.14, 0.35, -0.18, 0.33, -0.02, -0.11, 0.02, -0.09],
        [
          m(1),
          "p",
          -0.02,
          -0.11,
          reach,
          -0.31,
          reach + 0.025,
          -0.27,
          0.02,
          -0.07,
        ],
        [
          m(0),
          "p",
          reach - 0.08,
          -0.36,
          reach + 0.04,
          -0.36,
          reach + 0.2,
          -0.14,
          reach - 0.2,
          -0.14,
        ],
        [m(2), "c", 0, -0.09, 0.045],
      ];
    },
  },
  trowel: {
    name: "Garden trowel",
    make: (_r, rr, m) => [
      [m(1), "r", -0.025, -0.1, 0.05, 0.44],
      oval(m(0), 0, 0.34, 0.07, 0.13),
      [
        m(2),
        "p",
        -0.16,
        -0.14,
        -0.12,
        -0.34,
        0,
        -rr(0.45, 0.55),
        0.12,
        -0.34,
        0.16,
        -0.14,
        0.08,
        -0.03,
        -0.08,
        -0.03,
      ],
    ],
  },
};

// Disjoint groups guarantee five different object families. The ordering alternates
// outline, hollow space, asymmetry, assemblies and mixed-material reasoning.
export const COLLECTIONS = [
  ["spoon", "boot", "leaf", "trowel", "bone", "hammer", "dumb"],
  ["lock", "scissors", "kettle", "watering", "magnet", "ring", "wrench"],
  ["bird", "fish", "sailboat", "umbrella", "arrow", "chev", "moon"],
  ["guitar", "lamp", "rook", "anchor", "mush", "prop", "tree"],
  ["gear", "star", "poly", "chain", "mol", "lump", "weld"],
];
