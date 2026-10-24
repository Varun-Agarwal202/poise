# Poise — original identity, refined

This version applies the attached Impeccable skill as a refinement of the uploaded game. It supersedes the previous visual redesign.

## Non-repeating daily catalogue

From **October 24, 2026 through February 4, 2030**, the game has **6,000 distinct silhouettes across 1,200 daily sets**. Three years including leap day needs 5,480, leaving 520 additional shapes. The first 15 historical objects are unchanged.

The previous recurring family bags are replaced for future dates by a frozen catalogue of connected forms with angular, chamfered and curved outlines. The builder rejects duplicate cell arrangements even after reflection or rotation. Materials are clipped inside the shape; recoloring or adding a heavy inlay cannot count as a new silhouette. There is no random cutout mutation or wraparound in the new schedule.

The production build and all **16 regression checks passed**. A date-pinned browser preview also confirmed that the new first daily shape renders with the existing controls, material legend and center-of-mass instructions; reloading the live app retained the current completed result.

Verification compares every final contour independent of translation, arbitrary rotation, reflection and uniform scale, then independently compares rendered masks (including the historical objects). It also exercises all 1,200 dates, leap day, deterministic reconstruction, valid mass calculations and the end of the catalogue. Similar-looking forms can exist: this guarantees unique geometry, not 6,000 unrelated everyday object categories. The home teaching demonstration and reviewing old results can repeat; scored daily shapes cannot.

The catalogue and generation recipe are shipped with the source. They work offline and require no AI service, API key or daily content job. A later edition can extend the schedule, but must preserve all released recipes and check against the earlier catalogue. On exhaustion, the game retains navigation and archive access rather than recycling shapes.

## Responsive home update

The homepage now has its own responsive layout instead of inheriting the game’s 960px mobile breakpoint and 560px width cap. Auto uses a two-column composition at 640px and wider: full-width header, title and daily action on the left, a larger animated object on the right. Narrow screens stack the content. The shape demonstration restarts cleanly when its layout changes.

Settings → Home layout provides Auto, Phone and Desktop choices, stored per browser. Phone can be selected on a computer; Desktop can be selected on a phone, where the daily action spans both columns to keep it usable. The choice applies immediately and does not affect gameplay, scores or result copying.

Browser-checked at a 662px laptop panel, 1440px desktop, and 390px phone, including larger text, manual Desktop on a phone and persistence after reload. The existing 15 regression checks and production build passed.

## Copy-only results update

The results page now contains one Poise heading, the score, five object results, a compact pin legend and one **Copy** action. Repeated completion text and the extra statistics strip are removed; history and statistics remain in the navigation.

Copy writes the results PNG straight to the clipboard, then briefly changes to **Copied**. There is no share modal, duplicate preview, Save, Download or native Share action. The copied image omits navigation and buttons. Clipboard writing begins during the click using a promised PNG to preserve browser user activation. In-flight clicks are locked, and failed rendering or clipboard access recovers inline with the same Copy action.

The browser completed a real image-copy operation and displayed Copied. The automated harness also covered PNG-only writes, immediate user activation, duplicate-click lockout, image-capture failures, denied clipboard permission and unsupported browsers. Native pasting into another application was not verified.

## UI

- Restored the large Poise title, Bricolage Grotesque type, original charcoal and pale-gray backgrounds, bold rounded action buttons, and large floating object beside a compact left column.
- Home, Archive, Stats and Settings use the original style of simple line icons, with accessible names, tooltips and 44px targets.
- Removed repeated promotional copy and emoji decoration. The daily collection has one main action; practice remains removed.
- Kept the dated archive, preferences, result history and result-image copying. Future daily shapes use the frozen catalogue; older family generators remain for historical puzzles.
- The center-of-mass rule is visible on mobile and desktop. It explicitly allows a point in a hole or gap.

## Physics and feedback

The previous simulation added a spring that pulled the object toward its starting angle and injected a random initial tilt. Both are removed. The new simulation uses gravity around the pin, the object's mass distribution, the parallel-axis moment of inertia, and viscous damping. Fixed simulation steps make it deterministic across display frame rates.

A pin directly above the center of mass can be off target yet produce no rotation. A pin the same distance to the side produces torque and swings. These should receive the same accuracy score: the score measures distance to the center of mass, not rotation. The game now states this and reports the measured rotation. Exact-center pins stay still. An exactly inverted, unperturbed equilibrium also remains still in the idealized simulation; no fake random kick is applied.

After the swing, the object returns briefly to its original pose for an accuracy diagram: the pin, target ring and connecting error line. Reduced motion skips the swing and return animation. The reveal says motion is off rather than describing an animation that did not happen. Grade labels now describe aim instead of asserting that the object was level or tilted.

The governing physical-pendulum relationship is consistent with [OpenStax, Pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums). The short seating ease, damping and maximum 4-second presentation are game choices, not a frictionless laboratory model.

## Touch and reliability

- Taps and pen placements use their actual coordinates.
- Dragging more than 8px shows a separate magnifier; it never shifts the saved pin or exposes the answer.
- Pointer release does not submit. Drop pin locks immediately and accepts one result per round.
- Existing validated-save recovery, five-round completion guard, reload resume, and older-date streak protection were retained and regression-tested.
- Earlier puzzle geometry is unchanged. Scoring was retuned before launch (see Pre-launch tuning); no results had been published at that point.

## Pre-launch tuning

- **Scoring** (`scoreOf2` in `src/gen.ts`) is one curve for every puzzle: 100 within 0.2 cm, then `100·exp(-((cm-0.2)/4.2)^1.3)`. Examples: 1 cm→89, 2→72, 3→55, 4→42, 6→22, 8→11.
- **Pin box:** the pin can only be placed inside the object's box. Presses outside it (for example a near-miss on Drop pin) are ignored, and dragging or arrow keys clamp to its edge.
- **Wobble** (`src/physics.ts`): lighter damping (0.32) for visible overshoot, 1.25x time scale, a minimum swing frequency, and a grip rule. How far the object tips scales with the miss (`tilt()`): a pin scoring 100 holds still, 0.5 cm tips about 5°, 2 cm about 41°, wide misses swing about 90°.

## Verification

`npm run build` passed TypeScript and production compilation. `npm test` covers all 15 historic objects, 1,200 generated sets (6,000 silhouettes), exact-center and equal-distance physics, symmetry, frame-rate independence, duplicate submissions, reduced motion, resume, five-round results, daily-only navigation, archive streak isolation, invalid-save recovery, touch magnification and resize stability.

Browser checks included 1440px desktop and 390px mobile viewports, light/dark themes, larger text, the live five-object flow, the error-line reveal, and direct results-image copying. The final public build was checked on port 5173. No public upload or message was sent.

Limitations: actual touch hardware and Safari/iPhone native file-sharing were not tested. Touch behavior was exercised through the event regression harness; browser screenshots used desktop input. Scores remain local to a browser/device and daily limits are not server-enforced anti-cheat. A public deployment still needs its own URL, hosting and deployment configuration.

## Open it

Open http://127.0.0.1:5173/ and refresh an existing tab. Later, double-click Launch Poise.command. Use the same browser and address to keep your saved progress. The editable source is Poise-updated-source.zip.
