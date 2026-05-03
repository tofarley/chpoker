import { writable } from 'svelte/store';

/*
 * Web Audio synth for card sounds. No assets — every sound is generated on
 * demand from a short noise burst run through a band-pass filter and an
 * exponential decay envelope. Royalty-free by construction.
 *
 * Browsers require a user gesture before audio plays. We lazily construct the
 * AudioContext on the first play() call (which always happens in response to
 * a click or pointer event from the user, so it works).
 */

export const soundEnabled = writable(true);

let _ctx: AudioContext | null = null;
let _enabled = true;
soundEnabled.subscribe(v => { _enabled = v; });

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
  }
  if (_ctx.state === 'suspended') {
    void _ctx.resume();
  }
  return _ctx;
}

function noiseBurst(durationSec: number, ac: AudioContext): AudioBuffer {
  const len = Math.max(1, Math.floor(ac.sampleRate * durationSec));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function playSwap(): void {
  if (!_enabled) return;
  const ac = ctx();
  if (!ac) return;

  const now = ac.currentTime;
  const dur = 0.08;

  const src = ac.createBufferSource();
  src.buffer = noiseBurst(dur, ac);

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  // Sweep the band-pass down for a "swish" feel.
  filter.frequency.setValueAtTime(3200, now);
  filter.frequency.exponentialRampToValueAtTime(1200, now + dur);
  filter.Q.value = 1.6;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + dur);
}
