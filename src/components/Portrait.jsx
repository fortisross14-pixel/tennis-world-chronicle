import React,{useMemo,useState} from 'react';
import { assignedPortrait,portraitPresentation,portraitUrl } from '../data/portraitLibrary.js';
import { fullName } from '../sim/generation.js';

const SIZE_CLASS={profile:'portrait-profile',card:'portrait-card',ranking:'portrait-ranking',compact:'portrait-compact',draw:'portrait-draw',hero:'portrait-profile',hof:'portrait-card'};
const SIZE_PX={profile:128,hero:128,card:84,ranking:84,hof:84,compact:44,draw:36};

export default function Portrait({player,size='card',className='',showRarityFrame=true,decorative=false}){
  const [broken,setBroken]=useState(false);
  const assigned=useMemo(()=>assignedPortrait(player),[player?.id,player?.country,player?.tour,player?.rarity,player?.socialPersonality]);
  if(!player)return null;
  const name=fullName(player),initials=`${player.firstName?.[0]||''}${player.lastName?.[0]||''}`.toUpperCase()||'?';
  const frame=showRarityFrame?`portrait-rarity-${String(player.rarity||'common').toLowerCase()}`:'portrait-rarity-none';
  const fame=`portrait-fame-${portraitPresentation(player)}`;
  const family=assigned?.family||'unknown';
  const px=SIZE_PX[size]||84;
  return <span className={`player-portrait ${SIZE_CLASS[size]||SIZE_CLASS.card} ${frame} ${fame} ${className}`} style={{'--portrait-size':`${px}px`}} data-family={family} title={`${name} · ${family.replaceAll('-',' ')}`}>
    {!broken&&assigned?<img src={portraitUrl(player)} width="128" height="128" loading="lazy" alt={decorative?'':`${name} portrait`} onError={()=>setBroken(true)}/>:<span className="portrait-initials" aria-label={decorative?'':`${name} portrait unavailable`}>{initials}</span>}
    <span className="portrait-frame" aria-hidden="true"/>
  </span>;
}
