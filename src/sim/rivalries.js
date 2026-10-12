// ---------------------------------------------------------------------------
// Head-to-heads and rivalries (v0.8.1)
//
// Two separate concepts:
//   * Head-to-head ledger (universe.rivalryCandidates): every pairing that has
//     met, compact aggregates. Used for H2H lookups and player matchup pages.
//   * Rivalries (universe.rivalries): only pairings that IGNITED — repeated
//     clashes in the late rounds of the biggest events within a short window,
//     with both players winning some of them. Once ignited it is a lifetime
//     feud: tracked from that moment until one of them retires (then it is
//     "historic"). Target: roughly 4–8 live rivalries per tour at any time.
// ---------------------------------------------------------------------------
const SURFACES=['Hard','Clay','Grass','Indoor'];
const MAX_CANDIDATES=3000;
const MAX_HIGHLIGHTS=12;
const MAX_BIG_CLASHES=80;

// --- Ignition rule (tune here) ----------------------------------------------
// Weight of a meeting in the late rounds of a big event.
const CLASH_WEIGHT={
  'Grand Slam':{F:3,SF:2},
  Olympics:{F:2.5,SF:1.5},
  Finals:{F:2,SF:1},
  '1000':{F:1.5,SF:1},
};
// Tuned by replaying 4 worlds × 16 seasons: ~4 live rivalries per tour on
// average (typically 2–6, peaks of 8–9), about one new rivalry every 1–2 years.
export const IGNITION={
  windowWeeks:104,     // the feud must happen within two seasons
  minClashes:3,        // at least three SF/F clashes at Slams, Olympics, Tour Finals or Masters 1000
  minFinals:1,         // at least one of them a final
  minHeat:3.5,         // weighted: GS F 3, GS SF 2, Olympic F 2.5, Finals F 2, M1000 F 1.5, M1000 SF 1
  minUnderdogWins:1,   // both sides must have won at least one of those clashes
  maxShare:0.75,       // and it cannot be a one-way beating (if ≥4 clashes)
  maxLivePerTour:9,    // safety valve
};

export function rivalryKey(playerAId,playerBId){return [playerAId,playerBId].sort().join('::');}
const absWeek=(year,week)=>year*52+week;
function emptySurfaceLedger(){return Object.fromEntries(SURFACES.map(surface=>[surface,{meetings:0,winsA:0,winsB:0}]));}
function isPlayerA(row,id){return row.playerAId===id;}
export function clashWeight(level,round){return CLASH_WEIGHT[level]?.[round]||0;}
function meetingImportance(meeting){
  return (meeting.level==='Grand Slam'?8:meeting.level==='Olympics'?7:meeting.level==='1000'?4:0)+(meeting.round==='F'?7:meeting.round==='SF'?3:0)+(meeting.upset?2:0)+(meeting.durationMinutes>=210?2:0);
}
function compactMeeting(winner,loser,event,match){return {
  id:match.id,eventId:event.id,eventName:event.name,level:event.level,round:match.round,surface:event.surface,
  year:event.year,week:event.week,winnerId:winner.id,loserId:loser.id,score:match.score,durationMinutes:match.durationMinutes||0,upset:!!match.upset,
};}
function createRecord(winner,loser,event){
  const [playerAId,playerBId]=[winner.id,loser.id].sort();
  return {id:rivalryKey(playerAId,playerBId),tour:event.tour,playerAId,playerBId,meetings:0,winsA:0,winsB:0,majors:0,finals:0,
    surfaces:emptySurfaceLedger(),decidingSets:0,fiveSetMatches:0,firstMeeting:null,lastMeeting:null,highlights:[],bigClashes:[]};
}
function shouldHighlight(meeting,row){return meetingImportance(meeting)>0||row.highlights.length<3;}
function addHighlight(row,meeting){
  if(!shouldHighlight(meeting,row))return;
  const existing=row.highlights.findIndex(item=>item.id===meeting.id);
  if(existing>=0)row.highlights.splice(existing,1);
  row.highlights.push(meeting);
  row.highlights.sort((a,b)=>meetingImportance(b)-meetingImportance(a)||(b.year-a.year)||(b.week-a.week));
  row.highlights=row.highlights.slice(0,MAX_HIGHLIGHTS);
}

