import { simulateMatch, effectiveStrength } from './match.js';
import { clamp } from './random.js';
import { fullName } from './generation.js';
import { recordRivalryMeeting } from './rivalries.js';

const ROUND_NAMES={128:['R128','R64','R32','R16','QF','SF','F'],64:['R64','R32','R16','QF','SF','F'],32:['R32','R16','QF','SF','F'],16:['R16','QF','SF','F'],8:['QF','SF','F']};
const POINTS_BY_LEVEL={
  'Grand Slam':{R128:10,R64:45,R32:90,R16:180,QF:360,SF:720,F:1200,W:2000},
  '1000':{R64:10,R32:45,R16:90,QF:180,SF:360,F:600,W:1000},
  '500':{R32:0,R16:50,QF:100,SF:200,F:330,W:500},'250':{R32:0,R16:25,QF:50,SF:90,F:150,W:250},
  Challenger:{R32:0,R16:12,QF:25,SF:45,F:75,W:125},'WTA 125':{R32:0,R16:12,QF:25,SF:45,F:75,W:125},
  ITF:{R16:0,QF:8,SF:18,F:30,W:50},Finals:{QF:200,SF:400,F:800,W:1500},Olympics:{R64:0,R32:0,R16:0,QF:0,SF:0,F:0,W:0},
};

function levelPriority(level){return {'Grand Slam':100,Olympics:98,'1000':86,Finals:92,'500':65,'250':45,Challenger:28,'WTA 125':28,ITF:15}[level]||10;}
function effectiveRank(player){return player.protectedRanking&&player.protectedRankingUntil?Math.min(player.ranking||999,player.protectedRanking):player.ranking||999;}

function eligible(player,event,unavailable){
  if(player.status!=='active'||unavailable.has(player.id)||player.health<=55||player.injury?.weeksRemaining>0)return false;
  if(player.fatigue> (event.level==='Grand Slam'?90:event.level==='1000'?82:76))return false;
  const eventCount=player.season?.tournaments||0;
  if(eventCount>=25)return false;
  if(player.skills?.endurance<60&&eventCount>=15)return false;
  if((player.weeksPlayedConsecutive||0)>=3&&event.level!=='Grand Slam'&&player.skills?.endurance<82)return false;
  if(player.junior&&(!['250','500','Challenger','WTA 125','ITF'].includes(event.level)||player.age<17))return false;
  return true;
}

function entryScore(player,event,rng){
  const rank=effectiveRank(player);const rankScore=400-Math.min(400,rank);
  const surface=(player.surfaceAffinity?.[event.surface]||70)-70;const fatiguePenalty=(player.fatigue||0)*1.05;const shape=((player.shape||50)-50)*0.45;
  const developmental=['250','Challenger','WTA 125','ITF'].includes(event.level)&&rank>60?55:0;
  const topSkip=event.level==='250'&&rank<=12?-105:event.level==='500'&&rank<=6?-42:['Challenger','WTA 125','ITF'].includes(event.level)&&rank<=70?-150:0;
  const target=(player.targetEvents||[]).includes(event.name)?95:0;
  const surfaceBlock=player.preferredSurface===event.surface?20:0;
  const majorCommitment=event.level==='Grand Slam'?150:event.level==='1000'?45:0;
  const juniorBonus=player.junior?(player.proReadiness||0)*.3-25:0;
  return rankScore+surface*1.7+shape+developmental+target+surfaceBlock+majorCommitment+juniorBonus+topSkip-fatiguePenalty+rng.normal(0,8);
}

function qualifierSlots(event){if(['Finals','Olympics'].includes(event.level))return 0;if(event.drawSize>=128)return 16;if(event.drawSize>=64)return 8;if(event.drawSize>=32)return 4;return 0;}
function wildcardSlots(event){if(event.level==='Finals')return 0;if(event.drawSize>=128)return 8;if(event.drawSize>=64)return 4;if(event.drawSize>=32)return 2;return 1;}

