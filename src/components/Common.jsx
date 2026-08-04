import React from 'react';
import { iso2Code } from '../data/countries.js';

export const RARITY_ORDER={Generational:6,Legend:5,Epic:4,Rare:3,Uncommon:2,Common:1};

export function RarityBadge({rarity}) {
  return <span className={`badge rarity rarity-${String(rarity).toLowerCase()}`}>{rarity}</span>;
}

export function SurfaceBadge({surface}) {
  return <span className={`badge surface surface-${String(surface).toLowerCase()}`}>{surface}</span>;
}

export function Flag({code}) {
  const iso2=iso2Code(code);
  return <span className="flag" title={code} aria-label={code}><span className={`flag-art ${iso2?`fi fi-${iso2}`:'flag-fallback'}`} aria-hidden="true"/><small>{code}</small></span>;
}

export function Movement({player}) {
  const diff=(player.previousRanking||player.ranking)-player.ranking;
  if (!diff) return <span className="movement flat">—</span>;
  return <span className={`movement ${diff>0?'up':'down'}`}>{diff>0?'▲':'▼'} {Math.abs(diff)}</span>;
}

export function Meter({label,value,max=100,compact=false}) {
  const safe=Math.max(0,Math.min(max,Number(value)||0));
  return <div className={`meter ${compact?'compact':''}`}>
    <div className="meter-label"><span>{label}</span><strong>{Math.round(safe)}</strong></div>
    <div className="meter-track"><span style={{width:`${safe/max*100}%`}} /></div>
  </div>;
}

export function EmptyState({children}) {
  return <div className="empty-state">{children}</div>;
}

export function SectionTitle({eyebrow,children,action}) {
  return <div className="section-heading"><div><small>{eyebrow}</small><h2>{children}</h2></div>{action}</div>;
}
