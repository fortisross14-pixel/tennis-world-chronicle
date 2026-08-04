import { slugify } from '../sim/random.js';

const EVENTS = [
  [1,'Brisbane International','Brisbane','AUS','Hard','500',32],[1,'Auckland Classic','Auckland','NZL','Hard','250',32],
  [2,'Sydney Open','Sydney','AUS','Hard','500',32],[3,'Australian Open','Melbourne','AUS','Hard','Grand Slam',128],
  [5,'Montpellier Indoor','Montpellier','FRA','Indoor','250',32],[5,'Abu Dhabi Open','Abu Dhabi','UAE','Hard','500',32],
  [6,'Rotterdam Indoor','Rotterdam','NED','Indoor','500',32],[6,'Doha Open','Doha','QAT','Hard','500',32],
  [7,'Buenos Aires Open','Buenos Aires','ARG','Clay','250',32],[7,'Dubai Championships','Dubai','UAE','Hard','500',32],
  [8,'Rio Open','Rio de Janeiro','BRA','Clay','500',32],[8,'Acapulco Open','Acapulco','MEX','Hard','500',32],
  [10,'Indian Wells Masters','Indian Wells','USA','Hard','1000',64],[12,'Miami Masters','Miami','USA','Hard','1000',64],
  [14,'Charleston Open','Charleston','USA','Clay','500',32],[14,'Houston Clay Court','Houston','USA','Clay','250',32],
  [15,'Monte Carlo Masters','Monte Carlo','MON','Clay','1000',64],[16,'Barcelona Open','Barcelona','ESP','Clay','500',32],
  [16,'Stuttgart Open','Stuttgart','GER','Clay','500',32],[17,'Madrid Masters','Madrid','ESP','Clay','1000',64],
  [19,'Rome Masters','Rome','ITA','Clay','1000',64],[21,'Roland Garros','Paris','FRA','Clay','Grand Slam',128],
  [24,'Queen’s Club','London','GBR','Grass','500',32],[24,'Berlin Grass Open','Berlin','GER','Grass','500',32],
  [25,'Halle Open','Halle','GER','Grass','500',32],[25,'Eastbourne International','Eastbourne','GBR','Grass','250',32],
  [27,'Wimbledon','London','GBR','Grass','Grand Slam',128],[30,'Hamburg European Open','Hamburg','GER','Clay','500',32],
  [30,'Washington Open','Washington','USA','Hard','500',32],[31,'Kitzbühel Open','Kitzbühel','AUT','Clay','250',32],
  [31,'San Jose Open','San Jose','USA','Hard','500',32],[32,'Canadian Masters','Toronto / Montreal','CAN','Hard','1000',64],
  [33,'Cincinnati Masters','Cincinnati','USA','Hard','1000',64],[35,'US Open','New York','USA','Hard','Grand Slam',128],
  [38,'Tokyo Open','Tokyo','JPN','Hard','500',32],[38,'Seoul Open','Seoul','KOR','Hard','500',32],
  [39,'Beijing Open','Beijing','CHN','Hard','500',32],[40,'Shanghai Masters','Shanghai','CHN','Hard','1000',64],
  [42,'Vienna Indoor','Vienna','AUT','Indoor','500',32],[42,'Basel Indoor','Basel','SUI','Indoor','500',32],
  [43,'Paris Indoor Masters','Paris','FRA','Indoor','1000',64],[45,'Davis & BJK Cup Finals','Various','INT','Hard','Team',16],
  [47,'Tour Finals','Turin / Riyadh','INT','Indoor','Finals',8],
];

const DEVELOPMENT_BLOCKS = [
  [1,'Canberra'],[2,'Nouméa'],[4,'Quimper'],[5,'Cleveland'],[7,'Bengaluru'],[9,'Santiago'],[11,'Phoenix'],[13,'San Luis Potosí'],
  [14,'Oeiras'],[16,'Prague'],[18,'Bordeaux'],[20,'Parma'],[22,'Prostějov'],[23,'Nottingham'],[25,'Ilkley'],[28,'Braunschweig'],
  [29,'Granby'],[31,'Lexington'],[34,'New Haven'],[37,'Cary'],[39,'Busan'],[41,'Bratislava'],[44,'Helsinki'],[46,'Andria'],
];
const ITF_BLOCKS=[[2,'Antalya'],[6,'Monastir'],[9,'Sharm El Sheikh'],[13,'Heraklion'],[17,'Santa Margherita'],[20,'Casablanca'],[24,'Roehampton'],[29,'Lakewood'],[33,'Lima'],[37,'Tunis'],[41,'Loughborough'],[45,'Kuwait City']];

