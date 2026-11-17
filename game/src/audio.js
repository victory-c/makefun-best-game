// Every sound is synthesised at run time with Web Audio: no sample files, nothing fetched.

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let muted = false;
let noiseBuffer = null;
let music = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  ctx = new AudioCtor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.7;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let seed = 22222;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
  return muted;
}

export const isMuted = () => muted;

function tone({ type = 'sine', from = 440, to = from, time = 0.15, gain = 0.2, attack = 0.005, delay = 0, bus = sfxBus }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + time);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
  osc.connect(amp).connect(bus);
  osc.start(t0);
  osc.stop(t0 + time + 0.02);
}

function noise({ time = 0.2, gain = 0.2, freq = 1200, q = 1, type = 'bandpass', sweepTo = freq, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + time);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
  src.connect(filter).connect(amp).connect(sfxBus);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + time + 0.02);
}

// Gameplay sounds, each tuned to its moment.
export const sfx = {
  shoot: () => {
    tone({ type: 'triangle', from: 880 + Math.random() * 120, to: 420, time: 0.08, gain: 0.07 });
    noise({ time: 0.05, gain: 0.05, freq: 3000, sweepTo: 1500 });
  },
  hit: () => tone({ type: 'square', from: 300, to: 160, time: 0.05, gain: 0.04 }),
  kill: (big) => {
    noise({ time: big ? 0.45 : 0.22, gain: big ? 0.35 : 0.18, freq: big ? 900 : 1800, sweepTo: 200, q: 0.8 });
    tone({ type: 'sine', from: big ? 220 : 520, to: big ? 60 : 180, time: big ? 0.4 : 0.15, gain: 0.12 });
  },
  hurt: () => {
    tone({ type: 'sawtooth', from: 220, to: 70, time: 0.35, gain: 0.2 });
    noise({ time: 0.3, gain: 0.25, freq: 500, sweepTo: 120, type: 'lowpass' });
  },
  hearthHit: () => tone({ type: 'sine', from: 160, to: 90, time: 0.25, gain: 0.16 }),
  pickup: (n) => tone({ type: 'sine', from: 900 + (n % 8) * 70, to: 1500 + (n % 8) * 70, time: 0.07, gain: 0.05 }),
  dash: () => noise({ time: 0.16, gain: 0.16, freq: 600, sweepTo: 2600, q: 2 }),
  flare: () => {
    noise({ time: 0.9, gain: 0.45, freq: 300, sweepTo: 4000, q: 0.5 });
    tone({ type: 'sawtooth', from: 110, to: 440, time: 0.5, gain: 0.18 });
    tone({ type: 'sine', from: 660, to: 1320, time: 0.6, gain: 0.12, delay: 0.05 });
  },
  enemyShot: () => tone({ type: 'sine', from: 260, to: 520, time: 0.18, gain: 0.06 }),
  rift: () => tone({ type: 'sine', from: 90, to: 140, time: 0.5, gain: 0.05 }),
  waveStart: () => {
    [0, 0.14, 0.28].forEach((d, i) => tone({ type: 'triangle', from: [392, 494, 587][i], time: 0.4, gain: 0.12, delay: d }));
  },
  waveClear: () => {
    [0, 0.1, 0.2, 0.3].forEach((d, i) => tone({ type: 'triangle', from: [523, 659, 784, 1046][i], time: 0.5, gain: 0.12, delay: d }));
  },
  choose: () => {
    tone({ type: 'triangle', from: 660, to: 1320, time: 0.25, gain: 0.14 });
    noise({ time: 0.4, gain: 0.12, freq: 2000, sweepTo: 6000, q: 1 });
  },
  hover: () => tone({ type: 'sine', from: 1200, time: 0.04, gain: 0.03 }),
  bossRoar: () => {
    tone({ type: 'sawtooth', from: 70, to: 40, time: 1.4, gain: 0.25, attack: 0.2 });
    noise({ time: 1.4, gain: 0.25, freq: 400, sweepTo: 90, type: 'lowpass' });
  },
  win: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'triangle', from: f, time: 0.9, gain: 0.12, delay: i * 0.12 }));
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'sine', from: f, to: f * 0.97, time: 0.8, gain: 0.14, delay: i * 0.22 }));
  },
};

// A slow, low pentatonic loop that thickens as the nights get darker.
const SCALE = [0, 3, 5, 7, 10, 12, 15];
export function startMusic() {
  if (!ctx || music) return;
  music = { step: 0, intensity: 0, timer: null };
  const beat = 0.32;
  let nextTime = ctx.currentTime + 0.1;
  const schedule = () => {
    while (nextTime < ctx.currentTime + 0.4) {
      const s = music.step;
      const root = [45, 41, 43, 40][Math.floor(s / 16) % 4];
      if (s % 8 === 0) {
        tone({ type: 'triangle', from: midi(root - 12), time: beat * 7, gain: 0.16, attack: 0.3, delay: nextTime - ctx.currentTime, bus: musicBus });
      }
      const pattern = [0, 2, 4, 5, 4, 2, 3, 1];
      if (s % 2 === 0 || music.intensity > 0.5) {
        const note = root + 12 + SCALE[(pattern[s % 8] + Math.floor(s / 32)) % SCALE.length];
        tone({ type: 'sine', from: midi(note), time: beat * 1.6, gain: 0.05 + 0.04 * music.intensity, delay: nextTime - ctx.currentTime, bus: musicBus });
      }
      if (music.intensity > 0.25 && s % 4 === 2) {
        noise({ time: 0.08, gain: 0.03 + 0.05 * music.intensity, freq: 7000, sweepTo: 5000, q: 3, delay: nextTime - ctx.currentTime });
      }
      if (music.intensity > 0.6 && s % 4 === 0) {
        tone({ type: 'sine', from: 120, to: 45, time: 0.18, gain: 0.18 * music.intensity, delay: nextTime - ctx.currentTime, bus: musicBus });
      }
      music.step++;
      nextTime += beat;
    }
  };
  music.timer = setInterval(schedule, 100);
  schedule();
}

export function setMusicIntensity(value) {
  if (music) music.intensity = value;
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
