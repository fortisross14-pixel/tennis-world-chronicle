import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COUNTRIES,iso2Code } from '../src/data/countries.js';
import { createUniverse,fullName } from '../src/sim/generation.js';
import { simulateToEndOfYear } from '../src/sim/season.js';
import { rivalryExtremes,rivalryStorageStats } from '../src/sim/rivalries.js';
import { ensureUniverseData } from '../src/sim/migrations.js';

const collectActive=world=>['ATP','WTA'].flatMap(tour=>[
  ...world.players[tour],...world.juniors[tour],...world.doublesPlayers[tour],
]);
const assertUniqueNames=world=>{
  const names=collectActive(world).map(player=>fullName(player).toLocaleLowerCase());
  assert.equal(new Set(names).size,names.length,'New universes must not contain exact duplicate active names');
};

for(const country of COUNTRIES)assert.equal(iso2Code(country.code).length,2,`Missing ISO-2 flag mapping for ${country.code}`);
const common=fs.readFileSync(new URL('../src/components/Common.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
assert.ok(common.includes('fi fi-${iso2}'),'Flags must use browser-safe SVG flag classes');
assert.ok(common.includes('<small>{code}</small>'),'Flags need a country-code fallback');
assert.ok(css.includes('.rarity-generational{background:#b72b35'),'Generational rarity must be red');
assert.ok(css.includes('.rarity-legend{background:#d3a52f'),'Legend rarity must be gold');

const world=createUniverse({seed:20260804,startYear:2026,name:'Refinement Validation'});
assertUniqueNames(world);
// Existing saves with duplicate exact names are repaired once without changing IDs.
world.players.WTA[0].firstName=world.players.ATP[0].firstName;
world.players.WTA[0].lastName=world.players.ATP[0].lastName;
world.meta.namesDisambiguated=false;
ensureUniverseData(world);
assertUniqueNames(world);
simulateToEndOfYear(world);
const storage=rivalryStorageStats(world);
assert.ok(storage.permanent>0,'A full season should promote meaningful rivalries');
assert.ok(storage.candidates<=3000,'Temporary rivalry candidate storage must be bounded');
for(const row of Object.values(world.rivalries||{})){
  assert.ok(row.meetings>=5||row.finals>=2||row.majors>=3||(row.meetings>=3&&(row.majors>=1||row.finals>=1)),'Permanent rivalry needs a meaningful meeting history');
  assert.ok((row.highlights||[]).length<=12,'Rivalry pages retain at most twelve notable chapters');
}
for(const player of collectActive(world))assert.ok((player.matchHistory||[]).length<=96,'Recent detailed match history must remain capped');
const rivalryPlayer=collectActive(world).find(player=>Object.values(world.rivalries||{}).some(row=>row.playerAId===player.id||row.playerBId===player.id));
assert.ok(rivalryPlayer,'Expected at least one player with a permanent rivalry');
const extremes=rivalryExtremes(world,rivalryPlayer.id,5);
assert.ok(extremes.positive.length<=5&&extremes.negative.length<=5,'Player page shows at most five rivalries per side');
assert.ok(extremes.positive.every(row=>row.balance>0),'Positive list cannot contain neutral/negative balances');
assert.ok(extremes.negative.every(row=>row.balance<0),'Negative list cannot contain neutral/positive balances');

const strongCountries=new Set(['USA','ESP','FRA','ITA','AUS','GER','GBR','RUS','SRB','CZE','CHN','CAN','JPN','POL','ARG','CRO','ROU','UKR','SUI','BEL']);
const tinyCountries=new Set(['ERI','ETH','KEN','PHI','THA','UZB','GEO']);
let eliteTotal=0,strongElite=0,tinyElite=0,tinyRepeatWorlds=0;
const countryCounts={};
for(let index=0;index<50;index+=1){
  const sample=createUniverse({seed:881000+index,startYear:2026});
  assertUniqueNames(sample);
  const elite=[...sample.players.ATP,...sample.players.WTA].filter(player=>['Generational','Legend','Epic'].includes(player.rarity));
  const tinyByCountry={};
  for(const player of elite){
    eliteTotal+=1;countryCounts[player.country]=(countryCounts[player.country]||0)+1;
    if(strongCountries.has(player.country))strongElite+=1;
    if(tinyCountries.has(player.country)){tinyElite+=1;tinyByCountry[player.country]=(tinyByCountry[player.country]||0)+1;}
  }
  if(Object.values(tinyByCountry).some(count=>count>=2))tinyRepeatWorlds+=1;
}
const strongShare=strongElite/eliteTotal;
const tinyShare=tinyElite/eliteTotal;
assert.ok(strongShare>=.62,`Elite country weighting too flat: ${(strongShare*100).toFixed(1)}%`);
assert.ok(tinyShare<=.04,`Tiny-country elite frequency too high: ${(tinyShare*100).toFixed(1)}%`);
assert.ok(tinyRepeatWorlds<=4,`Elite clustering in tiny nations too common: ${tinyRepeatWorlds}/50 worlds`);

console.log('Refinement validation passed',{
  flags:COUNTRIES.length,
  permanentRivalries:storage.permanent,
  temporaryCandidates:storage.candidates,
  eliteSample:eliteTotal,
  strongCountryShare:`${(strongShare*100).toFixed(1)}%`,
  tinyCountryShare:`${(tinyShare*100).toFixed(1)}%`,
  tinyRepeatWorlds,
  topEliteOrigins:Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,8),
});
