import { fullName } from './generation.js';

export function allPlayers(universe,tour=null){
  const tours=tour?[tour]:['ATP','WTA'];
  return tours.flatMap(t=>[...(universe.players?.[t]||[]),...(universe.juniors?.[t]||[]),...(universe.doublesPlayers?.[t]||[]),...(universe.retiredPlayers?.[t]||[])]);
}

export function findPlayer(universe,id){return allPlayers(universe).find(p=>p.id===id)||null;}
export function findTournamentEdition(universe,id){return [...(universe.tournamentEditions||[]),...(universe.juniorEditions||[]),...(universe.doublesEditions||[])].find(e=>e.id===id)||null;}
export function tournamentKey(tour,name){return `${tour}|${name}`;}
export function parseTournamentKey(key=''){const [tour,...name]=decodeURIComponent(key).split('|');return {tour,name:name.join('|')};}

export function tournamentFamily(universe,tour,name){
  const mainCalendar=(universe.calendar||[]).find(e=>e.tour===tour&&e.name===name);
  const juniorCalendar=(universe.juniorCalendar||[]).find(e=>e.tour===tour&&e.name===name);
  const singles=(universe.tournamentEditions||[]).filter(e=>e.event?.tour===tour&&e.event?.name===name);
  const juniors=(universe.juniorEditions||[]).filter(e=>e.event?.tour===tour&&e.event?.name===name);
  const doubles=(universe.doublesEditions||[]).filter(e=>e.event?.tour===tour&&e.event?.name===name);
  const kind=mainCalendar?.level==='Team'||singles.some(e=>e.championCountry&&!e.championId)?'team':doubles.length||name.endsWith(' Doubles')?'doubles':juniors.length||juniorCalendar?'junior':'singles';
  const editions=(kind==='doubles'?doubles:kind==='junior'?juniors:singles).sort((a,b)=>b.event.year-a.event.year);
  let calendar=kind==='junior'?juniorCalendar:mainCalendar;
  if(kind==='doubles'&&!calendar){const base=name.replace(/ Doubles$/,'');const source=(universe.calendar||[]).find(e=>e.tour===tour&&e.name===base);if(source)calendar={...source,id:`${source.id}-doubles`,name:`${source.name} Doubles`,drawSize:source.level==='Grand Slam'?64:source.level==='Olympics'?32:source.level==='1000'?32:source.level==='500'?16:8,qualifyingDrawSize:0};}
  return {kind,calendar,editions,current:editions.find(e=>e.event.year===universe.year)||null};
}

export function matchLookup(universe,match){
  return {a:findPlayer(universe,match.playerA||match.winnerId),b:findPlayer(universe,match.playerB||match.loserId),winner:findPlayer(universe,match.winnerId),loser:findPlayer(universe,match.loserId)};
}

export function playerMatches(universe,playerId){
  const rows=[];
  for(const edition of universe.tournamentEditions||[]){
    for(const match of edition.matches||[]){
      if(match.playerA===playerId||match.playerB===playerId||match.winnerId===playerId||match.loserId===playerId) rows.push({...match,event:edition.event,editionId:edition.id});
    }
  }
  return rows.sort((a,b)=>(b.year-a.year)||(b.week-a.week));
}

export function headToHead(universe,playerId){
  const map=new Map();
  for(const match of playerMatches(universe,playerId)){
    const opponentId=match.winnerId===playerId?match.loserId:match.winnerId;
    const row=map.get(opponentId)||{opponentId,wins:0,losses:0,majors:0,last:null};
    if(match.winnerId===playerId)row.wins+=1;else row.losses+=1;
    if(match.event?.level==='Grand Slam')row.majors+=1;
    row.last=match;map.set(opponentId,row);
  }
  return [...map.values()].sort((a,b)=>(b.wins+b.losses)-(a.wins+a.losses)||b.majors-a.majors);
}

export function absoluteWeek(year,week){return year*52+week;}
export function defendingPoints(player,year,week,window=8){
  const now=absoluteWeek(year,week);
  return (player.pointsLog||[]).filter(row=>{const expiry=absoluteWeek(row.year,row.week)+52;return expiry>=now&&expiry<=now+window;}).reduce((sum,row)=>sum+(row.points||0),0);
}

export function rankingSnapshot(universe,tour,year,week){
  return (universe.rankingHistory||[]).find(s=>s.year===year&&s.week===week)?.[tour]||[];
}

export function tournamentStats(universe,tour,name){
  const editions=[...(universe.tournamentEditions||[]),...(universe.juniorEditions||[])].filter(e=>e.event?.tour===tour&&e.event?.name===name);
  const titleCounts=new Map(),winCounts=new Map(),matchCounts=new Map(),countryCounts=new Map();
  let youngest=null,oldest=null,mostAces=null,fiveSetWins=new Map();
  for(const edition of editions){
    const champ=findPlayer(universe,edition.championId);
    if(champ){
      titleCounts.set(champ.id,(titleCounts.get(champ.id)||0)+1);
      countryCounts.set(champ.country,(countryCounts.get(champ.country)||0)+1);
      const age=(edition.event.year-(champ.birthYear||edition.event.year-champ.age));
      if(!youngest||age<youngest.age)youngest={player:champ,age,year:edition.event.year};
      if(!oldest||age>oldest.age)oldest={player:champ,age,year:edition.event.year};
    }
    for(const m of edition.matches||[]){
      matchCounts.set(m.winnerId,(matchCounts.get(m.winnerId)||0)+1);matchCounts.set(m.loserId,(matchCounts.get(m.loserId)||0)+1);
      winCounts.set(m.winnerId,(winCounts.get(m.winnerId)||0)+1);
      if(m.sets>=5)fiveSetWins.set(m.winnerId,(fiveSetWins.get(m.winnerId)||0)+1);
      const aceTotal=(m.stats?.winnerAces||0)+(m.stats?.loserAces||0);
      if(!mostAces||aceTotal>mostAces.aces)mostAces={match:m,aces:aceTotal};
    }
  }
  const rankMap=map=>[...map.entries()].map(([id,value])=>({player:findPlayer(universe,id),value})).filter(r=>r.player).sort((a,b)=>b.value-a.value);
  return {editions,titleLeaders:rankMap(titleCounts),winLeaders:rankMap(winCounts),matchLeaders:rankMap(matchCounts),fiveSetLeaders:rankMap(fiveSetWins),countryLeaders:[...countryCounts.entries()].sort((a,b)=>b[1]-a[1]),youngest,oldest,mostAces};
}

export function surfaceCareer(player,surface){
  const wins=(player.career?.surfaceWins?.[surface]||0),losses=(player.career?.surfaceLosses?.[surface]||0),titles=(player.career?.surfaceTitles?.[surface]||0);
  return {wins,losses,titles,pct:wins+losses?Math.round(wins/(wins+losses)*1000)/10:0};
}

export function signatureTournament(player){
  const counts=new Map();
  for(const row of player.career?.titleLog||[])counts.set(row.event,(counts.get(row.event)||0)+1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]||null;
}

export function rivalryName(universe,row){const p=findPlayer(universe,row.opponentId);return p?fullName(p):'Unknown rival';}

export function findDoublesTeam(universe,id){return [...(universe.doublesTeams?.ATP||[]),...(universe.doublesTeams?.WTA||[]),...(universe.partnershipHistory||[])].find(t=>t.id===id)||null;}
