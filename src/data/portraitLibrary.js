// Tennis adaptation of Combat Universe Chronicle's curated portrait-library architecture.
// Faces are finished 128x128 assets. No skin recoloring or facial-component layering occurs at runtime.

export const PORTRAIT_FAMILIES=['european','west-african','east-asian','southeast-asian','south-asian','latin-mixed'];
export const ELITE_RARITIES=new Set(['Generational','Legend','Epic']);

const ELITE_PORTRAITS=[
  {id:'eu_f_05',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/eu_f_05.png',tags:['platinum-hair','pixie','focused','cold','distinctive','veteran','classy']},
  {id:'wa_f_06',tier:'elite',family:'west-african',gender:'Female',file:'elite/west-african/female/wa_f_06.png',tags:['braids','focused','power','clean','fighter']},
  {id:'ea_m_07',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ea_m_07.png',tags:['spiky-hair','stoic','technical','focused']},
  {id:'ea_m_08',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ea_m_08.png',tags:['blonde-hair','cocky','showman','rebel','distinctive']},
  {id:'sea_f_04',tier:'elite',family:'southeast-asian',gender:'Female',file:'elite/southeast-asian/female/sea_f_04.png',tags:['calm','determined','technical','classy','focused']},
  {id:'sa_m_03',tier:'elite',family:'south-asian',gender:'Male',file:'elite/south-asian/male/sa_m_03.png',tags:['warrior','intense','long-hair','fighter','power']},
  {id:'la_m_05',tier:'elite',family:'latin-mixed',gender:'Male',file:'elite/latin-mixed/male/la_m_05.png',tags:['clean','sharp','technical','veteran','classy']},
  {id:'la_f_03',tier:'elite',family:'latin-mixed',gender:'Female',file:'elite/latin-mixed/female/la_f_03.png',tags:['curly','focused','freckled','rebel','distinctive']},

  {id:'ten_eu_m_13',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_13.png',tags:['angular','youthful','classy','clean']},
  {id:'ten_eu_m_14',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_14.png',tags:['blonde-hair','stoic','clean','cold']},
  {id:'ten_eu_m_15',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_15.png',tags:['beard','fighter','intense','veteran']},
  {id:'ten_eu_m_16',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_16.png',tags:['freckled','distinctive','rebel','focused']},
  {id:'ten_eu_m_17',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_17.png',tags:['headband','showman','distinctive','classy']},
  {id:'ten_eu_m_18',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_18.png',tags:['buzzcut','fighter','power','stoic']},
  {id:'ten_eu_m_19',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_19.png',tags:['curly','youthful','technical','focused']},
  {id:'ten_eu_m_20',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_20.png',tags:['headband','fighter','focused','gritty']},
  {id:'ten_eu_m_21',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_21.png',tags:['lean','technical','calm','classy']},
  {id:'ten_eu_m_22',tier:'elite',family:'european',gender:'Male',file:'elite/european/male/ten_eu_m_22.png',tags:['beard','sharp','villain','intense']},

  {id:'ten_eu_f_13',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_13.png',tags:['defined','rebel','focused','distinctive']},
  {id:'ten_eu_f_14',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_14.png',tags:['red-hair','freckled','fighter','distinctive']},
  {id:'ten_eu_f_15',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_15.png',tags:['visor','classy','clean','calm']},
  {id:'ten_eu_f_16',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_16.png',tags:['curly','power','fighter','intense']},
  {id:'ten_eu_f_17',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_17.png',tags:['blonde-hair','classy','cold','technical']},
  {id:'ten_eu_f_18',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_18.png',tags:['sleek','stoic','sharp','technical']},
  {id:'ten_eu_f_19',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_19.png',tags:['fair','clean','focused','classy']},
  {id:'ten_eu_f_20',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_20.png',tags:['dark-hair','showman','distinctive','confident']},
  {id:'ten_eu_f_21',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_21.png',tags:['curly','freckled','rebel','focused']},
  {id:'ten_eu_f_22',tier:'elite',family:'european',gender:'Female',file:'elite/european/female/ten_eu_f_22.png',tags:['strong-brow','fighter','villain','intense']},

  {id:'ten_wa_m_03',tier:'elite',family:'west-african',gender:'Male',file:'elite/west-african/male/ten_wa_m_03.png',tags:['broad','power','fighter','stoic']},
  {id:'ten_wa_m_04',tier:'elite',family:'west-african',gender:'Male',file:'elite/west-african/male/ten_wa_m_04.png',tags:['dreads','headband','showman','distinctive']},
  {id:'ten_ea_m_03',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ten_ea_m_03.png',tags:['sleek','classy','technical','calm']},
  {id:'ten_ea_m_04',tier:'elite',family:'east-asian',gender:'Male',file:'elite/east-asian/male/ten_ea_m_04.png',tags:['sharp','fighter','focused','intense']},
  {id:'ten_sea_m_03',tier:'elite',family:'southeast-asian',gender:'Male',file:'elite/southeast-asian/male/ten_sea_m_03.png',tags:['defined','rebel','focused','distinctive']},
  {id:'ten_sea_m_04',tier:'elite',family:'southeast-asian',gender:'Male',file:'elite/southeast-asian/male/ten_sea_m_04.png',tags:['soft','technical','clean','calm']},
  {id:'ten_sa_m_03',tier:'elite',family:'south-asian',gender:'Male',file:'elite/south-asian/male/ten_sa_m_03.png',tags:['beard','fighter','classy','intense']},
  {id:'ten_sa_m_04',tier:'elite',family:'south-asian',gender:'Male',file:'elite/south-asian/male/ten_sa_m_04.png',tags:['lean','stoic','technical','focused']},
  {id:'ten_la_m_03',tier:'elite',family:'latin-mixed',gender:'Male',file:'elite/latin-mixed/male/ten_la_m_03.png',tags:['wavy-hair','classy','calm','clean']},
  {id:'ten_la_m_04',tier:'elite',family:'latin-mixed',gender:'Male',file:'elite/latin-mixed/male/ten_la_m_04.png',tags:['curly','freckled','rebel','distinctive']},

  {id:'ten_wa_f_03',tier:'elite',family:'west-african',gender:'Female',file:'elite/west-african/female/ten_wa_f_03.png',tags:['braids','fighter','power','focused']},
  {id:'ten_wa_f_04',tier:'elite',family:'west-african',gender:'Female',file:'elite/west-african/female/ten_wa_f_04.png',tags:['natural-hair','stoic','clean','strong']},
  {id:'ten_ea_f_03',tier:'elite',family:'east-asian',gender:'Female',file:'elite/east-asian/female/ten_ea_f_03.png',tags:['clean','classy','calm','technical']},
  {id:'ten_ea_f_04',tier:'elite',family:'east-asian',gender:'Female',file:'elite/east-asian/female/ten_ea_f_04.png',tags:['sleek','focused','cold','classy']},
  {id:'ten_sea_f_03',tier:'elite',family:'southeast-asian',gender:'Female',file:'elite/southeast-asian/female/ten_sea_f_03.png',tags:['soft','showman','distinctive','clean']},
  {id:'ten_sea_f_04',tier:'elite',family:'southeast-asian',gender:'Female',file:'elite/southeast-asian/female/ten_sea_f_04.png',tags:['sharp','stoic','focused','technical']},
  {id:'ten_sa_f_03',tier:'elite',family:'south-asian',gender:'Female',file:'elite/south-asian/female/ten_sa_f_03.png',tags:['curly','fighter','power','focused']},
  {id:'ten_sa_f_04',tier:'elite',family:'south-asian',gender:'Female',file:'elite/south-asian/female/ten_sa_f_04.png',tags:['dark-hair','classy','sharp','calm']},
  {id:'ten_la_f_03',tier:'elite',family:'latin-mixed',gender:'Female',file:'elite/latin-mixed/female/ten_la_f_03.png',tags:['freckled','rebel','distinctive','focused']},
  {id:'ten_la_f_04',tier:'elite',family:'latin-mixed',gender:'Female',file:'elite/latin-mixed/female/ten_la_f_04.png',tags:['sleek','classy','clean','calm']},
];];

const STANDARD_PORTRAITS=[];
const STANDARD_CODES={european:'eur','west-african':'wes','east-asian':'eas','southeast-asian':'sea','south-asian':'sou','latin-mixed':'lat'};
for(const family of PORTRAIT_FAMILIES){
  for(const gender of ['Male','Female']){
    for(let index=1;index<=2;index+=1){
      const code=STANDARD_CODES[family];
      const sex=gender==='Male'?'m':'f';
      STANDARD_PORTRAITS.push({id:`std_${code}_${sex}_${index}`,tier:'standard',family,gender,file:`standard/${family}/${gender.toLowerCase()}/${code}_${sex}_${String(index).padStart(2,'0')}.png`,tags:['clean','athletic','standard']});
    }
  }
}

// Tennis nationality → appearance-family distributions. These are broad visual pools, not claims about identity.
// Diverse countries deliberately retain multiple plausible families.
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
  Fighter:['fighter','intense','power','warrior','focused'],
  Rebel:['rebel','distinctive','cocky','spiky-hair','blonde-hair','curly'],
  Classy:['classy','clean','technical','calm','sharp'],
  Villain:['intense','cocky','cold','power','distinctive'],
  Showman:['showman','distinctive','cocky','blonde-hair','platinum-hair','curly'],
  Stoic:['stoic','focused','technical','calm','veteran'],
};
function chooseAsset(player,family,tier){
  const gender=portraitGender(player),desired=new Set(PERSONALITY_TAGS[player?.socialPersonality]||PERSONALITY_TAGS.Stoic);
  let candidates=(tier==='elite'?ELITE_PORTRAITS:STANDARD_PORTRAITS).filter(asset=>asset.family===family&&asset.gender===gender);
  if(!candidates.length&&tier==='elite')candidates=STANDARD_PORTRAITS.filter(asset=>asset.family===family&&asset.gender===gender);
  if(!candidates.length)candidates=STANDARD_PORTRAITS.filter(asset=>asset.gender===gender);
  if(candidates.length<=1)return candidates[0];
  if(tier!=='elite')return candidates[hash(`${player.id}|portrait`) % candidates.length];
  const rows=candidates.map(asset=>{let score=3;for(const tag of asset.tags||[])if(desired.has(tag))score+=tag==='distinctive'?4:2;return [asset,score];});
  return weighted(`${player.id}|portrait|${player.socialPersonality||'Stoic'}`,rows);
}

export function assignedPortrait(player){
  if(!player)return null;
  const family=portraitFamily(player),tier=portraitTier(player),asset=chooseAsset(player,family,tier);
  return asset?{asset,family,tier,gender:portraitGender(player),fallback:tier==='elite'&&asset.tier!=='elite'}:null;
}
export function portraitUrl(player){const assigned=assignedPortrait(player);return assigned?`${import.meta.env.BASE_URL}portraits-v11/${assigned.asset.file}`:'';}
export function portraitPresentation(player){const fame=Number(player?.fame)||0;return fame>=2200?'iconic':fame>=900?'famous':fame>=300?'known':'emerging';}
export const PORTRAIT_LIBRARY_STATS={eliteAvailable:ELITE_PORTRAITS.length,standardAvailable:STANDARD_PORTRAITS.length,sourceSize:128};
