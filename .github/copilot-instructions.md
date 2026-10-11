# Copilot Instructions

> Keep this file up to date whenever the architecture, game contract, or shared state changes.

## Project overview

Kids Learning Hub is a vanilla JS/CSS PWA (no build step) served from `docs/`. It is a multi-game hub where each game is a lazy-loaded ES module.

```
docs/
  index.html           App shell (static screens, one <div> per screen)
  style.css            All shared + game-specific styles
  app.js               Hub framework — state, routing, session loop
  learning.js          Pure mastery, review, level progression, and reward helpers
  games/
    _shared.js         Shared arithmetic factory and game helpers
    multiplication.js  Multiplication game module
    clock.js           Analog Clock game module
    timemath.js        Time Math game module
    usstates.js        Find the State (Geography) game module
    data/              Static asset data shared by games (e.g. us-states.svg)
  sw.js                Service worker (cache-first, update CACHE_NAME on asset changes)
  manifest.json        PWA manifest
```

## Hub framework (`docs/app.js`)

### Screens

All screens are `<div id="screen-{name}" class="screen">` in `index.html`. Only the `.active` one is visible. Switch with `showScreen(id)`.

Current screens: `home`, `mode-menu`, `mode-option-picker`, `mode-view`, `game`, `results`, `passport`.
The passport has its own `#/passport` route. Game routes preserve `level=1|2|3` alongside mode selections.

### Game registry

Add a game by extending `GAME_REGISTRY` in `app.js`:

```js
GAME_REGISTRY['my-game'] = {
  title: 'My Game',
  icon: '🎯',
  category: 'math',             // 'math' | 'time' | 'reading' | 'geography' | 'history'
  description: 'One-line description shown on the home card.',
  defaultMode: 'play',          // used for high-score subtitle on home screen
  loader: () => import('./games/my-game.js'),
};
```

### Home screen carousel

Game cards are displayed as a **horizontal scroll-snap portrait carousel**. Cards are grouped by `category`; before the first card of each category the framework inserts a slim **category header** (icon + label) that visually separates the groups (Math, Time, Reading, Geography).

The compact subject menu scrolls to a category without filtering out games; there is no All subjects entry. **Grid view / Carousel view** switches layouts, and carousel dots are hidden in grid view. Carousels align to the menu's left edge at every screen size. **Continue playing** restarts the last non-review game/mode/config rather than resuming an unfinished round. **Passport** is in the stats bar with a booklet icon and arrow, not the top menu. Subject buttons indicate selection with text weight, not rounded backgrounds or underlines.

Each card shows:
- A large emoji `icon` in a subject-colored decorative panel (no colored top border)
- `title` below the icon
- `description` as body text (keep it short — 1–2 sentences)
- A mastery count, practiced-skill count, and high score at the bottom

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
| `selectedLevel` | Level selected in the mode menu; merged with picker selections |
| `homeCategory/gridView` | Current navigated subject and grid/carousel choice; all games remain rendered |
| `answerTimeout` | Auto-advance timeout; cancelled on every session exit |
| `carouselCleanup` | Removes listeners before rebuilding cards |

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
| `level` | recommended level or 1 | Content difficulty and number of choices (2/3/4) |
| `answerLocked` | true while loading | Blocks duplicate clicks/keyboard submissions until the next question renders |
| `reviewKeys` | `[]` | Snapshot of up to ten missed skill keys for review sessions |

