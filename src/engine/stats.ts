import type { MatchEvent, MatchState, PlayerStats, TeamStats } from './types';
export const emptyTeamStats = (): TeamStats => ({
  goals: 0,
  shots: 0,
  shotsOnTarget: 0,
  passes: 0,
  completedPasses: 0,
  tackles: 0,
  interceptions: 0,
  saves: 0,
  corners: 0,
  possessionTicks: 0,
});
export const emptyPlayerStats = (): PlayerStats => ({
  goals: 0,
  shots: 0,
  passes: 0,
  completedPasses: 0,
  tackles: 0,
  saves: 0,
  distance: 0,
  pressSeconds: 0,
});
/** Only observed events affect football counts; possession/distance integrate fixed ticks. */
export function record(s: MatchState, event: Omit<MatchEvent, 'id' | 'tick' | 'time'>) {
  s.events.push({ ...event, id: s.events.length, tick: s.tick, time: s.time });
  if (event.team === undefined) return;
  const t = s.stats[event.team],
    p = event.player ? s.playerStats[event.player] : undefined;
  switch (event.kind) {
    case 'goal':
      t.goals++;
      if (p) p.goals++;
      break;
    case 'shot':
      t.shots++;
      if (event.onTarget) t.shotsOnTarget++;
      if (p) p.shots++;
      break;
    case 'pass':
      t.passes++;
      if (p) p.passes++;
      break;
    case 'passComplete':
      t.completedPasses++;
      if (p) p.completedPasses++;
      break;
    case 'tackle':
      t.tackles++;
      if (p) p.tackles++;
      break;
    case 'interception':
      t.interceptions++;
      break;
    case 'save':
      t.saves++;
      if (p) p.saves++;
      break;
    case 'corner':
      t.corners++;
      break;
  }
}
