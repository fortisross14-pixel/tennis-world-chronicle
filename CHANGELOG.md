# Tennis World Chronicle — v0.8.1 "Rivalries that matter"

- Rivalries are now rare and earned. Every pairing keeps a quiet head-to-head ledger, but a **rivalry ignites** only when two players meet **3+ times in the semifinals or finals of Slams, Olympics, Tour Finals or Masters 1000s within two seasons**, with **at least one final**, a weighted heat of 3.5+ (GS F 3, GS SF 2, Olympic F 2.5, Finals F 2, M1000 F 1.5, M1000 SF 1), and **both players winning at least once** (no one-way beatings).
- Once ignited it is a **lifetime feud**: tracked (with its own "since it began" record) until one of them leaves the tour, then it becomes **historic**.
- Tuned by replay over 4 worlds × 16 seasons: about 4 live rivalries per tour on average (typically 2–6, peaks of 8–9), roughly one new rivalry per tour every 1–2 years, average lifespan about 6 seasons. Thresholds live in `IGNITION` in `src/sim/rivalries.js`.
- News: "A rivalry is born", every big final between rivals, lead flips, broken streaks, "End of an era" when one retires.
- UI: Rivalries board split into Live and Historic; rivalry page shows status, ignition event and the feud record; plain head-to-heads are labelled as such; player Storyline lists their rivalries.
- Fixed the rivalry page's "Current streak" (always showed a dash).
- Saves migrate automatically (schema 9): old rivalries return to the ledger and the ignition rule is replayed over stored history.

# v0.8.0 "Storylines"


## Simulation
- **Form layer** (`match.js`): season form, weekly form drift, confidence (replaces the unused `momentum`), day form per match, in-match set momentum.
- **Personality now matters**: Big-match hunter, Crowd favorite (home events), Fighter (when trailing), Showman, Calm competitor, Emotional spark (higher variance), Stoic/Quiet professional (lower variance).
- **Career swings** (`generation.js`): career years / lost seasons with year-to-year persistence, veteran "Indian summer" seasons, and rare **breakthroughs** that raise a non-elite player's ceiling (new coach, rebuilt serve…) — humble beginnings can now become champions.
- **Injuries**: rare career-threatening injuries (24–44 weeks); returning players get a period of comeback hunger.
- Real "served for the match and got broken" detection replaces the random "saved match points" tag; new "two sets down" and "break down in decider" tags.
- All 8 balance-validation targets still pass.

## Narrative engine (`sim/narrative.js`, new)
- Maiden titles and majors, droughts ended, qualifier/wild-card champions, Cinderella runs, giant-killings, defending champions falling, three-peats, Career Slam, Calendar Slam watch, age and title records, home champions, comebacks, heartbreak (repeat Slam-final losers), epics.
- Ranking landmarks: new/returning world No. 1, first top-10, return to the top 10, winning streaks.
- Year-end: breakthrough, comeback and fall-from-grace of the year; retirement farewells with career labels.
- Player **chronicle**: compact career chapters per player; **career arcs** (Rags to riches, Self-made, Comeback story, One-Slam wonder, Nearly man/woman, Phenom, Late bloomer, Fallen star…).
- Noise cut: injuries, upsets, doubles and junior stories are filtered by significance. The magazine now keeps ~1,300 stories and trims low-importance items first (previously 500, less than one season).

## Rivalries
- Stricter qualification (≈370 per tour after 12 years instead of ≈1,200).
- Tracks streaks, longest streak, lead changes, last 10 results, Slam finals.
- Identities: Era-defining, Grand Slam classic, Changing of the guard, Nemesis, Dead even, Surface split, Seesaw.
- Stories for: rivalry born, lead flips, streaks broken, milestones, identity upgrades.

## UI
- Magazine → **Chronicle** feed (filters: tour, front page/headlines/everything, section, season, followed players) and **Rivalries** board.
- Home → front page ranked by importance.
- Player → **Storyline** panel (arcs, this-season form, timeline) and form chip in the header.
- Rivalry page → identity banner, narrative summary, last-10 strip. Fixed the low-contrast score in the rivalry header.
- Year-end awards include Comeback and Breakthrough of the year.

Saves from v0.7 migrate automatically (schema 8).
