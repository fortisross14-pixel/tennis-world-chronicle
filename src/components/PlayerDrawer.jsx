import React from 'react';
import { Flag,Meter,RarityBadge,SurfaceBadge } from './Common.jsx';
import { careerMultiplier } from '../sim/generation.js';

const SKILLS=[['serve','Serve'],['forehand','Forehand'],['backhand','Backhand'],['volley','Volley'],['return','Return'],['footwork','Footwork'],['endurance','Endurance'],['mentality','Mentality'],['tactics','Tactics']];

export default function PlayerDrawer({player,onClose}) {
  if (!player) return null;
  const ranking=player.status==='retired'?`Retired ${player.retirementYear||''}`:player.junior?`Junior No. ${player.juniorRanking}`:player.doublesSpecialist?`Doubles No. ${player.doublesRanking}`:`World No. ${player.ranking}`;
  const seasons=[...(player.career?.seasons||[])].reverse().slice(0,10);
  const ages=Array.from({length:Math.max(1,36-15)},(_,i)=>15+i);
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="player-drawer">
      <header>
        <div><p>{ranking}</p><h2>{player.firstName} {player.lastName}</h2><div className="player-tags"><Flag code={player.country}/><RarityBadge rarity={player.rarity}/><SurfaceBadge surface={player.preferredSurface}/></div></div>
        <button className="icon-button" onClick={onClose}>×</button>
      </header>
      <div className="identity-grid">
        <div><span>Age</span><strong>{player.age}</strong></div><div><span>Style</span><strong>{player.style}</strong></div><div><span>Current rating</span><strong>{player.currentRating}</strong></div><div><span>Maximum</span><strong>{player.maxRating}</strong></div><div><span>Career curve</span><strong>{player.curveType}</strong></div><div><span>Hand</span><strong>{player.handedness}</strong></div>
      </div>
      <section><h3>Condition</h3><div className="condition-grid"><Meter label="Match shape" value={player.shape}/><Meter label="Fatigue" value={player.fatigue}/><Meter label="Health" value={player.health}/></div></section>
      <section><h3>Skills</h3><div className="skills-grid">{SKILLS.map(([key,label])=><Meter key={key} label={label} value={player.skills?.[key]||0} compact/>)}</div></section>
      <section><h3>Surface profile</h3><div className="surface-bars">{Object.entries(player.surfaceAffinity||{}).map(([surface,value])=><Meter key={surface} label={surface} value={value} compact/>)}</div></section>
      <section><h3>Career development</h3><div className="curve-chart">{ages.map(age=>{const value=careerMultiplier(player.curveType,age,player.peakAge);return <div key={age} title={`Age ${age}: ${value.toFixed(2)}`}><span style={{height:`${Math.max(6,value*76)}px`}}/><small>{age%2?null:age}</small></div>;})}</div></section>
      {!player.junior&&!player.doublesSpecialist&&<section><h3>Career ledger</h3><div className="career-ledger"><div><strong>{player.career.titles}</strong><span>Singles titles</span></div><div><strong>{player.career.majors}</strong><span>Grand Slams</span></div><div><strong>{player.career.weeksNo1}</strong><span>Weeks No. 1</span></div><div><strong>{player.career.doublesTitles}</strong><span>Doubles titles</span></div></div></section>}
      <section><h3>Current season</h3><div className="career-ledger"><div><strong>{player.season?.wins||0}-{player.season?.losses||0}</strong><span>Record</span></div><div><strong>{player.season?.titles||0}</strong><span>Titles</span></div><div><strong>{player.season?.tournaments||0}</strong><span>Tournaments</span></div><div><strong>{player.season?.points||0}</strong><span>Points won</span></div></div></section>
      {seasons.length>0&&<section><h3>Annual breakdown</h3><table><thead><tr><th>Year</th><th>W-L</th><th>Titles</th><th>Majors</th><th>Points</th></tr></thead><tbody>{seasons.map(s=><tr key={s.year}><td>{s.year}</td><td>{s.wins}-{s.losses}</td><td>{s.titles}</td><td>{s.majors}</td><td>{s.points}</td></tr>)}</tbody></table></section>}
      {player.career?.titleLog?.length>0&&<section><h3>Recent titles</h3><div className="title-log">{[...player.career.titleLog].reverse().slice(0,10).map((row,index)=><div key={`${row.year}-${row.event}-${index}`}><strong>{row.year} · {row.event}</strong><span>{row.level} · {row.surface}</span></div>)}</div></section>}
    </aside>
  </div>;
}
