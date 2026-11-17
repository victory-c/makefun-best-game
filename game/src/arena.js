// The arena: a pre-rendered flagstone floor, the Hearth brazier, and the darkness that eats light.

import { VIEW_W, VIEW_H, PALETTE, HEARTH, DARKNESS_ALPHA } from './config.js';
import { createRng } from './rng.js';
import { TAU, clamp } from './mathutil.js';
import { paintForgottenGarden } from './garden-art.js';
import { paintRealmLandmarks } from './realm-art.js';

// A made-up ward script: a stem with two random branches, carved into the floor ring.
function drawWardGlyph(g, rng) {
  g.beginPath();
  g.moveTo(0, -8);
  g.lineTo(0, 8);
  for (let k = 0; k < 2; k++) {
    const y0 = rng.range(-7, 5);
    const side = rng.sign();
    g.moveTo(0, y0);
    g.lineTo(side * rng.range(4, 7), y0 + rng.range(-5, 5));
  }
  g.stroke();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createArena(realm = null) {
  const floor = makeCanvas(VIEW_W, VIEW_H);
  paintFloor(floor.getContext('2d'), realm);
  paintForgottenGarden(floor.getContext('2d'));
  paintRealmLandmarks(floor.getContext('2d'), realm);
  const dark = makeCanvas(VIEW_W, VIEW_H);
  return { floor, dark, darkCtx: dark.getContext('2d') };
}

function paintFloor(g, realm) {
  const rng = createRng(77);
  g.fillStyle = realm?.mortar || PALETTE.mortar;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // Irregular flagstones laid in staggered rows.
  const rowH = 54;
  for (let row = 0, y = -10; y < VIEW_H; row++, y += rowH) {
    let x = row % 2 ? -40 : -10;
    while (x < VIEW_W) {
      const w = rng.range(70, 130);
      const shade = rng.range(0, 1);
      const base = shade < 0.5 ? (realm?.stone[0] || PALETTE.stone) : (realm?.stone[1] || PALETTE.stoneLight);
      g.fillStyle = base;
      roundRect(g, x + 3, y + 3, w - 6, rowH - 6, 7);
      g.fill();
      // Speckle and wear give the stone texture.
      for (let i = 0; i < 18; i++) {
        g.fillStyle = rng.chance(0.5) ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.12)';
        g.fillRect(x + rng.range(6, w - 10), y + rng.range(6, rowH - 10), rng.range(2, 9), rng.range(1, 4));
      }
      g.fillStyle = 'rgba(255, 240, 210, 0.04)';
      g.fillRect(x + 6, y + 5, w - 12, 2);
      if (rng.chance(0.18)) {
        g.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        g.lineWidth = 1.5;
        g.beginPath();
        let cx = x + rng.range(10, w - 10);
        let cy = y + 6;
        g.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) {
          cx += rng.range(-12, 12);
          cy += rng.range(6, 12);
          g.lineTo(cx, cy);
        }
        g.stroke();
      }
      if (rng.chance(0.12)) {
        g.fillStyle = 'rgba(70, 120, 90, 0.18)';
        g.beginPath();
        g.ellipse(x + rng.range(10, w - 10), y + rng.range(8, rowH - 8), rng.range(8, 20), rng.range(4, 9), 0, 0, TAU);
        g.fill();
      }
      x += w;
    }
  }
  // The ward circle carved around the Hearth.
  const { x: hx, y: hy } = HEARTH;
  g.strokeStyle = 'rgba(255, 190, 110, 0.16)';
  g.lineWidth = 3;
  for (const r of [96, 128]) {
    g.beginPath();
    g.arc(hx, hy, r, 0, TAU);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255, 200, 120, 0.24)';
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    g.save();
    g.translate(hx + Math.cos(a) * 112, hy + Math.sin(a) * 112);
    g.rotate(a + Math.PI / 2);
    drawWardGlyph(g, rng);
    g.restore();
  }
  // Edges fall away into the gloam.
  const edge = g.createRadialGradient(hx, hy, 260, hx, hy, 760);
  edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edge.addColorStop(1, 'rgba(12, 4, 28, 0.75)');
  g.fillStyle = edge;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function hearthLightRadius(hearth) {
  const k = clamp(hearth.light / hearth.maxLight, 0, 1);
  return (HEARTH.minLightRadius + (HEARTH.lightRadius - HEARTH.minLightRadius) * k) * hearth.radiusBoost;
}

