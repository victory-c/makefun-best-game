// Composition of the living garden: stone, roots, light, creatures, embers and effects.
import { VIEW_W, VIEW_H, PALETTE } from './config.js';
import { createArena, drawHearth, drawDarkness, hearthLightRadius, drawVignette, flameTongue } from './arena.js';
import { drawPlayer, drawBolt } from './player.js';
import { drawEnemy, drawEnemyEyes, drawEnemyShot } from './enemies.js';
import { drawDecals, drawSparks, drawTexts } from './particles.js';
import { createRng } from './rng.js';
import { TAU, dist } from './mathutil.js';
import { label } from './interface.js';

export class GardenRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });
    this.arena = createArena();
    this.garden = this.makeGardenBorder();
  }

  drawWorld(game) {
    const g = this.g, time = game.time;
    g.save();
    if (game.shakeAmount > 0.1) g.translate(Math.sin(time * 137) * game.shakeAmount, Math.cos(time * 159) * game.shakeAmount * 0.6);
    g.drawImage(this.arena.floor, 0, 0);
    drawDecals(g, game.effects);
    this.drawHomeCircle(game);
    this.drawRifts(game);
    const depthSorted = [...game.enemies.filter((e) => !e.dead).map((e) => ({ y: e.y, e })), { y: game.hearth.y, hearth: true }, { y: game.player.y, player: true }].sort((a, b) => a.y - b.y);
    for (const item of depthSorted) {
      if (item.hearth) drawHearth(g, game.hearth, time);
      else if (item.player) drawPlayer(g, game.player, time);
      else drawEnemy(g, item.e, time);
    }
    for (const b of game.bolts) drawBolt(g, b);
    const lights = [
      { x: game.hearth.x, y: game.hearth.y - 18, r: hearthLightRadius(game.hearth), power: 1, tint: '#ff9e2525' },
      { x: game.player.x, y: game.player.y - 8, r: 125 + Math.min(70, game.carry * 4), power: 0.95, tint: '#ffac3115' },
    ];
    for (const r of game.rifts) lights.push({ x: r.x, y: r.y, r: r.type === 'boss' ? 170 : 80, power: 0.6, tint: '#7b2dbd18' });
    for (const b of game.bolts.filter((_, i) => i % 3 === 0).slice(0, 16)) lights.push({ x: b.x, y: b.y, r: 42, power: 0.6 });
    drawDarkness(g, this.arena, lights, game.flareTime * 0.65);
    this.drawEmbers(game);
    for (const e of game.enemies) if (!e.dead) drawEnemyEyes(g, e, time);
    for (const shot of game.enemyShots) drawEnemyShot(g, shot, time);
    drawSparks(g, game.effects);
    this.drawAmbience(time);
    g.drawImage(this.garden, 0, 0);
    if (game.bankPulse > 0) {
      g.globalAlpha = game.bankPulse * 0.3;
      g.fillStyle = '#ffc36c';g.fillRect(0, 0, VIEW_W, VIEW_H);g.globalAlpha = 1;
    }
    drawTexts(g, game.effects);
    drawVignette(g, game.hurtFlash);
    if (game.phase === 'play') this.drawLabels(game);
    g.restore();
  }

  drawHomeCircle(game) {
    const g = this.g, h = game.hearth;
    g.strokeStyle = game.carry > 0 ? '#a4ffcf88' : '#ffbd4c30';
    g.lineWidth = game.carry > 0 ? 2 : 1;
    g.setLineDash([3, 9]);g.lineDashOffset = -game.time * 9;
    g.beginPath();g.arc(h.x, h.y, 103, 0, TAU);g.stroke();g.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + game.time * 0.07;
      const x = h.x + Math.cos(a) * 82, y = h.y + Math.sin(a) * 82;
      g.fillStyle = '#c18d4d60';g.beginPath();g.arc(x, y, 3, 0, TAU);g.fill();
    }
  }

  drawRifts(game) {
    const g = this.g;
    for (const r of game.rifts) {
      const progress = 1 - r.time / r.max;
      const radius = (r.type === 'boss' ? 76 : 24) * (0.6 + progress * 0.4);
      g.save();g.translate(r.x, r.y);
      g.strokeStyle = '#d66cff';g.fillStyle = '#8034c52a';g.lineWidth = 2;
      g.beginPath();g.ellipse(0, 0, radius, radius * 0.5, 0, 0, TAU);g.fill();g.stroke();
      g.rotate(game.time * 1.6);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        g.beginPath();g.moveTo(Math.cos(a) * radius, Math.sin(a) * radius * 0.5);g.lineTo(Math.cos(a) * (radius + 8), Math.sin(a) * (radius + 8) * 0.5);g.stroke();
      }
      g.restore();
      if (r.type === 'boss') label(g, 'SOMETHING STIRS', r.x, r.y + 75, 13, '#f7a9f4', 'center', 800);
    }
  }

  drawEmbers(game) {
    const g = this.g;
    g.save();g.globalCompositeOperation = 'lighter';
    for (const d of game.drops) {
      const bob = Math.sin(game.time * 5 + d.x) * 2;
      g.globalAlpha = d.life < 4 ? 0.35 + Math.abs(Math.sin(game.time * 8)) * 0.65 : 1;
      g.fillStyle = '#f7a84930';g.beginPath();g.arc(d.x, d.y + bob, 11, 0, TAU);g.fill();
      g.translate(d.x, d.y + bob);g.rotate(Math.PI / 4);
      g.fillStyle = '#ffd580';g.fillRect(-2.6, -2.6, 5.2, 5.2);
      g.rotate(-Math.PI / 4);g.translate(-d.x, -d.y - bob);
    }
    for (let i = 0; i < Math.min(12, game.carry); i++) {
      const a = game.time * 1.5 + i * 2.399;
      const r = 23 + (i % 3) * 5;
      g.fillStyle = '#ffd070';g.beginPath();g.arc(game.player.x + Math.cos(a) * r, game.player.y + Math.sin(a) * r * 0.7, 2.3, 0, TAU);g.fill();
    }
    g.restore();
  }

  drawLabels(game) {
    const g = this.g, h = game.hearth, p = game.player;
    if (game.carry && dist(p.x, p.y, h.x, h.y) > 140) {
      const a = Math.atan2(h.y - p.y, h.x - p.x);
      const x = p.x + Math.cos(a) * 57, y = p.y + Math.sin(a) * 57;
      g.save();g.translate(x, y);g.rotate(a);
      g.strokeStyle = PALETTE.teal;g.lineWidth = 2;
      g.beginPath();g.moveTo(-5, -5);g.lineTo(2, 0);g.lineTo(-5, 5);g.stroke();g.restore();
    }
    label(g, game.carry > 0 ? 'BRING EMBERS HOME' : 'THE LAST HEARTH', h.x, h.y + 61, 11, game.carry ? PALETTE.teal : '#c7a174', 'center', 800);
    if (p.flare >= 100) {
      g.strokeStyle = '#ffdc9455';g.lineWidth = 1;
      g.beginPath();g.arc(p.x, p.y, 29 + Math.sin(game.time * 5) * 3, 0, TAU);g.stroke();
    }
  }

  drawAmbience(time) {
    const g = this.g;
    for (let i = 0; i < 34; i++) {
      const phase = (time * 0.03 + i * 0.173) % 1;
      const x = (i * 179 + Math.sin(time * 0.5 + i) * 23) % 1280;
      const y = 680 - phase * 600;
      g.globalAlpha = Math.sin(phase * Math.PI) * 0.3;
      g.fillStyle = i % 4 === 0 ? '#c18bcf' : '#dca753';
      g.beginPath();g.arc(x, y, 1 + i % 2, 0, TAU);g.fill();
    }
    g.globalAlpha = 1;
  }

  makeGardenBorder() {
    const c = document.createElement('canvas');c.width = 1280;c.height = 720;
    const g = c.getContext('2d'), rng = createRng(9123);
    // Root silhouettes and curled leaves frame the open, obstacle-free play space.
    for (const side of [-1, 1]) {
      g.save();if (side < 0) { g.translate(1280, 0);g.scale(-1, 1); }
      for (let i = 0; i < 13; i++) {
        const y = 110 + i * 43;
        const reach = rng.range(15, 52);
        g.strokeStyle = i % 3 ? '#241c37' : '#3b2845';g.lineWidth = rng.range(4, 9);g.lineCap = 'round';
        g.beginPath();g.moveTo(-5, y + 20);g.bezierCurveTo(10, y - 20, reach, y + 24, reach - 5, y - 22);g.stroke();
        g.fillStyle = i % 2 ? '#39304b' : '#2d3842';
        for (let k = 0; k < 4; k++) {
          const x = 6 + k * reach / 5, ly = y + Math.sin(k * 2) * 12;
          g.beginPath();g.ellipse(x, ly, 10, 4, -0.7 + k % 2, 0, TAU);g.fill();
        }
      }
      g.restore();
    }
    for (const x of [59, 1220]) for (const y of [184, 573]) {
      g.fillStyle = '#32283d';g.fillRect(x - 7, y - 18, 14, 30);
      g.fillStyle = '#9bd6c755';g.fillRect(x - 4, y - 15, 8, 18);
      g.strokeStyle = '#6b5e69';g.lineWidth = 2;g.strokeRect(x - 7, y - 18, 14, 30);
      const halo = g.createRadialGradient(x, y - 5, 1, x, y - 5, 58);
      halo.addColorStop(0, '#6ae0c32a');halo.addColorStop(1, '#6ae0c300');g.fillStyle = halo;g.fillRect(x - 58, y - 63, 116, 116);
    }
    return c;
  }
}
