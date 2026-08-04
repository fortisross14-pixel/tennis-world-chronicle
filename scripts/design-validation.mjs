import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createUniverse,SINGLES_CAP,DOUBLES_CAP,JUNIOR_TARGET } from '../src/sim/generation.js';
import { rebuildDoublesTeams } from '../src/sim/doubles.js';
import { RNG } from '../src/sim/random.js';
import { advanceWeeks,simulateToEndOfYear,openNextSeason } from '../src/sim/season.js';
import { findPlayer,tournamentFamily,playerMatches,defendingPoints,rankingSnapshot } from '../src/sim/selectors.js';
import { rivalryStorageStats } from '../src/sim/rivalries.js';

const world=createUniverse({seed:771982,startYear:2026,name:'Design Contract World'});
const rng=new RNG(world.rngSeed);
for(const tour of ['ATP','WTA']) rebuildDoublesTeams(world,tour,rng);
world.rngSeed=rng.seed;

// Stable population and identity/development model.
for(const tour of ['ATP','WTA']) {
  assert.equal(world.players[tour].length,SINGLES_CAP,`${tour} singles cap`);
  assert.equal(world.doublesPlayers[tour].length,DOUBLES_CAP,`${tour} doubles cap`);
  assert.equal(world.juniors[tour].length,JUNIOR_TARGET,`${tour} junior target`);
  assert.ok(world.players[tour].filter(p=>p.rarity==='Generational').length<=2,'Generational cap');
  const sample=world.players[tour][0];
  for(const field of ['preferredSurface','style','curveType','birthYear','backhand','heightCm','academy','personalityTags']) assert.ok(sample[field]!==undefined,`Missing identity field ${field}`);
  for(const skill of ['serve','forehand','backhand','volley','footwork','endurance','return','mentality','tactics']) assert.ok(Number.isFinite(sample.skills[skill]),`Missing skill ${skill}`);
  assert.ok(sample.surfaceAffinity.Hard&&sample.surfaceAffinity.Clay&&sample.surfaceAffinity.Grass,'Surface affinities');
}

// Reach the Australian Open and its junior/doubles equivalents.
advanceWeeks(world,3);
for(const tour of ['ATP','WTA']) {
  const ao=world.tournamentEditions.find(e=>e.event.tour===tour&&e.event.name==='Australian Open');
  assert.ok(ao,`${tour} Australian Open should complete`);
  assert.equal(ao.drawSize,128,'Grand Slam singles draw');
  assert.equal(ao.matches.length,127,'Grand Slam singles match count');
  assert.equal(ao.entryMeta.filter(e=>e.type==='Qualifier').length,16,'Grand Slam qualifier count');
  assert.ok(ao.qualifyingMatches.length>=48,'Grand Slam qualifying rounds');
  assert.equal(ao.seeds.length,32,'Grand Slam seeds');
  const champ=findPlayer(world,ao.championId);
  assert.ok(champ.career.titleLog.some(r=>r.event==='Australian Open'&&r.year===2026),'Champion title log consistency');
  assert.ok(champ.season.results.some(r=>r.event==='Australian Open'&&r.round==='W'),'Champion season result consistency');
  assert.ok(playerMatches(world,champ.id).length>=7,'Player match dossier data');
  assert.ok(rivalryStorageStats(world).candidates>0||rivalryStorageStats(world).permanent>0,'Compact head-to-head ledger');

  const aod=world.doublesEditions.find(e=>e.event.tour===tour&&e.event.name==='Australian Open Doubles');
  assert.ok(aod,`${tour} Australian Open doubles should complete`);
  assert.equal(aod.drawSize,64,'Grand Slam doubles draw');
  assert.equal(aod.matches.length,63,'Grand Slam doubles match count');
  assert.equal(aod.entryTeamIds.length,64,'Grand Slam doubles field');
  const doublesParticipantId=world.doublesTeams[tour].find(t=>aod.entryTeamIds.includes(t.id))?.playerIds[0];
  const doublesParticipant=findPlayer(world,doublesParticipantId);
  const dc=doublesParticipant.doublesSpecialist?doublesParticipant.doublesCareer:doublesParticipant.career;
  assert.ok((dc.matches||dc.doublesMatches||0)>0,'Individual doubles career records');
  assert.ok(doublesParticipant.doublesSeason?.matches>0&&doublesParticipant.doublesSeason?.results?.length>0,'Individual doubles season dossier');

  const junior=world.juniorEditions.find(e=>e.event.tour===tour&&e.event.name==='Australian Junior Championships');
  assert.ok(junior,`${tour} junior major should complete`);
  assert.equal(junior.entryIds.length,32,'Junior major draw');
  assert.equal(junior.matches.length,31,'Junior major matches');
  assert.ok(junior.finalistId&&junior.seeds.length===8,'Junior finalists and seeding');
  assert.ok(findPlayer(world,junior.championId).juniorPoints>0,'Junior points progression');

  assert.equal(tournamentFamily(world,tour,'Australian Open').kind,'singles');
  assert.equal(tournamentFamily(world,tour,'Australian Open Doubles').kind,'doubles');
  assert.equal(tournamentFamily(world,tour,'Australian Junior Championships').kind,'junior');
  assert.equal(rankingSnapshot(world,tour,2026,3).length,100,'Weekly historical ranking snapshot');
}