// The brazier: stone base, iron cage, and a flame whose height follows its light.
export function drawHearth(g, hearth, time) {
  const { x, y } = hearth;
  const k = clamp(hearth.light / hearth.maxLight, 0, 1);
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(0, 0, 0, 0.4)';
  g.beginPath();
  g.ellipse(0, 22, 46, 14, 0, 0, TAU);
  g.fill();
  // Octagonal stone plinth.
  g.fillStyle = '#3a3150';
  polygon(g, 0, 8, 40, 8, Math.PI / 8);
  g.fill();
  g.fillStyle = '#4b4068';
  polygon(g, 0, 2, 32, 8, Math.PI / 8);
  g.fill();
  // Coal bed.
  const coal = g.createRadialGradient(0, 0, 2, 0, 0, 26);
  coal.addColorStop(0, '#fff2c0');
  coal.addColorStop(0.4, '#ff9a3c');
  coal.addColorStop(1, '#5a1a10');
  g.fillStyle = coal;
  g.beginPath();
  g.arc(0, 0, 24, 0, TAU);
  g.fill();
  // Layered flame tongues.
  const height = 26 + 46 * k;
  g.globalCompositeOperation = 'lighter';
  const layers = [
    ['rgba(255, 90, 40, 0.55)', 1.0, 18],
    ['rgba(255, 170, 60, 0.7)', 0.78, 13],
    ['rgba(255, 240, 190, 0.9)', 0.5, 8],
  ];
  for (const [color, scale, width] of layers) {
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(time * 7 + i * 2.1) * 5 + Math.sin(time * 13 + i) * 2;
      const h = height * scale * (i === 0 ? 1 : 0.7) * (0.92 + 0.08 * Math.sin(time * 11 + i * 3));
      flameTongue(g, i * width * 0.7, -2, width * (i === 0 ? 1 : 0.75), h, sway);
      g.fillStyle = color;
      g.fill();
    }
  }
  g.globalCompositeOperation = 'source-over';
  // Iron cage posts.
  g.strokeStyle = '#1b1527';
  g.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    g.beginPath();
    g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30 * 0.6 + 4);
    g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22 * 0.6 - 30);
    g.stroke();
  }
  if (hearth.hurtFlash > 0) {
    g.globalAlpha = clamp(hearth.hurtFlash * 3, 0, 0.7);
    g.fillStyle = PALETTE.gloamEye;
    g.beginPath();
    g.arc(0, 0, 36, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
}

export function flameTongue(g, x, y, w, h, sway) {
  g.beginPath();
  g.moveTo(x - w, y);
  g.bezierCurveTo(x - w, y - h * 0.5, x + sway * 0.5 - w * 0.3, y - h * 0.7, x + sway, y - h);
  g.bezierCurveTo(x + sway * 0.5 + w * 0.3, y - h * 0.7, x + w, y - h * 0.5, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.8, x - w, y);
  g.closePath();
}

export function polygon(g, x, y, r, sides, rot = 0) {
  g.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.62;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

// Darkness is a full-screen veil with holes cut where light falls; lights also add a warm wash.
export function drawDarkness(g, arena, lights, flash) {
  const d = arena.darkCtx;
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, VIEW_W, VIEW_H);
  d.fillStyle = `rgba(6, 3, 16, ${DARKNESS_ALPHA * (1 - flash)})`;
  d.fillRect(0, 0, VIEW_W, VIEW_H);
  d.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const grad = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    grad.addColorStop(0, `rgba(0, 0, 0, ${l.power})`);
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${l.power * 0.75})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    d.fillStyle = grad;
    d.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  g.drawImage(arena.dark, 0, 0);
  g.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.tint) continue;
    const grad = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
    grad.addColorStop(0, l.tint);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = grad;
    g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  g.globalCompositeOperation = 'source-over';
}

export function drawVignette(g, hurt) {
  const grad = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, hurt > 0 ? `rgba(160, 10, 40, ${0.25 + hurt * 0.5})` : 'rgba(0, 0, 0, 0.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
}
