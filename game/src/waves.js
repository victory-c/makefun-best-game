// Ten authored encounters: readable spawn warnings, new enemy combinations, two queens.
import { VIEW_W, VIEW_H } from './config.js';
import { createEnemy } from './enemies.js';
import { sfx } from './audio.js';

export const NIGHTS = [
  { name: 'A little courage', count: 12, interval: 1.05, types: ['moth', 'moth', 'hound'] },
  { name: 'Eyes in the ivy', count: 17, interval: 0.90, types: ['moth', 'hound', 'spitter', 'moth'] },
  { name: 'Things with teeth', count: 22, interval: 0.79, types: ['hound', 'moth', 'crawler', 'spitter'] },
  { name: 'The garden stirs', count: 25, interval: 0.74, types: ['brood', 'hound', 'moth', 'spitter'] },
  { name: 'A queen of shadows', count: 16, interval: 1.05, types: ['moth', 'hound', 'spitter'], boss: true },
  { name: 'Ashes and echoes', count: 30, interval: 0.66, types: ['crawler', 'hound', 'moth', 'brood', 'spitter'] },
  { name: 'Hungry roots', count: 33, interval: 0.63, types: ['brood', 'moth', 'crawler', 'hound'] },
  { name: 'The cold procession', count: 37, interval: 0.59, types: ['spitter', 'hound', 'crawler', 'moth', 'brood'] },
  { name: 'One last kindling', count: 40, interval: 0.55, types: ['moth', 'hound', 'spitter', 'brood', 'crawler'] },
  { name: 'Until the dawn', count: 28, interval: 0.72, types: ['hound', 'moth', 'spitter', 'crawler'], boss: true },
];

export function beginNight(game) {
  game.wave += 1;
  game.nightTime = 0;
  game.director = { spawned: 0, timer: 1.5, bossQueued: false, clearTime: 0 };
  game.phase = 'play';
  game.banner = 3.5;
  game.enemyShots.length = 0;
  game.player.invuln = 2;
  sfx.waveStart();
}

function edgePosition(rng) {
  const edge = rng.int(0, 3);
  if (edge === 0) return [rng.range(70, VIEW_W - 70), 98];
  if (edge === 1) return [VIEW_W - 40, rng.range(150, VIEW_H - 100)];
  if (edge === 2) return [rng.range(70, VIEW_W - 70), VIEW_H - 55];
  return [40, rng.range(150, VIEW_H - 100)];
}

export function updateNight(game, dt) {
  const plan = NIGHTS[game.wave - 1];
  const d = game.director;
  game.nightTime += dt;
  d.timer -= dt;
  if (d.spawned < plan.count && d.timer <= 0) {
    const [x, y] = edgePosition(game.rng);
    const type = plan.types[d.spawned % plan.types.length];
    game.rifts.push({ x, y, type, time: 0.85, max: 0.85 });
    d.spawned += 1;
    d.timer += plan.interval * game.rng.range(0.85, 1.15);
    sfx.rift();
  }
  if (plan.boss && !d.bossQueued && game.nightTime > 5) {
    d.bossQueued = true;
    game.rifts.push({ x: VIEW_W / 2, y: 135, type: 'boss', time: 2, max: 2 });
    game.banner = 3;
    sfx.bossRoar();
  }
  for (const rift of game.rifts) {
    rift.time -= dt;
    if (rift.time <= 0) game.enemies.push(createEnemy(rift.type, rift.x, rift.y, game.wave));
  }
  game.rifts = game.rifts.filter((r) => r.time > 0);
  const finishedSpawning = d.spawned >= plan.count && (!plan.boss || d.bossQueued);
  if (finishedSpawning && !game.rifts.length && !game.enemies.some((e) => !e.dead)) {
    d.clearTime += dt;
    if (d.clearTime > 0.8) game.clearNight();
  } else d.clearTime = 0;
}