// --- Ignition check -----------------------------------------------------------
export function ignitionCheck(row,nowAbs){
  const clashes=(row.bigClashes||[]).filter(c=>nowAbs-absWeek(c.year,c.week)<=IGNITION.windowWeeks);
  const finals=clashes.filter(c=>c.round==='F').length;
  const heat=clashes.reduce((s,c)=>s+c.weight,0);
  const winsA=clashes.filter(c=>c.winnerId===row.playerAId).length,winsB=clashes.length-winsA;
  const minority=Math.min(winsA,winsB),share=clashes.length?Math.max(winsA,winsB)/clashes.length:1;
  const ok=clashes.length>=IGNITION.minClashes&&finals>=IGNITION.minFinals&&heat>=IGNITION.minHeat&&minority>=IGNITION.minUnderdogWins&&(clashes.length<4||share<=IGNITION.maxShare);
  return {ok,clashes:clashes.length,finals,heat:Math.round(heat*10)/10,winsA,winsB};
}
// Kept for compatibility with tests/tools: a stored rivalry must have ignited.
export function qualifiesAsRivalry(row){return !!row?.ignitedAt;}

export function rivalryScore(row,currentYear=0){
  const big=(row.bigClashes||[]);
  const recentHeat=big.filter(c=>currentYear-c.year<=1).reduce((s,c)=>s+c.weight,0);
  const balance=row.meetings?1-Math.abs(row.winsA-row.winsB)/row.meetings:0;
  return recentHeat*10+big.reduce((s,c)=>s+c.weight,0)*3+row.meetings+balance*row.meetings+(row.majorFinals||0)*6;
}

// "Since the rivalry began" record — the feud's own scoreboard.
function feudRecord(row){
  row.feud??={meetings:0,winsA:0,winsB:0,bigClashes:0,majorFinals:0};
  return row.feud;
}

function liveRivalryCount(universe,tour){return Object.values(universe.rivalries||{}).filter(r=>r.tour===tour&&r.status==='live').length;}

