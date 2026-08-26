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
  createGenerationContext,
  addFame,
} from './generation.js';
import { buildCalendar, buildJuniorCalendar } from '../data/calendar.js';
import { ensureUniverseData } from './migrations.js';
import { pruneRivalryCandidates, rivalryForPair } from './rivalries.js';

function absoluteWeek(year,week) { return year * 52 + week; }
function recordRankingSnapshot(universe,phase='end') {
  universe.rankingHistory??=[];
  const snapshot={
    year:universe.year,week:universe.week,phase,
    ATP:universe.players.ATP.slice(0,100).map(p=>({id:p.id,rank:p.ranking,points:p.rankingPoints||0,racePoints:p.season?.racePoints||0})),
    WTA:universe.players.WTA.slice(0,100).map(p=>({id:p.id,rank:p.ranking,points:p.rankingPoints||0,racePoints:p.season?.racePoints||0})),
  };
  const last=universe.rankingHistory.at(-1);
  if(last&&last.year===snapshot.year&&last.week===snapshot.week&&last.phase===phase)universe.rankingHistory[universe.rankingHistory.length-1]=snapshot;
  else universe.rankingHistory.push(snapshot);
  if(universe.rankingHistory.length>1040)universe.rankingHistory.shift();
}

function planTargets(universe,tour,rng){
  const events=universe.calendar.filter(e=>e.tour===tour&&e.level!=='Team');
  const majors=events.filter(e=>e.level==='Grand Slam');
  for(const p of universe.players[tour]){
    const preferred=events.filter(e=>e.surface===p.preferredSurface&&['1000','500','Grand Slam'].includes(e.level));
    const elite=p.ranking<=35;
    const limit=p.skills.endurance<60?10:p.skills.endurance<72?14:elite?18:22;
    const selected=[...majors,...preferred];
    if(elite)selected.push(...events.filter(e=>e.level==='1000'));
    if(p.ranking>70)selected.push(...events.filter(e=>['250','Challenger','WTA 125'].includes(e.level)&&e.surface===p.preferredSurface));
    p.targetEvents=[...new Set(selected.sort((a,b)=>{
      const fitA=(p.surfaceAffinity[a.surface]||70)+(a.level==='Grand Slam'?30:a.level==='1000'?15:0)+rng.normal(0,3);
      const fitB=(p.surfaceAffinity[b.surface]||70)+(b.level==='Grand Slam'?30:b.level==='1000'?15:0)+rng.normal(0,3);
      return fitB-fitA;
    }).slice(0,limit).map(e=>e.name))];
    p.season.intendedTargets=[...p.targetEvents];
  }
}

function ensureAnnualPlans(universe,rng){
  for(const tour of ['ATP','WTA'])if(universe.players[tour].some(p=>!p.targetEvents?.length||p.season?.year!==universe.year))planTargets(universe,tour,rng);
}

function juniorGuestsForEvent(universe,tour,event){
  if(!universe.settings?.juniorProEntries||!['250','500','Challenger','WTA 125','ITF'].includes(event.level))return [];
  const slots=event.level==='ITF'?2:1;
  return [...universe.juniors[tour]].filter(j=>j.age>=17&&j.health>65&&!j.injury&&j.fatigue<60&&(j.rarity==='Generational'||j.rarity==='Legend'||j.proReadiness>=80)).sort((a,b)=>b.proReadiness-a.proReadiness).slice(0,slots);
}

function maybeInjure(universe,player,rng){
  if(!universe.settings?.injuries||player.injury||player.status!=='active')return null;
  const load=(player.fatigue||0)/100;
  const resilience=(player.injuryResilience||75)/100;
  const ageRisk=Math.max(0,(player.age-29)*0.0015);
  const chance=0.0008+load*load*0.022+(1-resilience)*0.012+ageRisk;
  if(rng.next()>=chance)return null;
  const severe=rng.next()<Math.min(.22,.05+load*.2);
  const weeks=severe?rng.int(8,20):rng.int(2,7);
  const type=rng.pick(severe?['shoulder strain','wrist injury','knee injury','back injury']:['muscle strain','ankle sprain','illness','elbow soreness']);
  player.injury={type,weeksRemaining:weeks,totalWeeks:weeks,startYear:universe.year,startWeek:universe.week};
  player.health=clamp(player.health-(severe?rng.int(18,32):rng.int(8,18)),30,100);
  if(weeks>=12){player.protectedRanking=player.ranking;player.protectedRankingUntil={year:universe.year+1,week:universe.week};}
  player.season.withdrawals.push({year:universe.year,week:universe.week,reason:type,weeks});
  return {type,weeks,severe};
}

