import { careerMultiplier, fullName } from './generation.js';
import { clamp } from './random.js';

const SKILL_KEYS=['serve','forehand','backhand','volley','return','footwork','endurance','mentality','tactics'];
const PERSONALITIES=['Calm competitor','Emotional spark','Quiet professional','Crowd favorite','Relentless worker','Big-match hunter','Tactical student','Independent traveler'];
const ACADEMIES=['National federation academy','Regional performance center','Private family team','International tennis academy','Local club system','College-style development program'];

function hashNumber(text='') {
  let h=2166136261;
  for (let i=0;i<text.length;i+=1) {h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return Math.abs(h>>>0);
}

function pickStable(list,id,offset=0){return list[(hashNumber(`${id}-${offset}`))%list.length];}
function numberStable(id,min,max,offset=0){return min+(hashNumber(`${id}-${offset}`)%(max-min+1));}

function ensureCareer(player){
  player.career??={};
  const c=player.career;
  c.matches??=0;c.wins??=0;c.losses??=0;c.titles??=0;c.majors??=0;c.finals??=0;c.masters??=0;
  c.olympicMedals??=0;c.olympicGolds??=0;c.weeksNo1??=0;c.yearEndNo1??=0;c.peakRanking??=999;
  c.doublesTitles??=0;c.doublesMajors??=0;c.doublesMatches??=0;c.doublesWins??=0;c.doublesLosses??=0;c.doublesPeakRanking??=999;c.doublesWeeksNo1??=0;c.doublesSeasons??=[];c.seasons??=[];c.titleLog??=[];c.bestWin??=null;
  c.titlesByLevel??={};
  c.surfaceWins??={Hard:0,Clay:0,Grass:0,Indoor:0};
  c.surfaceLosses??={Hard:0,Clay:0,Grass:0,Indoor:0};
  c.surfaceTitles??={Hard:0,Clay:0,Grass:0,Indoor:0};
  c.fiveSetWins??=0;c.fiveSetLosses??=0;c.decidingSetWins??=0;c.decidingSetLosses??=0;
  c.longestMatch??=null;c.biggestUpset??=null;c.longestWinStreak??=0;c.currentWinStreak??=0;
  c.nationalTeamAppearances??=0;c.nationalTeamTitles??=0;c.awards??=[];c.proAppearances??=0;c.proWins??=0;
  return c;
}

function ensureSeason(player,year){
  player.season??={year};
  const s=player.season;
  s.year??=year;s.matches??=0;s.wins??=0;s.losses??=0;s.titles??=0;s.majors??=0;s.points??=0;s.racePoints??=s.points||0;
  s.tournaments??=0;s.withdrawals??=[];s.intendedTargets??=[];s.results??=[];
  s.surfaceWins??={Hard:0,Clay:0,Grass:0,Indoor:0};
  s.surfaceLosses??={Hard:0,Clay:0,Grass:0,Indoor:0};
  s.bestRanking??=player.ranking||999;s.startRanking??=player.ranking||999;
  return s;
}

export function ensurePlayerData(player,year){
  if(!player||!player.id)return player;
  player.birthMonth??=numberStable(player.id,1,12,1);
  player.birthDay??=numberStable(player.id,1,28,2);
  player.backhand??=(hashNumber(`${player.id}-backhand`)%100<18?'One-handed':'Two-handed');
  const tourBase=player.tour==='ATP'?178:164;
  player.heightCm??=numberStable(player.id,tourBase,tourBase+(player.tour==='ATP'?28:22),3);
  player.academy??=pickStable(ACADEMIES,player.id,4);
  player.personalityTags??=[pickStable(PERSONALITIES,player.id,5),pickStable(PERSONALITIES,player.id,6)].filter((v,i,a)=>a.indexOf(v)===i);
  player.injuryResilience??=numberStable(player.id,55,98,7);
  player.retirementInclination??=numberStable(player.id,30,85,8);
  player.narrativeTags??=[];
  if(player.curveType==='Young prodigy')player.narrativeTags.push('Prodigy');
  if(player.curveType==='Late bloomer')player.narrativeTags.push('Late bloomer');
  if((player.skills?.serve||0)>=92)player.narrativeTags.push('Giant server');
  if(player.preferredSurface==='Clay'&&(player.surfaceAffinity?.Clay||0)>=94)player.narrativeTags.push('Clay artisan');
  if((player.skills?.tactics||0)>=92)player.narrativeTags.push('Tactical chameleon');
  if((player.doublesPotential||0)>=90)player.narrativeTags.push('Doubles instinct');
  player.narrativeTags=[...new Set(player.narrativeTags)].slice(0,4);
  player.health??=100;player.shape??=55;player.fatigue??=0;player.momentum??=0;
  player.doublesPoints??=0;player.doublesRanking??=999;player.doublesPeakRanking??=999;player.doublesShape??=player.shape;
  player.doublesSeason??={year,matches:0,wins:0,losses:0,titles:0,majors:0,points:0,tournaments:0,results:[],bestRanking:player.doublesRanking||999,startRanking:player.doublesRanking||999};
  player.doublesSeason.results??=[];player.doublesSeason.matches??=0;player.doublesSeason.wins??=0;player.doublesSeason.losses??=0;player.doublesSeason.titles??=0;player.doublesSeason.majors??=0;player.doublesSeason.points??=0;player.doublesSeason.tournaments??=0;
  if(player.doublesSpecialist)player.doublesCareer??={matches:0,wins:0,losses:0,titles:0,majors:0,weeksNo1:0,peakRanking:999};
  player.doublesTacticalRating??=Math.round(((player.skills?.serve||70)*.20+(player.skills?.return||70)*.18+(player.skills?.volley||70)*.22+(player.skills?.tactics||70)*.18+(player.skills?.mentality||70)*.12+(player.skills?.footwork||70)*.10)*10)/10;
  player.injury??=null;player.protectedRanking??=null;player.protectedRankingUntil??=null;
  player.targetEvents??=[];player.developmentHistory??=[];player.matchHistory??=[];
  player.pointsLog??=[];player.notes??=[];player.status??='active';
  ensureCareer(player);ensureSeason(player,year);
  if(!player.developmentHistory.some(row=>row.year===year)){
    player.developmentHistory.push({year,age:player.age,multiplier:player.currentMultiplier??careerMultiplier(player.curveType,player.age,player.peakAge),rating:player.currentRating,maxRating:player.maxRating});
  }
  for(const key of SKILL_KEYS) if(player.skills?.[key]==null) player.skills[key]=Math.round(player.currentRating||70);
  return player;
}

export function ensureUniverseData(universe){
  if(!universe)return universe;
  universe.schemaVersion=3;
  universe.retiredPlayers??={ATP:[],WTA:[]};
  universe.doublesTeams??={ATP:[],WTA:[]};
  universe.doublesEditions??=[];universe.juniorEditions??=[];universe.tournamentEditions??=[];
  universe.partnershipHistory??=[];universe.rankingHistory??=[];universe.magazine??=[];universe.records??=[];
  universe.nationalTeams??={ATP:[],WTA:[]};universe.olympicsHistory??=[];universe.awards??=[];universe.yearSummaries??=[];universe.followedPlayerIds??=[];
  universe.settings??={};
  universe.settings.autosave??=true;universe.settings.compactResults??=false;universe.settings.showTransitionScreens??=true;
  universe.settings.fullDraws??=true;universe.settings.injuries??=true;universe.settings.juniorProEntries??=true;
  universe.meta??={createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),simulations:0};
  for(const tour of ['ATP','WTA']){
    universe.players[tour]??=[];universe.juniors[tour]??=[];universe.doublesPlayers[tour]??=[];universe.retiredPlayers[tour]??=[];universe.doublesTeams[tour]??=[];universe.nationalTeams[tour]??=[];
    for(const p of [...universe.players[tour],...universe.juniors[tour],...universe.doublesPlayers[tour],...universe.retiredPlayers[tour]]) ensurePlayerData(p,universe.year);
  }
  for(const edition of universe.tournamentEditions){
    edition.qualifyingMatches??=[];edition.entryMeta??=(edition.entryIds||[]).map((id,index)=>({id,type:index<Math.max(0,(edition.drawSize||0)-8)?'Direct':'Qualifier'}));
    edition.matches??=[];
  }
  return universe;
}

export function describePlayer(player){
  if(!player)return '';
  const tags=[player.rarity,player.style,player.preferredSurface,player.curveType].filter(Boolean);
  return `${fullName(player)} — ${tags.join(' · ')}`;
}

export function conditionLabel(player){
  if(player.injury?.weeksRemaining>0)return `Injured (${player.injury.weeksRemaining}w)`;
  if(player.fatigue>=75)return 'Exhausted';
  if(player.fatigue>=55)return 'Tired';
  if(player.shape>=82)return 'Red hot';
  if(player.shape<=38)return 'Rusty';
  return 'Ready';
}

export function capCondition(player){
  player.shape=clamp(player.shape,0,100);player.fatigue=clamp(player.fatigue,0,100);player.health=clamp(player.health,0,100);
  return player;
}
