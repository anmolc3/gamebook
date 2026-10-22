import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  AppState,
  AppStateStatus,
  ViewStyle,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Asset } from 'expo-asset';

export interface OtterMascotAnimationProps {
  /** Optional custom width in pixels. Defaults to responsive width (~65% screen width, max 260px) */
  width?: number;
  /** Format to use for playback: 'mp4' (hardware video) or 'webp'. Defaults to 'mp4' */
  format?: 'mp4' | 'webp';
  /** Whether the mascot is active/visible on the screen. Controls playback to avoid background battery drain */
  isActive?: boolean;
  /** Whether audio from the video should be muted. Defaults to true */
  muted?: boolean;
  /** Play the mascot greeting voice once on initial appearance, muting on all subsequent loops and navigations */
  playVoiceOnce?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Test identifier */
  testID?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ASPECT_RATIO = 16 / 9;
const DEFAULT_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.65), 260);

const WEBP_ASSET = require('../../assets/animations/otter-wave.webp');
const MP4_ASSET = require('../../assets/animations/otter-wave.mp4');
const AAC_ASSET = require('../../assets/animations/otter-audio.aac');

// Module-level flags: ensure greeting audio voice plays ONLY ONCE per app session
let hasPlayedGreetingVoice = false;
let isPreloaded = false;

function preloadMascotAsset() {
  if (isPreloaded) return;
  isPreloaded = true;
  try {
    Asset.fromModule(WEBP_ASSET).downloadAsync().catch(() => null);
    Asset.fromModule(MP4_ASSET).downloadAsync().catch(() => null);
  } catch {}
}
preloadMascotAsset();

export const OtterMascotAnimation: React.FC<OtterMascotAnimationProps> = ({
  width = DEFAULT_WIDTH,
  format = 'mp4',
  isActive = true,
  muted = true,
  playVoiceOnce = false,
  style,
  accessibilityLabel = 'Otter mascot waving animation',
  testID = 'otter-mascot-animation',
}) => {
  const height = Math.round(width / ASPECT_RATIO);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [appIsActive, setAppIsActive] = useState<boolean>(true);
  const [videoReady, setVideoReady] = useState<boolean>(false);

  // Preload asset on mount
  useEffect(() => {
    preloadMascotAsset();
  }, []);

  // Listen to AppState to pause / hide when backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Determine whether this instance should trigger the one-time greeting voice
  const shouldPlayVoice = playVoiceOnce && !hasPlayedGreetingVoice;
  if (shouldPlayVoice) {
    hasPlayedGreetingVoice = true;
  }

  // If format is MP4, initialize expo-video player
  const player = useVideoPlayer(
    format === 'mp4' ? MP4_ASSET : null,
    (p) => {
      p.loop = true;
      // If we should play the voice once, unmute for the first play cycle
      p.muted = shouldPlayVoice ? false : muted;
      
      // Once the first video cycle finishes, permanently mute
      if (shouldPlayVoice) {
        try {
          p.addListener('playToEnd', () => {
            try {
              p.muted = true;
            } catch {}
          });
        } catch {}
      }

      if (isActive && appIsActive) {
        p.play();
      }
    }
  );

  // WebP fallback one-time audio greeting via expo-audio if requested
  useEffect(() => {
    if (format === 'webp' && shouldPlayVoice) {
      try {
        const ExpoAudio = require('expo-audio');
        if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === 'function') {
          const sound = ExpoAudio.createAudioPlayer(AAC_ASSET);
          sound.play();
        }
      } catch {}
    }
  }, [format, shouldPlayVoice]);

  // Handle active/pause lifecycle for MP4
  useEffect(() => {
    if (format !== 'mp4' || !player) return;

    if (isActive && appIsActive) {
      try {
        player.play();
      } catch {}
    } else {
      try {
        player.pause();
      } catch {}
    }

    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [player, isActive, appIsActive, format]);

  const shouldRender = isActive && appIsActive;

  return (
    <View
      style={[styles.container, { width, height }, style]}
      pointerEvents="none"
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {/* Instant fallback poster while video buffers or if format is webp */}
      {(!videoReady || format === 'webp') && shouldRender && (
        <Image
          source={WEBP_ASSET}
          style={styles.media}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}

      {format === 'mp4' && shouldRender && (
        <VideoView
          player={player}
          style={[styles.media, StyleSheet.absoluteFill]}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture={false}
          startsPictureInPictureAutomatically={false}
          onLayout={() => setVideoReady(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default OtterMascotAnimation;