function addWeeklyStories(universe,tour,beforeRanks){
  const movers=universe.players[tour].map(p=>({p,diff:(beforeRanks.get(p.id)||p.ranking)-p.ranking})).sort((a,b)=>b.diff-a.diff);
  if(movers[0]?.diff>=8)story(universe,'Rankings',`${fullName(movers[0].p)} surges to No. ${movers[0].p.ranking}`,`A rise of ${movers[0].diff} places follows a strong run and changes the ${tour} race.`,2);
  const tired=[...universe.players[tour]].filter(p=>p.fatigue>=75).sort((a,b)=>b.fatigue-a.fatigue)[0];
  if(tired&&universe.week%4===0)story(universe,'Form and fatigue',`${fullName(tired)} reaches the danger zone`,`${fullName(tired)} carries ${Math.round(tired.fatigue)} fatigue and may need to abandon the next planned event.`,2);
}


function pruneRankingPoints(player,year,week) {
  const now=absoluteWeek(year,week);
  player.pointsLog=player.pointsLog.filter(row=>now-absoluteWeek(row.year,row.week)<52);
}

function story(universe,category,headline,body,importance=2,week=universe.week) {
  universe.magazine.unshift({
    id:`story-${universe.year}-${week}-${universe.magazine.length}`,
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
      const score=rng.next()<0.5?'2-0':'2-1';
      matches.push({round,winner:winner.country,loser:loser.country,score,winnerRoster:winner.players.map(p=>p.id),loserRoster:loser.players.map(p=>p.id)});
      for(const p of winner.players){p.career.nationalTeamAppearances=(p.career.nationalTeamAppearances||0)+1;p.career.nationalTeamWins=(p.career.nationalTeamWins||0)+1;}for(const p of loser.players){p.career.nationalTeamAppearances=(p.career.nationalTeamAppearances||0)+1;p.career.nationalTeamLosses=(p.career.nationalTeamLosses||0)+1;}
      next.push(winner);
    }
    alive=next;
  }
  const champion=alive[0];
  const finalist=matches.find(m=>m.round==='F')?.loser;
  universe.nationalTeams[tour].push({year:universe.year,winner:champion.country,finalist,matches,roster:champion.players.map(p=>p.id)});
  for(const p of champion.players){p.career.nationalTeamTitles=(p.career.nationalTeamTitles||0)+1;addFame(p,18);}
  story(universe,'National teams',`${champion.country} captures the ${tour==='ATP'?'Davis':'BJK'} Cup`,`${champion.country} survived the sixteen-nation finals behind a balanced four-player squad.`,4,event.week);
  return {id:event.id,event:{...event,status:'completed'},championCountry:champion.country,matches};
}

function addEventStories(universe,edition,event) {
  if (!edition) return;
  const champion=lookupPlayer(universe,event.tour,edition.championId);
  const finalist=lookupPlayer(universe,event.tour,edition.finalistId);
  if (champion) {
    const magnitude=event.level==='Grand Slam'?5:event.level==='1000'?4:3;
    const context=event.level==='Grand Slam'?` It is major No. ${champion.career.majors}, and the run moves the season record to ${champion.season.wins}-${champion.season.losses}.`:champion.ranking<=10?` The world No. ${champion.ranking} strengthened an elite season.`:'';
    story(universe,'Champions',`${fullName(champion)} wins ${event.name}`,`${fullName(champion)} defeated ${finalist?fullName(finalist):'the finalist'} on ${event.surface.toLowerCase()} to claim a ${event.level} title.${context}`,magnitude,event.week);
    if(champion.junior)story(universe,'Juniors',`${fullName(champion)} breaks through on the professional tour`,`The ${champion.age}-year-old junior converted a limited entry into the ${event.name} title, accelerating the graduation conversation.`,5,event.week);
    if(event.level==='Grand Slam'&&[1,5,10,15,20].includes(champion.career.majors))story(universe,'Record watch',`${fullName(champion)} reaches ${champion.career.majors} major titles`,`The milestone places the ${champion.rarity.toLowerCase()} champion into a new historical tier.`,5,event.week);
    if(finalist){const rivalry=rivalryForPair(universe,champion.id,finalist.id);const meetings=rivalry?.meetings||0;if(meetings>=5)story(universe,'Rivalries',`${fullName(champion)} and ${fullName(finalist)} add another chapter`,`Their ${meetings} career meetings now include the ${event.name} final, with rankings and era leadership increasingly tied to the matchup.`,4,event.week);}
  }
  const juniorBreakthrough=(edition.matches||[]).map(m=>lookupPlayer(universe,event.tour,m.winnerId)).find(p=>p?.junior&&p.career.firstProWin?.event===event.name&&p.career.firstProWin?.year===event.year&&!p.career.firstProWin.announced);
  if(juniorBreakthrough){juniorBreakthrough.career.firstProWin.announced=true;story(universe,'Juniors',`${fullName(juniorBreakthrough)} earns a first professional win`,`${fullName(juniorBreakthrough)} converted a limited junior entry at ${event.name}, defeating ${juniorBreakthrough.career.firstProWin.opponent} and adding a new step to the pro pathway.`,3,event.week);}
  const upset=edition.matches?.find(m=>m.upset);
  if (upset) {
    const winner=lookupPlayer(universe,event.tour,upset.winnerId);
    const loser=lookupPlayer(universe,event.tour,upset.loserId);
    if (winner&&loser) story(universe,'Upset',`${fullName(winner)} shocks No. ${loser.ranking} ${fullName(loser)}`,`${upset.explanation}. The surprise came in the ${upset.round} of ${event.name}, ${upset.score}.`,3,event.week);
  }
}

