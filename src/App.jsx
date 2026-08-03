import React,{useEffect,useMemo,useState} from 'react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SaveSlots from './components/SaveSlots.jsx';
import TransitionOverlay from './components/TransitionOverlay.jsx';
import PlayerDrawer from './components/PlayerDrawer.jsx';
import { EmptyState,Flag,Meter,Movement,RarityBadge,SectionTitle,SurfaceBadge } from './components/Common.jsx';
import { createUniverse, fullName, SINGLES_CAP, DOUBLES_CAP, JUNIOR_TARGET } from './sim/generation.js';
import { advanceWeeks, dismissTransition, openNextSeason, simulateOneYear, simulateToEndOfYear } from './sim/season.js';
import { rebuildDoublesTeams } from './sim/doubles.js';
import { RNG } from './sim/random.js';
import { listSlots,loadSlot,saveSlot,deleteSlot } from './storage/db.js';
import { countryByCode } from './data/countries.js';

const NAV=['Home','Calendar','Tournaments','Rankings','Players','Doubles','Juniors','National Teams','Magazine','Almanac','Records','World'];
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

function playerButton(player,onSelect,children=null) {
  return <button className="player-link" onClick={()=>onSelect(player.id)}>{children||fullName(player)}</button>;
}

function TopRanking({title,players,onSelect}) {
  return <article className="panel ranking-panel"><div className="panel-title"><h3>{title}</h3><span>Live 52-week table</span></div><ol>{players.slice(0,5).map(p=><li key={p.id}><span className="rank-number">{p.ranking}</span><Flag code={p.country}/><div>{playerButton(p,onSelect)}<small>{p.rarity} · {p.style}</small></div><strong>{p.rankingPoints.toLocaleString()}</strong></li>)}</ol></article>;
}

function HomePage({universe,onSelect}) {
  const nextMajor=universe.calendar.find(e=>e.week>=universe.week&&['Grand Slam','Olympics'].includes(e.level));
  const latestMajors=[...universe.tournamentEditions].filter(e=>e.event.level==='Grand Slam').reverse().slice(0,8);
  const fatigue=[...universe.players.ATP,...universe.players.WTA].sort((a,b)=>b.fatigue-a.fatigue).slice(0,6);
  return <div className="page home-page">
    <section className="hero-scoreboard">
      <div><p className="kicker">Season {universe.year} · Week {universe.week}</p><h1>The world tour is alive</h1><p>Two complete singles circuits, full doubles fields and the next generation moving through the junior ranks.</p></div>
      <div className="next-major"><span>Next landmark</span><strong>{nextMajor?.name||'Season review'}</strong><p>{nextMajor?`Week ${nextMajor.week} · ${nextMajor.surface} · ${nextMajor.location}`:'The final events have been played.'}</p></div>
    </section>
    <section className="population-strip">
      <div><strong>{universe.players.ATP.length}</strong><span>ATP singles</span></div><div><strong>{universe.players.WTA.length}</strong><span>WTA singles</span></div><div><strong>{universe.doublesPlayers.ATP.length+universe.doublesPlayers.WTA.length}</strong><span>Doubles specialists</span></div><div><strong>{universe.juniors.ATP.length+universe.juniors.WTA.length}</strong><span>Junior prospects</span></div>
    </section>
    <section className="two-column"><TopRanking title="ATP Top Five" players={universe.players.ATP} onSelect={onSelect}/><TopRanking title="WTA Top Five" players={universe.players.WTA} onSelect={onSelect}/></section>
    <section className="two-column">
      <article className="panel"><div className="panel-title"><h3>Recent major champions</h3><span>Canonical tournament history</span></div>{latestMajors.length?<div className="champion-list">{latestMajors.map(e=><div key={e.id}><SurfaceBadge surface={e.event.surface}/><div><strong>{e.event.name} · {e.event.tour}</strong><button className="player-link" onClick={()=>onSelect(e.championId)}>{e.championName}</button></div><Flag code={e.championCountry}/></div>)}</div>:<EmptyState>The first Grand Slam is waiting in week 3.</EmptyState>}</article>
      <article className="panel"><div className="panel-title"><h3>Fatigue watch</h3><span>Heavy schedules have consequences</span></div><div className="fatigue-list">{fatigue.map(p=><div key={p.id}><div><Flag code={p.country}/>{playerButton(p,onSelect)}<small>{p.tour} · No. {p.ranking}</small></div><Meter label="Fatigue" value={p.fatigue} compact/></div>)}</div></article>
    </section>
    <section className="panel magazine-preview"><div className="panel-title"><h3>Latest Chronicle</h3><span>Why the week mattered</span></div><div className="story-grid">{universe.magazine.slice(0,6).map(s=><article key={s.id}><span>{s.category}</span><h4>{s.headline}</h4><p>{s.body}</p><small>{s.year} · Week {s.week}</small></article>)}</div></section>
  </div>;
}

