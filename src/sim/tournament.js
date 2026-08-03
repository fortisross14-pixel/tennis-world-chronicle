import { simulateMatch } from './match.js';
import { clamp } from './random.js';
import { fullName } from './generation.js';

const ROUND_NAMES = {
  128: ['R128','R64','R32','R16','QF','SF','F'],
  64: ['R64','R32','R16','QF','SF','F'],
  32: ['R32','R16','QF','SF','F'],
  16: ['R16','QF','SF','F'],
  8: ['QF','SF','F'],
};

const POINTS_BY_LEVEL = {
  'Grand Slam': { R64:45, R32:90, R16:180, QF:360, SF:720, F:1200, W:2000 },
  '1000': { R64:10, R32:45, R16:90, QF:180, SF:360, F:600, W:1000 },
  '500': { R32:0, R16:50, QF:100, SF:200, F:330, W:500 },
  '250': { R32:0, R16:25, QF:50, SF:90, F:150, W:250 },
  Finals: { QF:200, SF:400, F:800, W:1500 },
  Olympics: { R64:0, R32:0, R16:0, QF:0, SF:0, F:0, W:0 },
};

function levelPriority(level) {
  return { 'Grand Slam':100, Olympics:98, '1000':86, Finals:92, '500':65, '250':45 }[level] || 10;
}

function entryScore(player, event, rng) {
  const rankScore = 380 - Math.min(380, player.ranking || 360);
  const surface = (player.surfaceAffinity[event.surface] || 70) - 70;
  const fatiguePenalty = player.fatigue * 1.05;
  const shape = (player.shape - 50) * 0.45;
  const lowRankBoost = (event.level === '250' || event.level === '500') && player.ranking > 60 ? 45 : 0;
  const topSkip = event.level === '250' && player.ranking <= 12 ? -90 : event.level === '500' && player.ranking <= 6 ? -38 : 0;
  const majorCommitment = event.level === 'Grand Slam' ? 120 : 0;
  return rankScore + surface * 1.5 + shape + lowRankBoost + topSkip + majorCommitment - fatiguePenalty + rng.normal(0,8);
}

export function selectEntries(players, event, unavailable, rng) {
  const candidates = players.filter(p => p.status === 'active' && !unavailable.has(p.id) && p.health > 58 && p.fatigue < (event.level === 'Grand Slam' ? 88 : 74));
  const sorted = candidates
    .map(p => ({ p, score: entryScore(p,event,rng) }))
    .sort((a,b) => b.score - a.score)
    .slice(0,event.drawSize)
    .map(row => row.p);
  for (const player of sorted) unavailable.add(player.id);
  return sorted;
}

function seededOrder(entries, rng) {
  const sorted = [...entries].sort((a,b) => a.ranking - b.ranking);
  const seeds = sorted.slice(0, Math.min(16, Math.floor(entries.length / 4)));
  const rest = rng.shuffle(sorted.slice(seeds.length));
  const draw = new Array(entries.length);
  const seedPositions = [0, entries.length - 1, Math.floor(entries.length/2), Math.floor(entries.length/2)-1];
  seeds.forEach((seed,index) => {
    let pos = seedPositions[index] ?? Math.floor((index + 0.5) * entries.length / seeds.length);
    while (draw[pos]) pos = (pos + 1) % draw.length;
    draw[pos] = seed;
  });
  let cursor = 0;
  for (let i = 0; i < draw.length; i += 1) if (!draw[i]) draw[i] = rest[cursor++];
  return draw;
}

function awardPoints(player, event, points, label) {
  if (!points) return;
  player.pointsLog.push({ eventId:event.id, year:event.year, week:event.week, points, label });
  player.season.points += points;
}

function recordMatch(winner, loser, event, match) {
  winner.season.matches += 1;
  winner.season.wins += 1;
  winner.season.surfaceWins[event.surface] = (winner.season.surfaceWins[event.surface] || 0) + 1;
  loser.season.matches += 1;
  loser.season.losses += 1;
  winner.career.matches += 1;
  winner.career.wins += 1;
  loser.career.matches += 1;
  loser.career.losses += 1;
  if (!winner.career.bestWin || loser.ranking < winner.career.bestWin.opponentRanking) {
    winner.career.bestWin = { opponent: fullName(loser), opponentRanking: loser.ranking, event: event.name, year:event.year, round:match.round };
  }
}

