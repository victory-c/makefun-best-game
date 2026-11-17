// Campaign route, earned realm seals and a live tactical map of lantern-line geometry.
import { REALMS } from './realms.js';
import { TAU } from './mathutil.js';
const text = (g, value, x, y, size, color, align = 'left') => {
  g.font = `700 ${size}px "Trebuchet MS",sans-serif`;g.textAlign = align;g.textBaseline = 'middle';g.fillStyle = color;g.fillText(value, x, y);
};
export function drawRealmSeal(g, realm, x, y, earned, size = 17) {
  g.save();g.translate(x, y);
  g.strokeStyle = earned ? realm.color : '#51435f';g.fillStyle = earned ? realm.color + '22' : '#1a1426';g.lineWidth = 2;
  g.beginPath();g.arc(0, 0, size, 0, TAU);g.fill();g.stroke();
  const n = realm.id === 'courtyard' ? 4 : realm.id === 'fen' ? 6 : realm.id === 'archive' ? 3 : 8;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU - Math.PI / 2;
    g.beginPath();g.moveTo(Math.cos(a) * size * 0.25, Math.sin(a) * size * 0.25);g.lineTo(Math.cos(a) * size * 0.72, Math.sin(a) * size * 0.72);g.stroke();
  }
  g.restore();
}
export function drawCampaignRoute(g, game, y = 582) {
  text(g, 'FOUR REALMS · ONE PILGRIMAGE', 640, y - 34, 12, '#a8cdbd', 'center');
  for (let i = 0; i < REALMS.length; i++) {
    const realm = REALMS[i], x = 210 + i * 287;
    const earned = game.realmSeals.includes(realm.id);
    if (i < 3) {g.strokeStyle = earned ? '#a6d6ba77' : '#67537155';g.lineWidth = 2;g.beginPath();g.moveTo(x + 30, y);g.lineTo(x + 253, y);g.stroke();}
    drawRealmSeal(g, realm, x, y, earned, 19);
    text(g, realm.short, x, y + 35, 12, game.realm?.id === realm.id ? realm.color : '#b09cb9', 'center');
    text(g, earned ? 'KEPT ALIGHT' : `NIGHTS ${realm.first}${realm.last !== realm.first ? '–' + realm.last : ''}`, x, y + 55, 10, earned ? '#94e4ba' : '#7e718c', 'center');
  }
}
export function drawTacticalMap(g, game) {
  g.save();
  if (game.player.x > 1030 && game.player.y > 470) g.globalAlpha = 0.3;
  const x = 1053, y = 484, w = 191, h = 142;
  g.fillStyle = '#100e20d9';g.strokeStyle = '#82728d66';g.lineWidth = 1;
  g.beginPath();g.roundRect(x, y, w, h, 7);g.fill();g.stroke();
  text(g, game.realm.short, x + 12, y + 16, 11, game.realm.color);
  const mx = (wx) => x + 11 + wx / 1280 * (w - 22), my = (wy) => y + 34 + (wy - 80) / 560 * 81;
  g.strokeStyle = '#587a7044';g.strokeRect(x + 11, y + 34, w - 22, 81);
  for (const ward of game.wards) {
    g.strokeStyle = '#87f2c2';g.lineWidth = 1;g.beginPath();g.moveTo(mx(640), my(384));g.lineTo(mx(ward.x), my(ward.y));g.stroke();
    g.fillStyle = '#baffdc';g.fillRect(mx(ward.x) - 2, my(ward.y) - 2, 4, 4);
  }
  for (const enemy of game.enemies) {
    g.fillStyle = enemy.type === 'boss' ? '#ff86d8' : '#b573d3';g.beginPath();g.arc(mx(enemy.x), my(enemy.y), enemy.type === 'boss' ? 3.6 : 1.6, 0, TAU);g.fill();
  }
  g.fillStyle = '#ffbf6b';g.beginPath();g.arc(mx(640), my(384), 3, 0, TAU);g.fill();
  g.fillStyle = '#ffffff';g.beginPath();g.arc(mx(game.player.x), my(game.player.y), 2.8, 0, TAU);g.fill();
  text(g, `${game.wards.length} LIGHT LINES · ${game.wardSeeds} SEEDS`, x + 12, y + 129, 10, '#b4cfbd');
  g.restore();
}
