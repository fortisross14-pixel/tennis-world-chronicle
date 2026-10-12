import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createUniverse, fullName } from '../src/sim/generation.js';
import { rebuildDoublesTeams } from '../src/sim/doubles.js';
import { RNG } from '../src/sim/random.js';
import { simulateOneYear } from '../src/sim/season.js';
import { effectiveStrength } from '../src/sim/match.js';

const RUNS = Number(process.env.RUNS || 50);
const YEARS = Number(process.env.YEARS || 5);
const WRITE_REPORT = process.env.WRITE_REPORT !== '0';
const TOURS = ['ATP', 'WTA'];
const RARITIES = ['Generational', 'Legend', 'Epic', 'Rare', 'Uncommon', 'Common'];
const FOCUS_RARITIES = ['Generational', 'Legend', 'Epic'];
const NEUTRAL_OPPONENT = {
  style: 'All-court',
  skills: { serve:80, forehand:80, backhand:80, volley:80, return:80, footwork:80, endurance:80, mentality:80, tactics:80 },
};

function allPlayers(world, tour) {
  return [...world.players[tour], ...(world.retiredPlayers?.[tour] || [])];
}
function playerIndex(world, tour) {
  return new Map(allPlayers(world, tour).map(p => [p.id, p]));
}
function isStrictGrass(player) {
  return player.preferredSurface === 'Grass';
}
function isGrassOptimized(player) {
  const values = Object.values(player.surfaceAffinity || {});
  const maxAffinity = values.length ? Math.max(...values) : 0;
  return (player.surfaceAffinity?.Grass || 0) === maxAffinity || ['Serve-and-volley','Big server','All-court'].includes(player.style);
}
function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
function quantile(values, q) {
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] ?? 0;
}
function percentage(numerator, denominator) {
  return denominator ? Number((numerator * 100 / denominator).toFixed(1)) : 0;
}
function summarize(values) {
  return {
    mean: Number(mean(values).toFixed(2)),
    p10: quantile(values, 0.10),
    p50: quantile(values, 0.50),
    p90: quantile(values, 0.90),
    max: Math.max(...values),
  };
}
function increment(object, key, amount = 1) {
  object[key] = (object[key] || 0) + amount;
}
function grassPower(player) {
  return effectiveStrength(player, NEUTRAL_OPPONENT, 'Grass', 0, 3);
}
function profile(player) {
  return {
    name: fullName(player),
    tour: player.tour,
    rarity: player.rarity,
    age: player.age,
    style: player.style,
    preferredSurface: player.preferredSurface,
    grassAffinity: player.surfaceAffinity?.Grass,
    currentRating: player.currentRating,
  };
}

const aggregate = {
  grassTitles: 0,
  wimbledonTitles: 0,
  bestOverallWins: 0,
  bestOverallEntries: 0,
  bestOverallWinsWhenEntered: 0,
  no1Wins: 0,
  bestGrassWins: 0,
  bestGrassEntries: 0,
  bestGrassWinsWhenEntered: 0,
  strictGrassWins: 0,
  optimizedGrassWins: 0,
  wimbledonBestOverallWins: 0,
  wimbledonBestGrassWins: 0,
  wimbledonStrictGrassWins: 0,
  wimbledonOptimizedGrassWins: 0,
  grassWinsByRarity: {},
  slamWinsByRarity: {},
  uniqueGrassChampionsByRun: [],
  uniqueWimbledonChampionsByRun: [],
  bestOverallShareByRun: [],
  strictGrassShareByRun: [],
  maxMajorsByRarity: Object.fromEntries(FOCUS_RARITIES.map(r => [r, []])),
  observedMajorRecords: Object.fromEntries(FOCUS_RARITIES.map(r => [r, null])),
};

