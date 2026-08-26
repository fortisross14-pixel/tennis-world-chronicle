import { COUNTRIES } from '../data/countries.js';
import { expandedNamePool } from '../data/names.js';
import { buildCalendar, buildJuniorCalendar } from '../data/calendar.js';
import { RNG, clamp, round1 } from './random.js';

export const SINGLES_CAP = 360;
export const DOUBLES_CAP = 160;
export const JUNIOR_TARGET = 120;

export const RARITIES = {
  Generational: { min: 96, max: 100, rank: 6 },
  Legend: { min: 91, max: 96, rank: 5 },
  Epic: { min: 86, max: 92, rank: 4 },
  Rare: { min: 80, max: 87, rank: 3 },
  Uncommon: { min: 72, max: 81, rank: 2 },
  Common: { min: 61, max: 74, rank: 1 },
};

export const STYLES = [
  'Aggressive baseline',
  'Defensive baseline',
  'Counterpuncher',
  'All-court',
  'Serve-and-volley',
  'Big server',
  'Clay grinder',
  'Precision attacker',
];

export const SURFACES = ['Hard','Clay','Grass','Indoor'];
export const CURVES = ['Young prodigy','Balanced star','Late bloomer','Short peak','Durable professional','Surface specialist'];
export const SOCIAL_PERSONALITIES=['Fighter','Rebel','Classy','Villain','Showman','Stoic'];

const STYLE_BOOSTS = {
  'Aggressive baseline': { forehand: 6, serve: 3, return: 1, endurance: -2, volley: -2 },
  'Defensive baseline': { footwork: 6, backhand: 4, endurance: 5, serve: -3, volley: -2 },
  Counterpuncher: { return: 6, footwork: 5, mentality: 3, serve: -2 },
  'All-court': { tactics: 5, volley: 4, footwork: 2 },
  'Serve-and-volley': { serve: 7, volley: 8, mentality: 2, endurance: -3, return: -2 },
  'Big server': { serve: 10, forehand: 4, mentality: 2, return: -5, footwork: -3 },
  'Clay grinder': { endurance: 8, footwork: 7, forehand: 4, serve: -3, volley: -5 },
  'Precision attacker': { forehand: 4, backhand: 5, tactics: 6, endurance: -1 },
};

const CURVE_WEIGHTS = [
  { value: 'Young prodigy', weight: 12 },
  { value: 'Balanced star', weight: 28 },
  { value: 'Late bloomer', weight: 17 },
  { value: 'Short peak', weight: 12 },
  { value: 'Durable professional', weight: 20 },
  { value: 'Surface specialist', weight: 11 },
];

const ACTIVE_RARITY_COUNTS = {
  Generational: 2,
  Legend: 9,
  Epic: 24,
  Rare: 70,
  Uncommon: 145,
  Common: 110,
};

const ELITE_COUNTRY_STRENGTH = {
  USA:1.85,ESP:1.75,FRA:1.65,ITA:1.60,AUS:1.55,GER:1.45,GBR:1.45,RUS:1.40,SRB:1.38,CZE:1.35,
  CHN:1.28,CAN:1.25,JPN:1.18,POL:1.16,ARG:1.14,CRO:1.10,ROU:1.08,UKR:1.05,SUI:1.04,BEL:1.00,
  BRA:.92,NED:.90,GRE:.88,DEN:.86,NOR:.82,KAZ:.80,SWE:.78,AUT:.76,TUN:.70,RSA:.68,CHI:.66,
  MEX:.60,COL:.58,IND:.55,TUR:.52,POR:.50,BUL:.48,HUN:.44,SVK:.42,SLO:.40,MAR:.38,EGY:.36,
  KOR:.35,NZL:.34,ISR:.32,GEO:.28,UZB:.26,THA:.20,PHI:.18,KEN:.16,ETH:.13,ERI:.10,
};
const ELITE_RARITIES = new Set(['Generational','Legend','Epic']);
const COMPOUND_SURNAME_COUNTRIES = new Set(['ESP','ARG','BRA','CHI','COL','MEX','POR','PHI']);

