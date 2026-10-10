import { expect, it } from 'vitest';
import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
function strikes(x: number, y: number, finishing: number) {
  let goals = 0,
    onTarget = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const m = new Match(createTeams(), seed);
    m.start();
    m.state.restart = null;
    for (const p of m.state.players) {
      p.pos = { x: 40, y: 5 + p.number };
      p.target = { ...p.pos };
      p.decisionAt = 1e9;
    }
    const p = m.state.players[9];
    p.pos = { x, y };
    p.target = { ...p.pos };
    p.attributes.finishing = finishing;
    p.choices = [
      { action: 'shoot', utility: 2, target: { x: 105, y: 34 }, reason: 'controlled opportunity' },
    ];
    p.action = 'shoot';
    p.possessionSince = -10;
    const k = m.state.players[11];
    k.pos = { x: 103.5, y: 34 };
    k.target = { ...k.pos };
    m.state.ball = {
      pos: { ...p.pos },
      velocity: { x: 0, y: 0 },
      owner: p.id,
      lastTouch: p.id,
      flight: null,
    };
    m.step(40);
    goals += m.state.stats[0].goals;
    onTarget += m.state.stats[0].shotsOnTarget;
  }
  return { goals, onTarget };
}
it('geometry changes physical goal outcomes across 100 seeded strikes, without an xG goal lottery', () => {
  const close = strikes(94, 34, 70),
    far = strikes(80, 34, 70),
    wide = strikes(94, 54, 70);
  expect(close.goals).toBeGreaterThan(far.goals);
  expect(close.goals).toBeGreaterThan(wide.goals);
  // No exact expected score or per-match quota: compare the controlled opportunities.
}, 30000);
it('finishing changes execution accuracy across 100 seeded strikes', () => {
  expect(strikes(94, 34, 95).onTarget).toBeGreaterThan(strikes(94, 34, 40).onTarget);
}, 30000);
