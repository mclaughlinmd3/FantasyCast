// Sleeper-only for now (see src/eventDetection.js for the same caveat on
// play-type labels): ESPN's raw per-category stats aren't extracted since
// its numeric stat-ID scheme isn't reliably known without live data to
// verify against. A missing/unrecognized stat key here just means that
// field is silently skipped, never a wrong number.

function round0(n) {
  return Math.round(n);
}

export function formatStatLine(player) {
  const s = player.rawStats;
  if (!s) return null;

  const touchdowns = round0((s.rec_td || 0) + (s.rush_td || 0) + (s.pass_td || 0));
  const parts = [];

  switch (player.position) {
    case 'QB':
      if (s.pass_yd) parts.push(`${round0(s.pass_yd)} YD`);
      if (s.pass_td) parts.push(`${round0(s.pass_td)} TD`);
      if (s.pass_int) parts.push(`${round0(s.pass_int)} INT`);
      if (!s.pass_yd && s.rush_yd) parts.push(`${round0(s.rush_yd)} RUSH YD`);
      break;
    case 'RB':
      if (s.rush_yd) parts.push(`${round0(s.rush_yd)} YD`);
      if (s.rec) parts.push(`${round0(s.rec)} REC`);
      if (touchdowns) parts.push(`${touchdowns} TD`);
      break;
    case 'WR':
    case 'TE':
      if (s.rec) parts.push(`${round0(s.rec)} REC`);
      if (s.rec_yd) parts.push(`${round0(s.rec_yd)} YD`);
      if (touchdowns) parts.push(`${touchdowns} TD`);
      break;
    case 'K':
      if (s.fg_made != null) parts.push(`${round0(s.fg_made)} FG`);
      if (s.xp_made != null) parts.push(`${round0(s.xp_made)} XP`);
      break;
    case 'DEF':
      if (s.sack) parts.push(`${round0(s.sack)} SACK`);
      if (s.int) parts.push(`${round0(s.int)} INT`);
      if (s.def_td) parts.push(`${round0(s.def_td)} TD`);
      break;
    default:
      if (touchdowns) parts.push(`${touchdowns} TD`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
