// Canvas interface: title, live HUD, upgrade draft, pause and honest end-of-run statistics.
import { PALETTE, TOTAL_WAVES } from './config.js';
import { roundRect, flameTongue } from './arena.js';
import { drawPlayer } from './player.js';
import { KINDLINGS, RARITY_COLORS, drawKindlingIcon } from './upgrades.js';
import { NIGHTS } from './waves.js';
import { isMuted } from './audio.js';
import { clamp, TAU } from './mathutil.js';

const INK = '#fbefd5';
const DIM = '#b8a9c8';
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
export const START_BUTTON = { x: 92, y: 509, w: 330, h: 64 };
export const RESTART_BUTTON = { x: 466, y: 534, w: 348, h: 60 };
export const OFFER_RECTS = [0, 1, 2].map((i) => ({ x: 167 + i * 326, y: 247, w: 294, h: 286 }));
export const hitRect = (mouse, r) => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;

export function label(g, text, x, y, size = 18, color = INK, align = 'left', weight = 500, family = FONT) {
  g.font = `${weight} ${size}px ${family}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(text, x, y);
}

function panel(g, x, y, w, h, border = '#6e4c58', fill = '#171021ef', radius = 12) {
  roundRect(g, x, y, w, h, radius);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = border;
  g.lineWidth = 1;
  g.stroke();
}

function line(g, x, y, w, color = '#695048') {
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
}

function wrap(g, text, x, y, width, size = 17, color = DIM, height = 25, align = 'left') {
  g.font = `500 ${size}px ${FONT}`;
  const words = text.split(' ');
  let current = '', row = 0;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (g.measureText(next).width > width && current) { label(g, current, x, y + row++ * height, size, color, align); current = word; }
    else current = next;
  }
  if (current) label(g, current, x, y + row * height, size, color, align);
}

function button(g, rect, text, hot, hint = '') {
  const { x, y, w, h } = rect;
  panel(g, x, y, w, h, hot ? '#fff2bc' : '#d39a55', hot ? '#ffd783' : '#f0ba68', 7);
  label(g, text, x + w / 2, y + h / 2, 22, '#2c1924', 'center', 800);
  if (hint) label(g, hint, x + w / 2, y + h + 24, 14, DIM, 'center');
}

export function drawTitle(g, game, mouse, best) {
  const fade = g.createLinearGradient(0, 0, 1280, 0);
  fade.addColorStop(0, '#110b1bf5'); fade.addColorStop(0.5, '#110b1bee'); fade.addColorStop(1, '#110b1b33');
  g.fillStyle = fade; g.fillRect(0, 0, 1280, 720);
  label(g, 'A LITTLE CANDLE. A VERY LONG NIGHT.', 95, 81, 15, PALETTE.teal, 'left', 800);
  label(g, 'WICK', 88, 165, 101, INK, 'left', 700, SERIF);
  label(g, 'WARDEN', 88, 257, 101, INK, 'left', 700, SERIF);
  line(g, 94, 325, 478, '#b98448');
  label(g, 'Keep the last light alive.', 95, 366, 27, PALETTE.flame, 'left', 600, SERIF);
  wrap(g, 'Fight the gloam. Gather its embers. Carry them home to feed the hearth. Survive ten nights and see the dawn.', 95, 411, 460, 19, '#cdbbd3', 28);
  button(g, START_BUTTON, 'LIGHT THE WICK   →', hitRect(mouse, START_BUTTON), 'ENTER to begin  ·  A complete run takes about 5 minutes');
  label(g, 'MOVE', 97, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'WASD / arrows', 97, 657, 17);
  label(g, 'AIM + FIRE', 278, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'Mouse + hold click', 278, 657, 17);
  label(g, 'DASH / FLARE', 488, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'Space / E', 488, 657, 17);
  drawTitleHero(g, game.time);
  label(g, 'TEN NIGHTS  /  THIRTEEN KINDLINGS  /  ONE LAST HEARTH', 925, 605, 12, '#d5ba9b', 'center', 700);
  if (best) label(g, `YOUR BEST  ${best.toLocaleString('en-US')}`, 925, 639, 17, PALETTE.flame, 'center', 700);
  label(g, `M  ${isMuted() ? 'SOUND OFF' : 'SOUND ON'}     ·     P / ESC  PAUSE`, 1234, 690, 12, '#a395b5', 'right');
}

function drawTitleHero(g, time) {
  const cx = 925, cy = 365;
  g.save();
  const halo = g.createRadialGradient(cx, cy - 45, 15, cx, cy - 45, 260);
  halo.addColorStop(0, '#ff9a3b40'); halo.addColorStop(0.6, '#e46d4420'); halo.addColorStop(1, '#a2528500');
  g.fillStyle = halo; g.fillRect(650, 90, 550, 510);
  for (let layer = 0; layer < 3; layer++) {
    const radius = 158 + layer * 32;
    g.strokeStyle = layer === 0 ? '#99704388' : '#7d648533';
    g.lineWidth = layer === 0 ? 2 : 1;
    g.beginPath(); g.arc(cx, cy, radius, 0, TAU); g.stroke();
    for (let i = 0; i < 12 + layer * 6; i++) {
      const a = i / (12 + layer * 6) * TAU + layer * 0.12;
      g.save();g.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);g.rotate(a);
      g.fillStyle = i % 3 === 0 ? '#ffd36e' : '#8d688f';
      g.fillRect(-2, -4, 4, 8);g.restore();
    }
  }
  // A larger rendering of the same candle character that the player controls.
  g.translate(cx, cy + 5); g.scale(5.1, 5.1); g.translate(-cx, -cy);
  drawPlayer(g, { x: cx, y: cy, vx: 0, aim: -0.55, alive: true, invuln: 0, recoil: 0, trail: [], stats: { orbiters: 0 } }, time);
  g.restore();
  for (let i = 0; i < 23; i++) {
    const phase = (time * (0.1 + (i % 4) * 0.025) + i * 0.137) % 1;
    const x = cx + Math.sin(i * 7.1 + time * 0.2) * (100 + i * 4);
    const y = 525 - phase * 385;
    g.globalAlpha = Math.sin(phase * Math.PI) * 0.7;
    g.fillStyle = i % 3 ? PALETTE.ember : PALETTE.teal;
    g.beginPath(); g.arc(x, y, 1.5 + i % 3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  label(g, 'WICK', cx, 526, 15, PALETTE.flame, 'center', 800);
  label(g, 'Small flame. Stubborn heart.', cx, 552, 18, '#cdbbd3', 'center', 500, SERIF);
}

function meter(g, x, y, w, h, value, color, background = '#332437') {
  panel(g, x, y, w, h, '#6e566066', background, h / 2);
  if (value <= 0) return;
  roundRect(g, x, y, Math.max(h, w * clamp(value, 0, 1)), h, h / 2);
  g.fillStyle = color; g.fill();
}

export function drawHUD(g, game, paused) {
  const p = game.player, h = game.hearth;
  const bg = g.createLinearGradient(0, 0, 0, 120);
  bg.addColorStop(0, '#100b1cf7');bg.addColorStop(0.75, '#100b1ced');bg.addColorStop(1, '#100b1c00');
  g.fillStyle = bg;g.fillRect(0, 0, 1280, 120);
  label(g, 'WICKWARDEN', 30, 26, 19, PALETTE.flame, 'left', 800, SERIF);
  label(g, `NIGHT ${String(game.wave).padStart(2, '0')} / ${TOTAL_WAVES}`, 30, 58, 24, INK, 'left', 800);
  const fuelColor = h.light < 30 ? '#ff6880' : PALETTE.ember;
  label(g, 'THE LAST HEARTH', 640, 22, 12, '#d5c3b3', 'center', 800);
  meter(g, 440, 39, 400, 17, h.light / h.maxLight, fuelColor);
  label(g, `${Math.ceil(h.light)} LIGHT`, 640, 74, 16, fuelColor, 'center', 800);
  for (let i = 0; i < p.maxHp; i++) {
    const x = 256 + i * 23;
    flameTongue(g, x, 61, 5.7, 20, 1);
    g.fillStyle = i < p.hp ? PALETTE.flame : '#503947';g.fill();
  }
  label(g, 'WICK', 253, 25, 12, DIM, 'left', 800);
  label(g, game.score.toLocaleString('en-US'), 1248, 39, 32, INK, 'right', 800);
  label(g, `BEST CHAIN ${game.maxCombo}     ·     ${game.kills} BANISHED`, 1248, 73, 12, DIM, 'right', 700);
  const remaining = game.enemies.filter((e) => !e.dead).length + game.rifts.length;
  label(g, remaining ? `${remaining} IN THE GLOAM` : 'LISTEN TO THE DARK…', 32, 96, 11, '#ae97c5', 'left', 700);
  if (game.combo >= 5 && game.comboTime > 0) {
    label(g, `${game.combo} CHAIN`, 1225, 127, 28, PALETTE.teal, 'right', 800);
    meter(g, 1093, 148, 130, 4, game.comboTime / 1.6, PALETTE.teal);
  }
  drawBottomBar(g, game);
  const boss = game.enemies.find((e) => e.type === 'boss' && !e.dead);
  if (boss) {
    panel(g, 423, 105, 434, 49, '#9a4776aa', '#1a0d28cc', 8);
    label(g, boss.elite ? 'MOTHER UMBRA • THE LAST NIGHT' : 'THE GLOAM QUEEN', 640, 121, 13, '#f4a1e1', 'center', 800);
    meter(g, 439, 137, 402, 6, boss.hp / boss.maxHp, '#da6dc0');
  }
  if (h.light < 30) {
    g.globalAlpha = 0.7 + Math.sin(game.time * 6) * 0.25;
    label(g, 'THE HEARTH IS FADING — BRING EMBERS HOME', 640, 193, 18, '#ff8898', 'center', 800);
    g.globalAlpha = 1;
  } else if (game.banner > 0) {
    g.globalAlpha = Math.min(1, game.banner * 1.5);
    label(g, NIGHTS[game.wave - 1].name, 640, boss ? 189 : 142, 26, '#f8e3c7', 'center', 500, SERIF);
    g.globalAlpha = 1;
  }
  if (game.helpTime > 0) {
    panel(g, 376, 574, 528, 49, '#a57b49aa', '#1a1029de', 8);
    label(g, 'Defend the hearth. Collect gold embers. Bring them home.', 640, 599, 16, INK, 'center');
  }
  if (paused) drawPause(g);
}

function drawBottomBar(g, game) {
  const p = game.player;
  g.fillStyle = '#110c1def';g.fillRect(0, 655, 1280, 65);
  line(g, 28, 655, 1224, '#594247');
  label(g, 'SPACE', 32, 675, 12, PALETTE.teal, 'left', 800);
  const dashReady = p.dashCooldown <= 0;
  label(g, dashReady ? 'DASH READY' : 'REKINDLING', 32, 699, 15, dashReady ? INK : DIM, 'left', 700);
  meter(g, 167, 683, 92, 7, 1 - p.dashCooldown / p.stats.dashCooldown, PALETTE.teal);
  label(g, `EMBERS  ${game.carry}`, 306, 676, 18, PALETTE.ember, 'left', 800);
  label(g, game.carry ? 'Carry them to the hearth →' : `${game.banked} carried home`, 306, 700, 13, DIM);
  const ready = p.flare >= 100;
  label(g, 'E / RIGHT CLICK', 677, 675, 12, ready ? PALETTE.flame : DIM, 'left', 800);
  label(g, ready ? 'SUNFLARE READY' : `SUNFLARE  ${Math.floor(p.flare)}%`, 677, 699, 15, ready ? PALETTE.flame : INK, 'left', 800);
  meter(g, 862, 682, 159, 10, p.flare / 100, ready ? '#fff1bd' : '#d69a4e');
  label(g, 'ESC  PAUSE', 1248, 676, 13, DIM, 'right');
  label(g, `M  ${isMuted() ? 'MUTED' : 'SOUND ON'}`, 1248, 700, 13, DIM, 'right');
}

export function drawKindlingDraft(g, game, mouse) {
  g.fillStyle = '#0e0919df';g.fillRect(0, 0, 1280, 720);
  label(g, `NIGHT ${game.wave} SURVIVED`, 640, 104, 15, PALETTE.teal, 'center', 800);
  label(g, 'Feed your little fire.', 640, 157, 51, INK, 'center', 500, SERIF);
  label(g, 'Choose one kindling. The next night grows hungrier.', 640, 204, 18, DIM, 'center');
  game.offers.forEach((offer, index) => {
    const r = OFFER_RECTS[index];
    const color = RARITY_COLORS[offer.rarity];
    const hot = hitRect(mouse, r);
    panel(g, r.x, r.y - (hot ? 7 : 0), r.w, r.h, hot ? color : '#63506f', hot ? '#302036fa' : '#1d152bf5', 10);
    const y = r.y - (hot ? 7 : 0);
    label(g, `${index + 1}`, r.x + 22, y + 24, 15, color, 'left', 800);
    label(g, offer.rarity.toUpperCase(), r.x + r.w - 22, y + 24, 11, color, 'right', 800);
    drawKindlingIcon(g, offer.id, r.x + r.w / 2, y + 91, 66, game.time);
    label(g, offer.name, r.x + r.w / 2, y + 155, 24, INK, 'center', 700, SERIF);
    wrap(g, offer.text, r.x + 27, y + 195, r.w - 54, 17, '#c9b9d2', 24);
    label(g, hot ? 'TAKE THIS KINDLING  →' : 'CLICK OR PRESS ' + (index + 1), r.x + r.w / 2, y + 262, 12, color, 'center', 800);
  });
  label(g, '+1 LIFE MENDED    ·    +18 HEARTH LIGHT    ·    YOUR BUILD STAYS WITH YOU', 640, 572, 12, PALETTE.teal, 'center', 700);
  drawBuild(g, game, 627);
}

function drawBuild(g, game, y) {
  const items = Object.entries(game.taken);
  if (!items.length) { label(g, 'Every choice changes how your next night plays.', 640, y, 16, DIM, 'center', 500, SERIF); return; }
  const width = Math.min(95, 800 / items.length);
  const left = 640 - items.length * width / 2;
  label(g, 'YOUR KINDLINGS', left - 22, y, 11, DIM, 'right', 700);
  items.forEach(([id, count], i) => {
    const x = left + i * width + width / 2;
    drawKindlingIcon(g, id, x, y, 28, game.time);
    if (count > 1) label(g, `×${count}`, x + 21, y + 8, 13, PALETTE.flame);
  });
}

export function drawResults(g, game, mouse, best) {
  const won = game.phase === 'won';
  const tint = won ? '#241527e8' : '#100b1aeb';
  g.fillStyle = tint;g.fillRect(0, 0, 1280, 720);
  if (won) {
    const dawn = g.createRadialGradient(640, 150, 10, 640, 200, 660);
    dawn.addColorStop(0, '#ffbe583d');dawn.addColorStop(1, '#e8784800');
    g.fillStyle = dawn;g.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + game.time * 0.025;
      g.strokeStyle = '#f3ba6920';g.lineWidth = 2;
      g.beginPath();g.moveTo(640 + Math.cos(a) * 125, 164 + Math.sin(a) * 125);g.lineTo(640 + Math.cos(a) * 570, 164 + Math.sin(a) * 570);g.stroke();
    }
  }
  flameTongue(g, 640, 127, 17, 52, Math.sin(game.time * 4) * 5);
  g.fillStyle = won ? PALETTE.flame : '#8e74a6';g.fill();
  label(g, won ? 'DAWN IS YOURS.' : 'EVEN LITTLE FIRES FALL.', 640, 190, won ? 63 : 52, won ? PALETTE.flame : INK, 'center', 500, SERIF);
  label(g, game.endReason, 640, 247, 21, '#cdbbd3', 'center');
  label(g, game.score.toLocaleString('en-US'), 640, 320, 66, INK, 'center', 800);
  label(g, game.score >= best && game.score > 0 ? 'PERSONAL BEST  ·  FINAL SCORE' : `FINAL SCORE  ·  BEST ${best.toLocaleString('en-US')}`, 640, 370, 12, PALETTE.teal, 'center', 800);
  const stats = [[won ? '10 / 10' : `${Math.max(0, game.wave - 1)} / 10`, 'NIGHTS KEPT'], [String(game.kills), 'GLOAM BANISHED'], [String(game.banked), 'EMBERS HOME'], [String(game.maxCombo), 'BEST CHAIN']];
  stats.forEach(([value, title], i) => {
    const x = 335 + i * 204;
    label(g, value, x, 437, 31, PALETTE.flame, 'center', 700);
    label(g, title, x, 471, 11, DIM, 'center', 800);
  });
  button(g, RESTART_BUTTON, won ? 'LIGHT ANOTHER WICK   ↻' : 'TRY ANOTHER WICK   ↻', hitRect(mouse, RESTART_BUTTON), 'ENTER / R to restart  ·  ESC to return to the title');
  drawBuild(g, game, 647);
  if (!won) label(g, 'Tip: gold embers restore hearth light when you carry them inside its circle.', 640, 690, 14, '#bba4c1', 'center');
}

function drawPause(g) {
  g.fillStyle = '#100a1bd9';g.fillRect(0, 0, 1280, 720);
  panel(g, 390, 212, 500, 296, '#ad8356', '#1e152bf5', 14);
  label(g, 'A breath between sparks.', 640, 272, 34, PALETTE.flame, 'center', 500, SERIF);
  label(g, 'The night can wait.', 640, 320, 19, DIM, 'center');
  label(g, 'ENTER / ESC / P   RESUME', 640, 381, 18, INK, 'center', 800);
  label(g, 'R   RESTART      ·      M   MUTE', 640, 421, 14, DIM, 'center');
  label(g, 'WASD move · hold click fire · Space dash · E flare', 640, 468, 15, '#cfb8d1', 'center');
}
