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
  Generational: 8.2,
  Legend: 1.7,
  Epic: 0.45,
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

const LATE_ROUNDS = new Set(['QF','SF','F']);
const BIG_LEVELS = new Set(['Grand Slam','Finals','Olympics']);

// Form layer (v0.8): season form + weekly drift + confidence + personality.
// These are what make careers swing: career years, lost seasons, hot streaks,
// Cinderella runs and big-match temperaments.
export function formEdge(player) {
  const season = Number(player.seasonForm) || 0;
  const drift = Number(player.formDrift) || 0;
  const confidence = clamp(Number(player.confidence) || 0, -10, 10) * 0.30;
  const hunger = player.comebackHunger > 0 ? 2.0 : 0;
  return season + drift + confidence + hunger;
}

export function personalityEdge(player, opponent, ctx = {}) {
  const tags = player.personalityTags || [];
  const social = player.socialPersonality;
  const { event, round, setsFor = 0, setsAgainst = 0 } = ctx;
  let edge = 0;
  const bigStage = event && (BIG_LEVELS.has(event.level) || event.level === '1000') && LATE_ROUNDS.has(round);
  const majorStage = event && BIG_LEVELS.has(event.level) && LATE_ROUNDS.has(round);
  if (tags.includes('Big-match hunter') && bigStage) edge += majorStage ? 2.2 : 1.2;
  if (tags.includes('Crowd favorite') && event?.country && event.country === player.country) edge += 2.4;
  if (social === 'Showman' && majorStage) edge += 1.2;
  if (social === 'Classy' && round === 'F') edge += 0.8;
  if (social === 'Villain' && (opponent?.fame || 0) > (player.fame || 0) * 1.5 && bigStage) edge += 1.0;
  if (setsAgainst > setsFor) {
    if (social === 'Fighter') edge += 2.0;
    if (tags.includes('Relentless worker')) edge += 1.0;
    if (tags.includes('Emotional spark')) edge -= 0.8;
  }
  if (tags.includes('Calm competitor') && setsFor === setsAgainst && setsFor > 0) edge += 1.0;
  return edge;
}

export function setNoiseScale(player) {
  const tags = player.personalityTags || [];
  let scale = 1;
  if (tags.includes('Emotional spark')) scale *= 1.35;
  if (player.socialPersonality === 'Rebel' || player.socialPersonality === 'Showman') scale *= 1.15;
  if (player.socialPersonality === 'Stoic' || tags.includes('Quiet professional')) scale *= 0.85;
  return scale;
}

export function effectiveStrength(player, opponent, surface, setIndex = 0, bestOf = 3, ctx = null) {
  const skill = baseSkill(player, surface);
  const affinity = ((player.surfaceAffinity[surface] || 70) - 70) * 0.40;
  const preferredSurfaceBonus = player.preferredSurface === surface ? 6.6 : 0;
  const surfaceStyleSynergy = player.preferredSurface === surface && NATURAL_SURFACE_STYLES[surface]?.has(player.style) ? 2.4 : 0;
  const style = STYLE_SURFACE[player.style]?.[surface] || 0;
  const counter = STYLE_COUNTERS[player.style]?.[opponent.style] || 0;
  const shape = (player.shape - 55) * 0.10;
  const health = (player.health - 90) * 0.08;
  const fatiguePenalty = player.fatigue * (0.10 + setIndex * 0.012);
  const lateSetEndurance = setIndex >= 2 ? ((player.skills.endurance - 70) * 0.10 * (bestOf === 5 ? 1.45 : 0.65)) : 0;
  const mentality = (player.skills.mentality - 70) * 0.035;
  const tactics = (player.skills.tactics - 70) * 0.025;
  const rarityEdge = RARITY_MATCH_EDGE[player.rarity] || 0;
  const form = formEdge(player);
  const persona = ctx ? personalityEdge(player, opponent, ctx) : 0;
  return skill + affinity + preferredSurfaceBonus + surfaceStyleSynergy + style + counter + shape + health + lateSetEndurance + mentality + tactics + rarityEdge + form + persona - fatiguePenalty;
}

function holdProbability(server, returner, surface, strengthDiff) {
  const speed = surface === 'Grass' ? 0.045 : surface === 'Indoor' ? 0.04 : surface === 'Hard' ? 0.02 : -0.025;
  const serveEdge = (server.skills.serve - returner.skills.return) / 230;
  const volleyEdge = surface === 'Grass' || surface === 'Indoor' ? (server.skills.volley - 70) / 800 : 0;
  return clamp(0.61 + speed + serveEdge + volleyEdge + strengthDiff / 320, 0.43, 0.91);
}