function playQualifying(candidates,event,slots,rng){
  if(!slots)return {qualifiers:[],matches:[]};
  const needed=Math.min(candidates.length,slots*4);let alive=candidates.slice(0,needed);const matches=[];
  const roundNames=alive.length>=slots*4?['Q1','Q2']:['Q'];
  for(const round of roundNames){
    const next=[];
    for(let i=0;i+1<alive.length;i+=2){
      const a=alive[i],b=alive[i+1];const qa=effectiveStrength(a,b,event.surface,0,3)+rng.normal(0,2.4);const qb=effectiveStrength(b,a,event.surface,0,3)+rng.normal(0,2.4);
      const winner=rng.next()<1/(1+Math.exp(-(qa-qb)/7))?a:b;const loser=winner.id===a.id?b:a;
      winner.fatigue=clamp(winner.fatigue+3.5,0,100);loser.fatigue=clamp(loser.fatigue+2.5,0,100);
      winner.shape=clamp(winner.shape+0.8,0,100);loser.shape=clamp(loser.shape+0.2,0,100);
      matches.push({id:`${event.id}-${round}-${a.id}-${b.id}`,eventId:event.id,year:event.year,week:event.week,tour:event.tour,round,surface:event.surface,playerA:a.id,playerB:b.id,winnerId:winner.id,loserId:loser.id,score:rng.next()<.55?'6-4 6-3':'7-6 4-6 6-3',sets:2,totalGames:19,qualifying:true,explanation:'earned a place through qualifying'});
      next.push(winner);
    }
    alive=next;
  }
  return {qualifiers:alive.slice(0,slots),matches};
}

export function selectEntries(players,event,unavailable,rng){
  const candidates=players.filter(p=>eligible(p,event,unavailable)).map(p=>({p,score:entryScore(p,event,rng)})).sort((a,b)=>b.score-a.score);
  const qSlots=qualifierSlots(event),wcSlots=wildcardSlots(event),directSlots=Math.max(0,event.drawSize-qSlots-wcSlots);
  const direct=candidates.slice(0,directSlots).map(r=>r.p);const used=new Set(direct.map(p=>p.id));
  const wildcardPool=candidates.filter(r=>!used.has(r.p.id)).sort((a,b)=>{
    const localA=a.p.country===event.country?40:0,localB=b.p.country===event.country?40:0;
    const youthA=a.p.age<=21?18:0,youthB=b.p.age<=21?18:0;
    const statusA=['Generational','Legend'].includes(a.p.rarity)&&a.p.ranking>80?15:0,statusB=['Generational','Legend'].includes(b.p.rarity)&&b.p.ranking>80?15:0;
    return (b.score+localB+youthB+statusB)-(a.score+localA+youthA+statusA);
  });
  const wildcards=wildcardPool.slice(0,wcSlots).map(r=>r.p);wildcards.forEach(p=>used.add(p.id));
  const qualifyingPool=candidates.filter(r=>!used.has(r.p.id)).slice(0,qSlots*4).map(r=>r.p);
  const qualifying=playQualifying(qualifyingPool,event,qSlots,rng);qualifying.qualifiers.forEach(p=>used.add(p.id));
  let entries=[...direct,...wildcards,...qualifying.qualifiers];
  if(entries.length<event.drawSize){for(const row of candidates){if(entries.length>=event.drawSize)break;if(!used.has(row.p.id)){entries.push(row.p);used.add(row.p.id);}}}
  entries=entries.slice(0,event.drawSize);
  const entryMeta=entries.map(p=>({id:p.id,type:direct.some(x=>x.id===p.id)?'Direct':wildcards.some(x=>x.id===p.id)?(p.junior?'Junior exemption':'Wild card'):'Qualifier',effectiveRank:effectiveRank(p)}));
  entries.forEach(p=>unavailable.add(p.id));
  return {entries,entryMeta,qualifyingMatches:qualifying.matches};
}

