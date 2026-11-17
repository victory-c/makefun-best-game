// The Gloam: every creature that crawls out of the dark, how it hunts, and how it is drawn.

import { PALETTE } from './config.js';
import { TAU, angleTo, clamp, dist, normalize } from './mathutil.js';
import { burst, ring, smoke } from './particles.js';
import { sfx } from './audio.js';

export const ENEMY_TYPES = {
  moth: { name: 'Duskmoth', radius: 11, hp: 12, speed: 125, score: 10, target: 'hearth', bite: 5, charge: 6, color: '#7a4fc0', eye: '#ff7af5' },
  hound: { name: 'Shadehound', radius: 14, hp: 24, speed: 150, score: 20, target: 'player', bite: 0, charge: 9, color: '#3d2a66', eye: '#7ff8ff' },
  spitter: { name: 'Wisp-eye', radius: 15, hp: 30, speed: 85, score: 25, target: 'player', bite: 0, charge: 10, color: '#5a2f8a', eye: '#b6ff6a' },
  crawler: { name: 'Hollowback', radius: 23, hp: 95, speed: 42, score: 45, target: 'hearth', drain: 9, charge: 16, color: '#2e1d4a', eye: '#ff5a5a' },
  brood: { name: 'Brood-sac', radius: 20, hp: 55, speed: 58, score: 35, target: 'hearth', drain: 6, charge: 14, color: '#6b3a8c', eye: '#ffb0ff' },
  boss: { name: 'Mother Umbra', radius: 58, hp: 1400, speed: 30, score: 1500, target: 'hearth', drain: 14, charge: 60, color: '#1d0f33', eye: '#ff4dd8' },
};

export function createEnemy(type, x, y, wave) {
  const def = ENEMY_TYPES[type];
  const isBoss = type === 'boss';
  const hpScale = isBoss ? (wave >= 10 ? 1 : 0.5) : 1 + 0.13 * (wave - 1);
  const hp = Math.round(def.hp * hpScale);
  return {
    type,
    def,
    x,
    y,
    vx: 0,
    vy: 0,
    r: def.radius * (isBoss && wave < 10 ? 0.8 : 1),
    hp,
    maxHp: hp,
    speed: def.speed * (1 + 0.025 * (wave - 1)),
    age: 0,
    flash: 0,
    cooldown: 1.5 + (x % 7) * 0.2,
    state: 'move',
    stateTime: 0,
    dead: false,
    latched: false,
    phase: 0,
    elite: isBoss && wave >= 10,
    seed: Math.floor(Math.abs(x * 13 + y * 7)) % 100,
  };
}

export function updateEnemy(e, game, dt) {
  const { player, hearth } = game;
  e.age += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.stateTime += dt;
  e.cooldown -= dt;
  const def = e.def;
  const tx = def.target === 'player' && player.alive ? player.x : hearth.x;
  const ty = def.target === 'player' && player.alive ? player.y : hearth.y;
  let [dx, dy] = normalize(tx - e.x, ty - e.y);
  let speed = e.speed * game.gloamSlow * game.terrainFactor(e.x, e.y);

  switch (e.type) {
    case 'moth': {
      // Moths flutter in a weaving line toward the flame.
      const weave = Math.sin(e.age * 6 + e.seed) * 0.9;
      [dx, dy] = normalize(dx - dy * weave, dy + dx * weave);
      break;
    }
    case 'hound': {
      const d = dist(e.x, e.y, tx, ty);
      if (e.state === 'move' && d < 230 && e.cooldown <= 0) {
        e.state = 'windup';
        e.stateTime = 0;
        e.dashDir = [dx, dy];
      }
      if (e.state === 'windup') {
        speed = 0;
        if (e.stateTime > 0.45) {
          e.state = 'dash';
          e.stateTime = 0;
          sfx.dash();
        }
      } else if (e.state === 'dash') {
        [dx, dy] = e.dashDir;
        speed = 560;
        if (e.stateTime > 0.32) {
          e.state = 'move';
          e.cooldown = 2.2;
        }
      }
      break;
    }
    case 'spitter': {
      // Keeps a wary distance and circles while it spits.
      const d = dist(e.x, e.y, tx, ty);
      const want = 270;
      const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      const orbit = e.seed % 2 ? 0.8 : -0.8;
      [dx, dy] = normalize(dx * radial - dy * orbit, dy * radial + dx * orbit);
      if (e.cooldown <= 0 && e.age > 1) {
        e.cooldown = 2.4 - Math.min(1, game.wave * 0.08);
        const a = angleTo(e.x, e.y, tx, ty);
        fireOrb(game, e.x, e.y, a, 230);
        sfx.enemyShot();
      }
      break;
    }
    case 'boss':
      updateBoss(e, game, dt);
      break;
    default:
      break;
  }

  // Latch onto the Hearth and drain it.
  const hd = dist(e.x, e.y, hearth.x, hearth.y);
  if (def.target === 'hearth' && hd < hearth.radius + e.r + 4) {
    if (e.type === 'moth') {
      game.damageHearth(def.bite, e.x, e.y);
      e.dead = true;
      e.consumed = true;
      burst(game.effects, e.x, e.y, { count: 14, color: PALETTE.gloamEye, speed: 160 });
      return;
    }
    e.latched = true;
    speed = 0;
    game.drainHearth(def.drain * dt, e);
  } else {
    e.latched = false;
  }

  // Knockback decays; movement steers toward the desired heading.
  const steer = e.type === 'hound' && e.state === 'dash' ? 1 : clamp(dt * 6, 0, 1);
  e.vx += (dx * speed - e.vx) * steer;
  e.vy += (dy * speed - e.vy) * steer;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

function fireOrb(game, x, y, angle, speed, radius = 7) {
  game.enemyShots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: radius, life: 6 });
}

