import React,{useMemo} from 'react';
import { BackButton,Stat } from '../components/PageChrome.jsx';
import { EmptyState,Flag,RarityBadge,SurfaceBadge } from '../components/Common.jsx';
import { findPlayer,playerMatches } from '../sim/selectors.js';
import { fullName } from '../sim/generation.js';

export default function RivalryPage({universe,playerAId,playerBId,onBack,onPlayer,onMatch}){
  const a=findPlayer(universe,playerAId),b=findPlayer(universe,playerBId);
  const matches=useMemo(()=>playerMatches(universe,playerAId).filter(m=>m.winnerId===playerBId||m.loserId===playerBId),[universe,playerAId,playerBId]);
  if(!a||!b)return <div className="page"><BackButton onBack={onBack}/><EmptyState>Rivalry not found.</EmptyState></div>;
  const aWins=matches.filter(m=>m.winnerId===a.id).length,bWins=matches.length-aWins;
  const majors=matches.filter(m=>m.event?.level==='Grand Slam'),finals=matches.filter(m=>m.round==='F');
  const surfaces=['Hard','Clay','Grass','Indoor'].map(surface=>{const rows=matches.filter(m=>m.surface===surface);return {surface,matches:rows.length,aWins:rows.filter(m=>m.winnerId===a.id).length};});
  const latest=matches[0];
  return <div className="page detail-page"><BackButton onBack={onBack} label="Back to previous page"/>
    <header className="rivalry-hero"><button onClick={()=>onPlayer(a.id)}><Flag code={a.country}/><RarityBadge rarity={a.rarity}/><h1>{fullName(a)}</h1><span>{a.status==='retired'?'Retired':`No. ${a.ranking}`}</span></button><div><small>HEAD TO HEAD</small><strong>{aWins}–{bWins}</strong><span>{matches.length} meetings</span></div><button onClick={()=>onPlayer(b.id)}><Flag code={b.country}/><RarityBadge rarity={b.rarity}/><h1>{fullName(b)}</h1><span>{b.status==='retired'?'Retired':`No. ${b.ranking}`}</span></button></header>
    <section className="detail-stat-grid"><Stat label="Grand Slam meetings" value={majors.length}/><Stat label="Finals" value={finals.length}/><Stat label="Deciding-set matches" value={matches.filter(m=>m.tags?.includes('deciding set')).length}/><Stat label="Five-set matches" value={matches.filter(m=>m.sets>=5).length}/><Stat label="Latest winner" value={latest?(latest.winnerId===a.id?fullName(a):fullName(b)):'—'}/><Stat label="Latest event" value={latest?.event?.name||'—'}/></section>
    <div className="two-column"><section className="panel"><h3>Surface balance</h3>{surfaces.map(row=><div className="split-row" key={row.surface}><SurfaceBadge surface={row.surface}/><strong>{row.aWins}-{row.matches-row.aWins}</strong><span>{row.matches} meetings</span></div>)}</section><section className="panel"><h3>Rivalry context</h3><p><strong>{fullName(a)}</strong> leads {aWins}-{bWins} overall.</p><p>They have met in <strong>{majors.length}</strong> majors and <strong>{finals.length}</strong> finals.</p><p>{latest?`Their latest match came at ${latest.event.name} in ${latest.year}, won ${latest.score}.`:'The rivalry has not started yet.'}</p></section></div>
    <section className="panel"><h3>Complete meeting history</h3>{matches.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Event</th><th>Round</th><th>Surface</th><th>Winner</th><th>Score</th><th>Story</th></tr></thead><tbody>{matches.map(m=><tr key={m.id} onClick={()=>onMatch?.(m.editionId,m.id)} className="clickable-row"><td>{m.year} · W{m.week}</td><td>{m.event.name}</td><td>{m.round}</td><td><SurfaceBadge surface={m.surface}/></td><td>{m.winnerId===a.id?fullName(a):fullName(b)}</td><td>{m.score}</td><td>{m.tags?.join(' · ')||m.explanation||'—'}</td></tr>)}</tbody></table></div>:<EmptyState>No stored meetings yet.</EmptyState>}</section>
  </div>;
}