function seededOrder(entries,rng){
  const sorted=[...entries].sort((a,b)=>effectiveRank(a)-effectiveRank(b));const seedCount=Math.min(32,Math.floor(entries.length/4));const seeds=sorted.slice(0,seedCount),rest=rng.shuffle(sorted.slice(seedCount));const draw=new Array(entries.length);
  const positions=[0,entries.length-1,Math.floor(entries.length/2),Math.floor(entries.length/2)-1];
  seeds.forEach((seed,index)=>{let pos=positions[index]??Math.floor((index+.5)*entries.length/seeds.length);while(draw[pos])pos=(pos+1)%draw.length;draw[pos]=seed;});
  let cursor=0;for(let i=0;i<draw.length;i+=1)if(!draw[i])draw[i]=rest[cursor++];return draw;
}

function awardPoints(player,event,points,label){if(!points)return;player.pointsLog??=[];player.pointsLog.push({eventId:event.id,year:event.year,week:event.week,points,label});player.season.points+=points;player.season.racePoints=(player.season.racePoints||0)+points;}
function slimMatch(match,won,event){return {id:match.id,year:match.year,week:match.week,eventId:match.eventId,eventName:event?.name,level:event?.level,round:match.round,surface:match.surface,opponentId:won?match.loserId:match.winnerId,won,score:match.score,durationMinutes:match.durationMinutes,upset:match.upset};}

function recordMatch(universe,winner,loser,event,match){
  winner.season.matches+=1;winner.season.wins+=1;winner.season.surfaceWins[event.surface]=(winner.season.surfaceWins[event.surface]||0)+1;
  loser.season.matches+=1;loser.season.losses+=1;loser.season.surfaceLosses[event.surface]=(loser.season.surfaceLosses[event.surface]||0)+1;
  winner.career.matches+=1;winner.career.wins+=1;winner.career.surfaceWins[event.surface]=(winner.career.surfaceWins[event.surface]||0)+1;
  loser.career.matches+=1;loser.career.losses+=1;loser.career.surfaceLosses[event.surface]=(loser.career.surfaceLosses[event.surface]||0)+1;
  for(const p of [winner,loser]){p.career.surfaceExposure??={Hard:0,Clay:0,Grass:0,Indoor:0};p.career.surfaceExposure[event.surface]=(p.career.surfaceExposure[event.surface]||0)+1;if(event.surface!==p.preferredSurface&&(p.surfaceAffinity[event.surface]||0)<92){const adaptation=.012+Math.max(0,(p.skills.tactics-70))*.00035;p.surfaceAffinity[event.surface]=Math.min(92,Math.round((p.surfaceAffinity[event.surface]+adaptation)*100)/100);}}
  winner.career.currentWinStreak=(winner.career.currentWinStreak||0)+1;winner.career.longestWinStreak=Math.max(winner.career.longestWinStreak||0,winner.career.currentWinStreak);loser.career.currentWinStreak=0;
  if(match.sets>=5){winner.career.fiveSetWins+=1;loser.career.fiveSetLosses+=1;}
  if(match.tags?.includes('deciding set')){winner.career.decidingSetWins+=1;loser.career.decidingSetLosses+=1;}
  if(!winner.career.longestMatch||match.durationMinutes>winner.career.longestMatch.durationMinutes)winner.career.longestMatch={event:event.name,year:event.year,opponent:fullName(loser),durationMinutes:match.durationMinutes,score:match.score};
  if(!loser.career.longestMatch||match.durationMinutes>loser.career.longestMatch.durationMinutes)loser.career.longestMatch={event:event.name,year:event.year,opponent:fullName(winner),durationMinutes:match.durationMinutes,score:match.score};
  const rankingGap=(winner.ranking||999)-(loser.ranking||999);if(rankingGap>0&&(!winner.career.biggestUpset||rankingGap>winner.career.biggestUpset.rankingGap))winner.career.biggestUpset={opponent:fullName(loser),opponentRanking:loser.ranking,rankingGap,event:event.name,year:event.year,round:match.round};
  if(!winner.career.bestWin||loser.ranking<winner.career.bestWin.opponentRanking)winner.career.bestWin={opponent:fullName(loser),opponentRanking:loser.ranking,event:event.name,year:event.year,round:match.round};
  winner.matchHistory??=[];loser.matchHistory??=[];winner.matchHistory.push(slimMatch(match,true,event));loser.matchHistory.push(slimMatch(match,false,event));
  if(winner.matchHistory.length>96)winner.matchHistory.shift();if(loser.matchHistory.length>96)loser.matchHistory.shift();
  recordRivalryMeeting(universe,winner,loser,event,match);
  if(winner.junior){winner.career.proAppearances+=1;winner.career.proWins+=1;if(!winner.career.firstProWin)winner.career.firstProWin={event:event.name,year:event.year,week:event.week,opponent:fullName(loser)};}if(loser.junior)loser.career.proAppearances+=1;
}

