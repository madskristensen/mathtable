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
- Subject filters, a full game grid, and a continue-playing shortcut
- Visual explanations for arithmetic and clocks, worked time calculations, and reading/geography/history learning notes
- Untimed mistakes pause for learning; Practice and review pause after every answer. Timed Challenges keep moving.
- **Practice my tricky ones** in game menus and results, plus spaced review every fourth untimed question
- Starter, Growing, and Explorer levels; two completed untimed sessions with at least 10 answers and 80% accuracy recommend the next level
- **My Skills** views and mastery counts on home cards. Mastery requires at least three correct answers and 80% accuracy over the last five attempts (or all attempts when fewer than five).
- A Learning Passport with game stamps and improvement badges. Exploring three subjects unlocks a unicorn mascot; lessons are never locked.

All new learning data stays on this device alongside existing scores and streaks. Missed skills stay in the review list until answered correctly three times in a row. Review sessions do not enter high-score tables or advance difficulty recommendations.

## Tech Stack

- Vanilla HTML / CSS / JavaScript modules (no build step)
- Dynamic module loading for game code
- Service Worker for offline caching
- localStorage for shared progress
- Hosted on GitHub Pages

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
> open **Edge / Chrome DevTools → Application → Service Workers** and check
> **"Update on reload"**. This forces the browser to fetch a fresh service worker on every page load.

### Validation

No build step or package installation is needed. With Node.js 24 or later:

```powershell
node --test tests\learning.test.mjs
node tests\browser.mjs
```

The browser runner uses a temporary profile, a local HTTP server, and installed Microsoft Edge on Windows. Set `BROWSER_PATH` to use a different Chromium executable. It exercises mobile UI, persisted review, cancellation, level choices, rewards, and offline asset loading, then removes its temporary profile.

## License

[Apache License 2.0](LICENSE)
