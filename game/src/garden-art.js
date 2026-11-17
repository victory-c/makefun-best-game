// Original garden ornament, painted once into the floor. Decoration never blocks movement.
import { TAU } from './mathutil.js';

export function paintForgottenGarden(g) {
  g.save();
  // Broken gallery arches at the edge of the garden; the centre stays clean for combat.
  for (const x of [142, 1138]) {
    g.fillStyle = '#30253d';g.strokeStyle = '#67506c55';g.lineWidth = 2;
    for (const y of [174, 548]) {
      g.beginPath();g.roundRect(x - 18, y - 42, 36, 74, 5);g.fill();g.stroke();
      g.fillStyle = '#44344d';g.fillRect(x - 23, y - 44, 46, 8);g.fillRect(x - 24, y + 27, 48, 9);
      g.fillStyle = '#201b30';g.fillRect(x - 10, y - 28, 5, 45);g.fillRect(x + 4, y - 28, 5, 45);
      g.fillStyle = '#30253d';
    }
    g.strokeStyle = '#51415b88';g.lineWidth = 7;
    g.beginPath();g.moveTo(x, 206);g.bezierCurveTo(x - 33, 310, x + 35, 410, x, 504);g.stroke();
    for (let i = 0; i < 7; i++) {
      const y = 234 + i * 43, side = i % 2 ? -1 : 1;
      g.fillStyle = i % 3 ? '#33433e' : '#494359';
      g.beginPath();g.moveTo(x, y);g.bezierCurveTo(x + side * 39, y - 26, x + side * 43, y + 20, x, y);g.fill();
      g.strokeStyle = '#75947c33';g.lineWidth = 1;
      g.beginPath();g.moveTo(x, y);g.lineTo(x + side * 24, y - 3);g.stroke();
    }
  }
  // Six-petalled ward engraved around the hearth, not a borrowed alphabet or symbol.
  g.translate(640, 384);
  g.strokeStyle = '#ac855123';g.lineWidth = 1.3;
  for (let i = 0; i < 6; i++) {
    g.save();g.rotate(i / 6 * TAU);
    g.beginPath();g.moveTo(105, 0);g.bezierCurveTo(146, -26, 172, -24, 195, 0);g.bezierCurveTo(172, 24, 146, 26, 105, 0);g.stroke();
    g.beginPath();g.moveTo(138, 0);g.lineTo(177, 0);g.stroke();g.restore();
  }
  g.restore();
  // Moonflowers mark the four corners in the same teal as a safe dash.
  for (const [x, y, side] of [[239, 166, -1], [1043, 171, 1], [224, 573, -1], [1056, 586, 1]]) {
    g.save();g.translate(x, y);
    g.strokeStyle = '#41504a';g.lineWidth = 3;
    g.beginPath();g.moveTo(side * 8, 32);g.quadraticCurveTo(-side * 6, 12, 0, -5);g.stroke();
    const halo = g.createRadialGradient(0, -5, 1, 0, -5, 50);
    halo.addColorStop(0, '#63d5bf12');halo.addColorStop(1, '#63d5bf00');
    g.fillStyle = halo;g.fillRect(-50, -55, 100, 100);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU - Math.PI / 2;
      g.fillStyle = i % 2 ? '#507f79' : '#618c84';
      g.beginPath();g.ellipse(Math.cos(a) * 9, -5 + Math.sin(a) * 9, 10, 5, a, 0, TAU);g.fill();
    }
    g.fillStyle = '#bdd9ac';g.beginPath();g.arc(0, -5, 4, 0, TAU);g.fill();
    g.restore();
  }
}
