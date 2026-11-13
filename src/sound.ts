import { getAudioContext, unlockAudio } from "./grok";

export { unlockAudio, getAudioContext };

let master: GainNode | null = null;
let musicStop: (() => void) | null = null;
let unlocked = false;

function ctx(): AudioContext | null {
  return getAudioContext();
}

function out(c: AudioContext): GainNode {
  if (master && master.context === c) return master;
  master = c.createGain();
  master.gain.value = 0.85;
  master.connect(c.destination);
  return master;
}

function env(g: AudioParam, t: number, peak: number, attack: number, decay: number, sustain = 0.0001) {
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + attack + decay);
}

function tone(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  t: number,
  peak: number,
  attack: number,
  decay: number,
  slide?: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + attack + decay);
  env(g.gain, t, peak, attack, decay);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noiseBurst(c: AudioContext, dest: AudioNode, t: number, peak: number, attack: number, decay: number, hp: number, lp: number) {
  const len = Math.ceil(c.sampleRate * (attack + decay + 0.04));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const high = c.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = hp;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = lp;
  const g = c.createGain();
  env(g.gain, t, peak, attack, decay);
  src.connect(high);
  high.connect(low);
  low.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + attack + decay + 0.04);
}

/** A short metallic clink — used for chain links and jar glass. */
function clink(c: AudioContext, dest: AudioNode, t: number, freq: number, peak: number, decay = 0.28) {
  // Inharmonic partials feel like metal rather than a musical note.
  [1, 2.37, 3.11, 4.73].forEach((mult, i) => {
    tone(c, dest, freq * mult, "sine", t, peak * (i === 0 ? 1 : 0.45 / (i + 0.5)), 0.004, decay * (1 - i * 0.12), freq * mult * 0.96);
  });
  noiseBurst(c, dest, t, peak * 0.35, 0.002, 0.06, 1800, 8000);
}

export type SoundName = "check" | "chain" | "coin" | "undo" | "open" | "bonus";

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  const c = ctx();
  if (!c) return;
  void c.resume();
  const dest = out(c);
  const t = c.currentTime + 0.01;
  if (name === "check") playCheck(c, dest, t);
  else if (name === "chain") playChain(c, dest, t);
  else if (name === "coin") playCoin(c, dest, t);
  else if (name === "undo") playUndo(c, dest, t);
  else if (name === "open") playOpen(c, dest, t);
  else if (name === "bonus") playBonus(c, dest, t);
}

function playCheck(c: AudioContext, dest: AudioNode, t: number) {
  // Soft wooden tick + a warm rising fifth. Short, satisfying, not shrill.
  noiseBurst(c, dest, t, 0.22, 0.002, 0.045, 400, 1800);
  tone(c, dest, 392, "sine", t, 0.16, 0.006, 0.12);
  tone(c, dest, 523.25, "triangle", t + 0.018, 0.2, 0.008, 0.18);
  tone(c, dest, 784, "sine", t + 0.042, 0.11, 0.01, 0.22);
  tone(c, dest, 196, "sine", t, 0.08, 0.01, 0.14);
}

function playUndo(c: AudioContext, dest: AudioNode, t: number) {
  tone(c, dest, 392, "sine", t, 0.1, 0.006, 0.1);
  tone(c, dest, 330, "sine", t + 0.04, 0.08, 0.008, 0.12);
}

function playOpen(c: AudioContext, dest: AudioNode, t: number) {
  tone(c, dest, 440, "sine", t, 0.05, 0.008, 0.1);
  tone(c, dest, 660, "sine", t + 0.03, 0.04, 0.01, 0.12);
}

function playChain(c: AudioContext, dest: AudioNode, t: number) {
  // Two links meeting, then a third that locks, with a warm resolving bloom.
  clink(c, dest, t, 920, 0.22, 0.32);
  clink(c, dest, t + 0.13, 740, 0.24, 0.36);
  clink(c, dest, t + 0.28, 620, 0.2, 0.45);
  // Warm major bloom under the lock.
  const bloom = t + 0.18;
  tone(c, dest, 261.63, "sine", bloom, 0.09, 0.05, 0.85);
  tone(c, dest, 329.63, "sine", bloom + 0.04, 0.07, 0.06, 0.9);
  tone(c, dest, 392, "sine", bloom + 0.08, 0.07, 0.06, 0.95);
  tone(c, dest, 523.25, "triangle", bloom + 0.1, 0.05, 0.08, 1.05);
}

