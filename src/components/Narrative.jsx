import React,{useMemo,useState} from 'react';
import Portrait from './Portrait.jsx';
import { EmptyState,Flag,RarityBadge } from './Common.jsx';
import { fullName,seasonFormLabel } from '../sim/generation.js';
import { careerArcs } from '../sim/narrative.js';
import { topRivalries } from '../sim/rivalries.js';
import { findPlayer } from '../sim/selectors.js';
import { replaceCalendarYears,universeYearLabel } from '../utils/year.js';

const CATEGORY_TONE={
  Champions:'gold','World No. 1':'gold','Record watch':'gold',Cinderella:'clay',Upset:'clay',Epic:'clay',Heartbreak:'clay',
  Comebacks:'green',Development:'green',Rivalries:'indoor',Streaks:'indoor',Rankings:'hard','Season review':'hard',Retirements:'muted',Injuries:'danger',
};
const STARS=n=>'●'.repeat(Math.max(1,Math.min(5,n||1)));

export function FormChip({player}){
  if(!player||player.status==='retired'||player.junior)return null;
  const label=player.seasonFormLabel||seasonFormLabel(player.seasonForm||0);
  const conf=player.confidence||0;
  const confLabel=conf>=5?'Brimming with confidence':conf>=2?'Confident':conf<=-5?'Confidence shattered':conf<=-2?'Low on belief':'Even keel';
  const tone=label==='Career year'||label==='Flying'?'up':label==='Struggling'||label==='Lost season'?'down':'flat';
  return <span className={`form-chip form-${tone}`} title={`Season form ${player.seasonForm>0?'+':''}${player.seasonForm??0} · Confidence ${conf}`}>{label} · {confLabel}</span>;
}

export function StorylinePanel({player,universe,onRivalry}){
  const arcs=useMemo(()=>careerArcs(player),[player]);
  const chapters=[...(player.chronicle||[])].sort((a,b)=>(b.year-a.year)||(b.week-a.week));
  return <section className="panel storyline-panel prestige-panel">
    <div className="panel-title"><h3>Storyline</h3><span>The career, told as chapters</span></div>
    <div className="storyline-head">
      {arcs.length?arcs.slice(0,3).map(arc=><div className={`arc-card arc-${arc.key}`} key={arc.key}><strong>{arc.label}</strong><small>{arc.blurb}</small></div>):<div className="arc-card arc-none"><strong>Story still being written</strong><small>No defining chapter yet. Follow this player to watch it unfold.</small></div>}
    </div>
    {player.status!=='retired'&&!player.junior&&<div className="storyline-form"><span>This season</span><FormChip player={player}/>{player.comebackHunger>0&&<span className="form-chip form-up">Comeback hunger</span>}{(player.breakthroughs||[]).map((b,i)=><span className="form-chip form-up" key={i}>Breakthrough at {b.age}: {b.cause}</span>)}</div>}
    <PlayerRivalryChips player={player} universe={universe} onRivalry={onRivalry}/>
    {chapters.length?<ol className="chapter-timeline">{chapters.map((c,i)=><li key={`${c.year}-${c.week}-${i}`} className={`chapter chapter-${c.type} imp-${c.importance}`}><span>{universeYearLabel(universe,c.year)}{c.week?` · W${c.week}`:''}{c.age?` · age ${c.age}`:''}</span><p>{replaceCalendarYears(universe,c.text)}</p></li>)}</ol>:<EmptyState>No chapters recorded yet.</EmptyState>}
  </section>;
}

