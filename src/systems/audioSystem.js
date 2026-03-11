import { emit, on } from './eventBus.js';

let ctx = null;
let masterGain = null;
let droneNodes = [];
let ambienceLoop = null;
let _initialized = false;
let _muted = false;

// ─────────────────────────────────────────────────────────────
// Event Subscriptions — Link Bus to Synthesis
// ─────────────────────────────────────────────────────────────
export function subscribeAudioEvents(state) {
  // Building placement chimes (construction)
  // Note: we can't easily hook placement here unless economySystem emits it.
  // For now, let's hook generic world triggers.
  
  on('BUILDING_FIRE', () => playApprovalDrop());
  on('SCANDAL', () => playApprovalDrop());
  on('PROTEST', () => playApprovalDrop());
  on('ELECTION_CYCLE', () => playStatUp());   // Hype chime
  
  on('NPC_DIED', ({ reason }) => {
    if (reason === 'drowned') playUIClick(); // soft splash-like click
    else if (reason === 'car_collision') playApprovalDrop();
  });

  on('FACTION_OFFER', () => playUIClick());
  
  on('BUILDING_SABOTAGE', () => playApprovalDrop());
  on('DISTRICT_UNREST', () => playApprovalDrop());
}

// ─────────────────────────────────────────────────────────────
// Bootstrap — must be called from a user gesture (tap/click)
// ─────────────────────────────────────────────────────────────
export function initAudio() {
  if (_initialized) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.65, ctx.currentTime);
    masterGain.connect(ctx.destination);
    _startDronePad();
    _startAmbienceLoop();
    _initialized = true;
  } catch (e) {
    console.warn('[AudioSystem] Web Audio not available:', e);
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(val) {
  _muted = val;
  if (!masterGain) return;
  masterGain.gain.setTargetAtTime(val ? 0 : 0.65, ctx.currentTime, 0.3);
}

export function isMuted() { return _muted; }

// ─────────────────────────────────────────────────────────────
// UI Click — short bright tick
// ─────────────────────────────────────────────────────────────
export function playUIClick() {
  if (!ctx || _muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

// ─────────────────────────────────────────────────────────────
// Construction — low thud + rising sparkle
// ─────────────────────────────────────────────────────────────
export function playConstruction() {
  if (!ctx || _muted) return;
  const now = ctx.currentTime;

  // low thud
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.connect(g); g.connect(masterGain);
  osc.start(now); osc.stop(now + 0.28);

  // sparkle sweep
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(300, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
  g2.gain.setValueAtTime(0.0, now);
  g2.gain.setValueAtTime(0.12, now + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(g2); g2.connect(masterGain);
  osc2.start(now + 0.05); osc2.stop(now + 0.35);
}

// ─────────────────────────────────────────────────────────────
// Stat-up chime — ascending major arpeggio
// ─────────────────────────────────────────────────────────────
export function playStatUp() {
  if (!ctx || _muted) return;
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
  freqs.forEach((f, i) => {
    const t = ctx.currentTime + i * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + 0.22);
  });
}

// ─────────────────────────────────────────────────────────────
// Approval drop sting — descending minor
// ─────────────────────────────────────────────────────────────
export function playApprovalDrop() {
  if (!ctx || _muted) return;
  const freqs = [622.25, 493.88, 369.99, 293.66]; // Eb5-B4-F#4-D4
  freqs.forEach((f, i) => {
    const t = ctx.currentTime + i * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    // lo-pass to soften saw
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(700, t);
    osc.connect(flt); flt.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + 0.25);
  });
}

// ─────────────────────────────────────────────────────────────
// Internal — Drone pad (continuous ambient backdrop)
// Three detuned sines: root Bb1, 5th F2, octave Bb2
// ─────────────────────────────────────────────────────────────
function _startDronePad() {
  const defs = [
    { freq: 58.27,  gain: 0.04 },  // Bb1
    { freq: 87.31,  gain: 0.025 }, // F2
    { freq: 116.54, gain: 0.018 }, // Bb2
    { freq: 174.61, gain: 0.012 }, // F3
  ];
  defs.forEach(({ freq, gain }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // Slight detune for richness
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq + (Math.random() * 0.4), ctx.currentTime);

    // Tremolo LFO
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11 + Math.random() * 0.08, ctx.currentTime);
    lfoGain.gain.setValueAtTime(gain * 0.2, ctx.currentTime);
    lfo.connect(lfoGain); lfoGain.connect(g.gain);

    g.gain.setValueAtTime(gain, ctx.currentTime);
    osc.connect(g); g.connect(masterGain);
    osc.start(ctx.currentTime);
    lfo.start(ctx.currentTime);
    droneNodes.push(osc, lfo);
  });
}

// ─────────────────────────────────────────────────────────────
// Internal — Ambience loop: random soft whooshes / clicks
// simulating city background activity
// ─────────────────────────────────────────────────────────────
function _startAmbienceLoop() {
  function scheduleNext() {
    if (!ctx) return;
    const delay = 3.5 + Math.random() * 6.5;
    ambienceLoop = setTimeout(() => {
      if (!_muted) _emitAmbienceBlip();
      scheduleNext();
    }, delay * 1000);
  }
  scheduleNext();
}

function _emitAmbienceBlip() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const type = Math.random() > 0.5 ? 'wind' : 'click';

  if (type === 'wind') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(200 + Math.random() * 300, now);
    flt.Q.setValueAtTime(0.5, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.022, now + 0.15);
    g.gain.linearRampToValueAtTime(0, now + 0.55);
    src.connect(flt); flt.connect(g); g.connect(masterGain);
    src.start(now); src.stop(now + 0.6);
  } else {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200 + Math.random() * 800, now);
    g.gain.setValueAtTime(0.015, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + 0.07);
  }
}
