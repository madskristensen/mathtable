# Kids Learning Hub

[![GitHub Pages](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment)

A fast offline-friendly PWA that now acts as a hub for multiple kids learning games.

🌐 **Play now:** [mathtable.fun](https://mathtable.fun)

## Games

- 🔢 **Multiplication** — includes Quick Game, Practice, Challenge, and Multiplication Map sub-games.
- 🕒 **Tell Time (Analog Clock)** — read an analog clock and pick the matching digital time.

## Shared Features

- 🧩 Home hub with one card per game
- 🕹️ Per-game sub-game/menu framework
- 🔥 Shared daily streak and best streak tracking
- 🏅 Shared per-game high scores
- 🐾 Emoji animal picker used across all games
- 🎨 Shared theme and UI components
- 📱 Installable PWA with offline support

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
  games/
    multiplication.js     Multiplication game module
    clock.js              Analog clock game module
  sw.js                   Service worker
  manifest.json           PWA manifest
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

## License

[Apache License 2.0](LICENSE)
