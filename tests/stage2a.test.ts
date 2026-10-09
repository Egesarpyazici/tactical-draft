import { describe, expect, it } from 'vitest';
import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
import { ROLES, defaultAssignment, roleFit, validateRole, type RoleId } from '../src/engine/roles';
import { anchor, direction, roleFor } from '../src/engine/tactics';
import { evaluate } from '../src/engine/decisions';
import { organize, separatedTarget } from '../src/engine/organization';
import { passOption, shotOpportunity } from '../src/engine/opportunities';
import { replayMatch } from '../src/engine/replay';
import { distance } from '../src/engine/math';
import type { Player } from '../src/engine/types';
function assign(m: Match, index: number, id: RoleId) {
  const p = m.state.players[index],
    r = ROLES[id];
  m.command({
    kind: 'assignment',
    team: p.team,
    player: p.id,
    slot: p.slot,
    roleId: id,
    duty: r.duties[0],
  });
  return p;
}
describe('team organisation and physical decisions', () => {
  it('assigns unique marks and only one primary presser', () => {
    const m = new Match(createTeams());
    m.state.possession = 1;
    const plan = organize(m.state, 0);
    expect(new Set(plan.marks.values()).size).toBe(plan.marks.size);
    expect(
      m.state.players.filter(
        (p) => p.team === 0 && evaluate(m.state, p, plan)[0].action === 'press',
      ).length,
    ).toBeLessThanOrEqual(1);
  });
  it('intended receiver meets a pass while teammates keep their lanes', () => {
    const m = new Match(createTeams());
    m.state.ball.owner = null;
    m.state.ball.flight = {
      kind: 'pass',
      kicker: '0-5',
      team: 0,
      age: 1,
      intended: '0-6',
      destination: { x: 49, y: 22 },
    };
    const plan = organize(m.state, 0);
    expect(plan.recoverer).toBe('0-6');
    expect(evaluate(m.state, m.state.players[6], plan)[0].target).toEqual({ x: 49, y: 22 });
    expect(evaluate(m.state, m.state.players[5], plan)[0].action).not.toBe('recover');
  });
  it('separates coincident teammates in opposite directions without a teleport', () => {
    const m = new Match(createTeams()),
      a = m.state.players[6],
      b = m.state.players[7];
    a.pos = b.pos = { x: 50, y: 34 };
    const aTarget = separatedTarget(m.state, a, a.pos),
      bTarget = separatedTarget(m.state, b, b.pos);
    expect(aTarget.x).toBeLessThan(bTarget.x);
    expect(a.pos).toEqual(b.pos);
  });
  it('penalizes a reachable interception corridor and difficult long passes', () => {
    const m = new Match(createTeams()),
      p = m.state.players[5],
      r = m.state.players[6];
    p.pos = { x: 30, y: 34 };
    r.pos = { x: 44, y: 34 };
    for (const q of m.state.players.filter((q) => q.team === 1)) q.pos = { x: 90, y: 65 };
    const safe = passOption(m.state, p, r);
    m.state.players[15].pos = { x: 38, y: 34 };
    const blocked = passOption(m.state, p, r);
    expect(blocked.danger).toBeGreaterThan(safe.danger);
    expect(blocked.difficulty).toBeGreaterThan(safe.difficulty);
    m.state.players[15].pos = { x: 90, y: 65 };
    r.pos = { x: 75, y: 34 };
    expect(passOption(m.state, p, r).difficulty).toBeGreaterThan(safe.difficulty);
  });
  it('shot opportunity relates to distance, angle and goalkeeper exposure', () => {
    const m = new Match(createTeams()),
      p = m.state.players[9];
    for (const q of m.state.players.filter((q) => q.team === 1 && !q.keeper))
      q.pos = { x: 50, y: 60 };
    p.pos = { x: 94, y: 34 };
    const close = shotOpportunity(m.state, p);
    p.pos = { x: 76, y: 34 };
    expect(shotOpportunity(m.state, p).xg).toBeLessThan(close.xg);
    p.pos = { x: 94, y: 57 };
    expect(shotOpportunity(m.state, p).xg).toBeLessThan(close.xg);
    p.pos = { x: 94, y: 34 };
    m.state.players[11].pos = { x: 90, y: 50 };
    expect(shotOpportunity(m.state, p).xg).toBeGreaterThan(close.xg);
  });
  it('keeper does not leave a shot trajectory to chase the ball', () => {
    const m = new Match(createTeams()),
      p = m.state.players[0];
    m.state.possession = 1;
    m.state.ball = {
      pos: { x: 9, y: 35 },
      velocity: { x: -25, y: 0 },
      owner: null,
      lastTouch: '1-9',
      flight: { kind: 'shot', team: 1, kicker: '1-9', age: 0.2 },
    };
    expect(evaluate(m.state, p)[0].action).toBe('keeper');
  });
  it('a stationary pressing workload consumes more energy than waiting', () => {
    const run = (action: Player['action']) => {
      const m = new Match(createTeams());
      m.start();
      m.state.restart = null;
      const p = m.state.players[8];
      p.pos = { x: 75, y: 8 };
      p.target = { ...p.pos };
      p.action = action;
      p.decisionAt = 1e9;
      m.state.ball.owner = '1-0';
      m.state.ball.pos = { ...m.state.players[11].pos };
      m.step(100);
      return p.energy;
    };
    expect(run('press')).toBeLessThan(run('shape'));
  });
});
describe('implemented role families', () => {
  it.each(Object.values(ROLES).map((r) => [r.id, r] as const))(
    '%s has compatible duties and executable decisions',
    (id, r) => {
      const teams = createTeams();
      teams[0].tactics.formation = '4-2-3-1';
      const m = new Match(teams);
      let p = m.state.players.find((p) => p.team === 0 && r.positions.includes(p.role));
      if (!p) {
        m.setTactics(0, { ...m.state.teams[0].tactics, formation: '4-3-3' });
        p = m.state.players.find((p) => p.team === 0 && r.positions.includes(p.role));
      }
      expect(p).toBeDefined();
      for (const duty of r.duties) {
        m.command({ kind: 'assignment', team: 0, player: p!.id, slot: p!.slot, roleId: id, duty });
        expect(evaluate(m.state, p!)[0]).toBeDefined();
        expect(Number.isFinite(anchor(m.state, p!).x)).toBe(true);
      }
      m.start();
      m.step(300);
      expect(m.state.players.every((p) => Number.isFinite(p.pos.x + p.pos.y))).toBe(true);
    },
  );
  it('wing back stretches the attack; inverted back enters midfield and returns wide in defence', () => {
    const m = new Match(createTeams());
    let p = assign(m, 1, 'wingBack');
    const wide = anchor(m.state, p);
    p = assign(m, 1, 'invertedBack');
    const inside = anchor(m.state, p);
    expect(Math.abs(wide.y - 34)).toBeGreaterThan(Math.abs(inside.y - 34) + 8);
    m.state.possession = 1;
    expect(Math.abs(anchor(m.state, p).y - 34)).toBeGreaterThan(Math.abs(inside.y - 34));
  });
  it('anchor protects the centre, mezzala occupies a half-space, false nine drops, shadow striker advances', () => {
    const m = new Match(createTeams());
    let p = assign(m, 5, 'anchor');
    const hold = anchor(m.state, p);
    m.setTactics(0, { ...m.state.teams[0].tactics, formation: '4-3-3' });
    p = m.state.players[6];
    const central = anchor(m.state, p);
    assign(m, 6, 'mezzala');
    expect(Math.abs(anchor(m.state, p).y - 34)).toBeGreaterThan(Math.abs(central.y - 34));
    p = m.state.players[9];
    const forward = anchor(m.state, p);
    assign(m, 9, 'falseNine');
    expect(anchor(m.state, p).x).toBeLessThan(forward.x - 8);
    expect(hold.x).toBeLessThan(central.x);
    m.setTactics(0, { ...m.state.teams[0].tactics, formation: '4-2-3-1' });
    p = m.state.players[8];
    const play = anchor(m.state, p);
    assign(m, 8, 'shadowStriker');
    expect(anchor(m.state, p).x).toBeGreaterThan(play.x + 8);
  });
  it('ball-playing defender values a safe line-breaking pass more than a standard defender', () => {
    const m = new Match(createTeams()),
      p = m.state.players[2];
    m.state.ball.owner = p.id;
    m.state.ball.pos = { ...p.pos };
    const before = evaluate(m.state, p).find(
      (c) => c.action === 'pass' && c.receiver === '0-5',
    )!.utility;
    assign(m, 2, 'ballPlayer');
    expect(
      evaluate(m.state, p).find((c) => c.action === 'pass' && c.receiver === '0-5')!.utility,
    ).toBeGreaterThan(before);
  });
  it('press forward gets priority in the same front-line press contest', () => {
    const m = new Match(createTeams());
    m.start();
    m.pause();
    m.state.restart = null;
    m.state.possession = 1;
    m.state.ball.pos = { x: 78, y: 34 };
    const p = m.state.players[9];
    p.pos = { x: 76, y: 34 };
    const before = evaluate(m.state, p).find((c) => c.action === 'press')!.utility;
    assign(m, 9, 'pressingForward');
    expect(evaluate(m.state, p).find((c) => c.action === 'press')!.utility).toBeGreaterThan(before);
  });
  it('sweeper keeper holds a higher position than standard keeper', () => {
    const m = new Match(createTeams()),
      p = m.state.players[0];
    m.state.ball.pos = { x: 80, y: 34 };
    const standard = anchor(m.state, p).x;
    assign(m, 0, 'sweeper');
    expect(anchor(m.state, p).x).toBeGreaterThan(standard + 4);
  });
  it('fit is a transparent mean and changes positioning execution, not score', () => {
    const m = new Match(createTeams()),
      p = assign(m, 1, 'wingBack');
    const fit = roleFit(p, 'wingBack');
    expect(fit.score).toBe(
      fit.requirements.reduce((n, v) => n + v.value, 0) / fit.requirements.length,
    );
    const high = anchor(m.state, p).x;
    for (const key of ROLES.wingBack.attributes) p.attributes[key] = 15;
    expect(anchor(m.state, p).x).toBeLessThan(high);
    expect(m.state.stats.map((t) => t.goals)).toEqual([0, 0]);
  });
  it('role changes yield different actual runs without changing the starting coordinates', () => {
    const a = new Match(createTeams(), 7),
      b = new Match(createTeams(), 7);
    a.start();
    b.start();
    a.step(100);
    b.step(100);
    a.pause();
    const p = a.state.players[1],
      before = { ...p.pos };
    a.command({
      kind: 'assignment',
      team: 0,
      player: p.id,
      slot: 1,
      roleId: 'invertedBack',
      duty: 'support',
    });
    expect(p.pos).toEqual(before);
    a.resume();
    a.step(100);
    b.step(100);
    expect(distance(p.pos, b.state.players[1].pos)).toBeGreaterThan(0.5);
  });
});
describe('live tactical commands', () => {
  it('only accepts paused/ready/halftime commands and never teleports live players', () => {
    const m = new Match(createTeams());
    m.start();
    m.step(500);
    expect(() => m.setTactics(0, m.state.teams[0].tactics)).toThrow();
    m.pause();
    const positions = m.state.players.map((p) => ({ ...p.pos })),
      time = m.state.time;
    m.setTactics(0, { ...m.state.teams[0].tactics, formation: '3-5-2', line: 85 });
    expect(m.state.players.map((p) => p.pos)).toEqual(positions);
    m.step(20);
    expect(m.state.time).toBe(time);
    expect(m.state.commands.at(-1)?.tick).toBe(500);
    m.resume();
    m.step();
    for (let i = 0; i < 22; i++)
      expect(distance(positions[i], m.state.players[i].pos)).toBeLessThan(1);
  });
  it('swaps position slots atomically and rejects incompatible role/duty without mutations', () => {
    const m = new Match(createTeams()),
      p = m.state.players[6],
      other = m.state.players[8];
    m.command({
      kind: 'assignment',
      team: 0,
      player: p.id,
      slot: 8,
      roleId: 'winger',
      duty: 'attack',
    });
    expect(p.slot).toBe(8);
    expect(other.slot).toBe(6);
    expect(new Set(m.state.players.filter((p) => p.team === 0).map((p) => p.slot)).size).toBe(11);
    const before = m.snapshot();
    expect(() =>
      m.command({
        kind: 'assignment',
        team: 0,
        player: p.id,
        slot: 0,
        roleId: 'keeper',
        duty: 'defend',
      }),
    ).toThrow();
    expect(() => validateRole('ST', 'falseNine', 'defend')).toThrow();
    expect(m.state).toEqual(before);
  });
  it('replays the same ordered tick commands with identical events and state', () => {
    const m = new Match(createTeams(), 31);
    assign(m, 1, 'wingBack');
    m.start();
    m.step(800);
    m.pause();
    m.setTactics(0, { ...m.state.teams[0].tactics, width: 85 });
    m.command({
      kind: 'assignment',
      team: 0,
      player: '0-9',
      slot: 9,
      roleId: 'falseNine',
      duty: 'support',
    });
    m.resume();
    m.step(1000);
    const replay = replayMatch(m.state.initialTeams, 31, m.state.commands, 1800);
    expect(replay.state).toEqual(m.state);
    expect(() =>
      replayMatch(m.state.initialTeams, 31, [
        { tick: 3, sequence: 2, command: m.state.commands[0].command },
      ]),
    ).toThrow();
  });
  it('full-game tackle attempts account for successes without instant reversal chains', () => {
    const m = new Match(createTeams(), 11);
    m.start();
    m.step(27000);
    m.resumeHalf();
    m.step(27000);
    for (const team of [0, 1]) {
      expect(m.state.stats[team].tackleAttempts).toBe(
        m.state.events.filter((e) => e.team === team && e.kind === 'tackleAttempt').length,
      );
      expect(m.state.stats[team].tackles).toBeLessThanOrEqual(m.state.stats[team].tackleAttempts);
      expect(m.state.stats[team].tackles).toBeLessThan(100);
    }
    const tackles = m.state.events.filter((e) => e.kind === 'tackle');
    expect(tackles.every((e, i) => i === 0 || e.tick - tackles[i - 1].tick >= 7)).toBe(true);
  }, 30000);
});
