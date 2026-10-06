import React,{useEffect,useMemo,useState} from 'react';
import Portrait from '../components/Portrait.jsx';
import { Flag,SectionTitle,SurfaceBadge } from '../components/Common.jsx';
import { coverageModeForEvent } from '../data/showcase.js';
import { findPlayer } from '../sim/selectors.js';
import { fullName } from '../sim/generation.js';
import { universeWeekLabel } from '../utils/year.js';

function editionForEvent(universe,event){return (universe.tournamentEditions||[]).find(edition=>edition.id===event.id||edition.event?.id===event.id)||null;}
function selectedRounds(mode){return mode==='semifinals'?new Set(['SF','F']):mode==='final'?new Set(['F']):new Set();}
function normalQueue(event,edition,mode){
  const wanted=selectedRounds(mode);if(!wanted.size||!edition)return [];
  const order={SF:1,F:2};return (edition.matches||[]).filter(match=>wanted.has(match.round)).sort((a,b)=>(order[a.round]||9)-(order[b.round]||9)).map((match,index)=>({event,edition,match,stage:match.round==='F'?'Championship Final':`Semifinal ${index+1}`,teamTie:null}));
}
function teamQueue(event,edition,mode){
  const wanted=selectedRounds(mode);if(!wanted.size||!edition)return [];
  const ties=(edition.matches||[]).filter(tie=>wanted.has(tie.round));const rows=[];
  for(const tie of ties){
    for(let i=0;i<(tie.rubbers||[]).length;i+=1)rows.push({event,edition,match:tie.rubbers[i],stage:`${tie.round==='F'?'Final':'Semifinal'} · Rubber ${i+1}`,teamTie:tie});
  }
  return rows;
}
function setDetailsFor(match){
  if(match?.setDetails?.length)return match.setDetails;
  const tokens=String(match?.score||'').split(/\s+/).map(token=>token.match(/(\d+)-(\d+)/)).filter(Boolean);
  return tokens.map(([,a,b])=>{const winnerGames=Number(a),loserGames=Number(b),aWon=match?.winnerId===match?.playerA,gamesA=aWon?winnerGames:loserGames,gamesB=aWon?loserGames:winnerGames,gameWinners=[];let ca=0,cb=0;while(ca<gamesA||cb<gamesB){if(ca<gamesA&&(cb>=gamesB||ca<=cb)){gameWinners.push('A');ca+=1;}else{gameWinners.push('B');cb+=1;}}return {gamesA,gamesB,gameWinners};});
}
function scoreAt(detail,count){let a=0,b=0;for(const winner of (detail?.gameWinners||[]).slice(0,count)){if(winner==='A')a+=1;else b+=1;}return [a,b];}
function ResultCard({universe,event,edition,revealed}){
  if(!edition)return null;
  if(event.level==='Team')return <article className="landmark-result-card"><span>{event.tour==='ATP'?'Davis Cup':'BJK Cup'} champion</span><strong>{revealed?edition.championCountry:'—'}</strong>{revealed&&<Flag code={edition.championCountry}/>}</article>;
  const champion=findPlayer(universe,edition.championId);
  return <article className="landmark-result-card">{champion&&revealed&&<Portrait player={champion} size="card"/>}<div><span>{event.tour} · {event.level} champion</span><strong>{revealed?(edition.championName||champion&&fullName(champion)):'Result hidden during live coverage'}</strong>{revealed&&champion&&<small><Flag code={champion.country}/>{champion.rarity} · World No. {champion.ranking}</small>}</div></article>;
}

