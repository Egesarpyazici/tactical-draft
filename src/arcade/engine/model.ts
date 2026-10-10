import { createTeams } from '../../data/teams';
import type { ArcadeTeam, Footballer, Profile, Skills, Stat, Strategy, Point, Side } from './types';
export const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export class Stream {
  constructor(public state: number) {}
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  signed() {
    return this.next() * 2 - 1;
  }
}
export const STRATEGIES: Record<
  Strategy,
  {
    name: string;
    formation: string;
    line: number;
    width: number;
    press: number;
    length: number;
    passes: number;
    transition: number;
    description: string;
    risk: string;
  }
> = {
  high_press: {
    name: 'Yüksek Pres',
    formation: '4-3-3',
    line: 68,
    width: 57,
    press: 0.88,
    length: 19,
    passes: 4,
    transition: 0.7,
    description: 'İleride baskı, kısa yoldan kaleye geçiş.',
    risk: 'Baskı aşılırsa arkada alan; daha fazla yorgunluk.',
  },
  compact_counter: {
    name: 'Kompakt Kontra',
    formation: '4-3-3',
    line: 28,
    width: 38,
    press: 0.27,
    length: 32,
    passes: 3,
    transition: 1,
    description: 'Dar blokta top kazan, açık koridora hızlı çık.',
    risk: 'Uzun pas kaybı ve daha az hücum desteği.',
  },
  possession: {
    name: 'Topa Sahip Olma',
    formation: '4-3-3',
    line: 48,
    width: 62,
    press: 0.48,
    length: 13,
    passes: 6,
    transition: 0.3,
    description: 'Yakın pas seçenekleriyle kontrollü ilerle.',
    risk: 'Baskı altında fazla temas; yerleşik savunmaya karşı dar açı.',
  },
};
export const managerSkills: Skills = {
  passing: 42,
  finishing: 48,
  pace: 44,
  movement: 56,
  defending: 30,
  stamina: 40,
  reflexes: 20,
  power: 53,
  composure: 50,
};
export function lineups(names: [string, string]): [ArcadeTeam, ArcadeTeam] {
  const roles: Profile[] = ['GK', 'FB', 'CB', 'CB', 'FB', 'MID', 'MID', 'MID', 'W', 'ST', 'W'];
  return createTeams().map((t, i) => ({
    name: t.name,
    short: t.short,
    strategy: (i ? 'compact_counter' : 'high_press') as Strategy,
    managerName: names[i],
    used: false,
    shotUsed: false,
    players: t.players.map((p, j): Footballer => ({
      id: p.id,
      name: p.name,
      number: p.number,
      profile: roles[j],
      energy: 1,
      manager: false,
      skills: {
        passing: p.attributes.passing,
        finishing: p.attributes.finishing,
        pace: p.attributes.pace,
        movement: p.attributes.offBall,
        defending: p.attributes.tackling,
        stamina: p.attributes.stamina,
        reflexes: p.attributes.reflexes,
        power: p.attributes.shotPower,
        composure: p.attributes.composure,
      },
    })),
  })) as [ArcadeTeam, ArcadeTeam];
}
export const emptyStats = (): Stat => ({
  goals: 0,
  passes: 0,
  completed: 0,
  recoveries: 0,
  recoveryX: [],
  pressWins: 0,
  entries: 0,
  chances: 0,
  quality: 0,
  pressure: 0,
  channels: [0, 0, 0],
  shots: 0,
  saves: 0,
  managerShots: 0,
  managerGoals: 0,
});

export function tacticalPosition(
  t: ArcadeTeam,
  team: Side,
  index: number,
  ball: Point,
  possession: Side,
): Point {
  const p = t.players[index],
    plan = STRATEGIES[t.strategy];
  const bx = team === 0 ? ball.x : 105 - ball.x,
    attack = possession === team;
  const base = {
    GK: 5,
    CB: plan.line * 0.65,
    FB: plan.line * 0.7 + 8,
    MID: plan.line * 0.6 + 22,
    W: plan.line * 0.4 + 43,
    ST: plan.line * 0.3 + 57,
  }[p.profile];
  const lanes = [34, 7, 24, 44, 61, 20, 34, 48, 9, 34, 59];
  const local = {
    x: clamp(base + (attack ? (bx - 52) * 0.25 : 0), 2, 101),
    y: clamp(34 + ((lanes[index] - 34) * plan.width) / 60, 3, 65),
  };
  return { x: team === 0 ? local.x : 105 - local.x, y: local.y };
}
