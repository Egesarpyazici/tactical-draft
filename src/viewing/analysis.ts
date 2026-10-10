import type { MatchState, TeamId } from '../engine/types';
import { localX } from '../engine/tactics';
export type Observation = {
  tick: number;
  team: TeamId;
  line: number;
  width: number;
  pressers: number;
  attackLane: number | null;
};
export function observe(s: MatchState): Observation[] {
  if (s.restart || s.phase !== 'playing') return [];
  return ([0, 1] as const).map((team) => {
    const ps = s.players.filter((p) => p.team === team && !p.keeper);
    const defenders = ps.filter((p) => p.role === 'CB');
    return {
      tick: s.tick,
      team,
      line: defenders.reduce((sum, p) => sum + localX(p.pos.x, team, s.half), 0) / defenders.length,
      width: Math.max(...ps.map((p) => p.pos.y)) - Math.min(...ps.map((p) => p.pos.y)),
      pressers: ps.filter((p) => p.action === 'press').length,
      attackLane:
        s.ball.owner && s.possession === team && localX(s.ball.pos.x, team, s.half) > 70
          ? Math.min(2, Math.floor(s.ball.pos.y / (68 / 3)))
          : null,
    };
  });
}
export function summarize(samples: Observation[], team: TeamId, from: number, to: number) {
  const rows = samples.filter((s) => s.team === team && s.tick > from && s.tick <= to);
  const mean = (key: 'line' | 'width' | 'pressers') =>
    rows.length ? rows.reduce((n, s) => n + s[key], 0) / rows.length : null;
  return {
    seconds: rows.length,
    line: mean('line'),
    width: mean('width'),
    pressers: mean('pressers'),
    lanes: [0, 1, 2].map((l) => rows.filter((r) => r.attackLane === l).length),
  };
}
