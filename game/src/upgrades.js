// Kindlings: the upgrades offered after each night. Each one changes how the next night plays.

import { PALETTE, PLAYER } from './config.js';
import { TAU } from './mathutil.js';
import { flameTongue } from './arena.js';

export const KINDLINGS = [
  {
    id: 'twin',
    name: 'Twin Wick',
    text: 'Fire one more ember bolt in a fan.',
    max: 3,
    rarity: 'rare',
    apply: (p) => { p.stats.bolts += 1; },
  },
  {
    id: 'bellows',
    name: 'Bellows',
    text: 'Fire 25% faster.',
    max: 4,
    rarity: 'common',
    apply: (p) => { p.stats.fireDelay *= 0.78; },
  },
  {
    id: 'whiteheat',
    name: 'White Heat',
    text: 'Bolts deal 35% more damage.',
    max: 4,
    rarity: 'common',
    apply: (p) => { p.stats.damage *= 1.35; },
  },
  {
    id: 'pierce',
    name: 'Needle Flame',
    text: 'Bolts pierce through one more foe.',
    max: 3,
    rarity: 'common',
    apply: (p) => { p.stats.pierce += 1; },
  },
  {
    id: 'cinders',
    name: 'Orbiting Cinders',
    text: 'A cinder circles you, burning what it touches.',
    max: 4,
    rarity: 'rare',
    apply: (p) => { p.stats.orbiters += 1; },
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    text: 'Bolts burst on impact, scorching nearby foes.',
    max: 3,
    rarity: 'rare',
    apply: (p) => { p.stats.explode += 1; },
  },
  {
    id: 'arc',
    name: 'Arc Spark',
    text: 'Hits leap to a second foe 35% of the time.',
    max: 2,
    rarity: 'rare',
    apply: (p) => { p.stats.chain += 0.35; },
  },
  {
    id: 'mend',
    name: 'Hearth Mend',
    text: 'Restore 45 light and raise the Hearth\u2019s max light by 10.',
    max: 5,
    rarity: 'common',
    apply: (p, game) => {
      game.hearth.maxLight += 10;
      game.hearth.light = Math.min(game.hearth.maxLight, game.hearth.light + 45);
    },
  },
  {
    id: 'tallow',
    name: 'Tallow Heart',
    text: '+1 max life, and heal to full.',
    max: 3,
    rarity: 'common',
    apply: (p) => {
      p.maxHp += 1;
      p.hp = p.maxHp;
    },
  },
  {
    id: 'quickstep',
    name: 'Quickstep',
    text: 'Move 15% faster; dash recharges 25% sooner.',
    max: 3,
    rarity: 'common',
    apply: (p) => {
      p.stats.speed *= 1.15;
      p.stats.dashCooldown *= 0.75;
    },
  },
  {
    id: 'beacon',
    name: 'Beacon Shard',
    text: 'The Hearth shoots at nearby foes and shines 15% wider.',
    max: 3,
    rarity: 'epic',
    apply: (p, game) => {
      game.hearth.beacon += 1;
      game.hearth.radiusBoost *= 1.15;
    },
  },
  {
    id: 'sunflare',
    name: 'Sunflare',
    text: 'Flare charges 40% faster and reaches 25% farther.',
    max: 3,
    rarity: 'epic',
    apply: (p) => {
      p.stats.flareRate *= 1.4;
      p.stats.flareRadius *= 1.25;
    },
  },
  {
    id: 'magnet',
    name: 'Ember Lure',
    text: 'Pull embers from twice as far; embers score 50% more.',
    max: 2,
    rarity: 'common',
    apply: (p) => {
      p.stats.pickupRadius *= 2;
      p.stats.emberValue *= 1.5;
    },
  },
];

export const RARITY_COLORS = { common: '#ffd36e', rare: '#62f2d4', epic: '#ff7af5' };

export function baseStats() {
  return {
    bolts: 1,
    fireDelay: PLAYER.fireDelay,
    damage: PLAYER.boltDamage,
    pierce: 0,
    orbiters: 0,
    explode: 0,
    chain: 0,
    speed: PLAYER.speed,
    dashCooldown: PLAYER.dashCooldown,
    flareRate: 1,
    flareRadius: PLAYER.flareRadius,
    pickupRadius: PLAYER.pickupRadius,
    emberValue: 1,
  };
}

// Three distinct offers, never one already at its cap; epic ones are rarer.
export function rollOffers(rng, taken) {
  const pool = KINDLINGS.filter((k) => (taken[k.id] || 0) < k.max);
  const offers = [];
  while (offers.length < 3 && pool.length) {
    const weights = pool.map((k) => (k.rarity === 'epic' ? 0.5 : k.rarity === 'rare' ? 0.85 : 1));
    let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (roll > weights[index]) roll -= weights[index++];
    offers.push(pool.splice(index, 1)[0]);
  }
  return offers;
}