export function createGenerationContext(players = [], tour = null) {
  const usedNames = new Set();
  const eliteCountryCounts = new Map();
  for (const player of players) {
    if (!player || (tour && player.tour !== tour)) continue;
    if (player.firstName && player.lastName) usedNames.add(`${player.firstName}|${player.lastName}`.toLocaleLowerCase());
    if (player.status !== 'retired' && !player.doublesSpecialist && ELITE_RARITIES.has(player.rarity)) eliteCountryCounts.set(player.country,(eliteCountryCounts.get(player.country)||0)+1);
  }
  return { usedNames, eliteCountryCounts };
}

const SKILL_KEYS = ['serve','forehand','backhand','volley','return','footwork','endurance','mentality','tactics'];

function weightedValue(rng, rows) {
  const picked = rng.weighted(rows);
  return picked.value;
}

export function careerMultiplier(curve, age, peakAge = 24) {
  if (age <= 15) return 0.66;
  if (age === 16) return curve === 'Young prodigy' ? 0.74 : 0.69;
  if (age === 17) return curve === 'Young prodigy' ? 0.80 : 0.74;
  if (age === 18) {
    if (curve === 'Young prodigy') return 0.88;
    if (curve === 'Late bloomer') return 0.77;
    return 0.82;
  }
  if (curve === 'Young prodigy') {
    const map = {19:0.94,20:0.96,21:1.00,22:1.02,23:1.01,24:0.99,25:0.97,26:0.94,27:0.92,28:0.89,29:0.86,30:0.83,31:0.82,32:0.81,33:0.80,34:0.79,35:0.77};
    return map[age] ?? (age > 35 ? 0.73 : 0.9);
  }
  if (curve === 'Late bloomer') {
    if (age <= 22) return 0.82 + (age - 19) * 0.02;
    if (age <= 26) return 0.88 + (age - 23) * 0.012;
    const map = {27:0.93,28:0.96,29:0.99,30:1.01,31:1.00,32:1.01,33:0.95,34:0.91,35:0.86,36:0.81};
    return map[age] ?? 0.78;
  }
  if (curve === 'Short peak') {
    const distance = Math.abs(age - peakAge);
    if (distance <= 1) return 1.02;
    if (distance <= 3) return 0.98;
    if (age < peakAge) return clamp(0.83 + (age - 19) * 0.035, 0.83, 0.96);
    return clamp(0.97 - (age - peakAge) * 0.055, 0.72, 0.97);
  }
  if (curve === 'Durable professional') {
    if (age < 21) return 0.85 + (age - 18) * 0.025;
    if (age <= 31) return clamp(0.94 + Math.sin((age - 21) / 3) * 0.025, 0.93, 0.99);
    return clamp(0.96 - (age - 31) * 0.028, 0.78, 0.96);
  }
  if (curve === 'Surface specialist') {
    if (age < 22) return 0.84 + (age - 18) * 0.028;
    if (age <= 30) return clamp(0.97 + Math.sin(age) * 0.025, 0.95, 1.01);
    return clamp(0.96 - (age - 30) * 0.04, 0.77, 0.96);
  }
  // Balanced star
  if (age < 21) return 0.86 + (age - 18) * 0.03;
  if (age <= 29) return clamp(0.98 + Math.sin(age * 1.7) * 0.025, 0.96, 1.02);
  return clamp(0.97 - (age - 29) * 0.035, 0.77, 0.97);
}

function chooseCountry(rng, rarity, context = {}) {
  const elite=ELITE_RARITIES.has(rarity);
  const discoveryChance=rarity==='Generational'?.12:rarity==='Legend'?.18:rarity==='Epic'?.28:1;
  const discovery=elite&&rng.next()<discoveryChance;
  const counts=context.eliteCountryCounts||new Map();
  const rows=COUNTRIES.map(country=>{
    const strength=ELITE_COUNTRY_STRENGTH[country.code]??.24;
    const existing=counts.get(country.code)||0;
    let weight=country.weight;
    if(elite&&!discovery)weight*=strength;
    if(elite&&existing>0){
      const repeatPenalty=strength<.5?.02:strength<.85?.25:.60;
      weight*=Math.pow(repeatPenalty,existing);
    }
    return {...country,weight:Math.max(.001,weight)};
  });
  const chosen=rng.weighted(rows);
  if(elite&&context.eliteCountryCounts)context.eliteCountryCounts.set(chosen.code,(context.eliteCountryCounts.get(chosen.code)||0)+1);
  return chosen;
}

