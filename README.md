# Tennis World Chronicle v0.3.0

A browser-style ATP, WTA, doubles, junior and national-team history simulator built with Vite + React. The user is the chronicler of a generated tennis universe: advance time, follow careers, inspect full draws, compare rivalries, and watch eras emerge.

## Core universe

- Exactly **360 ATP** and **360 WTA** active singles players.
- Exactly **160 dedicated doubles players per tour** and **120 juniors per tour**.
- Junior age-out routing: singles vacancy → doubles vacancy → recorded retirement.
- Mid-career singles-to-doubles pivots for suitable Epic, Rare and Uncommon players.
- Hard cap of two active Generational players per tour during creation and promotion.
- Retired players remain searchable and continue to appear in records and almanacs.

## Player and match model

- Rarity, maximum rating, annual multiplier, career curve and retirement inclination.
- Serve, forehand, backhand, volley, return, footwork, endurance, mentality and tactics.
- Preferred surface plus independent hard, clay, grass and indoor affinities.
- Playing styles, style/surface synergy, direct matchup effects and awkward combinations.
- Match shape, fatigue, health, injuries, protected rankings and recovery.
- Game/set score generation, tie-breaks and progressive best-of-five endurance effects.
- Stored match explanations, tags, duration, aces, upsets and historical context.

## Full routed dossiers

Player, tournament, match and rivalry views are real URL/hash routes—not popups. Browser history and visible Back controls work throughout.

### Player tabs

- **Overview:** biography, identity, condition, skills, surfaces and doubles profile.
- **Current Season:** chronological singles or doubles ledger, targets, points and withdrawals.
- **Career:** year-by-year results, titles, major rounds, awards, doubles and national teams.
- **Matchups:** head-to-head rivals, style splits, deciding sets and recent matches.
- **Development:** annual multiplier history and full career curve.
- **Records:** streaks, longest match, biggest upset, signature event and surface ledger.

### Tournament tabs

- **Overview:** location, surface, level, dates/week, points, draw and defending champion.
- **Current Year:** seeds, entry routes, qualifying, draw columns and linked match dossiers.
- **History:** champions, finalists, repeat winners, notable finals and country leaders.
- **Stats:** titles, wins, appearances, aces, five-set wins and youngest/oldest champions.

The same routed framework supports singles, doubles, juniors and Davis/BJK Cup events.

## Circuits and history

- Recognizable annual hard, clay, grass and indoor calendar.
- Grand Slams, 1000s, 500s, 250s, Challengers/WTA 125s and Tour Finals.
- Olympic editions and Davis Cup/Billie Jean King Cup finals.
- Full Grand Slam qualifying, direct entries, wild cards, junior exemptions and seeds.
- Rolling 52-week rankings, current-year race, defending points and weekly snapshots.
- Doubles teams, chemistry, continuity, crossovers, rankings and individual careers.
- Compact junior calendar with rankings, seeds, majors, pro entries and graduation watch.
- Weekly magazine, followed-player watchlist, rivalry pages, records and season almanac.
- Dedicated end-of-year review and beginning-of-year movement dossier.

## Simulation controls

- **+1 Year**
- **+4 Weeks**
- **End of Year**
- **Simulate to tournament** from an upcoming tournament page

## Save architecture

Three IndexedDB save slots are included, with autosave and localStorage fallback for slot metadata. IndexedDB prevents the browser quota failures caused by storing long histories in localStorage.

## Run locally

```bash
npm install
npm run dev
```

## Validation

```bash
npm run test:logic
npm run balance
npm test
```

- `test:logic` runs the smoke test, the design-contract audit and a five-season population test.
- `balance` runs the grass/Grand Slam Monte Carlo regression. Set `RUNS=50 npm run balance` for a larger sample.
- `test` also performs the production Vite build.

## GitHub Pages

The repository includes `.github/workflows/deploy.yml` and uses `base: './'` in Vite, preventing the common green-build/404 problem.

1. Push the project to the `main` branch.
2. Open **Settings → Pages**.
3. Select **GitHub Actions** as the source.
4. Run the deployment workflow or push again.

See `reports/DESIGN_GAP_AUDIT.md` and `VALIDATION.md` for the implementation audit and test evidence.
