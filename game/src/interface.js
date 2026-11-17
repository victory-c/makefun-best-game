// Canvas interface: title, live HUD, upgrade draft, pause and honest end-of-run statistics.
import { PALETTE, TOTAL_WAVES } from './config.js';
import { roundRect, flameTongue } from './arena.js';
import { drawPlayer } from './player.js';
import { KINDLINGS, RARITY_COLORS, drawKindlingIcon } from './upgrades.js';
import { NIGHTS } from './waves.js';
import { isMuted } from './audio.js';
import { clamp, TAU } from './mathutil.js';
import { DISCIPLINES, DIFFICULTIES } from './loadouts.js';
import { CAMP_STOCK, campPrice } from './camp.js';
import { REALMS } from './realms.js';
import { drawCampaignRoute, drawTacticalMap, drawRealmSeal } from './world-map.js';

const INK = '#fbefd5';
const DIM = '#b8a9c8';
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
export const START_BUTTON = { x: 92, y: 509, w: 330, h: 64 };
export const RESTART_BUTTON = { x: 466, y: 534, w: 348, h: 60 };
export const OFFER_RECTS = [0, 1, 2].map((i) => ({ x: 44 + i * 267, y: 230, w: 244, h: 287 }));
export const CANDLE_RECTS = [0, 1, 2].map((i) => ({ x: 709 + i * 148, y: 560, w: 137, h: 47 }));
export const DIFFICULTY_RECTS = [0, 1, 2].map((i) => ({ x: 709 + i * 148, y: 640, w: 137, h: 34 }));
export const CAMP_RECTS = [0, 1, 2].map((i) => ({ x: 880, y: 280 + i * 75, w: 337, h: 65 }));
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

export function drawTitle(g, game, mouse, best, settings = { discipline: 'wick', difficulty: 'warden', journal: { seals: [] } }) {
  const fade = g.createLinearGradient(0, 0, 1280, 0);
  fade.addColorStop(0, '#110b1bf5'); fade.addColorStop(0.5, '#110b1bee'); fade.addColorStop(1, '#110b1b33');
  g.fillStyle = fade; g.fillRect(0, 0, 1280, 720);
  label(g, 'A LITTLE CANDLE. A VERY LONG NIGHT.', 95, 81, 15, PALETTE.teal, 'left', 800);
  label(g, 'WICK', 88, 165, 101, INK, 'left', 700, SERIF);
  label(g, 'WARDEN', 88, 257, 101, INK, 'left', 700, SERIF);
  line(g, 94, 325, 478, '#b98448');
  label(g, 'Keep the last light alive.', 95, 366, 27, PALETTE.flame, 'left', 600, SERIF);
  wrap(g, 'Cross four realms. Carry embers home, weave lantern defenses and shape your candle. Defeat Mother Umbra. See the dawn.', 95, 411, 460, 19, '#cdbbd3', 28);
  button(g, START_BUTTON, 'LIGHT THE WICK   →', hitRect(mouse, START_BUTTON), 'ENTER to begin  ·  A complete run takes about 5 minutes');
  label(g, 'MOVE', 97, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'WASD / arrows', 97, 657, 17);
  label(g, 'AIM + FIRE', 278, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'Mouse + hold click', 278, 657, 17);
  label(g, 'DASH / FLARE', 488, 633, 12, PALETTE.teal, 'left', 800);
  label(g, 'Space / E', 488, 657, 17);
  drawTitleHero(g, game.time, settings.discipline);
  label(g, `GARDEN JOURNAL  ${settings.journal.seals.length} / 4 SEALS    ·    BEST ${best.toLocaleString('en-US')}`, 925, 65, 12, '#d6bb9a', 'center', 700);
  label(g, 'CHOOSE YOUR CANDLE', 925, 539, 11, PALETTE.teal, 'center', 800);
  DISCIPLINES.forEach((d, i) => {
    const r = CANDLE_RECTS[i], chosen = settings.discipline === d.id;
    panel(g, r.x, r.y, r.w, r.h, chosen ? d.color : '#5c4867', chosen ? '#3c2d38' : '#191225', 5);
    label(g, d.name, r.x + r.w / 2, r.y + 16, 17, chosen ? d.color : INK, 'center', 700, SERIF);
    label(g, d.subtitle, r.x + r.w / 2, r.y + 34, 8, DIM, 'center', 800);
  });
  const chosenNight = DIFFICULTIES.find((d) => d.id === settings.difficulty) || DIFFICULTIES[1];
  label(g, `${chosenNight.text.toUpperCase()} · SCORE ×${chosenNight.score}`, 925, 625, 10, PALETTE.teal, 'center', 800);
  DIFFICULTIES.forEach((d, i) => {
    const r = DIFFICULTY_RECTS[i], chosen = settings.difficulty === d.id;
    panel(g, r.x, r.y, r.w, r.h, chosen ? PALETTE.flame : '#5c4867', chosen ? '#453429' : '#191225', 5);
    label(g, d.name, r.x + r.w / 2, r.y + 17, 14, chosen ? PALETTE.flame : DIM, 'center', 700);
  });
  label(g, `M  ${isMuted() ? 'SOUND OFF' : 'SOUND ON'}     ·     P / ESC  PAUSE`, 1234, 690, 12, '#a395b5', 'right');
}

