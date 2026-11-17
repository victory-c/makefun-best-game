import test from 'node:test';
import assert from 'node:assert/strict';
import { Wickwarden, distanceToSegment } from '../game/src/game.js';
import { createEnemy, updateEnemy } from '../game/src/enemies.js';
import { damagePlayer } from '../game/src/player.js';
import { KINDLINGS, rollOffers } from '../game/src/upgrades.js';
import { createRng } from '../game/src/rng.js';
import { playPolicy, chooseOffer, chooseCamp } from './play-policy.mjs';
const idle = { moveX: 0, moveY: 0, aimX: 640, aimY: 200, fire: false, dash: false, flare: false };

function snapshot(g) {
  return { phase: g.phase, wave: g.wave, time: g.elapsed, nightTime: g.nightTime, hp: g.player.hp, light: g.hearth.light, carry: g.carry, flare: g.player.flare, player: { x: g.player.x, y: g.player.y, dash: g.player.dashCooldown }, enemies: g.enemies.map((e) => ({ type: e.type, x: e.x, y: e.y, r: e.r, hp: e.hp, latched: e.latched, state: e.state })), drops: g.drops, shots: g.enemyShots, wax: g.wax, wardSeeds: g.wardSeeds, wards: g.wards, hazards: g.hazards, purchases: g.purchases, campBought: g.campBought };
}

export function runPlaytest(seed = 7102026, maxTime = 600) {
  const game = new Wickwarden(seed);game.start();
  const nights = [];
  for (let i = 0; i < maxTime * 60 && !['won', 'lost'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') {
      nights.push({ wave: game.wave, time: Math.round(game.elapsed), hp: game.player.hp, light: Math.round(game.hearth.light), kills: game.kills });
      const purchase = chooseCamp(snapshot(game));
      if (purchase) game.purchase({ z: 'lantern', x: 'mending', c: 'seeds' }[purchase]);
      game.chooseKindling(chooseOffer(game.offers.map((o) => o.id), game.player.hp, game.hearth.light));
    }
    game.update(1 / 60, playPolicy(snapshot(game)));
    assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y));
    assert.ok(game.hearth.light >= 0 && game.hearth.light <= game.hearth.maxLight);
    assert.ok(game.enemies.length <= 110);
  }
  return { phase: game.phase, wave: game.wave, score: game.score, kills: game.kills, banked: game.banked, hp: game.player.hp, light: Math.round(game.hearth.light), time: Math.round(game.elapsed), taken: game.taken, seals: game.realmSeals, purchases: game.purchases, nights };
}

test('swept collision catches fast bolts and degenerate segments', () => {
  assert.equal(distanceToSegment(5, 3, 0, 0, 10, 0), 3);
  assert.equal(distanceToSegment(0, 4, 0, 0, 0, 0), 4);
});
test('hearth fuel banks only carried embers, bounded by its maximum', () => {
  const g = new Wickwarden();g.hearth.light = 20;g.carry = 12;g.bankEmbers();
  assert.equal(g.carry, 0);assert.equal(g.banked, 12);assert.equal(g.score, 240);assert.equal(g.hearth.light, 41.6);
  g.carry = 100;g.bankEmbers();assert.equal(g.hearth.light, g.hearth.maxLight);
});
test('a hit respects invulnerability and death triggers a loss', () => {
  const g = new Wickwarden();g.start();g.player.invuln = 0;
  assert.equal(damagePlayer(g.player, g, 300, 300), true);
  assert.equal(damagePlayer(g.player, g, 300, 300), false);
  assert.equal(g.player.hp, 4);
  g.player.hp = 1;g.player.invuln = 0;damagePlayer(g.player, g, 300, 300);g.stopTime = 0;g.update(1 / 60, idle);
  assert.equal(g.phase, 'lost');
});
test('hollowbacks latch and moths spend their bodies to extinguish the hearth', () => {
  const g = new Wickwarden();g.start();
  const moth = createEnemy('moth', 670, 384, 1);updateEnemy(moth, g, 1 / 60);
  assert.ok(moth.dead && moth.consumed);assert.equal(g.hearth.light, 95);
  const crawler = createEnemy('crawler', 680, 384, 1);updateEnemy(crawler, g, 1);
  assert.ok(crawler.latched);assert.equal(g.hearth.light, 86);
});
test('kindling offers are unique, capped, and each changes a build', () => {
  const rng = createRng(119);
  for (let i = 0; i < 60; i++) {
    const offers = rollOffers(rng, { twin: 3 });
    assert.equal(new Set(offers.map((o) => o.id)).size, 3);assert.ok(!offers.some((o) => o.id === 'twin'));
  }
  for (const kindling of KINDLINGS) {
    const g = new Wickwarden();g.hearth.light = 20;
    const before = JSON.stringify([g.player, g.hearth]);kindling.apply(g.player, g);
    assert.notEqual(JSON.stringify([g.player, g.hearth]), before, kindling.id);
  }
});
test('flare clears local bullets and damages foes but not distant ones', () => {
  const g = new Wickwarden();g.start();
  g.enemies = [createEnemy('crawler', 640, 500, 1), createEnemy('crawler', 50, 180, 1)];
  g.enemyShots = [{x:640,y:500},{x:50,y:180}];
  g.triggerFlare(640, 500, 200);
  assert.ok(g.enemies[0].hp < 95);assert.equal(g.enemies[1].hp, 95);assert.equal(g.enemyShots.length, 1);
});
test('doing nothing loses: the night does not wait for the player', () => {
  const g = new Wickwarden();g.start();
  for (let i = 0; i < 6000 && g.phase === 'play'; i++) g.update(1 / 60, idle);
  assert.equal(g.phase, 'lost');
});
test('ten nights can be won through normal move, fire, dash, flare and draft actions', () => {
  const result = runPlaytest();console.log('PLAYTEST', JSON.stringify(result));
  assert.equal(result.phase, 'won');assert.equal(result.wave, 10);assert.ok(result.banked > 30);
});
test('the same seed and policy replay to the same gameplay result', () => {
  const a = runPlaytest(9701), b = runPlaytest(9701);assert.deepEqual(a, b);
});
