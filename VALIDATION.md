# Validation report

## Simulation integrity

- Deterministic smoke test completed a four-week simulation, the entire 2026 season and the 2027 offseason transition.
- ATP singles remained exactly 360.
- WTA singles remained exactly 360.
- ATP and WTA doubles remained exactly 160 each.
- Boys and girls junior pools remained exactly 120 each.
- Active Generational players remained at or below two per tour.
- Canonical tournament editions, ranking updates and year-end transition records were created.

## Twelve-season population stress run

A fixed-seed run from 2026 through 2038 produced:

- 514 singles promotions
- 134 junior-to-doubles conversions
- 8 age-out retirements because both singles and doubles were full
- 833 archived retirements across singles, doubles and age-out careers
- No roster-count drift in any season

## Surface and Grand Slam balance run

The v0.2.0 deterministic Monte Carlo test covered **50 independent five-year universes**, representing:

- 500 ATP/WTA tour-seasons
- 2,500 grass singles titles
- 500 Wimbledon titles
- 2,000 Grand Slam singles titles

Key results:

- The best overall player won 160 of 2,500 grass titles (6.4%), but won 20.5% of grass events entered.
- The best overall player won 79 of 500 Wimbledon titles (15.8%).
- The strongest grass-specific player won 349 grass titles (14.0%) and 127 Wimbledon titles (25.4%).
- Declared grass specialists won 1,343 grass titles (53.7%).
- Broader grass-optimized profiles won 74.5% of grass titles.
- A five-year universe averaged 31.26 distinct grass champions across 50 ATP/WTA grass events.
- Highest five-year Slam totals observed: Generational 11, Legend 8, Epic 5.

All eight target-band checks passed. Full results are in `reports/BALANCE_VALIDATION.md` and `reports/balance-validation.json`.

## Environment limitation

The source package registry available inside the artifact container did not expose React/Vite packages, and the public npm registry was not DNS-accessible. The production dependency install therefore could not be executed here. The simulation smoke test, five-season population validation and Monte Carlo balance validation all executed successfully with Node. The GitHub workflow installs dependencies before running `npm test` and the Vite production build.
