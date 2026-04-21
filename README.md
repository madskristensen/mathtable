# Math Champ ✕

A fun, fast PWA to help kids master their multiplication tables (1–12). Built for iPad home screen use, works fully offline.

🌐 **Play now:** [mathtable.fun](https://mathtable.fun)

## Features

- ⚡ **Quick Play** — 20 random multiplication problems
- 📚 **Practice** — Pick a specific table to drill, with mastery tracking
- 🏆 **Challenge** — 60-second time attack mode
- 🔄 **Review Mistakes** — Replay only the problems you got wrong
- 🗺️ **Progress Map** — 12×12 grid showing mastery of all 144 facts
- 🏅 **High Scores** — Personal top 10 leaderboard per mode
- 🔥 **Daily Streak** — Duolingo-style consecutive day tracker
- 😄 **Animated Mascot** — Reacts to correct, wrong, and streak milestones
- 🔊 **Sound Effects** — Web Audio API synthesized sounds (no files to load)
- 📳 **Haptic Feedback** — Vibration API for tactile response
- 🧠 **Adaptive Learning** — Weak facts appear more often
- 🎉 **Confetti & Celebrations** — Streaks and high scores trigger confetti
- 📱 **Installable PWA** — Add to home screen, works offline

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Service Worker for offline caching
- Web Audio API for sound effects
- Vibration API for haptics
- localStorage for persistent progress
- Hosted on GitHub Pages with custom domain

## Project Structure

```
src/
  index.html       Main app page
  style.css        Styles
  app.js           Game logic
  sw.js            Service worker
  manifest.json    PWA manifest
  icon-192.png     App icon (192×192)
  icon-512.png     App icon (512×512)
  CNAME            Custom domain config
```

## Development

No build step required. Serve the `src/` directory with any static file server:

```sh
cd src
npx serve .
```

## Deployment

The `src/` folder is deployed to GitHub Pages. Set the Pages source to the `src/` directory (or configure GitHub Actions to publish from `src/`).

## License

[Apache License 2.0](LICENSE)
