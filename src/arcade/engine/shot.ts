import { clamp, managerSkills, Stream } from './model';
import type { Chance, ShotInput, ShotResult, Side } from './types';
export function validateInput(i: ShotInput) {
  for (const [key, lo, hi] of [
    ['aim', -1.3, 1.3],
    ['height', 0, 1.3],
    ['power', 0.15, 1],
    ['timing', 0, 1],
  ] as const)
    if (!Number.isFinite(i[key]) || i[key] < lo || i[key] > hi)
      throw new Error(`Invalid shot ${key}`);
}
export function goalkeeperX(c: Chance) {
  const distance = 105 - c.position.x,
    lateral = c.position.y - 34;
  return 105 - (0.7 + (1.3 * distance * distance) / (distance * distance + lateral * lateral));
}
/** Canonical goal x=105, mouth y=34±3.66, bar z=2.44. No goal lottery. */
export function resolveShot(c: Chance, i: ShotInput): ShotResult {
  validateInput(i);
  const timingError = (i.timing - 0.5) * 2;
  const distance = 105 - c.position.x;
  const scatter =
    (0.18 + (100 - c.skills.finishing) / 145 + c.pressure * 0.7 + (1 - c.energy) * 0.5) *
    (0.5 + distance / 30) *
    (1 + Math.max(0, i.power - 0.8) * 4);
  const y = 34 + i.aim * 3.66 + timingError * (1.4 + c.pressure) + c.noise[0] * scatter;
  const height =
    i.height * 2.44 +
    Math.max(0, i.power - 0.78) * 4 +
    Math.abs(timingError) * 0.8 +
    c.noise[1] * scatter * 0.32;
  const velocity = 11 + i.power * (19 + c.skills.power * 0.1);
  const length = Math.hypot(distance, y - c.position.y),
    flightTime = length / velocity;
  const keeperX = goalkeeperX(c),
    interceptFraction = clamp((keeperX - c.position.x) / distance),
    interceptY = c.position.y + (y - c.position.y) * interceptFraction,
    interceptTime = flightTime * interceptFraction;
  const interceptHeight = Math.max(
    0,
    height * interceptFraction + 4 * 0.8 * flightTime * interceptFraction * (1 - interceptFraction),
  );
  const reaction = 0.16 + (100 - c.keeper.reflexes) / 220;
  const movement = Math.max(0, interceptTime - reaction) * (3 + c.keeper.pace * 0.026);
  const keeperY = clamp(interceptY, c.keeper.y - movement, c.keeper.y + movement);
  const keeperReach = 0.62 + c.keeper.reflexes * 0.003;
  let outcome: ShotResult['outcome'];
  if (Math.abs(y - 34) > 3.66) outcome = 'wide';
  else if (height > 2.44) outcome = 'over';
  else if (
    Math.abs(interceptY - keeperY) <= keeperReach &&
    interceptHeight < 2.28 - Math.min(0.4, Math.abs(keeperY - c.keeper.y) * 0.06)
  )
    outcome = 'save';
  else outcome = 'goal';
  const target = outcome === 'save' ? { x: keeperX, y: interceptY } : { x: 105, y };
  const fraction = outcome === 'save' ? interceptFraction : 1;
  const path = Array.from({ length: 31 }, (_, n) => {
    const t = (n / 30) * fraction;
    return {
      x: c.position.x + distance * t,
      y: c.position.y + (y - c.position.y) * t,
      z: Math.max(0, height * t + 4 * 0.8 * flightTime * t * (1 - t)),
      t: t * flightTime,
    };
  });
  const reasons = {
    goal: 'Top kale sınırları içinde; kalecinin erişimi dışında.',
    save: 'Kaleci uçuş süresinde topun hattına erişti.',
    wide: 'Yön ve icra sapması topu direğin dışına taşıdı.',
    over: 'Hedef yüksekliği, güç ve zamanlama topu üstten dışarı taşıdı.',
  };
  return {
    outcome,
    target,
    height: Math.max(0, height),
    flightTime: flightTime * fraction,
    velocity,
    keeperY,
    keeperX,
    keeperTime: interceptTime,
    keeperReach,
    reaction,
    timingError,
    path,
    reason: reasons[outcome],
  };
}
export function practiceChance(seed: number, team: Side = 0, pressure = 0.3): Chance {
  const rng = new Stream(seed);
  return {
    id: 0,
    team,
    shooter: `manager-${team}`,
    position: { x: 86, y: 30 },
    quality: 0.5,
    pressure,
    skills: { ...managerSkills },
    energy: 0.9,
    keeper: { y: 34 + rng.signed() * 1.1, reflexes: 76, pace: 62 },
    noise: [rng.signed(), rng.signed()],
    practice: true,
  };
}
