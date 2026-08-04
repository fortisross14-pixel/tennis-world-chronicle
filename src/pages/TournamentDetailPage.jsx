import React,{useMemo,useState} from 'react';
import { EmptyState,Flag,SurfaceBadge } from '../components/Common.jsx';
import { BackButton,Tabs,Stat } from '../components/PageChrome.jsx';
import { countryByCode } from '../data/countries.js';
import { LEVEL_POINTS } from '../data/calendar.js';
import { findDoublesTeam,findPlayer,tournamentFamily,tournamentStats } from '../sim/selectors.js';
import { fullName } from '../sim/generation.js';

const groupRounds=matches=>(matches||[]).reduce((groups,match)=>{(groups[match.round]??=[]).push(match);return groups;},{});
const championPoints=level=>LEVEL_POINTS[level]??({'Junior Slam':1000,'Junior Finals':750,'Junior 500':500,Continental:400}[level]||0);

function CurrentDraw({universe,edition,kind,onPlayer,onMatch}){
  if(!edition)return <EmptyState>This year's draw has not been played yet.</EmptyState>;
  if(edition.archived||!(edition.matches||[]).length)return <EmptyState>The season is complete. Detailed draws have been cleared; the champion and final score remain in History.</EmptyState>;
  const rounds=groupRounds(edition.matches);
  if(kind==='team')return <section className="team-draw">{Object.entries(rounds).map(([round,ties])=><div className="draw-column" key={round}><h3>{round}</h3>{ties.map((tie,index)=><article key={`${round}-${index}`}><div><Flag code={tie.winner}/><strong>{countryByCode(tie.winner).name}</strong><b>{tie.score}</b></div><div><Flag code={tie.loser}/><span>{countryByCode(tie.loser).name}</span></div><div className="team-roster-links">{(tie.winnerRoster||[]).map(id=>{const player=findPlayer(universe,id);return player?<button key={id} onClick={()=>onPlayer(id)}>{fullName(player)}</button>:null})}</div></article>)}</div>)}</section>;
  return <section className="draw-board">{Object.entries(rounds).map(([round,matches])=><div className="draw-column" key={round}><h3>{round}</h3>{matches.map(match=>{
    if(kind==='doubles'){
      const winner=findDoublesTeam(universe,match.winnerId),loser=findDoublesTeam(universe,match.loserId);
      const winnerNames=match.winnerNames||winner?.playerNames||['Winning team'],loserNames=match.loserNames||loser?.playerNames||['Opponents'];
      return <button key={match.id} onClick={()=>onMatch(edition.id,match.id)}><div><strong>{winnerNames.join(' / ')}</strong><span>{loserNames.join(' / ')}</span></div><b>{match.score}</b></button>;
    }
    const winner=findPlayer(universe,match.winnerId),loser=findPlayer(universe,match.loserId);
    return <button key={match.id} onClick={()=>onMatch(edition.id,match.id)}><div><strong>{winner?fullName(winner):'Winner'}</strong><span>{loser?fullName(loser):'Opponent'}</span></div><b>{match.score}</b></button>;
  })}</div>)}</section>;
}

function HistoryTable({universe,family,kind,onPlayer}){
  if(!family.editions.length)return <EmptyState>History begins after the first edition.</EmptyState>;
  if(kind==='team')return <div className="table-wrap"><table className="data-table"><thead><tr><th>Year</th><th>Champion</th><th>Finalist</th><th>Final score</th></tr></thead><tbody>{family.editions.map(edition=>{const final=(edition.matches||[]).find(match=>match.round==='F');const finalist=edition.finalistCountry||final?.loser;return <tr key={edition.id}><td>{edition.event.year}</td><td><Flag code={edition.championCountry}/>{countryByCode(edition.championCountry).name}</td><td>{finalist?<><Flag code={finalist}/>{countryByCode(finalist).name}</>:'—'}</td><td>{edition.finalScore||final?.score||'—'}</td></tr>})}</tbody></table></div>;
  if(kind==='doubles')return <div className="table-wrap"><table className="data-table"><thead><tr><th>Year</th><th>Champions</th><th>Finalists</th><th>Final score</th><th>Draw</th></tr></thead><tbody>{family.editions.map(edition=><tr key={edition.id}><td>{edition.event.year}</td><td>{edition.championNames?.join(' / ')||'—'}</td><td>{edition.finalistNames?.join(' / ')||'—'}</td><td>{edition.finalScore||'—'}</td><td>{edition.drawSize}</td></tr>)}</tbody></table></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Year</th><th>Champion</th><th>Finalist</th><th>Final score</th><th>Surface</th><th>Draw</th></tr></thead><tbody>{family.editions.map(edition=>{const final=(edition.matches||[]).find(match=>match.round==='F');return <tr key={edition.id}><td>{edition.event.year}</td><td><Flag code={edition.championCountry}/><button className="player-link" onClick={()=>onPlayer(edition.championId)}>{edition.championName}</button></td><td>{edition.finalistId?<button className="player-link" onClick={()=>onPlayer(edition.finalistId)}>{edition.finalistName}</button>:edition.finalistName||'—'}</td><td>{edition.finalScore||final?.score||'—'}</td><td><SurfaceBadge surface={edition.event.surface}/></td><td>{edition.drawSize}</td></tr>})}</tbody></table></div>;
}