export default function BigTournamentPage({universe,onPlayer,onNextBig,onCalendar}){
  const stop=universe.showcaseStop;
  const events=useMemo(()=>stop?(universe.calendar||[]).filter(event=>stop.eventIds?.includes(event.id)):[],[stop?.year,stop?.week,universe.calendar]);
  const packets=useMemo(()=>events.map(event=>{const edition=editionForEvent(universe,event),mode=coverageModeForEvent(universe,event);return {event,edition,mode,queue:event.level==='Team'?teamQueue(event,edition,mode):normalQueue(event,edition,mode)};}),[events,universe.tournamentEditions,universe.settings.showcaseCoverage]);
  const queue=useMemo(()=>packets.flatMap(packet=>packet.queue),[packets]);
  const [matchIndex,setMatchIndex]=useState(0),[setIndex,setSetIndex]=useState(0),[gameIndex,setGameIndex]=useState(0),[playing,setPlaying]=useState(false);
  useEffect(()=>{setMatchIndex(0);setSetIndex(0);setGameIndex(0);setPlaying(false);},[stop?.year,stop?.week]);
  const current=queue[matchIndex]||null;const details=setDetailsFor(current?.match);const detail=details[setIndex]||null;const gameCount=detail?.gameWinners?.length||0;const setComplete=!!detail&&gameIndex>=gameCount;const matchComplete=!!current&&setIndex>=details.length-1&&setComplete;
  useEffect(()=>{if(!playing||!detail)return;const timer=setInterval(()=>setGameIndex(value=>{if(value>=gameCount){setPlaying(false);return value;}const next=value+1;if(next>=gameCount)setPlaying(false);return next;}),520);return()=>clearInterval(timer);},[playing,gameCount,setIndex,matchIndex,detail]);
  if(!stop)return <div className="page"><SectionTitle eyebrow="Landmark coverage">No tournament stop</SectionTitle><p>Use “Next Big Tournament” from the simulation bar.</p></div>;
  const currentA=current?findPlayer(universe,current.match.playerA):null,currentB=current?findPlayer(universe,current.match.playerB):null;const [gamesA,gamesB]=scoreAt(detail,gameIndex);const coverageFinished=queue.length===0||(matchIndex===queue.length-1&&matchComplete);
  const nextSet=()=>{setPlaying(false);setSetIndex(value=>value+1);setGameIndex(0);};const nextMatch=()=>{setPlaying(false);setMatchIndex(value=>value+1);setSetIndex(0);setGameIndex(0);};
  return <div className="page landmark-page">
    <SectionTitle eyebrow={`${universeWeekLabel(universe,stop.year,stop.week)} · Chronicle landmark`} action={<button className="secondary" onClick={onCalendar}>Calendar</button>}>{stop.label}</SectionTitle>
    <section className="landmark-header prestige-panel"><div><span>Big Tournament Stop</span><h1>{stop.label}</h1><p>{events.map(event=>`${event.tour} ${event.level}`).join(' · ')}</p></div><div className="landmark-modes">{packets.map(packet=><span key={packet.event.id}><b>{packet.event.tour}</b>{packet.mode==='semifinals'?'Semifinals + Final':packet.mode==='final'?'Final':'Results only'}</span>)}</div></section>
    {current&&<section className="live-tennis-stage">
      <header><div><span>{current.event.tour} · {current.stage}</span><strong>{current.event.name}</strong></div><SurfaceBadge surface={current.event.surface}/></header>
      {current.teamTie&&<div className="team-tie-strip"><span>{current.teamTie.teamA||current.teamTie.winner}</span><b>vs</b><span>{current.teamTie.teamB||current.teamTie.loser}</span></div>}
      <div className="live-matchup">
        <button onClick={()=>currentA&&onPlayer(currentA.id)}>{currentA&&<Portrait player={currentA} size="profile"/>}<span>{currentA&&<Flag code={currentA.country}/>}<strong>{currentA?fullName(currentA):'Player A'}</strong><small>{currentA?`No. ${currentA.ranking} · ${currentA.rarity}`:''}</small></span></button>
        <div className="game-ticker"><span>Set {setIndex+1}</span><strong>{gamesA}–{gamesB}</strong><small>{setComplete?`Set complete · ${detail.gamesA}-${detail.gamesB}`:`Game ${gameIndex+1} of ${gameCount}`}</small></div>
        <button onClick={()=>currentB&&onPlayer(currentB.id)}>{currentB&&<Portrait player={currentB} size="profile"/>}<span>{currentB&&<Flag code={currentB.country}/>}<strong>{currentB?fullName(currentB):'Player B'}</strong><small>{currentB?`No. ${currentB.ranking} · ${currentB.rarity}`:''}</small></span></button>
      </div>
      <div className="set-score-strip">{details.map((set,i)=><div className={i===setIndex?'active':i<setIndex?'complete':''} key={i}><span>Set {i+1}</span><b>{i<setIndex||i===setIndex&&setComplete?`${set.gamesA}-${set.gamesB}`:'—'}</b></div>)}</div>
      <div className="live-controls">{!setComplete?<button className="primary-live" onClick={()=>setPlaying(value=>!value)}>{playing?'Pause':'Play this set'}</button>:!matchComplete?<button className="primary-live" onClick={nextSet}>Next set</button>:matchIndex<queue.length-1?<button className="primary-live" onClick={nextMatch}>Next featured match</button>:<span className="coverage-complete">Coverage complete</span>}<button className="secondary" onClick={onNextBig}>Skip / Simulate to next big tournament</button></div>
    </section>}
    <section className="landmark-results"><div className="panel-title"><h3>{coverageFinished?'Final results':'Results'}</h3><span>{coverageFinished?'The landmark is now part of the Chronicle.':'Champions stay hidden until your selected live coverage is complete.'}</span></div><div className="landmark-result-grid">{packets.map(packet=><ResultCard key={packet.event.id} universe={universe} event={packet.event} edition={packet.edition} revealed={packet.mode==='none'||coverageFinished}/>)}</div></section>
    {coverageFinished&&<section className="landmark-next"><div><small>Continue the world</small><strong>Move to the next landmark tournament</strong><span>The simulator will advance every normal week automatically and stop again at the next Grand Slam, Olympics, team cup or Tour Finals.</span></div><button onClick={onNextBig}>Simulate to next big tournament</button></section>}
  </div>;
}
