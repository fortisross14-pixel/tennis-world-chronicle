import React from 'react';
export function BackButton({onBack,label='Back'}){return <button className="back-button" onClick={onBack}>← {label}</button>;}
export function Tabs({items,active,onChange}){return <nav className="detail-tabs">{items.map(item=><button key={item} className={active===item?'active':''} onClick={()=>onChange(item)}>{item}</button>)}</nav>;}
export function Stat({label,value,sub}){return <div className="detail-stat"><span>{label}</span><strong>{value??'—'}</strong>{sub&&<small>{sub}</small>}</div>;}
