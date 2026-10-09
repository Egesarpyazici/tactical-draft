import type { MatchState, Player, Vec } from './types';
import { clamp, distance, inside, segmentDistance } from './math';
import { direction } from './tactics';
export function pressure(s: MatchState, p: Player) {
  return clamp(
    (5 -
      Math.min(...s.players.filter((q) => q.team !== p.team).map((q) => distance(q.pos, p.pos)))) /
      5,
  );
}
export function passOption(s: MatchState, p: Player, receiver: Player) {
  const d = distance(p.pos, receiver.pos),
    speed = 12 + d * 0.2;
  const travel = d / speed;
  const target = inside({
    x: receiver.pos.x + receiver.velocity.x * travel * 0.55,
    y: receiver.pos.y + receiver.velocity.y * travel * 0.55,
  });
  const dx = target.x - p.pos.x,
    dy = target.y - p.pos.y,
    len = Math.hypot(dx, dy) || 1;
  let danger = 0;
  for (const rival of s.players.filter((q) => q.team !== p.team)) {
    const along = ((rival.pos.x - p.pos.x) * dx + (rival.pos.y - p.pos.y) * dy) / (len * len);
    if (along <= 0.04 || along >= 1.06) continue;
    const arrival = (along * len) / speed,
      reaction = 0.25 + (100 - rival.attributes.awareness) * 0.003;
    const reach = 0.7 + Math.max(0, arrival - reaction) * (4 + rival.attributes.pace * 0.035);
    const gap = segmentDistance(rival.pos, p.pos, target);
    danger = Math.max(danger, clamp(1 - gap / reach));
  }
  const openness = Math.min(
    ...s.players.filter((q) => q.team !== p.team).map((q) => distance(q.pos, target)),
  );
  const turn =
    Math.abs(
      Math.atan2(Math.sin(Math.atan2(dy, dx) - p.facing), Math.cos(Math.atan2(dy, dx) - p.facing)),
    ) / Math.PI;
  const difficulty = clamp(
    (d / 75) * 0.35 +
      danger * 0.6 +
      pressure(s, p) * 0.12 +
      turn * 0.08 +
      Math.hypot(receiver.velocity.x, receiver.velocity.y) * 0.018 +
      (100 - receiver.attributes.firstTouch) * 0.0015,
  );
  return {
    target,
    distance: d,
    speed,
    danger,
    openness,
    difficulty,
    control: clamp(
      0.68 +
        receiver.attributes.firstTouch * 0.003 -
        (speed - 12) * 0.012 -
        (1 - clamp(openness / 5)) * 0.12,
      0.35,
      0.98,
    ),
  };
}
/** Diagnostic opportunity estimate, NOT a goal lottery. Not calibrated to real event data. */
export function shotOpportunity(s: MatchState, p: Player) {
  const gx = direction(p.team, s.half) === 1 ? 105 : 0,
    dx = Math.abs(gx - p.pos.x),
    dy = p.pos.y - 34,
    d = Math.hypot(dx, dy);
  const a =
    Math.atan2(37.66 - p.pos.y, Math.max(0.2, dx)) - Math.atan2(30.34 - p.pos.y, Math.max(0.2, dx));
  const angle = Math.abs(a),
    goal = { x: gx, y: 34 },
    keeper = s.players.find((q) => q.team !== p.team && q.keeper)!;
  const blockers = s.players.filter(
    (q) =>
      q.team !== p.team &&
      !q.keeper &&
      segmentDistance(q.pos, p.pos, goal) < 1.2 &&
      distance(q.pos, goal) < d,
  ).length;
  const exposed = clamp(distance(keeper.pos, goal) / 14);
  const xg = clamp(
    1 /
      (1 +
        Math.exp(
          -(
            -2.1 -
            d * 0.075 +
            angle * 2.5 +
            exposed * 0.8 -
            pressure(s, p) * 0.5 -
            blockers * 0.45
          ),
        )),
    0.003,
    0.85,
  );
  return { distance: d, angle, blockers, pressure: pressure(s, p), xg, goal, keeper };
}
