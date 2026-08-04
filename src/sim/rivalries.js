const SURFACES=['Hard','Clay','Grass','Indoor'];
const MAX_CANDIDATES=3000;
const MAX_HIGHLIGHTS=12;

export function rivalryKey(playerAId,playerBId){return [playerAId,playerBId].sort().join('::');}

function emptySurfaceLedger(){return Object.fromEntries(SURFACES.map(surface=>[surface,{meetings:0,winsA:0,winsB:0}]));}
function isPlayerA(row,id){return row.playerAId===id;}
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
    surfaces:emptySurfaceLedger(),decidingSets:0,fiveSetMatches:0,firstMeeting:null,lastMeeting:null,highlights:[],promotedYear:null};
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
function qualifies(row){return row.meetings>=5||row.finals>=2||row.majors>=3||(row.meetings>=3&&(row.majors>=1||row.finals>=1));}
export function rivalryScore(row,currentYear=0){
  const recency=Math.max(0,4-Math.max(0,currentYear-(row.lastMeeting?.year||currentYear)));
  return row.meetings*2+row.majors*5+row.finals*6+Math.abs(row.winsA-row.winsB)*.5+recency;
}

export function recordRivalryMeeting(universe,winner,loser,event,match){
  if(!universe||!winner?.id||!loser?.id||winner.id===loser.id)return null;
  universe.rivalries??={};universe.rivalryCandidates??={};
  const key=rivalryKey(winner.id,loser.id);
  const permanent=universe.rivalries[key];
  const row=permanent||universe.rivalryCandidates[key]||createRecord(winner,loser,event);
  const winnerIsA=isPlayerA(row,winner.id);
  row.meetings+=1;
  if(winnerIsA)row.winsA+=1;else row.winsB+=1;
  if(event.level==='Grand Slam')row.majors+=1;
  if(match.round==='F')row.finals+=1;
  if(match.tags?.includes('deciding set'))row.decidingSets=(row.decidingSets||0)+1;
  if((match.sets||0)>=5)row.fiveSetMatches=(row.fiveSetMatches||0)+1;
  row.surfaces??=emptySurfaceLedger();
  row.surfaces[event.surface]??={meetings:0,winsA:0,winsB:0};
  row.surfaces[event.surface].meetings+=1;
  if(winnerIsA)row.surfaces[event.surface].winsA+=1;else row.surfaces[event.surface].winsB+=1;
  const meeting=compactMeeting(winner,loser,event,match);
  row.firstMeeting??=meeting;row.lastMeeting=meeting;addHighlight(row,meeting);
  if(permanent){universe.rivalries[key]=row;return row;}
  if(qualifies(row)){
    row.promotedYear=event.year;
    universe.rivalries[key]=row;
    delete universe.rivalryCandidates[key];
  }else universe.rivalryCandidates[key]=row;
  return row;
}

export function pruneRivalryCandidates(universe,currentYear){
  universe.rivalries??={};universe.rivalryCandidates??={};
  const rows=Object.values(universe.rivalryCandidates).filter(row=>{
    const age=Math.max(0,currentYear-(row.lastMeeting?.year||currentYear));
    return row.meetings>=2||row.majors>0||row.finals>0||age<=1;
  }).sort((a,b)=>rivalryScore(b,currentYear)-rivalryScore(a,currentYear));
  universe.rivalryCandidates=Object.fromEntries(rows.slice(0,MAX_CANDIDATES).map(row=>[row.id,row]));
  return universe.rivalryCandidates;
}

export function rivalryForPair(universe,playerAId,playerBId,{includeCandidate=true}={}){
  const key=rivalryKey(playerAId,playerBId);
  return universe.rivalries?.[key]||(includeCandidate?universe.rivalryCandidates?.[key]:null)||null;
}

export function playerRivalries(universe,playerId){
  return Object.values(universe.rivalries||{}).filter(row=>row.playerAId===playerId||row.playerBId===playerId).map(row=>{
    const asA=isPlayerA(row,playerId),wins=asA?row.winsA:row.winsB,losses=asA?row.winsB:row.winsA;
    return {...row,opponentId:asA?row.playerBId:row.playerAId,wins,losses,balance:wins-losses};
  });
}

export function rivalryExtremes(universe,playerId,limit=5){
  const rows=playerRivalries(universe,playerId);
  const positive=rows.filter(row=>row.balance>0).sort((a,b)=>b.balance-a.balance||b.meetings-a.meetings||b.wins-a.wins).slice(0,limit);
  const negative=rows.filter(row=>row.balance<0).sort((a,b)=>a.balance-b.balance||b.meetings-a.meetings||b.losses-a.losses).slice(0,limit);
  return {positive,negative};
}

export function rivalryStorageStats(universe){
  return {permanent:Object.keys(universe.rivalries||{}).length,candidates:Object.keys(universe.rivalryCandidates||{}).length};
}
