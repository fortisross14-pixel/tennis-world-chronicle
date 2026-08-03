import { RNG, clamp, round1 } from './random.js';
import { recoveryForWeek } from './match.js';
import { simulateSinglesEvent, simulateJuniorEvent, eventImportance } from './tournament.js';
import { rebuildDoublesTeams, simulateDoublesEvent } from './doubles.js';
import {
  SINGLES_CAP,
  DOUBLES_CAP,
  JUNIOR_TARGET,
  createJunior,
  createDoublesPlayer,
  recalculatePlayer,
  refreshRankings,
  refreshJuniorRankings,
  refreshDoublesRankings,
  resetSeason,
  fullName,
} from './generation.js';
import { buildCalendar, buildJuniorCalendar } from '../data/calendar.js';

function absoluteWeek(year,week) { return year * 52 + week; }

function pruneRankingPoints(player,year,week) {
  const now=absoluteWeek(year,week);
  player.pointsLog=player.pointsLog.filter(row=>now-absoluteWeek(row.year,row.week)<52);
}

function story(universe,category,headline,body,importance=2,week=universe.week) {
  universe.magazine.unshift({
    id:`story-${universe.year}-${week}-${universe.magazine.length}-${Math.random().toString(36).slice(2,7)}`,
    year:universe.year,
    week,
    category,
    headline,
    body,
    importance,
  });
  if (universe.magazine.length>500) universe.magazine.length=500;
}

function lookupPlayer(universe,tour,id) {
  return universe.players[tour].find(p=>p.id===id) || universe.juniors[tour].find(p=>p.id===id) || universe.doublesPlayers[tour].find(p=>p.id===id) || universe.retiredPlayers?.[tour]?.find(p=>p.id===id);
}

function simulateTeamCup(universe,event,rng) {
  const tour=event.tour;
  const byCountry=new Map();
  for (const p of universe.players[tour]) {
    if (!byCountry.has(p.country)) byCountry.set(p.country,[]);
    byCountry.get(p.country).push(p);
  }
  const teams=[...byCountry.entries()].map(([country,players])=>{
    const top=players.sort((a,b)=>a.ranking-b.ranking).slice(0,4);
    const rating=top.reduce((sum,p)=>sum+p.currentRating+(100-p.ranking)*0.025,0)/Math.max(1,top.length);
    return {country,players:top,rating};
  }).filter(t=>t.players.length>=2).sort((a,b)=>b.rating-a.rating).slice(0,16);
  let alive=rng.shuffle(teams);
  const rounds=['R16','QF','SF','F'];
  const matches=[];
  for (const round of rounds) {
    const next=[];
    for (let i=0;i<alive.length;i+=2) {
      const a=alive[i],b=alive[i+1];
      const pA=1/(1+Math.exp(-((a.rating-b.rating)+rng.normal(0,2.5))/6));
      const winner=rng.next()<pA?a:b;
      const loser=winner===a?b:a;
      matches.push({round,winner:winner.country,loser:loser.country,score:rng.next()<0.5?'2-0':'2-1'});
      next.push(winner);
    }
    alive=next;
  }
  const champion=alive[0];
  universe.nationalTeams[tour].push({year:universe.year,winner:champion.country,matches});
  story(universe,'National teams',`${champion.country} captures the ${tour==='ATP'?'Davis':'BJK'} Cup`,`${champion.country} survived the sixteen-nation finals behind a balanced four-player squad.`,4,event.week);
  return {id:event.id,event:{...event,status:'completed'},championCountry:champion.country,matches};
}

function addEventStories(universe,edition,event) {
  if (!edition) return;
  const champion=lookupPlayer(universe,event.tour,edition.championId);
  const finalist=lookupPlayer(universe,event.tour,edition.finalistId);
  if (champion) {
    const magnitude=event.level==='Grand Slam'?5:event.level==='1000'?4:3;
    story(universe,'Champions',`${fullName(champion)} wins ${event.name}`,`${fullName(champion)} defeated ${finalist?fullName(finalist):'the finalist'} on ${event.surface.toLowerCase()} to claim a ${event.level} title.`,magnitude,event.week);
  }
  const upset=edition.matches?.find(m=>m.upset);
  if (upset) {
    const winner=lookupPlayer(universe,event.tour,upset.winnerId);
    const loser=lookupPlayer(universe,event.tour,upset.loserId);
    if (winner&&loser) story(universe,'Upset',`${fullName(winner)} shocks No. ${loser.ranking} ${fullName(loser)}`,`${upset.explanation}. The surprise came in the ${upset.round} of ${event.name}, ${upset.score}.`,3,event.week);
  }
}

