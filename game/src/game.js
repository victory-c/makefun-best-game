// The simulation owns combat, carrying embers, hearth fuel and the complete win/lose loop.
// Drawing and browser input live elsewhere; this class also runs under Node for balance tests.
import { HEARTH, PLAYER, TOTAL_WAVES, COMBO_WINDOW, PALETTE } from './config.js';
import { createRng } from './rng.js';
import { clamp, dist, normalize } from './mathutil.js';
import { createPlayer, updatePlayer, orbiterPositions, damagePlayer } from './player.js';
import { createEnemy, updateEnemy } from './enemies.js';
import { createEffects, updateEffects, burst, ring, floatText, scorch } from './particles.js';
import { rollOffers } from './upgrades.js';
import { beginNight, updateNight } from './waves.js';
import { sfx, setMusicIntensity } from './audio.js';
import { DIFFICULTIES, configureCandle } from './loadouts.js';
import { enterRealm, updateRealm, movementThroughTerrain } from './realms.js';
import { plantLightWard, updateLightWards } from './light-wards.js';
import { purchaseSupply } from './camp.js';

export class Wickwarden {
  constructor(seed = 7102026, options = {}) {
    this.rng = createRng(seed);
    this.seed = seed;
    this.phase = 'title';
    this.wave = 0;
    this.frame = 0;
    this.time = 0;
    this.elapsed = 0;
    this.nightTime = 0;
    this.score = 0;
    this.kills = 0;
    this.banked = 0;
    this.carry = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTime = 0;
    this.taken = {};
    this.offers = [];
    this.enemies = [];
    this.bolts = [];
    this.enemyShots = [];
    this.drops = [];
    this.rifts = [];
    this.effects = createEffects();
    this.hearth = { ...HEARTH, light: HEARTH.maxLight, radiusBoost: 1, beacon: 0, hurtFlash: 0, shotTimer: 0 };
    this.player = createPlayer(HEARTH.x, HEARTH.y + 125);
    this.discipline = configureCandle(this.player, options.discipline);
    this.difficulty = DIFFICULTIES.find((d) => d.id === options.difficulty) || DIFFICULTIES[1];
    this.realm = null;
    this.realmSeals = [];
    this.hazards = [];
    this.wards = [];
    this.wardSeeds = 2;
    this.wax = 8;
    this.purchases = {};
    this.campBought = null;
    this.gloamSlow = 1;
    this.flareTime = 0;
    this.shakeAmount = 0;
    this.stopTime = 0;
    this.hurtFlash = 0;
    this.banner = 0;
    this.bankPulse = 0;
    this.endReason = '';
    this.resultTime = 0;
    this.helpTime = 10;
  }

  start() { if (this.phase === 'title') beginNight(this); }
  shake(power) { this.shakeAmount = Math.max(this.shakeAmount, power); }
  hitStop(seconds) { this.stopTime = Math.max(this.stopTime, seconds); }
  spawnEnemy(type, x, y) {
    if (this.enemies.length >= 110) return;
    const enemy = createEnemy(type, x, y, this.wave);
    enemy.hp = Math.round(enemy.hp * this.difficulty.health);
    enemy.maxHp = enemy.hp;
    enemy.speed *= this.difficulty.speed;
    this.enemies.push(enemy);
  }
  terrainFactor(x, y) { return movementThroughTerrain(this, x, y); }
  enterRealm() { enterRealm(this); }
  purchase(id) { const bought = purchaseSupply(this, id);if (bought) sfx.choose();return bought; }

