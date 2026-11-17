import test from 'node:test';
import assert from 'node:assert/strict';
import { Wickwarden } from '../game/src/game.js';
import { REALMS, realmForNight, updateRealm } from '../game/src/realms.js';
import { plantLightWard, updateLightWards } from '../game/src/light-wards.js';
import { campPrice, CAMP_STOCK } from '../game/src/camp.js';
import { readJournal, recordJourney } from '../game/src/profile.js';

test('three candle disciplines change actual weapons and survival stats', () => {
  const wick = new Wickwarden(), nettle = new Wickwarden(1, { discipline: 'nettle' }), glint = new Wickwarden(1, { discipline: 'glint' });
  assert.equal(wick.player.stats.bolts, 1);assert.equal(nettle.player.stats.bolts, 3);
  assert.ok(nettle.player.stats.fireDelay > wick.player.stats.fireDelay);
  assert.equal(glint.player.hp, 4);assert.ok(glint.player.stats.chain > 0);assert.ok(glint.player.stats.speed > wick.player.stats.speed);
});
test('difficulty changes real enemy health, speed, drain and end-score multiplier', () => {
  const easy = new Wickwarden(2, { difficulty: 'story' }), hard = new Wickwarden(2, { difficulty: 'eclipse' });
  for (const game of [easy, hard]) { game.start();game.spawnEnemy('crawler', 100, 100);game.score = 1000;game.damageHearth(10, 640, 384); }
  assert.ok(easy.enemies[0].hp < hard.enemies[0].hp);assert.ok(easy.enemies[0].speed < hard.enemies[0].speed);assert.ok(easy.hearth.light > hard.hearth.light);
  easy.finish(false, 'unit test');hard.finish(false, 'unit test');assert.equal(easy.score, 750);assert.equal(hard.score, 1500);
});
test('the campaign moves through four distinct realms at their actual night boundaries', () => {
  assert.deepEqual([1, 4, 7, 10].map((n) => realmForNight(n).id), REALMS.map((r) => r.id));
  const g = new Wickwarden();g.start();assert.equal(g.realm.id, 'courtyard');
  g.wave = 4;g.enterRealm();assert.equal(g.realm.id, 'fen');assert.equal(g.hazards.filter((h) => h.type === 'pool').length, 4);
  assert.equal(g.terrainFactor(410, 270), 0.63);assert.equal(g.terrainFactor(640, 384), 1);
  g.wave = 7;g.enterRealm();assert.equal(g.realm.hazard, 'thorns');assert.equal(g.hazards.length, 0);
});
test('root blooms visibly warn before they deal one hit', () => {
  const g = new Wickwarden();g.start();g.wave = 7;g.enterRealm();g.hazardTimer = 100;g.player.invuln = 0;
  g.hazards = [{ x: g.player.x, y: g.player.y, r: 48, type: 'thorn', life: 2.7, warning: 1.55, hit: false }];
  updateRealm(g, 1.3);assert.equal(g.player.hp, 5);assert.equal(g.hazards[0].hit, false);
  updateRealm(g, 0.3);assert.equal(g.player.hp, 4);assert.equal(g.hazards[0].hit, true);
  updateRealm(g, 0.1);assert.equal(g.player.hp, 4);
});
test('lantern seeds create real damaging light lines and cannot be stacked on the hearth', () => {
  const g = new Wickwarden();g.start();assert.equal(plantLightWard(g), false);
  g.player.x = 900;g.player.y = 384;assert.equal(plantLightWard(g), true);assert.equal(g.wardSeeds, 1);
  assert.equal(plantLightWard(g), false);g.spawnEnemy('crawler', 780, 384);
  const hp = g.enemies[0].hp;updateLightWards(g, 0.5);assert.ok(g.enemies[0].hp < hp);
  updateLightWards(g, 35);assert.equal(g.wards.length, 0);
});
test('camp inventory spends banked wax, escalates prices, and limits a night to one purchase', () => {
  const g = new Wickwarden();g.start();g.phase = 'upgrade';g.wax = 100;
  assert.equal(g.purchase('lantern'), true);assert.equal(g.wax, 55);assert.equal(g.hearth.beacon, 0.75);
  assert.equal(g.purchase('seeds'), false);g.campBought = null;
  assert.equal(campPrice(g, CAMP_STOCK[0]), 80);assert.equal(g.purchase('lantern'), false);
  g.player.hp = 2;assert.equal(g.purchase('mending'), true);assert.equal(g.player.hp, 4);assert.equal(g.wax, 29);
});
test('garden journal persists earned seals and specific candle/difficulty victories without a server', () => {
  const old = globalThis.localStorage, data = new Map();
  globalThis.localStorage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  try {
    const g = new Wickwarden(1, { discipline: 'glint' });g.realmSeals = REALMS.map((r) => r.id);g.phase = 'won';
    recordJourney(g);const journal = readJournal();assert.equal(journal.victories, 1);assert.equal(journal.runs, 1);assert.equal(journal.seals.length, 4);assert.ok(journal.candles.includes('glint:warden'));
  } finally { if (old === undefined) delete globalThis.localStorage;else globalThis.localStorage = old; }
});