function updateWeekCondition(universe,tour,playedIds) {
  for (const p of universe.players[tour]) {
    p.universeWeek=universe.week;
    recoveryForWeek(p,playedIds.has(p.id));
    if (p.weeksPlayedConsecutive>=3 && p.skills.endurance<72) p.fatigue=clamp(p.fatigue+8,0,100);
  }
  for (const p of universe.juniors[tour]) {
    p.universeWeek=universe.week;
    recoveryForWeek(p,playedIds.has(p.id));
  }
}

export function simulateWeek(universe) {
  if (universe.seasonEnded) return universe;
  const rng=new RNG(universe.rngSeed);
  const currentEvents=universe.calendar.filter(e=>e.week===universe.week && e.status!=='completed').sort((a,b)=>eventImportance(b)-eventImportance(a));
  const juniorEvents=universe.juniorCalendar.filter(e=>e.week===universe.week && e.status!=='completed');
  for (const tour of ['ATP','WTA']) {
    const unavailable=new Set();
    const playedIds=new Set();
    for (const p of universe.players[tour]) pruneRankingPoints(p,universe.year,universe.week);
    for (const event of currentEvents.filter(e=>e.tour===tour)) {
      if (event.level==='Team') {
        const edition=simulateTeamCup(universe,event,rng);
        universe.tournamentEditions.push(edition);
        event.status='completed';
        continue;
      }
      const edition=simulateSinglesEvent(universe.players[tour],event,unavailable,rng);
      if (edition) {
        universe.tournamentEditions.push(edition);
        for (const id of edition.entryIds||[]) playedIds.add(id);
        addEventStories(universe,edition,event);
        const doubles=simulateDoublesEvent(universe,event,rng);
        if (doubles) {
          universe.doublesEditions.push(doubles);
          story(universe,'Doubles',`${doubles.championNames.join(' / ')} win ${event.name} doubles`,`${doubles.championNames.join(' and ')} combined chemistry and net play to take the title.`,event.level==='Grand Slam'?4:2,event.week);
        }
      }
      event.status='completed';
    }
    for (const event of juniorEvents.filter(e=>e.tour===tour)) {
      const edition=simulateJuniorEvent(universe.juniors[tour],event,rng);
      if (edition) {
        universe.juniorEditions.push(edition);
        story(universe,'Juniors',`${edition.championName} wins ${event.name}`,`The ${lookupPlayer(universe,tour,edition.championId)?.age || ''}-year-old prospect added an important junior title on ${event.surface.toLowerCase()}.`,2,event.week);
      }
      event.status='completed';
    }
    updateWeekCondition(universe,tour,playedIds);
    refreshRankings(universe.players[tour]);
    refreshJuniorRankings(universe.juniors[tour]);
    refreshDoublesRankings(universe.doublesPlayers[tour]);
    const no1=universe.players[tour][0];
    if (no1) no1.career.weeksNo1+=1;
  }
  universe.rankingHistory.push({
    year:universe.year,
    week:universe.week,
    ATP:universe.players.ATP.slice(0,20).map(p=>({id:p.id,rank:p.ranking,points:p.rankingPoints})),
    WTA:universe.players.WTA.slice(0,20).map(p=>({id:p.id,rank:p.ranking,points:p.rankingPoints})),
  });
  if (universe.rankingHistory.length>1040) universe.rankingHistory.shift();
  universe.meta.simulations+=1;
  universe.meta.updatedAt=new Date().toISOString();
  universe.rngSeed=rng.seed;
  if (universe.week>=52) {
    universe.seasonEnded=true;
    universe.transition=buildYearEndTransition(universe);
  } else {
    universe.week+=1;
  }
  return universe;
}

export function advanceWeeks(universe,count=4) {
  let remaining=count;
  while (remaining>0&&!universe.seasonEnded) {
    simulateWeek(universe);
    remaining-=1;
  }
  return universe;
}

export function simulateToEndOfYear(universe) {
  while (!universe.seasonEnded) simulateWeek(universe);
  return universe;
}

