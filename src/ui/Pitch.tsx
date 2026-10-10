import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { MatchState } from '../engine/types';
type Props = { state: MatchState; selected: string | null; onSelect: (id: string) => void };
/** Read-only renderer: it cannot advance the simulation or decide football outcomes. */
export function Pitch({ state, selected, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(state),
    selection = useRef(selected),
    select = useRef(onSelect);
  current.current = state;
  selection.current = selected;
  select.current = onSelect;
  useEffect(() => {
    const sx = (x: number) => 48 + x * 8,
      sy = (y: number) => 36 + y * 8;
    class PitchScene extends Phaser.Scene {
      ink!: Phaser.GameObjects.Graphics;
      trail!: Phaser.GameObjects.Graphics;
      dots = new Map<string, Phaser.GameObjects.Container>();
      ball!: Phaser.GameObjects.Arc;
      history: { x: number; y: number }[] = [];
      lastTick = -1;
      halo!: Phaser.GameObjects.Arc;
      ownerRing!: Phaser.GameObjects.Arc;
      create() {
        const g = this.add.graphics();
        g.fillStyle(0x193f34);
        g.fillRoundedRect(24, 12, 888, 592, 12);
        for (let i = 0; i < 10; i++) {
          g.fillStyle(i % 2 === 0 ? 0x235344 : 0x204d3f);
          g.fillRect(sx(i * 10.5), sy(0), 84, 544);
        }
        g.lineStyle(1.5, 0x98c4a3, 0.56);
        g.strokeRect(sx(0), sy(0), 840, 544);
        g.lineBetween(sx(52.5), sy(0), sx(52.5), sy(68));
        g.strokeCircle(sx(52.5), sy(34), 9.15 * 8);
        for (const right of [false, true]) {
          g.strokeRect(sx(right ? 88.5 : 0), sy(13.84), 16.5 * 8, 40.32 * 8);
          g.strokeRect(sx(right ? 99.5 : 0), sy(24.84), 5.5 * 8, 18.32 * 8);
          g.fillStyle(0x102c25);
          g.fillRect(sx(right ? 105 : -2), sy(30.34), 16, 7.32 * 8);
          g.strokeRect(sx(right ? 105 : -2), sy(30.34), 16, 7.32 * 8);
          g.fillStyle(0xb5d4bc);
          g.fillCircle(sx(right ? 94 : 11), sy(34), 2);
        }
        g.fillCircle(sx(52.5), sy(34), 2);
        this.trail = this.add.graphics();
        this.ink = this.add.graphics();
        this.halo = this.add.circle(0, 0, 16, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0.8);
        for (const p of current.current.players) {
          const color = Phaser.Display.Color.HexStringToColor(
            current.current.teams[p.team].color,
          ).color;
          const shadow = this.add.circle(2, 3, 11, 0x000000, 0.22);
          const dot = this.add
            .circle(0, 0, 10, p.keeper ? 0xf4c16e : color)
            .setStrokeStyle(2, 0x132820);
          const num = this.add
            .text(0, 0, String(p.number), {
              fontSize: '10px',
              fontFamily: 'Arial',
              fontStyle: 'bold',
              color: '#132820',
            })
            .setOrigin(0.5);
          const container = this.add.container(sx(p.pos.x), sy(p.pos.y), [shadow, dot, num]);
          container
            .setSize(26, 26)
            .setInteractive()
            .on('pointerdown', () => select.current(p.id));
          this.dots.set(p.id, container);
        }
        this.ownerRing = this.add.circle(0, 0, 14, 0xffffff, 0).setStrokeStyle(2, 0xd4ed8b, 0.9);
        this.ball = this.add.circle(0, 0, 5, 0xffffff).setStrokeStyle(1.5, 0x122b23);
      }
      update(_time: number, delta: number) {
        const s = current.current;
        const snap =
          this.lastTick < 0 ||
          s.tick < this.lastTick ||
          s.tick - this.lastTick > 12 ||
          !!s.restart ||
          s.phase !== 'playing';
        const blend = snap ? 1 : 1 - Math.exp(-delta / 35);
        this.ink.clear();
        for (const p of s.players) {
          const dot = this.dots.get(p.id)!;
          dot.setPosition(
            dot.x + (sx(p.pos.x) - dot.x) * blend,
            dot.y + (sy(p.pos.y) - dot.y) * blend,
          );
          if (p.id === selection.current) {
            this.halo.setPosition(dot.x, dot.y);
            this.ink.lineStyle(1, 0xffffff, 0.4);
            this.ink.lineBetween(dot.x, dot.y, sx(p.target.x), sy(p.target.y));
          }
        }
        this.halo.setVisible(!!selection.current);
        this.ball.setPosition(
          this.ball.x + (sx(s.ball.pos.x) - this.ball.x) * blend,
          this.ball.y + (sy(s.ball.pos.y) - this.ball.y) * blend,
        );
        const owner = s.ball.owner ? this.dots.get(s.ball.owner) : null;
        this.ownerRing.setVisible(!!owner);
        if (owner) this.ownerRing.setPosition(owner.x, owner.y);
        if (s.tick !== this.lastTick) {
          if (s.tick < this.lastTick || s.restart || s.ball.owner) this.history = [];
          else this.history.push({ ...s.ball.pos });
          if (this.history.length > 8) this.history.shift();
          this.lastTick = s.tick;
        }
        this.trail.clear();
        this.trail.lineStyle(2, s.ball.flight?.kind === 'shot' ? 0xf4c16e : 0xffffff, 0.3);
        for (let i = 1; i < this.history.length; i++)
          this.trail.lineBetween(
            sx(this.history[i - 1].x),
            sy(this.history[i - 1].y),
            sx(this.history[i].x),
            sy(this.history[i].y),
          );
      }
    }
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current!,
      width: 936,
      height: 616,
      backgroundColor: '#132a24',
      scene: PitchScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      audio: { noAudio: true },
    });
    return () => game.destroy(true);
  }, []);
  return (
    <div
      className="pitch"
      ref={host}
      role="img"
      aria-label="22 oyuncunun ve topun canlı 2D maç görünümü"
    />
  );
}