// Mother Umbra cycles through three attacks; below half health she adds a spiral.
function updateBoss(e, game, dt) {
  const enraged = e.hp < e.maxHp * 0.5;
  if (e.cooldown > 0) return;
  const pattern = e.phase % 3;
  if (pattern === 0) {
    const count = e.elite ? 18 : 12;
    for (let i = 0; i < count; i++) fireOrb(game, e.x, e.y, (i / count) * TAU + e.age, 170, 9);
    ring(game.effects, e.x, e.y, 120, PALETTE.gloamEye, 0.5, 6);
    sfx.enemyShot();
  } else if (pattern === 1) {
    const broods = e.elite ? 4 : 3;
    for (let i = 0; i < broods; i++) {
      const a = (i / broods) * TAU + e.age;
      game.spawnEnemy('moth', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
    }
    smoke(game.effects, e.x, e.y, 10);
    sfx.rift();
  } else {
    const shots = enraged ? 3 : 1;
    const base = angleTo(e.x, e.y, game.player.x, game.player.y);
    for (let i = 0; i < shots; i++) fireOrb(game, e.x, e.y, base + (i - (shots - 1) / 2) * 0.25, 290, 10);
    sfx.enemyShot();
  }
  if (enraged && e.elite && pattern !== 1) {
    for (let i = 0; i < 6; i++) fireOrb(game, e.x, e.y, e.age * 2 + (i / 6) * TAU, 140, 7);
  }
  e.phase++;
  e.cooldown = (enraged ? 1.2 : 1.8) - (e.elite ? 0.2 : 0);
}

// ---- Drawing: silhouettes go under the darkness, eyes glow above it. ----

export function drawEnemy(g, e, time) {
  const def = e.def;
  g.save();
  g.translate(e.x, e.y);
  const hurt = e.flash > 0;
  const body = hurt ? '#ffffff' : def.color;
  g.fillStyle = 'rgba(0, 0, 0, 0.35)';
  g.beginPath();
  g.ellipse(0, e.r * 0.8, e.r * 0.9, e.r * 0.3, 0, 0, TAU);
  g.fill();
  switch (e.type) {
    case 'moth':
      drawMoth(g, e, body, time);
      break;
    case 'hound':
      drawHound(g, e, body);
      break;
    case 'spitter':
      drawSpitter(g, e, body, time);
      break;
    case 'crawler':
      drawCrawler(g, e, body, time);
      break;
    case 'brood':
      drawBrood(g, e, body, time);
      break;
    case 'boss':
      drawBoss(g, e, body, time);
      break;
  }
  g.restore();
  if (e.type !== 'boss' && e.hp < e.maxHp && e.maxHp > 20) {
    const w = e.r * 2;
    g.fillStyle = 'rgba(0, 0, 0, 0.6)';
    g.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
    g.fillStyle = def.eye;
    g.fillRect(e.x - w / 2, e.y - e.r - 12, w * (e.hp / e.maxHp), 4);
  }
}

function drawMoth(g, e, body, time) {
  const flap = Math.abs(Math.sin(time * 22 + e.seed));
  const heading = Math.atan2(e.vy, e.vx);
  g.rotate(heading + Math.PI / 2);
  g.fillStyle = body === '#ffffff' ? body : '#9b74d6';
  for (const side of [-1, 1]) {
    g.save();
    g.scale(side * (0.35 + flap * 0.65), 1);
    g.beginPath();
    g.ellipse(9, -3, 11, 8, -0.4, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(7, 7, 7, 5, 0.5, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255, 230, 255, 0.35)';
    g.beginPath();
    g.arc(10, -4, 3, 0, TAU);
    g.fill();
    g.fillStyle = body === '#ffffff' ? body : '#9b74d6';
    g.restore();
  }
  g.fillStyle = body === '#ffffff' ? body : '#2a1840';
  g.beginPath();
  g.ellipse(0, 0, 4, 10, 0, 0, TAU);
  g.fill();
}

function drawHound(g, e, body) {
  const heading = e.state === 'windup' && e.dashDir ? Math.atan2(e.dashDir[1], e.dashDir[0]) : Math.atan2(e.vy, e.vx);
  g.rotate(heading);
  if (e.state === 'windup') {
    g.translate(-Math.min(1, e.stateTime / 0.45) * 6, 0);
    g.strokeStyle = 'rgba(127, 248, 255, 0.5)';
    g.lineWidth = 2;
    g.setLineDash([6, 8]);
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(190, 0);
    g.stroke();
    g.setLineDash([]);
  }
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(22, 0);
  g.lineTo(4, -12);
  g.lineTo(-8, -9);
  g.lineTo(-22, -15);
  g.lineTo(-16, -3);
  g.lineTo(-26, 2);
  g.lineTo(-10, 10);
  g.lineTo(6, 11);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(160, 120, 255, 0.35)';
  g.lineWidth = 1.5;
  g.stroke();
}

function drawSpitter(g, e, body, time) {
  g.fillStyle = body;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 2 + (i - 1.5) * 0.4;
    const wob = Math.sin(time * 5 + i) * 4;
    g.beginPath();
    g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    g.quadraticCurveTo(Math.cos(a) * 20 + wob, Math.sin(a) * 20, Math.cos(a) * 28 + wob, Math.sin(a) * 30);
    g.lineWidth = 4;
    g.strokeStyle = body;
    g.stroke();
  }
  const pulse = 1 + Math.sin(time * 4 + e.seed) * 0.06;
  g.beginPath();
  g.arc(0, 0, e.r * pulse, 0, TAU);
  g.fill();
  g.fillStyle = '#e8ffd0';
  g.beginPath();
  g.arc(0, 0, e.r * 0.55, 0, TAU);
  g.fill();
}

function drawCrawler(g, e, body, time) {
  const heading = Math.atan2(e.vy, e.vx);
  const step = Math.sin(time * 8 + e.seed);
  g.strokeStyle = body;
  g.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const a = heading + side * (0.9 + i * 0.5);
      const lift = (i % 2 ? step : -step) * 4;
      g.beginPath();
      g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      g.lineTo(Math.cos(a) * (32 + lift), Math.sin(a) * (32 + lift));
      g.stroke();
    }
  }
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, 0, e.r, e.r * 0.82, heading, 0, TAU);
  g.fill();
  // Spines along the hollow back.
  g.fillStyle = body === '#ffffff' ? body : '#4a3270';
  for (let i = 0; i < 5; i++) {
    const a = heading + Math.PI + (i - 2) * 0.45;
    g.beginPath();
    g.moveTo(Math.cos(a - 0.15) * e.r * 0.8, Math.sin(a - 0.15) * e.r * 0.8);
    g.lineTo(Math.cos(a) * (e.r + 12), Math.sin(a) * (e.r + 12));
    g.lineTo(Math.cos(a + 0.15) * e.r * 0.8, Math.sin(a + 0.15) * e.r * 0.8);
    g.fill();
  }
}

