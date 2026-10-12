import assert from 'node:assert/strict';
import { createUniverse } from '../src/sim/generation.js';
import { ensureUniverseData } from '../src/sim/migrations.js';
import { simulateToNextBigTournament,openNextSeason } from '../src/sim/season.js';

const universe=ensureUniverseData(createUniverse({seed:66019,startYear:2026,name:'Showcase QA'}));
assert.equal(universe.settings.seasonSetupComplete,false,'fresh Year 1 must require coverage setup');
universe.settings.showcaseCoverage={atpGrandSlam:'semifinals',wtaGrandSlam:'final',olympics:'final',teamCup:'semifinals',tourFinals:'final'};
universe.settings.seasonSetupComplete=true;
simulateToNextBigTournament(universe);
assert.equal(universe.showcaseStop.week,3,'first landmark should be Australian Open');
assert.equal(universe.showcaseStop.eventIds.length,2,'Australian Open stop should include ATP and WTA');
const ao=universe.tournamentEditions.filter(e=>universe.showcaseStop.eventIds.includes(e.id));
assert.equal(ao.length,2,'both Australian Open editions should exist');
const atpAo=ao.find(e=>e.event.tour==='ATP');
assert.equal(atpAo.matches.filter(m=>m.round==='SF').length,2,'ATP AO should have two semifinals');
for(const match of atpAo.matches.filter(m=>['SF','F'].includes(m.round))){
  assert.ok(match.setDetails?.length>=2,'featured matches must store set-level replay detail');
  assert.ok(match.setDetails.every(set=>set.gameWinners?.length>0),'each set must store game-by-game winners');
}
while(!universe.seasonEnded && universe.week<=45){
  simulateToNextBigTournament(universe);
  if(universe.showcaseStop?.week===45)break;
}
assert.equal(universe.showcaseStop.week,45,'team cups should be a landmark stop');
const teamEditions=universe.tournamentEditions.filter(e=>universe.showcaseStop.eventIds.includes(e.id));
assert.equal(teamEditions.length,2,'Davis and BJK events should both be present');
for(const edition of teamEditions){
  const final=edition.matches.find(tie=>tie.round==='F');
  assert.ok(final?.rubbers?.length>=2,'team cup final must contain individual rubbers');
  assert.ok(final.rubbers.every(match=>match.setDetails?.length),'team cup rubbers need game-by-game replay data');
}
while(!universe.seasonEnded)simulateToNextBigTournament(universe);
openNextSeason(universe);
assert.equal(universe.settings.seasonSetupComplete,false,'every new season must require coverage confirmation');
assert.equal(universe.settings.showcaseCoverage.atpGrandSlam,'semifinals','coverage preference should carry forward for confirmation');
console.log('Big-tournament showcase validation passed',{firstStop:'Australian Open',teamStop:'Davis / BJK Cup',nextYear:universe.year});
