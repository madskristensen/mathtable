# Kids Learning Hub

[![GitHub Pages](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment)

A fast offline-friendly PWA that now acts as a hub for multiple kids learning games.

🌐 **Play now:** [mathtable.fun](https://mathtable.fun)

## Games

- **Math:** Addition, Subtraction, Multiplication, and Division, with practice and mastery maps.
- **Time:** Tell Time (Analog Clock) and Time Math.
- **Reading:** Word Reading and Flash Word.
- **Geography:** Find the State (US) and Find the Country (Europe), with regional practice and map views.
- **History:** World History, US History, and Mythology.

## Shared Features

- 🧩 Home hub with one card per game
- 🕹️ Per-game sub-game/menu framework
- 🔥 Shared daily streak and best streak tracking
- 🏅 Shared per-game high scores
- 🐾 Emoji animal picker used across all games
- 🎨 Shared theme and UI components
- 📱 Installable PWA with offline support
- Compact subject navigation that scrolls to each group without hiding games, a grid/carousel layout toggle, and a continue-playing shortcut
- Visual explanations for arithmetic and clocks, worked time calculations, and reading/geography/history learning notes
- Untimed mistakes pause for learning; Practice and review pause after every answer. Timed Challenges keep moving.
- **Practice my tricky ones** in game menus and results, plus spaced review every fourth untimed question
- Starter, Growing, and Explorer levels; two completed untimed sessions with at least 10 answers and 80% accuracy recommend the next level
- **My Skills** views and mastery counts on home cards. Mastery requires at least three correct answers and 80% accuracy over the last five attempts (or all attempts when fewer than five).
- A Learning Passport with game stamps and improvement badges. Exploring three subjects unlocks a unicorn mascot; lessons are never locked.

The Passport is opened from the home stats bar using a booklet icon and arrow. Game cards have subject-colored illustration panels; carousels align with the subject menu on both phones and wider screens. **Grid view** shows every game in grouped rows rather than a horizontal carousel; the subjects navigate within either layout. The layout toggle is hidden on phone-sized screens (600px and below).

All new learning data stays on this device alongside existing scores and streaks. Missed skills stay in the review list until answered correctly three times in a row. Review sessions do not enter high-score tables or advance difficulty recommendations.

## Tech Stack

- Vanilla HTML / CSS / JavaScript modules (no build step)
- Native system fonts (no external font requests; typography works offline)
- Dynamic module loading for game code
- Service Worker for offline caching
- localStorage for shared progress
- Hosted on GitHub Pages

### Offline releases and performance

- Each release has a versioned precache. Shell dependencies, lazy game modules, shared imports, map data, and icons use matching release URLs. Cached release assets are served without background network revalidation.
- Installation requires every asset to fetch successfully with the expected content type and every cache write to succeed. An incomplete release is discarded; the previous worker/cache remains usable. Updates activate only after **Reload** is confirmed in the update banner.
- **Ready to play offline** appears only after the controlling worker verifies the required cache entries. This is a point-in-time check: browsers can later evict storage. Uncached offline requests receive an explicit 503 fallback, not an undefined response.
- Incidental same-origin resources within the app scope use a bounded runtime cache. Background writes and trimming extend the service worker event lifetime; cleanup leaves other applications' caches alone.
- Progress is parsed once per tab, invalidated by another tab's storage changes, and legacy arithmetic plus learning results are saved together once per answer. Home cards reuse mastery/high-score summaries. Cross-tab saves remain last-writer-wins; this is not a transactional multi-tab database.
- Celebrations reuse one cancellable canvas/animation loop and skip or stop immediately when reduced motion is requested.

## Project Structure

```
docs/
  index.html              App shell
  style.css               Shared styles/theme
  app.js                  Shared hub framework/state
  learning.js             Mastery, review, difficulty progress, and passport rules
  games/
    multiplication.js     Multiplication game module
    clock.js              Analog clock game module
  sw.js                   Service worker
  manifest.json           PWA manifest
tests/
  learning.test.mjs        Dependency-free learning and game-contract tests
  browser.mjs              Real Edge browser/offline regression checks
```

## Development

Double-click **`run.cmd`** (Windows) to launch a local dev server with live reload:

```sh
run.cmd
```

This installs the [LiveReloadServer](https://github.com/RickStrahl/LiveReloadServer) .NET global tool (if needed), serves `docs/` at **http://localhost:8080**, and opens your browser automatically. Any file change will instantly refresh the page.

> **Tip — Service Worker caching during development:**
> The service worker can serve stale cached files. To always see your latest changes,
> unregister the worker in **Edge / Chrome DevTools → Application → Service Workers**
> while editing. "Update on reload" checks the worker, but unchanged versioned
> assets remain cached. For a release, bump the worker cache version and all
> required asset URLs together (including transitive imports and manifest icons).

### Validation

No build step or package installation is needed. With Node.js 24 or later:

```powershell
node --test tests\learning.test.mjs tests\performance.test.mjs
node tests\browser.mjs
node tests\browser.mjs --performance-only
node tests\browser.mjs --fonts-only
```

The browser runner uses an isolated `.browser-profile-*` directory inside the repository, a local HTTP server, and installed Microsoft Edge on Windows. Set `BROWSER_PATH` to use a different Chromium executable. It exercises mobile UI, persisted review, cancellation, level choices, rewards, and offline asset loading, then removes its profile. The focused performance run checks real cross-tab invalidation, one write per answer, canvas reuse/reduced motion, zero precache revalidation, and versioned offline imports. The worker VM tests cover failed required installs (network/404/content type/quota), activation cleanup, cache lifetimes, explicit fallbacks, readiness verification, and release URL consistency.

## License

[Apache License 2.0](LICENSE)
