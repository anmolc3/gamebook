import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

// Safely attempt to require expo-audio without crashing module loading
let ExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoAudio = require('expo-audio');
} catch (err) {
  ExpoAudio = null;
}

// User-provided & custom Ludo / Board Audio Assets
const AUDIO_ASSETS: Record<string, any> = {
  diceRoll: require('../assets/sounds/ludo/dice_roll.mp3'),
  tokenOpen: require('../assets/sounds/ludo/token_open.mp3'),
  tokenMove: require('../assets/sounds/ludo/token_step.wav'),
  tokenCapture: require('../assets/sounds/ludo/token_kill.mp3'),
  tokenCapture2: require('../assets/sounds/ludo/token_kill_2.mp3'),
  homeGoal: require('../assets/sounds/ludo/token_win.mp3'),
  gameOver: require('../assets/sounds/ludo/game_over.mp3'),
  turnPing: require('../assets/sounds/ludo/turn_ping.wav'),
  ladderClimb: require('../assets/sounds/ludo/token_win.mp3'),
  snakeSlide: require('../assets/sounds/ludo/token_kill_2.mp3'),
  turnChange: require('../assets/sounds/ludo/turn_ping.wav'),
};

export type SoundEffectType =
  | 'diceRoll'
  | 'tokenOpen'
  | 'tokenMove'
  | 'tokenCapture'
  | 'tokenCapture2'
  | 'homeGoal'
  | 'gameOver'
  | 'turnPing'
  | 'ladderClimb'
  | 'snakeSlide'
  | 'turnChange';

/**
 * Procedural Audio Synthesizer fallback for instant, zero-latency sound effects
 * in case audio driver or asset loading is delayed or unavailable.
 */
function createWavUri(
  sampleRate: number,
  numSamples: number,
  sampleGenerator: (t: number, i: number) => number
): string {
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const bufferSize = 44 + dataSize;
  const buffer = new Uint8Array(bufferSize);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      buffer[offset + i] = str.charCodeAt(i);
    }
  };

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

  writeString(0, 'RIFF');
  writeUint32(4, 36 + dataSize);
  writeString(8, 'WAVE');

  writeString(12, 'fmt ');
  writeUint32(16, 16);
  writeUint16(20, 1);
  writeUint16(22, 1);
  writeUint32(24, sampleRate);
  writeUint32(28, byteRate);
  writeUint16(32, blockAlign);
  writeUint16(34, 16);

  writeString(36, 'data');
  writeUint32(40, dataSize);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = sampleGenerator(t, i);
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

