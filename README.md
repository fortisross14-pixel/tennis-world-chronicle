# Tennis World Chronicle v0.2.0

A browser-style ATP, WTA, doubles and junior universe simulator built with Vite + React.

## What is implemented

- Exactly **360 ATP** and **360 WTA** active singles players.
- Exactly **160 dedicated doubles players per tour** and 120 juniors per tour.
- Junior age-out routing: singles vacancy → doubles vacancy → recorded retirement.
- Rarity system with a hard maximum of two active Generational players per tour at creation and promotion time.
- Skills, playing styles, preferred surfaces, surface affinities, career curves, match shape, fatigue, health and endurance recovery.
- Annual calendar with Grand Slams, 1000s, 500s, 250s, Tour Finals, Davis/BJK Cup and Olympic years.
- Set/game-based score generation, best-of-five ATP Grand Slam behavior and accumulated tournament fatigue.
- Canonical tournament editions used by rankings, player history, magazine, almanac and records.
- Singles rankings, junior rankings, doubles teams and national-team power tables.
- Three IndexedDB save slots with autosave and localStorage fallback.
- Simulation controls: **+1 Year**, **+4 Weeks**, **End of Year**.
- Dedicated end-of-year and beginning-of-year transition dossiers.
- Responsive printed-almanac / tennis-browser interface.

## Balance pass in v0.2.0

Grass results now combine true surface affinity, preferred-surface bonuses, style compatibility, serve/return skills, shape, fatigue and rarity-level competitive consistency. Lower events retain more upset variance than Grand Slams.

The included fixed-seed Monte Carlo suite simulates 50 separate five-year universes by default: 2,500 grass titles and 2,000 Grand Slam titles.

```bash
npm run balance
```

For a larger sample:

```bash
RUNS=200 npm run balance
```

Reports are written to `reports/BALANCE_VALIDATION.md` and `reports/balance-validation.json`.

## Run locally

```bash
npm install
npm run dev
```

## Test and build

```bash
npm test
```

`npm test` runs the simulation smoke test and a production Vite build. The scripts call Vite through Node directly, avoiding the recurring `vite: Permission denied` issue in GitHub Actions.

For a five-season deterministic population check:

```bash
npm run validate
```

## GitHub Pages

The repository includes `.github/workflows/deploy.yml`. Push the project to the `main` branch, then in GitHub:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push again or run the workflow manually.

The Vite base is `./`, so project pages work without manually changing the repository name.

## Save architecture

The universe is stored in IndexedDB rather than localStorage to avoid browser quota failures as historical editions accumulate. Saves are independent and autosaved after simulations and season transitions.