for (let run = 0; run < RUNS; run += 1) {
  const world = createUniverse({ seed: 771947 + run * 7919, startYear: 2026, name: `Balance World ${run + 1}` });
  const setupRng = new RNG(world.rngSeed);
  rebuildDoublesTeams(world, 'ATP', setupRng);
  rebuildDoublesTeams(world, 'WTA', setupRng);
  world.rngSeed = setupRng.seed;

  const fiveYearMajors = new Map();
  const runGrassChampions = new Set();
  const runWimbledonChampions = new Set();
  let runGrassTitles = 0;
  let runBestOverallWins = 0;
  let runStrictGrassWins = 0;

  for (let yearIndex = 0; yearIndex < YEARS; yearIndex += 1) {
    const seasonYear = world.year;
    const anchors = {};
    for (const tour of TOURS) {
      const active = [...world.players[tour]];
      const bestOverall = active.sort((a,b) => b.currentRating - a.currentRating || a.ranking - b.ranking)[0];
      const no1 = [...world.players[tour]].sort((a,b) => a.ranking - b.ranking)[0];
      const bestGrass = [...world.players[tour]].sort((a,b) => grassPower(b) - grassPower(a) || a.ranking - b.ranking)[0];
      anchors[tour] = { bestOverallId: bestOverall.id, no1Id: no1.id, bestGrassId: bestGrass.id };
    }

    simulateOneYear(world);

    const seasonIndexes = Object.fromEntries(TOURS.map(tour => [tour, playerIndex(world, tour)]));
    for (const edition of world.tournamentEditions.filter(e => e.event.year === seasonYear)) {
      const champion = seasonIndexes[edition.event.tour].get(edition.championId);
      if (!champion) continue;
      const anchor = anchors[edition.event.tour];

      if (edition.event.level === 'Grand Slam') {
        increment(aggregate.slamWinsByRarity, champion.rarity);
        const existing = fiveYearMajors.get(champion.id) || { id:champion.id, count:0, player:champion };
        existing.count += 1;
        existing.player = champion;
        fiveYearMajors.set(champion.id, existing);
      }

      if (edition.event.surface !== 'Grass') continue;
      aggregate.grassTitles += 1;
      runGrassTitles += 1;
      runGrassChampions.add(champion.id);
      increment(aggregate.grassWinsByRarity, champion.rarity);

      const bestOverallEntered = edition.entryIds?.includes(anchor.bestOverallId);
      const bestGrassEntered = edition.entryIds?.includes(anchor.bestGrassId);
      if (bestOverallEntered) aggregate.bestOverallEntries += 1;
      if (bestGrassEntered) aggregate.bestGrassEntries += 1;
      if (champion.id === anchor.bestOverallId) {
        aggregate.bestOverallWins += 1;
        runBestOverallWins += 1;
        if (bestOverallEntered) aggregate.bestOverallWinsWhenEntered += 1;
      }
      if (champion.id === anchor.no1Id) aggregate.no1Wins += 1;
      if (champion.id === anchor.bestGrassId) {
        aggregate.bestGrassWins += 1;
        if (bestGrassEntered) aggregate.bestGrassWinsWhenEntered += 1;
      }
      if (isStrictGrass(champion)) {
        aggregate.strictGrassWins += 1;
        runStrictGrassWins += 1;
      }
      if (isGrassOptimized(champion)) aggregate.optimizedGrassWins += 1;

      if (edition.event.name === 'Wimbledon') {
        aggregate.wimbledonTitles += 1;
        runWimbledonChampions.add(champion.id);
        if (champion.id === anchor.bestOverallId) aggregate.wimbledonBestOverallWins += 1;
        if (champion.id === anchor.bestGrassId) aggregate.wimbledonBestGrassWins += 1;
        if (isStrictGrass(champion)) aggregate.wimbledonStrictGrassWins += 1;
        if (isGrassOptimized(champion)) aggregate.wimbledonOptimizedGrassWins += 1;
      }
    }
  }

  aggregate.uniqueGrassChampionsByRun.push(runGrassChampions.size);
  aggregate.uniqueWimbledonChampionsByRun.push(runWimbledonChampions.size);
  aggregate.bestOverallShareByRun.push(runBestOverallWins / Math.max(1, runGrassTitles));
  aggregate.strictGrassShareByRun.push(runStrictGrassWins / Math.max(1, runGrassTitles));

  for (const rarity of FOCUS_RARITIES) {
    const records = [...fiveYearMajors.values()].filter(row => row.player.rarity === rarity).sort((a,b) => b.count - a.count);
    const top = records[0];
    aggregate.maxMajorsByRarity[rarity].push(top?.count || 0);
    if (top && (!aggregate.observedMajorRecords[rarity] || top.count > aggregate.observedMajorRecords[rarity].count)) {
      aggregate.observedMajorRecords[rarity] = { count:top.count, run:run + 1, player:profile(top.player) };
    }
  }
}

