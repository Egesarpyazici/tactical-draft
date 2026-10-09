import type { Duty, RoleId } from './roles';
export type TeamId = 0 | 1;
export type Vec = { x: number; y: number };
export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';
export type Attributes = {
  passing: number;
  technique: number;
  firstTouch: number;
  dribbling: number;
  finishing: number;
  shotPower: number;
  pace: number;
  acceleration: number;
  stamina: number;
  positioning: number;
  vision: number;
  decisions: number;
  composure: number;
  offBall: number;
  marking: number;
  tackling: number;
  awareness: number;
  pressing: number;
  aggression: number;
  reflexes: number;
  handling: number;
  reach: number;
};
export type Tactics = {
  formation: Formation;
  pressing: number;
  line: number;
  width: number;
  tempo: number;
  passLength: number;
  mentality: number;
  buildUp: 'short' | 'mixed' | 'direct';
  transition: 'hold' | 'counter';
};
export type PlayerSpec = {
  id: string;
  name: string;
  number: number;
  keeper: boolean;
  attributes: Attributes;
};
export type Team = {
  id: TeamId;
  name: string;
  short: string;
  color: string;
  players: PlayerSpec[];
  tactics: Tactics;
};
export type Action =
  | 'shape'
  | 'support'
  | 'run'
  | 'press'
  | 'mark'
  | 'screen'
  | 'recover'
  | 'dribble'
  | 'pass'
  | 'shoot'
  | 'keeper';
export type Choice = {
  action: Action;
  utility: number;
  target: Vec;
  receiver?: string;
  reason: string;
};
export type Role = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'W' | 'ST';
export type Player = PlayerSpec & {
  role: Role;
  slot: number;
  roleId: RoleId;
  duty: Duty;
  control: number;
  regainAt: number;
  team: TeamId;
  pos: Vec;
  velocity: Vec;
  facing: number;
  energy: number;
  target: Vec;
  action: Action;
  choices: Choice[];
  decisionAt: number;
  possessionSince: number;
  challengeAt: number;
};
export type Flight = {
  eventId?: number;
  kind: 'pass' | 'shot';
  kicker: string;
  team: TeamId;
  age: number;
  intended?: string;
  destination?: Vec;
  difficulty?: number;
  xg?: number;
  onTarget?: boolean;
};
export type Ball = {
  pos: Vec;
  velocity: Vec;
  owner: string | null;
  lastTouch: string | null;
  flight: Flight | null;
};
export type EventKind =
  | 'kickoff'
  | 'pass'
  | 'passComplete'
  | 'interception'
  | 'tackleAttempt'
  | 'turnover'
  | 'tackle'
  | 'miscontrol'
  | 'shot'
  | 'block'
  | 'save'
  | 'goal'
  | 'throwIn'
  | 'corner'
  | 'goalKick'
  | 'halfTime'
  | 'fullTime'
  | 'tactics';
export type MatchEvent = {
  id: number;
  tick: number;
  time: number;
  kind: EventKind;
  team?: TeamId;
  player?: string;
  target?: string;
  onTarget?: boolean;
  detail?: string;
  distance?: number;
  difficulty?: number;
  xg?: number;
  command?: TacticalCommand;
  relatedEvent?: number;
};
export type TeamStats = {
  tackleAttempts: number;
  turnovers: number;
  xg: number;
  goals: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  completedPasses: number;
  tackles: number;
  interceptions: number;
  saves: number;
  corners: number;
  possessionTicks: number;
};
export type PlayerStats = {
  goals: number;
  shots: number;
  passes: number;
  completedPasses: number;
  tackles: number;
  saves: number;
  distance: number;
  pressSeconds: number;
};
export type Restart = {
  kind: 'kickoff' | 'throwIn' | 'corner' | 'goalKick';
  team: TeamId;
  pos: Vec;
  ticks: number;
};
export type MatchState = {
  seed: number;
  tick: number;
  time: number;
  half: 1 | 2;
  phase: 'ready' | 'playing' | 'paused' | 'halfTime' | 'finished';
  commands: { tick: number; sequence: number; command: TacticalCommand }[];
  teams: [Team, Team];
  initialTeams: [Team, Team];
  players: Player[];
  ball: Ball;
  events: MatchEvent[];
  stats: [TeamStats, TeamStats];
  playerStats: Record<string, PlayerStats>;
  restart: Restart | null;
  possession: TeamId;
  possessionChangedAt: number;
};

export type TacticalCommand =
  | { kind: 'tactics'; team: TeamId; tactics: Tactics }
  | { kind: 'assignment'; team: TeamId; player: string; slot: number; roleId: RoleId; duty: Duty };