function createName(rng, country, tour, context = {}) {
  const expanded=expandedNamePool(country,tour);
  const pool=expanded.first;
  const surnames=expanded.last;
  const used=context.usedNames;
  for(let attempt=0;attempt<72;attempt+=1){
    let first=rng.pick(pool);
    let last=rng.pick(surnames);
    if(attempt>=10){
      const second=rng.pick(surnames.filter(value=>value!==last))||rng.pick(surnames);
      last=COMPOUND_SURNAME_COUNTRIES.has(country.code)?`${last} ${second}`:`${last}-${second}`;
    }
    if(attempt>=36){
      const middle=rng.pick(pool.filter(value=>value!==first))||rng.pick(pool);
      first=`${first} ${middle}`;
    }
    const key=`${first}|${last}`.toLocaleLowerCase();
    if(!used||!used.has(key)){if(used)used.add(key);return {firstName:first,lastName:last};}
  }
  const first=rng.pick(pool),last=`${rng.pick(surnames)}-${rng.pick(surnames)} ${rng.int(2,99)}`;
  if(used)used.add(`${first}|${last}`.toLocaleLowerCase());
  return {firstName:first,lastName:last};
}

function stylePreferredSurface(rng, style) {
  const natural = {
    'Serve-and-volley': [{value:'Grass',weight:60},{value:'Indoor',weight:23},{value:'Hard',weight:17}],
    'Big server': [{value:'Grass',weight:48},{value:'Hard',weight:29},{value:'Indoor',weight:23}],
    'Clay grinder': [{value:'Clay',weight:100}],
    'Defensive baseline': [{value:'Clay',weight:68},{value:'Hard',weight:32}],
    Counterpuncher: [{value:'Hard',weight:55},{value:'Clay',weight:45}],
    'Aggressive baseline': [{value:'Hard',weight:68},{value:'Clay',weight:32}],
    'All-court': [{value:'Hard',weight:40},{value:'Grass',weight:38},{value:'Clay',weight:22}],
    'Precision attacker': [{value:'Hard',weight:55},{value:'Indoor',weight:30},{value:'Clay',weight:15}],
  }[style];
  // Deliberately permit awkward combinations so talent/style/surface conflict can emerge.
  if (rng.next() < 0.15) return rng.pick(SURFACES);
  return weightedValue(rng, natural);
}

function buildSurfaceAffinity(rng, preferredSurface, style) {
  const affinities = {};
  for (const surface of SURFACES) affinities[surface] = rng.int(62, 84);
  affinities[preferredSurface] = rng.int(88, 100);
  if (style === 'Clay grinder') affinities.Clay = clamp(affinities.Clay + 6, 0, 100);
  if (style === 'Serve-and-volley') affinities.Grass = clamp(affinities.Grass + 5, 0, 100);
  if (style === 'Big server') affinities.Indoor = clamp(affinities.Indoor + 4, 0, 100);
  return affinities;
}

function buildSkills(rng, maxRating, style) {
  const boosts = STYLE_BOOSTS[style] || {};
  const skills = {};
  for (const key of SKILL_KEYS) {
    const spread = key === 'endurance' ? 8 : 6;
    skills[key] = clamp(Math.round(maxRating + rng.normal(0, spread) + (boosts[key] || 0)), 42, 100);
  }
  return skills;
}

function currentRatingFrom(player) {
  const s = player.skills;
  const weighted = s.serve * 0.14 + s.forehand * 0.14 + s.backhand * 0.12 + s.volley * 0.07 + s.return * 0.13 + s.footwork * 0.12 + s.endurance * 0.10 + s.mentality * 0.09 + s.tactics * 0.09;
  return round1(weighted * player.currentMultiplier);
}

export function recalculatePlayer(player) {
  player.currentMultiplier = round1(careerMultiplier(player.curveType, player.age, player.peakAge) * 100) / 100;
  player.currentRating = currentRatingFrom(player);
  return player;
}