function drawTitleHero(g, time, discipline) {
  const cx = 925, cy = 325;
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
  drawPlayer(g, { x: cx, y: cy, vx: 0, aim: -0.55, alive: true, invuln: 0, recoil: 0, trail: [], discipline, stats: { orbiters: 0 } }, time);
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
  const chosen = DISCIPLINES.find((d) => d.id === discipline) || DISCIPLINES[0];
  label(g, chosen.name.toUpperCase(), cx, 486, 15, chosen.color, 'center', 800);
  label(g, chosen.text, cx, 512, 16, '#cdbbd3', 'center', 500, SERIF);
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
  label(g, game.discipline.name.toUpperCase(), 253, 25, 12, DIM, 'left', 800);
  label(g, game.score.toLocaleString('en-US'), 1248, 39, 32, INK, 'right', 800);
  label(g, `BEST CHAIN ${game.maxCombo}     ·     ${game.kills} BANISHED`, 1248, 73, 12, DIM, 'right', 700);
  const remaining = game.enemies.filter((e) => !e.dead).length + game.rifts.length;
  label(g, remaining ? `${remaining} IN THE GLOAM` : 'LISTEN TO THE DARK…', 32, 96, 11, '#ae97c5', 'left', 700);
  label(g, `${game.realm.short}  ·  ${game.difficulty.name.toUpperCase()}  ·  ${game.realm.rule}`, 254, 96, 10, game.realm.color, 'left', 700);
  if (game.combo >= 5 && game.comboTime > 0) {
    label(g, `${game.combo} CHAIN`, 1225, 127, 28, PALETTE.teal, 'right', 800);
    meter(g, 1093, 148, 130, 4, game.comboTime / 1.6, PALETTE.teal);
  }
  drawBottomBar(g, game);
  drawTacticalMap(g, game);
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
    label(g, 'Carry embers home. F plants lanterns; their light lines burn.', 640, 599, 16, INK, 'center');
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
  label(g, `EMBERS ${game.carry}  ·  WAX ${game.wax}`, 306, 676, 17, PALETTE.ember, 'left', 800);
  label(g, `F  WEAVE LIGHT [${game.wardSeeds}]  ·  ${game.banked} embers home`, 306, 700, 12, DIM);
  const ready = p.flare >= 100;
  label(g, 'E / RIGHT CLICK', 677, 675, 12, ready ? PALETTE.flame : DIM, 'left', 800);
  label(g, ready ? 'SUNFLARE READY' : `SUNFLARE  ${Math.floor(p.flare)}%`, 677, 699, 15, ready ? PALETTE.flame : INK, 'left', 800);
  meter(g, 862, 682, 159, 10, p.flare / 100, ready ? '#fff1bd' : '#d69a4e');
  label(g, 'ESC  PAUSE', 1248, 676, 13, DIM, 'right');
  label(g, `M  ${isMuted() ? 'MUTED' : 'SOUND ON'}`, 1248, 700, 13, DIM, 'right');
}

