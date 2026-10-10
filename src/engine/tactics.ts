import type { Formation, MatchState, Player, TeamId, Vec, Role } from './types';
import { clamp, inside } from './math';
import { roleTarget } from './roles';
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
    base = shapes[t.formation][p.slot ?? s.teams[p.team].players.findIndex((x) => x.id === p.id)];
  const bx = localX(s.ball.pos.x, p.team, s.half),
    by = direction(p.team, s.half) === 1 ? s.ball.pos.y : 68 - s.ball.pos.y;
  if (p.keeper) {
    const depth = p.roleId === 'sweeper' ? clamp(bx * 0.14, 2, 11) : clamp(bx * 0.045, 1.2, 4);
    return inside(
      world(
        { x: depth, y: clamp(34 + ((by - 34) * depth) / Math.max(8, bx), 29, 39) },
        p.team,
        s.half,
      ),
    );
  }
  const attacking = s.possession === p.team;
  // One shared line with 13–17m vertical links, rather than independent slot compression.
  const back = attacking
    ? clamp(bx - 30, 15 + t.line * 0.12, 57)
    : clamp(16 + (t.line - 50) * 0.24 + (bx - 45) * 0.28, 8, 54);
  const level = base.x < 30 ? 0 : base.x < 46 ? 1 : base.x < 58 ? 1.3 : base.x < 70 ? 2 : 2.4;
  const spacing = attacking ? 15 : 12.5;
  const spread = attacking ? 0.62 + t.width * 0.006 : 0.48 + t.width * 0.0045;
  const target = roleTarget(
    p,
    {
      x: back + level * spacing + (attacking ? (t.mentality - 50) * 0.05 : 0),
      y: 34 + (base.y - 34) * spread + (by - 34) * 0.1,
    },
    attacking,
  );
  return inside(world({ x: clamp(target.x, 5, 96), y: clamp(target.y, 4, 64) }, p.team, s.half));
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