function CalendarPage({universe,tour}) {
  const byWeek=Array.from({length:52},(_,i)=>i+1).map(week=>({week,events:universe.calendar.filter(e=>e.week===week&&e.tour===tour)})).filter(row=>row.events.length);
  return <div className="page"><SectionTitle eyebrow={`${tour} world tour`}>Annual calendar</SectionTitle><div className="calendar-list">{byWeek.map(row=><section className={`calendar-week ${row.week===universe.week?'current':''}`} key={row.week}><div className="week-marker"><span>WEEK</span><strong>{row.week}</strong></div><div className="calendar-events">{row.events.map(e=><article key={e.id}><div><h3>{e.name}</h3><p>{e.location} · {e.level}</p></div><SurfaceBadge surface={e.surface}/><span className={`status ${e.status}`}>{e.status}</span></article>)}</div></section>)}</div></div>;
}

function TournamentPage({universe,tour,onSelect}) {
  const [editionId,setEditionId]=useState(null);
  const editions=[...universe.tournamentEditions].filter(e=>e.event.tour===tour).reverse();
  const selected=editions.find(e=>e.id===editionId)||editions[0];
  const upcoming=universe.calendar.filter(e=>e.tour===tour&&e.status!=='completed'&&e.week>=universe.week).slice(0,12);
  const byRound=selected?(selected.matches||[]).reduce((groups,match)=>{(groups[match.round]??=[]).push(match);return groups;},{}):{};
  const lookup=id=>universe.players[tour].find(p=>p.id===id)||universe.retiredPlayers?.[tour]?.find(p=>p.id===id);
  return <div className="page"><SectionTitle eyebrow={`${tour} draws`}>Tournaments</SectionTitle><div className="tournament-layout"><aside className="event-browser"><h3>Completed editions</h3>{editions.slice(0,30).map(e=><button className={selected?.id===e.id?'active':''} onClick={()=>setEditionId(e.id)} key={e.id}><span>{e.event.week}</span><div><strong>{e.event.name}</strong><small>{e.event.level} · {e.event.surface}</small></div></button>)}<h3>Upcoming</h3>{upcoming.map(e=><div className="upcoming-row" key={e.id}><span>W{e.week}</span><div><strong>{e.name}</strong><small>{e.level}</small></div></div>)}</aside><main className="draw-sheet">{selected?<><header><div><p>{selected.event.tour} · {selected.event.level}</p><h2>{selected.event.name}</h2><span>{selected.event.location} · Week {selected.event.week}</span></div><SurfaceBadge surface={selected.event.surface}/></header><div className="final-card"><span>Champion</span><button onClick={()=>onSelect(selected.championId)}>{selected.championName}</button><p>over {selected.finalistName}</p></div><div className="draw-rounds">{Object.entries(byRound).map(([round,matches])=><section key={round}><h3>{round}</h3>{matches.map(match=>{const winner=lookup(match.winnerId);const loser=lookup(match.loserId);return <article key={match.id}><div><button onClick={()=>onSelect(winner?.id)}>{winner?fullName(winner):'Winner'}</button><small>{winner?.ranking?`No. ${winner.ranking}`:''}</small></div><strong>{match.score}</strong><div><button onClick={()=>onSelect(loser?.id)}>{loser?fullName(loser):'Opponent'}</button><small>{match.explanation}</small></div></article>;})}</section>)}</div></>:<EmptyState>No tournament has completed yet.</EmptyState>}</main></div></div>;
}

