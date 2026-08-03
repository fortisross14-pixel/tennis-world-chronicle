import React,{useState} from 'react';
import { Flag,RarityBadge } from './Common.jsx';

function PeopleTable({rows,empty='None this year'}) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  return <div className="transition-people">{rows.slice(0,18).map((row,index)=><div key={`${row.id||row.name}-${index}`}>
    <Flag code={row.country}/><strong>{row.name}</strong><span>{row.tour}</span>{row.rarity&&<RarityBadge rarity={row.rarity}/>}<small>{row.age?`Age ${row.age}`:''}</small>
  </div>)}</div>;
}

export default function TransitionOverlay({transition,onDismiss,onOpenNext}) {
  const [tab,setTab]=useState(transition.mode==='end'?'review':'movement');
  if (!transition) return null;
  const summary=transition.yearSummary||transition.previousYearSummary;
  return <div className="modal-backdrop transition-backdrop">
    <section className="transition-modal">
      <header>
        <div><p className="kicker">{transition.mode==='end'?'Season complete':'New season dossier'}</p><h1>{transition.mode==='end'?`${transition.year} Year-End Review`:`Welcome to ${transition.year}`}</h1></div>
        {transition.mode!=='end'&&<button className="icon-button" onClick={onDismiss}>×</button>}
      </header>
      <p className="transition-message">{transition.message}</p>
      <nav className="tab-row">
        <button className={tab==='review'?'active':''} onClick={()=>setTab('review')}>Season review</button>
        <button className={tab==='movement'?'active':''} onClick={()=>setTab('movement')}>Player movement</button>
        <button className={tab==='youngsters'?'active':''} onClick={()=>setTab('youngsters')}>New youngsters</button>
      </nav>
      <div className="transition-body">
        {tab==='review'&&<>
          {summary?<>
            <div className="award-grid">{summary.awards?.map(award=><article key={award.tour}><span>{award.tour}</span><h3>{award.yearEndNo1?.name||'—'}</h3><p>Year-end No. 1 · {award.yearEndNo1?.points?.toLocaleString()||0} points</p><strong>Player of the Year: {award.playerOfYear?.name||'—'}</strong></article>)}</div>
            <h3>Grand Slam champions</h3>
            <div className="major-grid">{summary.majorWinners?.map((row,index)=><div key={`${row.tour}-${row.event}-${index}`}><span>{row.tour}</span><strong>{row.event}</strong><p><Flag code={row.country}/> {row.winner}</p></div>)}</div>
          </>:<p className="muted">This is the first season. History begins now.</p>}
        </>}
        {tab==='movement'&&<div className="movement-columns">
          <section><h3>Promoted to singles ({transition.promoted?.length||0})</h3><PeopleTable rows={transition.promoted}/></section>
          <section><h3>Converted to doubles ({transition.doublesConversions?.length||0})</h3><PeopleTable rows={transition.doublesConversions}/></section>
          <section><h3>Career retirements ({transition.retired?.length||0})</h3><PeopleTable rows={transition.retired}/></section>
          <section><h3>No roster place ({transition.overflowRetired?.length||0})</h3><PeopleTable rows={transition.overflowRetired} empty="Every age-out junior found a place."/></section>
        </div>}
        {tab==='youngsters'&&<><h3>New 15- and 16-year-old prospects ({transition.newJuniors?.length||0})</h3><PeopleTable rows={transition.newJuniors}/></>}
      </div>
      <footer>
        {transition.mode==='end'?<button onClick={onOpenNext}>Open {transition.year+1} season</button>:<button onClick={onDismiss}>Enter the season</button>}
      </footer>
    </section>
  </div>;
}
