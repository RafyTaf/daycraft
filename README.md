# DayCraft

A clean daily habit tracker. Four time blocks, a short stack of lines. Finish them all and today becomes a link in the chain. Extra credit drops coins into a treat jar.

The app itself is the reminder — beat it daily. Don't miss twice.

Open it in Safari on iPhone, tap Share, then "Add to Home Screen". (Live publish of this rebuild is waiting on a go — the current live site is still the previous DayCraft.)

Your logs are saved only on your device (localStorage). Nothing is sent anywhere. Older Should / Could logs stay on the phone under a separate key and are not touched.

Development: `npm install`, `npm run dev`; `npm run build` builds to `dist/`, which is copied to `docs/` for GitHub Pages (base `/daycraft/`).
