import { createUniverse } from '../src/sim/generation.js';
import { rebuildDoublesTeams } from '../src/sim/doubles.js';
import { RNG } from '../src/sim/random.js';
import { simulateOneYear } from '../src/sim/season.js';

const world=createUniverse({seed:771947,startYear:2026,name:'Validation World'});
const rng=new RNG(world.rngSeed);
rebuildDoublesTeams(world,'ATP',rng);rebuildDoublesTeams(world,'WTA',rng);world.rngSeed=rng.seed;
const outputs=[];
for(let i=0;i<5;i+=1){
  simulateOneYear(world);
  outputs.push({
    year:world.year,
    ATPNo1:`${world.players.ATP[0].firstName} ${world.players.ATP[0].lastName}`,
    WTANo1:`${world.players.WTA[0].firstName} ${world.players.WTA[0].lastName}`,
    ATPGenerational:world.players.ATP.filter(p=>p.rarity==='Generational').length,
    WTAGenerational:world.players.WTA.filter(p=>p.rarity==='Generational').length,
    promoted:world.transition.promoted.length,
    doublesConversions:world.transition.doublesConversions.length,
    rosterIntegrity:world.players.ATP.length===360&&world.players.WTA.length===360,
  });
}
console.table(outputs);
