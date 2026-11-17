// Play-test policy: normal controls only, no state mutation. Not loaded by the shipped game.
export const upgradeOrder = ['twin', 'whiteheat', 'wildfire', 'bellows', 'beacon', 'cinders', 'pierce', 'arc', 'tallow', 'sunflare', 'mend', 'quickstep', 'magnet'];
export function chooseOffer(offers, hp = 5, light = 100) {
  const order = [...upgradeOrder];
  if (hp < 3) order.unshift('tallow');
  if (light < 35) order.unshift('mend');
  return offers.map((id, i) => ({ i, rank: order.indexOf(id) })).sort((a, b) => a.rank - b.rank)[0].i;
}
export function playPolicy(s) {
  const p = s.player, home = { x: 640, y: 384 };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const enemies = s.enemies.filter((e) => e.hp > 0);
  const target = enemies.map((e) => ({ e, priority: distance(p, e) + (['moth', 'crawler', 'brood', 'boss'].includes(e.type) ? distance(e, home) * 0.45 - 180 : 0) - (e.latched ? 250 : 0) })).sort((a, b) => a.priority - b.priority)[0]?.e;
  let destination = { x: home.x + Math.cos(s.time * 0.45) * 125, y: home.y + Math.sin(s.time * 0.45) * 100 };
  if (s.carry >= 6 || s.light < 45 && s.carry >= 3) destination = home;
  else {
    const drop = s.drops.map((d) => ({ d, score: distance(p, d) + distance(home, d) * 0.12 })).sort((a, b) => a.score - b.score)[0]?.d;
    if (drop && distance(drop, p) < 320) destination = drop;
    else if (target && distance(p, target) > 265) destination = { x: target.x * 0.5 + home.x * 0.5, y: target.y * 0.5 + home.y * 0.5 };
  }
  let dx = destination.x - p.x, dy = destination.y - p.y;
  const n = Math.hypot(dx, dy);
  if (n > 10) { dx /= n; dy /= n; } else { dx = 0; dy = 0; }
  let danger = false;
  for (const e of enemies) {
    const r = distance(p, e), personal = e.r + (e.type === 'hound' ? 95 : 58);
    if (r < personal && r > 0.01) { const strength = (personal - r) / personal * 4;dx += (p.x - e.x) / r * strength;dy += (p.y - e.y) / r * strength; }
    if (r < e.r + 45 || e.state === 'windup' && r < 160) danger = true;
  }
  for (const shot of s.shots || []) {
    const future = { x: shot.x + shot.vx * 0.12, y: shot.y + shot.vy * 0.12 };
    const r = distance(p, future);
    if (r < 70 && r > 0.1) { dx += (p.x - future.x) / r * 3;dy += (p.y - future.y) / r * 3; }
    if (r < 42) danger = true;
  }
  if (p.x < 90) dx += 1.6;
  if (p.x > 1190) dx -= 1.6;
  if (p.y < 160) dy += 1.6;
  if (p.y > 600) dy -= 1.6;
  const dead = 0.24;
  return { moveX: Math.abs(dx) > dead ? Math.sign(dx) : 0, moveY: Math.abs(dy) > dead ? Math.sign(dy) : 0, aimX: target?.x ?? 640, aimY: target?.y ?? 200, fire: Boolean(target), dash: danger && (p.dash ?? 0) <= 0, flare: s.flare >= 100 && (enemies.filter((e) => distance(p, e) < 195).length >= 3 || danger || target?.type === 'boss' && distance(target, p) < 180) };
}