function awardForTour(universe,tour) {
  const players=universe.players[tour];
  const no1=players[0];
  if (no1) no1.career.yearEndNo1+=1;
  const seasonMvp=[...players].sort((a,b)=>(b.season.majors*4500+b.season.titles*700+b.season.wins*35+b.rankingPoints)-(a.season.majors*4500+a.season.titles*700+a.season.wins*35+a.rankingPoints))[0];
  const bestYoung=[...players].filter(p=>p.age<=21).sort((a,b)=>b.rankingPoints-a.rankingPoints)[0];
  return {
    tour,
    yearEndNo1:no1?{id:no1.id,name:fullName(no1),country:no1.country,points:no1.rankingPoints}:null,
    playerOfYear:seasonMvp?{id:seasonMvp.id,name:fullName(seasonMvp),country:seasonMvp.country,majors:seasonMvp.season.majors,titles:seasonMvp.season.titles}:null,
    newcomer:bestYoung?{id:bestYoung.id,name:fullName(bestYoung),country:bestYoung.country,rank:bestYoung.ranking}:null,
  };
}

function buildYearEndTransition(universe) {
  const awards=[awardForTour(universe,'ATP'),awardForTour(universe,'WTA')];
  universe.awards.push(...awards);
  const majorWinners=universe.tournamentEditions.filter(e=>e.event.year===universe.year&&e.event.level==='Grand Slam').map(e=>({tour:e.event.tour,event:e.event.name,winner:e.championName,country:e.championCountry}));
  const summary={
    year:universe.year,
    awards,
    majorWinners,
    totalMatches:['ATP','WTA'].reduce((sum,tour)=>sum+universe.players[tour].reduce((s,p)=>s+p.season.matches,0),0),
    completedEvents:universe.tournamentEditions.filter(e=>e.event.year===universe.year).length,
  };
  universe.yearSummaries.push(summary);
  story(universe,'Season review',`${universe.year} season complete`,`${awards.map(a=>a.yearEndNo1?.name).filter(Boolean).join(' and ')} finish the year at No. 1.`,5,52);
  return {
    mode:'end',
    year:universe.year,
    message:`The ${universe.year} season is complete. Review the champions and rankings before opening the next year.`,
    yearSummary:summary,
    newJuniors:[],promoted:[],doublesConversions:[],retired:[],overflowRetired:[],
  };
}

function shouldRetireSingles(player,rng) {
  if (player.age>=36) return true;
  if (player.age<30) return false;
  const decline=Math.min(0.15,Math.max(0,84-player.currentRating)*0.0045);
  const ageChance=(player.age-29)*0.025;
  const successProtection=player.ranking<=30?-0.10:player.ranking<=80?-0.035:0;
  return rng.next()<clamp(ageChance+decline+successProtection,0.015,0.46);
}

function shouldRetireDoubles(player,rng) {
  if (player.age>=39) return true;
  if (player.age<33) return false;
  return rng.next()<clamp((player.age-32)*0.10+(75-player.doublesRating)*0.01,0.05,0.85);
}

function retireSinglesAndAge(universe,tour,rng,newYear) {
  const kept=[]; const retired=[];
  for (const player of universe.players[tour]) {
    if (shouldRetireSingles(player,rng)) {
      player.status='retired';
      player.retirementYear=newYear-1;
      universe.retiredPlayers??={ATP:[],WTA:[]};
      universe.retiredPlayers[tour].push({...player});
      retired.push({id:player.id,tour,name:fullName(player),country:player.country,age:player.age,reason:'singles retirement',career:{...player.career}});
    } else {
      player.age+=1;
      recalculatePlayer(player);
      kept.push(player);
    }
  }
  universe.players[tour]=kept;
  return retired;
}

function ageAndRetireDoubles(universe,tour,rng,newYear) {
  const kept=[]; const retired=[];
  for (const player of universe.doublesPlayers[tour]) {
    if (shouldRetireDoubles(player,rng)) {
      player.status='retired';
      player.retirementYear=newYear-1;
      universe.retiredPlayers??={ATP:[],WTA:[]};
      universe.retiredPlayers[tour].push({...player,careerType:'doubles'});
      retired.push({id:player.id,tour,name:fullName(player),country:player.country,age:player.age,reason:'doubles retirement'});
    } else {
      player.age+=1;
      recalculatePlayer(player);
      player.doublesRating=round1((player.skills.serve*.20+player.skills.return*.18+player.skills.volley*.22+player.skills.tactics*.16+player.skills.mentality*.12+player.skills.footwork*.12)*player.currentMultiplier);
      player.doublesPoints=Math.round((player.doublesPoints||0)*0.55);
      kept.push(player);
    }
  }
  universe.doublesPlayers[tour]=kept;
  return retired;
}

