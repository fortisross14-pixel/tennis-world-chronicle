// ---------------------------------------------------------------------------
// Tennis World Chronicle — narrative engine (v0.8)
//
// The simulation produces results; this module decides which results are
// *stories*. It writes three things:
//   1. universe.magazine  — the news feed (with importance + player tags)
//   2. player.chronicle   — each player's career chapters (compact, capped)
//   3. universe.recordBook — age / title records that can be broken
// It also classifies careers into arcs (rags to riches, comeback, one-Slam
// wonder, nearly man...) for the player page.
// ---------------------------------------------------------------------------
import { fullName } from './generation.js';
import { rivalryForPair, rivalryIdentity } from './rivalries.js';

const MAGAZINE_CAP = 1400;
const CHRONICLE_CAP = 48;
const BIG = new Set(['Grand Slam', 'Olympics', 'Finals', '1000']);
const ROUND_LABEL = { R128: 'first round', R64: 'second round', R32: 'third round', R16: 'fourth round', QF: 'quarterfinals', SF: 'semifinals', F: 'final', W: 'title' };
const ROUND_ORDER = { R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, F: 7, W: 8 };
const ORDINAL = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const words = n => NUMBER_WORDS[n] || String(n);

function hash(text = '') { let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function vary(list, seed) { return list[hash(String(seed)) % list.length]; }
const he = p => (p?.tour === 'WTA' ? 'she' : 'he');
const his = p => (p?.tour === 'WTA' ? 'her' : 'his');
const him = p => (p?.tour === 'WTA' ? 'her' : 'him');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const abs = (year, week) => year * 52 + week;

// ---------------------------------------------------------------------------
// Feed + chronicle primitives
// ---------------------------------------------------------------------------
export function story(universe, category, headline, body, importance = 2, week = universe.week, meta = {}) {
  universe.magazine ??= [];
  universe.magazine.unshift({
    id: `story-${universe.year}-${week}-${hash(headline + universe.magazine.length)}`,
    year: universe.year, week, category, headline, body, importance,
    tour: meta.tour || null,
    playerIds: meta.playerIds || [],
    tone: meta.tone || null,
  });
  if (universe.magazine.length > MAGAZINE_CAP) trimMagazine(universe);
}

// Keep the archive meaningful: when full, drop the oldest low-importance items
// first, so a decade later the big stories are still there.
function trimMagazine(universe) {
  const keep = MAGAZINE_CAP - 100;
  const rows = universe.magazine;
  for (let floor = 1; rows.length > keep && floor <= 4; floor += 1) {
    for (let i = rows.length - 1; i >= 200 && rows.length > keep; i -= 1) if ((rows[i].importance || 1) <= floor) rows.splice(i, 1);
  }
  if (rows.length > keep) rows.length = keep;
}

export function chronicle(player, universe, type, text, importance = 2, week = universe.week) {
  if (!player) return;
  player.chronicle ??= [];
  player.chronicle.push({ year: universe.year, week, age: player.age, type, text, importance });
  if (player.chronicle.length > CHRONICLE_CAP) {
    // drop the least important, oldest entry
    let idx = 0;
    for (let i = 1; i < player.chronicle.length; i += 1) if ((player.chronicle[i].importance || 1) < (player.chronicle[idx].importance || 1)) idx = i;
    player.chronicle.splice(idx, 1);
  }
}

function recordBook(universe, tour) {
  universe.recordBook ??= {};
  universe.recordBook[tour] ??= { youngestMajor: null, oldestMajor: null, mostMajors: null, longestStreak: null, mostWeeksNo1: null };
  return universe.recordBook[tour];
}

function lookup(universe, tour, id) {
  return universe.players?.[tour]?.find(p => p.id === id) || universe.juniors?.[tour]?.find(p => p.id === id) || universe.retiredPlayers?.[tour]?.find(p => p.id === id) || universe.doublesPlayers?.[tour]?.find(p => p.id === id) || null;
}

function isNotable(player, universe) {
  return (player.ranking || 999) <= 30 || (player.career?.majors || 0) > 0 || (universe.followedPlayerIds || []).includes(player.id);
}

// ---------------------------------------------------------------------------
// Event narratives — called after every completed singles event
// ---------------------------------------------------------------------------
export function eventNarratives(universe, edition, event) {
  if (!edition?.championId) return;
  const tour = event.tour;
  const champion = lookup(universe, tour, edition.championId);
  const finalist = lookup(universe, tour, edition.finalistId);
  if (!champion) return;
  const level = event.level;
  const isMajor = level === 'Grand Slam';
  const big = BIG.has(level);
  const meta = { tour, playerIds: [champion.id, finalist?.id].filter(Boolean) };
  const entryRank = id => edition.entryMeta?.find(m => m.id === id)?.effectiveRank || lookup(universe, tour, id)?.ranking || 999;
  const entryType = id => edition.entryMeta?.find(m => m.id === id)?.type || 'Direct';
  const final = (edition.matches || []).find(m => m.round === 'F');
  const champRank = entryRank(champion.id);
  const titles = champion.career.titles || 0;
  const majors = champion.career.majors || 0;
  const log = champion.career.titleLog || [];
  const prevTitle = log.length >= 2 ? log[log.length - 2] : null;
  const angles = []; // [importanceBoost, sentence]

  // --- Who is this champion? --------------------------------------------------
  if (titles === 1) angles.push([isMajor ? 2 : big ? 1 : 0, vary([`It is the first title of ${his(champion)} career.`, `A maiden tour title — the first trophy of ${his(champion)} career.`, `${cap(he(champion))} had never lifted a tour trophy before this week.`], champion.id)]);
  if (prevTitle && event.year - prevTitle.year >= 2) angles.push([2, `${cap(his(champion))} first title since ${prevTitle.event} ${prevTitle.year} — a drought of ${event.year - prevTitle.year} years is over.`]);
  if (['Qualifier', 'Wild card', 'Junior exemption'].includes(entryType(champion.id))) angles.push([3, `${cap(he(champion))} entered as a ${entryType(champion.id).toLowerCase()} and never stopped winning.`]);
  else if (big && champRank >= 40) angles.push([2, `Ranked No. ${champRank} at the start of the week, ${he(champion)} beat the field from far outside the elite.`]);
  const seasons = (champion.career.seasons || []).filter(s => (s.endRanking || 999) < 999);
  const twoAgo = seasons.find(s => s.year === event.year - 2) || seasons.find(s => s.year === event.year - 1);
  if (big && twoAgo && twoAgo.endRanking >= 100 && champion.age >= 22) angles.push([3, `Only ${event.year - twoAgo.year === 1 ? 'a year' : 'two years'} ago ${he(champion)} finished the season at No. ${twoAgo.endRanking}.`]);
  const lastLong = champion.lastLongInjury;
  if (lastLong && abs(event.year, event.week) - abs(lastLong.returnYear || lastLong.year, lastLong.returnWeek || lastLong.week) <= 52) angles.push([3, `Less than a year ago ${he(champion)} was sidelined for ${lastLong.weeks} weeks with a ${lastLong.type}.`]);
  const lastSeason = seasons.find(s => s.year === event.year - 1);
  if (big && lastSeason && lastSeason.endRanking >= 45 && (champion.career.peakRanking || 999) <= 10 && seasons.some(s => s.year < event.year - 1 && s.endRanking <= 10)) angles.push([3, `Last year ${he(champion)} slid to No. ${lastSeason.endRanking}; this is a former top-ten player clawing ${his(champion)} way back.`]);
  if ((isMajor || level === 'Olympics') && champion.age <= 20) angles.push([2, `At ${champion.age}, ${he(champion)} is one of the youngest champions the sport has seen.`]);
  if (big && champion.age >= 32) angles.push([2, `At ${champion.age}, ${he(champion)} is rewriting what a veteran can do.`]);
  if (isMajor && ['Rare', 'Uncommon', 'Common'].includes(champion.rarity)) angles.push([2, vary(['Nobody had this name on a Grand Slam trophy in their predictions.', 'Few saw a major champion in this player a few seasons ago.', 'Talent scouts once rated this player as a solid professional — nothing more.'], champion.id + event.year)]);
  if ((champion.breakthroughs || []).length && big) angles.push([1, `The transformation began with ${champion.breakthroughs.at(-1).cause}.`]);
  if (final?.tags?.includes('two sets down')) angles.push([2, 'The final turned after two sets down — a comeback for the ages.']);
  else if (final?.tags?.includes('saved match points')) angles.push([2, 'Match points were saved along the way.']);
  if (champion.country === event.country && big) angles.push([2, `${cap(he(champion))} did it in front of a home crowd.`]);

  // --- Defending champion ------------------------------------------------------
  const prevEdition = (universe.tournamentEditions || []).find(e => e.event?.tour === tour && e.event?.name === event.name && e.event?.year === event.year - 1);
  if (prevEdition?.championId) {
    if (prevEdition.championId === champion.id) {
      let streak = 1;
      for (let y = event.year - 1; ; y -= 1) { if (log.some(t => t.event === event.name && t.year === y)) streak += 1; else break; }
      angles.push([streak >= 3 ? 2 : 1, streak >= 3 ? `That is ${words(streak)} in a row here.` : 'A successful title defence.']);
    } else if (big) {
      const exit = (edition.matches || []).find(m => m.loserId === prevEdition.championId);
      const holder = lookup(universe, tour, prevEdition.championId);
      if (exit && holder && ROUND_ORDER[exit.round] <= 3) story(universe, 'Upset', `Defending champion ${fullName(holder)} out early at ${event.name}`, `The ${event.year - 1} champion fell in the ${ROUND_LABEL[exit.round]} (${exit.score}), leaving ${level === 'Grand Slam' ? '2,000' : 'a big chunk of'} title points unprotected.`, isMajor ? 4 : 3, event.week, { tour, playerIds: [holder.id, exit.winnerId] });
    }
  }

  // --- Majors: maiden, nearly-man, career slam, records ------------------------
  if (isMajor) {
    const uniqueMajors = new Set(log.filter(t => t.level === 'Grand Slam').map(t => t.event));
    const lostFinals = champion.career.majorFinalsLost || 0;
    if (majors === 1 && lostFinals >= 2) angles.push([3, `${cap(he(champion))} had lost ${words(lostFinals)} Grand Slam finals before. Not this time.`]);
    if (uniqueMajors.size === 4 && !champion.career.careerSlam) { champion.career.careerSlam = { year: event.year, event: event.name }; angles.push([3, 'The win completes the Career Grand Slam.']); chronicle(champion, universe, 'record', `Completed the Career Grand Slam at ${event.name}`, 5, event.week); }
    const seasonMajors = (universe.tournamentEditions || []).filter(e => e.event?.tour === tour && e.event?.year === event.year && e.event?.level === 'Grand Slam');
    if (seasonMajors.length >= 2 && seasonMajors.every(e => e.championId === champion.id)) {
      if (seasonMajors.length === 4) angles.push([5, 'THE CALENDAR GRAND SLAM. All four majors in one season.']);
      else angles.push([2, `${words(seasonMajors.length)} for ${words(seasonMajors.length)} at the majors this year — Calendar Slam talk is now unavoidable.`]);
    }
    const rb = recordBook(universe, tour);
    if (!rb.youngestMajor || champion.age < rb.youngestMajor.age) { if (rb.youngestMajor) angles.push([2, `${cap(he(champion))} becomes the youngest major champion in the Chronicle’s history.`]); rb.youngestMajor = { age: champion.age, id: champion.id, name: fullName(champion), event: event.name, year: event.year }; }
    if (!rb.oldestMajor || champion.age > rb.oldestMajor.age) { if (rb.oldestMajor) angles.push([2, `${cap(he(champion))} becomes the oldest major champion in the Chronicle’s history.`]); rb.oldestMajor = { age: champion.age, id: champion.id, name: fullName(champion), event: event.name, year: event.year }; }
    const otherBest = [...(universe.players?.[tour] || []), ...(universe.retiredPlayers?.[tour] || [])].filter(p => p.id !== champion.id).reduce((m, p) => Math.max(m, p.career?.majors || 0), 0);
    if (majors >= 5 && majors === otherBest + 1) { angles.push([3, `${words(majors)} majors: an outright record.`]); story(universe, 'Record watch', `${fullName(champion)} stands alone: ${majors} Grand Slam titles`, `No player in this universe has won more. ${cap(he(champion))} broke the record at ${event.name}.`, 5, event.week, meta); chronicle(champion, universe, 'record', `Broke the all-time record with major No. ${majors}`, 5, event.week); }
    else if (majors >= 5 && majors === otherBest) angles.push([2, `${cap(he(champion))} draws level with the all-time record of ${majors} majors.`]);
    if (majors === 1) {
      champion.career.firstMajor = { year: event.year, event: event.name, age: champion.age, rank: champRank };
      chronicle(champion, universe, 'major', `Maiden Grand Slam title at ${event.name} (aged ${champion.age}, ranked No. ${champRank})`, 5, event.week);
    } else chronicle(champion, universe, 'major', `Grand Slam No. ${majors}: ${event.name}`, 4, event.week);
    if (finalist) {
      const fl = finalist.career.majorFinalsLost || 0;
      if (fl >= 3 && (finalist.career.majors || 0) === 0) story(universe, 'Heartbreak', `${ORDINAL(fl)} major final, ${ORDINAL(fl)} defeat for ${fullName(finalist)}`, `${fullName(finalist)} is now ${fl} for 0 in Grand Slam finals. The question is no longer whether ${he(finalist)} can reach them.`, 4, event.week, { tour, playerIds: [finalist.id] });
      chronicle(finalist, universe, 'final', `Runner-up at ${event.name}`, 3, event.week);
    }
  } else if (big) {
    chronicle(champion, universe, 'title', `${level === '1000' ? 'Masters' : level} title: ${event.name}`, 3, event.week);
  } else if (titles === 1) {
    chronicle(champion, universe, 'title', `First tour title at ${event.name}`, 3, event.week);
  }
  if (titles === 1 && !big) champion.career.firstTitle = { year: event.year, event: event.name, age: champion.age };

  // --- Rivalry framing ---------------------------------------------------------
  if (finalist) {
    const rivalry = rivalryForPair(universe, champion.id, finalist.id, { includeCandidate: false });
    if (rivalry && rivalry.meetings >= 5) {
      const asA = rivalry.playerAId === champion.id;
      const w = asA ? rivalry.winsA : rivalry.winsB, l = asA ? rivalry.winsB : rivalry.winsA;
      const identity = rivalryIdentity(rivalry);
      angles.push([1, `It was meeting No. ${rivalry.meetings} between them (${w}-${l} now)${['era', 'classic', 'nemesis', 'guard'].includes(identity.key) ? ` — ${identity.label.toLowerCase()} territory` : ''}.`]);
    }
  }

  // --- Compose the champion story ---------------------------------------------
  const boost = angles.reduce((m, a) => Math.max(m, a[0]), 0);
  const base = isMajor ? 4 : level === 'Olympics' || level === 'Finals' ? 4 : level === '1000' ? 3 : level === '500' ? 2 : 1;
  const importance = Math.min(5, isMajor && (majors === 1 || boost >= 2) ? 5 : base + (boost >= 3 ? 1 : 0));
  const sentences = angles.sort((a, b) => b[0] - a[0]).slice(0, 3).map(a => a[1]);
  const fname = finalist ? fullName(finalist) : 'the finalist';
  const setScores = (final?.score || '').split(' ').filter(Boolean).map(x => x.split('-').map(Number));
  const droppedSet = setScores.some(([w, l]) => w < l);
  const gamesLost = setScores.reduce((sum, [, l]) => sum + (l || 0), 0);
  const verb = final?.tags?.includes('deciding set') || final?.durationMinutes >= 200 ? vary(['outlasts', 'survives', 'edges', 'wears down'], event.id + champion.id)
    : !droppedSet && gamesLost <= 5 ? vary(['crushes', 'dismantles', 'overwhelms', 'routs'], event.id + champion.id)
    : droppedSet ? vary(['overcomes', 'recovers to beat', 'battles past'], event.id + champion.id)
    : vary(['defeats', 'beats', 'sees off', 'downs'], event.id + champion.id);
  let headline;
  if (isMajor && majors === 1) headline = vary([`${fullName(champion)} is a Grand Slam champion`, `Maiden major for ${fullName(champion)} at ${event.name}`, `${fullName(champion)} conquers ${event.name} for a first major`], event.id);
  else if (isMajor) headline = `${fullName(champion)} wins ${event.name} — major No. ${majors}`;
  else if (['Qualifier', 'Wild card'].includes(entryType(champion.id)) && big) headline = `From ${entryType(champion.id).toLowerCase()} to champion: ${fullName(champion)} takes ${event.name}`;
  else if (titles === 1) headline = `${fullName(champion)} lifts a first career title in ${event.location || event.name}`;
  else headline = `${fullName(champion)} ${verb} ${fname} to win ${event.name}`;
  const opener = `${fullName(champion)} ${verb} ${fname}${final?.score ? ` ${final.score}` : ''} in the ${event.surface.toLowerCase()}-court final.`;
  if (importance >= 2 || isNotable(champion, universe)) story(universe, 'Champions', headline, [opener, ...sentences].join(' '), importance, event.week, meta);

  // --- Cinderella runs, giant-killers, marathons --------------------------------
  if (big) {
    const runs = new Map();
    for (const m of edition.matches || []) { const prev = runs.get(m.winnerId) || 0; runs.set(m.winnerId, Math.max(prev, ROUND_ORDER[m.round] || 0)); }
    const cinderellas = (edition.entryIds || []).filter(id => id !== champion.id && id !== finalist?.id).map(id => {
      const exit = (edition.matches || []).find(m => m.loserId === id);
      return { id, exitRound: exit?.round, rank: entryRank(id), type: entryType(id), exit };
    }).filter(r => r.exitRound && ROUND_ORDER[r.exitRound] >= (isMajor ? 5 : 6) && (['Qualifier', 'Wild card', 'Junior exemption'].includes(r.type) || r.rank >= 60))
      .sort((a, b) => ROUND_ORDER[b.exitRound] - ROUND_ORDER[a.exitRound] || b.rank - a.rank);
    // Finalist from nowhere counts as Cinderella too
    if (finalist && (['Qualifier', 'Wild card'].includes(entryType(finalist.id)) || entryRank(finalist.id) >= 60)) cinderellas.unshift({ id: finalist.id, exitRound: 'F', rank: entryRank(finalist.id), type: entryType(finalist.id) });
    const c = cinderellas[0];
    const p = c && lookup(universe, tour, c.id);
    if (p) {
      const label = ['Qualifier', 'Wild card', 'Junior exemption'].includes(c.type) ? `a ${c.type.toLowerCase()}` : `the world No. ${c.rank}`;
      story(universe, 'Cinderella', vary([`${fullName(p)}’s dream run reaches the ${ROUND_LABEL[c.exitRound]}`, `The fairy tale of ${event.name}: ${fullName(p)}`, `${fullName(p)} gate-crashes the ${ROUND_LABEL[c.exitRound]} at ${event.name}`], p.id + event.id),
        `Arriving as ${label}, ${fullName(p)} reached the ${ROUND_LABEL[c.exitRound]} before ${c.exitRound === 'F' ? `falling to ${fullName(champion)} in the final` : 'the run finally ended'}. ${(p.age || 0) <= 21 ? `At ${p.age}, it may be the start of something.` : (p.age || 0) >= 29 ? `At ${p.age}, it is the week of a career.` : 'The ranking jump will change ' + his(p) + ' schedule.'}`,
        isMajor ? 4 : 3, event.week, { tour, playerIds: [p.id] });
      chronicle(p, universe, 'run', `${isMajor ? 'Grand Slam' : level} ${ROUND_LABEL[c.exitRound]} as ${label} at ${event.name}`, isMajor ? 4 : 3, event.week);
    }
    const giantKill = (edition.matches || []).filter(m => entryRank(m.loserId) <= 2 && entryRank(m.winnerId) >= 35 && m.winnerId !== champion.id).sort((a, b) => entryRank(b.winnerId) - entryRank(a.winnerId))[0];
    if (giantKill) {
      const w = lookup(universe, tour, giantKill.winnerId), l = lookup(universe, tour, giantKill.loserId);
      if (w && l) { story(universe, 'Upset', `Shock at ${event.name}: No. ${entryRank(w.id)} ${fullName(w)} topples No. ${entryRank(l.id)} ${fullName(l)}`, `${giantKill.score} in the ${ROUND_LABEL[giantKill.round]}. ${giantKill.explanation ? cap(giantKill.explanation) + ' made the difference.' : ''}`, isMajor ? 4 : 3, event.week, { tour, playerIds: [w.id, l.id] }); chronicle(w, universe, 'upset', `Beat world No. ${entryRank(l.id)} ${fullName(l)} at ${event.name}`, 3, event.week); }
    }
    if (isMajor) {
      const epic = (edition.matches || []).filter(m => m.durationMinutes >= 270 || m.tags?.includes('two sets down') && ROUND_ORDER[m.round] >= 4).sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
      if (epic && epic.round !== 'F') {
        const w = lookup(universe, tour, epic.winnerId), l = lookup(universe, tour, epic.loserId);
        if (w && l) story(universe, 'Epic', epic.tags?.includes('two sets down') ? `${fullName(w)} comes back from two sets down against ${fullName(l)}` : `${Math.floor(epic.durationMinutes / 60)}h ${epic.durationMinutes % 60}m: ${fullName(w)} survives ${fullName(l)}`, `${epic.score} in the ${ROUND_LABEL[epic.round]} of ${event.name}.`, 3, event.week, { tour, playerIds: [w.id, l.id] });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rivalry narratives — fed by rivalries.js through universe.pendingRivalryEvents
// ---------------------------------------------------------------------------
export function rivalryNarratives(universe) {
  const queue = universe.pendingRivalryEvents || [];
  universe.pendingRivalryEvents = [];
  const seen = new Set();
  for (const ev of queue) {
    if (seen.has(ev.key + ev.type)) continue; seen.add(ev.key + ev.type);
    const row = universe.rivalries?.[ev.key]; if (!row) continue;
    const w = lookup(universe, ev.tour, ev.winnerId), l = lookup(universe, ev.tour, ev.loserId); if (!w || !l) continue;
    const asA = row.playerAId === w.id, ww = asA ? row.winsA : row.winsB, lw = asA ? row.winsB : row.winsA;
    const meta = { tour: ev.tour, playerIds: [w.id, l.id] };
    const big = ev.level === 'Grand Slam' ? 1 : 0;
    if (ev.type === 'lead-flip') { story(universe, 'Rivalries', `${fullName(w)} takes the lead over ${fullName(l)} for the first time${row.leadChanges > 1 ? ' in years' : ''}`, `The ${ev.round} at ${ev.eventName} (${ev.score}) moves the head-to-head to ${ww}-${lw} after ${row.meetings} meetings.`, 3 + big, ev.week, meta); chronicle(w, universe, 'rivalry', `Took the H2H lead over ${fullName(l)} (${ww}-${lw})`, 3, ev.week); }
    else if (ev.type === 'streak-broken') { story(universe, 'Rivalries', `${fullName(w)} finally beats ${fullName(l)}`, `${ev.brokenCount} straight defeats in the rivalry end in the ${ROUND_LABEL[ev.round] || ev.round} at ${ev.eventName}, ${ev.score}. Head-to-head: ${ww}-${lw}.`, 3 + big, ev.week, meta); chronicle(w, universe, 'rivalry', `Ended a ${ev.brokenCount}-match losing streak against ${fullName(l)}`, 3, ev.week); }
    else if (ev.type === 'streak-extended') story(universe, 'Rivalries', `${fullName(w)} owns ${fullName(l)}: ${ev.count} in a row`, `Another win at ${ev.eventName}. Head-to-head ${ww}-${lw}.`, 2 + big, ev.week, meta);
    else if (ev.type === 'milestone') story(universe, 'Rivalries', `${fullName(w)} vs ${fullName(l)}: meeting No. ${row.meetings}`, `${fullName(w)} won this one at ${ev.eventName}; the rivalry stands ${ww}-${lw}${row.majorFinals ? ` with ${row.majorFinals} Grand Slam final${row.majorFinals > 1 ? 's' : ''}` : ''}.`, 2 + big, ev.week, meta);
    else if (ev.type === 'born') {
      const c = ev.check || row.ignitedAt || {};
      story(universe, 'Rivalries', `A rivalry is born: ${fullName(w)} vs ${fullName(l)}`, `${c.clashes || 3} big-stage clashes in barely a year — ${c.finals || 2} of them finals — and both have drawn blood (${Math.max(c.winsA || 0, c.winsB || 0)}-${Math.min(c.winsA || 0, c.winsB || 0)}). The latest: the ${ROUND_LABEL[ev.round] || ev.round} at ${ev.eventName}, ${ev.score}. From now on, every meeting is part of the feud.`, 4 + big, ev.week, meta);
      chronicle(w, universe, 'rivalry', `Rivalry with ${fullName(l)} ignites at ${ev.eventName}`, 4, ev.week); chronicle(l, universe, 'rivalry', `Rivalry with ${fullName(w)} ignites at ${ev.eventName}`, 4, ev.week);
    }
    else if (ev.type === 'final-chapter') { const f = row.feud || {}; const fw = asA ? f.winsA : f.winsB, fl = asA ? f.winsB : f.winsA; story(universe, 'Rivalries', `${fullName(w)} wins the latest chapter against ${fullName(l)}`, `${ev.level === 'Grand Slam' ? 'A Grand Slam final' : `The ${ev.eventName} final`}, ${ev.score}. Since the rivalry ignited: ${fw}-${fl}. Career head-to-head: ${ww}-${lw}.`, 3 + big, ev.week, meta); }
    else if (ev.type === 'ended') {
      const gone = (ev.retiredIds || []).map(id => lookup(universe, ev.tour, id)).filter(Boolean);
      const since = row.ignitedAt ? universe.year - row.ignitedAt.year : 0;
      story(universe, 'Rivalries', `End of an era: ${fullName(w)} vs ${fullName(l)} is over`, `${gone.length ? gone.map(fullName).join(' and ') + (gone.length > 1 ? ' have' : ' has') + ' left the tour' : 'One of them has left the tour'}. ${since ? `The feud lasted ${since} season${since > 1 ? 's' : ''}; ` : ''}final career head-to-head ${row.winsA}-${row.winsB} (${fullName(lookup(universe, ev.tour, row.playerAId) || w)} first), with ${row.majorFinals || 0} Grand Slam final${row.majorFinals === 1 ? '' : 's'}.`, 4, ev.week, meta);
    }
    else if (ev.type === 'identity') story(universe, 'Rivalries', `${fullName(w)}–${fullName(l)} is now ${/^[AEIOU]/.test(ev.identity) ? 'an' : 'a'} ${ev.identity.toLowerCase()} rivalry`, `${row.meetings} meetings, ${row.majors || 0} at the majors, ${row.finals || 0} finals. Current standing ${ww}-${lw}.`, 3, ev.week, meta);
  }
}

// ---------------------------------------------------------------------------
// Weekly narratives — ranking landmarks
// ---------------------------------------------------------------------------
export function weeklyNarratives(universe, tour, beforeRanks, beforeNo1Id) {
  const players = universe.players[tour] || [];
  const now = abs(universe.year, universe.week);
  const no1 = players[0];
  if (no1 && beforeNo1Id && no1.id !== beforeNo1Id) {
    const old = lookup(universe, tour, beforeNo1Id);
    const first = (no1.career.weeksNo1 || 0) === 0;
    const swap = !first && no1.career.lastNo1Abs && now - no1.career.lastNo1Abs <= 10;
    story(universe, 'World No. 1', first ? `${fullName(no1)} is the new world No. 1` : `${fullName(no1)} back on top of the ${tour} rankings`,
      first ? `${cap(he(no1))} replaces ${old ? fullName(old) : 'the previous leader'} at the summit${no1.age <= 21 ? ` at just ${no1.age}` : ''}. ${(no1.career.seasons || []).some(s => s.endRanking >= 100) ? `This is a player who once sat outside the top 100.` : ''}`.trim()
        : `${cap(he(no1))} reclaims No. 1 from ${old ? fullName(old) : 'the previous leader'}.`, first ? 5 : swap ? 2 : 3, universe.week, { tour, playerIds: [no1.id, beforeNo1Id] });
    if (!swap) chronicle(no1, universe, 'ranking', first ? `Became world No. 1 for the first time` : `Returned to world No. 1`, first ? 5 : 3);
  }
  if (no1) no1.career.lastNo1Abs = now;
  for (const p of players.slice(0, 10)) {
    p.career.firstTop10 ??= null;
    if (!p.career.firstTop10) {
      p.career.firstTop10 = { year: universe.year, week: universe.week, age: p.age };
      if (now - abs(universe.startYear || universe.year, 1) > 6) {
        story(universe, 'Rankings', `${fullName(p)} breaks into the top 10`, `${cap(he(p))} rises to No. ${p.ranking}${p.age >= 27 ? ` at ${p.age} — a late arrival among the elite` : p.age <= 20 ? ` at only ${p.age}` : ''}. ${(p.career.seasons || []).length && Math.max(...p.career.seasons.map(s => s.endRanking || 0).filter(x => x < 999)) >= 150 ? 'Not long ago ' + he(p) + ' was outside the top 150.' : ''}`.trim(), 3, universe.week, { tour, playerIds: [p.id] });
        chronicle(p, universe, 'ranking', `Entered the top 10 for the first time (No. ${p.ranking})`, 4);
      }
    } else if (p.career.lastTop10Abs && now - p.career.lastTop10Abs >= 52) {
      const yrs = Math.round((now - p.career.lastTop10Abs) / 52);
      story(universe, 'Comebacks', `${fullName(p)} returns to the top 10`, `${cap(he(p))} is back at No. ${p.ranking} after ${yrs > 1 ? `${yrs} years` : 'more than a year'} away from the elite.`, 3, universe.week, { tour, playerIds: [p.id] });
      chronicle(p, universe, 'comeback', `Back in the top 10 after ${yrs > 1 ? `${yrs} years` : 'a year'} away`, 4);
    }
    p.career.lastTop10Abs = now;
  }
  const movers = players.map(p => ({ p, diff: (beforeRanks.get(p.id) || p.ranking) - p.ranking })).filter(r => r.p.ranking <= 40 && r.diff >= 12).sort((a, b) => b.diff - a.diff);
  if (movers[0]) story(universe, 'Rankings', `${fullName(movers[0].p)} surges to No. ${movers[0].p.ranking}`, `A jump of ${movers[0].diff} places in one week.`, 2, universe.week, { tour, playerIds: [movers[0].p.id] });
  // Win streak landmark
  for (const p of players.slice(0, 60)) {
    const s = p.career.currentWinStreak || 0;
    if ([20, 30, 40, 50].includes(s) && p.career.lastStreakStory !== s) {
      p.career.lastStreakStory = s;
      const rb = recordBook(universe, tour);
      const record = !rb.longestStreak || s > rb.longestStreak.count;
      story(universe, 'Streaks', `${fullName(p)} has now won ${s} straight matches`, record ? 'It is the longest winning run the Chronicle has recorded.' : 'The run has turned every draw into a referendum on who can stop it.', s >= 30 ? 4 : 3, universe.week, { tour, playerIds: [p.id] });
      if (s >= 20) chronicle(p, universe, 'streak', `${s}-match winning streak`, s >= 30 ? 4 : 3);
    }
    if (s && (!recordBook(universe, tour).longestStreak || s > recordBook(universe, tour).longestStreak.count)) recordBook(universe, tour).longestStreak = { count: s, id: p.id, name: fullName(p), year: universe.year };
  }
}

export function injuryNarrative(universe, player, injury) {
  if (!injury) return;
  const rank = player.ranking || 999;
  const notable = (rank <= 10 && injury.weeks >= 3) || (rank <= 30 && injury.weeks >= 6) || (rank <= 100 && injury.weeks >= 16) || ((player.career?.majors || 0) > 0 && injury.weeks >= 4) || (universe.followedPlayerIds || []).includes(player.id);
  chronicle(player, universe, 'injury', `${injury.weeks}-week layoff (${injury.type})`, injury.weeks >= 20 ? 4 : injury.weeks >= 10 ? 3 : 1);
  if (!notable) return;
  const imp = injury.careerThreatening ? 5 : injury.weeks >= 12 ? 4 : player.ranking <= 5 ? 3 : 2;
  story(universe, 'Injuries', injury.careerThreatening ? `Career in doubt: ${fullName(player)} faces months out` : `${fullName(player)} sidelined by ${injury.type}`,
    injury.careerThreatening ? `A ${injury.type} will keep the world No. ${player.ranking} out for around ${injury.weeks} weeks. ${player.age >= 29 ? 'At ' + player.age + ', the road back will be long.' : 'The comeback starts now.'}` : `Expected to miss about ${injury.weeks} weeks${injury.severe ? ', putting the season at risk' : ''}.`, imp, universe.week, { tour: player.tour, playerIds: [player.id] });
}

export function returnFromInjuryNarrative(universe, player) {
  const inj = player.lastLongInjury; if (!inj || inj.weeks < 12) return;
  if (!isNotable(player, universe) && (player.career?.peakRanking || 999) > 20) return;
  story(universe, 'Comebacks', `${fullName(player)} is back`, `After ${inj.weeks} weeks out with a ${inj.type}, ${he(player)} returns to the tour${player.ranking > 50 ? ` ranked No. ${player.ranking}` : ''}.`, 3, universe.week, { tour: player.tour, playerIds: [player.id] });
}

// ---------------------------------------------------------------------------
// Year-end narratives
// ---------------------------------------------------------------------------
export function seasonArcNarratives(universe, tour) {
  const players = universe.players[tour] || [];
  const out = {};
  const meta = p => ({ tour, playerIds: [p.id] });
  const breakthrough = players.filter(p => p.ranking <= 20 && (p.season.startRanking || 999) >= 45).sort((a, b) => (b.season.startRanking - b.ranking) - (a.season.startRanking - a.ranking))[0];
  if (breakthrough) {
    out.breakthrough = breakthrough;
    story(universe, 'Season review', `${tour} breakthrough of the year: ${fullName(breakthrough)}`, `From No. ${breakthrough.season.startRanking} in January to No. ${breakthrough.ranking} in December${breakthrough.season.titles ? `, with ${breakthrough.season.titles} title${breakthrough.season.titles > 1 ? 's' : ''}` : ''}.`, 4, 52, meta(breakthrough));
    chronicle(breakthrough, universe, 'season', `Breakthrough season: No. ${breakthrough.season.startRanking} → No. ${breakthrough.ranking}`, 4, 52);
  }
  const comeback = players.filter(p => {
    const seasons = (p.career.seasons || []).filter(s => s.endRanking < 999);
    const last = seasons.at(-1);
    const wasElite = seasons.slice(0, -1).some(s => s.endRanking <= 10) || (p.career.peakRanking || 999) <= 10;
    const injured = p.lastLongInjury && p.lastLongInjury.year >= universe.year - 1;
    return p.ranking <= 15 && ((last && last.endRanking >= 40 && wasElite) || injured && last && last.endRanking >= 30);
  }).sort((a, b) => a.ranking - b.ranking)[0];
  if (comeback) {
    out.comeback = comeback;
    const last = (comeback.career.seasons || []).filter(s => s.endRanking < 999).at(-1);
    story(universe, 'Comebacks', `${tour} comeback of the year: ${fullName(comeback)}`, `${last ? `Finished last season at No. ${last.endRanking}` : 'Written off a year ago'}; ends this one at No. ${comeback.ranking}${comeback.season.majors ? ` with ${comeback.season.majors} major${comeback.season.majors > 1 ? 's' : ''}` : ''}.`, 4, 52, meta(comeback));
    chronicle(comeback, universe, 'comeback', `Comeback season: back to No. ${comeback.ranking}`, 4, 52);
  }
  const fall = players.filter(p => (p.season.startRanking || 999) <= 5 && p.ranking >= 30 && !(p.injury?.weeksRemaining > 0)).sort((a, b) => b.ranking - a.ranking)[0];
  if (fall) { out.fall = fall; story(universe, 'Season review', `The fall of ${fullName(fall)}`, `Top five in January, No. ${fall.ranking} in December. ${fall.seasonFormLabel === 'Lost season' ? 'A lost season with no obvious explanation.' : 'The tour has noticed.'}`, 3, 52, meta(fall)); chronicle(fall, universe, 'season', `Difficult season: No. ${fall.season.startRanking} → No. ${fall.ranking}`, 3, 52); }
  const dominant = players.filter(p => (p.season.majors || 0) >= 3)[0];
  if (dominant) chronicle(dominant, universe, 'season', `${dominant.season.majors}-major season`, 5, 52);
  for (const p of players.slice(0, 100)) if ((p.season.titles || 0) >= 6 && !p.chronicle?.some(c => c.year === universe.year && c.type === 'season')) chronicle(p, universe, 'season', `${p.season.titles}-title season (${p.season.wins}-${p.season.losses})`, 4, 52);
  return out;
}

export function farewellNarratives(universe, retiredRows) {
  for (const row of retiredRows) {
    const p = lookup(universe, row.tour, row.id); if (!p || p.doublesSpecialist || p.careerType === 'doubles') continue;
    const c = p.career || {};
    if (!((c.majors || 0) >= 1 || (c.peakRanking || 999) <= 5 || (c.titles || 0) >= 12 || (universe.followedPlayerIds || []).includes(p.id))) continue;
    const arcs = careerArcs(p);
    const label = arcs[0]?.label;
    const parts = [];
    if (c.majors) parts.push(`${c.majors} Grand Slam title${c.majors > 1 ? 's' : ''}`);
    if (c.titles) parts.push(`${c.titles} titles`);
    if (c.weeksNo1) parts.push(`${c.weeksNo1} weeks at No. 1`);
    else if (c.peakRanking < 999) parts.push(`a career-high of No. ${c.peakRanking}`);
    const head = (c.majors || 0) >= 6 ? `A legend leaves: ${fullName(p)} retires` : label === 'One-Slam wonder' ? `${fullName(p)}, the champion of ${c.firstMajor?.event || 'one magical fortnight'} ${c.firstMajor?.year || ''}, retires`.replace(/\s+,/, ',') : `${fullName(p)} calls time on ${his(p)} career`;
    story(universe, 'Retirements', head, `${cap(he(p))} leaves at ${p.age} with ${parts.join(', ')}${label ? `. Remembered as: ${label.toLowerCase()}` : ''}.`, (c.majors || 0) >= 3 ? 5 : 4, 1, { tour: row.tour, playerIds: [p.id] });
    chronicle(p, universe, 'retirement', `Retired at ${p.age}`, 4, 1);
  }
}

export function breakthroughNarrative(universe, player, info) {
  chronicle(player, universe, 'development', `Off-season leap: ${info.cause} (ceiling ${info.from} → ${info.to})`, 3, 1);
  if ((player.ranking || 999) <= 100 || info.gain >= 5.5 || (universe.followedPlayerIds || []).includes(player.id)) story(universe, 'Development', `${fullName(player)} returns transformed`, `After ${info.cause}, insiders say the ${player.age}-year-old No. ${player.ranking} is hitting the ball like a different player.`, info.gain >= 5 ? 3 : 2, 1, { tour: player.tour, playerIds: [player.id] });
}

// ---------------------------------------------------------------------------
// Career arcs — classification for the player page and retirement stories
// ---------------------------------------------------------------------------
export function careerArcs(player) {
  const c = player.career || {};
  const seasons = (c.seasons || []).filter(s => (s.endRanking || 999) < 999);
  const ends = seasons.map(s => s.endRanking);
  const arcs = [];
  const majors = c.majors || 0;
  // "Humble beginnings" = stuck deep in the rankings as an adult, not just a teenager climbing.
  const adultLows = seasons.filter(s => (s.year - (player.birthYear || s.year - 25)) >= 21).map(s => s.endRanking);
  const worstEarly = adultLows.length ? Math.max(...adultLows.slice(0, 4)) : 0;
  if (majors >= 10) arcs.push({ key: 'titan', label: 'All-time great', blurb: `${majors} majors. An era carries this name.` });
  else if (majors >= 4) arcs.push({ key: 'champion', label: 'Multiple major champion', blurb: `${majors} majors and a permanent place in the history books.` });
  if ((worstEarly >= 150 || (c.firstMajor && c.firstMajor.rank >= 50)) && ((c.peakRanking || 999) <= 10 || majors >= 1)) arcs.push({ key: 'rags', label: 'Rags to riches', blurb: `Once ranked No. ${worstEarly < 999 ? worstEarly : c.firstMajor?.rank}; rose to ${majors ? 'major champion' : `No. ${c.peakRanking}`}.` });
  if ((player.breakthroughs || []).length && ((c.peakRanking || 999) <= 20 || majors)) arcs.push({ key: 'selfmade', label: 'Self-made', blurb: `Outgrew a ${player.rarity.toLowerCase()} talent label through ${player.breakthroughs[0].cause}.` });
  for (let i = 0; i < ends.length; i += 1) for (let j = i + 1; j < ends.length; j += 1) if (ends[i] <= 12 && ends[j] >= 40 && ends.slice(j + 1).some(x => x <= 12)) { arcs.push({ key: 'comeback', label: 'Comeback story', blurb: `Fell to No. ${ends[j]} and fought back to the elite.` }); i = j = 999; }
  if (majors === 1 && (c.titles || 0) <= 5) arcs.push({ key: 'onetime', label: 'One-Slam wonder', blurb: `${c.firstMajor ? `${c.firstMajor.event} ${c.firstMajor.year}` : 'One fortnight'} — the week everything clicked.` });
  if (!majors && (c.majorFinalsLost || 0) >= 2) arcs.push({ key: 'nearly', label: player.tour === 'WTA' ? 'The nearly woman' : 'The nearly man', blurb: `${c.majorFinalsLost} Grand Slam finals, no trophy.` });
  if (c.firstMajor && c.firstMajor.age <= 20) arcs.push({ key: 'phenom', label: 'Phenom', blurb: `Major champion at ${c.firstMajor.age}.` });
  if (c.firstTop10 && c.firstTop10.age >= 27) arcs.push({ key: 'late', label: 'Late bloomer', blurb: `Reached the top 10 for the first time at ${c.firstTop10.age}.` });
  if ((c.peakRanking || 999) <= 5 && player.status !== 'retired' && (player.ranking || 999) >= 50 && !(player.injury?.weeksRemaining > 0)) arcs.push({ key: 'fallen', label: 'Fallen star', blurb: `Former No. ${c.peakRanking}, now No. ${player.ranking}.` });
  if ((c.weeksNo1 || 0) >= 100) arcs.push({ key: 'ruler', label: 'Long-reigning No. 1', blurb: `${c.weeksNo1} weeks at the top.` });
  if (!arcs.length && seasons.length >= 8 && (c.peakRanking || 999) > 30) arcs.push({ key: 'journey', label: 'Journeyman', blurb: `${seasons.length} seasons on tour, career-high No. ${c.peakRanking}.` });
  return arcs;
}
