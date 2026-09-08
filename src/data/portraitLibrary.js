// Tennis World Chronicle portrait library.
// Finished 128x128 portraits only. Faces, skin tone, hair, gender and appearance are baked into each asset.
// No runtime face assembly, skin recoloring or facial-component overlays.

export const PORTRAIT_FAMILIES=['european','west-african','east-asian','southeast-asian','south-asian','latin-mixed'];
export const ELITE_RARITIES=new Set(['Generational','Legend','Epic']);

const STANDARD_CODES={european:'eur','west-african':'wes','east-asian':'eas','southeast-asian':'sea','south-asian':'sou','latin-mixed':'lat'};
const ELITE_CODES={european:'eu','west-african':'wa','east-asian':'ea','southeast-asian':'sea','south-asian':'sa','latin-mixed':'la'};

const VARIANT_TAGS=[
  ['classy','clean','calm','technical'],
  ['fighter','focused','intense','athletic'],
  ['rebel','showman','distinctive','expressive'],
  ['stoic','focused','clean','athletic'],
  ['power','fighter','intense','distinctive'],
  ['classy','veteran','sharp','technical'],
  ['showman','confident','distinctive','rebel'],
  ['stoic','cold','focused','technical'],
];

const STANDARD_PORTRAITS=[];
for(const family of PORTRAIT_FAMILIES){
  for(const gender of ['Male','Female']){
    const code=STANDARD_CODES[family],sex=gender==='Male'?'m':'f';
    for(let index=1;index<=2;index+=1){
      STANDARD_PORTRAITS.push({
        id:`std_${code}_${sex}_${index}`,tier:'standard',family,gender,
        file:`standard/${family}/${gender.toLowerCase()}/${code}_${sex}_${String(index).padStart(2,'0')}.png`,
        tags:['tennis','front-facing','centered',...VARIANT_TAGS[(index-1)%VARIANT_TAGS.length]],
      });
    }
  }
}

// Standard variants 03/04 remain intentionally unavailable to lower rarities and are used only as extra elite identities.
const PROMOTED_STANDARD_ELITE=[];
for(const family of PORTRAIT_FAMILIES){
  for(const gender of ['Male','Female']){
    const code=STANDARD_CODES[family],sex=gender==='Male'?'m':'f';
    for(let index=3;index<=4;index+=1){
      PROMOTED_STANDARD_ELITE.push({
        id:`elite_${code}_${sex}_${index}`,tier:'elite',family,gender,
        file:`standard/${family}/${gender.toLowerCase()}/${code}_${sex}_${String(index).padStart(2,'0')}.png`,
        tags:['tennis','front-facing','centered','promoted-elite',...VARIANT_TAGS[(index-1)%VARIANT_TAGS.length]],
      });
    }
  }
}

// Tennis-specific curated library. Europe has the deepest pool because it supplies a large share of the tour;
// every other appearance family still has multiple genuinely different male and female identities.
const TENNIS_ELITE_PORTRAITS=[];
for(const family of PORTRAIT_FAMILIES){
  for(const gender of ['Male','Female']){
    const code=ELITE_CODES[family],sex=gender==='Male'?'m':'f';
    const count=family==='european'?28:5;
    for(let index=1;index<=count;index+=1){
      TENNIS_ELITE_PORTRAITS.push({
        id:`ten_${code}_${sex}_${String(index).padStart(2,'0')}`,
        tier:'elite',family,gender,
        file:`elite/${family}/${gender.toLowerCase()}/ten_${code}_${sex}_${String(index).padStart(2,'0')}.png`,
        tags:['tennis','front-facing','centered',...VARIANT_TAGS[(index-1)%VARIANT_TAGS.length]],
      });
    }
  }
}