export default function TournamentDetailPage({universe,tour,name,onBack,onPlayer,onMatch,onSimulate}){
  const [tab,setTab]=useState('Overview');
  const family=tournamentFamily(universe,tour,name);
  const edition=family.editions.find(row=>row.event.year===universe.year)||null;
  const event=edition?.event||family.calendar||family.editions[0]?.event;
  const individual=family.kind==='singles'||family.kind==='junior';
  const stats=useMemo(()=>individual?tournamentStats(universe,tour,name):null,[universe,tour,name,individual]);
  if(!event)return <div className="page"><BackButton onBack={onBack}/><EmptyState>Tournament not found.</EmptyState></div>;
  const previous=family.editions.find(row=>row.event.year<universe.year);
  const kind=family.kind;
  const championText=kind==='team'?(edition?.championCountry?countryByCode(edition.championCountry).name:null):kind==='doubles'?edition?.championNames?.join(' / '):edition?.championName;
  const defendingText=kind==='team'?(previous?.championCountry?countryByCode(previous.championCountry).name:'First edition'):kind==='doubles'?(previous?.championNames?.join(' / ')||'First edition'):(previous?.championName||'First edition');
  const titleCounts=new Map();for(const row of family.editions){const key=kind==='team'?row.championCountry:kind==='doubles'?(row.championNames?.join(' / ')||row.championTeamId):row.championId;if(key)titleCounts.set(key,(titleCounts.get(key)||0)+1);}const repeat=[...titleCounts.entries()].sort((a,b)=>b[1]-a[1]);
  return <div className="page detail-page"><BackButton onBack={onBack} label="Back to previous page"/><header className="tournament-hero"><div><p>{tour} · {kind==='team'?'International team competition':`${event.level}${kind==='doubles'?' doubles':''}`}</p><h1>{name}</h1><span>{event.location} · {event.dates||`Week ${event.week}`}</span></div>{kind==='team'?<span className="team-cup-mark">TEAM CUP</span>:<SurfaceBadge surface={event.surface}/>}</header><Tabs items={['Overview','Current Year','History','Stats']} active={tab} onChange={setTab}/>
  {tab==='Overview'&&<><section className="detail-stat-grid"><Stat label="Location" value={event.location}/><Stat label="Surface" value={event.surface}/><Stat label="Level" value={kind==='team'?'International':event.level}/><Stat label="Champion points" value={kind==='team'?'Team honor':championPoints(event.level).toLocaleString()}/><Stat label="Draw" value={event.drawSize||'16 countries'}/><Stat label="Week" value={event.week}/><Stat label="Defending champion" value={defendingText}/><Stat label="Status" value={edition?'Completed':'Upcoming'}/></section>{edition?<section className="champion-banner"><span>{universe.year} champion{kind==='doubles'||kind==='team'?'s':''}</span><strong>{championText}</strong><p>{edition.finalScore?`Final: ${edition.finalScore}`:'Tournament completed'}</p></section>:<section className="panel upcoming-edition"><h3>Upcoming edition</h3><p>The draw is generated when simulation reaches week {event.week}. Rankings, surface fit, form, fatigue, health and event eligibility determine the field.</p>{event.year===universe.year&&event.week>=universe.week&&!universe.seasonEnded&&<button className="primary-action" onClick={()=>onSimulate?.(event.week)}>Simulate to {name}</button>}</section>}</>}
  {tab==='Current Year'&&<CurrentDraw universe={universe} edition={edition} kind={kind} onPlayer={onPlayer} onMatch={onMatch}/>} 
  {tab==='History'&&<section className="panel"><h3>Champions and finalists</h3><HistoryTable universe={universe} family={family} kind={kind} onPlayer={onPlayer}/></section>}
  {tab==='Stats'&&individual&&stats&&<><section className="detail-stat-grid"><Stat label="Editions" value={family.editions.length}/><Stat label="Youngest champion" value={stats.youngest?`${fullName(stats.youngest.player)}, ${stats.youngest.age}`:'—'}/><Stat label="Oldest champion" value={stats.oldest?`${fullName(stats.oldest.player)}, ${stats.oldest.age}`:'—'}/><Stat label="Most aces in a match" value={stats.mostAces?.aces||'—'}/></section><div className="two-column"><Leader title="Most titles" rows={stats.titleLeaders} onPlayer={onPlayer}/><Leader title="Most match wins" rows={stats.winLeaders} onPlayer={onPlayer}/><Leader title="Most appearances" rows={stats.matchLeaders} onPlayer={onPlayer}/><section className="panel"><h3>Country champions</h3>{stats.countryLeaders.slice(0,12).map(([code,value])=><div className="split-row" key={code}><span><Flag code={code}/>{countryByCode(code).name}</span><strong>{value}</strong></div>)}</section></div></>}
  {tab==='Stats'&&!individual&&<div className="two-column"><section className="panel"><h3>Most titles</h3>{repeat.slice(0,20).map(([key,count],index)=><div className="leader-row static" key={key}><span>{index+1}</span>{kind==='team'?<><Flag code={key}/><strong>{countryByCode(key).name}</strong></>:<strong>{key}</strong>}<b>{count}</b></div>)}</section><section className="panel"><h3>Competition records</h3><div className="detail-stat-grid compact"><Stat label="Editions" value={family.editions.length}/><Stat label="Different champions" value={titleCounts.size}/><Stat label="Largest draw" value={Math.max(0,...family.editions.map(row=>row.drawSize||0))}/><Stat label="Latest champion" value={championText||'—'}/></div></section></div>}
  </div>;
}
function Leader({title,rows,onPlayer}){return <section className="panel"><h3>{title}</h3>{rows.slice(0,12).map((row,index)=><button className="leader-row" key={row.player.id} onClick={()=>onPlayer(row.player.id)}><span>{index+1}</span><Flag code={row.player.country}/><strong>{fullName(row.player)}</strong><b>{row.value}</b></button>)}</section>}