// Procedural sound generators for instant zero-latency fallbacks
const PROCEDURAL_GENERATORS: Record<string, () => string> = {
  tokenMove: () => {
    const sampleRate = 22050;
    const duration = 0.08;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const env = Math.exp(-t * 60);
      const fundamental = Math.sin(2 * Math.PI * 540 * t);
      const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 120);
      return env * (fundamental * 0.7 + click * 0.4) * 0.9;
    });
  },
  diceRoll: () => {
    const sampleRate = 22050;
    const duration = 0.32;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const clickTimes = [0.02, 0.06, 0.11, 0.17, 0.23, 0.28];
      let val = 0;
      for (const ct of clickTimes) {
        if (t >= ct && t < ct + 0.035) {
          const dt = t - ct;
          val += Math.sin(2 * Math.PI * 920 * dt) * Math.exp(-dt * 90);
        }
      }
      return val * 0.8;
    });
  },
  turnPing: () => {
    const sampleRate = 22050;
    const duration = 0.22;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const env = Math.exp(-t * 18);
      const fundamental = Math.sin(2 * Math.PI * 880 * t);
      const harmonic = 0.35 * Math.sin(2 * Math.PI * 1760 * t);
      return env * (fundamental + harmonic) * 0.75;
    });
  },
  ladderClimb: () => {
    const sampleRate = 22050;
    const duration = 0.36;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteIdx = Math.min(3, Math.floor(t / 0.08));
      const noteT = t - noteIdx * 0.08;
      const freq = notes[noteIdx];
      const env = Math.exp(-noteT * 18);
      return Math.sin(2 * Math.PI * freq * noteT) * env * 0.8;
    });
  },
  snakeSlide: () => {
    const sampleRate = 22050;
    const duration = 0.38;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const freq = 750 - (750 - 180) * (t / duration);
      const env = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 2);
      return Math.sin(2 * Math.PI * freq * t) * env * 0.85;
    });
  },
  tokenCapture: () => {
    const sampleRate = 22050;
    const duration = 0.25;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const env = Math.exp(-t * 24);
      const thud = Math.sin(2 * Math.PI * 140 * t);
      const crack = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 80);
      return env * (thud * 0.75 + crack * 0.35);
    });
  },
  homeGoal: () => {
    const sampleRate = 22050;
    const duration = 0.45;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const c = Math.sin(2 * Math.PI * 523.25 * t);
      const e = Math.sin(2 * Math.PI * 659.25 * t);
      const g = Math.sin(2 * Math.PI * 783.99 * t);
      const env = Math.exp(-t * 7);
      return (c * 0.4 + e * 0.35 + g * 0.35) * env * 0.85;
    });
  },
  gameOver: () => {
    const sampleRate = 22050;
    const duration = 0.6;
    const numSamples = Math.floor(sampleRate * duration);
    return createWavUri(sampleRate, numSamples, (t) => {
      const c = Math.sin(2 * Math.PI * 523.25 * t);
      const g = Math.sin(2 * Math.PI * 783.99 * t);
      const c2 = Math.sin(2 * Math.PI * 1046.5 * t);
      const env = Math.exp(-t * 4);
      return (c * 0.35 + g * 0.35 + c2 * 0.4) * env * 0.9;
    });
  },
};

export class SoundService {
  // Pool of players per sound effect to handle rapid, overlapping events (like rapid steps)
  private static playersPool = new Map<SoundEffectType, any[]>();
  private static poolIndex = new Map<SoundEffectType, number>();
  private static webAudioPool = new Map<SoundEffectType, any[]>();
  private static resolvedUris = new Map<SoundEffectType, string>();
  private static isInitialized = false;
  private static isEnabled = true;

  /**
   * Sets whether sound effects are globally enabled (reads from user settings)
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  static getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Resolves the asset URI for web or native playback
   */
  private static getAssetUri(type: SoundEffectType): string | null {
    if (this.resolvedUris.has(type)) {
      return this.resolvedUris.get(type) || null;
    }

    const assetModule = AUDIO_ASSETS[type];
    if (assetModule) {
      try {
        const asset = Asset.fromModule(assetModule);
        if (asset?.uri) {
          this.resolvedUris.set(type, asset.uri);
          return asset.uri;
        }
      } catch {}
    }

    // Procedural synthesis fallback
    const generator = PROCEDURAL_GENERATORS[type] || PROCEDURAL_GENERATORS.tokenMove;
    if (generator) {
      const uri = generator();
      this.resolvedUris.set(type, uri);
      return uri;
    }

    return null;
  }