function drawBrood(g, e, body, time) {
  const pulse = 1 + Math.sin(time * 6 + e.seed) * 0.08;
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, e.r * pulse, 0, TAU);
  g.fill();
  g.fillStyle = body === '#ffffff' ? body : '#c58be6';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + time * 0.5;
    g.beginPath();
    g.arc(Math.cos(a) * e.r * 0.55, Math.sin(a) * e.r * 0.55, 5 + Math.sin(time * 9 + i) * 1.5, 0, TAU);
    g.fill();
  }
}

function drawBoss(g, e, body, time) {
  const r = e.r;
  // A crown of tendrils that writhe as she moves.
  g.strokeStyle = body === '#ffffff' ? body : '#3c1f63';
  g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + Math.sin(time * 0.7) * 0.2;
    const len = r * (0.9 + 0.35 * Math.sin(time * 3 + i * 1.7));
    g.lineWidth = 9 - (i % 3) * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
    g.quadraticCurveTo(
      Math.cos(a + 0.3) * (r + len * 0.6),
      Math.sin(a + 0.3) * (r + len * 0.6),
      Math.cos(a + 0.1 * Math.sin(time * 2 + i)) * (r + len),
      Math.sin(a + 0.1 * Math.sin(time * 2 + i)) * (r + len),
    );
    g.stroke();
  }
  const grad = g.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, body === '#ffffff' ? '#ffffff' : '#4a2380');
  grad.addColorStop(1, body);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255, 77, 216, 0.35)';
  g.lineWidth = 3;
  g.stroke();
}