function emptyCareer() {
  return {
    matches: 0, wins: 0, losses: 0, titles: 0, finals: 0, majors: 0, masters: 0,
    olympicMedals: 0, olympicGolds: 0, weeksNo1: 0, yearEndNo1: 0, peakRanking: 999,
    doublesTitles: 0, doublesMajors: 0, seasons: [], titleLog: [], bestWin: null,
    titlesByLevel: {}, surfaceWins: { Hard:0, Clay:0, Grass:0, Indoor:0 },
    surfaceLosses: { Hard:0, Clay:0, Grass:0, Indoor:0 }, surfaceTitles: { Hard:0, Clay:0, Grass:0, Indoor:0 }, surfaceExposure: { Hard:0, Clay:0, Grass:0, Indoor:0 },
    fiveSetWins: 0, fiveSetLosses: 0, decidingSetWins: 0, decidingSetLosses: 0,
    longestMatch: null, biggestUpset: null, longestWinStreak: 0, currentWinStreak: 0,
    nationalTeamAppearances: 0, nationalTeamWins: 0, nationalTeamLosses: 0, nationalTeamTitles: 0, awards: [], proAppearances: 0, proWins: 0, firstProWin: null,
    doublesMatches: 0, doublesWins: 0, doublesLosses: 0, partnershipLog: [],
  };
}

function emptySeason(year) {
  return {
    year, matches:0, wins:0, losses:0, titles:0, majors:0, points:0, racePoints:0, tournaments:0,
    surfaceWins:{Hard:0,Clay:0,Grass:0,Indoor:0}, surfaceLosses:{Hard:0,Clay:0,Grass:0,Indoor:0},
    results:[], withdrawals:[], intendedTargets:[], bestRanking:999, startRanking:999,
  };
}

function emptyDoublesSeason(year) {
  return {year,matches:0,wins:0,losses:0,titles:0,majors:0,points:0,tournaments:0,results:[],bestRanking:999,startRanking:999};
}

function rarityList(rng, counts = ACTIVE_RARITY_COUNTS) {
  const list = [];
  for (const [rarity,count] of Object.entries(counts)) {
    for (let i = 0; i < count; i += 1) list.push(rarity);
  }
  return rng.shuffle(list);
}

function makePlayer(rng, tour, index, year, rarity, age, idPrefix = 'P', context = {}) {
  const country = chooseCountry(rng,rarity,context);
  const { firstName,lastName } = createName(rng, country, tour,context);
  const curveType = weightedValue(rng, CURVE_WEIGHTS);
  const rarityConfig = RARITIES[rarity];
  const maxRating = round1(rng.float(rarityConfig.min, rarityConfig.max));
  const style = rng.pick(STYLES);
  const preferredSurface = stylePreferredSurface(rng, style);
  const peakAge = curveType === 'Late bloomer' ? rng.int(28,31) : curveType === 'Young prodigy' ? rng.int(21,23) : rng.int(23,28);
  const player = {
    id: `${idPrefix}-${tour}-${year}-${index}-${rng.int(1000,9999)}`,
    tour,
    firstName,
    lastName,
    country: country.code,
    age,
    birthYear: year - age,
    birthMonth: rng.int(1,12),
    birthDay: rng.int(1,28),
    handedness: rng.next() < 0.14 ? 'Left' : 'Right',
    backhand: rng.next() < 0.18 ? 'One-handed' : 'Two-handed',
    heightCm: tour === 'ATP' ? rng.int(178,206) : rng.int(164,188),
    rarity,
    maxRating,
    curveType,
    peakAge,
    academy: rng.pick(['National federation academy','Regional performance center','Private family team','International tennis academy','Local club system','College-style development program']),
    socialPersonality: rng.pick(SOCIAL_PERSONALITIES),
    fame: 0,
    personalityTags: rng.shuffle(['Calm competitor','Emotional spark','Quiet professional','Crowd favorite','Relentless worker','Big-match hunter','Tactical student','Independent traveler']).slice(0,2),
    injuryResilience: rng.int(55,98),
    retirementInclination: rng.int(30,85),
    narrativeTags: [],
    style,
    preferredSurface,
    surfaceAffinity: buildSurfaceAffinity(rng, preferredSurface, style),
    skills: buildSkills(rng, maxRating, style),
    currentMultiplier: 1,
    currentRating: 0,
    shape: rng.int(44,78),
    fatigue: rng.int(0,18),
    health: rng.int(91,100),
    momentum: 0,
    ranking: 999,
    previousRanking: 999,
    rankingPoints: 0,
    carryPoints: 0,
    pointsLog: [],
    lastPlayedWeek: 0,
    weeksPlayedConsecutive: 0,
    injury: null,
    protectedRanking: null,
    protectedRankingUntil: null,
    targetEvents: [],
    developmentHistory: [],
    matchHistory: [],
    season: emptySeason(year),
    career: emptyCareer(),
    status: 'active',
    doublesPotential: clamp(Math.round((maxRating * 0.68) + (rng.int(55,95) * 0.32) + (style === 'Serve-and-volley' ? 6 : 0) + (style === 'All-court' ? 4 : 0)), 45, 100),
    doublesFocus: 'occasional',
    doublesPoints: 0,
    doublesRanking: 999,
    doublesPeakRanking: 999,
    doublesShape: rng.int(42,76),
    doublesTacticalRating: 0,
    notes: [],
  };
  recalculatePlayer(player);
  player.doublesTacticalRating = round1((player.skills.serve * 0.20 + player.skills.return * 0.18 + player.skills.volley * 0.22 + player.skills.tactics * 0.18 + player.skills.mentality * 0.12 + player.skills.footwork * 0.10) * player.currentMultiplier);
  if (curveType === 'Young prodigy') player.narrativeTags.push('Prodigy');
  if (curveType === 'Late bloomer') player.narrativeTags.push('Late bloomer');
  if (player.skills.serve >= 92) player.narrativeTags.push('Giant server');
  if (preferredSurface === 'Clay' && player.surfaceAffinity.Clay >= 94) player.narrativeTags.push('Clay artisan');
  if (player.skills.tactics >= 92) player.narrativeTags.push('Tactical chameleon');
  if (player.doublesPotential >= 90) player.narrativeTags.push('Doubles instinct');
  player.developmentHistory.push({year,age, multiplier:player.currentMultiplier, rating:player.currentRating, maxRating:player.maxRating});
  return player;
}

