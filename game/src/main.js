// Browser boot, fixed-timestep loop, menu actions and resilient local personal bests.
import { Wickwarden } from './game.js';
import { GardenRenderer } from './render.js';
import { createInput } from './input.js';
import { STEP, BEST_SCORE_KEY } from './config.js';
import { unlockAudio, startMusic, toggleMute } from './audio.js';
import { drawTitle, drawHUD, drawKindlingDraft, drawResults, START_BUTTON, RESTART_BUTTON, OFFER_RECTS, hitRect } from './interface.js';

const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const renderer = new GardenRenderer(canvas);
const input = createInput(canvas);
let game = new Wickwarden();
let paused = false;
let best = 0;
try { best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0; } catch { /* Private browser modes may deny storage; the game still works. */ }
let recordedResult = false;
let lastPhase = '';
let accumulator = 0;
const pendingActions = { dash: false, flare: false };
let previous = performance.now();

function startRun() {
  unlockAudio(); startMusic();
  game = new Wickwarden();game.start();paused = false;recordedResult = false;
  accumulator = 0;pendingActions.dash = false;pendingActions.flare = false;canvas.focus();
}

function menuActions() {
  if (input.wasPressed('m')) toggleMute();
  if (game.phase === 'title') {
    if (input.wasPressed('Enter', ' ') || input.mouse.clicked && hitRect(input.mouse, START_BUTTON)) startRun();
    return;
  }
  if (game.phase === 'won' || game.phase === 'lost') {
    if (input.wasPressed('Escape')) { game = new Wickwarden();paused = false;recordedResult = false; }
    else if (input.wasPressed('Enter', 'r') || input.mouse.clicked && hitRect(input.mouse, RESTART_BUTTON)) startRun();
    return;
  }
  if (input.wasPressed('Escape', 'p') || paused && input.wasPressed('Enter')) { paused = !paused;accumulator = 0; }
  if (paused) { if (input.wasPressed('r')) startRun();return; }
  if (game.phase === 'upgrade') {
    for (let i = 0; i < 3; i++) if (input.wasPressed(String(i + 1)) || input.mouse.clicked && hitRect(input.mouse, OFFER_RECTS[i])) game.chooseKindling(i);
  }
}

function readControls() {
  const [moveX, moveY] = input.moveAxis();
  return { moveX, moveY, aimX: input.mouse.x, aimY: input.mouse.y, fire: input.mouse.down || input.isHeld('j'), dash: input.wasPressed(' ', 'Shift'), flare: input.wasPressed('e', 'RightClick') };
}

function frame(now) {
  const delta = Math.min(0.1, Math.max(0, (now - previous) / 1000));previous = now;
  menuActions();
  if (!paused) {
    accumulator += delta;
    const controls = readControls();
    pendingActions.dash ||= controls.dash;
    pendingActions.flare ||= controls.flare;
    let first = true;
    while (accumulator >= STEP) {
      game.update(STEP, { ...controls, dash: first && pendingActions.dash, flare: first && pendingActions.flare });
      if (first) { pendingActions.dash = false;pendingActions.flare = false; }
      accumulator -= STEP;first = false;
    }
  }
  renderer.drawWorld(game);
  const g = renderer.g;
  if (game.phase === 'title') drawTitle(g, game, input.mouse, best);
  else {
    drawHUD(g, game, paused);
    if (!paused && game.phase === 'upgrade') drawKindlingDraft(g, game, input.mouse);
    if (game.phase === 'won' || game.phase === 'lost') {
      if (!recordedResult) {
        best = Math.max(best, game.score);recordedResult = true;
        try { localStorage.setItem(BEST_SCORE_KEY, String(best)); } catch { /* Scores are optional. */ }
      }
      drawResults(g, game, input.mouse, best);
    }
  }
  if (lastPhase !== game.phase) {
    lastPhase = game.phase;
    status.textContent = game.phase === 'title' ? 'Wickwarden. Enter to begin.' : game.phase === 'upgrade' ? `Night ${game.wave} survived. Choose ${game.offers.map((k, i) => `${i + 1}: ${k.name}`).join(', ')}.` : game.phase === 'play' ? `Night ${game.wave}. Keep the hearth alive.` : `${game.endReason} Score ${game.score}. Enter to restart.`;
  }
  input.endFrame();requestAnimationFrame(frame);
}

// Read-only diagnostics for browser play-tests. No controls, state mutation or screenshot staging.
Object.defineProperty(window, 'wickwarden', { value: Object.freeze({
  snapshot: () => ({ phase: game.phase, wave: game.wave, time: game.elapsed, nightTime: game.nightTime, score: game.score, hp: game.player.hp, flare: game.player.flare, light: game.hearth.light, carry: game.carry, banked: game.banked, paused, player: { x: game.player.x, y: game.player.y, dash: game.player.dashCooldown }, enemies: game.enemies.map((e) => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, r: e.r, latched: e.latched, state: e.state })), drops: game.drops.map((d) => ({ x: d.x, y: d.y })), shots: game.enemyShots.map((s) => ({ x: s.x, y: s.y, vx: s.vx, vy: s.vy })), offers: game.offers.map((k) => k.id), taken: { ...game.taken } }),
}) });
window.addEventListener('blur', () => { if (game.phase === 'play') { paused = true;accumulator = 0; } });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.phase === 'play') { paused = true;accumulator = 0; } });
requestAnimationFrame(frame);
