// Wick, the warden: a living flame you steer with WASD, aim with the mouse and fire with a click.

import { PALETTE, PLAYER, VIEW_W, VIEW_H } from './config.js';
import { TAU, clamp, normalize, angleTo } from './mathutil.js';
import { baseStats } from './upgrades.js';
import { burst, ring } from './particles.js';
import { flameTongue } from './arena.js';
import { sfx } from './audio.js';
import { fx } from './rng.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    aim: -Math.PI / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    alive: true,
    invuln: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDir: [0, 0],
    flare: 0,
    stats: baseStats(),
    orbitAngle: 0,
    recoil: 0,
    trail: [],
  };
}

// controls: { moveX, moveY, aimX, aimY, fire, dash, flare } from the keyboard or the autopilot.
export function updatePlayer(p, controls, game, dt) {
  if (!p.alive) return;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.recoil = Math.max(0, p.recoil - dt * 8);
  p.aim = angleTo(p.x, p.y, controls.aimX, controls.aimY);

  const [mx, my] = normalize(controls.moveX, controls.moveY);
  if (controls.dash && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    const dir = mx || my ? [mx, my] : [Math.cos(p.aim), Math.sin(p.aim)];
    p.dashDir = dir;
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = p.stats.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.08);
    sfx.dash();
    ring(game.effects, p.x, p.y, 40, PALETTE.teal, 0.25, 3);
  }
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashDir[0] * PLAYER.dashSpeed;
    p.vy = p.dashDir[1] * PLAYER.dashSpeed;
    burst(game.effects, p.x, p.y, { count: 2, color: PALETTE.teal, speed: 40, size: 4, life: 0.35 });
  } else {
    const accel = clamp(dt * 14, 0, 1);
    p.vx += (mx * p.stats.speed - p.vx) * accel;
    p.vy += (my * p.stats.speed - p.vy) * accel;
  }
  p.x = clamp(p.x + p.vx * dt, 20, VIEW_W - 20);
  p.y = clamp(p.y + p.vy * dt, 110, VIEW_H - 82);

  // Keep Wick from walking into the brazier.
  const h = game.hearth;
  const dx = p.x - h.x;
  const dy = p.y - h.y;
  const d = Math.hypot(dx, dy);
  const minD = h.radius + PLAYER.radius + 4;
  if (d < minD && d > 0.01) {
    p.x = h.x + (dx / d) * minD;
    p.y = h.y + (dy / d) * minD;
  }

  if (controls.fire && p.fireTimer <= 0) fireBolts(p, game);

  if (controls.flare && p.flare >= PLAYER.flareCharge) {
    p.flare = 0;
    game.triggerFlare(p.x, p.y, p.stats.flareRadius);
  }

  p.orbitAngle += dt * 3.4;
  if (game.frame % 2 === 0) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 10) p.trail.shift();
  }
}

function fireBolts(p, game) {
  const s = p.stats;
  p.fireTimer = s.fireDelay;
  p.recoil = 1;
  const count = s.bolts;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * PLAYER.spread;
    const a = p.aim + offset + (game.rng.next() - 0.5) * 0.04;
    game.bolts.push({
      x: p.x + Math.cos(a) * 16,
      y: p.y + Math.sin(a) * 16,
      vx: Math.cos(a) * PLAYER.boltSpeed,
      vy: Math.sin(a) * PLAYER.boltSpeed,
      life: PLAYER.boltLife,
      damage: s.damage,
      pierce: s.pierce,
      hits: [],
    });
  }
  burst(game.effects, p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18, { count: 3, color: PALETTE.flame, speed: 160, size: 2.5, life: 0.18, spread: 0.8, angle: p.aim });
  sfx.shoot();
}

export function orbiterPositions(p) {
  const n = p.stats.orbiters;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p.orbitAngle + (i / n) * TAU;
    out.push([p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 46]);
  }
  return out;
}