function RankingsPage({universe,tour,onSelect,search}) {
  const players=universe.players[tour].filter(p=>fullName(p).toLowerCase().includes(search.toLowerCase())||p.country.toLowerCase().includes(search.toLowerCase())).slice(0,150);
  return <div className="page"><SectionTitle eyebrow={`${tour} official ranking`}>World rankings</SectionTitle><div className="table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Movement</th><th>Player</th><th>Age</th><th>Rarity</th><th>Surface</th><th>Shape</th><th>Fatigue</th><th>Points</th></tr></thead><tbody>{players.map(p=><tr key={p.id}><td className="rank-cell">{p.ranking}</td><td><Movement player={p}/></td><td><Flag code={p.country}/>{playerButton(p,onSelect)}</td><td>{p.age}</td><td><RarityBadge rarity={p.rarity}/></td><td><SurfaceBadge surface={p.preferredSurface}/></td><td>{Math.round(p.shape)}</td><td className={p.fatigue>60?'warning-text':''}>{Math.round(p.fatigue)}</td><td><strong>{p.rankingPoints.toLocaleString()}</strong></td></tr>)}</tbody></table></div></div>;
}

function PlayersPage({universe,tour,onSelect,search}) {
  const [rarity,setRarity]=useState('All');
  const [surface,setSurface]=useState('All');
  const [status,setStatus]=useState('Active');
  const source=status==='Active'?universe.players[tour]:status==='Retired'?(universe.retiredPlayers?.[tour]||[]):[...universe.players[tour],...(universe.retiredPlayers?.[tour]||[])];
  const players=source.filter(p=>(rarity==='All'||p.rarity===rarity)&&(surface==='All'||p.preferredSurface===surface)&&(fullName(p).toLowerCase().includes(search.toLowerCase())||p.country.toLowerCase().includes(search.toLowerCase())));
  return <div className="page"><SectionTitle eyebrow={`${tour} active roster`}>Players <span className="title-count">{players.length}</span></SectionTitle><div className="filter-row"><select value={status} onChange={e=>setStatus(e.target.value)}>{['Active','Retired','All'].map(x=><option key={x}>{x}</option>)}</select><select value={rarity} onChange={e=>setRarity(e.target.value)}>{['All','Generational','Legend','Epic','Rare','Uncommon','Common'].map(x=><option key={x}>{x}</option>)}</select><select value={surface} onChange={e=>setSurface(e.target.value)}>{['All','Hard','Clay','Grass','Indoor'].map(x=><option key={x}>{x}</option>)}</select></div><div className="player-card-grid">{players.slice(0,180).map(p=><article key={p.id} onClick={()=>onSelect(p.id)}><header><span>{p.status==='retired'?`Retired ${p.retirementYear||''}`:`No. ${p.ranking}`}</span><RarityBadge rarity={p.rarity}/></header><h3>{fullName(p)}</h3><p><Flag code={p.country}/> Age {p.age}</p><div className="card-tags"><SurfaceBadge surface={p.preferredSurface}/><span>{p.style}</span></div><div className="mini-stats"><div><strong>{p.currentRating}</strong><span>Rating</span></div><div><strong>{p.shape.toFixed(0)}</strong><span>Shape</span></div><div><strong>{p.fatigue.toFixed(0)}</strong><span>Fatigue</span></div></div></article>)}</div></div>;
}

