# Pinpoise

A daily balancing game. Five objects, one attempt per object, a new seeded collection each day. Archive, Stats and Settings are retained. Poise Archery is a separate practice mode reached from home; its three targets update daily from positions 1, 3 and 5 of the normal collection, while the five-shape daily game remains the default.

## Develop

```sh
npm ci
npm run dev
npm test
npm run build
```

Development: http://127.0.0.1:5174. Build output: dist/. Tests: jsdom plus native canvas. Use a modern Node release supported by Vite 6; verified with Node 26.4.0.

### Responsive layout QA

The home, 2D, 3D, Archery, and results screens must remain usable without horizontal overflow under browser text scaling and split-screen resizing. A saved desktop home-layout preference yields to the single-column layout below 640px. On short landscape touch screens (at least 760px wide and at most 620px tall), Archery places its controls beside the range so the play area remains usable.

Before release, inspect representative phone portrait (320–430px), phone landscape (760–930px wide and no more than 620px tall), tablet portrait and landscape (768–1366px), and desktop (1280px and wider) viewports. Check each game mode at default and enlarged browser text, including home navigation, canvas interaction, controls, result screens, and rotation or split-screen transitions.

### Daily shape editions: November 2, 2026 rollout

Generator versions are date-bound in `src/store.ts` and `src/gen.ts`. Preserve released recipes:

- October 21–22, 2026: original v1 recipes; October 23: `p2`.
- October 24–26: `p4`, using contours from the frozen 6,000-form `src/forms-v4.ts` catalogue through `src/unique.ts`.
- October 27–November 1: `p6`, using the earlier recognizable object families and the `materialsV5` density progression. `p5` remains a supported generator branch, but is not the dated daily version selected by the store.
- From November 2: `p7`, using 80 new authored families from `src/catalog-v7.ts`. Animals, dinosaurs, mythical creatures, space objects and vehicles fill the first four rotating categories; 16 multi-subject story silhouettes replace the fifth category. The first November 2 set therefore ends with Sky whale and airship: Camel, Orca, Dragon, Racecar, and Sky whale and airship.

The new 2D edition schedules five families per day without a family repeat inside any rolling 16-day window. Seeded width and height proportions produce geometry variants as well as material changes. Families return beyond that window; there is no lifetime-unique archetype guarantee. Material densities, the wide-to-medium-to-close density difficulty progression, scoring, and one scored attempt per shape remain unchanged.

Every 2D shape also shows a striped 0.0-density mesh across its gaps. The mesh is a valid pinning surface but contributes no mass, so balance points that fall between weighted pieces are visually understandable without changing the center-of-mass calculation.

Poise Archery uses its own deterministic daily set of three recognizable silhouettes. It filters out every shape name in that date’s normal five and gives every visible target part the same wood density, so the normal puzzle cannot reveal an Archery answer and Archery stays focused on aim, wind, distance, and power. Copied Archery results include the score breakdown, a challenge line, and a link to `https://poisedaily.com/`.

`p7` retains the dated `v4-…` IDs allocated by `src/unique.ts`, and the existing schedule still ends on February 4, 2030 inclusive. The IDs are stable date allocations, not a promise that future shapes retain the old v4 contours. The app keeps Archive, Stats and Settings available at the schedule boundary and asks for a new edition. Archive review and the unscored home demonstration remain repeatable.

`src/forms-v4.ts` remains immutable historical data; `scripts/build-catalogue.mjs` documents its construction. Its connected cell arrangements and generated contours have their own independent geometry and mask uniqueness checks. These checks do not establish lifetime geometry uniqueness for `p6` or `p7`. Future editions must use a date boundary, preserve published recipes and IDs, and validate against earlier published geometry. Store validates saved results against their dated recipe.

### Pinpoise 3D volume edition

From November 2, 2026, `src/mode3d.ts` uses the 48 authored families in `src/catalog3d-v2.ts`. A curated 16-day rotation presents three per day, with no family repeat within any rolling 16-day window. The first set is Elephant, Rocket, and Castle. Families recur after the rotation; seeded variants change actual thickness, and spatial material zones give different regions different densities. These are face-connected volumes with depth along all three axes, rather than recolored flat shapes. Material densities, difficulty progression, scoring, and one scored attempt per object remain unchanged. All dated 3D sets before November 2 keep the previous generator.

### Rollout validation

Run `POISE_TEST_SCOPE=diversity npm test` for the four diversity checks in `tests/run.mjs`. They cover:

- The first 12 pre-edition dates, October 21–November 1: all dated recipes, 60 shapes' geometry and rendered mass calculations, and complete dated 3D sets match `tests/fixtures/before-v7.json`, captured independently from the previously built app. Do not regenerate this baseline from the new implementation.
- Independent material-free mask uniqueness for all 80 authored 2D silhouettes under quarter-turn rotations and reflection, plus normalized geometry uniqueness and base voxel connectivity for all 48 3D families under axis permutations, reflection, and translation.
- Deterministic generation and rolling 16-day family separation across 64 new daily sets.
- Preserved 2D density progression, finite mass properties, and face connectivity, distinct voxels, multiple materials, and genuine three-axis volume for all 192 tested 3D objects.

The diversity checks also write preview images to `.taste-skill/qa/`.

Scores, streaks and settings remain browser-local, so playing never requires an account. Production also submits one anonymous result per browser and puzzle to a Cloudflare D1 database. The result screen currently uses a strict fixed reference curve while real scores accumulate in the background. Live percentiles can be enabled later without losing the collected data.

### Cloudflare score database

The Pages project root must be `Source`, with `npm run build` as the build command and `dist` as the output directory.

1. In Cloudflare, create a D1 database named `pinpoise-scores`.
2. Open its Console and run `migrations/0001_scores.sql`, then `migrations/0002_account_saves.sql`.
3. Open the Pinpoise Pages project, then go to Settings, Bindings and add a D1 binding.
4. Use `SCORES` as the variable name and select `pinpoise-scores`.
5. Redeploy the site so the Function receives the binding.

The ranking API stores a one-way hash of a random per-browser identifier. It does not store names, email addresses or IP addresses.

### Optional account syncing

Pinpoise uses Supabase Auth for Google and email/password sign-in, plus the same D1 binding for account saves. Anonymous play remains the default.

1. Create a Supabase project.
2. Under Authentication, URL Configuration, set the Site URL to `https://poisedaily.com` and add `https://poisedaily.com` to Redirect URLs. Keep the Email provider enabled for password accounts.
3. Copy the Project URL and Publishable key from the Supabase project settings. The URL must be the project root, such as `https://example.supabase.co`, with no `/rest/v1` suffix.
4. In Cloudflare Pages, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Settings, Variables and Secrets. These values are public client configuration, not secret service keys.
5. Redeploy Pinpoise.

Signed-in players sync completed puzzles, in-progress rounds and streak data. The server verifies every Supabase access token before reading or writing the account's D1 save. Email addresses remain with Supabase and are not stored in D1.

Google sign-in also requires the Google provider in Supabase. Its authorized JavaScript origin is `https://poisedaily.com`, and its Google OAuth redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.

Set VITE_SITE_URL for public canonical/Open Graph URLs before deploying to HTTPS. Copy captures the displayed results sheet as a PNG and writes it directly to the clipboard; image clipboard support varies by browser.

Design rationale and Taste Skill direction: .taste-skill/inventory.md and direction.json. Automated outcomes: .taste-skill/qa/tests.json. Browser inspection must supplement the simulated DOM tests.
