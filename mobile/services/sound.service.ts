import { Platform } from 'react-native';

// Safely attempt to require expo-audio without ever crashing module loading
let ExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoAudio = require('expo-audio');
} catch (err) {
  // expo-audio native module is not present in current client build
  ExpoAudio = null;
}

/**
 * Procedural Audio Synthesizer for instant, zero-latency sound effects.
 * Generates uncompressed 16-bit PCM WAV data URIs mathematically.
 */
function createWavUri(sampleRate: number, numSamples: number, sampleGenerator: (t: number, i: number) => number): string {
  const byteRate = sampleRate * 2; // 1 channel, 16-bit (2 bytes per sample)
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const bufferSize = 44 + dataSize;
  const buffer = new Uint8Array(bufferSize);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      buffer[offset + i] = str.charCodeAt(i);
    }
  };

  // Helper to write 16-bit and 32-bit LE numbers
  const writeUint16 = (offset: number, value: number) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
  };
  const writeUint32 = (offset: number, value: number) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
    buffer[offset + 2] = (value >> 16) & 0xff;
    buffer[offset + 3] = (value >> 24) & 0xff;
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  writeUint32(4, 36 + dataSize);
  writeString(8, 'WAVE');

  // 2. fmt sub-chunk
  writeString(12, 'fmt ');
  writeUint32(16, 16); // SubChunk1Size (16 for PCM)
  writeUint16(20, 1);  // AudioFormat (1 = PCM)
  writeUint16(22, 1);  // NumChannels (1 = Mono)
  writeUint32(24, sampleRate);
  writeUint32(28, byteRate);
  writeUint16(32, blockAlign);
  writeUint16(34, 16); // BitsPerSample

  // 3. data sub-chunk
  writeString(36, 'data');
  writeUint32(40, dataSize);

  // 4. PCM Samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = sampleGenerator(t, i);
    // Clamp to -1..1
    sample = Math.max(-1, Math.min(1, sample));
    const intSample = sample < 0 ? sample * 32768 : sample * 32767;
    writeUint16(offset, Math.floor(intSample));
    offset += 2;
  }

  return `data:audio/wav;base64,${uint8ArrayToBase64(buffer)}`;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return result;
}

// ─── Sound Effect Synthesizers ──────────────────────────────────────────────────

// 1. Dice Roll: Multi-click dice rattle and tumble
function getDiceRollSoundUri(): string {
  const sampleRate = 22050;
  const duration = 0.35;
  const numSamples = Math.floor(sampleRate * duration);

  return createWavUri(sampleRate, numSamples, (t) => {
    // Envelope: quick pulses simulating dice tumbling on a board
    const clickPositions = [0.03, 0.08, 0.14, 0.20, 0.26, 0.31];
    let amp = 0;
    for (const cp of clickPositions) {
      const dt = t - cp;
      if (dt >= 0 && dt < 0.025) {
        amp += Math.exp(-dt * 200) * Math.sin(2 * Math.PI * (280 + (dt > 0.01 ? 120 : 0)) * dt);
      }
    }
    // Subtle wooden impact body
    const woodThump = Math.exp(-t * 12) * Math.sin(2 * Math.PI * 140 * t) * 0.35;
    return amp * 0.8 + woodThump;
  });
}

// 2. Token Move: Satisfying wooden pop / token tap
function getTokenMoveSoundUri(): string {
  const sampleRate = 22050;
  const duration = 0.14;
  const numSamples = Math.floor(sampleRate * duration);

  return createWavUri(sampleRate, numSamples, (t) => {
    const freq = 520 - t * 1800; // Pitch drops from 520Hz down
    const env = Math.exp(-t * 35);
    return env * Math.sin(2 * Math.PI * Math.max(120, freq) * t) * 0.9;
  });
}