export function damagePlayer(p, game, fromX, fromY) {
  if (!p.alive || p.invuln > 0) return false;
  p.hp -= 1;
  p.invuln = PLAYER.invuln;
  const [kx, ky] = normalize(p.x - fromX, p.y - fromY);
  p.vx += kx * 420;
  p.vy += ky * 420;
  burst(game.effects, p.x, p.y, { count: 22, color: PALETTE.blood, speed: 300, size: 3.5, life: 0.5 });
  sfx.hurt();
  game.shake(14);
  game.hitStop(0.08);
  game.hurtFlash = 0.6;
  if (p.hp <= 0) {
    p.alive = false;
    burst(game.effects, p.x, p.y, { count: 60, color: PALETTE.flame, speed: 420, size: 4, life: 1 });
  }
  return true;
}

export function drawPlayer(g, p, time) {
  if (!p.alive) return;
  // Afterimage trail.
  g.globalCompositeOperation = 'lighter';
  p.trail.forEach((t, i) => {
    g.globalAlpha = (i / p.trail.length) * 0.25;
    g.fillStyle = PALETTE.ember;
    g.beginPath();
    g.arc(t.x, t.y, 4 + i * 0.8, 0, TAU);
    g.fill();
  });
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  const blink = p.invuln > 0 && Math.floor(time * 20) % 2 === 0;
  g.save();
  g.translate(p.x, p.y);
  g.fillStyle = 'rgba(0, 0, 0, 0.4)';
  g.beginPath();
  g.ellipse(0, 14, 12, 4, 0, 0, TAU);
  g.fill();
  if (!blink) {
    const lean = clamp(p.vx / 600, -0.35, 0.35);
    g.rotate(lean);
    const bob = Math.sin(time * 9) * 1.5;
    g.globalCompositeOperation = 'lighter';
    flameTongue(g, 0, 10 + bob, 13, 36 + Math.sin(time * 17) * 3, -lean * 20 + Math.sin(time * 8) * 3);
    g.fillStyle = 'rgba(255, 110, 50, 0.85)';
    g.fill();
    flameTongue(g, 0, 9 + bob, 9, 26 + Math.sin(time * 21) * 2, -lean * 14 + Math.sin(time * 10) * 2);
    g.fillStyle = 'rgba(255, 200, 90, 0.95)';
    g.fill();
    g.globalCompositeOperation = 'source-over';
    // Candle body: the warden's little wax cloak.
    g.fillStyle = '#efe0c4';
    g.beginPath();
    g.moveTo(-9, 2 + bob);
    g.lineTo(9, 2 + bob);
    g.lineTo(11, 15);
    g.lineTo(-11, 15);
    g.closePath();
    g.fill();
    g.fillStyle = '#d2bf9c';
    g.fillRect(-11, 12, 22, 3);
    // Eyes look where you aim.
    const ex = Math.cos(p.aim) * 2.5;
    const ey = Math.sin(p.aim) * 1.5;
    g.fillStyle = '#2a1030';
    g.beginPath();
    g.ellipse(-3.5 + ex, -1 + bob + ey, 1.8, 2.6, 0, 0, TAU);
    g.ellipse(3.5 + ex, -1 + bob + ey, 1.8, 2.6, 0, 0, TAU);
    g.fill();
  }
  g.restore();

  // Aim reticle line.
  g.strokeStyle = 'rgba(255, 211, 110, 0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(p.x + Math.cos(p.aim) * (22 - p.recoil * 4), p.y + Math.sin(p.aim) * (22 - p.recoil * 4));
  g.lineTo(p.x + Math.cos(p.aim) * 34, p.y + Math.sin(p.aim) * 34);
  g.stroke();

  for (const [ox, oy] of orbiterPositions(p)) {
    g.globalCompositeOperation = 'lighter';
    const grad = g.createRadialGradient(ox, oy, 0, ox, oy, 14);
    grad.addColorStop(0, PALETTE.hot);
    grad.addColorStop(0.4, PALETTE.ember);
    grad.addColorStop(1, 'rgba(255, 120, 40, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(ox, oy, 14, 0, TAU);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
}

export function drawBolt(g, b) {
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(255, 140, 60, 0.6)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
  g.stroke();
  g.strokeStyle = PALETTE.hot;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
}