function StoryCard({story,universe,onPlayer,compact=false}){
  const people=(story.playerIds||[]).map(id=>findPlayer(universe,id)).filter(Boolean).slice(0,2);
  return <article className={`chronicle-story tone-${CATEGORY_TONE[story.category]||'neutral'} imp-${story.importance||1}${compact?' compact':''}`}>
    <header><span className="chronicle-cat">{story.category}</span><span className="chronicle-when">{universeYearLabel(universe,story.year)} · W{story.week}{story.tour?` · ${story.tour}`:''}</span><span className="chronicle-imp" aria-label={`Importance ${story.importance}`}>{STARS(story.importance)}</span></header>
    <div className="chronicle-body">{people[0]&&!compact&&<button className="chronicle-portrait" onClick={()=>onPlayer?.(people[0].id)}><Portrait player={people[0]} size="card"/></button>}<div><h4>{replaceCalendarYears(universe,story.headline)}</h4><p>{replaceCalendarYears(universe,story.body)}</p>{people.length>0&&<div className="chronicle-people">{people.map(p=><button key={p.id} onClick={()=>onPlayer?.(p.id)}><Flag code={p.country}/>{fullName(p)}</button>)}</div>}</div></div>
  </article>;
}

export function ChronicleFeed({universe,onPlayer,limit=80}){
  const [tour,setTour]=useState('All');
  const [level,setLevel]=useState('Headlines');
  const [category,setCategory]=useState('All');
  const [year,setYear]=useState('All');
  const [followed,setFollowed]=useState(false);
  const stories=universe.magazine||[];
  const categories=useMemo(()=>[...new Set(stories.map(s=>s.category))].sort(),[stories]);
  const years=useMemo(()=>[...new Set(stories.map(s=>s.year))].sort((a,b)=>b-a),[stories]);
  const follow=new Set(universe.followedPlayerIds||[]);
  const rows=stories.filter(s=>(tour==='All'||!s.tour||s.tour===tour)&&(category==='All'||s.category===category)&&(year==='All'||String(s.year)===String(year))&&(level==='All'||(level==='Headlines'?(s.importance||1)>=3:(s.importance||1)>=5))&&(!followed||(s.playerIds||[]).some(id=>follow.has(id))));
  return <div className="chronicle-feed">
    <div className="filter-row"><select value={tour} onChange={e=>setTour(e.target.value)}><option value="All">ATP + WTA</option><option>ATP</option><option>WTA</option></select><select value={level} onChange={e=>setLevel(e.target.value)}><option value="Front page">Front page only</option><option value="Headlines">Headlines</option><option value="All">Everything</option></select><select value={category} onChange={e=>setCategory(e.target.value)}><option value="All">All sections</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select value={year} onChange={e=>setYear(e.target.value)}><option value="All">All seasons</option>{years.map(y=><option key={y} value={y}>{universeYearLabel(universe,y)}</option>)}</select><label className="check-label"><input type="checkbox" checked={followed} onChange={e=>setFollowed(e.target.checked)}/>Followed players</label></div>
    {rows.length?<div className="chronicle-list">{rows.slice(0,limit).map(s=><StoryCard key={s.id} story={s} universe={universe} onPlayer={onPlayer}/>)}</div>:<EmptyState>No stories match these filters yet.</EmptyState>}
    {rows.length>limit&&<p className="muted">Showing the latest {limit} of {rows.length} stories. Narrow by season or section to dig further.</p>}
  </div>;
}

export function FrontPage({universe,onPlayer,weeks=4,limit=6}){
  const now=universe.year*52+universe.week;
  const recent=(universe.magazine||[]).filter(s=>now-(s.year*52+s.week)<=weeks);
  const rows=[...(recent.length>=3?recent:(universe.magazine||[]).slice(0,30))].sort((a,b)=>(b.importance||1)-(a.importance||1)||(b.year*52+b.week)-(a.year*52+a.week)).slice(0,limit);
  return rows.length?<div className="chronicle-front">{rows.map((s,i)=><StoryCard key={s.id} story={s} universe={universe} onPlayer={onPlayer} compact={i>0}/>)}</div>:<EmptyState>The first stories are still to be written.</EmptyState>;
}

