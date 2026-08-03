# Tennis World Chronicle — Balance Validation

Deterministic Monte Carlo sample: **50 universes**, **5 seasons each**, **2,500 grass singles titles**, and **2,000 Grand Slam singles titles**.

## Grass outcomes

- The season-opening best overall player won **160 of 2500** grass titles (**6.4%**) and **79 of 500** Wimbledon titles (**15.8%**). When actually entered, that player won **20.5%** of grass events.
- The strongest grass-specific player won **349** grass titles (**14%**) and **127** Wimbledon titles (**25.4%**).
- Players whose declared preferred surface is grass won **1343 of 2500** grass titles (**53.7%**). Broader grass-optimized profiles won **74.5%**.
- A five-year universe produced an average of **31.26** different grass champions across 50 ATP/WTA grass titles.

## Five-year Grand Slam ceilings

- **Generational:** median top career segment 5; 90th percentile 8; highest observed 11.
- **Legend:** median 4; 90th percentile 5; highest observed 8.
- **Epic:** median 2; 90th percentile 4; highest observed 5.

## Validation checks

- PASS — Preferred-grass players win a majority
- PASS — Grass-optimized profiles dominate without monopolizing
- PASS — Best overall player leaves substantial grass-title noise
- PASS — Best overall player remains a meaningful Wimbledon threat
- PASS — Five-year grass champion variety remains broad
- PASS — Generational five-year Slam median exceeds Legend
- PASS — Epic five-year Slam ceiling permits a rare breakthrough
- PASS — Generational peak permits historic dominance

Overall result: **PASS**.

The test is reproducible with `npm run balance`. Set `RUNS=200 npm run balance` for a larger sample.
