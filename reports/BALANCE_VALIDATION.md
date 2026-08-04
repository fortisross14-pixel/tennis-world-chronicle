# Tennis World Chronicle — Balance Validation

Deterministic Monte Carlo sample: **20 universes**, **5 seasons each**, **1,394 grass singles titles**, and **800 Grand Slam singles titles**.

## Grass outcomes

- The season-opening best overall player won **84 of 1394** grass titles (**6%**) and **31 of 200** Wimbledon titles (**15.5%**). When actually entered, that player won **22.8%** of grass events.
- The strongest grass-specific player won **199** grass titles (**14.3%**) and **79** Wimbledon titles (**39.5%**).
- Players whose declared preferred surface is grass won **726 of 1394** grass titles (**52.1%**). Broader grass-optimized profiles won **76.5%**.
- A five-year universe produced an average of **49.55** different grass champions across about **70** grass titles (**71.1%** unique champion share).

## Five-year Grand Slam ceilings

- **Generational:** median top career segment 6; 90th percentile 10; highest observed 12.
- **Legend:** median 4; 90th percentile 6; highest observed 11.
- **Epic:** median 2; 90th percentile 3; highest observed 5.

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
