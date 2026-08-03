import assert from 'node:assert/strict';
import { createUniverse,SINGLES_CAP,DOUBLES_CAP,JUNIOR_TARGET } from '../src/sim/generation.js';
import { rebuildDoublesTeams } from '../src/sim/doubles.js';
import { RNG } from '../src/sim/random.js';
import { advanceWeeks,simulateToEndOfYear,openNextSeason } from '../src/sim/season.js';

const world=createUniverse({seed:20260803,startYear:2026,name:'Smoke Test World'});
const rng=new RNG(world.rngSeed);
rebuildDoublesTeams(world,'ATP',rng);
rebuildDoublesTeams(world,'WTA',rng);
world.rngSeed=rng.seed;

assert.equal(world.players.ATP.length,SINGLES_CAP);
assert.equal(world.players.WTA.length,SINGLES_CAP);
assert.equal(world.doublesPlayers.ATP.length,DOUBLES_CAP);
assert.equal(world.doublesPlayers.WTA.length,DOUBLES_CAP);
assert.equal(world.juniors.ATP.length,JUNIOR_TARGET);
assert.equal(world.juniors.WTA.length,JUNIOR_TARGET);

advanceWeeks(world,4);
assert.ok(world.tournamentEditions.length>0,'Expected completed tournaments after four weeks');
simulateToEndOfYear(world);
assert.equal(world.seasonEnded,true);
assert.equal(world.transition.mode,'end');
openNextSeason(world);

assert.equal(world.year,2027);
assert.equal(world.week,1);
assert.equal(world.players.ATP.length,SINGLES_CAP);
assert.equal(world.players.WTA.length,SINGLES_CAP);
assert.equal(world.doublesPlayers.ATP.length,DOUBLES_CAP);
assert.equal(world.doublesPlayers.WTA.length,DOUBLES_CAP);
assert.equal(world.juniors.ATP.length,JUNIOR_TARGET);
assert.equal(world.juniors.WTA.length,JUNIOR_TARGET);
assert.ok(world.transition.promoted.length>0,'Expected junior promotions after retirements');

for (const tour of ['ATP','WTA']) {
  assert.equal(new Set(world.players[tour].map(p=>p.id)).size,SINGLES_CAP,'Singles IDs must remain unique');
  assert.ok(world.players[tour].filter(p=>p.rarity==='Generational').length<=2,'Active generational cap exceeded');
}

console.log('Smoke test passed:', {
  year:world.year,
  editions:world.tournamentEditions.length,
  promoted:world.transition.promoted.length,
  doublesConversions:world.transition.doublesConversions.length,
  overflowRetired:world.transition.overflowRetired.length,
});