const result = {
  sample: {
    universes: RUNS,
    seasonsPerUniverse: YEARS,
    tourSeasons: RUNS * YEARS * 2,
    grassTitles: aggregate.grassTitles,
    WimbledonTitles: aggregate.wimbledonTitles,
    GrandSlamTitles: Object.values(aggregate.slamWinsByRarity).reduce((a,b)=>a+b,0),
  },
  grassBalance: {
    bestOverallPlayer: {
      allGrassTitles: aggregate.bestOverallWins,
      otherGrassTitles: aggregate.grassTitles - aggregate.bestOverallWins,
      allGrassTitlesPercent: percentage(aggregate.bestOverallWins, aggregate.grassTitles),
      winsWhenEnteredPercent: percentage(aggregate.bestOverallWinsWhenEntered, aggregate.bestOverallEntries),
      WimbledonTitles: aggregate.wimbledonBestOverallWins,
      otherWimbledonTitles: aggregate.wimbledonTitles - aggregate.wimbledonBestOverallWins,
      WimbledonPercent: percentage(aggregate.wimbledonBestOverallWins, aggregate.wimbledonTitles),
    },
    worldNo1: { allGrassTitlesPercent: percentage(aggregate.no1Wins, aggregate.grassTitles) },
    bestGrassPlayer: {
      allGrassTitles: aggregate.bestGrassWins,
      allGrassTitlesPercent: percentage(aggregate.bestGrassWins, aggregate.grassTitles),
      winsWhenEnteredPercent: percentage(aggregate.bestGrassWinsWhenEntered, aggregate.bestGrassEntries),
      WimbledonTitles: aggregate.wimbledonBestGrassWins,
      WimbledonPercent: percentage(aggregate.wimbledonBestGrassWins, aggregate.wimbledonTitles),
    },
    specialists: {
      preferredGrassTitles: aggregate.strictGrassWins,
      otherProfileTitles: aggregate.grassTitles - aggregate.strictGrassWins,
      preferredGrassPercent: percentage(aggregate.strictGrassWins, aggregate.grassTitles),
      grassOptimizedPercent: percentage(aggregate.optimizedGrassWins, aggregate.grassTitles),
      WimbledonPreferredGrassTitles: aggregate.wimbledonStrictGrassWins,
      WimbledonPreferredGrassPercent: percentage(aggregate.wimbledonStrictGrassWins, aggregate.wimbledonTitles),
      WimbledonGrassOptimizedPercent: percentage(aggregate.wimbledonOptimizedGrassWins, aggregate.wimbledonTitles),
    },
    noise: {
      uniqueGrassChampionsPerFiveYearWorld: summarize(aggregate.uniqueGrassChampionsByRun),
      uniqueGrassChampionSharePercent: percentage(mean(aggregate.uniqueGrassChampionsByRun),aggregate.grassTitles/Math.max(1,RUNS)),
      uniqueWimbledonChampionsPerFiveYearWorld: summarize(aggregate.uniqueWimbledonChampionsByRun),
      bestOverallTitleShareP10Percent: percentage(quantile(aggregate.bestOverallShareByRun,0.10),1),
      bestOverallTitleShareP90Percent: percentage(quantile(aggregate.bestOverallShareByRun,0.90),1),
      preferredGrassShareP10Percent: percentage(quantile(aggregate.strictGrassShareByRun,0.10),1),
      preferredGrassShareP90Percent: percentage(quantile(aggregate.strictGrassShareByRun,0.90),1),
    },
    winnerRaritySharePercent: Object.fromEntries(RARITIES.map(r => [r, percentage(aggregate.grassWinsByRarity[r] || 0, aggregate.grassTitles)])),
  },
  grandSlamBalance: {
    winnerRaritySharePercent: Object.fromEntries(RARITIES.map(r => [r, percentage(aggregate.slamWinsByRarity[r] || 0, Object.values(aggregate.slamWinsByRarity).reduce((a,b)=>a+b,0))])),
    maximumWonByOnePlayerInFiveYears: Object.fromEntries(FOCUS_RARITIES.map(r => [r, summarize(aggregate.maxMajorsByRarity[r])])),
    highestObservedExamples: aggregate.observedMajorRecords,
  },
};

