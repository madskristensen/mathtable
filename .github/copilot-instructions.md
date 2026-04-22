# Copilot Instructions

> Keep this file up to date whenever the architecture, game contract, or shared state changes.

## Project overview

Kids Learning Hub is a vanilla JS/CSS PWA (no build step) served from `docs/`. It is a multi-game hub where each game is a lazy-loaded ES module.

```
docs/
  index.html           App shell (static screens, one <div> per screen)
  style.css            All shared + game-specific styles
  app.js               Hub framework — state, routing, session loop
  games/
    multiplication.js  Multiplication game module
    clock.js           Analog Clock game module
    timemath.js        Time Math game module
  sw.js                Service worker (cache-first, update CACHE_NAME on asset changes)
  manifest.json        PWA manifest
```

## Hub framework (`docs/app.js`)

### Screens

All screens are `<div id="screen-{name}" class="screen">` in `index.html`. Only the `.active` one is visible. Switch with `showScreen(id)`.

Current screens: `home`, `mode-menu`, `mode-option-picker`, `mode-view`, `game`, `results`.

### Game registry

Add a game by extending `GAME_REGISTRY` in `app.js`:

```js
GAME_REGISTRY['my-game'] = {
  title: 'My Game',
  icon: '🎯',
  description: 'One-line description shown on the home card.',
  defaultMode: 'play',          // used for high-score subtitle on home screen
  loader: () => import('./games/my-game.js'),
};
```

### Home screen carousel

Game cards are displayed as a **horizontal scroll-snap portrait carousel**. Each card shows:
- A large emoji `icon` (~4.5 rem) at the top
- `title` below the icon
- `description` as body text (keep it short — 1–2 sentences)
- A high-score pill at the bottom (auto-populated by the framework)

Adding an entry to `GAME_REGISTRY` automatically adds a card and a dot indicator to the carousel — no HTML or CSS changes needed.

```js
```

### Shared state (`state` object)

| Field | Purpose |
|---|---|
| `loadedGames` | Cache of loaded game modules keyed by gameId |
| `currentGame` | Active game module |
| `currentMode` | Active mode descriptor |
| `currentQuestion` | Current question object |
| `session` | Current session (see below) |
| `timerInterval` | Handle for Challenge-style countdown |
| `pendingGameId/Mode` | Preserved during mode-picker navigation |

### Session object

Created by `startMode()` and optionally extended by `game.initSession()`:

| Field | Default | Purpose |
|---|---|---|
| `gameId` | — | Game identifier |
| `modeId` | — | Mode identifier (or `null`) |
| `modeConfig` | `{}` | Free-form config set by mode option picker |
| `round` | 0 | Rounds completed |
| `maxRounds` | 10 | End game after this many rounds (`null` = unlimited) |
| `timedSeconds` | 0 | Start a countdown if > 0 |
| `score/streak/bestStreak/correct/total` | 0 | Tracked by framework |
| `ended` | false | Set to `true` by `endGame()`; guards re-entry |

### Shared stats (`localStorage`)

Key: `kids_hub_stats_v1`. Shape:

```js
{
  bestStreak, totalCorrect, dailyStreak, lastPlayDate,
  mascot,                   // emoji from ANIMALS list
  highScores: {             // keyed "gameId" or "gameId:modeId"
    'multiplication:quick': [{ score, correct, total, date }, ...]
  },
  problems: {               // per-fact tracking (populated by recordProblemResult)
    '3x4': { correct: 5, wrong: 1 }
  }
}
```

Bump `STORAGE_KEY` (e.g. `kids_hub_stats_v2`) when the shape changes in a breaking way.

## Game module contract (`docs/games/*.js`)

A game module must `export const game` with these fields:

```js
export const game = {
  id: 'my-game',             // matches registry key
  title: 'My Game',
  icon: '🎯',
  description: '…',
  defaultMode: 'play',       // optional; which modeId to use for home-screen high-score summary

  // Optional: declare sub-game modes (omit if the game has only one mode)
  modes: [
    {
      id: 'play',
      title: 'Play',
      icon: '⚡',
      description: '…',
      kind: 'play',          // 'play' = starts a session; 'view' = renders a static panel
      // selection: { key, label, options }  // optional; triggers an option-picker screen
    },
  ],

  // Optional: called before startMode() creates the session.
  // Return an object whose fields are merged into the session.
  initSession(modeId, modeConfig, baseSession) {
    return { maxRounds: 10 };
  },

  // Required: return a question object for the current session state.
  createQuestion(session) {
    return {
      prompt: '<div>…</div>',       // innerHTML for the prompt area
      answers: [                    // 4 answer buttons
        { value: 42, label: '<span>42</span>' },
      ],
      correctValue: 42,
      meta: { fact: { a, b } },    // optional; framework passes fact to recordProblemResult()
    };
  },

  // Required only for modes with kind: 'view'.
  // Return an HTML string to render in the mode-view screen.
  renderModeView(modeId, { stats }) {
    return '<p>…</p>';
  },
};
```

### Mode kinds

| `kind` | Behaviour |
|---|---|
| `play` | Framework starts a session, runs the Q&A loop, saves scores |
| `view` | Framework calls `game.renderModeView()` and shows the result in a static panel; no session is created |

### Selection picker

If a mode has a `selection` property, the hub shows an option-picker screen before starting the session. The selected value is placed in `session.modeConfig[selection.key]`.

```js
selection: {
  key: 'table',
  label: 'Pick a table',
  options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  // numbers or { value, label } objects
}
```

## Scoring

Base score per correct answer: `10 + min(streak × 2, 20)`. Implemented in `submitAnswer()` in `app.js`.  
High scores are saved per `gameId:modeId` key. Games whose mode has `kind: 'view'` never generate scores.

## Service worker

Update `CACHE_NAME` in `docs/sw.js` whenever new assets are added or filenames change so the service worker re-caches correctly.

## Conventions

- Vanilla JS ES modules only — no bundler, no npm.
- All styles in `docs/style.css`; use existing CSS variables (`--primary`, `--surface`, `--radius`, etc.).
- Game modules are self-contained; do not import from each other or from `app.js`.
- Screen IDs in `index.html` must match the string passed to `showScreen()`.
- Use `cursor: pointer` and min touch target sizes (≥ 2.5 rem) for all interactive elements.
- No blocking network calls; offline support is required via the service worker.
