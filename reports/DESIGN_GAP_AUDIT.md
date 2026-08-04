# Tennis World Chronicle — design gap audit

This audit compares the v0.3.0 project with `docs/Tennis_World_Chronicle_Design_Document.docx` and the later stable-population requirements.

## 1. Core loop — implemented

- Weekly magazine with champions, upsets, rankings, surface previews, fatigue/form, juniors, doubles, national teams, records and retirements.
- Active/upcoming tournament browser with full routed dossiers.
- Favorite-player watchlist persisted inside each universe save.
- Simulation controls: +1 Year, +4 Weeks, End of Year and Simulate to Tournament.
- Dedicated year-end review and next-season movement dossier.

## 2. World structure and population — implemented

- Exactly 360 active singles players for ATP and WTA.
- Exactly 160 dedicated doubles players and 120 juniors per tour.
- Retired player archive remains available to rankings filters, player pages and records.
- Active Generational cap remains at one to two per tour.
- Every age-out junior has an explicit outcome: singles promotion, doubles conversion or retirement.
- Mid-career singles players can permanently pivot into doubles.

## 3. Player model and development — implemented

- Biography, handedness, backhand, height, academy, personality and narrative tags.
- Rarity, maximum rating, career archetype, annual multiplier and retirement inclination.
- Nine tennis skills plus independent surface affinities.
- Preferred surface and style/surface synergy, including deliberately awkward combinations.
- Match shape, doubles shape, fatigue, health, injury resilience and recovery.
- Development history and a visible full career curve.
- Secondary-surface adaptation through repeated exposure.

## 4. Match simulation — implemented

- Game/set-based score generation rather than score-only weighted selection.
- Serve/return, attack/defense, volley/passing, surface, style, mentality, tactics, shape and fatigue effects.
- Best-of-five endurance progression and tournament-to-tournament fatigue carryover.
- Match duration, aces, tags and explanatory narrative.
- Upset safeguards and lower variance at Grand Slams.

## 5. Calendar and scheduling — implemented

- Recognizable annual hard, clay, grass and indoor flow.
- Grand Slams, 1000s, 500s, 250s, lower-tour events, Finals, Olympics and team finals.
- Target-event planning, specialist scheduling, low-endurance rest and consecutive-week pressure.
- No overlapping player entries; late conflicts resolve through entry selection/withdrawal logic.
- Upcoming tournament pages can simulate directly to their event week.

## 6. Rankings, qualification and seeding — implemented

- Rolling ranking points, race points, defending-points panel and movement arrows.
- Weekly historical snapshots with year/week selector.
- Filters for nationality, age, rarity, surface performance and active/retired status.
- Direct entries, qualifying, seeds, wild cards, junior exemptions and protected ranking.
- Magazine callouts for movers and defending-points danger.

## 7. Doubles — implemented as a parallel career

- Separate ranking, peak, points, shape, tactical rating, season record and career record.
- 64-team Slam draws, 32-team Olympic draws and complete event histories.
- Dedicated specialists and selective singles crossovers.
- Permanent, semi-regular and event-specific partnerships.
- Chemistry, handedness, nationality, complementary profile and continuity effects.
- Individual partnership logs and archived former teams.
- Full-time singles-to-doubles conversion at ages 24-30.
- Doubles No. 1 weeks counted exactly once per simulated week.

## 8. Juniors and pipeline — implemented

- Compact calendar with four junior majors, regional/continental events and finals.
- Junior rankings, points, seeds, full draws and results.
- Limited professional entries for elite prospects.
- Graduation watch and first-pro-pathway data.
- Continuous 15/16-year-old spawning with rarity-cap enforcement.
- Stable roster pipeline at age-out.

## 9. Interface and almanac — implemented

- Full primary navigation from the design document.
- Tennis-almanac visual language with surface chips, draw columns, ranking movement, rarity labels and condition warnings.
- **Players are full pages, not popups.** Tabs: Overview, Current Season, Career, Matchups, Development and Records.
- **Tournaments are full pages, not popups.** Tabs: Overview, Current Year, History and Stats.
- Full match and rivalry routes with browser history and visible Back controls.
- Tournament routing works for singles, doubles, junior and team events.
- Home, records and almanac expose the same canonical simulation data.

## 10. Narrative and records — implemented

- Weekly magazine sections from the design.
- Explanations use surface mismatch, fatigue, shape, endurance, matchup and career context.
- Era classification and record milestones.
- Records for majors, titles, weeks No. 1, year-end No. 1, wins, win rate, surfaces, streaks, five-set performance, Olympics, national teams and doubles.
- Dedicated head-to-head rivalry pages.

## 11. Tests — implemented

- Smoke test for a full season/offseason.
- Five-season population integrity test.
- Strict design-contract test covering runtime data and routed UI contracts.
- Grass/Grand Slam Monte Carlo balance regression.

## Deliberate implementation simplifications

These are transparent scope choices rather than silent omissions:

1. Lower-tier events use compressed but explicit draws/results instead of a separate invisible Tier-C probabilistic database beyond the fixed 360-player tours.
2. Davis/BJK Cup ties are simulated and stored at team-tie level (16 nations, rosters, score and bracket), not individual rubber-by-rubber scorecards.
3. Match simulation resolves games and sets, not every individual point.
4. Saves are local IndexedDB save slots; no cloud database is included in this version.

All user-facing pages, tabs and systems explicitly specified in the design are present in v0.3.0.
