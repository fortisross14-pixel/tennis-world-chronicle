import fs from 'node:fs';

const portrait=fs.readFileSync(new URL('../src/components/Portrait.jsx',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

const requiredPortraitTokens=["profile:128","card:84","ranking:84","--portrait-size"];
for(const token of requiredPortraitTokens) if(!portrait.includes(token)) throw new Error(`Portrait sizing contract missing: ${token}`);
for(const token of ['aspect-ratio:1/1!important','object-fit:cover!important','inline-size:var(--portrait-size,84px)!important']) if(!styles.includes(token)) throw new Error(`Square portrait CSS missing: ${token}`);
for(const token of ['TWC PRESTIGE 2.0','ranking-podium','premium-player-hero','prestige-rivalry-hero','premium-champion-banner','season-progress']) if(!styles.includes(token) && !app.includes(token)) throw new Error(`Prestige UI contract missing: ${token}`);
if(!app.includes('season-progress')) throw new Error('Timeline progress UI missing.');

console.log('UI validation passed',{profilePortrait:128,cardPortrait:84,rankingPortrait:84,prestigeLayer:true});
