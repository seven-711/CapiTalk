/**
 * Web Audio API synthesizer for the Campus PA Loudspeaker chime sound effect.
 * Produces a warm, authentic 2-tone bell chime (Ding-Dong 🔔) with zero external assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playLoudspeakerChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: High chime (A5 ~ 880 Hz)
    playTone(ctx, 880, now, 0.45, 0.22);

    // Tone 2: Low chime (E5 ~ 659.25 Hz)
    playTone(ctx, 659.25, now + 0.32, 0.65, 0.25);
  } catch (err) {
    console.warn('[AudioChime] Unable to play chime:', err);
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gainLevel: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  // Soft attack & exponential decay
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}