export function simulateSinglesEvent(players, event, unavailable, rng) {
  const entries = selectEntries(players,event,unavailable,rng);
  if (entries.length < Math.min(8,event.drawSize)) return null;
  const effectiveDrawSize = 2 ** Math.floor(Math.log2(entries.length));
  let alive = seededOrder(entries.slice(0,effectiveDrawSize),rng);
  const rounds = ROUND_NAMES[effectiveDrawSize] || ROUND_NAMES[32];
  const matches = [];
  const exitRound = new Map();
  for (const round of rounds) {
    const next = [];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i];
      const b = alive[i+1];
      const match = simulateMatch(a,b,event,rng,round);
      matches.push(match);
      const winner = match.winnerId === a.id ? a : b;
      const loser = winner.id === a.id ? b : a;
      recordMatch(winner,loser,event,match);
      exitRound.set(loser.id, round);
      next.push(winner);
    }
    alive = next;
  }
  const champion = alive[0];
  const finalistMatch = matches[matches.length-1];
  const finalist = entries.find(p => p.id === finalistMatch.loserId);
  const table = POINTS_BY_LEVEL[event.level] || POINTS_BY_LEVEL['250'];
  for (const p of entries) {
    const round = p.id === champion.id ? 'W' : exitRound.get(p.id) || rounds[0];
    awardPoints(p,event,table[round] || 0,round);
    p.season.tournaments += 1;
    p.season.results.push({ eventId:event.id, event:event.name, level:event.level, surface:event.surface, round, points:table[round] || 0 });
  }
  champion.season.titles += 1;
  champion.career.titles += 1;
  if (event.level === 'Grand Slam') {
    champion.season.majors += 1;
    champion.career.majors += 1;
  }
  if (event.level === 'Olympics') champion.career.olympicMedals += 1;
  champion.career.titleLog.push({ year:event.year, event:event.name, level:event.level, surface:event.surface, finalist:fullName(finalist) });
  const notableMatches = event.level === 'Grand Slam' ? matches : matches.filter(m => ['QF','SF','F'].includes(m.round) || m.upset);
  return {
    id: event.id,
    event: { ...event, status:'completed' },
    championId: champion.id,
    finalistId: finalist?.id,
    championName: fullName(champion),
    finalistName: finalist ? fullName(finalist) : '',
    championCountry: champion.country,
    matches: notableMatches,
    drawSize: effectiveDrawSize,
    entryIds: entries.map(p=>p.id),
    seeds: entries.slice().sort((a,b)=>a.ranking-b.ranking).slice(0,16).map(p => ({id:p.id,rank:p.ranking,name:fullName(p)})),
    completedAtWeek: event.week,
  };
}

function juniorStrength(player,event) {
  return player.currentRating + ((player.surfaceAffinity[event.surface] || 70)-70)*0.12 + (player.shape-50)*0.05 - player.fatigue*0.06;
}

export function simulateJuniorEvent(juniors,event,rng) {
  const entries = [...juniors]
    .sort((a,b) => (juniorStrength(b,event)+rng.normal(0,2)) - (juniorStrength(a,event)+rng.normal(0,2)))
    .slice(0,event.drawSize);
  let alive = rng.shuffle(entries);
  const matches = [];
  const roundNames = ROUND_NAMES[event.drawSize] || ROUND_NAMES[32];
  for (const round of roundNames) {
    const next=[];
    for (let i=0;i<alive.length;i+=2) {
      const a=alive[i], b=alive[i+1];
      const diff=juniorStrength(a,event)-juniorStrength(b,event);
      const pA=1/(1+Math.exp(-diff/7));
      const winner=rng.next()<pA?a:b;
      const loser=winner.id===a.id?b:a;
      winner.season.matches+=1; winner.season.wins+=1; winner.career.matches+=1; winner.career.wins+=1;
      loser.season.matches+=1; loser.season.losses+=1; loser.career.matches+=1; loser.career.losses+=1;
      winner.shape=clamp(winner.shape+1.3,0,100); loser.shape=clamp(loser.shape+0.3,0,100);
      matches.push({round,winnerId:winner.id,loserId:loser.id,score:rng.next()<0.55?'6-3 6-4':'7-6 4-6 6-3'});
      next.push(winner);
    }
    alive=next;
  }
  const champion=alive[0];
  champion.season.titles+=1;
  champion.career.titles+=1;
  return { id:event.id, event:{...event,status:'completed'}, championId:champion.id, championName:fullName(champion), championCountry:champion.country, matches:matches.filter(m=>['QF','SF','F'].includes(m.round)) };
}

export function eventImportance(event) {
  return levelPriority(event.level);
}
