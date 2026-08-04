export const COUNTRIES = [
  { code: 'ESP', name: 'Spain', weight: 10, first: ['Carlos','Rafael','Pablo','Alejandro','Sergio','David','Marcos','Lucia','Paula','Marta','Carla','Elena'], last: ['García','Martínez','Navarro','Ruiz','Alonso','Ferrer','Soler','Vega'] },
  { code: 'USA', name: 'United States', weight: 14, first: ['Taylor','Ben','Jack','Tommy','Alex','Mason','Coco','Madison','Sofia','Emma','Jessica','Avery'], last: ['Johnson','Miller','Brooks','Reed','Hayes','Walker','Bennett','Parker'] },
  { code: 'FRA', name: 'France', weight: 10, first: ['Arthur','Lucas','Hugo','Pierre','Theo','Gael','Clara','Camille','Lea','Amelie','Manon','Juliette'], last: ['Martin','Bernard','Dubois','Moreau','Laurent','Simon','Petit','Roux'] },
  { code: 'ITA', name: 'Italy', weight: 10, first: ['Luca','Matteo','Jannik','Marco','Andrea','Lorenzo','Giulia','Sara','Elisa','Martina','Camilla','Sofia'], last: ['Rossi','Bianchi','Romano','Conti','Ricci','Gallo','Greco','Costa'] },
  { code: 'GER', name: 'Germany', weight: 8, first: ['Alexander','Jan','Florian','Max','Lukas','Nico','Anna','Laura','Lena','Julia','Mia','Hanna'], last: ['Schmidt','Müller','Weber','Wagner','Fischer','Becker','Klein','Hoffmann'] },
  { code: 'GBR', name: 'Great Britain', weight: 8, first: ['Jack','Oliver','Daniel','Henry','Cameron','Lewis','Emma','Katie','Harriet','Olivia','Maya','Lucy'], last: ['Smith','Wilson','Taylor','Brown','Evans','Campbell','Murray','Clark'] },
  { code: 'AUS', name: 'Australia', weight: 8, first: ['Nick','Jordan','Alex','Max','James','Luke','Ashleigh','Ajla','Daria','Olivia','Talia','Maddison'], last: ['Thompson','Harris','Mitchell','Fraser','Cooper','Kelly','Owen','Baker'] },
  { code: 'SRB', name: 'Serbia', weight: 7, first: ['Novak','Nikola','Luka','Milan','Marko','Dusan','Ana','Jelena','Ivana','Milica','Teodora','Nina'], last: ['Jovanović','Nikolić','Petrović','Ilić','Đorđević','Stanković','Pavlović','Milošević'] },
  { code: 'CRO', name: 'Croatia', weight: 5, first: ['Marin','Borna','Ivan','Mate','Luka','Ante','Donna','Petra','Ana','Lucija','Marta','Lea'], last: ['Horvat','Kovač','Babić','Marić','Novak','Jurić','Knežević','Vuković'] },
  { code: 'CZE', name: 'Czech Republic', weight: 7, first: ['Jakub','Tomas','Jiri','Adam','Petr','Martin','Karolina','Petra','Barbora','Linda','Katerina','Marketa'], last: ['Novák','Svoboda','Dvořák','Černý','Procházka','Kučera','Veselý','Horák'] },
  { code: 'POL', name: 'Poland', weight: 6, first: ['Hubert','Kamil','Jan','Piotr','Mateusz','Filip','Iga','Magda','Alicja','Marta','Katarzyna','Zofia'], last: ['Nowak','Kowalski','Wiśniewski','Wójcik','Kamiński','Lewandowski','Zieliński','Szymański'] },
  { code: 'ROU', name: 'Romania', weight: 5, first: ['Victor','Marius','Andrei','Radu','Alexandru','Sorin','Simona','Irina','Sorana','Ana','Elena','Mihaela'], last: ['Popescu','Ionescu','Stan','Dumitru','Stoica','Radu','Marin','Tudor'] },
  { code: 'RUS', name: 'Russia', weight: 9, first: ['Daniil','Andrey','Karen','Roman','Mikhail','Ivan','Aryna','Daria','Anna','Veronika','Ekaterina','Maria'], last: ['Ivanov','Petrov','Sokolov','Volkov','Morozov','Pavlov','Kuznetsov','Orlov'] },
  { code: 'UKR', name: 'Ukraine', weight: 5, first: ['Oleksii','Andrii','Maksym','Ivan','Bohdan','Artem','Elina','Marta','Lesia','Dayana','Anhelina','Kateryna'], last: ['Shevchenko','Koval','Bondarenko','Tkachenko','Melnyk','Kravchenko','Boyko','Polishchuk'] },
  { code: 'GRE', name: 'Greece', weight: 4, first: ['Stefanos','Nikos','Giorgos','Alexis','Petros','Dimitris','Maria','Eleni','Sofia','Katerina','Despina','Irene'], last: ['Papadopoulos','Nikolaidis','Georgiou','Pappas','Vlachos','Karalis','Samaras','Kostas'] },
  { code: 'SUI', name: 'Switzerland', weight: 4, first: ['Roger','Stan','Dominic','Luca','Marc','Noah','Belinda','Viktorija','Jil','Lena','Alina','Nina'], last: ['Meier','Müller','Schmid','Keller','Frei','Bühler','Steiner','Koch'] },
  { code: 'AUT', name: 'Austria', weight: 4, first: ['Dominic','Sebastian','Lukas','Jurij','Matthias','Felix','Julia','Tamira','Barbara','Sinja','Marlene','Leonie'], last: ['Gruber','Huber','Bauer','Wagner','Pichler','Moser','Steiner','Hofer'] },
  { code: 'NED', name: 'Netherlands', weight: 5, first: ['Tallon','Botic','Tim','Jesper','Max','Jelle','Kiki','Arantxa','Lesley','Suzan','Eva','Noa'], last: ['De Vries','Jansen','Van Dijk','Bakker','Visser','Smit','Meijer','Mulder'] },
  { code: 'BEL', name: 'Belgium', weight: 4, first: ['David','Zizou','Kimmer','Joris','Arthur','Gilles','Elise','Yanina','Greet','Maryna','Sofie','Lotte'], last: ['Peeters','Janssens','Maes','Willems','Claes','Goossens','De Smet','Jacobs'] },
  { code: 'SWE', name: 'Sweden', weight: 4, first: ['Leo','Elias','Mikael','Karl','Viktor','Oskar','Rebecca','Johanna','Mirjam','Elsa','Alva','Nora'], last: ['Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson'] },
  { code: 'NOR', name: 'Norway', weight: 3, first: ['Casper','Nicolai','Viktor','Magnus','Emil','Henrik','Ulrikke','Malene','Astrid','Ingrid','Nora','Thea'], last: ['Hansen','Johansen','Olsen','Larsen','Andersen','Nilsen','Kristiansen','Berg'] },
  { code: 'DEN', name: 'Denmark', weight: 4, first: ['Holger','August','Mikkel','Emil','Frederik','Lars','Caroline','Clara','Johanne','Emma','Sofie','Alma'], last: ['Jensen','Nielsen','Hansen','Pedersen','Andersen','Christensen','Larsen','Sørensen'] },
  { code: 'CAN', name: 'Canada', weight: 7, first: ['Felix','Denis','Gabriel','Liam','Alexis','Milos','Leylah','Bianca','Rebecca','Eugenie','Marina','Victoria'], last: ['Tremblay','Roy','Gagnon','Lee','Wilson','Martin','Clark','Bouchard'] },
  { code: 'ARG', name: 'Argentina', weight: 8, first: ['Juan','Diego','Sebastian','Francisco','Tomas','Federico','Gabriela','Solana','Paula','Nadia','Julia','Victoria'], last: ['González','Rodríguez','Fernández','López','Martínez','Pérez','Sánchez','Romero'] },
  { code: 'BRA', name: 'Brazil', weight: 7, first: ['Joao','Thiago','Felipe','Bruno','Gustavo','Rafael','Beatriz','Luisa','Laura','Carolina','Ana','Gabriela'], last: ['Silva','Santos','Oliveira','Souza','Lima','Costa','Ferreira','Alves'] },
  { code: 'CHI', name: 'Chile', weight: 4, first: ['Nicolas','Cristian','Alejandro','Marcelo','Tomas','Matias','Daniela','Fernanda','Alexa','Camila','Isidora','Antonia'], last: ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva'] },
  { code: 'COL', name: 'Colombia', weight: 4, first: ['Daniel','Santiago','Nicolas','Juan','Alejandro','Mateo','Camila','Mariana','Maria','Emiliana','Sara','Valeria'], last: ['Rodríguez','Martínez','García','Gómez','López','Díaz','Torres','Ramírez'] },
  { code: 'MEX', name: 'Mexico', weight: 5, first: ['Santiago','Emiliano','Diego','Mateo','Sebastian','Andres','Renata','Sofia','Valentina','Camila','Regina','Ximena'], last: ['Hernández','García','Martínez','López','González','Pérez','Ramírez','Sánchez'] },
  { code: 'JPN', name: 'Japan', weight: 7, first: ['Kei','Yuta','Haruto','Ren','Sota','Kaito','Naomi','Aoi','Hina','Mio','Yui','Sakura'], last: ['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura'] },
  { code: 'CHN', name: 'China', weight: 8, first: ['Wei','Jun','Hao','Ming','Tao','Lei','Qinwen','Shuai','Xinyu','Yafan','Lin','Mei'], last: ['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao'] },
  { code: 'KOR', name: 'South Korea', weight: 4, first: ['Hyeon','Minjun','Jiho','Joon','Seojun','Taeyang','Soojin','Minji','Yuna','Jiwon','Hana','Nari'], last: ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon'] },
  { code: 'IND', name: 'India', weight: 5, first: ['Rohan','Arjun','Vikram','Kabir','Aarav','Dev','Sania','Ankita','Riya','Isha','Maya','Ananya'], last: ['Sharma','Patel','Singh','Kumar','Rao','Gupta','Mehta','Kapoor'] },
  { code: 'KAZ', name: 'Kazakhstan', weight: 4, first: ['Alexander','Timofey','Denis','Mikhail','Arman','Daniyar','Elena','Yulia','Anna','Zarina','Amina','Kamila'], last: ['Smirnov','Kim','Volkov','Bekov','Sadykov','Orlov','Ivanova','Kuznetsova'] },
  { code: 'TUN', name: 'Tunisia', weight: 3, first: ['Malek','Aziz','Youssef','Karim','Sami','Amine','Ons','Ines','Meriem','Sarra','Lina','Aya'], last: ['Ben Ali','Trabelsi','Mansouri','Haddad','Gharbi','Ayari','Jaziri','Bouazizi'] },
  { code: 'MAR', name: 'Morocco', weight: 3, first: ['Younes','Amine','Karim','Omar','Mehdi','Adam','Aya','Salma','Nadia','Meryem','Imane','Lina'], last: ['El Amrani','Alaoui','Bennani','Tazi','Idrissi','Berrada','Fassi','Chraibi'] },
  { code: 'RSA', name: 'South Africa', weight: 4, first: ['Kevin','Lloyd','Jason','Ryan','Matthew','Luke','Chanel','Zoe','Michaela','Tayla','Emma','Kayla'], last: ['Van der Merwe','Botha','Smith','Naidoo','Mokoena','Pietersen','Daniels','Jacobs'] },
  { code: 'EGY', name: 'Egypt', weight: 3, first: ['Omar','Youssef','Karim','Ahmed','Mostafa','Ali','Mayar','Nour','Farida','Salma','Hana','Mariam'], last: ['Hassan','Mohamed','Ahmed','Ali','Ibrahim','Mahmoud','Said','Fathy'] },
  { code: 'NZL', name: 'New Zealand', weight: 3, first: ['Michael','Finn','James','Liam','Noah','George','Erin','Paige','Lulu','Sasha','Ruby','Olivia'], last: ['Williams','Taylor','Wilson','Brown','Thompson','Anderson','Walker','King'] },
  { code: 'TUR', name: 'Turkey', weight: 4, first: ['Cem','Emir','Mert','Can','Kerem','Bora','Cagla','Ipek','Ayse','Ece','Selin','Derya'], last: ['Yılmaz','Kaya','Demir','Çelik','Şahin','Aydın','Arslan','Koç'] },
  { code: 'POR', name: 'Portugal', weight: 4, first: ['Joao','Tiago','Miguel','Rui','Pedro','Diogo','Maria','Ines','Beatriz','Leonor','Matilde','Carolina'], last: ['Silva','Santos','Ferreira','Pereira','Costa','Oliveira','Rodrigues','Martins','Sousa','Fernandes'] },
  { code: 'BUL', name: 'Bulgaria', weight: 3, first: ['Grigor','Dimitar','Nikolay','Ivan','Martin','Petar','Viktoriya','Tsvetana','Elena','Gergana','Mariya','Kalina'], last: ['Ivanov','Petrov','Dimitrov','Georgiev','Nikolov','Stoyanov','Todorov','Iliev','Vasilev','Kolev'] },
  { code: 'HUN', name: 'Hungary', weight: 3, first: ['Marton','Fabian','Balazs','Gabor','Adam','Bence','Anna','Dalma','Reka','Panna','Luca','Zsofia'], last: ['Nagy','Kovacs','Toth','Szabo','Horvath','Varga','Kiss','Molnar','Nemeth','Farkas'] },
  { code: 'SVK', name: 'Slovakia', weight: 3, first: ['Alex','Martin','Lukas','Filip','Andrej','Matej','Dominika','Viktoria','Anna','Rebecca','Kristina','Nina'], last: ['Horvath','Kovac','Varga','Toth','Nagy','Balaz','Molnar','Novak','Lukac','Urban'] },
  { code: 'SLO', name: 'Slovenia', weight: 3, first: ['Aljaz','Blaz','Luka','Ziga','Miha','Jan','Tamara','Kaja','Nika','Polona','Veronika','Lara'], last: ['Novak','Horvat','Kovac','Krajnc','Zupancic','Potocnik','Mlakar','Kos','Turk','Vidmar'] },
  { code: 'GEO', name: 'Georgia', weight: 2, first: ['Nikoloz','Giorgi','Luka','Saba','Dato','Irakli','Mariam','Nino','Ana','Salome','Tamar','Elene'], last: ['Beridze','Kapanadze','Gelashvili','Maisuradze','Giorgadze','Lomidze','Tsiklauri','Japaridze','Mchedlidze','Dvali'] },
  { code: 'UZB', name: 'Uzbekistan', weight: 2, first: ['Denis','Temur','Sanjar','Bekzod','Aziz','Jasur','Nigina','Sabina','Kamila','Madina','Amina','Dilnoza'], last: ['Istomin','Karimov','Rakhimov','Usmonov','Tursunov','Yuldashev','Saidov','Khamidov','Nazarov','Abdullaev'] },
  { code: 'THA', name: 'Thailand', weight: 2, first: ['Kasidit','Wishaya','Pruchya','Noppawan','Krittin','Thanapet','Luksika','Mananchaya','Peangtarn','Lanlana','Punnin','Patcharin'], last: ['Samrej','Trongcharoenchaikul','Isarow','Kovapitukted','Wongteanchai','Plipuech','Naklo','Suwandee','Ruangma','Maneerat'] },
  { code: 'PHI', name: 'Philippines', weight: 2, first: ['Francis','Jeson','Michael','Gabriel','Miguel','Rafael','Alexandra','Kathleen','Patricia','Bianca','Sofia','Mikaela'], last: ['Alcantara','Patrombon','Gonzales','Reyes','Santos','Cruz','Garcia','Mendoza','Flores','Ramos'] },
  { code: 'KEN', name: 'Kenya', weight: 2, first: ['Kevin','Eliud','Brian','Daniel','Samuel','Victor','Angela','Stacy','Faith','Mercy','Wanjiku','Akinyi'], last: ['Kiptoo','Mwangi','Otieno','Kamau','Njoroge','Omondi','Wanjala','Mutua','Chebet','Kiplagat'] },
  { code: 'ETH', name: 'Ethiopia', weight: 2, first: ['Dawit','Nahom','Yonas','Abel','Samuel','Bereket','Sara','Bethlehem','Hanna','Mekdes','Liya','Selam'], last: ['Bekele','Tesfaye','Kebede','Alemu','Girma','Tadesse','Worku','Demissie','Abebe','Mengistu'] },
  { code: 'ERI', name: 'Eritrea', weight: 1, first: ['Merhawi','Dawit','Natnael','Amanuel','Yonas','Samuel','Rahel','Selam','Luwam','Saron','Ruth','Hanna'], last: ['Berhane','Tesfay','Ghebremedhin','Habtom','Tekle','Gebre','Yemane','Goitom','Kidane','Haile'] },
  { code: 'ISR', name: 'Israel', weight: 3, first: ['Dudi','Yoni','Noam','Ariel','Daniel','Eitan','Shahar','Julia','Maya','Noa','Tamar','Yael'], last: ['Cohen','Levi','Mizrahi','Peretz','Biton','Dahan','Katz','Sharon'] },
];

export const ISO2_BY_CODE = {
  ESP:'es',USA:'us',FRA:'fr',ITA:'it',GER:'de',GBR:'gb',AUS:'au',SRB:'rs',CRO:'hr',CZE:'cz',POL:'pl',ROU:'ro',RUS:'ru',UKR:'ua',GRE:'gr',SUI:'ch',AUT:'at',NED:'nl',BEL:'be',SWE:'se',NOR:'no',DEN:'dk',CAN:'ca',ARG:'ar',BRA:'br',CHI:'cl',COL:'co',MEX:'mx',JPN:'jp',CHN:'cn',KOR:'kr',IND:'in',KAZ:'kz',TUN:'tn',MAR:'ma',RSA:'za',EGY:'eg',NZL:'nz',TUR:'tr',ISR:'il',POR:'pt',BUL:'bg',HUN:'hu',SVK:'sk',SLO:'si',GEO:'ge',UZB:'uz',THA:'th',PHI:'ph',KEN:'ke',ETH:'et',ERI:'er'
};

export function iso2Code(code) {
  return ISO2_BY_CODE[code] || '';
}

export function flagEmoji(code) {
  const iso2 = iso2Code(code)?.toUpperCase();
  if (!iso2) return '🏳️';
  return [...iso2].map(c => String.fromCodePoint(127397 + c.charCodeAt())).join('');
}

export function countryByCode(code) {
  return COUNTRIES.find(c => c.code === code) || { code, name: code };
}
