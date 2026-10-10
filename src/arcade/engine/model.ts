import { createTeams } from '../../data/teams';
import type { ArcadeTeam, Footballer, Profile, Skills, Stat, Strategy } from './types';
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