const JUNIOR_EVENTS = [
  [2,'Junior Oceania Cup','Melbourne','AUS','Hard','Junior 500',32],[3,'Australian Junior Championships','Melbourne','AUS','Hard','Junior Slam',32],
  [6,'African Junior Championships','Tunis','TUN','Hard','Continental',32],[8,'South American Junior Open','Buenos Aires','ARG','Clay','Junior 500',32],
  [11,'Sunshine Junior Masters','Miami','USA','Hard','Junior 500',32],[14,'Asian Junior Championships','New Delhi','IND','Hard','Continental',32],
  [16,'Mediterranean Junior Cup','Barcelona','ESP','Clay','Junior 500',32],[18,'European Junior Championships','Rome','ITA','Clay','Continental',32],
  [21,'French Junior Championships','Paris','FRA','Clay','Junior Slam',32],[25,'European Grass Juniors','London','GBR','Grass','Junior 500',32],
  [27,'Wimbledon Junior Championships','London','GBR','Grass','Junior Slam',32],[31,'North American Junior Open','Toronto','CAN','Hard','Junior 500',32],
  [35,'US Junior Championships','New York','USA','Hard','Junior Slam',32],[39,'Pacific Junior Championships','Tokyo','JPN','Hard','Junior 500',32],
  [42,'Pan-American Junior Cup','Mexico City','MEX','Hard','Continental',32],[46,'Junior World Finals','Barcelona','ESP','Indoor','Junior Finals',16],
];

export const LEVEL_POINTS={'Grand Slam':2000,'1000':1000,'500':500,'250':250,Finals:1500,Challenger:125,'WTA 125':125,ITF:50,Olympics:0,Team:0};

function dateLabel(week){const start=(week-1)*7+1;return `Week ${week} · days ${start}-${start+6}`;}
function eventRow(year,tour,row){
  const [week,name,location,country,surface,level,drawSize]=row;
  return {id:`${year}-${tour}-${week}-${slugify(name)}`,year,week,tour,name,location,country,surface,level,drawSize,
    qualifyingDrawSize:level==='Grand Slam'?64:level==='1000'?32:['500','250','Challenger','WTA 125'].includes(level)?16:0,
    dates:dateLabel(week),status:'upcoming'};
}

export function buildCalendar(year){
  const events=[];
  for(const row of EVENTS)for(const tour of ['ATP','WTA'])events.push(eventRow(year,tour,row));
  for(const [week,city] of DEVELOPMENT_BLOCKS){
    events.push(eventRow(year,'ATP',[week,`${city} Challenger`,city,'INT',week>=15&&week<=23?'Clay':week>=24&&week<=27?'Grass':week>=40?'Indoor':'Hard','Challenger',32]));
    events.push(eventRow(year,'WTA',[week,`${city} WTA 125`,city,'INT',week>=15&&week<=23?'Clay':week>=24&&week<=27?'Grass':week>=40?'Indoor':'Hard','WTA 125',32]));
  }
  for(const [week,city] of ITF_BLOCKS)for(const tour of ['ATP','WTA'])events.push(eventRow(year,tour,[week,`${city} International`,city,'INT',week>=13&&week<=20?'Clay':week===24?'Grass':week>=41?'Indoor':'Hard','ITF',16]));
  if((year-2028)%4===0)for(const tour of ['ATP','WTA'])events.push(eventRow(year,tour,[29,'Olympic Games',year===2028?'Los Angeles':'Olympic Host City',year===2028?'USA':'INT','Hard','Olympics',64]));
  return events.sort((a,b)=>a.week-b.week||levelPriority(b.level)-levelPriority(a.level)||a.name.localeCompare(b.name));
}

function levelPriority(level){return {'Grand Slam':100,Olympics:98,Finals:94,'1000':88,'500':70,'250':58,Challenger:42,'WTA 125':42,ITF:24,Team:90}[level]||10;}

export function buildJuniorCalendar(year){
  const events=[];for(const row of JUNIOR_EVENTS)for(const tour of ['ATP','WTA'])events.push({...eventRow(year,tour,row),id:`${year}-${tour}-J-${row[0]}-${slugify(row[1])}`});
  return events;
}
export const surfaceClass=surface=>`surface-${String(surface).toLowerCase().replace(/\s+/g,'-')}`;