export function recordRivalryMeeting(universe,winner,loser,event,match){
  if(!universe||!winner?.id||!loser?.id||winner.id===loser.id)return null;
  universe.rivalries??={};universe.rivalryCandidates??={};
  const key=rivalryKey(winner.id,loser.id);
  const ignited=universe.rivalries[key];
  const row=ignited||universe.rivalryCandidates[key]||createRecord(winner,loser,event);
  const winnerIsA=isPlayerA(row,winner.id);
  const prevLeader=row.winsA===row.winsB?null:row.winsA>row.winsB?row.playerAId:row.playerBId;
  const prevStreak=row.streak?{...row.streak}:null;
  row.meetings+=1;
  if(winnerIsA)row.winsA+=1;else row.winsB+=1;
  if(event.level==='Grand Slam')row.majors+=1;
  if(match.round==='F')row.finals+=1;
  if(match.round==='F'&&event.level==='Grand Slam')row.majorFinals=(row.majorFinals||0)+1;
  const newLeader=row.winsA===row.winsB?null:row.winsA>row.winsB?row.playerAId:row.playerBId;
  if(prevLeader&&newLeader&&prevLeader!==newLeader)row.leadChanges=(row.leadChanges||0)+1;
  row.streak=row.streak?.holderId===winner.id?{holderId:winner.id,count:row.streak.count+1}:{holderId:winner.id,count:1};
  if(!row.longestStreak||row.streak.count>row.longestStreak.count)row.longestStreak={...row.streak};
  row.recent=[...(row.recent||[]),winner.id].slice(-10);
  row.ageGap=Math.abs((winner.age||0)-(loser.age||0));
  if(match.tags?.includes('deciding set'))row.decidingSets=(row.decidingSets||0)+1;
  if((match.sets||0)>=5)row.fiveSetMatches=(row.fiveSetMatches||0)+1;
  row.surfaces??=emptySurfaceLedger();
  row.surfaces[event.surface]??={meetings:0,winsA:0,winsB:0};
  row.surfaces[event.surface].meetings+=1;
  if(winnerIsA)row.surfaces[event.surface].winsA+=1;else row.surfaces[event.surface].winsB+=1;
  const meeting=compactMeeting(winner,loser,event,match);
  row.firstMeeting??=meeting;row.lastMeeting=meeting;addHighlight(row,meeting);
  const weight=clashWeight(event.level,match.round);
  if(weight>0){row.bigClashes??=[];row.bigClashes.push({year:event.year,week:event.week,level:event.level,round:match.round,eventName:event.name,winnerId:winner.id,weight});if(row.bigClashes.length>MAX_BIG_CLASHES)row.bigClashes.shift();}
  const queue=ev=>{universe.pendingRivalryEvents??=[];universe.pendingRivalryEvents.push({key,winnerId:winner.id,loserId:loser.id,eventName:event.name,level:event.level,round:match.round,score:match.score,year:event.year,week:event.week,tour:event.tour,...ev});};

  if(ignited){
    universe.rivalries[key]=row;
    const f=feudRecord(row);f.meetings+=1;if(winnerIsA)f.winsA+=1;else f.winsB+=1;if(weight>0)f.bigClashes+=1;if(match.round==='F'&&event.level==='Grand Slam')f.majorFinals+=1;
    if(row.status!=='live')return row;
    if(prevLeader&&newLeader&&prevLeader!==newLeader)queue({type:'lead-flip'});
    else if(prevStreak&&prevStreak.holderId!==winner.id&&prevStreak.count>=4)queue({type:'streak-broken',brokenCount:prevStreak.count});
    else if(weight>0&&row.streak.count>=4&&row.streak.count%2===0)queue({type:'streak-extended',count:row.streak.count});
    if(weight>0&&match.round==='F')queue({type:'final-chapter'});
    if([10,20,30,40,50].includes(row.meetings))queue({type:'milestone'});
    const identity=rivalryIdentity(row);
    if(identity.key!==row.identityKey){row.identityKey=identity.key;row.identitiesSeen??=[];if(['era','classic','guard'].includes(identity.key)&&!row.identitiesSeen.includes(identity.key)){row.identitiesSeen.push(identity.key);queue({type:'identity',identity:identity.label});}}
    return row;
  }

  universe.rivalryCandidates[key]=row;
  if(weight>0){
    const check=ignitionCheck(row,absWeek(event.year,event.week));
    if(check.ok&&liveRivalryCount(universe,event.tour)<IGNITION.maxLivePerTour)igniteRivalry(universe,row,event,check,queue);
  }
  return row;
}

function igniteRivalry(universe,row,event,check,queue){
  row.status='live';
  row.ignitedAt={year:event.year,week:event.week,eventName:event.name,clashes:check.clashes,finals:check.finals,heat:check.heat};
  row.feud={meetings:0,winsA:0,winsB:0,bigClashes:0,majorFinals:0};
  row.identityKey=rivalryIdentity(row).key;row.identitiesSeen=[row.identityKey];
  universe.rivalries[row.id]=row;
  delete universe.rivalryCandidates[row.id];
  queue?.({type:'born',check});
}