All game exits cancel countdown/auto-advance and question `onLeave` hooks. Async question rendering checks session identity so older questions cannot replace a newer session.

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
  },
  learning: {               // namespaced by game, then a stable skill key
    multiplication: {
      '3x4': { correct: 5, wrong: 1, recent: [true, true, true], streak: 3,
        needsReview: false, label: '3 × 4 = 12', data: { a: 3, b: 4 },
        modeId: 'quick', lastSeen: 0 }
    }
  },
  levels: { multiplication: { level: 1, strongRuns: 0 } },
  lastGame: { gameId: 'multiplication', modeId: 'quick', modeConfig: { level: 1 } },
  passport: { games: [], categories: [], badges: [], improved: false }
}
```

Bump `STORAGE_KEY` (e.g. `kids_hub_stats_v2`) when the shape changes in a breaking way.
The learning fields are additive and old scores/streaks/mascots remain valid under v1. Persist only small replay descriptors, never question HTML/SVG or hooks. Time Math keys group operation, starting minute, and duration to bound storage. Storage failures are logged and visibly reported without silently replacing saved data.

`loadStats()` returns the tab's in-memory normalized stats, reading/parsing storage only initially or after a `storage` event for this key (including `localStorage.clear()`). Save through `saveStats()` to invalidate cached rendering summaries. An answer mutates legacy `problems` and namespaced `learning` together, then persists once. Cross-tab invalidation refreshes home stats/cards without replacing the active session; simultaneous writes remain last-writer-wins.

## Game module contract (`docs/games/*.js`)

A game module must `export const game` with these fields:

```js
export const game = {
  id: 'my-game',             // matches registry key
  title: 'My Game',
  icon: '🎯',
  description: '…',
  defaultMode: 'play',       // optional; which modeId to use for home-screen high-score summary
  levels: ['Starter description', 'Growing description', 'Explorer description'], // optional; default describes choice count

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

  // Required: return a question object (or a Promise of one) for the current session state.
  createQuestion(session) {
    return {
      prompt: '<div>…</div>',       // innerHTML for the prompt area
      answers: [                    // 4 answer buttons
        { value: 42, label: '<span>42</span>' },
      ],
      correctValue: 42,
      explanation: '<p>Explain how to find the answer.</p>', // required trusted game HTML
      learning: { key: 'stable-skill-key', label: 'Human-readable skill', data: { /* small JSON replay descriptor */ } },
      meta: { fact: { a, b, key: '3x4' } }, // optional; explicit keys avoid operation collisions
      // onRender() {},     // optional; starts DOM-dependent behavior after rendering
      // onLeave() {},      // optional; cancels that behavior on advance/exit
    };
  },

  // Required only for modes with kind: 'view'.
  // Return an HTML string (or a Promise of one) to render in the mode-view screen.
  renderModeView(modeId, { stats }) {
    return '<p>…</p>';
  },
};
```

`createQuestion(session)` must honor `session.level` and, when present, `session.reviewItem` (a saved `learning.data` descriptor) to regenerate the exact skill/question instead of choosing a new one. The framework supplies its original `modeId` when replaying. Hooks must not be started during question creation; Flash Word starts its cancellable exposure in `onRender`.

The framework adds virtual `review` (play) and `mastery` (view) modes to every game; do not declare these IDs in modules. Review is shown only when missed skills exist. My Skills is rendered by the hub, not `renderModeView`.

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
High scores are saved per `gameId`, folding legacy `gameId:modeId` buckets into the game's table. View modes and review sessions never generate high scores.

## Learning loop and rewards

- Untimed wrong answers show an explanation and wait for **Next**. Practice and review do this after every answer; Challenges retain the countdown/900ms advance.
- Each answer records a game-scoped skill. At least three correct answers plus 80% accuracy over the most recent five attempts (or all attempts when fewer than five) count as mastery. Existing arithmetic/geography maps read this data, falling back to legacy facts only for untouched skills.
- A wrong answer marks a skill for review until three consecutive correct answers. Every fourth untimed non-review question may revisit the oldest missed skill other than the current one. Review sessions snapshot up to ten such keys; their descriptors survive reloads.
- Two strong completed untimed, non-review sessions (at least 10 answers, at least 80% accuracy) at the recommended level advance that recommendation up to level 3. A weaker eligible session resets the count. All levels are available immediately; recommendation changes never lock content.
- Passport game stamps require a completed session with at least one answer. Badges recognize a first adventure, recovering a missed skill, exploring three categories, mastering five skills, and advancing a level. Three-category exploration unlocks the unicorn mascot and its existing theme. No attendance requirements or score perfection gates.

## Service worker

Update `CACHE_NAME` in `docs/sw.js` and the changed assets' query revisions whenever release assets change. Unchanged assets may retain earlier revisions. Release v67 updates the stylesheet to `?v=67` and retains `?v=66` for unchanged modules and assets; `sw.js` and navigation HTML stay unversioned. Keep every exact dependency URL in `ASSETS`; `tests\performance.test.mjs` verifies versioned assets and the dependency closure.

Install fetches every required asset with HTTP-cache bypass and checks status/content type before writes. Any failure rejects installation and deletes only the new release after all writes settle, preserving the old worker/cache. Do not call `skipWaiting()` during install: activation requires the user-confirmed update banner. Precached assets never revalidate. Runtime resources are bounded, app-scope-only, and cache writes/trimming are registered synchronously with `event.waitUntil()`. Cleanup only deletes obsolete `kids-hub-` caches; unrelated caches are untouched. Navigation uses the cached shell, and uncached offline requests get an explicit 503 response.

The home offline status uses `OFFLINE_STATUS` with a MessageChannel to ask the controlling worker to verify all required entries; registration alone is not proof of readiness. Readiness is a snapshot, not protection against later browser storage eviction.

Confetti uses one reusable hidden canvas, cancels its previous animation frame before relaunch and on screen changes, and skips/stops when `prefers-reduced-motion` changes to reduce. Rendering summaries cache each game's mastery and sorted high scores until stats change.

## Conventions

- Vanilla JS ES modules only — no bundler, no npm.
- All styles in `docs/style.css`; use existing CSS variables (`--primary`, `--surface`, `--radius`, etc.).
- Game modules are self-contained; do not import from each other or from `app.js`.
- Reuse `games/_shared.js` for game helpers and `learning.js` for pure learning rules.
- Screen IDs in `index.html` must match the string passed to `showScreen()`.
- Use `cursor: pointer` and min touch target sizes (≥ 2.5 rem) for all interactive elements.
- No blocking network calls; offline support is required via the service worker.

## Validation

There is no build step or package manifest. Use Node.js 24+ built-in tooling: `node --test tests\learning.test.mjs tests\performance.test.mjs` for learning/game-contract and service-worker regressions, and `node tests\browser.mjs` for real Edge mobile/offline regressions. Focused flags `--performance-only` and `--fonts-only` cover performance/cross-tab/cache behavior and native offline typography without the full mobile game matrix. Browser checks use an isolated `.browser-profile-*` directory inside the repository (removed after the run) and localhost server, with no npm dependencies. `BROWSER_PATH` can override the Chromium executable. Run `node --check` on changed JavaScript modules as a syntax check.