function updateWeekCondition(universe,tour,playedIds,rng) {
  for (const p of universe.players[tour]) {
    p.universeWeek=universe.week;
    recoveryForWeek(p,playedIds.has(p.id));
    if (p.weeksPlayedConsecutive>=3 && p.skills.endurance<72) p.fatigue=clamp(p.fatigue+8,0,100);
    const injury=maybeInjure(universe,p,rng);
    if(injury)story(universe,'Injuries',`${fullName(p)} sidelined by ${injury.type}`,`${fullName(p)} is expected to miss about ${injury.weeks} weeks${injury.severe?', putting the season at risk':''}.`,injury.severe?4:2);
  }
  for (const p of universe.juniors[tour]) {p.universeWeek=universe.week;recoveryForWeek(p,playedIds.has(p.id));maybeInjure(universe,p,rng);}
  for (const p of universe.doublesPlayers[tour]) {p.universeWeek=universe.week;recoveryForWeek(p,false);maybeInjure(universe,p,rng);}
}

export function simulateWeek(universe) {
  ensureUniverseData(universe);
  if (universe.seasonEnded) return universe;
  const rng=new RNG(universe.rngSeed);
  ensureAnnualPlans(universe,rng);
  const currentEvents=universe.calendar.filter(e=>e.week===universe.week && e.status!=='completed').sort((a,b)=>eventImportance(b)-eventImportance(a));
  const headlineEvent=currentEvents.find(e=>['Grand Slam','1000'].includes(e.level));
  if(headlineEvent&&universe.meta.lastSurfacePreview!==headlineEvent.surface){
    story(universe,'Surface preview',`${headlineEvent.surface} swing begins at ${headlineEvent.name}`,`Movement, serve-return patterns and accumulated fatigue now shift toward ${headlineEvent.surface.toLowerCase()} specialists. Players carrying poor fit or low shape are immediately vulnerable.`,3,universe.week);
    universe.meta.lastSurfacePreview=headlineEvent.surface;
  }
  const juniorEvents=universe.juniorCalendar.filter(e=>e.week===universe.week && e.status!=='completed');
  for (const tour of ['ATP','WTA']) {
    const unavailable=new Set();
    const doublesUnavailable=new Set();
    const playedIds=new Set();
    const beforeRanks=new Map(universe.players[tour].map(p=>[p.id,p.ranking]));
    for (const p of universe.players[tour]) pruneRankingPoints(p,universe.year,universe.week);
    for (const event of currentEvents.filter(e=>e.tour===tour)) {
      if (event.level==='Team') {
        const edition=simulateTeamCup(universe,event,rng);
        universe.tournamentEditions.push(edition);
        event.status='completed';
        continue;
      }
      const guests=juniorGuestsForEvent(universe,tour,event);
      const edition=simulateSinglesEvent([...universe.players[tour],...guests],event,unavailable,rng,universe);
      if (edition) {
        universe.tournamentEditions.push(edition);
        for (const id of edition.entryIds||[]) playedIds.add(id);
        addEventStories(universe,edition,event);
        if(event.level==='Olympics'){
          const final=edition.matches.find(m=>m.round==='F');const semis=edition.matches.filter(m=>m.round==='SF');
          universe.olympicsHistory??=[];universe.olympicsHistory.push({year:universe.year,tour,gold:edition.championId,silver:edition.finalistId,bronze:semis.map(m=>m.loserId),eventId:event.id});
          const medalists=[edition.finalistId,...semis.map(m=>m.loserId)].map(id=>lookupPlayer(universe,tour,id)).filter(Boolean);for(const p of medalists){p.career.olympicMedals=(p.career.olympicMedals||0)+1;addFame(p,p.id===edition.finalistId?22:12);}
        }
        const doubles=simulateDoublesEvent(universe,event,rng,doublesUnavailable);
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
    updateWeekCondition(universe,tour,playedIds,rng);
    refreshRankings(universe.players[tour]);
    refreshJuniorRankings(universe.juniors[tour]);
    refreshDoublesRankings([...universe.doublesPlayers[tour],...universe.players[tour].filter(p=>(p.doublesPoints||0)>0||p.doublesFocus==='primary')]);
    const no1=universe.players[tour][0];
    if (no1) {no1.career.weeksNo1+=1;addFame(no1,1);}
    addWeeklyStories(universe,tour,beforeRanks);
  }
  recordRankingSnapshot(universe,'end');
  // Keep temporary one-off matchup storage bounded during the season, not
  // only at year end. Permanent rivalries remain compact aggregates.
  if(universe.week%13===0)pruneRivalryCandidates(universe,universe.year);
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
  const no1=players[0];if(no1)no1.career.yearEndNo1+=1;
  const score=p=>p.season.majors*4500+p.season.titles*700+p.season.wins*35+p.rankingPoints;
  const seasonMvp=[...players].sort((a,b)=>score(b)-score(a))[0];
  const bestYoung=[...players].filter(p=>p.age<=21).sort((a,b)=>b.rankingPoints-a.rankingPoints)[0];
  const improved=[...players].sort((a,b)=>((b.season.startRanking||999)-b.ranking)-((a.season.startRanking||999)-a.ranking))[0];
  const comeback=[...players].filter(p=>p.season.withdrawals?.length||p.health<90).sort((a,b)=>b.season.wins-a.season.wins)[0];
  const surfaceKings={};for(const surface of ['Hard','Clay','Grass','Indoor'])surfaceKings[surface]=[...players].sort((a,b)=>(b.season.surfaceWins?.[surface]||0)-(a.season.surfaceWins?.[surface]||0))[0];
  const award={tour,year:universe.year,
    yearEndNo1:no1?{id:no1.id,name:fullName(no1),country:no1.country,points:no1.rankingPoints}:null,
    playerOfYear:seasonMvp?{id:seasonMvp.id,name:fullName(seasonMvp),country:seasonMvp.country,majors:seasonMvp.season.majors,titles:seasonMvp.season.titles}:null,
    newcomer:bestYoung?{id:bestYoung.id,name:fullName(bestYoung),country:bestYoung.country,rank:bestYoung.ranking}:null,
    mostImproved:improved?{id:improved.id,name:fullName(improved),from:improved.season.startRanking,to:improved.ranking}:null,
    comeback:comeback?{id:comeback.id,name:fullName(comeback),wins:comeback.season.wins}:null,
    surfaceKings:Object.fromEntries(Object.entries(surfaceKings).map(([surface,p])=>[surface,p?{id:p.id,name:fullName(p),wins:p.season.surfaceWins?.[surface]||0}:null]))
  };
  for(const [name,row] of [['Player of the Year',award.playerOfYear],['Year-end No. 1',award.yearEndNo1],['Newcomer',award.newcomer],['Most Improved',award.mostImproved]])if(row){const p=players.find(x=>x.id===row.id);p?.career.awards?.push({year:universe.year,name});}
  return award;
}

function archiveSeasonDetails(universe,year) {
  const archiveEdition=edition=>{
    if(edition.event?.year!==year||edition.archived)return;
    const final=(edition.matches||[]).find(m=>m.round==='F')||(edition.matches||[]).at(-1);
    edition.finalScore=edition.finalScore||final?.score||null;
    edition.matchCount=(edition.matches||[]).length;
    if(edition.championCountry&&!edition.championId)edition.finalistCountry=edition.finalistCountry||final?.loser||null;
    edition.archived=true;
    edition.matches=[];
    edition.qualifyingMatches=[];
    delete edition.entryIds;delete edition.entryMeta;delete edition.seeds;
  };
  for(const edition of universe.tournamentEditions||[])archiveEdition(edition);
  for(const edition of universe.doublesEditions||[])archiveEdition(edition);
  for(const edition of universe.juniorEditions||[])archiveEdition(edition);
  const participants=[...(universe.players?.ATP||[]),...(universe.players?.WTA||[]),...(universe.doublesPlayers?.ATP||[]),...(universe.doublesPlayers?.WTA||[]),...(universe.juniors?.ATP||[]),...(universe.juniors?.WTA||[])];
  for(const player of participants){
    if(player.season?.year===year){
      player.season.results=[];
      player.season.withdrawals=[];
      player.season.intendedTargets=[];
    }
    if(player.doublesSeason?.year===year){
      player.doublesSeason.titleList=(player.doublesSeason.results||[]).filter(row=>row.round==='W').map(row=>({event:row.event,level:row.level,surface:row.surface,partnerNames:row.partnerNames||[]}));
      player.doublesSeason.results=[];
    }
  }
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
    rankingTop10:Object.fromEntries(['ATP','WTA'].map(t=>[t,universe.players[t].slice(0,10).map(p=>({id:p.id,name:fullName(p),country:p.country,rank:p.ranking,points:p.rankingPoints}))])),
    doublesChampions:universe.doublesEditions.filter(e=>e.event.year===universe.year&&e.event.level==='Grand Slam').map(e=>({tour:e.event.tour,event:e.event.name,names:e.championNames,countries:e.championCountries})),
    olympics:(universe.olympicsHistory||[]).filter(e=>e.year===universe.year),
    era:Object.fromEntries(['ATP','WTA'].map(t=>{const winners=majorWinners.filter(m=>m.tour===t),counts={};for(const m of winners)counts[m.winner]=(counts[m.winner]||0)+1;const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];return [t,top?.[1]>=3?`Dominant champion: ${top[0]}`:new Set(winners.map(m=>m.winner)).size>=4?'Open field':'Shared elite era'];})),
  };
  universe.yearSummaries.push(summary);
  story(universe,'Season review',`${universe.year} season complete`,`${awards.map(a=>a.yearEndNo1?.name).filter(Boolean).join(' and ')} finish the year at No. 1.`,5,52);
  for(const award of awards){if(award.comeback)story(universe,'Comebacks',`${award.comeback.name} authors the ${award.tour} comeback of the year`,`${award.comeback.wins} wins after injury or health disruption made the season one of the year's most resilient stories.`,3,52);story(universe,'Era watch',`${award.tour}: ${summary.era[award.tour]}`,`The major distribution, ranking leadership and elite field define the ${universe.year} season as a ${summary.era[award.tour].toLowerCase()} period.`,3,52);}
  pruneRivalryCandidates(universe,universe.year);
  archiveSeasonDetails(universe,universe.year);
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
  const inclination=((player.retirementInclination||55)-55)*0.0025;
  return rng.next()<clamp(ageChance+decline+successProtection+inclination,0.015,0.50);
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
      retired.push({id:player.id,tour,name:fullName(player),country:player.country,age:player.age,rarity:player.rarity,reason:'Singles retirement',career:{...player.career}});
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
      retired.push({id:player.id,tour,name:fullName(player),country:player.country,age:player.age,rarity:player.rarity,reason:'Doubles retirement'});
    } else {
      player.age+=1;
      recalculatePlayer(player);
      player.doublesRating=round1((player.skills.serve*.20+player.skills.return*.18+player.skills.volley*.22+player.skills.tactics*.16+player.skills.mentality*.12+player.skills.footwork*.12)*player.currentMultiplier);
      player.doublesPoints=Math.round((player.doublesPoints||0)*0.55);
      resetSeason(player,newYear);
      kept.push(player);
    }
  }
  universe.doublesPlayers[tour]=kept;
  return retired;
}


