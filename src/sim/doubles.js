import { clamp, round1 } from './random.js';
import { fullName, refreshDoublesRankings } from './generation.js';

function playerDoublesStrength(player) {
  if (player.doublesRating) return player.doublesRating;
  const s = player.skills;
  return round1((s.serve * 0.20 + s.return * 0.18 + s.volley * 0.22 + s.tactics * 0.16 + s.mentality * 0.12 + s.footwork * 0.12) * player.currentMultiplier);
}

function chemistry(a,b) {
  let score = 50;
  if (a.country === b.country) score += 8;
  if (a.handedness !== b.handedness) score += 5;
  if (a.style === 'Serve-and-volley' || b.style === 'Serve-and-volley') score += 3;
  if (Math.abs(playerDoublesStrength(a)-playerDoublesStrength(b)) < 8) score += 4;
  return clamp(score,35,85);
}

export function rebuildDoublesTeams(universe,tour,rng) {
  const specialists=[...universe.doublesPlayers[tour]].sort((a,b)=>(b.doublesPoints||0)-(a.doublesPoints||0)||playerDoublesStrength(b)-playerDoublesStrength(a));
  const crossovers=universe.players[tour]
    .filter(p=>p.doublesPotential>=82 && (p.ranking>35 || p.doublesFocus==='primary'))
    .sort((a,b)=>b.doublesPotential-a.doublesPotential)
    .slice(0,24);
  const pool=[...specialists,...crossovers];
  const teams=[];
  const used=new Set();
  let teamIndex=0;
  for (const player of pool) {
    if (used.has(player.id)) continue;
    let best=null;
    let bestScore=-Infinity;
    for (const candidate of pool) {
      if (candidate.id===player.id||used.has(candidate.id)) continue;
      const complement=(player.handedness!==candidate.handedness?5:0)+(player.country===candidate.country?4:0);
      const score=playerDoublesStrength(candidate)+complement-Math.abs(playerDoublesStrength(player)-playerDoublesStrength(candidate))*0.25+rng.normal(0,2);
      if (score>bestScore) {best=candidate;bestScore=score;}
    }
    if (!best) continue;
    used.add(player.id);used.add(best.id);
    const chem=chemistry(player,best);
    const rating=round1((playerDoublesStrength(player)+playerDoublesStrength(best))/2+(chem-50)*0.08);
    const inherited=(player.doublesPoints||0)+(best.doublesPoints||0);
    teams.push({
      id:`DT-${tour}-${universe.year}-${teamIndex++}-${player.id}-${best.id}`,
      tour,
      playerIds:[player.id,best.id],
      playerNames:[fullName(player),fullName(best)],
      countries:[player.country,best.country],
      chemistry:chem,
      rating,
      points:Math.round(inherited*0.5),
      ranking:999,
      titles:0,
      majors:0,
      wins:0,
      losses:0,
    });
  }
  teams.sort((a,b)=>b.points-a.points||b.rating-a.rating);
  teams.forEach((team,index)=>team.ranking=index+1);
  universe.doublesTeams[tour]=teams;
  return teams;
}

function teamStrength(team,event,lookup) {
  const players=team.playerIds.map(id=>lookup.get(id)).filter(Boolean);
  const surfaceBoost=players.reduce((sum,p)=>sum+((p.surfaceAffinity?.[event.surface]||70)-70)*0.08,0);
  const fatiguePenalty=players.reduce((sum,p)=>sum+(p.fatigue||0)*0.035,0);
  return team.rating+surfaceBoost+(team.chemistry-50)*0.07-fatiguePenalty;
}

export function simulateDoublesEvent(universe,event,rng) {
  if (!['Grand Slam','Olympics','Finals'].includes(event.level)) return null;
  const tour=event.tour;
  if (!universe.doublesTeams[tour]?.length) rebuildDoublesTeams(universe,tour,rng);
  const allPlayers=[...universe.players[tour],...universe.doublesPlayers[tour]];
  const lookup=new Map(allPlayers.map(p=>[p.id,p]));
  const drawSize=event.level==='Finals'?8:32;
  let alive=[...universe.doublesTeams[tour]].sort((a,b)=>a.ranking-b.ranking).slice(0,drawSize);
  if (alive.length<8) return null;
  const rounds=drawSize===32?['R32','R16','QF','SF','F']:['QF','SF','F'];
  const matches=[];
  for (const round of rounds) {
    const next=[];
    for (let i=0;i<alive.length;i+=2) {
      const a=alive[i],b=alive[i+1];
      const sa=teamStrength(a,event,lookup)+rng.normal(0,1.8);
      const sb=teamStrength(b,event,lookup)+rng.normal(0,1.8);
      const pA=1/(1+Math.exp(-(sa-sb)/7));
      const winner=rng.next()<pA?a:b;
      const loser=winner.id===a.id?b:a;
      winner.wins+=1;loser.losses+=1;
      const score=rng.next()<0.56?'6-4 6-3':'7-6 4-6 10-7';
      matches.push({round,winnerId:winner.id,loserId:loser.id,score});
      next.push(winner);
    }
    alive=next;
  }
  const champion=alive[0];
  champion.titles+=1;
  if (event.level==='Grand Slam') champion.majors+=1;
  const points=event.level==='Grand Slam'?2000:event.level==='Finals'?1500:900;
  champion.points+=points;
  for (const playerId of champion.playerIds) {
    const p=lookup.get(playerId);
    if (!p) continue;
    if (p.doublesSpecialist) {
      p.doublesPoints=(p.doublesPoints||0)+points;
      p.doublesCareer.titles+=1;
      if (event.level==='Grand Slam') p.doublesCareer.majors+=1;
    } else {
      p.career.doublesTitles+=1;
      if (event.level==='Grand Slam') p.career.doublesMajors+=1;
    }
  }
  refreshDoublesRankings(universe.doublesPlayers[tour]);
  universe.doublesTeams[tour].sort((a,b)=>b.points-a.points||b.rating-a.rating).forEach((t,i)=>t.ranking=i+1);
  return {
    id:`${event.id}-doubles`,
    event:{...event,name:`${event.name} Doubles`},
    championTeamId:champion.id,
    championNames:champion.playerNames,
    championCountries:champion.countries,
    matches:matches.filter(m=>['QF','SF','F'].includes(m.round)),
  };
}
