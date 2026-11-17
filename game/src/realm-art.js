// A different hand-drawn silhouette for each realm, baked into its floor once.
import { TAU } from './mathutil.js';
export function paintRealmLandmarks(g, realm) {
  if (!realm || realm.id === 'courtyard') return;
  g.save();
  for (const side of [-1, 1]) {
    const x = side < 0 ? 175 : 1105;
    if (realm.id === 'fen') {
      for (let i = 0; i < 7; i++) {
        const y = 205 + i * 54;
        g.fillStyle = i % 2 ? '#375c69' : '#477d88';g.strokeStyle = '#9bdcd055';g.lineWidth = 1;
        g.beginPath();g.moveTo(x - 14, y + 24);g.lineTo(x - 9, y - 16);g.lineTo(x + 3, y - 42);g.lineTo(x + 16, y + 18);g.closePath();g.fill();g.stroke();
        g.strokeStyle = '#a1fff066';g.beginPath();g.moveTo(x + 3, y - 42);g.lineTo(x, y + 18);g.stroke();
      }
    } else if (realm.id === 'archive') {
      g.fillStyle = '#453047';g.fillRect(x - 25, 180, 50, 390);
      for (let row = 0; row < 5; row++) {
        const y = 190 + row * 74;
        g.fillStyle = '#1c1528';g.fillRect(x - 19, y, 38, 62);
        for (let book = 0; book < 5; book++) {
          g.fillStyle = ['#865e70', '#866f4d', '#536770', '#6b5082', '#72664c'][(book + row) % 5];
          g.fillRect(x - 16 + book * 7, y + 6 + book % 3 * 4, 5, 48 - book % 3 * 4);
          g.fillStyle = '#d5bd8d55';g.fillRect(x - 15 + book * 7, y + 12, 3, 2);
        }
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const y = 210 + i * 82;
        g.strokeStyle = '#8aa9c86a';g.lineWidth = 2;g.beginPath();g.arc(x, y, 20, 0, TAU);g.stroke();
        g.fillStyle = '#a2bee066';g.beginPath();g.moveTo(x, y - 27);g.lineTo(x + 8, y);g.lineTo(x, y + 27);g.lineTo(x - 8, y);g.fill();
        g.strokeStyle = '#d1d6ad44';g.beginPath();g.moveTo(x - 27, y);g.lineTo(x + 27, y);g.stroke();
      }
    }
  }
  g.restore();
}