export function simulateSinglesEvent(players,event,unavailable,rng,universe=null){
  const selection=selectEntries(players,event,unavailable,rng),entries=selection.entries;if(entries.length<Math.min(8,event.drawSize))return null;
  const effectiveDrawSize=2**Math.floor(Math.log2(entries.length));let alive=seededOrder(entries.slice(0,effectiveDrawSize),rng);const rounds=ROUND_NAMES[effectiveDrawSize]||ROUND_NAMES[32];const matches=[],exitRound=new Map();
  for(const round of rounds){const next=[];for(let i=0;i<alive.length;i+=2){const a=alive[i],b=alive[i+1],match=simulateMatch(a,b,event,rng,round);matches.push(match);const winner=match.winnerId===a.id?a:b,loser=winner.id===a.id?b:a;recordMatch(universe,winner,loser,event,match);exitRound.set(loser.id,round);next.push(winner);}alive=next;}
  const champion=alive[0],finalMatch=matches[matches.length-1],finalist=entries.find(p=>p.id===finalMatch.loserId),table=POINTS_BY_LEVEL[event.level]||POINTS_BY_LEVEL.ITF;
  for(const p of entries){const round=p.id===champion.id?'W':exitRound.get(p.id)||rounds[0];awardPoints(p,event,table[round]||0,round);p.season.tournaments+=1;p.season.results.push({eventId:event.id,event:event.name,level:event.level,surface:event.surface,round,points:table[round]||0,entryType:selection.entryMeta.find(m=>m.id===p.id)?.type||'Direct',seed:entries.slice().sort((a,b)=>effectiveRank(a)-effectiveRank(b)).findIndex(x=>x.id===p.id)+1,week:event.week});}
  champion.season.titles+=1;champion.career.titles+=1;champion.career.surfaceTitles[event.surface]=(champion.career.surfaceTitles[event.surface]||0)+1;champion.career.titlesByLevel[event.level]=(champion.career.titlesByLevel[event.level]||0)+1;
  if(finalist)finalist.career.finals=(finalist.career.finals||0)+1;
  if(event.level==='Grand Slam'){champion.season.majors+=1;champion.career.majors+=1;}if(event.level==='1000')champion.career.masters=(champion.career.masters||0)+1;if(event.level==='Olympics'){champion.career.olympicMedals+=1;champion.career.olympicGolds+=1;}
  champion.career.titleLog.push({year:event.year,event:event.name,level:event.level,surface:event.surface,finalist:fullName(finalist)});
  return {id:event.id,event:{...event,status:'completed'},championId:champion.id,finalistId:finalist?.id,championName:fullName(champion),finalistName:finalist?fullName(finalist):'',championCountry:champion.country,matches,qualifyingMatches:selection.qualifyingMatches,drawSize:effectiveDrawSize,entryIds:entries.map(p=>p.id),entryMeta:selection.entryMeta,seeds:entries.slice().sort((a,b)=>effectiveRank(a)-effectiveRank(b)).slice(0,Math.min(32,effectiveDrawSize/4)).map((p,index)=>({id:p.id,rank:index+1,name:fullName(p)})),completedAtWeek:event.week};
}