export function createJunior(rng, tour, index, year, forcedRarity = null, forcedAge = null, context = {}) {
  const roll = rng.next();
  let rarity = forcedRarity;
  if (!rarity) {
    if (roll < 0.006) rarity = 'Generational';
    else if (roll < 0.04) rarity = 'Legend';
    else if (roll < 0.13) rarity = 'Epic';
    else if (roll < 0.37) rarity = 'Rare';
    else if (roll < 0.72) rarity = 'Uncommon';
    else rarity = 'Common';
  }
  const age = forcedAge ?? rng.int(15,19);
  const player = makePlayer(rng, tour, index, year, rarity, age, 'J',context);
  player.junior = true;
  player.juniorRanking = 999;
  player.juniorPoints = Math.max(0,Math.round((player.currentRating-45)**2*rng.float(.25,.65)));
  player.juniorPeakRanking = 999;
  player.proReadiness = round1(player.currentRating * 0.78 + player.maxRating * 0.22 + (age - 15) * 2.2);
  player.shape = rng.int(48,80);
  player.fatigue = rng.int(0,12);
  player.season = emptySeason(year);
  return player;
}

export function createDoublesPlayer(rng, tour, index, year, sourceJunior = null, context = {}) {
  if (sourceJunior) {
    const p = {
      ...sourceJunior,
      id: `D-${tour}-${year}-${index}-${rng.int(1000,9999)}`,
      junior: false,
      status: 'active',
      doublesSpecialist: true,
      doublesRanking: 999,
      doublesPoints: 0,
      doublesCareer: { matches: 0, wins: 0, losses: 0, titles: 0, majors: 0, weeksNo1: 0, peakRanking: 999 },
      doublesSeason: emptyDoublesSeason(year),
    };
    p.doublesRating = round1((p.skills.serve * 0.20 + p.skills.return * 0.18 + p.skills.volley * 0.22 + p.skills.tactics * 0.16 + p.skills.mentality * 0.12 + p.skills.footwork * 0.12) * p.currentMultiplier);
    return p;
  }
  const rarityRoll = rng.next();
  const rarity = rarityRoll < 0.02 ? 'Legend' : rarityRoll < 0.11 ? 'Epic' : rarityRoll < 0.37 ? 'Rare' : rarityRoll < 0.78 ? 'Uncommon' : 'Common';
  const age = rng.int(19,36);
  const p = makePlayer(rng, tour, index, year, rarity, age, 'D',{usedNames:context.usedNames,eliteCountryCounts:new Map()});
  p.doublesSpecialist = true;
  p.doublesRanking = 999;
  p.doublesPoints = Math.max(0, Math.round((p.currentRating - 55) ** 2 * rng.float(0.45,1.15)));
  p.doublesCareer = { matches: 0, wins: 0, losses: 0, titles: 0, majors: 0, weeksNo1: 0, peakRanking: 999 };
  p.doublesSeason = emptyDoublesSeason(year);
  p.doublesRating = round1((p.skills.serve * 0.20 + p.skills.return * 0.18 + p.skills.volley * 0.22 + p.skills.tactics * 0.16 + p.skills.mentality * 0.12 + p.skills.footwork * 0.12) * p.currentMultiplier);
  return p;
}

