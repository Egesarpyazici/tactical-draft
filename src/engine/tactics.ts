import type { Formation, MatchState, Player, TeamId, Vec, Role } from './types';
import { clamp, inside } from './math';
const shapes: Record<Formation, Vec[]> = {
  '4-3-3': [
    [6, 34],
    [26, 8],
    [23, 26],
    [23, 42],
    [26, 60],
    [43, 34],
    [51, 19],
    [51, 49],
    [72, 10],
    [76, 34],
    [72, 58],
  ].map(([x, y]) => ({ x, y })),
  '4-2-3-1': [
    [6, 34],
    [26, 8],
    [23, 26],
    [23, 42],
    [26, 60],
    [42, 24],
    [42, 44],
    [64, 12],
    [61, 34],
    [64, 56],
    [78, 34],
  ].map(([x, y]) => ({ x, y })),
  '4-4-2': [
    [6, 34],
    [26, 8],
    [23, 26],
    [23, 42],
    [26, 60],
    [49, 10],
    [46, 26],
    [46, 42],
    [49, 58],
    [73, 24],
    [73, 44],
  ].map(([x, y]) => ({ x, y })),
  '3-5-2': [
    [6, 34],
    [25, 18],
    [23, 34],
    [25, 50],
    [48, 7],
    [43, 24],
    [48, 34],
    [43, 44],
    [48, 61],
    [73, 24],
    [73, 44],
  ].map(([x, y]) => ({ x, y })),
};
const roles: Record<Formation, Role[]> = {
  '4-3-3': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'CM', 'CM', 'W', 'ST', 'W'],
  '4-2-3-1': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'DM', 'W', 'AM', 'W', 'ST'],
  '4-4-2': ['GK', 'FB', 'CB', 'CB', 'FB', 'W', 'CM', 'CM', 'W', 'ST', 'ST'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'FB', 'CM', 'DM', 'CM', 'FB', 'ST', 'ST'],
};
export const roleFor = (formation: Formation, slot: number): Role => roles[formation][slot];
export const direction = (team: TeamId, half: 1 | 2) =>
  (team === 0 ? 1 : -1) * (half === 1 ? 1 : -1);
export const localX = (x: number, team: TeamId, half: 1 | 2) =>
  direction(team, half) === 1 ? x : 105 - x;
export const world = (p: Vec, team: TeamId, half: 1 | 2): Vec => ({
  x: localX(p.x, team, half),
  y: direction(team, half) === 1 ? p.y : 68 - p.y,
});
export function anchor(s: MatchState, p: Player): Vec {
  const t = s.teams[p.team].tactics,
    slot = s.teams[p.team].players.findIndex((x) => x.id === p.id),
    base = shapes[t.formation][slot];
  if (p.keeper)
    return world(
      {
        x: 1.8 + clamp(localX(s.ball.pos.x, p.team, s.half) / 105) * 2,
        y: clamp(34 + (s.ball.pos.y - 34) * 0.25 * direction(p.team, s.half), 29, 39),
      },
      p.team,
      s.half,
    );
  const attacking = s.possession === p.team,
    bx = localX(s.ball.pos.x, p.team, s.half);
  const lineShift = (t.line - 50) * 0.22;
  const compression = attacking ? 1 : 0.76;
  const x =
    base.x * compression +
    lineShift +
    (bx - 52.5) * 0.23 +
    (attacking ? 7 + (t.mentality - 50) * 0.12 : -5);
  const spread = (0.5 + (t.width / 100) * 0.75) * (attacking ? 1 : 0.82);
  const by = direction(p.team, s.half) === 1 ? s.ball.pos.y : 68 - s.ball.pos.y;
  return inside(
    world(
      { x: clamp(x, 7, 96), y: 34 + (base.y - 34) * spread + (by - 34) * 0.12 },
      p.team,
      s.half,
    ),
  );
}
export function validateTactics(t: import('./types').Tactics) {
  if (!shapes[t.formation]) throw new Error('Unknown formation');
  for (const key of ['pressing', 'line', 'width', 'tempo', 'passLength', 'mentality'] as const)
    if (!Number.isFinite(t[key]) || t[key] < 0 || t[key] > 100)
      throw new Error(`Invalid tactic: ${key}`);
  if (
    !['short', 'mixed', 'direct'].includes(t.buildUp) ||
    !['hold', 'counter'].includes(t.transition)
  )
    throw new Error('Invalid tactical mode');
}
