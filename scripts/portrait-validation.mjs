import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignedPortrait, portraitFamily, portraitTier, PORTRAIT_LIBRARY_STATS } from '../src/data/portraitLibrary.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const portraitRoot=path.join(root,'public','portraits-tennis');
const expectedFamilies=new Set(['european','west-african','east-asian','southeast-asian','south-asian','latin-mixed']);

function pngSize(file){
  const buf=fs.readFileSync(file);
  if(buf.length<24 || buf.toString('ascii',1,4)!=='PNG') throw new Error(`Not a PNG: ${file}`);
  return [buf.readUInt32BE(16),buf.readUInt32BE(20)];
}

const pngs=[];
for(const dirent of fs.readdirSync(portraitRoot,{recursive:true,withFileTypes:true})){
  if(dirent.isFile() && dirent.name.endsWith('.png')) pngs.push(path.join(dirent.parentPath,dirent.name));
}
if(!pngs.length) throw new Error('No portrait PNG assets found.');
for(const file of pngs){
  const [w,h]=pngSize(file);
  if(w!==128||h!==128) throw new Error(`Portrait must be 128x128: ${path.relative(root,file)} is ${w}x${h}`);
}

const countries=['ESP','FRA','ITA','GER','GBR','USA','BRA','ARG','JPN','CHN','KOR','IND','RSA','KEN','THA','PHI','AUS','CAN','SRB','RUS'];
const rarities=['Common','Uncommon','Rare','Epic','Legend','Generational'];
const personalities=['Fighter','Rebel','Classy','Villain','Showman','Stoic'];
let sampled=0;
for(const tour of ['ATP','WTA']){
  for(let i=0;i<600;i+=1){
    const player={
      id:`portrait-qa-${tour}-${i}`,
      tour,
      country:countries[i%countries.length],
      rarity:rarities[i%rarities.length],
      socialPersonality:personalities[i%personalities.length],
    };
    const first=assignedPortrait(player);
    const second=assignedPortrait(JSON.parse(JSON.stringify(player)));
    if(!first?.asset?.file) throw new Error(`No portrait assigned for ${player.id}`);
    if(first.asset.id!==second.asset.id) throw new Error(`Non-deterministic portrait for ${player.id}`);
    if(!expectedFamilies.has(portraitFamily(player))) throw new Error(`Unknown appearance family for ${player.id}`);
    if(portraitTier(player)==='standard' && !['Common','Uncommon','Rare'].includes(player.rarity)) throw new Error(`Tier mismatch for ${player.id}`);
    const assetPath=path.join(portraitRoot,first.asset.file);
    if(!fs.existsSync(assetPath)) throw new Error(`Missing assigned portrait asset: ${first.asset.file}`);
    const gender=tour==='ATP'?'Male':'Female';
    if(first.asset.gender!==gender) throw new Error(`Gender pool mismatch for ${player.id}`);
    sampled+=1;
  }
}

if(PORTRAIT_LIBRARY_STATS.standardAvailable!==24) throw new Error(`Expected 24 standard portraits, got ${PORTRAIT_LIBRARY_STATS.standardAvailable}`);
if(PORTRAIT_LIBRARY_STATS.eliteAvailable<150) throw new Error(`Elite portrait pool unexpectedly small: ${PORTRAIT_LIBRARY_STATS.eliteAvailable}`);

console.log('Portrait validation passed',{
  pngAssets:pngs.length,
  standardAvailable:PORTRAIT_LIBRARY_STATS.standardAvailable,
  eliteAvailable:PORTRAIT_LIBRARY_STATS.eliteAvailable,
  deterministicAssignments:sampled,
});