function initializeRankings(players, rng) {
  // A new universe begins on January 1 with a clean ranking ledger.
  // Rating only breaks the initial zero-point tie; once matches begin, points own the table.
  for (const p of players) {
    p.carryPoints = 0;
    p.rankingPoints = 0;
    p.season.racePoints = 0;
  }
  players.sort((a,b) => b.currentRating - a.currentRating || a.id.localeCompare(b.id));
  players.forEach((p,index) => {
    p.ranking = index + 1;
    p.previousRanking = p.ranking;
    p.career.peakRanking = p.ranking;
    p.season.startRanking = p.ranking;
    p.season.bestRanking = p.ranking;
  });
}

function initializeJuniorRankings(juniors) {
  juniors.sort((a,b) => b.proReadiness - a.proReadiness);
  juniors.forEach((p,index) => { p.juniorRanking = index + 1; });
}

function initializeDoublesRankings(players) {
  players.sort((a,b) => b.doublesPoints - a.doublesPoints || b.doublesRating - a.doublesRating);
  players.forEach((p,index) => {
    p.doublesRanking = index + 1;
    p.doublesCareer.peakRanking = p.doublesRanking;
  });
}

function createTourPlayers(rng, tour, year, context) {
  const rarities = rarityList(rng);
  const players = rarities.map((rarity,index) => {
    const ageBias = rarity === 'Generational' ? rng.int(20,31) : rarity === 'Legend' ? rng.int(20,33) : rng.int(18,34);
    return makePlayer(rng, tour, index, year, rarity, ageBias, 'P',context);
  });
  initializeRankings(players, rng);
  return players;
}

function createTourJuniors(rng, tour, year, context) {
  const juniors = [];
  // One visible elite prospect per junior tour at most, preserving active rarity scarcity.
  juniors.push(createJunior(rng, tour, 0, year, rng.next() < 0.45 ? 'Generational' : 'Legend', rng.int(15,17),context));
  for (let i = 1; i < JUNIOR_TARGET; i += 1) juniors.push(createJunior(rng, tour, i, year,null,null,context));
  initializeJuniorRankings(juniors);
  return juniors;
}

function createTourDoubles(rng, tour, year, context) {
  const players = [];
  for (let i = 0; i < DOUBLES_CAP; i += 1) players.push(createDoublesPlayer(rng, tour, i, year,null,context));
  initializeDoublesRankings(players);
  return players;
}

export function fullName(player) {
  return `${player.firstName} ${player.lastName}`;
}

export function addFame(player, amount) {
  if(!player||!Number.isFinite(amount)||amount<=0)return player?.fame||0;
  player.fame=Math.max(0,Math.round((player.fame||0)+amount));
  return player.fame;
}

export function estimateCareerFame(player) {
  const c=player?.career||{};
  const dc=player?.doublesCareer||{};
  const titleLog=c.titleLog||[];
  const uniqueMajors=new Set(titleLog.filter(row=>row.level==='Grand Slam').map(row=>row.event)).size;
  const wins=c.wins||dc.wins||0,losses=c.losses||dc.losses||0;
  const winPct=wins+losses?wins/(wins+losses):0;
  return Math.max(0,Math.round(
    (c.majors||0)*90+(c.masters||0)*22+(c.titles||0)*12+(c.weeksNo1||0)*1.5+(c.yearEndNo1||0)*35+
    uniqueMajors*30+(c.olympicGolds||0)*70+(c.nationalTeamTitles||0)*12+
    (dc.majors||c.doublesMajors||0)*42+(dc.titles||c.doublesTitles||0)*6+Math.max(0,winPct-.5)*300
  ));
}