function simulateSet(playerA, playerB, surface, strengthA, strengthB, rng) {
  let gamesA = 0;
  let gamesB = 0;
  let serverIsA = rng.next() < 0.5;
  const log = [];
  const servers = [];
  while (true) {
    const server = serverIsA ? playerA : playerB;
    const returner = serverIsA ? playerB : playerA;
    const diff = serverIsA ? strengthA - strengthB : strengthB - strengthA;
    const serverGames=serverIsA?gamesA:gamesB,returnerGames=serverIsA?gamesB:gamesA;
    const pressurePoint=(gamesA+gamesB>=8||serverGames>=5||returnerGames>=5);
    const nerve=p=>((p.confidence||0)/420)+((p.personalityTags||[]).includes('Calm competitor')?0.012:0)-((p.personalityTags||[]).includes('Emotional spark')?0.008:0);
    const pressureModifier=pressurePoint?((server.skills.mentality-returner.skills.mentality)/850+(server.skills.tactics-returner.skills.tactics)/1400+nerve(server)-nerve(returner)):0;
    const servingForSet=serverGames>=5&&serverGames-returnerGames>=1?0.012:0;
    const hold = rng.next() < clamp(holdProbability(server, returner, surface, diff)+pressureModifier+servingForSet,0.38,0.94);
    const aWinsGame = serverIsA ? hold : !hold;
    if (aWinsGame) gamesA += 1; else gamesB += 1;
    log.push(aWinsGame ? 'A' : 'B');
    servers.push(serverIsA ? 'A' : 'B');
    if ((gamesA >= 6 || gamesB >= 6) && Math.abs(gamesA - gamesB) >= 2) break;
    if (gamesA === 6 && gamesB === 6) {
      const tieStrengthA = strengthA + playerA.skills.serve * 0.08 + playerA.skills.return * 0.08 + playerA.skills.mentality * 0.07;
      const tieStrengthB = strengthB + playerB.skills.serve * 0.08 + playerB.skills.return * 0.08 + playerB.skills.mentality * 0.07;
      const pA = 1 / (1 + Math.exp(-(tieStrengthA - tieStrengthB) / 10));
      if (rng.next() < pA) { gamesA = 7; log.push('A'); } else { gamesB = 7; log.push('B'); }
      break;
    }
    serverIsA = !serverIsA;
    if (gamesA + gamesB > 20) break;
  }
  return { gamesA, gamesB, winner: gamesA > gamesB ? 'A' : 'B', games: gamesA + gamesB, log, servers };
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
  const setDetails = [];
  const preA = effectiveStrength(playerA, playerB, event.surface, 0, bestOf);
  const preB = effectiveStrength(playerB, playerA, event.surface, 0, bestOf);
  let totalGames = 0;
  // Day form: one draw per player per match (good days / bad days), then set noise.
  const dayA = rng.normal(0, 2.6 * setNoiseScale(playerA));
  const dayB = rng.normal(0, 2.6 * setNoiseScale(playerB));
  let flowA = 0;
  let flowB = 0;
  for (let i = 0; i < bestOf && setsA < setsNeeded && setsB < setsNeeded; i += 1) {
    const setNoise = event.level === 'Grand Slam' ? 1.15 : event.level === '1000' || event.level === 'Finals' ? 1.65 : 2.05;
    const ctxA = { event, round, setsFor: setsA, setsAgainst: setsB };
    const ctxB = { event, round, setsFor: setsB, setsAgainst: setsA };
    const strengthA = effectiveStrength(playerA, playerB, event.surface, i, bestOf, ctxA) + dayA + flowA + rng.normal(0, setNoise * setNoiseScale(playerA));
    const strengthB = effectiveStrength(playerB, playerA, event.surface, i, bestOf, ctxB) + dayB + flowB + rng.normal(0, setNoise * setNoiseScale(playerB));
    const set = simulateSet(playerA, playerB, event.surface, strengthA, strengthB, rng);
    totalGames += set.games;
    if (set.winner === 'A') setsA += 1; else setsB += 1;
    // In-match flow: the set winner carries a little momentum into the next set.
    const swing = set.gamesA + set.gamesB >= 12 ? 0.6 : 1.0;
    if (set.winner === 'A') { flowA = clamp(flowA + swing, -2, 2); flowB = clamp(flowB - swing * 0.5, -2, 2); }
    else { flowB = clamp(flowB + swing, -2, 2); flowA = clamp(flowA - swing * 0.5, -2, 2); }
    sets.push([set.gamesA, set.gamesB]);
    setDetails.push({gamesA:set.gamesA,gamesB:set.gamesB,gameWinners:[...set.log],servers:[...set.servers],setsBefore:[setsA-(set.winner==='A'?1:0),setsB-(set.winner==='B'?1:0)]});
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
  winner.momentum = clamp((winner.momentum || 0) + 1, -10, 10);
  loser.momentum = clamp((loser.momentum || 0) - 1, -10, 10);
  // Confidence: beating better players builds belief; losing to worse ones erodes it.
  const rankGap = (winner.ranking || 400) - (loser.ranking || 400);
  const roundWeight = event.level === 'Grand Slam' ? 1.3 : event.level === '1000' || event.level === 'Finals' || event.level === 'Olympics' ? 1.1 : event.level === 'ITF' || event.level === 'Challenger' || event.level === 'WTA 125' ? 0.6 : 0.85;
  const winGain = (0.45 + (rankGap > 0 ? Math.min(1.6, rankGap / 40) : 0) + ((loser.ranking || 999) <= 10 ? 0.6 : 0)) * roundWeight;
  const lossCost = (0.35 + (rankGap > 0 ? Math.min(1.2, rankGap / 60) : 0)) * roundWeight;
  winner.confidence = clamp((winner.confidence || 0) + winGain, -10, 10);
  loser.confidence = clamp((loser.confidence || 0) - lossCost, -10, 10);
  winner.lastPlayedWeek = event.week;
  loser.lastPlayedWeek = event.week;
  const upset = loser.ranking + 25 < winner.ranking;
  const score = sets.map(([a,b]) => winner.id === playerA.id ? `${a}-${b}` : `${b}-${a}`).join(' ');
  const decidingSet = winnerSets === setsNeeded && loserSets === setsNeeded - 1;
  const durationMinutes = Math.round(totalGames * (event.surface === 'Clay' ? 4.5 : event.surface === 'Grass' ? 3.2 : 3.8) + rng.float(8,28));
  const winnerAces = Math.max(0,Math.round((winner.skills.serve-55)*totalGames/85 + rng.normal(0,2)));
  const loserAces = Math.max(0,Math.round((loser.skills.serve-55)*totalGames/95 + rng.normal(0,2)));
  const tags=[];
  if(upset)tags.push('upset');
  if(winnerSets>0&&loserSets===0)tags.push('straight-sets control');
  if(decidingSet)tags.push('deciding set');
  if(durationMinutes>=210)tags.push('marathon');
  if(loserSets>0&&sets[0]&&((winner.id===playerA.id?sets[0][0]<sets[0][1]:sets[0][1]<sets[0][0])))tags.push('comeback');
  if(loser.fatigue>=70&&winner.skills.endurance-loser.skills.endurance>=10)tags.push('physical collapse');
  if(winnerAces>=15)tags.push('dominant serving');
  // Real drama from the game log: did the loser serve for the match and get broken?
  const W=winner.id===playerA.id?'A':'B',L=W==='A'?'B':'A';
  let servedForMatch=false,breakDownDecider=false;
  setDetails.forEach((set,si)=>{
    const loserSetsBefore=L==='A'?set.setsBefore[0]:set.setsBefore[1];
    let gW=0,gL=0,lostBreakLead=false;
    set.gameWinners.forEach((g,gi)=>{
      const server=set.servers?.[gi];
      if(loserSetsBefore===setsNeeded-1&&server===L&&gL>=5&&gL>gW&&g===W)servedForMatch=true;
      if(g===W)gW+=1;else gL+=1;
      if(si===setDetails.length-1&&gL-gW>=2)lostBreakLead=true;
    });
    if(si===setDetails.length-1&&decidingSet&&lostBreakLead)breakDownDecider=true;
  });
  if(servedForMatch)tags.push('saved match points');
  if(breakDownDecider)tags.push('break down in decider');
  if(bestOf===5&&sets.length===5){const wonByA=sets.map(([a,b])=>a>b);const winnerWon=winner.id===playerA.id?wonByA:wonByA.map(x=>!x);if(!winnerWon[0]&&!winnerWon[1])tags.push('two sets down');}
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
    setDetails,
    sets: winnerSets + loserSets,
    totalGames,
    durationMinutes,
    stats:{winnerAces,loserAces},
    tags,
    upset,
    explanation: matchExplanation(winner, loser, event.surface, sets, winner.id === playerA.id ? preA : preB, winner.id === playerA.id ? preB : preA),
  };
}

export function weeklyFormDrift(player, rng) {
  const sd = (player.personalityTags || []).includes('Emotional spark') ? 0.75 : (player.personalityTags || []).includes('Quiet professional') ? 0.4 : 0.55;
  player.formDrift = round1(clamp((Number(player.formDrift) || 0) * 0.9 + rng.normal(0, sd), -4, 4));
  player.confidence = round1(clamp((Number(player.confidence) || 0) * 0.93, -10, 10));
  if (player.comebackHunger > 0 && !(player.injury?.weeksRemaining > 0)) player.comebackHunger -= 1;
}

export function recoveryForWeek(player, playedThisWeek = false) {
  if(player.injury?.weeksRemaining>0){
    player.injury.weeksRemaining-=1;
    player.health=clamp(player.health+1.5,35,100);
    player.fatigue=clamp(player.fatigue-12,0,100);
    player.shape=clamp(player.shape-2.5,20,100);
    if(player.injury.weeksRemaining<=0){player.injury=null;player.health=clamp(player.health+8,55,100);}
    return;
  }
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