// Called weekly and at the turn of the year: a rivalry ends only when a player
// leaves the singles tour (retirement or move to doubles).
export function updateRivalryStatuses(universe){
  const active=new Set(['ATP','WTA'].flatMap(t=>(universe.players?.[t]||[]).map(p=>p.id)));
  for(const row of Object.values(universe.rivalries||{})){
    if(row.status!=='live')continue;
    const goneA=!active.has(row.playerAId),goneB=!active.has(row.playerBId);
    if(!goneA&&!goneB)continue;
    row.status='historic';
    row.endedAt={year:universe.year,week:universe.week,reason:'retirement',retiredIds:[goneA&&row.playerAId,goneB&&row.playerBId].filter(Boolean)};
    universe.pendingRivalryEvents??=[];
    universe.pendingRivalryEvents.push({type:'ended',key:row.id,tour:row.tour,winnerId:row.playerAId,loserId:row.playerBId,year:universe.year,week:universe.week,retiredIds:row.endedAt.retiredIds});
  }
}

export function pruneRivalryCandidates(universe,currentYear){
  universe.rivalries??={};universe.rivalryCandidates??={};
  const rows=Object.values(universe.rivalryCandidates).filter(row=>{
    const age=Math.max(0,currentYear-(row.lastMeeting?.year||currentYear));
    return row.meetings>=2||row.majors>0||row.finals>0||(row.bigClashes||[]).length>0||age<=1;
  }).sort((a,b)=>rivalryScore(b,currentYear)-rivalryScore(a,currentYear));
  universe.rivalryCandidates=Object.fromEntries(rows.slice(0,MAX_CANDIDATES).map(row=>[row.id,row]));
  return universe.rivalryCandidates;
}

export function rivalryForPair(universe,playerAId,playerBId,{includeCandidate=true}={}){
  const key=rivalryKey(playerAId,playerBId);
  return universe.rivalries?.[key]||(includeCandidate?universe.rivalryCandidates?.[key]:null)||null;
}

// Head-to-head rows for a player (ledger + rivalries), used by the Matchups tab.
export function playerRivalries(universe,playerId,{minMeetings=3}={}){
  return [...Object.values(universe.rivalries||{}),...Object.values(universe.rivalryCandidates||{})]
    .filter(row=>(row.playerAId===playerId||row.playerBId===playerId)&&row.meetings>=minMeetings).map(row=>{
      const asA=isPlayerA(row,playerId),wins=asA?row.winsA:row.winsB,losses=asA?row.winsB:row.winsA;
      return {...row,opponentId:asA?row.playerBId:row.playerAId,wins,losses,balance:wins-losses,isRivalry:!!row.ignitedAt};
    });
}

export function rivalryExtremes(universe,playerId,limit=5){
  const rows=playerRivalries(universe,playerId);
  const positive=rows.filter(row=>row.balance>0).sort((a,b)=>b.balance-a.balance||b.meetings-a.meetings||b.wins-a.wins).slice(0,limit);
  const negative=rows.filter(row=>row.balance<0).sort((a,b)=>a.balance-b.balance||b.meetings-a.meetings||b.losses-a.losses).slice(0,limit);
  return {positive,negative};
}

export function rivalryStorageStats(universe){
  const rows=Object.values(universe.rivalries||{});
  return {permanent:rows.length,live:rows.filter(r=>r.status==='live').length,historic:rows.filter(r=>r.status==='historic').length,candidates:Object.keys(universe.rivalryCandidates||{}).length};
}