function RivalryRow({row,universe,onPlayer,onRivalry,index}){
  const a=findPlayer(universe,row.playerAId),b=findPlayer(universe,row.playerBId);if(!a||!b)return null;
  const leaderA=row.winsA>=row.winsB;const f=row.feud||{winsA:0,winsB:0};
  const span=`${universeYearLabel(universe,row.ignitedAt.year)} – ${row.status==='live'?'present':universeYearLabel(universe,row.endedAt?.year)}`;
  return <article className={`rivalry-board-row identity-${row.identity.key} status-${row.status}`}>
    <span className="rivalry-rank">{index+1}</span>
    <button onClick={()=>onPlayer?.(a.id)} className="rb-player"><Portrait player={a} size="compact"/><span><strong>{fullName(a)}</strong><small><Flag code={a.country}/>{a.status==='retired'?'Retired':`No. ${a.ranking}`}</small></span></button>
    <button className="rb-center" onClick={()=>onRivalry?.(a.id,b.id)}><b className={leaderA?'lead':''}>{row.winsA}</b><span>–</span><b className={!leaderA?'lead':''}>{row.winsB}</b><small>{row.identity.label}</small></button>
    <button onClick={()=>onPlayer?.(b.id)} className="rb-player right"><span><strong>{fullName(b)}</strong><small>{b.status==='retired'?'Retired':`No. ${b.ranking}`}<Flag code={b.country}/></small></span><Portrait player={b} size="compact"/></button>
    <div className="rb-meta"><b>{row.tour} · {span}</b> · ignited at {row.ignitedAt.eventName} · since then {f.winsA}-{f.winsB} · {row.meetings} career meetings · {row.majorFinals||0} Slam final{row.majorFinals===1?'':'s'}{row.leadChanges?` · ${row.leadChanges} lead change${row.leadChanges>1?'s':''}`:''}</div>
  </article>;
}

export function GreatRivalries({universe,onPlayer,onRivalry}){
  const [tour,setTour]=useState('All');
  const t=tour==='All'?null:tour;
  const live=topRivalries(universe,{tour:t,status:'live',limit:40});
  const historic=topRivalries(universe,{tour:t,status:'historic',limit:40});
  return <><div className="filter-row"><select value={tour} onChange={e=>setTour(e.target.value)}><option value="All">ATP + WTA</option><option>ATP</option><option>WTA</option></select></div>
  <p className="muted rivalry-rule">A rivalry ignites when two players meet at least three times in the semifinals or finals of the Slams, Olympics, Tour Finals or Masters 1000s within two seasons, including at least one final, with each winning at least once. From then on it is a lifetime feud until one of them leaves the tour.</p>
  <section className="rivalry-section"><h3>Live rivalries <span>{live.length}</span></h3>{live.length?<div className="rivalry-board">{live.map((row,i)=><RivalryRow key={row.id} row={row} index={i} universe={universe} onPlayer={onPlayer} onRivalry={onRivalry}/>)}</div>:<EmptyState>No live rivalries right now. The next one starts the moment two players keep colliding in big finals.</EmptyState>}</section>
  <section className="rivalry-section"><h3>Historic rivalries <span>{historic.length}</span></h3>{historic.length?<div className="rivalry-board">{historic.map((row,i)=><RivalryRow key={row.id} row={row} index={i} universe={universe} onPlayer={onPlayer} onRivalry={onRivalry}/>)}</div>:<EmptyState>No rivalry has ended yet.</EmptyState>}</section></>;
}

export function PlayerRivalryChips({player,universe,onRivalry}){
  const rows=topRivalries(universe,{limit:200}).filter(r=>r.playerAId===player.id||r.playerBId===player.id);
  if(!rows.length)return null;
  return <div className="storyline-rivals"><span>Rivalries</span>{rows.map(r=>{const oppId=r.playerAId===player.id?r.playerBId:r.playerAId;const opp=findPlayer(universe,oppId);const asA=r.playerAId===player.id;return <button key={r.id} className={`form-chip rival-chip status-${r.status}`} onClick={()=>onRivalry?.(player.id,oppId)}>{r.status==='live'?'🔥':'📜'} {opp?fullName(opp):'Unknown'} · {asA?r.winsA:r.winsB}-{asA?r.winsB:r.winsA}</button>})}</div>;
}