export function createUniverse({ seed = Date.now(), startYear = 2026, name = 'Tennis World' } = {}) {
  const rng = new RNG(seed);
  // One shared generation ledger prevents exact duplicate names and makes
  // exceptional talent from very small nations possible without clustering.
  const sharedContext=createGenerationContext([]);
  const atpContext=sharedContext,wtaContext=sharedContext;
  const atp = createTourPlayers(rng, 'ATP', startYear,atpContext);
  const wta = createTourPlayers(rng, 'WTA', startYear,wtaContext);
  const juniorsATP = createTourJuniors(rng, 'ATP', startYear,atpContext);
  const juniorsWTA = createTourJuniors(rng, 'WTA', startYear,wtaContext);
  const doublesATP = createTourDoubles(rng, 'ATP', startYear,atpContext);
  const doublesWTA = createTourDoubles(rng, 'WTA', startYear,wtaContext);
  return {
    schemaVersion: 6,
    id: `universe-${startYear}-${seed}`,
    name,
    seed,
    rngSeed: rng.seed,
    startYear,
    year: startYear,
    week: 1,
    seasonEnded: false,
    players: { ATP: atp, WTA: wta },
    juniors: { ATP: juniorsATP, WTA: juniorsWTA },
    doublesPlayers: { ATP: doublesATP, WTA: doublesWTA },
    doublesTeams: { ATP: [], WTA: [] },
    retiredPlayers: { ATP: [], WTA: [] },
    calendar: buildCalendar(startYear),
    juniorCalendar: buildJuniorCalendar(startYear),
    tournamentEditions: [],
    juniorEditions: [],
    doublesEditions: [],
    rankingHistory: [{
      year:startYear,week:1,phase:'start',
      ATP:atp.slice(0,100).map(p=>({id:p.id,rank:p.ranking,points:0,racePoints:0})),
      WTA:wta.slice(0,100).map(p=>({id:p.id,rank:p.ranking,points:0,racePoints:0})),
    }],
    magazine: [{
      id: `story-${startYear}-welcome`,
      year: startYear,
      week: 1,
      category: 'World',
      headline: 'A new tennis universe begins',
      body: `The ${startYear} season opens with 360 ATP and 360 WTA singles players, full doubles fields and a new junior generation.`,
      importance: 5,
    }],
    records: [],
    hallOfFame: [],
    rivalries: {},
    rivalryCandidates: {},
    partnershipHistory: [],
    olympicsHistory: [],
    nationalTeams: { ATP: [], WTA: [] },
    awards: [],
    yearSummaries: [],
    followedPlayerIds: [],
    transition: {
      mode: 'beginning',
      year: startYear,
      newJuniors: [...juniorsATP.slice(0,5), ...juniorsWTA.slice(0,5)].map(p => ({ id:p.id, tour:p.tour, name:fullName(p), country:p.country, age:p.age, rarity:p.rarity, rating:p.currentRating })),
      promoted: [],
      doublesConversions: [],
      retired: [],
      overflowRetired: [],
      message: `Welcome to the ${startYear} season. The first junior class has entered the Chronicle.`,
    },
    settings: {
      autosave: true,
      compactResults: false,
      fullDraws: true,
      injuries: true,
      juniorProEntries: true,
    },
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      simulations: 0,
      rivalryLedgerMigrated: true,
      namesDisambiguated: true,
    },
  };
}

export function refreshRankings(players) {
  for (const p of players) {
    p.previousRanking = p.ranking;
    const livePoints = p.pointsLog.reduce((sum, row) => sum + row.points, 0);
    p.rankingPoints = Math.max(0, Math.round((p.carryPoints || 0) + livePoints));
    p.season.racePoints = p.pointsLog.filter(row=>row.year===p.season.year).reduce((sum,row)=>sum+row.points,0);
  }
  players.sort((a,b) => b.rankingPoints - a.rankingPoints || b.currentRating - a.currentRating || a.id.localeCompare(b.id));
  players.forEach((p,index) => {
    p.ranking = index + 1;
    p.career.peakRanking = Math.min(p.career.peakRanking || 999, p.ranking);
    p.season.bestRanking = Math.min(p.season.bestRanking || 999,p.ranking);
  });
}

