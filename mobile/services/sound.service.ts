import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

// Safely attempt to require expo-audio without ever crashing module loading
let ExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoAudio = require('expo-audio');
} catch (err) {
  // expo-audio native module is not present in current client build
  ExpoAudio = null;
}

// User-provided Ludo Audio Assets from sound effect/ludo
const LUDO_AUDIO_ASSETS: Record<string, any> = {
  diceRoll: require('../assets/sounds/ludo/dice_roll.mp3'),
  tokenOpen: require('../assets/sounds/ludo/token_open.mp3'),
  tokenMove: require('../assets/sounds/ludo/token_open.mp3'),
  tokenCapture: require('../assets/sounds/ludo/token_kill.mp3'),
  tokenCapture2: require('../assets/sounds/ludo/token_kill_2.mp3'),
  homeGoal: require('../assets/sounds/ludo/token_win.mp3'),
  gameOver: require('../assets/sounds/ludo/game_over.mp3'),
};

export type SoundEffectType =
  | 'diceRoll'
  | 'tokenOpen'
  | 'tokenMove'
  | 'tokenCapture'
  | 'tokenCapture2'
  | 'homeGoal'
  | 'gameOver'
  | 'turnPing';

/**
 * Procedural Audio Synthesizer fallback for instant, zero-latency sound effects
 * in case audio driver or asset loading is unavailable.
 */
function createWavUri(sampleRate: number, numSamples: number, sampleGenerator: (t: number, i: number) => number): string {
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

export class SoundService {
  private static players = new Map<SoundEffectType, any>();
  private static resolvedUris = new Map<SoundEffectType, string>();
  private static isInitialized = false;

  /**
   * Resolves the asset URI for web or native playback
   */
  private static getAssetUri(type: SoundEffectType): string | null {
    if (this.resolvedUris.has(type)) {
      return this.resolvedUris.get(type) || null;
    }

    const assetModule = LUDO_AUDIO_ASSETS[type];
    if (assetModule) {
      try {
        const asset = Asset.fromModule(assetModule);
        if (asset?.uri) {
          this.resolvedUris.set(type, asset.uri);
          return asset.uri;
        }
      } catch {
        // Module might not have resolved URI yet
      }
    }

    if (type === 'turnPing') {
      const pingUri = getTurnPingSoundUri();
      this.resolvedUris.set(type, pingUri);
      return pingUri;
    }

    return null;
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
   * Plays a game sound effect across all platforms safely using user-provided audio
   */
  static async play(type: SoundEffectType): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const assetModule = LUDO_AUDIO_ASSETS[type];

      // 1. Web platform audio playback
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        let uri = this.getAssetUri(type);
        if (!uri && assetModule) {
          try {
            uri = Asset.fromModule(assetModule).uri;
          } catch {}
        }
        if (uri) {
          const audio = new (window as any).Audio(uri);
          audio.volume = 0.95;
          audio.play().catch(() => {});
          return;
        }
      }

      // 2. Native Expo Audio playback (expo-audio)
      if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
        let player = this.players.get(type);
        if (!player) {
          // Use asset require module directly or resolved URI
          const source = assetModule ? assetModule : this.getAssetUri(type);
          if (source) {
            player = ExpoAudio.createAudioPlayer(source);
            this.players.set(type, player);
          }
        }

        if (player) {
          if (typeof player.seekTo === 'function') {
            player.seekTo(0);
          }
          if (typeof player.play === 'function') {
            player.play();
          }
          return;
        }
      }

      // 3. Fallback for turn ping or web Audio if not loaded
      if (type === 'turnPing') {
        const pingUri = getTurnPingSoundUri();
        if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
          const audio = new (window as any).Audio(pingUri);
          audio.play().catch(() => {});
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
      this.resolvedUris.clear();
    } catch {}
  }
}