// ---------------------------------------------------------------------------
// Identity: what kind of story is this pairing?
// ---------------------------------------------------------------------------
export function rivalryIdentity(row){
  const m=row.meetings||0,diff=Math.abs((row.winsA||0)-(row.winsB||0));
  const share=m?Math.max(row.winsA||0,row.winsB||0)/m:0;
  const leaderId=(row.winsA||0)>=(row.winsB||0)?row.playerAId:row.playerBId;
  const recent=row.recent||[];
  const recentA=recent.filter(id=>id===row.playerAId).length,recentB=recent.length-recentA;
  const recentLeader=recentA>recentB?row.playerAId:recentB>recentA?row.playerBId:null;
  const surfaceLeaders=Object.entries(row.surfaces||{}).filter(([,l])=>l.meetings>=3&&l.winsA!==l.winsB).map(([s,l])=>[s,l.winsA>l.winsB?'A':'B']);
  const split=new Set(surfaceLeaders.map(x=>x[1])).size>1;
  if(m>=15&&(row.majorFinals||0)>=3)return {key:'era',label:'Era-defining',blurb:'A rivalry that decided who owned an era.'};
  if((row.majorFinals||0)>=2||(row.majors>=4&&row.finals>=3))return {key:'classic',label:'Grand Slam classic',blurb:'Built on the biggest stages in the sport.'};
  if((row.ageGap||0)>=5&&m>=6&&recent.length>=5&&recentLeader&&recentLeader!==leaderId)return {key:'guard',label:'Changing of the guard',blurb:'The younger player has turned the matchup around.'};
  if(m>=6&&share>=0.75)return {key:'nemesis',label:'Nemesis',blurb:'One player simply has the other’s number.'};
  if(m>=8&&diff<=1)return {key:'even',label:'Dead even',blurb:'Nothing separates them.'};
  if(split)return {key:'split',label:'Surface split',blurb:'Each owns a different surface.'};
  if((row.leadChanges||0)>=2)return {key:'seesaw',label:'Seesaw',blurb:'The lead has changed hands repeatedly.'};
  if(m>=12)return {key:'established',label:'Established',blurb:'A fixture of the tour.'};
  return {key:'emerging',label:'New feud',blurb:'Born on the big stages; the next chapters are still to come.'};
}

export function topRivalries(universe,{tour=null,status=null,limit=30}={}){
  return Object.values(universe.rivalries||{}).filter(row=>(!tour||row.tour===tour)&&(!status||row.status===status))
    .map(row=>({...row,score:rivalryScore(row,universe.year),identity:rivalryIdentity(row)}))
    .sort((a,b)=>(a.status==='live'?0:1)-(b.status==='live'?0:1)||b.score-a.score).slice(0,limit);
}

// Rebuild rivalry status for saves from older versions: everything returns to
// the ledger, big clashes are recovered from stored highlights, and the
// ignition rule is replayed chronologically.
export function migrateRivalriesToIgnitionModel(universe){
  const all={...(universe.rivalryCandidates||{}),...(universe.rivalries||{})};
  universe.rivalries={};universe.rivalryCandidates={};
  const active=new Set(['ATP','WTA'].flatMap(t=>(universe.players?.[t]||[]).map(p=>p.id)));
  const rows=Object.values(all);
  for(const row of rows){
    delete row.status;delete row.ignitedAt;delete row.endedAt;delete row.feud;delete row.promotedYear;
    if(!row.bigClashes)row.bigClashes=(row.highlights||[]).map(h=>({year:h.year,week:h.week,level:h.level,round:h.round,eventName:h.eventName,winnerId:h.winnerId,weight:clashWeight(h.level,h.round)})).filter(c=>c.weight>0).sort((a,b)=>absWeek(a.year,a.week)-absWeek(b.year,b.week));
    universe.rivalryCandidates[row.id]=row;
  }
  // chronological replay across all pairs so the per-tour cap is respected in order
  const events=rows.flatMap(row=>(row.bigClashes||[]).map((c,i)=>({row,c,i}))).sort((a,b)=>absWeek(a.c.year,a.c.week)-absWeek(b.c.year,b.c.week));
  for(const {row,c,i} of events){
    if(row.ignitedAt)continue;
    const view={...row,bigClashes:row.bigClashes.slice(0,i+1)};
    const check=ignitionCheck(view,absWeek(c.year,c.week));
    if(check.ok&&liveRivalryCount(universe,row.tour)<IGNITION.maxLivePerTour){
      igniteRivalry(universe,row,{year:c.year,week:c.week,name:c.eventName},check,null);
      if(!active.has(row.playerAId)||!active.has(row.playerBId)){row.status='historic';row.endedAt={year:universe.year,week:universe.week,reason:'retirement'};}
    }
  }
}