// Each kindling gets a small hand-drawn emblem for its card.
export function drawKindlingIcon(g, id, x, y, size, time) {
  g.save();
  g.translate(x, y);
  g.scale(size / 40, size / 40);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const flame = (fx, fy, w, h, color) => {
    flameTongue(g, fx, fy, w, h, Math.sin(time * 6 + fx) * 2);
    g.fillStyle = color;
    g.fill();
  };
  switch (id) {
    case 'twin':
      flame(-9, 14, 8, 30, PALETTE.ember);
      flame(9, 14, 8, 30, PALETTE.flame);
      break;
    case 'bellows':
      g.fillStyle = '#b07a4a';
      g.beginPath();
      g.moveTo(-18, -10);
      g.lineTo(10, -4);
      g.lineTo(10, 4);
      g.lineTo(-18, 10);
      g.closePath();
      g.fill();
      g.strokeStyle = PALETTE.flame;
      g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(14, -6 + i * 6);
        g.lineTo(22, -8 + i * 8);
        g.stroke();
      }
      break;
    case 'whiteheat':
      flame(0, 16, 13, 36, PALETTE.coal);
      flame(0, 14, 8, 24, PALETTE.hot);
      break;
    case 'pierce':
      g.strokeStyle = PALETTE.flame;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-20, 0);
      g.lineTo(18, 0);
      g.moveTo(10, -7);
      g.lineTo(19, 0);
      g.lineTo(10, 7);
      g.stroke();
      g.strokeStyle = PALETTE.uiDim;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(-2, 0, 9, 0, TAU);
      g.stroke();
      break;
    case 'cinders':
      g.strokeStyle = 'rgba(255, 211, 110, 0.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 15, 0, TAU);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + (i / 3) * TAU;
        g.fillStyle = PALETTE.ember;
        g.beginPath();
        g.arc(Math.cos(a) * 15, Math.sin(a) * 15, 5, 0, TAU);
        g.fill();
      }
      g.fillStyle = PALETTE.hot;
      g.beginPath();
      g.arc(0, 0, 5, 0, TAU);
      g.fill();
      break;
    case 'wildfire':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.strokeStyle = i % 2 ? PALETTE.coal : PALETTE.flame;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        g.stroke();
      }
      break;
    case 'arc':
      g.strokeStyle = PALETTE.teal;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-16, -14);
      g.lineTo(-2, -2);
      g.lineTo(-8, 4);
      g.lineTo(16, 16);
      g.stroke();
      break;
    case 'mend':
      g.fillStyle = '#4b4068';
      g.fillRect(-14, 6, 28, 10);
      flame(0, 6, 10, 26, PALETTE.ember);
      g.fillStyle = PALETTE.teal;
      g.fillRect(12, -18, 4, 12);
      g.fillRect(8, -14, 12, 4);
      break;
    case 'tallow':
      g.fillStyle = PALETTE.blood;
      g.beginPath();
      g.moveTo(0, 16);
      g.bezierCurveTo(-24, 0, -12, -20, 0, -8);
      g.bezierCurveTo(12, -20, 24, 0, 0, 16);
      g.fill();
      break;
    case 'quickstep':
      g.strokeStyle = PALETTE.teal;
      g.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-16 + i * 10, -12);
        g.lineTo(-6 + i * 10, 0);
        g.lineTo(-16 + i * 10, 12);
        g.stroke();
      }
      break;
    case 'beacon':
      g.fillStyle = '#9fe8ff';
      g.beginPath();
      g.moveTo(0, -20);
      g.lineTo(10, 0);
      g.lineTo(0, 20);
      g.lineTo(-10, 0);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(159, 232, 255, 0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 18, 0, TAU);
      g.stroke();
      break;
    case 'sunflare':
      g.fillStyle = PALETTE.flame;
      g.beginPath();
      g.arc(0, 0, 9, 0, TAU);
      g.fill();
      g.strokeStyle = PALETTE.flame;
      g.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + time;
        g.beginPath();
        g.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        g.stroke();
      }
      break;
    case 'magnet':
      g.strokeStyle = PALETTE.blood;
      g.lineWidth = 7;
      g.beginPath();
      g.arc(0, -2, 12, Math.PI, 0);
      g.stroke();
      g.fillStyle = PALETTE.flame;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(-10 + i * 10, 14 + (i % 2) * 3, 3, 0, TAU);
        g.fill();
      }
      break;
  }
  g.restore();
}
