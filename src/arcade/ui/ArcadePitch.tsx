import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { tacticalPosition } from '../engine/model';
import type { Side } from '../engine/types';
import type { ArcadeState } from '../engine/types';
export function ArcadePitch({ state, progress }: { state: ArcadeState; progress: number }) {
  const host = useRef<HTMLDivElement>(null),
    data = useRef({ state, progress });
  data.current = { state, progress };
  useEffect(() => {
    class Field extends Phaser.Scene {
      ink!: Phaser.GameObjects.Graphics;
      labels: Phaser.GameObjects.Text[] = [];
      create() {
        this.ink = this.add.graphics();
        for (let i = 0; i < 22; i++)
          this.labels.push(
            this.add
              .text(0, 0, '', {
                fontFamily: 'Arial',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#142b23',
              })
              .setOrigin(0.5),
          );
      }
      update() {
        const { state: s, progress: p } = data.current,
          g = this.ink;
        const x = (v: number) => 32 + v * 7,
          y = (v: number) => 28 + v * 7;
        g.clear();
        g.fillStyle(0x173d30);
        g.fillRoundedRect(0, 0, 800, 540, 12);
        for (let i = 0; i < 10; i++) {
          g.fillStyle(i % 2 ? 0x1c4638 : 0x1b4235);
          g.fillRect(x(i * 10.5), y(0), 73.5, 476);
        }
        g.lineStyle(1.5, 0xd1e0c8, 0.45);
        g.strokeRect(x(0), y(0), 735, 476);
        g.lineBetween(x(52.5), y(0), x(52.5), y(68));
        g.strokeCircle(x(52.5), y(34), 64);
        g.strokeRect(x(0), y(14), 115.5, 280);
        g.strokeRect(x(88.5), y(14), 115.5, 280);
        g.strokeRect(x(-2), y(30.34), 14, 51.24);
        g.strokeRect(x(105), y(30.34), 14, 51.24);
        const moves = s.last?.motions;
        s.teams
          .flatMap((t, team) => t.players.map((pl, i) => ({ pl, team, i })))
          .forEach(({ pl, team, i }, n) => {
            const m = moves?.find((m) => m.id === pl.id),
              fallback = tacticalPosition(s.teams[team], team as Side, i, s.ball, s.possession);
            const from = m?.from ?? fallback,
              to = m?.to ?? fallback;
            const px = x(from.x + (to.x - from.x) * p),
              py = y(from.y + (to.y - from.y) * p);
            g.fillStyle(0x000000, 0.2);
            g.fillCircle(px + 2, py + 3, 12);
            g.fillStyle(pl.profile === 'GK' ? 0xedbd73 : team === 0 ? 0xc6f17a : 0x8fbaf5);
            g.fillCircle(px, py, 11);
            if (pl.manager) {
              g.lineStyle(2, 0xffffff, 0.9);
              g.strokeCircle(px, py, 15);
            }
            this.labels[n].setPosition(px, py).setText(String(pl.number));
          });
        const path = s.last?.ball ?? [s.ball],
          at = p * (path.length - 1),
          a = path[Math.floor(at)],
          b = path[Math.min(path.length - 1, Math.floor(at) + 1)],
          f = at - Math.floor(at);
        if (path.length > 1) {
          g.lineStyle(1, 0xffffff, 0.18);
          for (let i = 1; i < path.length; i++)
            g.lineBetween(x(path[i - 1].x), y(path[i - 1].y), x(path[i].x), y(path[i].y));
        }
        g.fillStyle(0xffffff);
        g.fillCircle(x(a.x + (b.x - a.x) * f), y(a.y + (b.y - a.y) * f), 5);
      }
    }
    let game: Phaser.Game | undefined;
    const boot = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: host.current!,
        width: 800,
        height: 540,
        scene: Field,
        backgroundColor: '#173d30',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        audio: { noAudio: true },
      });
    });
    return () => {
      cancelAnimationFrame(boot);
      game?.destroy(true);
    };
  }, []);
  return (
    <div
      className="ar-pitch"
      ref={host}
      role="img"
      aria-label="Motorun ürettiği 22 oyunculu 2D sekans"
    />
  );
}
