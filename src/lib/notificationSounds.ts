// Notification sound management for reservation alerts and settings preview

export type NotificationSoundType = 'chime' | 'light_beep';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Synthesizes a clean, gentle, light beep ("bip") using the Web Audio API.
 * This runs completely offline, with zero network latency and no external assets.
 */
export function playLightBeep(volume: number = 0.45): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // 920 Hz - crisp, modern, light "bip"
      osc.frequency.setValueAtTime(920, ctx.currentTime);

      const now = ctx.currentTime;
      const duration = 0.11; // 110ms - short, polite bip

      gain.gain.setValueAtTime(0.0001, now);
      // Soft 12ms attack to prevent clicks
      gain.gain.exponentialRampToValueAtTime(Math.min(volume, 1.0), now + 0.012);
      // Smooth exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.03);
      osc.onended = () => resolve();
    } catch (err) {
      console.warn('[notificationSounds] Web Audio beep error:', err);
      resolve();
    }
  });
}

/**
 * Synthesizes a harmonic two-tone chime fallback in case external audio cannot be reached.
 */
function playSynthesizedChime(volume: number = 0.5): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }
      const now = ctx.currentTime;

      // First chime tone (E5 ~659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(volume * 0.65, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Second higher bell chime tone (B5 ~987Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.0001, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(volume * 0.85, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.8);

      osc2.onended = () => resolve();
    } catch (err) {
      console.warn('[notificationSounds] Synthesized chime error:', err);
      resolve();
    }
  });
}

let chimeAudioInstance: HTMLAudioElement | null = null;
const CHIME_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Plays the classic mixkit notification chime.
 */
export async function playChime(volume: number = 0.5): Promise<void> {
  try {
    if (!chimeAudioInstance) {
      chimeAudioInstance = new Audio(CHIME_URL);
      chimeAudioInstance.preload = 'auto';
    }
    chimeAudioInstance.volume = Math.max(0, Math.min(1, volume));
    chimeAudioInstance.currentTime = 0;
    await chimeAudioInstance.play();
  } catch (err) {
    console.warn('[notificationSounds] HTMLAudio chime failed, using synthesis fallback:', err);
    await playSynthesizedChime(volume);
  }
}

/**
 * Plays the chosen notification sound based on restaurant settings.
 * Supports:
 * - 'chime': Classic mixkit bell chime
 * - 'light_beep': Light, gentle short bip synthesized via Web Audio API
 */
export async function playNotificationSound(
  soundType: NotificationSoundType | string = 'chime',
  volume: number = 0.5
): Promise<void> {
  if (soundType === 'light_beep' || soundType === 'beep') {
    await playLightBeep(volume);
  } else {
    await playChime(volume);
  }
}
