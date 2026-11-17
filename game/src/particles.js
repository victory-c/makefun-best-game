// Sparks, smoke, shockwave rings and floating score numbers: the game's feedback layer.

import { fx } from './rng.js';
import { TAU } from './mathutil.js';

export function createEffects() {
  return { sparks: [], rings: [], texts: [], decals: [] };
}

export function burst(effects, x, y, { count = 12, color = '#ffd36e', speed = 220, size = 3, life = 0.5, drag = 3.5, glow = true, gravity = 0, spread = TAU, angle = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = angle + (fx.next() - 0.5) * spread;
    const s = speed * (0.35 + fx.next() * 0.85);
    effects.sparks.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + fx.next() * 0.6),
      max: life,
      size: size * (0.6 + fx.next() * 0.8),
      color,
      drag,
      glow,
      gravity,
    });
  }
}

export function smoke(effects, x, y, count = 6, color = 'rgba(40, 20, 70, 0.5)') {
  for (let i = 0; i < count; i++) {
    const a = fx.next() * TAU;
    const s = 20 + fx.next() * 50;
    effects.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.9, max: 0.9, size: 10 + fx.next() * 12, color, drag: 1.5, glow: false, gravity: -10, smoke: true });
  }
}

export function ring(effects, x, y, radius, color, life = 0.4, width = 4) {
  effects.rings.push({ x, y, radius, color, life, max: life, width });
}

export function floatText(effects, x, y, text, color = '#fff6d8', size = 18) {
  effects.texts.push({ x, y, text, color, size, life: 0.9, max: 0.9 });
}

// Scorch marks stay on the floor for a while so the arena remembers the fight.
export function scorch(effects, x, y, radius, color = 'rgba(10, 4, 20, 0.45)') {
  effects.decals.push({ x, y, radius, color, life: 14, rot: fx.next() * TAU });
  if (effects.decals.length > 60) effects.decals.shift();
}

export function updateEffects(effects, dt) {
  for (const p of effects.sparks) {
    p.life -= dt;
    const k = Math.exp(-p.drag * dt);
    p.vx *= k;
    p.vy = p.vy * k + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  effects.sparks = effects.sparks.filter((p) => p.life > 0);
  if (effects.sparks.length > 900) effects.sparks.splice(0, effects.sparks.length - 900);
  for (const r of effects.rings) r.life -= dt;
  effects.rings = effects.rings.filter((r) => r.life > 0);
  for (const t of effects.texts) {
    t.life -= dt;
    t.y -= 38 * dt;
  }
  effects.texts = effects.texts.filter((t) => t.life > 0);
  for (const d of effects.decals) d.life -= dt;
  effects.decals = effects.decals.filter((d) => d.life > 0);
}

export function drawDecals(g, effects) {
  for (const d of effects.decals) {
    g.globalAlpha = Math.min(1, d.life / 3);
    g.fillStyle = d.color;
    g.beginPath();
    g.ellipse(d.x, d.y, d.radius, d.radius * 0.8, d.rot, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

export function drawSparks(g, effects) {
  for (const p of effects.sparks) {
    if (!p.smoke) continue;
    const t = p.life / p.max;
    g.globalAlpha = t * 0.6;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = 'lighter';
  for (const p of effects.sparks) {
    if (p.smoke) continue;
    const t = Math.max(0, p.life / p.max);
    g.globalAlpha = Math.min(1, t * 1.4);
    g.fillStyle = p.color;
    const s = p.size * (0.4 + t * 0.6);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 80) {
      // Streak along the velocity so fast sparks read as motion.
      g.strokeStyle = p.color;
      g.lineWidth = s;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(p.x, p.y, s, 0, TAU);
      g.fill();
    }
  }
  for (const r of effects.rings) {
    const t = 1 - r.life / r.max;
    g.globalAlpha = (1 - t) * 0.9;
    g.strokeStyle = r.color;
    g.lineWidth = r.width * (1 - t) + 1;
    g.beginPath();
    g.arc(r.x, r.y, r.radius * (0.2 + 0.8 * Math.sqrt(t)), 0, TAU);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

export function drawTexts(g, effects) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const t of effects.texts) {
    const k = t.life / t.max;
    const pop = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1;
    g.globalAlpha = Math.min(1, k * 2);
    g.font = `800 ${Math.round(t.size * pop)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(10, 5, 20, 0.85)';
    g.strokeText(t.text, t.x, t.y);
    g.fillStyle = t.color;
    g.fillText(t.text, t.x, t.y);
  }
  g.globalAlpha = 1;
}