// 3. Token Capture: Dramatic strike / knockout impact
function getCaptureSoundUri(): string {
  const sampleRate = 22050;
  const duration = 0.32;
  const numSamples = Math.floor(sampleRate * duration);

  return createWavUri(sampleRate, numSamples, (t) => {
    const punch = Math.exp(-t * 22) * Math.sin(2 * Math.PI * 180 * t) * 0.8;
    const zap = Math.exp(-t * 18) * Math.sin(2 * Math.PI * (840 - t * 1200) * t) * 0.45;
    return punch + zap;
  });
}

// 4. Token Home / Victory: Bright golden victory fanfare
function getHomeGoalSoundUri(): string {
  const sampleRate = 22050;
  const duration = 0.48;
  const numSamples = Math.floor(sampleRate * duration);

  return createWavUri(sampleRate, numSamples, (t) => {
    // 3 arpeggiated bells: C5 (523Hz), E5 (659Hz), G5 (784Hz)
    let bell = 0;
    if (t < 0.14) {
      bell = Math.exp(-t * 15) * Math.sin(2 * Math.PI * 523 * t);
    } else if (t < 0.28) {
      const dt = t - 0.14;
      bell = Math.exp(-dt * 15) * Math.sin(2 * Math.PI * 659 * dt);
    } else {
      const dt = t - 0.28;
      bell = Math.exp(-dt * 10) * Math.sin(2 * Math.PI * 784 * dt) * 1.2;
    }
    return bell * 0.85;
  });
}

// 5. Turn Ping: Gentle pleasant notification chime
function getTurnPingSoundUri(): string {
  const sampleRate = 22050;
  const duration = 0.22;
  const numSamples = Math.floor(sampleRate * duration);

  return createWavUri(sampleRate, numSamples, (t) => {
    const env = Math.exp(-t * 18);
    const fundamental = Math.sin(2 * Math.PI * 880 * t);
    const harmonic = 0.35 * Math.sin(2 * Math.PI * 1760 * t);
    return env * (fundamental + harmonic) * 0.7;
  });
}

export type SoundEffectType = 'diceRoll' | 'tokenMove' | 'tokenCapture' | 'homeGoal' | 'turnPing';

export class SoundService {
  private static players = new Map<SoundEffectType, any>();
  private static uriCache = new Map<SoundEffectType, string>();
  private static isInitialized = false;

  private static getSoundUri(type: SoundEffectType): string {
    let uri = this.uriCache.get(type);
    if (!uri) {
      switch (type) {
        case 'diceRoll': uri = getDiceRollSoundUri(); break;
        case 'tokenMove': uri = getTokenMoveSoundUri(); break;
        case 'tokenCapture': uri = getCaptureSoundUri(); break;
        case 'homeGoal': uri = getHomeGoalSoundUri(); break;
        case 'turnPing': uri = getTurnPingSoundUri(); break;
      }
      this.uriCache.set(type, uri);
    }
    return uri;
  }

  /**
   * Initializes audio session mode if available
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    try {
      if (ExpoAudio && typeof ExpoAudio.setAudioModeAsync === 'function') {
        await ExpoAudio.setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        });
      }
    } catch {
      // Audio session mode not required for execution
    }
  }

  /**
   * Plays a game sound effect across all platforms safely
   */
  static async play(type: SoundEffectType): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const uri = this.getSoundUri(type);

      // Web platform audio fallback
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        const audio = new (window as any).Audio(uri);
        audio.volume = 0.9;
        audio.play().catch(() => {});
        return;
      }

      // Expo modern audio (expo-audio)
      if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
        let player = this.players.get(type);
        if (!player) {
          player = ExpoAudio.createAudioPlayer({ uri });
          this.players.set(type, player);
        }
        if (player) {
          if (typeof player.seekTo === 'function') {
            player.seekTo(0);
          }
          if (typeof player.play === 'function') {
            player.play();
          }
        }
      }
    } catch (err) {
      // Sound playback should never crash the game
    }
  }

  static async unloadAll(): Promise<void> {
    try {
      for (const player of this.players.values()) {
        if (player && typeof player.release === 'function') {
          player.release();
        } else if (player && typeof player.pause === 'function') {
          player.pause();
        }
      }
      this.players.clear();
    } catch {}
  }
}
