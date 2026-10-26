# Pinpoise

## Play on your Mac

1. Extract the ZIP.
2. Double-click Launch Poise.command.
3. Open http://127.0.0.1:5173/ if the browser does not open automatically.

Keep the Terminal window open while playing. Control-C stops the app. If double-clicking does not work, open Terminal, type `/bin/zsh `, drag Launch Poise.command into the window, and press Return. Python 3 is required; it is already installed on the Mac this package was prepared for.

Keep App, serve_poise.py and Launch Poise.command together. Do not open App/index.html directly. Existing browser progress is retained at the same address. The ZIP does not include your browser’s saved scores.

On the results screen, press Copy to copy the image, then paste it into another app. No save/download/share dialog is involved.

Settings → Home layout lets you choose Auto, Phone or Desktop. Auto uses a side-by-side home page at 640px and above, and a stacked page below that. Your choice stays on this browser/device.

Daily puzzles use 6,000 distinct silhouettes from October 24, 2026 through February 4, 2030: five per day for 1,200 days. Rotations, reflections, scaling and color changes do not count as new shapes. Historical puzzles stay intact. The schedule never wraps.

## Edit the app

Source contains the editable TypeScript app and regression tests. In Terminal, change into Source and run:

    npm ci
    npm run dev

Development runs at http://127.0.0.1:5174/. To check and build:

    npm test
    npm run build

The current production build is in App. The latest checks and implementation notes are Source/TEST-RESULTS.json and Source/UPDATE-NOTES.md.
