# Pinpoise style lock

## North star

Pinpoise should feel like a quiet, self-explanatory daily balancing game.

## Visual system

- Type: Bricolage Grotesque only. Large compressed display title, compact labels, tabular numerals.
- Shapes: 8 to 10 px control corners, 4 px sheets and dialogs, circular marks only when they represent pins or points.
- Surfaces: cool neutral background, quiet panels, and thin rules instead of stacked cards.
- Motion: short 180 to 320 ms interface settling. Wobble is distance-driven, speed-bounded, and limited to one soft overshoot.
- Iconography: existing single-line icon family inside one shared tool rail.

## Palette

Restored from the original palette after the warm direction was rejected.

### Light

- Text `#171a21`
- Background `#eceef2`
- Surface `#ffffff`
- Primary `#171a21`
- Border `#cdd2db`
- On primary `#ffffff`

### Dark

- Text `#f1f3f7`
- Background `#16181d`
- Surface `#1f2229`
- Primary `#f1f3f7`
- Border `#323743`
- On primary `#16181d`

## Legal contrast pairings

- Light text-safe: text on background or surface, white on primary, muted text on background or surface.
- Light UI-safe: muted color against the border.
- Dark text-safe: text on background or surface, dark background on the light primary, muted text on background or surface.
- Borders are decorative only and never carry state alone.

## Signature details

- Brand: Pinpoise is the trial name across the game, search metadata, installed-app labels, and shared results. The current domain remains poisedaily.com during the trial.
- Logo: the existing tilted balance bar and pin mark. Search favicon uses a stable 96px PNG export of the same artwork.
- Neutral player pin and balance target.
- A plain framed play area keeps attention on the object.
- Daily set strip and results sheet use rules and numbering like a printed test record.
- Mixed-material objects use a framed, material-colored density scale with relative multipliers so weight differences are obvious before the player aims.
- Main actions use squared instrument controls, not generic pill buttons.

## Guardrails

- No gradients, glass effects, floating cards, decorative blobs, or emoji icons.
- No em dashes in shipped copy.
- No decorative process labels or interface copy that explains the visual treatment.
- Result language should report a useful number, not offer vague encouragement.
- Do not expose generated-sounding daily modifier names.
- Do not add motion that competes with the wobble physics.
- Keep the object canvas visually dominant.