function prepareJuniorForPro(junior,newYear) {
  junior.junior=false;
  junior.status='active';
  junior.ranking=999;
  junior.previousRanking=999;
  junior.carryPoints=Math.round(Math.max(0,junior.currentRating-55)**2*0.45);
  junior.pointsLog=[];
  junior.rankingPoints=junior.carryPoints;
  junior.shape=clamp(junior.shape+5,0,100);
  junior.fatigue=0;
  junior.lastPlayedWeek=0;
  junior.season={year:newYear,matches:0,wins:0,losses:0,titles:0,majors:0,points:0,tournaments:0,surfaceWins:{Hard:0,Clay:0,Grass:0,Indoor:0},results:[]};
  junior.notes=[...(junior.notes||[]),`Promoted to the ${junior.tour} singles circuit in ${newYear}.`];
  return junior;
}

function processTourTransition(universe,tour,rng,newYear) {
  const retired=retireSinglesAndAge(universe,tour,rng,newYear);
  const doublesRetired=ageAndRetireDoubles(universe,tour,rng,newYear);
  const vacancies=SINGLES_CAP-universe.players[tour].length;
  const activeGenerational=universe.players[tour].filter(p=>p.rarity==='Generational').length;
  let genSlots=Math.max(0,2-activeGenerational);
  for (const j of universe.juniors[tour]) {
    j.age+=1;
    recalculatePlayer(j);
    j.proReadiness=round1(j.currentRating*.78+j.maxRating*.22+(j.age-15)*2.2+j.season.wins*.08);
  }
  const candidates=[...universe.juniors[tour]].filter(j=>j.age>=18).sort((a,b)=>(b.proReadiness+(b.age>=20?10:0))-(a.proReadiness+(a.age>=20?10:0)));
  const promoted=[];
  const promotedIds=new Set();
  for (const junior of candidates) {
    if (promoted.length>=vacancies) break;
    if (junior.rarity==='Generational'&&genSlots<=0) continue;
    if (junior.rarity==='Generational') genSlots-=1;
    promoted.push(prepareJuniorForPro(junior,newYear));
    promotedIds.add(junior.id);
  }
  universe.players[tour].push(...promoted);
  universe.juniors[tour]=universe.juniors[tour].filter(j=>!promotedIds.has(j.id));

  // Emergency entrants only exist to preserve the strict 360-player circuit cap.
  let emergencyIndex=0;
  while (universe.players[tour].length<SINGLES_CAP) {
    const emergencyRarity=rng.next()<0.08?'Rare':rng.next()<0.42?'Uncommon':'Common';
    const replacement=createJunior(rng,tour,9000+emergencyIndex++,newYear,emergencyRarity,19);
    universe.players[tour].push(prepareJuniorForPro(replacement,newYear));
    promoted.push(replacement);
  }
  if (universe.players[tour].length>SINGLES_CAP) universe.players[tour].length=SINGLES_CAP;

  const ageOut=universe.juniors[tour].filter(j=>j.age>19).sort((a,b)=>b.doublesPotential-a.doublesPotential);
  const ageOutIds=new Set(ageOut.map(j=>j.id));
  universe.juniors[tour]=universe.juniors[tour].filter(j=>!ageOutIds.has(j.id));
  const doublesConversions=[];
  const overflowRetired=[];
  let doublesIndex=universe.doublesPlayers[tour].length;
  for (const junior of ageOut) {
    if (universe.doublesPlayers[tour].length<DOUBLES_CAP) {
      const converted=createDoublesPlayer(rng,tour,doublesIndex++,newYear,junior);
      converted.notes=[...(converted.notes||[]),`Moved into doubles after the ${tour} singles field remained at 360.`];
      universe.doublesPlayers[tour].push(converted);
      doublesConversions.push({id:converted.id,tour,name:fullName(converted),country:converted.country,age:converted.age,rarity:converted.rarity,rating:converted.doublesRating});
    } else {
      junior.status='retired';
      junior.retirementYear=newYear-1;
      universe.retiredPlayers??={ATP:[],WTA:[]};
      universe.retiredPlayers[tour].push({...junior,careerType:'junior-age-out'});
      overflowRetired.push({id:junior.id,tour,name:fullName(junior),country:junior.country,age:junior.age,reason:'No singles or doubles roster place available'});
    }
  }

  // If doubles retirements created more room than the age-out class can fill, generate lower-tour specialists.
  while (universe.doublesPlayers[tour].length<DOUBLES_CAP) {
    universe.doublesPlayers[tour].push(createDoublesPlayer(rng,tour,doublesIndex++,newYear));
  }
  if (universe.doublesPlayers[tour].length>DOUBLES_CAP) universe.doublesPlayers[tour].length=DOUBLES_CAP;

  const newJuniors=[];
  let juniorIndex=universe.juniors[tour].length;
  while (universe.juniors[tour].length<JUNIOR_TARGET) {
    const newcomer=createJunior(rng,tour,juniorIndex++,newYear,null,rng.next()<0.72?15:16);
    universe.juniors[tour].push(newcomer);
    newJuniors.push({id:newcomer.id,tour,name:fullName(newcomer),country:newcomer.country,age:newcomer.age,rarity:newcomer.rarity,rating:newcomer.currentRating});
  }
  if (universe.juniors[tour].length>JUNIOR_TARGET) universe.juniors[tour].sort((a,b)=>b.proReadiness-a.proReadiness).splice(JUNIOR_TARGET);

  for (const player of universe.players[tour]) {
    resetSeason(player,newYear);
    player.carryPoints=Math.round((player.carryPoints||0)*0.32);
    player.pointsLog=player.pointsLog.filter(row=>row.year>=newYear-1);
    player.lastPlayedWeek=0;
    player.fatigue=clamp(player.fatigue-40,0,100);
    player.shape=clamp(player.shape-5,35,80);
  }
  for (const junior of universe.juniors[tour]) {
    resetSeason(junior,newYear);
    junior.lastPlayedWeek=0;
    junior.fatigue=clamp(junior.fatigue-35,0,100);
  }
  refreshRankings(universe.players[tour]);
  refreshJuniorRankings(universe.juniors[tour]);
  refreshDoublesRankings(universe.doublesPlayers[tour]);
  rebuildDoublesTeams(universe,tour,rng);
  return {retired:[...retired,...doublesRetired],promoted:promoted.map(p=>({id:p.id,tour,name:fullName(p),country:p.country,age:p.age,rarity:p.rarity,rating:p.currentRating})),doublesConversions,overflowRetired,newJuniors};
}