function juniorStrength(player,event){return player.currentRating+((player.surfaceAffinity[event.surface]||70)-70)*.12+(player.shape-50)*.05-player.fatigue*.06;}
function juniorPointsFor(level,round){const max={'Junior Slam':1000,'Junior Finals':750,'Junior 500':500,Continental:400}[level]||300;const fraction={W:1,F:.62,SF:.36,QF:.2,R16:.1,R32:.04}[round]||0;return Math.round(max*fraction);}
function juniorSeededOrder(entries,rng){const sorted=[...entries].sort((a,b)=>(a.juniorRanking||999)-(b.juniorRanking||999));const seeds=sorted.slice(0,Math.min(8,Math.floor(entries.length/4))),rest=rng.shuffle(sorted.slice(seeds.length)),draw=new Array(entries.length);seeds.forEach((p,i)=>{let pos=Math.floor((i+.5)*entries.length/seeds.length);while(draw[pos])pos=(pos+1)%draw.length;draw[pos]=p;});let c=0;for(let i=0;i<draw.length;i+=1)if(!draw[i])draw[i]=rest[c++];return draw;}
export function simulateJuniorEvent(juniors,event,rng){
  const entries=[...juniors].sort((a,b)=>(a.juniorRanking||999)-(b.juniorRanking||999)||(juniorStrength(b,event)+rng.normal(0,1.5))-(juniorStrength(a,event)+rng.normal(0,1.5))).slice(0,event.drawSize);let alive=juniorSeededOrder(entries,rng);const matches=[],roundNames=ROUND_NAMES[event.drawSize]||ROUND_NAMES[32],exitRound=new Map();
  for(const round of roundNames){const next=[];for(let i=0;i<alive.length;i+=2){const a=alive[i],b=alive[i+1],diff=juniorStrength(a,event)-juniorStrength(b,event),winner=rng.next()<1/(1+Math.exp(-diff/7))?a:b,loser=winner.id===a.id?b:a;winner.season.matches+=1;winner.season.wins+=1;winner.career.matches+=1;winner.career.wins+=1;loser.season.matches+=1;loser.season.losses+=1;loser.career.matches+=1;loser.career.losses+=1;winner.shape=clamp(winner.shape+1.3,0,100);loser.shape=clamp(loser.shape+.3,0,100);winner.fatigue=clamp(winner.fatigue+3,0,100);loser.fatigue=clamp(loser.fatigue+2,0,100);matches.push({id:`${event.id}-${round}-${a.id}-${b.id}`,eventId:event.id,year:event.year,week:event.week,tour:event.tour,round,surface:event.surface,playerA:a.id,playerB:b.id,winnerId:winner.id,loserId:loser.id,score:rng.next()<.55?'6-3 6-4':'7-6 4-6 6-3',sets:2,totalGames:19,durationMinutes:95});exitRound.set(loser.id,round);next.push(winner);}alive=next;}
  const champion=alive[0],finalMatch=matches[matches.length-1],finalist=entries.find(p=>p.id===finalMatch?.loserId);for(const p of entries){const round=p.id===champion.id?'W':exitRound.get(p.id)||roundNames[0];p.juniorPoints=(p.juniorPoints||0)+juniorPointsFor(event.level,round);p.season.results.push({eventId:event.id,event:event.name,level:event.level,surface:event.surface,round,points:juniorPointsFor(event.level,round),week:event.week});p.season.tournaments+=1;}champion.season.titles+=1;champion.career.titles+=1;return {id:event.id,event:{...event,status:'completed'},championId:champion.id,finalistId:finalist?.id,championName:fullName(champion),finalistName:finalist?fullName(finalist):'',championCountry:champion.country,finalistCountry:finalist?.country,matches,entryIds:entries.map(p=>p.id),seeds:entries.slice().sort((a,b)=>(a.juniorRanking||999)-(b.juniorRanking||999)).slice(0,8).map((p,i)=>({id:p.id,rank:i+1,name:fullName(p)}))};
}
export function eventImportance(event){return levelPriority(event.level);}
