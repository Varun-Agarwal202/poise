# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who enjoy short daily puzzles on phones and computers. They want a challenge they can understand quickly, finish in a few minutes, and compare with friends.

## Product Purpose

Pinpoise is a daily physics game about locating the center of mass. The main game presents five flat mixed-material shapes with one scored attempt each. Pinpoise 3D is a separate daily mode with three volume-based objects that can be rotated before placing a surface pin.

## Positioning

The puzzle is solved by reading an object's geometry and material density rather than recalling trivia or guessing a word. The result is demonstrated through physical motion around the chosen pin.

## Operating Context

The game is free, browser-based, account-optional, and designed for quick daily play. A challenge is shared by everyone on the same date. Touch placement, pointer dragging, and keyboard operation are supported.

## Capabilities and Constraints

- The original two-dimensional daily game remains the default and must not be replaced by the 3D mode.
- Daily puzzles are deterministic so every player receives the same set.
- The November 3, 2026 edition uses `p7` for the normal five-shape daily game, drawing from 80 new recognizable authored families in `Source/src/catalog-v7.ts`: animals, dinosaurs, mythical creatures, space objects, vehicles, and wonders. The fifth daily category is replaced by a dedicated set of 16 story silhouettes that stage familiar subjects together—such as a kraken attacking a ship, a dragon at a castle, or an astronaut on the moon—so every daily set ends with an encounter rather than another isolated noun. No family repeats within any 16-day window of the new edition. Seeded proportions vary the geometry as well as the material layout; families can return after the window, so archetypes are not lifetime-unique. The first November 3 set is Camel, Orca, Dragon, Racecar, and Sky whale and airship.
- Pinpoise 3D switches on November 3, 2026 to 48 authored volume families in `Source/src/catalog3d-v2.ts`, with a curated 16-day rotation of three objects per day and no family repeats within that window. Objects are connected three-dimensional volumes with spatial material zones and seeded thickness variants, beyond recoloring. The first set is Elephant, Rocket, and Castle. Earlier dated 3D sets remain frozen.
- Released daily recipes remain date-bound: `p4` for October 24–26, 2026 and `p6` for October 27–November 2, alongside the original October 21–23 recipes. The first 13 days are archive-validated. `p7` retains the dated `v4-…` IDs and the existing final date of February 4, 2030; those IDs do not imply that future geometry still follows the older catalogue. The new edition preserves material densities, difficulty progression, scoring, and the number of attempts in both daily modes.
- Each original shape allows one scored attempt. Pinpoise 3D also allows one scored attempt per object.
- Poise Archery is a separate practice mode reached from home, set on a first-person outdoor range with three shape targets and three shots per target aimed at the balance point. Its targets change each day: it reuses positions 1, 3, and 5 from that date’s normal five-shape collection, including the fifth-slot story silhouette in the November 3 edition. On each target, shots progress through distances of 12, 18, and 24 meters with stronger wind of 2–4, 5–7, and 8–10 m/s respectively. Distance affects both camera perspective (farther targets appear smaller) and physical flight time, wind drift, and gravity drop; camera zoom does not change where the pin lands. The interface and range scene inherit the existing neutral site theme tokens and Bricolage Grotesque typography, with no separate landscape palette. A clearly visible wind readout above the target board shows speed and direction while aiming and choosing power, alongside animated wind cues, and shots use a compact pin instead of a long shaft. Drag to aim and release to lock aim, then time the animated in-scene power dial as it repeatedly sweeps from 35% to 100% in two seconds and back in two seconds, with the bow draw moving to match; the power slider is removed, and releasing does not fire. Tap the range, activate the dial’s Shoot now button, or press Space to fire using the current strength. Pause meter and Resume meter control the sweep; after locking aim, arrow keys pause it and adjust power in 5 percentage-point steps for precise control. Reduced motion starts the dial stationary at 70%. Stronger draws reduce wind drift and gravity drop. For keyboard play, use arrow keys to aim and Enter to lock aim, then time the shot with Space or use the arrow keys to set power precisely before firing. Each impact zooms in for review; dragging directly on the range from review automatically continues to aiming the next shot or target while shots remain. Reveal each target’s balance point only after all three shots on that target, with no distance-to-balance or directional balance hints beforehand. A separate final recap shows all three targets with shot positions, balance points, per-shot points, target totals, and the overall score, with Copy score and Play again actions. The existing daily game remains the default.
- Materials have distinct densities and the center-of-mass calculation must include shape geometry, holes, transformations, and density.
- The site is a Vite and TypeScript application deployed as a static Cloudflare Pages site, with optional Supabase authentication and Cloudflare functions.
- The game must remain practical on phone-sized screens and modest hardware.
- Famous copyrighted characters are not part of the generated catalogue. Original recognizable archetypes are allowed.

## Brand Commitments

- Product name: Pinpoise.
- Domain during the current trial: poisedaily.com.
- Voice: concise, direct, and playful without overexplaining.
- Preserve the existing Pinpoise mark, neutral palette, Bricolage Grotesque typography, and instrument-like controls.

## Evidence on Hand

The repository contains the working game, generated puzzle catalogue, physics and scoring tests, share output, authentication, analytics, favicon, and search metadata. Player feedback quoted in the project conversation is qualitative and must not be turned into fabricated usage metrics.

## Product Principles

- The puzzle itself is the priority. New features must deepen the balancing problem.
- Hard is good; arbitrary or impossible is not.
- Motion should explain the result of a pin placement.
- Material density must be visually legible before a player commits.
- Original character and object forms should feel recognizable without borrowing protected designs.

## Accessibility & Inclusion

Support keyboard input, visible focus states, reduced motion, high contrast, larger text, colour-blind-friendly scoring, and touch targets of at least 44 pixels.