// Selected finished portraits from the Combat v0.11.3 delta that satisfy Tennis's centered/front-facing art direction.
const CURATED_DELTA_PORTRAITS=[
  {id:'eu_f_05',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/eu_f_05.png',tags:['classy','focused','distinctive','clean','veteran']},
  {id:'wa_f_06',tier:'elite',family:'west-african',gender:'Female',file:'elite/west-african/female/wa_f_06.png',tags:['fighter','focused','power','clean','athletic']},
  {id:'ea_m_07',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ea_m_07.png',tags:['stoic','technical','focused','athletic']},
  {id:'ea_m_08',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ea_m_08.png',tags:['showman','rebel','distinctive','cocky']},
  {id:'sea_f_04',tier:'elite',family:'southeast-asian',gender:'Female',file:'elite/southeast-asian/female/sea_f_04.png',tags:['classy','calm','technical','focused']},
  {id:'sa_m_03',tier:'elite',family:'south-asian',gender:'Male',file:'elite/south-asian/male/sa_m_03.png',tags:['fighter','intense','power','focused']},
  {id:'la_m_05',tier:'elite',family:'latin-mixed',gender:'Male',file:'elite/latin-mixed/male/la_m_05.png',tags:['classy','clean','technical','veteran']},
  {id:'la_f_03',tier:'elite',family:'latin-mixed',gender:'Female',file:'elite/latin-mixed/female/la_f_03.png',tags:['rebel','distinctive','focused','showman']},
];
const ELITE_PORTRAITS=[...TENNIS_ELITE_PORTRAITS,...PROMOTED_STANDARD_ELITE,...CURATED_DELTA_PORTRAITS];

// Nationality controls a weighted appearance-family pool; it never directly chooses a face.
const COUNTRY_FAMILY={
  ESP:[['european',90],['latin-mixed',10]], FRA:[['european',72],['west-african',10],['latin-mixed',18]], ITA:[['european',94],['latin-mixed',6]], GER:[['european',94],['latin-mixed',6]], GBR:[['european',78],['west-african',8],['south-asian',6],['latin-mixed',8]],
  SRB:[['european',96],['latin-mixed',4]], CRO:[['european',96],['latin-mixed',4]], CZE:[['european',97],['latin-mixed',3]], POL:[['european',97],['latin-mixed',3]], ROU:[['european',94],['latin-mixed',6]], RUS:[['european',82],['east-asian',7],['latin-mixed',11]], UKR:[['european',97],['latin-mixed',3]], GRE:[['european',90],['latin-mixed',10]], SUI:[['european',90],['latin-mixed',10]], AUT:[['european',95],['latin-mixed',5]], NED:[['european',88],['latin-mixed',8],['west-african',4]], BEL:[['european',86],['west-african',5],['latin-mixed',9]], SWE:[['european',96],['latin-mixed',4]], NOR:[['european',96],['latin-mixed',4]], DEN:[['european',96],['latin-mixed',4]],
  POR:[['european',82],['latin-mixed',16],['west-african',2]], BUL:[['european',97],['latin-mixed',3]], HUN:[['european',96],['latin-mixed',4]], SVK:[['european',97],['latin-mixed',3]], SLO:[['european',97],['latin-mixed',3]], GEO:[['european',80],['latin-mixed',20]],
  USA:[['european',34],['west-african',20],['latin-mixed',22],['east-asian',8],['southeast-asian',6],['south-asian',10]], CAN:[['european',56],['west-african',8],['latin-mixed',16],['east-asian',8],['southeast-asian',4],['south-asian',8]], AUS:[['european',70],['east-asian',6],['southeast-asian',7],['south-asian',4],['latin-mixed',13]], NZL:[['european',62],['southeast-asian',8],['latin-mixed',30]],
  ARG:[['latin-mixed',68],['european',30],['west-african',2]], BRA:[['latin-mixed',60],['west-african',18],['european',14],['east-asian',3],['southeast-asian',3],['south-asian',2]], CHI:[['latin-mixed',82],['european',18]], COL:[['latin-mixed',84],['west-african',9],['european',7]], MEX:[['latin-mixed',94],['european',6]],
  JPN:[['east-asian',98],['latin-mixed',2]], CHN:[['east-asian',96],['latin-mixed',4]], KOR:[['east-asian',96],['latin-mixed',4]], THA:[['southeast-asian',94],['east-asian',4],['latin-mixed',2]], PHI:[['southeast-asian',84],['latin-mixed',14],['east-asian',2]], IND:[['south-asian',98],['latin-mixed',2]],
  KAZ:[['european',52],['east-asian',34],['latin-mixed',14]], UZB:[['european',48],['east-asian',32],['south-asian',12],['latin-mixed',8]], TUR:[['european',54],['south-asian',16],['latin-mixed',30]], ISR:[['european',64],['south-asian',12],['latin-mixed',24]],
  TUN:[['latin-mixed',48],['south-asian',28],['european',24]], MAR:[['latin-mixed',48],['south-asian',26],['european',26]], EGY:[['latin-mixed',40],['south-asian',38],['european',22]], RSA:[['west-african',66],['european',18],['latin-mixed',16]], KEN:[['west-african',96],['latin-mixed',4]], ETH:[['west-african',90],['south-asian',6],['latin-mixed',4]], ERI:[['west-african',88],['south-asian',8],['latin-mixed',4]],
};

function hash(value){let result=2166136261;const text=String(value??'');for(let i=0;i<text.length;i+=1){result^=text.charCodeAt(i);result=Math.imul(result,16777619);}return result>>>0;}
function weighted(key,values){const total=values.reduce((sum,[,weight])=>sum+weight,0);let cursor=(hash(key)/4294967295)*total;for(const [value,weight] of values){cursor-=weight;if(cursor<=0)return value;}return values.at(-1)?.[0];}
export function portraitGender(player){return player?.tour==='WTA'?'Female':'Male';}
export function portraitFamily(player){const dist=COUNTRY_FAMILY[player?.country]||[['latin-mixed',42],['european',30],['west-african',8],['east-asian',7],['southeast-asian',6],['south-asian',7]];return weighted(`${player?.id}|family`,dist);}
export function portraitTier(player){return ELITE_RARITIES.has(player?.rarity)?'elite':'standard';}

const PERSONALITY_TAGS={
  Fighter:['fighter','intense','power','athletic','focused'],
  Rebel:['rebel','distinctive','expressive','showman','cocky'],
  Classy:['classy','clean','technical','calm','veteran'],
  Villain:['intense','cocky','focused','power','distinctive'],
  Showman:['showman','distinctive','expressive','cocky','rebel'],
  Stoic:['stoic','focused','technical','calm','clean'],
};
function chooseAsset(player,family,tier){
  const gender=portraitGender(player),desired=new Set(PERSONALITY_TAGS[player?.socialPersonality]||PERSONALITY_TAGS.Stoic);
  let candidates=(tier==='elite'?ELITE_PORTRAITS:STANDARD_PORTRAITS).filter(asset=>asset.family===family&&asset.gender===gender);
  if(!candidates.length&&tier==='elite')candidates=STANDARD_PORTRAITS.filter(asset=>asset.family===family&&asset.gender===gender);
  if(!candidates.length)candidates=STANDARD_PORTRAITS.filter(asset=>asset.gender===gender);
  if(candidates.length<=1)return candidates[0];
  if(tier!=='elite')return candidates[hash(`${player.id}|portrait`) % candidates.length];
  const rows=candidates.map(asset=>{
    let score=4;
    for(const tag of asset.tags||[])if(desired.has(tag))score+=tag==='distinctive'||tag==='showman'?4:2;
    // Combat-delta faces are excellent curated references, but Tennis-specific portraits remain competitive
    // in the weighting so the game does not simply look like Combat.
    if(asset.id.startsWith('ten_'))score+=3;
    return [asset,score];
  });
  return weighted(`${player.id}|portrait|${player.socialPersonality||'Stoic'}`,rows);
}

export function assignedPortrait(player){
  if(!player)return null;
  const family=portraitFamily(player),tier=portraitTier(player),asset=chooseAsset(player,family,tier);
  return asset?{asset,family,tier,gender:portraitGender(player),fallback:tier==='elite'&&asset.tier!=='elite'}:null;
}
export function portraitUrl(player){const assigned=assignedPortrait(player);return assigned?`${import.meta.env.BASE_URL}portraits-tennis/${assigned.asset.file}`:'';}
export function portraitPresentation(player){const fame=Number(player?.fame)||0;return fame>=2200?'iconic':fame>=900?'famous':fame>=300?'known':'emerging';}
export const PORTRAIT_LIBRARY_STATS={eliteAvailable:ELITE_PORTRAITS.length,standardAvailable:STANDARD_PORTRAITS.length,sourceSize:128};