function DoublesPage({universe,tour,onSelect}) {
  const teams=universe.doublesTeams[tour]||[];
  const specialists=universe.doublesPlayers[tour];
  return <div className="page"><SectionTitle eyebrow={`${tour} partnership circuit`}>Doubles</SectionTitle><section className="population-strip compact"><div><strong>{specialists.length}/{DOUBLES_CAP}</strong><span>Dedicated players</span></div><div><strong>{teams.length}</strong><span>Active partnerships</span></div><div><strong>{specialists.filter(p=>p.age<=22).length}</strong><span>Young converts</span></div><div><strong>{specialists.filter(p=>p.doublesCareer?.majors>0).length}</strong><span>Major champions</span></div></section><div className="two-column wide-left"><article className="panel"><div className="panel-title"><h3>Partnership rankings</h3><span>Chemistry, serve, return and volley weighted</span></div><table><thead><tr><th>#</th><th>Team</th><th>Chem.</th><th>Rating</th><th>Points</th></tr></thead><tbody>{teams.slice(0,50).map(t=><tr key={t.id}><td>{t.ranking}</td><td>{t.playerNames.map((name,index)=><React.Fragment key={t.playerIds[index]}><button className="player-link" onClick={()=>onSelect(t.playerIds[index])}>{name}</button>{index===0?' / ':''}</React.Fragment>)}</td><td>{t.chemistry}</td><td>{t.rating}</td><td>{t.points.toLocaleString()}</td></tr>)}</tbody></table></article><article className="panel"><div className="panel-title"><h3>Doubles specialists</h3><span>Singles overflow and chosen specialists</span></div><div className="compact-player-list">{specialists.slice(0,40).map(p=><div key={p.id}><span>{p.doublesRanking}</span><Flag code={p.country}/>{playerButton(p,onSelect)}<strong>{p.doublesRating}</strong></div>)}</div></article></div></div>;
}

