import React,{useMemo} from 'react';
import { BackButton,Stat } from '../components/PageChrome.jsx';
import { EmptyState,Flag,RarityBadge,SurfaceBadge } from '../components/Common.jsx';
import { findPlayer } from '../sim/selectors.js';
import { fullName } from '../sim/generation.js';
import { rivalryForPair } from '../sim/rivalries.js';
import { universeYearLabel } from '../utils/year.js';

const SURFACES=['Hard','Clay','Grass','Indoor'];

export default function RivalryPage({universe,playerAId,playerBId,onBack,onPlayer,onMatch}){
  const a=findPlayer(universe,playerAId),b=findPlayer(universe,playerBId);
  const rivalry=rivalryForPair(universe,playerAId,playerBId);
  const chapters=useMemo(()=>{
    if(!rivalry)return [];
    return [...(rivalry.highlights||[])].sort((x,y)=>(y.year-x.year)||(y.week-x.week));
  },[rivalry]);
  if(!a||!b)return <div className="page"><BackButton onBack={onBack}/><EmptyState>Rivalry not found.</EmptyState></div>;
  if(!rivalry)return <div className="page detail-page"><BackButton onBack={onBack} label="Back to previous page"/><header className="rivalry-hero"><button onClick={()=>onPlayer(a.id)}><Flag code={a.country}/><RarityBadge rarity={a.rarity}/><h1>{fullName(a)}</h1></button><div><small>HEAD TO HEAD</small><strong>0–0</strong><span>No tracked rivalry yet</span></div><button onClick={()=>onPlayer(b.id)}><Flag code={b.country}/><RarityBadge rarity={b.rarity}/><h1>{fullName(b)}</h1></button></header><EmptyState>This matchup has not met the meaningful-rivalry threshold yet.</EmptyState></div>;
  const aIsStoredA=rivalry.playerAId===a.id;
  const aWins=aIsStoredA?rivalry.winsA:rivalry.winsB,bWins=aIsStoredA?rivalry.winsB:rivalry.winsA;
  const latest=rivalry.lastMeeting;
  const surfaces=SURFACES.map(surface=>{const ledger=rivalry.surfaces?.[surface]||{meetings:0,winsA:0,winsB:0};return {surface,meetings:ledger.meetings||0,aWins:aIsStoredA?(ledger.winsA||0):(ledger.winsB||0)};});
  const lead=aWins===bWins?'The rivalry is tied.':`${aWins>bWins?fullName(a):fullName(b)} leads ${Math.max(aWins,bWins)}-${Math.min(aWins,bWins)}.`;
  const canOpen=meeting=>{const edition=(universe.tournamentEditions||[]).find(row=>row.id===meeting.eventId||row.event?.id===meeting.eventId);return edition?.matches?.some(match=>match.id===meeting.id)?edition.id:null;};
  return <div className="page detail-page"><BackButton onBack={onBack} label="Back to previous page"/>
    <header className="rivalry-hero"><button onClick={()=>onPlayer(a.id)}><Flag code={a.country}/><RarityBadge rarity={a.rarity}/><h1>{fullName(a)}</h1><span>{a.status==='retired'?'Retired':`No. ${a.ranking}`}</span></button><div><small>HEAD TO HEAD</small><strong>{aWins}–{bWins}</strong><span>{rivalry.meetings} meetings</span></div><button onClick={()=>onPlayer(b.id)}><Flag code={b.country}/><RarityBadge rarity={b.rarity}/><h1>{fullName(b)}</h1><span>{b.status==='retired'?'Retired':`No. ${b.ranking}`}</span></button></header>
    <section className="detail-stat-grid"><Stat label="Grand Slam meetings" value={rivalry.majors||0}/><Stat label="Finals" value={rivalry.finals||0}/><Stat label="Deciding-set matches" value={rivalry.decidingSets||0}/><Stat label="Five-set matches" value={rivalry.fiveSetMatches||0}/><Stat label="Latest winner" value={latest?(latest.winnerId===a.id?fullName(a):fullName(b)):'—'}/><Stat label="First meeting" value={rivalry.firstMeeting?`${universeYearLabel(universe,rivalry.firstMeeting.year)} · ${rivalry.firstMeeting.eventName}`:'—'}/></section>
    <div className="two-column"><section className="panel"><h3>Surface balance</h3>{surfaces.map(row=><div className="split-row" key={row.surface}><SurfaceBadge surface={row.surface}/><strong>{row.aWins}-{row.meetings-row.aWins}</strong><span>{row.meetings} meetings</span></div>)}</section><section className="panel"><h3>Rivalry context</h3><p><strong>{lead}</strong></p><p>They have met in <strong>{rivalry.majors||0}</strong> majors and <strong>{rivalry.finals||0}</strong> finals.</p><p>{latest?`Their latest chapter came at ${latest.eventName} in ${universeYearLabel(universe,latest.year)}, ${latest.score}.`:'The rivalry has not started yet.'}</p><p className="muted">The page stores career totals and selected important chapters, not every routine early-round match.</p></section></div>
    <section className="panel"><h3>Important rivalry chapters</h3>{chapters.length?<div>{chapters.map(meeting=>{const editionId=canOpen(meeting);return <div className="rivalry-chapter" key={meeting.id}><span>{universeYearLabel(universe,meeting.year)} · W{meeting.week}</span><div><strong>{meeting.eventName} · {meeting.round}</strong><small>{meeting.level} · {meeting.surface} · winner: {meeting.winnerId===a.id?fullName(a):fullName(b)}</small></div>{editionId?<button className="secondary mini" onClick={()=>onMatch?.(editionId,meeting.id)}>{meeting.score}</button>:<b>{meeting.score}</b>}</div>})}</div>:<EmptyState>No important chapters stored yet.</EmptyState>}</section>
  </div>;
}
