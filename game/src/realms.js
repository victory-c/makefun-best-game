// Four different gardens in one campaign: their rules matter, not just their colours.
import { dist, clamp, TAU } from './mathutil.js';
import { damagePlayer } from './player.js';
import { ring, floatText } from './particles.js';
import { PALETTE } from './config.js';

export const REALMS = [
  { id: 'courtyard', name: 'The Ashen Court', short: 'ASHEN COURT', first: 1, last: 3, color: '#e8b36c', stone: ['#211a30', '#30253f'], mortar: '#100d1b', rule: 'Quiet soil. Learn to carry the light.', hazard: 'none' },
  { id: 'fen', name: 'The Glass Fen', short: 'GLASS FEN', first: 4, last: 6, color: '#80edce', stone: ['#132d34', '#1e3f44'], mortar: '#091c23', rule: 'Glass pools slow feet and shadow alike.', hazard: 'pools' },
  { id: 'archive', name: 'The Thorn Archive', short: 'THORN ARCHIVE', first: 7, last: 9, color: '#d6a0ed', stone: ['#2b1934', '#402344'], mortar: '#180b20', rule: 'Root blooms warn, then strike. Keep moving.', hazard: 'thorns' },
  { id: 'crown', name: 'The Aurora Crown', short: 'AURORA CROWN', first: 10, last: 10, color: '#9bcfff', stone: ['#18273e', '#263d58'], mortar: '#0b1227', rule: 'Falling stars herald the last queen.', hazard: 'stars' },
];
export const realmForNight = (night) => REALMS.find((r) => night >= r.first && night <= r.last) || REALMS[0];

export function enterRealm(game) {
  const realm = realmForNight(game.wave);
  if (game.realm?.id === realm.id) return;
  game.realm = realm;
  game.hazards = [];
  game.hazardTimer = 3;
  game.wards = [];
  game.realmSeals = game.realmSeals || [];
  floatText(game.effects, 640, 250, realm.name.toUpperCase(), realm.color, 26);
  if (realm.hazard === 'pools') {
    game.hazards = [[410, 270, 94], [870, 477, 102], [350, 550, 65], [940, 200, 67]].map(([x, y, r]) => ({ x, y, r, type: 'pool' }));
  }
}

export function movementThroughTerrain(game, x, y) {
  return game.hazards?.some((h) => {
    if (h.type !== 'pool') return false;
    const dx = x - h.x, dy = y - h.y, a = -0.25;
    return Math.hypot(dx * Math.cos(a) + dy * Math.sin(a), (-dx * Math.sin(a) + dy * Math.cos(a)) / 0.76) < h.r;
  }) ? 0.63 : 1;
}

export function updateRealm(game, dt) {
  if (!game.realm || game.realm.hazard === 'none' || game.realm.hazard === 'pools') return;
  game.hazardTimer -= dt;
  if (game.hazardTimer <= 0) {
    const star = game.realm.hazard === 'stars';
    const count = star ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const x = clamp(game.player.x + game.rng.range(-150, 150), 125, 1155);
      const y = clamp(game.player.y + game.rng.range(-100, 100), 170, 600);
      if (dist(x, y, 640, 384) < 85) continue;
      game.hazards.push({ x, y, r: star ? 42 : 48, type: star ? 'star' : 'thorn', life: 2.7, warning: 1.55, hit: false });
    }
    game.hazardTimer = star ? 2.8 : 4.2;
  }
  for (const hazard of game.hazards) {
    hazard.life -= dt;hazard.warning -= dt;
    if (hazard.warning <= 0 && !hazard.hit) {
      hazard.hit = true;
      if (dist(game.player.x, game.player.y, hazard.x, hazard.y) < hazard.r + 8) damagePlayer(game.player, game, hazard.x - 1, hazard.y);
      for (const enemy of game.enemies) if (!enemy.dead && dist(enemy.x, enemy.y, hazard.x, hazard.y) < hazard.r + enemy.r) game.damageEnemy(enemy, hazard.type === 'star' ? 65 : 35, hazard.x, hazard.y);
      ring(game.effects, hazard.x, hazard.y, hazard.r * 1.3, game.realm.color, 0.5, 5);
    }
  }
  game.hazards = game.hazards.filter((h) => h.life > 0);
}

export function drawRealmHazards(g, game) {
  for (const h of game.hazards || []) {
    g.save();g.translate(h.x, h.y);
    if (h.type === 'pool') {
      const fill = g.createRadialGradient(0, 0, 5, 0, 0, h.r);
      fill.addColorStop(0, '#69dcd32a');fill.addColorStop(1, '#70ecda06');
      g.fillStyle = fill;g.strokeStyle = '#72ebd641';g.lineWidth = 2;
      g.beginPath();g.ellipse(0, 0, h.r, h.r * 0.76, -0.25, 0, TAU);g.fill();g.stroke();
      for (let i = 0; i < 3; i++) {
        const r = h.r * ((game.time * 0.12 + i / 3) % 1);
        g.strokeStyle = '#b8fff22a';g.lineWidth = 1;g.beginPath();g.ellipse(0, 0, r, r * 0.76, -0.25, 0, TAU);g.stroke();
      }
    } else if (h.warning > 0) {
      const t = 1 - h.warning / 1.55;
      g.fillStyle = '#f4917c16';g.strokeStyle = '#ffb0a0aa';g.lineWidth = 2;
      g.setLineDash([5, 5]);g.beginPath();g.arc(0, 0, h.r, 0, TAU);g.fill();g.stroke();g.setLineDash([]);
      g.beginPath();g.arc(0, 0, h.r * t, 0, TAU);g.stroke();
    } else {
      g.globalAlpha = Math.min(1, h.life * 2);
      g.strokeStyle = game.realm.color;g.lineWidth = 3;
      const spokes = h.type === 'thorn' ? 7 : 5;
      for (let i = 0; i < spokes; i++) {
        const a = i / spokes * TAU;
        g.beginPath();g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);g.lineTo(Math.cos(a) * h.r, Math.sin(a) * h.r);g.stroke();
      }
    }
    g.restore();
  }
}
