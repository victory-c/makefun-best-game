// Tuning and palette for Wickwarden. Every number a designer would tweak lives here.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const TOTAL_WAVES = 10;
export const BOSS_WAVES = [5, 10];

export const PALETTE = {
  night: '#07060d',
  stone: '#17142a',
  stoneLight: '#252041',
  mortar: '#0d0b18',
  ember: '#ffb347',
  flame: '#ffd36e',
  hot: '#fff6d8',
  coal: '#ff6a3d',
  gloam: '#8e5bd6',
  gloamDeep: '#2b1450',
  gloamEye: '#e35cff',
  blood: '#ff4d6d',
  teal: '#62f2d4',
  ui: '#f7ead0',
  uiDim: '#a495c4',
  panel: 'rgba(18, 12, 34, 0.86)',
};

export const PLAYER = {
  radius: 12,
  speed: 265,
  maxHp: 5,
  fireDelay: 0.17,
  boltSpeed: 760,
  boltDamage: 10,
  boltLife: 0.9,
  spread: 0.13,
  invuln: 1.1,
  dashSpeed: 820,
  dashTime: 0.14,
  dashCooldown: 1.15,
  flareCharge: 100,
  flareRadius: 200,
  flareDamage: 55,
  pickupRadius: 70,
};

export const HEARTH = {
  x: VIEW_W / 2,
  y: VIEW_H / 2 + 24,
  radius: 30,
  maxLight: 100,
  lightRadius: 330,
  minLightRadius: 120,
  regenBetweenWaves: 18,
};

export const COMBO_WINDOW = 1.6;
export const DARKNESS_ALPHA = 0.86;
export const BEST_SCORE_KEY = 'wickwarden.best';