function playCoin(c: AudioContext, dest: AudioNode, t: number) {
  // Bright coin "ting" with a slight fall, then two glass hits in the jar.
  tone(c, dest, 2650, "sine", t, 0.22, 0.003, 0.38, 2100);
  tone(c, dest, 3975, "sine", t, 0.1, 0.003, 0.28, 3200);
  tone(c, dest, 1320, "triangle", t, 0.06, 0.006, 0.2, 900);
  // Mid-air quiet.
  tone(c, dest, 1800, "sine", t + 0.12, 0.04, 0.01, 0.1, 1400);
  // Glass jar: body + two coin-on-glass clinks, slightly off from each other.
  const hit = t + 0.22;
  tone(c, dest, 420, "sine", hit, 0.1, 0.004, 0.28);
  clink(c, dest, hit, 1480, 0.2, 0.32);
  clink(c, dest, hit + 0.085, 1760, 0.16, 0.28);
  tone(c, dest, 210, "sine", hit, 0.06, 0.01, 0.22);
}

function playBonus(c: AudioContext, dest: AudioNode, t: number) {
  // A small fanfare for a full gym week — three rising coins + a warm chord.
  playCoin(c, dest, t);
  playCoin(c, dest, t + 0.18);
  playCoin(c, dest, t + 0.36);
  tone(c, dest, 392, "sine", t + 0.4, 0.1, 0.04, 0.8);
  tone(c, dest, 493.88, "sine", t + 0.48, 0.1, 0.05, 0.85);
  tone(c, dest, 587.33, "sine", t + 0.56, 0.09, 0.05, 0.95);
  tone(c, dest, 784, "triangle", t + 0.62, 0.06, 0.06, 1.05);
}

function pluck(c: AudioContext, dest: AudioNode, freq: number, t: number, peak: number) {
  tone(c, dest, freq, "sine", t, peak, 0.006, 1.6, freq * 0.995);
  tone(c, dest, freq * 2, "sine", t, peak * 0.22, 0.005, 0.7);
  tone(c, dest, freq * 3.01, "sine", t, peak * 0.07, 0.004, 0.35);
}

const PAD_NOTES = [174.61, 220, 261.63, 329.63]; // F3 A3 C4 E4 — a quiet F major
const PLUCK_NOTES = [349.23, 392, 440, 523.25, 587.33, 659.25, 698.46];

export function startMusic(): void {
  stopMusic();
  const c = ctx();
  if (!c) return;
  void c.resume();
  const dest = c.createGain();
  dest.gain.setValueAtTime(0.0001, c.currentTime);
  dest.gain.linearRampToValueAtTime(0.055, c.currentTime + 1.8);
  dest.connect(out(c));

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  filter.connect(dest);

  const oscs: OscillatorNode[] = [];
  PAD_NOTES.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = i === 0 ? "sine" : "sine";
    o.frequency.value = f;
    g.gain.value = i === 0 ? 0.45 : 0.22 - i * 0.03;
    o.connect(g);
    g.connect(filter);
    o.start();
    oscs.push(o);
    // Slow beating
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = "sine";
    o2.frequency.value = f * (i % 2 === 0 ? 1.002 : 0.998);
    g2.gain.value = 0.1;
    o2.connect(g2);
    g2.connect(filter);
    o2.start();
    oscs.push(o2);
  });

  const lfo = c.createOscillator();
  const lfoG = c.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;
  lfoG.gain.value = 280;
  lfo.connect(lfoG);
  lfoG.connect(filter.frequency);
  lfo.start();
  oscs.push(lfo);

  let step = 0;
  const pattern = [0, 2, 4, 2, 5, 3, 1, 4, 6, 2, 0, 3];
  const tick = () => {
    if (c.state === "closed") return;
    const t = c.currentTime + 0.02;
    const n = PLUCK_NOTES[pattern[step % pattern.length]];
    pluck(c, dest, n, t, 0.11);
    // Occasional quiet fifth above
    if (step % 4 === 2) pluck(c, dest, n * 1.5, t + 0.18, 0.045);
    step += 1;
  };
  const first = window.setTimeout(tick, 2200);
  const iv = window.setInterval(tick, 6400);

  musicStop = () => {
    window.clearTimeout(first);
    window.clearInterval(iv);
    try {
      dest.gain.cancelScheduledValues(c.currentTime);
      dest.gain.setValueAtTime(dest.gain.value, c.currentTime);
      dest.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5);
    } catch {
      // closing
    }
    window.setTimeout(() => {
      oscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // already stopped
        }
      });
      try {
        dest.disconnect();
        filter.disconnect();
      } catch {
        // already
      }
    }, 560);
    musicStop = null;
  };
}

export function stopMusic(): void {
  if (musicStop) musicStop();
}

export function wakeAudio(): void {
  const c = ctx();
  if (!c) return;
  if (!unlocked) {
    unlockAudio();
    unlocked = true;
  }
  if (c.state !== "running") void c.resume();
}

export function bindAudioWake(): () => void {
  const wake = () => wakeAudio();
  document.addEventListener("touchend", wake);
  document.addEventListener("pointerdown", wake);
  document.addEventListener("visibilitychange", wake);
  return () => {
    document.removeEventListener("touchend", wake);
    document.removeEventListener("pointerdown", wake);
    document.removeEventListener("visibilitychange", wake);
  };
}
