import type { Attributes, Team, Tactics } from '../engine/types';
import { Random } from '../engine/math';
export const defaultTactics: Tactics = {
  formation: '4-3-3',
  pressing: 55,
  line: 50,
  width: 60,
  tempo: 55,
  passLength: 40,
  mentality: 55,
  buildUp: 'mixed',
  transition: 'counter',
};
const names = [
  [
    'Deniz Akın',
    'Mert Saygın',
    'Aras Demir',
    'Bora Tan',
    'Eren Koral',
    'Kaan Ergin',
    'Atlas Sönmez',
    'Emir Yalın',
    'Baran Ekin',
    'Doruk Aydın',
    'Ilgaz Ural',
  ],
  [
    'Luka Varen',
    'Niko Arden',
    'Leon Sorel',
    'Milo Kova',
    'Theo Marin',
    'Elio Novak',
    'Noah Voss',
    'Sami Renard',
    'Alex Duran',
    'Enzo Vale',
    'Rayan Morel',
  ],
];
const keys: (keyof Attributes)[] = [
  'passing',
  'technique',
  'firstTouch',
  'dribbling',
  'finishing',
  'shotPower',
  'pace',
  'acceleration',
  'stamina',
  'positioning',
  'vision',
  'decisions',
  'composure',
  'offBall',
  'marking',
  'tackling',
  'awareness',
  'pressing',
  'aggression',
  'reflexes',
  'handling',
  'reach',
];
export function createTeams(): [Team, Team] {
  return [0, 1].map((id) => {
    const random = new Random(431 + id);
    return {
      id,
      name: id === 0 ? 'Kadıköy Atlas' : 'Bosphorus Athletic',
      short: id === 0 ? 'ATL' : 'BOS',
      color: id === 0 ? '#bbef72' : '#88b8ff',
      tactics: { ...defaultTactics, formation: id === 0 ? '4-3-3' : '4-2-3-1' },
      players: names[id].map((name, i) => {
        const attributes = Object.fromEntries(
          keys.map((k) => [k, 48 + Math.floor(random.next() * 34)]),
        ) as Attributes;
        if (i === 0) {
          attributes.reflexes = 82;
          attributes.handling = 80;
          attributes.reach = 78;
          attributes.pace = 48;
        }
        if (i > 0 && i < 5) {
          attributes.tackling += 12;
          attributes.marking += 10;
        }
        if (i >= 8) {
          attributes.finishing += 12;
          attributes.offBall += 10;
        }
        return { id: `${id}-${i}`, name, number: i + 1, keeper: i === 0, attributes };
      }),
    };
  }) as [Team, Team];
}