  /**
   * Initializes audio session mode and preloads sound players for instant zero-latency playback
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Configure audio mode
    try {
      if (ExpoAudio && typeof ExpoAudio.setAudioModeAsync === 'function') {
        await ExpoAudio.setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        });
      }
    } catch {}

    // 2. Preload native audio players pool (2 players per sound effect for rapid non-blocking retriggering)
    try {
      if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
        const allKeys = Object.keys(AUDIO_ASSETS) as SoundEffectType[];
        for (const key of allKeys) {
          if (!this.playersPool.has(key)) {
            const asset = AUDIO_ASSETS[key];
            const pool: any[] = [];
            try {
              pool.push(ExpoAudio.createAudioPlayer(asset));
              // Create secondary player for rapid step sounds
              if (key === 'tokenMove' || key === 'diceRoll' || key === 'turnPing') {
                pool.push(ExpoAudio.createAudioPlayer(asset));
              }
            } catch {}
            if (pool.length > 0) {
              this.playersPool.set(key, pool);
              this.poolIndex.set(key, 0);
            }
          }
        }
      }
    } catch {}

    // 3. Preload Web Audio pool
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      const allKeys = Object.keys(AUDIO_ASSETS) as SoundEffectType[];
      for (const t of allKeys) {
        try {
          const uri = this.getAssetUri(t);
          if (uri && !this.webAudioPool.has(t)) {
            const a1 = new (window as any).Audio(uri);
            const a2 = new (window as any).Audio(uri);
            a1.load();
            a2.load();
            this.webAudioPool.set(t, [a1, a2]);
            this.poolIndex.set(t, 0);
          }
        } catch {}
      }
    }
  }

  /**
   * Plays a game sound effect across all platforms safely, non-blockingly and instantly.
   * Never throws and never blocks game logic or token animations.
   */
  static play(type: SoundEffectType): void {
    if (!this.isEnabled) return;

    // Trigger initialization asynchronously without awaiting or blocking
    if (!this.isInitialized) {
      this.init().catch(() => {});
    }

    try {
      // 1. Web Platform playback
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        let pool = this.webAudioPool.get(type);
        if (!pool || pool.length === 0) {
          const uri = this.getAssetUri(type);
          if (uri) {
            const audio = new (window as any).Audio(uri);
            pool = [audio];
            this.webAudioPool.set(type, pool);
          }
        }

        if (pool && pool.length > 0) {
          const idx = (this.poolIndex.get(type) || 0) % pool.length;
          this.poolIndex.set(type, idx + 1);
          const audio = pool[idx];
          if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.95;
            audio.play().catch(() => {});
            return;
          }
        }
      }

      // 2. Native Expo Audio playback (expo-audio)
      if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
        let pool = this.playersPool.get(type);
        if (!pool || pool.length === 0) {
          const assetModule = AUDIO_ASSETS[type];
          const source = assetModule ? assetModule : this.getAssetUri(type);
          if (source) {
            try {
              const p = ExpoAudio.createAudioPlayer(source);
              pool = [p];
              this.playersPool.set(type, pool);
              this.poolIndex.set(type, 0);
            } catch {}
          }
        }

        if (pool && pool.length > 0) {
          const idx = (this.poolIndex.get(type) || 0) % pool.length;
          this.poolIndex.set(type, idx + 1);
          const player = pool[idx];

          if (player) {
            // Seek to start and play immediately without awaiting native promises
            try {
              if (typeof player.seekTo === 'function') {
                player.seekTo(0).catch(() => {}).finally(() => {
                  try { player.play(); } catch {}
                });
              } else if (typeof player.play === 'function') {
                player.play();
              }
            } catch {
              try { player.play(); } catch {}
            }
            return;
          }
        }
      }

      // 3. Direct synthesized procedural playback fallback
      const procUri = this.getAssetUri(type);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio && procUri) {
        const audio = new (window as any).Audio(procUri);
        audio.volume = 0.9;
        audio.play().catch(() => {});
      }
    } catch {
      // Sound playback should never crash the game
    }
  }

  static async unloadAll(): Promise<void> {
    try {
      for (const pool of this.playersPool.values()) {
        for (const player of pool) {
          try {
            if (typeof player.release === 'function') {
              player.release();
            } else if (typeof player.pause === 'function') {
              player.pause();
            }
          } catch {}
        }
      }
      this.playersPool.clear();
      this.webAudioPool.clear();
      this.resolvedUris.clear();
      this.isInitialized = false;
    } catch {}
  }
}

export default SoundService;