function convertMidCareerSinglesToDoubles(universe,tour,rng,newYear){
  const room=Math.max(0,DOUBLES_CAP-universe.doublesPlayers[tour].length);
  if(!room)return [];
  const candidates=[...universe.players[tour]].filter(p=>p.age>=24&&p.age<=30&&p.ranking>65&&['Epic','Rare','Uncommon'].includes(p.rarity)&&p.doublesPotential>=86&&p.status==='active')
    .sort((a,b)=>(b.doublesPotential+b.skills.volley*.18+b.skills.tactics*.12-b.ranking*.025)-(a.doublesPotential+a.skills.volley*.18+a.skills.tactics*.12-a.ranking*.025));
  const selected=[];
  for(const player of candidates){
    if(selected.length>=Math.min(room,2))break;
    const chance=clamp(.12+(player.doublesPotential-86)*.025+Math.max(0,player.ranking-80)*.0015+(player.doublesFocus==='primary'?.22:0),.12,.72);
    if(rng.next()>chance)continue;
    selected.push(player);
  }
  if(!selected.length)return [];
  const ids=new Set(selected.map(p=>p.id));
  universe.players[tour]=universe.players[tour].filter(p=>!ids.has(p.id));
  for(const player of selected){
    resetSeason(player,newYear);
    player.doublesSpecialist=true;
    player.doublesFocus='primary';
    player.career.singlesRetirementYear=newYear-1;
    player.career.doublesConversionYear=newYear;
    player.ranking=999;player.previousRanking=999;player.rankingPoints=0;player.carryPoints=0;player.pointsLog=[];
    player.doublesRating=round1((player.skills.serve*.20+player.skills.return*.18+player.skills.volley*.22+player.skills.tactics*.18+player.skills.mentality*.12+player.skills.footwork*.10)*player.currentMultiplier);
    player.doublesTacticalRating=player.doublesRating;
    player.doublesShape=clamp((player.doublesShape??player.shape)+6,35,90);
    player.doublesPoints=Math.max(player.doublesPoints||0,Math.round(Math.max(0,player.doublesRating-55)**2*.6));
    player.doublesCareer={matches:player.career.doublesMatches||0,wins:player.career.doublesWins||0,losses:player.career.doublesLosses||0,titles:player.career.doublesTitles||0,majors:player.career.doublesMajors||0,weeksNo1:player.career.doublesWeeksNo1||0,peakRanking:player.career.doublesPeakRanking||999};
    player.notes=[...(player.notes||[]),`Converted from singles to full-time doubles in ${newYear}.`];
    universe.doublesPlayers[tour].push(player);
  }
  return selected.map(player=>({id:player.id,tour,name:fullName(player),country:player.country,age:player.age,rarity:player.rarity,rating:player.doublesRating,reason:'Mid-career singles-to-doubles pivot'}));
}

