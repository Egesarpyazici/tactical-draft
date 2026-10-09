import type { MatchState, Player, TeamId, Vec } from './types';
import { anchor, direction, localX } from './tactics';
import { clamp, distance, inside, segmentDistance } from './math';
import { ROLES } from './roles';
export type TeamPlan = {
  primary: string | null;
  support: string | null;
  recoverer: string | null;
  marks: Map<string, string>;
  targets: Map<string, Vec>;
};
export function organize(s: MatchState, team: TeamId): TeamPlan {
  const mates = s.players.filter((p) => p.team === team),
    rivals = s.players.filter((p) => p.team !== team),
    t = s.teams[team].tactics;
  const targets = new Map(mates.map((p) => [p.id, anchor(s, p)]));
  const rank = mates
    .filter((p) => !p.keeper)
    .sort(
      (a, b) =>
        distance(a.pos, s.ball.pos) / (0.75 + a.energy * 0.25) -
        ROLES[a.roleId].press * 6 -
        (distance(b.pos, s.ball.pos) / (0.75 + b.energy * 0.25) - ROLES[b.roleId].press * 6),
    );
  const carrier = s.players.find((p) => p.id === s.ball.owner);
  if (carrier?.team === team) {
    for (const p of mates.filter((p) => !p.keeper && p.id !== carrier.id)) {
      const base = targets.get(p.id)!,
        radius = p.duty === 'defend' ? 2.5 : 4.5;
      const candidates = [
        base,
        { x: base.x + radius, y: base.y },
        { x: base.x - radius, y: base.y },
        { x: base.x, y: base.y - radius },
        { x: base.x, y: base.y + radius },
      ].map(inside);
      const score = (v: Vec) => {
        const lane = Math.min(...rivals.map((q) => segmentDistance(q.pos, carrier.pos, v)));
        const space = Math.min(...rivals.map((q) => distance(q.pos, v)));
        return Math.min(lane, 5) * 0.65 + Math.min(space, 8) * 0.35 - distance(v, base) * 0.12;
      };
      targets.set(
        p.id,
        candidates
          .map((target) => ({ target, score: score(target) }))
          .sort((a, b) => b.score - a.score)[0].target,
      );
    }
  }
  const defending = s.possession !== team;
  const danger = localX(s.ball.pos.x, team, s.half) < 28;
  const pressRadius = 7 + t.pressing * 0.25;
  const primary =
    defending && rank[0] && (distance(rank[0].pos, s.ball.pos) < pressRadius || danger)
      ? rank[0].id
      : null;
  const support = primary && t.pressing > 65 ? (rank[1]?.id ?? null) : null;
  const marks = new Map<string, string>(),
    available = new Set(
      mates.filter((p) => !p.keeper && p.id !== primary && p.id !== support).map((p) => p.id),
    );
  // Unique zonal hand-offs. A dropping forward can draw one marker, not the entire line.
  for (const rival of rivals
    .filter((p) => !p.keeper)
    .sort((a, b) => localX(a.pos.x, team, s.half) - localX(b.pos.x, team, s.half))) {
    const marker = mates
      .filter((p) => available.has(p.id))
      .sort(
        (a, b) => distance(targets.get(a.id)!, rival.pos) - distance(targets.get(b.id)!, rival.pos),
      )[0];
    if (
      marker &&
      distance(targets.get(marker.id)!, rival.pos) < 16 + marker.attributes.awareness * 0.06
    ) {
      marks.set(marker.id, rival.id);
      available.delete(marker.id);
    }
  }
  let recoverer: string | null = null;
  if (!s.ball.owner) {
    if (s.ball.flight?.kind === 'pass' && s.ball.flight.team === team)
      recoverer = s.ball.flight.intended ?? rank[0]?.id;
    else recoverer = rank[0]?.id ?? null;
  }
  return { primary, support, recoverer, marks, targets };
}
export function separatedTarget(s: MatchState, p: Player, target: Vec): Vec {
  let x = target.x,
    y = target.y;
  for (const q of s.players) {
    if (q.id === p.id || q.keeper) continue;
    const d = distance(p.pos, q.pos),
      radius = q.team === p.team ? 3.2 : 1.1;
    if (d < radius) {
      const dx = d > 0.001 ? (p.pos.x - q.pos.x) / d : p.id < q.id ? -1 : 1;
      const dy = d > 0.001 ? (p.pos.y - q.pos.y) / d : 0.4;
      x += dx * (radius - d) * 1.5;
      y += dy * (radius - d) * 1.5;
    }
  }
  return inside({ x, y });
}
export function pressureTarget(s: MatchState, p: Player): Vec {
  const dir = direction(p.team, s.half),
    b = s.ball.pos;
  // Approach from the goal side; a failed tackle does not glue both players together.
  return inside({ x: b.x - dir * 1.35, y: b.y + (p.pos.y - b.y) * 0.08 });
}
export function receivingTarget(s: MatchState, p: Player): Vec {
  const b = s.ball,
    v = b.velocity,
    speed = Math.hypot(v.x, v.y);
  if (b.flight?.intended === p.id && b.flight.destination) return inside(b.flight.destination);
  const ahead = clamp(distance(p.pos, b.pos) / (speed + 5), 0, 0.9);
  return inside({ x: b.pos.x + v.x * ahead, y: b.pos.y + v.y * ahead });
}
