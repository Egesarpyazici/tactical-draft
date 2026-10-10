export type Side = 0 | 1;
export type Strategy = 'high_press' | 'compact_counter' | 'possession';
export type Point = { x: number; y: number };
export type Profile = 'GK' | 'CB' | 'FB' | 'MID' | 'W' | 'ST';
export type Skills = {
  passing: number;
  finishing: number;
  pace: number;
  movement: number;
  defending: number;
  stamina: number;
  reflexes: number;
  power: number;
  composure: number;
};
export type Footballer = {
  id: string;
  name: string;
  number: number;
  profile: Profile;
  skills: Skills;
  energy: number;
  manager: boolean;
};
export type ArcadeTeam = {
  name: string;
  short: string;
  strategy: Strategy;
  players: Footballer[];
  managerName: string;
  used: boolean;
  shotUsed: boolean;
};
export type ShotInput = { aim: number; height: number; power: number; timing: number };
export type Chance = {
  id: number;
  team: Side;
  shooter: string;
  position: Point;
  quality: number;
  pressure: number;
  skills: Skills;
  energy: number;
  keeper: { y: number; reflexes: number; pace: number };
  noise: [number, number];
  practice: boolean;
};
export type ShotResult = {
  outcome: 'goal' | 'save' | 'wide' | 'over';
  target: Point;
  height: number;
  flightTime: number;
  velocity: number;
  keeperY: number;
  keeperX: number;
  keeperTime: number;
  keeperReach: number;
  reaction: number;
  timingError: number;
  path: { x: number; y: number; z: number; t: number }[];
  reason: string;
};
export type Stat = {
  goals: number;
  passes: number;
  completed: number;
  recoveries: number;
  recoveryX: number[];
  pressWins: number;
  entries: number;
  chances: number;
  quality: number;
  pressure: number;
  channels: [number, number, number];
  shots: number;
  saves: number;
  managerShots: number;
  managerGoals: number;
};
export type EventKind =
  | 'possession'
  | 'buildup'
  | 'escape'
  | 'recovery'
  | 'entry'
  | 'chance'
  | 'shot'
  | 'goal'
  | 'save'
  | 'wide'
  | 'over'
  | 'tactic'
  | 'manager'
  | 'halftime'
  | 'lastResort'
  | 'fulltime';
export type ArcadeEvent = {
  id: number;
  time: number;
  sequence: number;
  team: Side;
  kind: EventKind;
  text: string;
  point?: Point;
  player?: string;
  quality?: number;
};
export type Motion = {
  id: string;
  team: Side;
  from: Point;
  to: Point;
  keeper: boolean;
  manager: boolean;
  number: number;
};
export type Sequence = {
  id: number;
  start: number;
  end: number;
  team: Side;
  title: string;
  reasons: string[];
  motions: Motion[];
  ball: Point[];
  shot?: { chance: Chance; result: ShotResult };
};
export type ArcadeCommand = { sequence: number; time: number } & (
  | { kind: 'tactic'; team: Side; strategy: Strategy }
  | { kind: 'manager'; team: Side; player: string }
  | { kind: 'shot'; team: Side; input: ShotInput }
);
export type ArcadeOptions = {
  unlockMinute: number;
  chanceThreshold: number;
  managerNames: [string, string];
};
export type ArcadeState = {
  seed: number;
  time: number;
  sequence: number;
  phase: 'ready' | 'playing' | 'halftime' | 'lastResort' | 'manual' | 'finished';
  teams: [ArcadeTeam, ArcadeTeam];
  possession: Side;
  ball: Point;
  stats: [Stat, Stat];
  events: ArcadeEvent[];
  commands: ArcadeCommand[];
  pending: Chance | null;
  last: Sequence | null;
  options: ArcadeOptions;
  unlocked: boolean;
  halfPassed: boolean;
};