function prepareJuniorForPro(junior,newYear) {
  junior.junior=false;
  junior.status='active';
  junior.ranking=999;
  junior.previousRanking=999;
  junior.carryPoints=0;
  junior.pointsLog=[];
  junior.rankingPoints=0;
  junior.shape=clamp(junior.shape+5,0,100);
  junior.fatigue=0;
  junior.lastPlayedWeek=0;
  junior.season={year:newYear,matches:0,wins:0,losses:0,titles:0,majors:0,points:0,racePoints:0,tournaments:0,surfaceWins:{Hard:0,Clay:0,Grass:0,Indoor:0},surfaceLosses:{Hard:0,Clay:0,Grass:0,Indoor:0},results:[],withdrawals:[],intendedTargets:[],bestRanking:999,startRanking:999};
  junior.notes=[...(junior.notes||[]),`Promoted to the ${junior.tour} singles circuit in ${newYear}.`];
  return junior;
}

function processTourTransition(universe,tour,rng,newYear) {
  const retired=retireSinglesAndAge(universe,tour,rng,newYear);
  const doublesRetired=ageAndRetireDoubles(universe,tour,rng,newYear);
  const midCareerConversions=convertMidCareerSinglesToDoubles(universe,tour,rng,newYear);
  const generationContext=createGenerationContext([...(universe.players[tour]||[]),...(universe.juniors[tour]||[]),...(universe.doublesPlayers[tour]||[]),...(universe.retiredPlayers?.[tour]||[])],tour);
  const vacancies=SINGLES_CAP-universe.players[tour].length;
  const activeGenerational=universe.players[tour].filter(p=>p.rarity==='Generational').length;
  let genSlots=Math.max(0,2-activeGenerational);
  for (const j of universe.juniors[tour]) {
    j.age+=1;
    j.juniorPoints=Math.round((j.juniorPoints||0)*.32);
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
    const replacement=createJunior(rng,tour,9000+emergencyIndex++,newYear,emergencyRarity,19,generationContext);
    universe.players[tour].push(prepareJuniorForPro(replacement,newYear));
    promoted.push(replacement);
  }
  if (universe.players[tour].length>SINGLES_CAP) universe.players[tour].length=SINGLES_CAP;

  const ageOut=universe.juniors[tour].filter(j=>j.age>19).sort((a,b)=>b.doublesPotential-a.doublesPotential);
  const ageOutIds=new Set(ageOut.map(j=>j.id));
  universe.juniors[tour]=universe.juniors[tour].filter(j=>!ageOutIds.has(j.id));
  const doublesConversions=[...midCareerConversions];
  const overflowRetired=[];
  let doublesIndex=universe.doublesPlayers[tour].length;
  for (const junior of ageOut) {
    if (universe.doublesPlayers[tour].length<DOUBLES_CAP) {
      const converted=createDoublesPlayer(rng,tour,doublesIndex++,newYear,junior,generationContext);
      converted.notes=[...(converted.notes||[]),`Moved into doubles after the ${tour} singles field remained at 360.`];
      universe.doublesPlayers[tour].push(converted);
      doublesConversions.push({id:converted.id,tour,name:fullName(converted),country:converted.country,age:converted.age,rarity:converted.rarity,rating:converted.doublesRating});
    } else {
      junior.status='retired';
      junior.retirementYear=newYear-1;
      universe.retiredPlayers??={ATP:[],WTA:[]};
      universe.retiredPlayers[tour].push({...junior,careerType:'junior-age-out'});
      overflowRetired.push({id:junior.id,tour,name:fullName(junior),country:junior.country,age:junior.age,rarity:junior.rarity,reason:'No singles or doubles roster place available'});
    }
  }

  // If doubles retirements created more room than the age-out class can fill, generate lower-tour specialists.
  while (universe.doublesPlayers[tour].length<DOUBLES_CAP) {
    universe.doublesPlayers[tour].push(createDoublesPlayer(rng,tour,doublesIndex++,newYear,null,generationContext));
  }
  if (universe.doublesPlayers[tour].length>DOUBLES_CAP) universe.doublesPlayers[tour].length=DOUBLES_CAP;

  const newJuniors=[];
  let juniorIndex=universe.juniors[tour].length;
  while (universe.juniors[tour].length<JUNIOR_TARGET) {
    const newcomer=createJunior(rng,tour,juniorIndex++,newYear,null,rng.next()<0.72?15:16,generationContext);
    universe.juniors[tour].push(newcomer);
    newJuniors.push({id:newcomer.id,tour,name:fullName(newcomer),country:newcomer.country,age:newcomer.age,rarity:newcomer.rarity,rating:newcomer.currentRating});
  }
  if (universe.juniors[tour].length>JUNIOR_TARGET) universe.juniors[tour].sort((a,b)=>b.proReadiness-a.proReadiness).splice(JUNIOR_TARGET);

  for (const player of universe.players[tour]) {
    resetSeason(player,newYear);
    player.carryPoints=0;
    player.pointsLog=player.pointsLog.filter(row=>row.year>=newYear-1);
    player.lastPlayedWeek=0;
    player.targetEvents=[];
    player.protectedRankingUntil=player.protectedRankingUntil&&player.protectedRankingUntil.year>=newYear?player.protectedRankingUntil:null;
    if(!player.protectedRankingUntil)player.protectedRanking=null;
    if(player.age>=24&&player.age<=30&&player.ranking>35&&player.doublesPotential>=86)player.doublesFocus=rng.next()<0.35?'primary':player.doublesFocus;
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
  refreshDoublesRankings([...universe.doublesPlayers[tour],...universe.players[tour].filter(p=>(p.doublesPoints||0)>0||p.doublesFocus==='primary')],{countWeek:false});
  rebuildDoublesTeams(universe,tour,rng);
  return {retired:[...retired,...doublesRetired],promoted:promoted.map(p=>({id:p.id,tour,name:fullName(p),country:p.country,age:p.age,rarity:p.rarity,rating:p.currentRating})),doublesConversions,overflowRetired,newJuniors};
}

function hallOfFameProfile(player){
  const c=player.career||{},dc=player.doublesCareer||{};
  const majorTitles=(c.titleLog||[]).filter(row=>row.level==='Grand Slam');
  const uniqueMajors=new Set(majorTitles.map(row=>row.event)).size;
  const doublesMajors=dc.majors||c.doublesMajors||0,doublesTitles=dc.titles||c.doublesTitles||0,doublesWeeks=dc.weeksNo1||c.doublesWeeksNo1||0;
  const singlesQualified=(c.majors||0)>=4||uniqueMajors>=3||(c.weeksNo1||0)>=52||((c.majors||0)>=2&&(c.weeksNo1||0)>=20)||((c.titles||0)>=30&&(c.weeksNo1||0)>=10)||(c.olympicGolds||0)>=1&&(c.majors||0)>=2;
  const doublesQualified=doublesMajors>=6||(doublesMajors>=4&&doublesWeeks>=30)||(doublesTitles>=45&&doublesWeeks>=20);
  const score=(c.majors||0)*45+uniqueMajors*18+(c.weeksNo1||0)*.55+(c.yearEndNo1||0)*18+(c.titles||0)*2.2+(c.masters||0)*3+(c.olympicGolds||0)*20+doublesMajors*22+doublesWeeks*.2+doublesTitles*.7+(player.fame||0)*.025;
  const reasons=[];if((c.majors||0)>0)reasons.push(`${c.majors} Grand Slams`);if(uniqueMajors>=2)reasons.push(`${uniqueMajors} different majors`);if((c.weeksNo1||0)>0)reasons.push(`${c.weeksNo1} weeks No. 1`);if((c.titles||0)>=20)reasons.push(`${c.titles} singles titles`);if(doublesMajors>=4)reasons.push(`${doublesMajors} doubles majors`);if(doublesWeeks>=20)reasons.push(`${doublesWeeks} doubles weeks No. 1`);
  return {qualified:singlesQualified||doublesQualified,score,uniqueMajors,reasons};
}

function inductHallOfFame(universe,newYear){
  universe.hallOfFame??=[];const inductedIds=new Set(universe.hallOfFame.map(row=>row.playerId));
  const candidates=['ATP','WTA'].flatMap(tour=>(universe.retiredPlayers?.[tour]||[]).map(player=>({player,tour,profile:hallOfFameProfile(player)}))).filter(row=>row.profile.qualified&&!inductedIds.has(row.player.id)).sort((a,b)=>b.profile.score-a.profile.score).slice(0,5);
  const classRows=candidates.map(({player,tour,profile})=>({playerId:player.id,tour,name:fullName(player),country:player.country,rarity:player.rarity,inductionYear:newYear,retirementYear:player.retirementYear||newYear-1,fame:player.fame||0,score:Math.round(profile.score),reasons:profile.reasons,career:{titles:player.career?.titles||0,majors:player.career?.majors||0,weeksNo1:player.career?.weeksNo1||0,yearEndNo1:player.career?.yearEndNo1||0,peakRanking:player.career?.peakRanking||999,doublesMajors:player.doublesCareer?.majors||player.career?.doublesMajors||0}}));
  universe.hallOfFame.push(...classRows);return classRows;
}

export function openNextSeason(universe,{fromOneYear=false}={}) {
  if (!universe.seasonEnded) simulateToEndOfYear(universe);
  const previousSummary=universe.transition?.yearSummary || universe.yearSummaries[universe.yearSummaries.length-1];
  const rng=new RNG(universe.rngSeed);
  const newYear=universe.year+1;
  const atp=processTourTransition(universe,'ATP',rng,newYear);
  const wta=processTourTransition(universe,'WTA',rng,newYear);
  const hallOfFameClass=inductHallOfFame(universe,newYear);
  universe.year=newYear;
  universe.week=1;
  universe.seasonEnded=false;
  universe.calendar=buildCalendar(newYear);
  universe.juniorCalendar=buildJuniorCalendar(newYear);
  universe.rngSeed=rng.seed;
  recordRankingSnapshot(universe,'start');
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
    message:`The ${newYear} season begins with both singles circuits fixed at 360 players. ${atp.promoted.length+wta.promoted.length} juniors earned singles places; ${atp.doublesConversions.length+wta.doublesConversions.length} players moved into doubles.`,
    newJuniors:[...atp.newJuniors,...wta.newJuniors],
    promoted:[...atp.promoted,...wta.promoted],
    doublesConversions:[...atp.doublesConversions,...wta.doublesConversions],
    retired:[...atp.retired,...wta.retired],
    overflowRetired:[...atp.overflowRetired,...wta.overflowRetired],
    hallOfFameClass,
  };
  story(universe,'New season',`${newYear} begins with a new generation`,universe.transition.message,5,1);
  if(universe.transition.retired.length)story(universe,'Retirements',`${universe.transition.retired.length} careers close at the turn of the year`,universe.transition.retired.slice(0,4).map(r=>`${r.name} (${r.tour})`).join(', ')+(universe.transition.retired.length>4?' and others leave the circuit.':' leave the circuit.'),4,1);
  if(universe.transition.promoted.length)story(universe,'Juniors',`${universe.transition.promoted.length} juniors earn singles places`,universe.transition.promoted.slice(0,4).map(r=>r.name).join(', ')+' lead the graduation class.',4,1);
  if(universe.transition.doublesConversions.length)story(universe,'Doubles',`${universe.transition.doublesConversions.length} players choose doubles`,universe.transition.doublesConversions.slice(0,4).map(r=>r.name).join(', ')+' begin or continue a full-time doubles pathway as singles places remain limited.',3,1);
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