export function drawKindlingDraft(g, game, mouse) {
  g.fillStyle = '#0e0919e8';g.fillRect(0, 0, 1280, 720);
  label(g, `NIGHT ${game.wave} SURVIVED · ${game.realm.name.toUpperCase()}`, 640, 79, 13, PALETTE.teal, 'center', 800);
  label(g, 'Tend the fire. Shape the journey.', 640, 128, 43, INK, 'center', 500, SERIF);
  label(g, 'Spend wax at camp if you wish. Choose one kindling to face the next night.', 640, 179, 17, DIM, 'center');
  game.offers.forEach((offer, index) => {
    const r = OFFER_RECTS[index], color = RARITY_COLORS[offer.rarity], hot = hitRect(mouse, r);
    const y = r.y - (hot ? 5 : 0);
    panel(g, r.x, y, r.w, r.h, hot ? color : '#63506f', hot ? '#302036fa' : '#1d152bf5', 9);
    label(g, String(index + 1), r.x + 18, y + 24, 15, color, 'left', 800);
    label(g, offer.rarity.toUpperCase(), r.x + r.w - 18, y + 24, 10, color, 'right', 800);
    drawKindlingIcon(g, offer.id, r.x + r.w / 2, y + 90, 60, game.time);
    label(g, offer.name, r.x + r.w / 2, y + 150, 21, INK, 'center', 700, SERIF);
    wrap(g, offer.text, r.x + 20, y + 187, r.w - 40, 15, '#c9b9d2', 22);
    label(g, hot ? 'TAKE KINDLING →' : 'CLICK OR PRESS ' + (index + 1), r.x + r.w / 2, y + 267, 11, color, 'center', 800);
  });
  panel(g, 861, 230, 374, 287, '#866844', '#241b24f5', 9);
  label(g, 'THE WAYFARER’S CAMP', 881, 252, 15, PALETTE.flame, 'left', 700, SERIF);
  label(g, `${game.wax} WAX`, 1215, 252, 15, PALETTE.teal, 'right', 800);
  CAMP_STOCK.forEach((item, index) => {
    const r = CAMP_RECTS[index], price = campPrice(game, item), bought = game.campBought === item.id;
    const available = !game.campBought && game.wax >= price;
    panel(g, r.x, r.y, r.w, r.h, available && hitRect(mouse, r) ? PALETTE.flame : '#6d5260', available ? '#3a2930' : '#221b28', 5);
    label(g, `${item.key.toUpperCase()}  ${item.name}`, r.x + 12, r.y + 18, 14, available ? INK : DIM, 'left', 800);
    label(g, bought ? 'BOUGHT' : `${price} WAX`, r.x + r.w - 12, r.y + 18, 11, bought ? PALETTE.teal : PALETTE.ember, 'right', 800);
    wrap(g, item.text, r.x + 12, r.y + 39, r.w - 24, 12, '#baa9c0', 16);
  });
  label(g, 'ONE CAMP PURCHASE PER NIGHT · KINDLING IS FREE', 1048, 533, 9, '#baaa9a', 'center', 700);
  drawCampaignRoute(g, game, 584);
  drawBuild(g, game, 677);
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
  label(g, `${game.discipline.name} · ${game.difficulty.name} — ${game.endReason}`, 640, 247, 19, '#cdbbd3', 'center');
  label(g, game.score.toLocaleString('en-US'), 640, 320, 66, INK, 'center', 800);
  label(g, game.score >= best && game.score > 0 ? 'PERSONAL BEST  ·  FINAL SCORE' : `FINAL SCORE  ·  BEST ${best.toLocaleString('en-US')}`, 640, 370, 12, PALETTE.teal, 'center', 800);
  const stats = [[won ? '10 / 10' : `${Math.max(0, game.wave - 1)} / 10`, 'NIGHTS KEPT'], [String(game.kills), 'GLOAM BANISHED'], [String(game.banked), 'EMBERS HOME'], [String(game.maxCombo), 'BEST CHAIN']];
  stats.forEach(([value, title], i) => {
    const x = 335 + i * 204;
    label(g, value, x, 437, 31, PALETTE.flame, 'center', 700);
    label(g, title, x, 471, 11, DIM, 'center', 800);
  });
  button(g, RESTART_BUTTON, won ? 'LIGHT ANOTHER WICK   ↻' : 'TRY ANOTHER WICK   ↻', hitRect(mouse, RESTART_BUTTON), 'ENTER / R to restart  ·  ESC to return to the title');
  label(g, 'REALMS KEPT', 470, 660, 11, DIM, 'right', 800);
  REALMS.forEach((realm, i) => drawRealmSeal(g, realm, 522 + i * 67, 660, game.realmSeals.includes(realm.id), 15));
  label(g, `${game.realmSeals.length} / 4`, 802, 660, 15, PALETTE.teal, 'left', 800);
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
