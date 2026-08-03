import { clamp, round1 } from './random.js';

const STYLE_SURFACE = {
  'Aggressive baseline': { Hard: 5, Clay: 2, Grass: 0, Indoor: 4 },
  'Defensive baseline': { Hard: 1, Clay: 6, Grass: -4, Indoor: -1 },
  Counterpuncher: { Hard: 4, Clay: 4, Grass: -2, Indoor: 1 },
  'All-court': { Hard: 3, Clay: 2, Grass: 3, Indoor: 3 },
  'Serve-and-volley': { Hard: 4, Clay: -9, Grass: 7, Indoor: 8 },
  'Big server': { Hard: 5, Clay: -5, Grass: 6, Indoor: 8 },
  'Clay grinder': { Hard: -1, Clay: 9, Grass: -8, Indoor: -4 },
  'Precision attacker': { Hard: 5, Clay: 1, Grass: 2, Indoor: 6 },
};


const RARITY_MATCH_EDGE = {
  Generational: 4.8,
  Legend: 1.4,
  Epic: 0.35,
  Rare: 0,
  Uncommon: -0.15,
  Common: -0.3,
};

const NATURAL_SURFACE_STYLES = {
  Grass: new Set(['Serve-and-volley','Big server','All-court']),
  Clay: new Set(['Clay grinder','Defensive baseline','Counterpuncher']),
  Hard: new Set(['Aggressive baseline','Counterpuncher','All-court','Big server','Precision attacker']),
  Indoor: new Set(['Serve-and-volley','Big server','Precision attacker','Aggressive baseline']),
};

const STYLE_COUNTERS = {
  'Aggressive baseline': { 'Counterpuncher': -2, 'Defensive baseline': -1, 'Serve-and-volley': 1 },
  'Defensive baseline': { 'Big server': -2, 'Aggressive baseline': 1, 'Clay grinder': 0 },
  Counterpuncher: { 'Aggressive baseline': 3, 'Big server': -2 },
  'All-court': { 'Serve-and-volley': 1, 'Clay grinder': 1 },
  'Serve-and-volley': { 'Defensive baseline': 3, 'Counterpuncher': 2, 'Precision attacker': -2 },
  'Big server': { 'Counterpuncher': 2, 'Defensive baseline': 2 },
  'Clay grinder': { 'Big server': 4, 'Serve-and-volley': 4, 'Aggressive baseline': -1 },
  'Precision attacker': { 'Serve-and-volley': 3, 'Counterpuncher': -1 },
};

function baseSkill(player, surface) {
  const s = player.skills;
  const surfaceWeights = {
    Hard: { serve:.15, forehand:.15, backhand:.12, volley:.06, return:.15, footwork:.11, endurance:.08, mentality:.09, tactics:.09 },
    Clay: { serve:.08, forehand:.16, backhand:.13, volley:.04, return:.13, footwork:.17, endurance:.14, mentality:.07, tactics:.08 },
    Grass: { serve:.22, forehand:.13, backhand:.10, volley:.13, return:.13, footwork:.09, endurance:.05, mentality:.08, tactics:.07 },
    Indoor: { serve:.20, forehand:.15, backhand:.11, volley:.10, return:.14, footwork:.08, endurance:.05, mentality:.09, tactics:.08 },
  }[surface] || {};
  return Object.entries(surfaceWeights).reduce((sum,[key,weight]) => sum + s[key] * weight, 0) * player.currentMultiplier;
}

