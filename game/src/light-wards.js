// Plant small lanterns; their connections to the hearth become burning, slowing tripwires.
import { dist, TAU, clamp } from './mathutil.js';
import { floatText, ring, burst } from './particles.js';
import { sfx } from './audio.js';
import { PALETTE } from './config.js';

export function plantLightWard(game) {
  const p = game.player;
  if (!game.wardSeeds || dist(p.x, p.y, 640, 384) < 142 || game.wards.some((w) => dist(w.x, w.y, p.x, p.y) < 90)) return false;
  game.wardSeeds--;
  if (game.wards.length >= 3) game.wards.shift();
  game.wards.push({ x: p.x, y: p.y, life: 34, maxLife: 34, hp: 4, hurt: 0 });
  ring(game.effects, p.x, p.y, 90, PALETTE.teal, 0.55, 3);
  floatText(game.effects, p.x, p.y - 38, 'LIGHT WOVEN', PALETTE.teal, 16);
  sfx.choose();return true;
}

function beamDistance(x, y, ward) {
  const dx = ward.x - 640, dy = ward.y - 384, d2 = dx * dx + dy * dy;
  const t = d2 ? clamp(((x - 640) * dx + (y - 384) * dy) / d2, 0, 1) : 0;
  return Math.hypot(x - 640 - t * dx, y - 384 - t * dy);
}

export function updateLightWards(game, dt) {
  for (const ward of game.wards) {
    ward.life -= dt;ward.hurt = Math.max(0, ward.hurt - dt);
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      if (beamDistance(enemy.x, enemy.y, ward) < enemy.r + 8) {
        game.damageEnemy(enemy, (enemy.type === 'boss' ? 18 : 30) * dt, ward.x, ward.y);
        enemy.vx *= Math.exp(-dt * 3);enemy.vy *= Math.exp(-dt * 3);
      }
      if (ward.hurt <= 0 && dist(enemy.x, enemy.y, ward.x, ward.y) < enemy.r + 18) {
        ward.hp--;ward.hurt = 0.8;
        burst(game.effects, ward.x, ward.y, { count: 8, color: PALETTE.teal, speed: 130 });
      }
    }
  }
  game.wards = game.wards.filter((w) => w.life > 0 && w.hp > 0);
}

export function drawLightWards(g, game) {
  for (const w of game.wards || []) {
    const fade = Math.min(1, w.life / 4);
    g.save();g.globalAlpha = fade;
    g.strokeStyle = '#62f2d430';g.lineWidth = 9;
    g.beginPath();g.moveTo(640, 384);g.lineTo(w.x, w.y);g.stroke();
    g.strokeStyle = '#9fffe4c0';g.lineWidth = 1.8;
    g.setLineDash([14, 9]);g.lineDashOffset = -game.time * 35;
    g.beginPath();g.moveTo(640, 384);g.lineTo(w.x, w.y);g.stroke();g.setLineDash([]);
    g.fillStyle = '#294a4b';g.strokeStyle = '#a1efc8';g.lineWidth = 1.5;
    g.beginPath();g.roundRect(w.x - 10, w.y - 15, 20, 31, 4);g.fill();g.stroke();
    g.fillStyle = w.hurt > 0 ? '#ffffff' : '#a6ffcf';
    g.beginPath();g.arc(w.x, w.y - 3, 5 + Math.sin(game.time * 5) * 0.7, 0, TAU);g.fill();
    g.strokeStyle = '#c2ffe588';g.lineWidth = 2;
    g.beginPath();g.arc(w.x, w.y, 23, -Math.PI / 2, -Math.PI / 2 + TAU * w.life / w.maxLife);g.stroke();
    g.restore();
  }
}