export function openNextSeason(universe,{fromOneYear=false}={}) {
  if (!universe.seasonEnded) simulateToEndOfYear(universe);
  const previousSummary=universe.transition?.yearSummary || universe.yearSummaries[universe.yearSummaries.length-1];
  const rng=new RNG(universe.rngSeed);
  const newYear=universe.year+1;
  const atp=processTourTransition(universe,'ATP',rng,newYear);
  const wta=processTourTransition(universe,'WTA',rng,newYear);
  universe.year=newYear;
  universe.week=1;
  universe.seasonEnded=false;
  universe.calendar=buildCalendar(newYear);
  universe.juniorCalendar=buildJuniorCalendar(newYear);
  universe.rngSeed=rng.seed;
  if (previousSummary) {
    previousSummary.retired=[...atp.retired,...wta.retired];
    previousSummary.promoted=[...atp.promoted,...wta.promoted];
    previousSummary.doublesConversions=[...atp.doublesConversions,...wta.doublesConversions];
    previousSummary.overflowRetired=[...atp.overflowRetired,...wta.overflowRetired];
  }
  universe.transition={
    mode:fromOneYear?'year':'beginning',
    year:newYear,
    previousYearSummary:previousSummary,
    message:`The ${newYear} season begins with both singles circuits fixed at 360 players. ${atp.promoted.length+wta.promoted.length} juniors earned singles places; ${atp.doublesConversions.length+wta.doublesConversions.length} moved into doubles.`,
    newJuniors:[...atp.newJuniors,...wta.newJuniors],
    promoted:[...atp.promoted,...wta.promoted],
    doublesConversions:[...atp.doublesConversions,...wta.doublesConversions],
    retired:[...atp.retired,...wta.retired],
    overflowRetired:[...atp.overflowRetired,...wta.overflowRetired],
  };
  story(universe,'New season',`${newYear} begins with a new generation`,universe.transition.message,5,1);
  universe.meta.updatedAt=new Date().toISOString();
  return universe;
}

export function simulateOneYear(universe) {
  simulateToEndOfYear(universe);
  openNextSeason(universe,{fromOneYear:true});
  return universe;
}

export function dismissTransition(universe) {
  universe.transition=null;
  return universe;
}