export function effectiveStrength(player, opponent, surface, setIndex = 0, bestOf = 3) {
  const skill = baseSkill(player, surface);
  const affinity = ((player.surfaceAffinity[surface] || 70) - 70) * 0.32;
  const preferredSurfaceBonus = player.preferredSurface === surface ? 4.4 : 0;
  const surfaceStyleSynergy = player.preferredSurface === surface && NATURAL_SURFACE_STYLES[surface]?.has(player.style) ? 1.8 : 0;
  const style = STYLE_SURFACE[player.style]?.[surface] || 0;
  const counter = STYLE_COUNTERS[player.style]?.[opponent.style] || 0;
  const shape = (player.shape - 55) * 0.10;
  const health = (player.health - 90) * 0.08;
  const fatiguePenalty = player.fatigue * (0.10 + setIndex * 0.012);
  const lateSetEndurance = setIndex >= 2 ? ((player.skills.endurance - 70) * 0.10 * (bestOf === 5 ? 1.45 : 0.65)) : 0;
  const mentality = (player.skills.mentality - 70) * 0.035;
  const tactics = (player.skills.tactics - 70) * 0.025;
  const rarityEdge = RARITY_MATCH_EDGE[player.rarity] || 0;
  return skill + affinity + preferredSurfaceBonus + surfaceStyleSynergy + style + counter + shape + health + lateSetEndurance + mentality + tactics + rarityEdge - fatiguePenalty;
}

function holdProbability(server, returner, surface, strengthDiff) {
  const speed = surface === 'Grass' ? 0.045 : surface === 'Indoor' ? 0.04 : surface === 'Hard' ? 0.02 : -0.025;
  const serveEdge = (server.skills.serve - returner.skills.return) / 230;
  const volleyEdge = surface === 'Grass' || surface === 'Indoor' ? (server.skills.volley - 70) / 800 : 0;
  return clamp(0.61 + speed + serveEdge + volleyEdge + strengthDiff / 480, 0.43, 0.91);
}

function simulateSet(playerA, playerB, surface, strengthA, strengthB, rng) {
  let gamesA = 0;
  let gamesB = 0;
  let serverIsA = rng.next() < 0.5;
  const log = [];
  while (true) {
    const server = serverIsA ? playerA : playerB;
    const returner = serverIsA ? playerB : playerA;
    const diff = serverIsA ? strengthA - strengthB : strengthB - strengthA;
    const hold = rng.next() < holdProbability(server, returner, surface, diff);
    const aWinsGame = serverIsA ? hold : !hold;
    if (aWinsGame) gamesA += 1; else gamesB += 1;
    log.push(aWinsGame ? 'A' : 'B');
    if ((gamesA >= 6 || gamesB >= 6) && Math.abs(gamesA - gamesB) >= 2) break;
    if (gamesA === 6 && gamesB === 6) {
      const tieStrengthA = strengthA + playerA.skills.serve * 0.08 + playerA.skills.return * 0.08 + playerA.skills.mentality * 0.07;
      const tieStrengthB = strengthB + playerB.skills.serve * 0.08 + playerB.skills.return * 0.08 + playerB.skills.mentality * 0.07;
      const pA = 1 / (1 + Math.exp(-(tieStrengthA - tieStrengthB) / 10));
      if (rng.next() < pA) gamesA = 7; else gamesB = 7;
      break;
    }
    serverIsA = !serverIsA;
    if (gamesA + gamesB > 20) break;
  }
  return { gamesA, gamesB, winner: gamesA > gamesB ? 'A' : 'B', games: gamesA + gamesB, log };
}

function matchExplanation(winner, loser, surface, sets, preStrengthWinner, preStrengthLoser) {
  const reasons = [];
  const affinityGap = (winner.surfaceAffinity[surface] || 70) - (loser.surfaceAffinity[surface] || 70);
  if (affinityGap > 12) reasons.push(`superior ${surface.toLowerCase()}-court fit`);
  if (loser.fatigue > 55) reasons.push('the opponent’s accumulated fatigue');
  if (winner.shape - loser.shape > 18) reasons.push('sharper match shape');
  if (winner.skills.endurance - loser.skills.endurance > 15 && sets.length >= 4) reasons.push('a decisive endurance advantage');
  if (winner.skills.return - loser.skills.serve > 8) reasons.push('elite returning against the serve');
  if (winner.skills.serve - loser.skills.return > 14) reasons.push('dominant serving');
  if (preStrengthWinner < preStrengthLoser - 4) reasons.push('a major matchup upset');
  return reasons.length ? reasons.slice(0,2).join(' and ') : 'the stronger all-around performance on the day';
}