export function refreshJuniorRankings(juniors) {
  juniors.forEach(p => { p.proReadiness = round1(p.currentRating * 0.78 + p.maxRating * 0.22 + (p.age - 15) * 2.2 + p.season.wins * 0.08); });
  juniors.sort((a,b) => (b.juniorPoints||0) - (a.juniorPoints||0) || b.proReadiness - a.proReadiness || b.currentRating - a.currentRating);
  juniors.forEach((p,index) => { p.juniorRanking = index + 1; p.juniorPeakRanking=Math.min(p.juniorPeakRanking||999,p.juniorRanking); });
}

export function refreshDoublesRankings(players, { countWeek = true } = {}) {
  players.sort((a,b) => (b.doublesPoints||0) - (a.doublesPoints||0) || (b.doublesRating||b.doublesTacticalRating||0) - (a.doublesRating||a.doublesTacticalRating||0));
  players.forEach((p,index) => {
    p.doublesRanking = index + 1;
    p.doublesPeakRanking = Math.min(p.doublesPeakRanking || 999,p.doublesRanking);
    if(p.doublesSpecialist){
      p.doublesCareer??={matches:0,wins:0,losses:0,titles:0,majors:0,weeksNo1:0,peakRanking:999};
      p.doublesCareer.peakRanking = Math.min(p.doublesCareer.peakRanking || 999, p.doublesRanking);
      if(countWeek&&p.doublesRanking===1)p.doublesCareer.weeksNo1=(p.doublesCareer.weeksNo1||0)+1;
    } else {
      p.career.doublesPeakRanking=Math.min(p.career.doublesPeakRanking||999,p.doublesRanking);
      if(countWeek&&p.doublesRanking===1)p.career.doublesWeeksNo1=(p.career.doublesWeeksNo1||0)+1;
    }
  });
}

export function resetSeason(player, year) {
  const prior=player.season||emptySeason(year-1);
  const titleList=(player.career?.titleLog||[]).filter(row=>row.year===prior.year).map(row=>({event:row.event,level:row.level,surface:row.surface,finalist:row.finalist}));
  if(prior.year!=null)player.career.seasons.push({
    year:prior.year,matches:prior.matches||0,wins:prior.wins||0,losses:prior.losses||0,
    titles:prior.titles||0,majors:prior.majors||0,tournaments:prior.tournaments||0,
    points:player.rankingPoints||prior.racePoints||prior.points||0,racePoints:prior.racePoints||prior.points||0,
    startRanking:prior.startRanking||999,bestRanking:prior.bestRanking||999,endRanking:player.ranking||999,
    surfaceWins:{...(prior.surfaceWins||{})},surfaceLosses:{...(prior.surfaceLosses||{})},titleList,
  });
  player.career.doublesSeasons??=[];
  if(player.doublesSeason){
    const ds=player.doublesSeason;
    const doublesTitles=(ds.titleList||((ds.results||[]).filter(row=>row.round==='W').map(row=>({event:row.event,level:row.level,surface:row.surface,partnerNames:row.partnerNames||[]}))));
    player.career.doublesSeasons.push({year:ds.year,matches:ds.matches||0,wins:ds.wins||0,losses:ds.losses||0,titles:ds.titles||0,majors:ds.majors||0,points:ds.points||0,tournaments:ds.tournaments||0,bestRanking:ds.bestRanking||999,endRanking:player.doublesRanking||999,titleList:doublesTitles});
  }
  player.season = emptySeason(year);
  player.doublesSeason = emptyDoublesSeason(year);
  player.season.startRanking = player.ranking || 999;
  player.season.bestRanking = player.ranking || 999;
  player.doublesSeason.startRanking = player.doublesRanking || 999;
  player.doublesSeason.bestRanking = player.doublesRanking || 999;
  player.momentum = 0;
  player.weeksPlayedConsecutive = 0;
  player.developmentHistory??=[];
  player.developmentHistory.push({year,age:player.age,multiplier:player.currentMultiplier,rating:player.currentRating,maxRating:player.maxRating});
}