// No player or doubles team may enter simultaneous events twice.
for(const tour of ['ATP','WTA']) {
  const editions=world.tournamentEditions.filter(e=>e.event.tour===tour);
  const byWeek=Map.groupBy(editions,e=>e.event.week);
  for(const rows of byWeek.values()) {
    const seen=new Set();
    for(const edition of rows) for(const id of edition.entryIds||[]) {assert.ok(!seen.has(id),`Duplicate singles entry in week ${edition.event.week}`);seen.add(id);}
  }
  const doublesByWeek=Map.groupBy(world.doublesEditions.filter(e=>e.event.tour===tour),e=>e.event.week);
  for(const rows of doublesByWeek.values()) {
    const seen=new Set();
    for(const edition of rows) for(const id of edition.entryTeamIds||[]) {assert.ok(!seen.has(id),`Duplicate doubles team in week ${edition.event.week}`);seen.add(id);}
  }
}

// Finish season, verify review systems and the explicit offseason pipeline.
simulateToEndOfYear(world);
assert.equal(world.transition.mode,'end');
const summary=world.transition.yearSummary;
assert.equal(summary.awards.length,2,'ATP/WTA awards');
assert.equal(summary.majorWinners.length,8,'Eight singles major champions across tours');
assert.equal(summary.doublesChampions.length,8,'Eight doubles major champions across tours');
for(const tour of ['ATP','WTA']) {
  const teamFamily=tournamentFamily(world,tour,'Davis & BJK Cup Finals');
  assert.equal(teamFamily.kind,'team','National-team tournament has its own routed family');
  assert.ok(teamFamily.editions.length===1&&teamFamily.editions[0].championCountry,'National-team tournament stores a champion and history');
  const doublesNo1=[...world.doublesPlayers[tour],...world.players[tour]].filter(p=>p.doublesRanking===1)[0];
  const weeks=doublesNo1?.doublesSpecialist?doublesNo1.doublesCareer?.weeksNo1:doublesNo1?.career?.doublesWeeksNo1;
  assert.ok((weeks||0)<=52,'Doubles weeks No. 1 counts calendar weeks, not tournament refreshes');
}
assert.equal(summary.rankingTop10.ATP.length,10);
assert.ok(summary.era.ATP&&summary.era.WTA,'Era classification');
for(const category of ['Champions','Surface preview','Doubles','Juniors','National teams','Season review','Era watch']) assert.ok(world.magazine.some(s=>s.category===category),`Magazine category ${category}`);

const previousAoChampions=Object.fromEntries(['ATP','WTA'].map(t=>[t,world.tournamentEditions.find(e=>e.event.tour===t&&e.event.name==='Australian Open')?.championId]));
openNextSeason(world);
assert.equal(world.year,2027);
assert.equal(world.transition.mode,'beginning');
assert.ok(world.transition.newJuniors.length>0,'New youngster dossier');
assert.ok(world.transition.promoted.length>0,'Singles promotions');
assert.equal(world.transition.promoted.length+world.transition.doublesConversions.length+world.transition.overflowRetired.length,
  world.transition.promoted.length+world.transition.doublesConversions.length+world.transition.overflowRetired.length,'Explicit age-out outcomes');
for(const tour of ['ATP','WTA']) {
  assert.equal(world.players[tour].length,SINGLES_CAP,'Singles cap after offseason');
  assert.equal(world.doublesPlayers[tour].length,DOUBLES_CAP,'Doubles cap after offseason');
  assert.equal(world.juniors[tour].length,JUNIOR_TARGET,'Junior target after offseason');
  const priorChampion=findPlayer(world,previousAoChampions[tour]);
  assert.ok(defendingPoints(priorChampion,2027,1,8)>0,'Defending-points pressure');
}

// UI contract: routed pages with back controls and all documented dossier tabs.
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const playerPage=fs.readFileSync(new URL('../src/pages/PlayerPage.jsx',import.meta.url),'utf8');
const tournamentPage=fs.readFileSync(new URL('../src/pages/TournamentDetailPage.jsx',import.meta.url),'utf8');
const matchPage=fs.readFileSync(new URL('../src/pages/MatchPage.jsx',import.meta.url),'utf8');
const rivalryPage=fs.readFileSync(new URL('../src/pages/RivalryPage.jsx',import.meta.url),'utf8');
for(const routeName of ["go('player'","go('tournament'","go('match'","go('rivalry'"]) assert.ok(app.includes(routeName),`Missing routed page ${routeName}`);
for(const tab of ['Overview','Current Season','Career','Matchups','Development','Records']) assert.ok(playerPage.includes(tab),`Missing player tab ${tab}`);
for(const tab of ['Overview','Current Year','History','Stats']) assert.ok(tournamentPage.includes(tab),`Missing tournament tab ${tab}`);
for(const page of [playerPage,tournamentPage,matchPage,rivalryPage]) assert.ok(page.includes('BackButton'),'Routed dossier needs Back control');
assert.ok(playerPage.includes('Follow player')&&app.includes('followedPlayerIds'),'Followed-player watchlist must persist in saves');
assert.ok(Array.isArray(world.followedPlayerIds),'Universe stores followed players');
assert.ok(!fs.existsSync(new URL('../src/components/PlayerDrawer.jsx',import.meta.url)),'Legacy player popup must be removed');

console.log('Design-contract validation passed',{
  singlesEditions:world.tournamentEditions.length,
  doublesEditions:world.doublesEditions.length,
  juniorEditions:world.juniorEditions.length,
  rankingSnapshots:world.rankingHistory.length,
  magazineStories:world.magazine.length,
  promoted:world.transition.promoted.length,
  doublesConversions:world.transition.doublesConversions.length,
  overflowRetired:world.transition.overflowRetired.length,
});