export function simulateMatch(playerA, playerB, event, rng, round) {
  const bestOf = event.tour === 'ATP' && event.level === 'Grand Slam' ? 5 : 3;
  const setsNeeded = Math.ceil(bestOf / 2);
  let setsA = 0;
  let setsB = 0;
  const sets = [];
  const preA = effectiveStrength(playerA, playerB, event.surface, 0, bestOf);
  const preB = effectiveStrength(playerB, playerA, event.surface, 0, bestOf);
  let totalGames = 0;
  for (let i = 0; i < bestOf && setsA < setsNeeded && setsB < setsNeeded; i += 1) {
    const setNoise = event.level === 'Grand Slam' ? 1.15 : event.level === '1000' || event.level === 'Finals' ? 1.65 : 2.05;
    const strengthA = effectiveStrength(playerA, playerB, event.surface, i, bestOf) + rng.normal(0, setNoise);
    const strengthB = effectiveStrength(playerB, playerA, event.surface, i, bestOf) + rng.normal(0, setNoise);
    const set = simulateSet(playerA, playerB, event.surface, strengthA, strengthB, rng);
    totalGames += set.games;
    if (set.winner === 'A') setsA += 1; else setsB += 1;
    sets.push([set.gamesA, set.gamesB]);
    const enduranceCostA = set.games * (1.22 - playerA.skills.endurance / 180);
    const enduranceCostB = set.games * (1.22 - playerB.skills.endurance / 180);
    playerA.fatigue = clamp(playerA.fatigue + enduranceCostA * (event.surface === 'Clay' ? 1.13 : 1), 0, 100);
    playerB.fatigue = clamp(playerB.fatigue + enduranceCostB * (event.surface === 'Clay' ? 1.13 : 1), 0, 100);
  }
  const winner = setsA > setsB ? playerA : playerB;
  const loser = winner.id === playerA.id ? playerB : playerA;
  const winnerSets = winner.id === playerA.id ? setsA : setsB;
  const loserSets = winner.id === playerA.id ? setsB : setsA;
  winner.shape = clamp(winner.shape + 2.2, 0, 100);
  loser.shape = clamp(loser.shape + 0.7, 0, 100);
  winner.momentum = clamp(winner.momentum + 1, -10, 10);
  loser.momentum = clamp(loser.momentum - 1, -10, 10);
  winner.lastPlayedWeek = event.week;
  loser.lastPlayedWeek = event.week;
  const upset = loser.ranking + 25 < winner.ranking;
  const score = sets.map(([a,b]) => winner.id === playerA.id ? `${a}-${b}` : `${b}-${a}`).join(' ');
  return {
    id: `${event.id}-${round}-${playerA.id}-${playerB.id}`,
    eventId: event.id,
    year: event.year,
    week: event.week,
    tour: event.tour,
    round,
    surface: event.surface,
    playerA: playerA.id,
    playerB: playerB.id,
    winnerId: winner.id,
    loserId: loser.id,
    score,
    sets: winnerSets + loserSets,
    totalGames,
    upset,
    explanation: matchExplanation(winner, loser, event.surface, sets, winner.id === playerA.id ? preA : preB, winner.id === playerA.id ? preB : preA),
  };
}

export function recoveryForWeek(player, playedThisWeek = false) {
  const endurance = player.skills?.endurance ?? 70;
  const recovery = 8 + (endurance - 60) * 0.20 + (playedThisWeek ? 0 : 6);
  player.fatigue = clamp(player.fatigue - recovery, 0, 100);
  if (!playedThisWeek) {
    const weeksIdle = Math.max(0, (player.universeWeek || 0) - (player.lastPlayedWeek || 0));
    const shapeLoss = weeksIdle > 2 ? 2.2 : 0.8;
    player.shape = clamp(player.shape - shapeLoss, 20, 100);
    player.weeksPlayedConsecutive = 0;
  } else {
    player.weeksPlayedConsecutive = (player.weeksPlayedConsecutive || 0) + 1;
  }
  player.health = clamp(player.health + (playedThisWeek ? 0.2 : 0.6), 55, 100);
  player.fatigue = round1(player.fatigue);
  player.shape = round1(player.shape);
}