export function drawEnemyEyes(g, e, time) {
  const def = e.def;
  g.save();
  g.translate(e.x, e.y);
  g.globalCompositeOperation = 'lighter';
  const eyes = eyeLayout(e, time);
  for (const [ex, ey, er] of eyes) {
    const grad = g.createRadialGradient(ex, ey, 0, ex, ey, er * 4);
    grad.addColorStop(0, def.eye);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(ex, ey, er * 4, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex, ey, er * 0.6, 0, TAU);
    g.fill();
  }
  g.restore();
}

function eyeLayout(e, time) {
  const heading = Math.atan2(e.vy, e.vx) || 0;
  const fwd = (d, side, s) => [Math.cos(heading) * d - Math.sin(heading) * side, Math.sin(heading) * d + Math.cos(heading) * side, s];
  switch (e.type) {
    case 'moth':
      return [fwd(6, -2.5, 1.6), fwd(6, 2.5, 1.6)];
    case 'hound': {
      const h = e.state === 'windup' && e.dashDir ? Math.atan2(e.dashDir[1], e.dashDir[0]) : heading;
      const f = (d, side, s) => [Math.cos(h) * d - Math.sin(h) * side, Math.sin(h) * d + Math.cos(h) * side, s];
      const s = e.state === 'windup' ? 3.2 : 2.2;
      return [f(12, -4, s), f(12, 4, s)];
    }
    case 'spitter':
      return [[0, 0, 4 + Math.max(0, 0.6 - e.cooldown) * 6]];
    case 'crawler':
      return [fwd(e.r * 0.7, -6, 2.6), fwd(e.r * 0.7, 6, 2.6), fwd(e.r * 0.5, 0, 1.8)];
    case 'brood':
      return [[Math.sin(time * 2) * 3, -2, 2.4]];
    case 'boss':
      return [
        [-18, -10, 5],
        [18, -10, 5],
        [0, -26, 4],
        [-30, 8, 3],
        [30, 8, 3],
        [0, 14, 6 + Math.sin(time * 5) * 1.5],
      ];
    default:
      return [];
  }
}

export function drawEnemyShot(g, s, time) {
  g.globalCompositeOperation = 'lighter';
  const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.6);
  grad.addColorStop(0, '#ffd0ff');
  grad.addColorStop(0.35, PALETTE.gloamEye);
  grad.addColorStop(1, 'rgba(120, 20, 160, 0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s.x, s.y, s.r * 2.6 * (1 + Math.sin(time * 20) * 0.08), 0, TAU);
  g.fill();
  g.globalCompositeOperation = 'source-over';
}