const checks = [
  ['Preferred-grass players win a majority', result.grassBalance.specialists.preferredGrassPercent >= 50 && result.grassBalance.specialists.preferredGrassPercent <= 68],
  ['Grass-optimized profiles dominate without monopolizing', result.grassBalance.specialists.grassOptimizedPercent >= 68 && result.grassBalance.specialists.grassOptimizedPercent <= 84],
  ['Best overall player leaves substantial grass-title noise', result.grassBalance.bestOverallPlayer.allGrassTitlesPercent >= 3 && result.grassBalance.bestOverallPlayer.allGrassTitlesPercent <= 14],
  ['Best overall player remains a meaningful Wimbledon threat', result.grassBalance.bestOverallPlayer.WimbledonPercent >= 10 && result.grassBalance.bestOverallPlayer.WimbledonPercent <= 25],
  ['Five-year grass champion variety remains broad', result.grassBalance.noise.uniqueGrassChampionSharePercent >= 55 && result.grassBalance.noise.uniqueGrassChampionSharePercent <= 75],
  ['Generational five-year Slam median exceeds Legend', result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Generational.p50 > result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Legend.p50],
  ['Epic five-year Slam ceiling permits a rare breakthrough', result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Epic.max >= 4 && result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Epic.max <= 7],
  ['Generational peak permits historic dominance', result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Generational.max >= 9 && result.grandSlamBalance.maximumWonByOnePlayerInFiveYears.Generational.max <= 14],
];
result.checks = checks.map(([name, pass]) => ({ name, pass }));
result.passed = result.checks.every(check => check.pass);

console.log(JSON.stringify(result, null, 2));

if (WRITE_REPORT) {
  fs.mkdirSync('reports', { recursive:true });
  fs.writeFileSync('reports/balance-validation.json', JSON.stringify(result, null, 2));
  const max = result.grandSlamBalance.maximumWonByOnePlayerInFiveYears;
  const lines = [
    '# Tennis World Chronicle — Balance Validation',
    '',
    `Deterministic Monte Carlo sample: **${result.sample.universes} universes**, **${result.sample.seasonsPerUniverse} seasons each**, **${result.sample.grassTitles.toLocaleString()} grass singles titles**, and **${result.sample.GrandSlamTitles.toLocaleString()} Grand Slam singles titles**.`,
    '',
    '## Grass outcomes',
    '',
    `- The season-opening best overall player won **${result.grassBalance.bestOverallPlayer.allGrassTitles} of ${result.sample.grassTitles}** grass titles (**${result.grassBalance.bestOverallPlayer.allGrassTitlesPercent}%**) and **${result.grassBalance.bestOverallPlayer.WimbledonTitles} of ${result.sample.WimbledonTitles}** Wimbledon titles (**${result.grassBalance.bestOverallPlayer.WimbledonPercent}%**). When actually entered, that player won **${result.grassBalance.bestOverallPlayer.winsWhenEnteredPercent}%** of grass events.`,
    `- The strongest grass-specific player won **${result.grassBalance.bestGrassPlayer.allGrassTitles}** grass titles (**${result.grassBalance.bestGrassPlayer.allGrassTitlesPercent}%**) and **${result.grassBalance.bestGrassPlayer.WimbledonTitles}** Wimbledon titles (**${result.grassBalance.bestGrassPlayer.WimbledonPercent}%**).`,
    `- Players whose declared preferred surface is grass won **${result.grassBalance.specialists.preferredGrassTitles} of ${result.sample.grassTitles}** grass titles (**${result.grassBalance.specialists.preferredGrassPercent}%**). Broader grass-optimized profiles won **${result.grassBalance.specialists.grassOptimizedPercent}%**.`,
    `- A five-year universe produced an average of **${result.grassBalance.noise.uniqueGrassChampionsPerFiveYearWorld.mean}** different grass champions across about **${Math.round(result.sample.grassTitles/result.sample.universes)}** grass titles (**${result.grassBalance.noise.uniqueGrassChampionSharePercent}%** unique champion share).`,
    '',
    '## Five-year Grand Slam ceilings',
    '',
    `- **Generational:** median top career segment ${max.Generational.p50}; 90th percentile ${max.Generational.p90}; highest observed ${max.Generational.max}.`,
    `- **Legend:** median ${max.Legend.p50}; 90th percentile ${max.Legend.p90}; highest observed ${max.Legend.max}.`,
    `- **Epic:** median ${max.Epic.p50}; 90th percentile ${max.Epic.p90}; highest observed ${max.Epic.max}.`,
    '',
    '## Validation checks',
    '',
    ...result.checks.map(check => `- ${check.pass ? 'PASS' : 'FAIL'} — ${check.name}`),
    '',
    `Overall result: **${result.passed ? 'PASS' : 'FAIL'}**.`,
    '',
    'The test is reproducible with `npm run balance`. Set `RUNS=200 npm run balance` for a larger sample.',
  ];
  fs.writeFileSync('reports/BALANCE_VALIDATION.md', `${lines.join('\n')}\n`);
}

assert.equal(result.passed, true, 'One or more balance targets failed');