  update(dt, controls) {
    this.time += dt;
    updateEffects(this.effects, dt);
    this.shakeAmount *= Math.exp(-dt * 13);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
    this.bankPulse = Math.max(0, this.bankPulse - dt);
    this.hearth.hurtFlash = Math.max(0, this.hearth.hurtFlash - dt);
    if (this.phase === 'won' || this.phase === 'lost') this.resultTime += dt;
    if (this.phase !== 'play') return;
    if (this.stopTime > 0) { this.stopTime -= dt; return; }
    this.frame += 1;
    this.elapsed += dt;
    this.helpTime -= dt;
    this.banner = Math.max(0, this.banner - dt);
    this.flareTime = Math.max(0, this.flareTime - dt);
    this.gloamSlow = this.flareTime > 0 ? 0.4 : 1;
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (!this.comboTime) this.combo = 0;
    this.hearth.light = Math.max(0, this.hearth.light - dt * (0.48 + this.wave * 0.025) * this.difficulty.drain);
    if (controls.plant && !plantLightWard(this)) {
      const reason = !this.wardSeeds ? 'No seeds — visit camp' : dist(this.player.x, this.player.y, 640, 384) < 142 ? 'Plant beyond the hearth ring' : 'Spread your lanterns farther';
      floatText(this.effects, this.player.x, this.player.y - 35, reason, PALETTE.uiDim, 13);
    }
    updateRealm(this, dt);
    updatePlayer(this.player, controls, this, dt);
    for (const enemy of [...this.enemies]) if (!enemy.dead) updateEnemy(enemy, this, dt);
    updateLightWards(this, dt);
    this.updateBolts(dt);
    this.updateEnemyShots(dt);
    this.updateContact(dt);
    this.updateEmbers(dt);
    this.updateBeacon(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (!this.player.alive) return this.finish(false, 'Your wick went out.');
    if (this.hearth.light <= 0) return this.finish(false, 'The last hearth fell dark.');
    updateNight(this, dt);
    setMusicIntensity(Math.min(1, this.wave / 12 + (1 - this.hearth.light / this.hearth.maxLight) * 0.4));
  }

  damageHearth(amount, x, y) {
    this.hearth.light = Math.max(0, this.hearth.light - amount * this.difficulty.drain);
    this.hearth.hurtFlash = 0.5;
    this.shake(5);
    ring(this.effects, x, y, 30, PALETTE.gloamEye, 0.3);
    sfx.hearthHit();
  }

  drainHearth(amount, enemy) {
    this.hearth.light = Math.max(0, this.hearth.light - amount * this.difficulty.drain);
    this.hearth.hurtFlash = 0.25;
    if (this.frame % 35 === 0) burst(this.effects, enemy.x, enemy.y, { count: 4, color: PALETTE.gloamEye, speed: 45, size: 2 });
  }

  damageEnemy(enemy, amount, x, y) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 0.08;
    const [nx, ny] = normalize(enemy.x - x, enemy.y - y);
    enemy.vx += nx * (enemy.type === 'boss' ? 12 : 75);
    enemy.vy += ny * (enemy.type === 'boss' ? 12 : 75);
    burst(this.effects, enemy.x, enemy.y, { count: 3, color: enemy.def.eye, speed: 100, size: 2, life: 0.22 });
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.combo += 1;
    this.comboTime = COMBO_WINDOW;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 5));
    const points = enemy.def.score * multiplier;
    this.score += points;
    this.player.flare = Math.min(100, this.player.flare + enemy.def.charge * this.player.stats.flareRate);
    const big = ['boss', 'crawler', 'brood'].includes(enemy.type);
    burst(this.effects, enemy.x, enemy.y, { count: big ? 30 : 12, color: enemy.def.eye, speed: big ? 240 : 170, size: big ? 4 : 2.5 });
    scorch(this.effects, enemy.x, enemy.y, enemy.r * 1.4);
    if (big) { ring(this.effects, enemy.x, enemy.y, enemy.r * 2, PALETTE.ember); this.shake(enemy.type === 'boss' ? 16 : 4); }
    if (big || this.combo % 5 === 0) floatText(this.effects, enemy.x, enemy.y - 20, `+${points}`, PALETTE.flame, big ? 24 : 18);
    const count = enemy.type === 'boss' ? 16 : big ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(40, 110);
      this.drops.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 23, age: 0, value: 1 });
    }
    if (enemy.type === 'brood') {
      for (let i = 0; i < 3; i++) this.spawnEnemy('moth', enemy.x + (i - 1) * 18, enemy.y + 12);
    }
    if (enemy.type === 'boss') { this.hitStop(0.18); this.enemyShots.length = 0; this.hearth.light = Math.min(this.hearth.maxLight, this.hearth.light + 20); }
    sfx.kill(big);
  }

  updateBolts(dt) {
    for (const bolt of this.bolts) {
      const x0 = bolt.x, y0 = bolt.y;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      for (const e of this.enemies) {
        if (e.dead || bolt.hits.includes(e)) continue;
        if (distanceToSegment(e.x, e.y, x0, y0, bolt.x, bolt.y) > e.r + 5) continue;
        bolt.hits.push(e);
        this.damageEnemy(e, bolt.damage, x0, y0);
        sfx.hit();
        const stats = this.player.stats;
        if (!bolt.beacon && stats.explode) {
          const radius = 35 + stats.explode * 13;
          ring(this.effects, bolt.x, bolt.y, radius, PALETTE.coal, 0.22, 2);
          for (const other of this.enemies) if (other !== e && !other.dead && dist(e.x, e.y, other.x, other.y) < radius + other.r) this.damageEnemy(other, bolt.damage * 0.45, e.x, e.y);
        }
        if (!bolt.beacon && this.rng.chance(stats.chain)) {
          const other = this.enemies.filter((o) => o !== e && !o.dead && dist(o.x, o.y, e.x, e.y) < 170).sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y))[0];
          if (other) {
            this.effects.rings.push({ x: (e.x + other.x) / 2, y: (e.y + other.y) / 2, radius: dist(e.x, e.y, other.x, other.y) / 2, color: PALETTE.teal, life: 0.15, max: 0.15, width: 2 });
            this.damageEnemy(other, bolt.damage * 0.7, e.x, e.y);
          }
        }
        if (bolt.hits.length > bolt.pierce) { bolt.life = 0; break; }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0 && b.x > -40 && b.x < 1320 && b.y > 40 && b.y < 760);
  }

  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.life -= dt;
      const px = shot.x, py = shot.y;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (distanceToSegment(this.player.x, this.player.y, px, py, shot.x, shot.y) < shot.r + PLAYER.radius) {
        if (damagePlayer(this.player, this, shot.x, shot.y)) shot.life = 0;
      }
      if (dist(shot.x, shot.y, this.hearth.x, this.hearth.y) < this.hearth.radius + shot.r) {
        shot.life = 0;
        this.hearth.light = Math.max(0, this.hearth.light - 0.8);
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => s.life > 0 && s.x > -40 && s.x < 1320 && s.y > 30 && s.y < 760);
  }

  updateContact(dt) {
    const p = this.player;
    const orbiters = orbiterPositions(p);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < e.r + PLAYER.radius) {
        if (p.dashTimer > 0) this.damageEnemy(e, 180 * dt, p.x, p.y);
        else damagePlayer(p, this, e.x, e.y);
      }
      for (const [x, y] of orbiters) if (dist(x, y, e.x, e.y) < e.r + 9) this.damageEnemy(e, 65 * dt, x, y);
    }
  }

  updateEmbers(dt) {
    const p = this.player;
    let collected = 0;
    for (const ember of this.drops) {
      ember.age += dt;
      ember.life -= dt;
      const distance = dist(ember.x, ember.y, p.x, p.y);
      if (distance < p.stats.pickupRadius) {
        const [nx, ny] = normalize(p.x - ember.x, p.y - ember.y);
        ember.vx += nx * dt * 1600;
        ember.vy += ny * dt * 1600;
      }
      ember.vx *= Math.exp(-dt * 2.8);
      ember.vy *= Math.exp(-dt * 2.8);
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (distance < 18) { ember.life = 0; this.carry += ember.value; collected++; this.score += Math.round(5 * p.stats.emberValue); }
    }
    this.drops = this.drops.filter((d) => d.life > 0);
    if (collected) sfx.pickup(this.carry);
    if (this.carry >= 3 && dist(p.x, p.y, this.hearth.x, this.hearth.y) < 103) this.bankEmbers();
  }

  bankEmbers() {
    if (!this.carry) return;
    const count = this.carry;
    this.banked += count;
    this.wax += count;
    this.carry = 0;
    const restored = Math.min(this.hearth.maxLight - this.hearth.light, count * 1.8);
    this.hearth.light += restored;
    this.score += count * 20;
    this.player.flare = Math.min(100, this.player.flare + count * 2 * this.player.stats.flareRate);
    this.effects.texts = this.effects.texts.filter((t) => !t.text.startsWith('STOKED'));
    floatText(this.effects, this.hearth.x, this.hearth.y - 96, `STOKED +${count}`, PALETTE.teal, 20);
    burst(this.effects, this.hearth.x, this.hearth.y - 18, { count: 24, color: PALETTE.ember, speed: 160, life: 0.8 });
    ring(this.effects, this.hearth.x, this.hearth.y, 125, PALETTE.teal, 0.6, 3);
    this.bankPulse = 0.8;
    sfx.choose();
  }

  triggerFlare(x, y, radius) {
    ring(this.effects, x, y, radius, PALETTE.flame, 0.65, 16);
    ring(this.effects, x, y, radius * 0.75, PALETTE.hot, 0.5, 6);
    burst(this.effects, x, y, { count: 70, color: PALETTE.ember, speed: 520, size: 4, life: 0.8 });
    for (const e of this.enemies) if (!e.dead && dist(e.x, e.y, x, y) < radius + e.r) this.damageEnemy(e, PLAYER.flareDamage * (1 + this.wave * 0.06), x, y);
    this.enemyShots = this.enemyShots.filter((s) => dist(s.x, s.y, x, y) > radius);
    if (dist(x, y, this.hearth.x, this.hearth.y) < radius) this.hearth.light = Math.min(this.hearth.maxLight, this.hearth.light + 6);
    this.flareTime = 0.8;
    this.shake(12);
    this.hitStop(0.055);
    floatText(this.effects, x, y - 50, 'SUNFLARE', PALETTE.hot, 30);
    sfx.flare();
  }

  updateBeacon(dt) {
    const h = this.hearth;
    h.shotTimer -= dt;
    if (!h.beacon || h.shotTimer > 0) return;
    const target = this.enemies.filter((e) => !e.dead && dist(e.x, e.y, h.x, h.y) < 390).sort((a, b) => dist(a.x, a.y, h.x, h.y) - dist(b.x, b.y, h.x, h.y))[0];
    if (!target) return;
    h.shotTimer = 0.55 / h.beacon;
    const [nx, ny] = normalize(target.x - h.x, target.y - h.y);
    this.bolts.push({ x: h.x, y: h.y - 10, vx: nx * 580, vy: ny * 580, life: 0.8, damage: 15, pierce: 0, hits: [], beacon: true });
  }

  clearNight() {
    if (this.wave === this.realm.last && !this.realmSeals.includes(this.realm.id)) this.realmSeals.push(this.realm.id);
    this.bankEmbers();
    this.hearth.light = Math.min(this.hearth.maxLight, this.hearth.light + HEARTH.regenBetweenWaves);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
    this.score += 150 * this.wave;
    this.enemyShots.length = 0;
    this.bolts.length = 0;
    sfx.waveClear();
    if (this.wave === TOTAL_WAVES) return this.finish(true, 'You kept the last light alive.');
    this.phase = 'upgrade';
    this.offers = rollOffers(this.rng, this.taken);
    this.banner = 0;
  }

  chooseKindling(index) {
    if (this.phase !== 'upgrade' || !this.offers[index]) return false;
    const choice = this.offers[index];
    this.taken[choice.id] = (this.taken[choice.id] || 0) + 1;
    choice.apply(this.player, this);
    this.drops.length = 0;
    this.offers = [];
    this.player.flare = Math.min(100, this.player.flare + 25);
    sfx.choose();
    beginNight(this);
    return true;
  }

  finish(won, reason) {
    this.phase = won ? 'won' : 'lost';
    this.endReason = reason;
    this.resultTime = 0;
    if (won) {
      this.score += Math.round(this.hearth.light * 25 + this.player.hp * 300);
      ring(this.effects, this.hearth.x, this.hearth.y, 750, PALETTE.ember, 2, 20);
      burst(this.effects, this.hearth.x, this.hearth.y, { count: 160, color: PALETTE.flame, speed: 500, size: 5, life: 2 });
      sfx.win();
    } else sfx.lose();
    this.score = Math.round(this.score * this.difficulty.score);
  }
}

export function distanceToSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((x - ax) * dx + (y - ay) * dy) / length2, 0, 1) : 0;
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}
