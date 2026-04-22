# Kids Learning Hub

[![GitHub Pages](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/madskristensen/mathtable/actions/workflows/pages/pages-build-deployment)

A fast offline-friendly PWA that now acts as a hub for multiple kids learning games.

🌐 **Play now:** [mathtable.fun](https://mathtable.fun)

## Games

- ✖️ **Multiplication Table** — includes Quick Game, Practice, Challenge, and Multiplication Map sub-games.
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

Serve the `docs/` directory with any static file server:

```sh
cd docs
npx serve .
```

## License

[Apache License 2.0](LICENSE)
