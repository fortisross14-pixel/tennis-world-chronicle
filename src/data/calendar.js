import { slugify } from '../sim/random.js';

const EVENTS = [
  [1,'Brisbane International','Brisbane','AUS','Hard','500',32],
  [1,'Auckland Classic','Auckland','NZL','Hard','250',32],
  [2,'Sydney Open','Sydney','AUS','Hard','500',32],
  [3,'Australian Open','Melbourne','AUS','Hard','Grand Slam',64],
  [5,'Montpellier Indoor','Montpellier','FRA','Indoor','250',32],
  [5,'Abu Dhabi Open','Abu Dhabi','UAE','Hard','500',32],
  [6,'Rotterdam Indoor','Rotterdam','NED','Indoor','500',32],
  [6,'Doha Open','Doha','QAT','Hard','500',32],
  [7,'Buenos Aires Open','Buenos Aires','ARG','Clay','250',32],
  [7,'Dubai Championships','Dubai','UAE','Hard','500',32],
  [8,'Rio Open','Rio de Janeiro','BRA','Clay','500',32],
  [8,'Acapulco Open','Acapulco','MEX','Hard','500',32],
  [10,'Indian Wells Masters','Indian Wells','USA','Hard','1000',64],
  [12,'Miami Masters','Miami','USA','Hard','1000',64],
  [14,'Charleston Open','Charleston','USA','Clay','500',32],
  [14,'Houston Clay Court','Houston','USA','Clay','250',32],
  [15,'Monte Carlo Masters','Monte Carlo','MON','Clay','1000',64],
  [16,'Barcelona Open','Barcelona','ESP','Clay','500',32],
  [16,'Stuttgart Open','Stuttgart','GER','Clay','500',32],
  [17,'Madrid Masters','Madrid','ESP','Clay','1000',64],
  [19,'Rome Masters','Rome','ITA','Clay','1000',64],
  [21,'Roland Garros','Paris','FRA','Clay','Grand Slam',64],
  [24,'Queen’s Club','London','GBR','Grass','500',32],
  [24,'Berlin Grass Open','Berlin','GER','Grass','500',32],
  [25,'Halle Open','Halle','GER','Grass','500',32],
  [25,'Eastbourne International','Eastbourne','GBR','Grass','250',32],
  [27,'Wimbledon','London','GBR','Grass','Grand Slam',64],
  [30,'Hamburg European Open','Hamburg','GER','Clay','500',32],
  [30,'Washington Open','Washington','USA','Hard','500',32],
  [31,'Kitzbühel Open','Kitzbühel','AUT','Clay','250',32],
  [31,'San Jose Open','San Jose','USA','Hard','500',32],
  [32,'Canadian Masters','Toronto / Montreal','CAN','Hard','1000',64],
  [33,'Cincinnati Masters','Cincinnati','USA','Hard','1000',64],
  [35,'US Open','New York','USA','Hard','Grand Slam',64],
  [38,'Tokyo Open','Tokyo','JPN','Hard','500',32],
  [38,'Seoul Open','Seoul','KOR','Hard','500',32],
  [39,'Beijing Open','Beijing','CHN','Hard','500',32],
  [40,'Shanghai Masters','Shanghai','CHN','Hard','1000',64],
  [42,'Vienna Indoor','Vienna','AUT','Indoor','500',32],
  [42,'Basel Indoor','Basel','SUI','Indoor','500',32],
  [43,'Paris Indoor Masters','Paris','FRA','Indoor','1000',64],
  [45,'Davis & BJK Cup Finals','Various','INT','Hard','Team',16],
  [47,'Tour Finals','Turin / Riyadh','INT','Indoor','Finals',8],
];

const JUNIOR_EVENTS = [
  [2,'Junior Oceania Cup','Melbourne','AUS','Hard','Junior 500',32],
  [3,'Australian Junior Championships','Melbourne','AUS','Hard','Junior Slam',32],
  [8,'South American Junior Open','Buenos Aires','ARG','Clay','Junior 500',32],
  [11,'Sunshine Junior Masters','Miami','USA','Hard','Junior 500',32],
  [16,'Mediterranean Junior Cup','Barcelona','ESP','Clay','Junior 500',32],
  [21,'French Junior Championships','Paris','FRA','Clay','Junior Slam',32],
  [25,'European Grass Juniors','London','GBR','Grass','Junior 500',32],
  [27,'Wimbledon Junior Championships','London','GBR','Grass','Junior Slam',32],
  [31,'North American Junior Open','Toronto','CAN','Hard','Junior 500',32],
  [35,'US Junior Championships','New York','USA','Hard','Junior Slam',32],
  [39,'Asian Junior Championships','Tokyo','JPN','Hard','Junior 500',32],
  [46,'Junior World Finals','Barcelona','ESP','Indoor','Junior Finals',16],
];

export const LEVEL_POINTS = {
  'Grand Slam': 2000,
  '1000': 1000,
  '500': 500,
  '250': 250,
  Finals: 1500,
  Olympics: 0,
  Team: 0,
};

export function buildCalendar(year) {
  const events = [];
  for (const [week,name,location,country,surface,level,drawSize] of EVENTS) {
    for (const tour of ['ATP','WTA']) {
      events.push({
        id: `${year}-${tour}-${week}-${slugify(name)}`,
        year,
        week,
        tour,
        name,
        location,
        country,
        surface,
        level,
        drawSize,
        status: 'upcoming',
      });
    }
  }
  if ((year - 2028) % 4 === 0) {
    for (const tour of ['ATP','WTA']) {
      events.push({
        id: `${year}-${tour}-29-olympic-games`,
        year,
        week: 29,
        tour,
        name: 'Olympic Games',
        location: year === 2028 ? 'Los Angeles' : 'Olympic Host City',
        country: year === 2028 ? 'USA' : 'INT',
        surface: 'Hard',
        level: 'Olympics',
        drawSize: 64,
        status: 'upcoming',
      });
    }
  }
  return events.sort((a,b) => a.week - b.week || b.drawSize - a.drawSize || a.name.localeCompare(b.name));
}

export function buildJuniorCalendar(year) {
  const events = [];
  for (const [week,name,location,country,surface,level,drawSize] of JUNIOR_EVENTS) {
    for (const tour of ['ATP','WTA']) {
      events.push({
        id: `${year}-${tour}-J-${week}-${slugify(name)}`,
        year,
        week,
        tour,
        name,
        location,
        country,
        surface,
        level,
        drawSize,
        status: 'upcoming',
      });
    }
  }
  return events;
}

export const surfaceClass = surface => `surface-${String(surface).toLowerCase().replace(/\s+/g,'-')}`;