function JuniorsPage({universe,tour,onSelect,search}) {
  const juniors=universe.juniors[tour].filter(p=>fullName(p).toLowerCase().includes(search.toLowerCase())||p.country.toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><SectionTitle eyebrow={`${tour} future class`}>Junior rankings</SectionTitle><div className="junior-rule"><strong>Stable population rule</strong><p>At age 20, every junior must leave this list. Vacant singles places are filled first; remaining players try the 160-player doubles roster, then retire if both circuits are full.</p></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Junior rank</th><th>Player</th><th>Age</th><th>Rarity</th><th>Style</th><th>Preferred court</th><th>Current</th><th>Maximum</th><th>Projected route</th></tr></thead><tbody>{juniors.map(p=>{const route=p.age>=19?(universe.players[tour].length<SINGLES_CAP?'Singles opening':'Singles fight / doubles fallback'):'Junior development';return <tr key={p.id}><td>{p.juniorRanking}</td><td><Flag code={p.country}/>{playerButton(p,onSelect)}</td><td>{p.age}</td><td><RarityBadge rarity={p.rarity}/></td><td>{p.style}</td><td><SurfaceBadge surface={p.preferredSurface}/></td><td>{p.currentRating}</td><td>{p.maxRating}</td><td>{route}</td></tr>;})}</tbody></table></div></div>;
}

function NationalTeamsPage({universe,tour}) {
  const byCountry=new Map();
  for (const p of universe.players[tour]) {if(!byCountry.has(p.country))byCountry.set(p.country,[]);byCountry.get(p.country).push(p);}
  const rankings=[...byCountry.entries()].map(([country,players])=>({country,players:players.sort((a,b)=>a.ranking-b.ranking).slice(0,4)})).map(row=>({...row,score:row.players.reduce((s,p)=>s+p.currentRating,0)/row.players.length})).sort((a,b)=>b.score-a.score).slice(0,30);
  const history=[...universe.nationalTeams[tour]].reverse();
  return <div className="page"><SectionTitle eyebrow={tour==='ATP'?'Davis Cup universe':'Billie Jean King Cup universe'}>National teams</SectionTitle><div className="two-column"><article className="panel"><div className="panel-title"><h3>Country power ranking</h3><span>Top four active players</span></div><ol className="country-ranking">{rankings.map((r,index)=><li key={r.country}><span>{index+1}</span><Flag code={r.country}/><div><strong>{countryByCode(r.country).name}</strong><small>{r.players.map(fullName).join(', ')}</small></div><b>{r.score.toFixed(1)}</b></li>)}</ol></article><article className="panel"><div className="panel-title"><h3>Championship history</h3><span>Annual national-team finals</span></div>{history.length?<div className="history-list">{history.map(row=><div key={row.year}><strong>{row.year}</strong><Flag code={row.winner}/><span>{countryByCode(row.winner).name}</span></div>)}</div>:<EmptyState>The first national-team finals arrive in week 45.</EmptyState>}</article></div></div>;
}

function MagazinePage({universe}) {
  const [category,setCategory]=useState('All');
  const categories=['All',...new Set(universe.magazine.map(s=>s.category))];
  const stories=universe.magazine.filter(s=>category==='All'||s.category===category);
  return <div className="page"><SectionTitle eyebrow="The weekly tennis paper">Magazine</SectionTitle><div className="filter-row"><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="magazine-layout">{stories.map((s,index)=><article className={s.importance>=5?'lead':''} key={s.id}><span>{s.category} · {s.year}, Week {s.week}</span><h2>{s.headline}</h2><p>{s.body}</p>{index===0&&<div className="story-rule"/>}</article>)}</div></div>;
}

function AlmanacPage({universe,onSelect}) {
  const years=[...universe.yearSummaries].reverse();
  return <div className="page"><SectionTitle eyebrow="Season-by-season memory">Almanac</SectionTitle>{years.length?<div className="almanac-years">{years.map(summary=><section key={summary.year}><header><span>Season</span><h2>{summary.year}</h2><p>{summary.completedEvents} editions · {summary.totalMatches.toLocaleString()} player match entries</p></header><div className="award-grid">{summary.awards.map(a=><article key={a.tour}><strong>{a.tour}</strong><button className="player-link" onClick={()=>onSelect(a.yearEndNo1?.id)}>{a.yearEndNo1?.name}</button><span>Year-end No. 1</span></article>)}</div><div className="major-grid">{summary.majorWinners.map((m,index)=><div key={`${m.tour}-${m.event}-${index}`}><span>{m.tour}</span><strong>{m.event}</strong><p><Flag code={m.country}/>{m.winner}</p></div>)}</div></section>)}</div>:<EmptyState>Complete the first season to open the historical almanac.</EmptyState>}</div>;
}

function Leaderboard({title,rows,valueLabel,onSelect}) {return <article className="panel"><div className="panel-title"><h3>{title}</h3><span>{valueLabel}</span></div><ol className="record-list">{rows.slice(0,15).map((row,index)=><li key={row.player.id}><span>{index+1}</span><Flag code={row.player.country}/><button className="player-link" onClick={()=>onSelect(row.player.id)}>{fullName(row.player)}</button><strong>{row.value}</strong></li>)}</ol></article>;}
function RecordsPage({universe,tour,onSelect}) {
  const players=[...universe.players[tour],...(universe.retiredPlayers?.[tour]||[]).filter(p=>!p.careerType)];
  const boards=[
    ['Grand Slam titles',players.map(player=>({player,value:player.career.majors})).sort((a,b)=>b.value-a.value),'career majors'],
    ['Career titles',players.map(player=>({player,value:player.career.titles})).sort((a,b)=>b.value-a.value),'singles trophies'],
    ['Weeks at No. 1',players.map(player=>({player,value:player.career.weeksNo1})).sort((a,b)=>b.value-a.value),'ranking weeks'],
    ['Career match wins',players.map(player=>({player,value:player.career.wins})).sort((a,b)=>b.value-a.value),'matches won'],
  ];
  return <div className="page"><SectionTitle eyebrow={`${tour} historical records`}>Record book</SectionTitle><div className="record-grid">{boards.map(([title,rows,label])=><Leaderboard key={title} title={title} rows={rows} valueLabel={label} onSelect={onSelect}/>)}</div></div>;
}

function WorldPage({universe,slot,onSave,onExit}) {
  const stats=[['ATP singles',universe.players.ATP.length,SINGLES_CAP],['WTA singles',universe.players.WTA.length,SINGLES_CAP],['ATP doubles',universe.doublesPlayers.ATP.length,DOUBLES_CAP],['WTA doubles',universe.doublesPlayers.WTA.length,DOUBLES_CAP],['Boys juniors',universe.juniors.ATP.length,JUNIOR_TARGET],['Girls juniors',universe.juniors.WTA.length,JUNIOR_TARGET]];
  return <div className="page"><SectionTitle eyebrow={`Save slot ${slot}`}>World settings</SectionTitle><section className="panel world-rules"><h3>Population integrity</h3><p>The simulation does not allow unchecked player growth. Every January it restores exactly 360 ATP and 360 WTA singles players, preserves a maximum of 160 dedicated doubles players per tour, and replenishes juniors to 120 per tour.</p><div className="population-audit">{stats.map(([label,value,target])=><div key={label}><span>{label}</span><strong className={value===target?'ok':'bad'}>{value} / {target}</strong></div>)}</div></section><section className="panel"><h3>Simulation controls</h3><p><strong>+4 Weeks</strong> follows the near-term calendar. <strong>End of Year</strong> stops on the review screen. <strong>+1 Year</strong> completes the current season, runs the full roster transition, and opens January of the following year with a combined dossier.</p></section><section className="panel world-actions"><button onClick={onSave}>Save now</button><button className="secondary" onClick={onExit}>Save and return to slots</button></section></div>;
}

function ChronicleApp() {
  const [slots,setSlots]=useState([]);
  const [slot,setSlot]=useState(null);
  const [universe,setUniverse]=useState(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [nav,setNav]=useState('Home');
  const [tour,setTour]=useState('ATP');
  const [search,setSearch]=useState('');
  const [selectedPlayerId,setSelectedPlayerId]=useState(null);

  const refreshSlots=async()=>{const rows=await listSlots();setSlots(rows.map(r=>r.metadata||r));};
  useEffect(()=>{refreshSlots();},[]);

  const selectedPlayer=useMemo(()=>{
    if(!universe||!selectedPlayerId)return null;
    for(const t of ['ATP','WTA']) {
      const found=[...universe.players[t],...universe.juniors[t],...universe.doublesPlayers[t],...(universe.retiredPlayers?.[t]||[])].find(p=>p.id===selectedPlayerId);
      if(found)return found;
    }
    return null;
  },[universe,selectedPlayerId]);

  const persist=async(next)=>{if(slot&&next)await saveSlot(slot,next);};

  const createWorld=async(targetSlot,name)=>{
    setBusy(true);setNotice('Building players, calendars and junior classes…');
    try {
      const next=createUniverse({seed:Date.now()+targetSlot,startYear:2026,name});
      const rng=new RNG(next.rngSeed);
      rebuildDoublesTeams(next,'ATP',rng);rebuildDoublesTeams(next,'WTA',rng);next.rngSeed=rng.seed;
      await saveSlot(targetSlot,next);
      setSlot(targetSlot);setUniverse(next);setNav('Home');setNotice('Universe created and saved.');await refreshSlots();
    } finally {setBusy(false);}
  };
  const loadWorld=async(targetSlot)=>{setBusy(true);try{const loaded=await loadSlot(targetSlot);if(loaded){loaded.retiredPlayers??={ATP:[],WTA:[]};loaded.doublesTeams??={ATP:[],WTA:[]};loaded.settings??={autosave:true,compactResults:false,showTransitionScreens:true};if(!loaded.doublesTeams.ATP?.length||!loaded.doublesTeams.WTA?.length){const rng=new RNG(loaded.rngSeed);rebuildDoublesTeams(loaded,'ATP',rng);rebuildDoublesTeams(loaded,'WTA',rng);loaded.rngSeed=rng.seed;}setSlot(targetSlot);setUniverse(loaded);setNav('Home');}}finally{setBusy(false);}};
  const removeWorld=async targetSlot=>{if(!window.confirm(`Delete save slot ${targetSlot} permanently?`))return;setBusy(true);try{await deleteSlot(targetSlot);await refreshSlots();}finally{setBusy(false);}};

  const mutate=async(label,fn)=>{
    if(!universe||busy)return;
    setBusy(true);setNotice(label);
    try{const next=clone(universe);fn(next);next.meta.updatedAt=new Date().toISOString();setUniverse(next);await persist(next);setNotice('Autosaved.');}
    catch(error){console.error(error);setNotice(`Simulation error: ${error.message}`);throw error;}
    finally{setBusy(false);}
  };

  const saveNow=async()=>{if(!universe)return;setBusy(true);try{await persist(universe);setNotice('Save complete.');await refreshSlots();}finally{setBusy(false);}};
  const exitToSlots=async()=>{await saveNow();setUniverse(null);setSlot(null);setSelectedPlayerId(null);await refreshSlots();};

  if(!universe)return <SaveSlots slots={slots} onCreate={createWorld} onLoad={loadWorld} onDelete={removeWorld} busy={busy}/>;

  let page=null;
  const common={universe,tour,onSelect:setSelectedPlayerId,search};
  if(nav==='Home')page=<HomePage universe={universe} onSelect={setSelectedPlayerId}/>;
  else if(nav==='Calendar')page=<CalendarPage universe={universe} tour={tour}/>;
  else if(nav==='Tournaments')page=<TournamentPage {...common}/>;
  else if(nav==='Rankings')page=<RankingsPage {...common}/>;
  else if(nav==='Players')page=<PlayersPage {...common}/>;
  else if(nav==='Doubles')page=<DoublesPage {...common}/>;
  else if(nav==='Juniors')page=<JuniorsPage {...common}/>;
  else if(nav==='National Teams')page=<NationalTeamsPage universe={universe} tour={tour}/>;
  else if(nav==='Magazine')page=<MagazinePage universe={universe}/>;
  else if(nav==='Almanac')page=<AlmanacPage universe={universe} onSelect={setSelectedPlayerId}/>;
  else if(nav==='Records')page=<RecordsPage {...common}/>;
  else page=<WorldPage universe={universe} slot={slot} onSave={saveNow} onExit={exitToSlots}/>;

  return <div className="app-shell">
    <header className="top-shell">
      <div className="brand-row"><button className="brand" onClick={()=>setNav('Home')}><span>TWC</span><div><strong>Tennis World Chronicle</strong><small>{universe.name}</small></div></button><div className="season-chip"><span>{universe.year}</span><strong>Week {universe.week}</strong></div><div className="tour-toggle"><button className={tour==='ATP'?'active':''} onClick={()=>setTour('ATP')}>ATP</button><button className={tour==='WTA'?'active':''} onClick={()=>setTour('WTA')}>WTA</button></div><label className="global-search"><span>⌕</span><input placeholder="Search players or country" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="save-icon" onClick={saveNow}>Save</button></div>
      <nav className="main-nav">{NAV.map(item=><button key={item} className={nav===item?'active':''} onClick={()=>setNav(item)}>{item}</button>)}</nav>
      <div className="simulation-bar"><div><span className={`live-dot ${busy?'busy':''}`}/><strong>{busy?notice:'Simulation controls'}</strong><small>{!busy&&notice}</small></div><div className="sim-buttons"><button disabled={busy||universe.seasonEnded} onClick={()=>mutate('Simulating one complete year…',next=>simulateOneYear(next))}>+1 Year</button><button disabled={busy||universe.seasonEnded} onClick={()=>mutate('Simulating four weeks…',next=>advanceWeeks(next,4))}>+4 Weeks</button><button disabled={busy||universe.seasonEnded} onClick={()=>mutate('Completing the season…',next=>simulateToEndOfYear(next))}>End of Year</button></div></div>
    </header>
    <main className="content-shell">{page}</main>
    {universe.transition&&universe.settings.showTransitionScreens&&<TransitionOverlay transition={universe.transition} onDismiss={()=>mutate('Opening the season…',next=>dismissTransition(next))} onOpenNext={()=>mutate(`Opening ${universe.year+1}…`,next=>openNextSeason(next))}/>} 
    <PlayerDrawer player={selectedPlayer} onClose={()=>setSelectedPlayerId(null)}/>
  </div>;
}

export default function App(){return <ErrorBoundary><ChronicleApp/></ErrorBoundary>;}
