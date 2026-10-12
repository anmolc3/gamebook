import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  StatusBar,
  AlertButton,
  AlertOptions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { GameAlertService, GameAlertConfig } from '../../services/alert.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 44, 340);

export interface GameAlertModalProps {
  visible?: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  onClose?: () => void;
  isGlobal?: boolean;
}

export const GameAlertModal: React.FC<GameAlertModalProps> = ({
  visible: propVisible,
  title: propTitle,
  message: propMessage,
  buttons: propButtons,
  options: propOptions,
  onClose: propOnClose,
  isGlobal = true,
}) => {
  const [activeConfig, setActiveConfig] = useState<GameAlertConfig | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isGlobal) {
      GameAlertService.register((config) => {
        setActiveConfig(config);
      });
      return () => {
        GameAlertService.unregister();
      };
    }
  }, [isGlobal]);

  const isVisible = isGlobal ? !!activeConfig : !!propVisible;
  const title = isGlobal ? activeConfig?.title || '' : propTitle || '';
  const message = isGlobal ? activeConfig?.message || '' : propMessage || '';
  const buttons = isGlobal ? activeConfig?.buttons : propButtons;
  const options = isGlobal ? activeConfig?.options : propOptions;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [isVisible, scaleAnim, fadeAnim]);

  const handleDismiss = () => {
    if (isGlobal) {
      GameAlertService.hide();
    }
    if (propOnClose) {
      propOnClose();
    }
  };

  const handleButtonPress = (btn?: AlertButton) => {
    handleDismiss();
    if (btn && btn.onPress) {
      btn.onPress();
    }
  };

  // Close icon button handler (triggers cancel callback or dismisses)
  const handleCloseIcon = () => {
    const cancelBtn = buttons?.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      handleButtonPress(cancelBtn);
    } else {
      handleDismiss();
    }
  };

  if (!isVisible) return null;

  // Determine button configuration
  const resolvedButtons =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'default' as const }];

  const isTwoButtons = resolvedButtons.length === 2;
  const isStackedButtons = resolvedButtons.length > 2;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (options?.cancelable) {
          handleDismiss();
        }
      }}
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(8, 12, 18, 0.78)" />

        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Header Section with Red/Pink Gradient */}
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={['#FF2A5F', '#FF436E', '#E60049']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.headerGradient}
            >
              {/* Decorative Gaming Background Shapes */}
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${CARD_WIDTH} 184`}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                {/* Yellow Plus Cross (Top-Left) */}
                <G opacity={0.95}>
                  <Rect x="46" y="32" width="18" height="6" rx="3" fill="#FFD13B" />
                  <Rect x="52" y="26" width="6" height="18" rx="3" fill="#FFD13B" />
                </G>

                {/* Golden Target / Ring (Top-Left Center) */}
                <G opacity={0.9}>
                  <Circle cx="106" cy="30" r="9.5" fill="none" stroke="#FFD13B" strokeWidth="4.2" />
                  <Circle cx="106" cy="30" r="3.2" fill="#FFD13B" />
                </G>

                {/* Golden Glowing Orb (Top-Center) */}
                <Circle cx="166" cy="18" r="4.5" fill="#FFE266" opacity={0.9} />

                {/* Yellow Plus Cross (Top-Right of Controller) */}
                <G opacity={0.85}>
                  <Rect x="238" y="36" width="13" height="4.5" rx="2.2" fill="#FFD13B" />
                  <Rect x="242.25" y="31.75" width="4.5" height="13" rx="2.2" fill="#FFD13B" />
                </G>

                {/* Floating Yellow Orbs & Sparks */}
                <Circle cx="68" cy="94" r="5" fill="#FFD13B" opacity={0.75} />
                <Circle cx="282" cy="90" r="5.5" fill="#FFD13B" opacity={0.8} />

                {/* Yellow Plus Cross (Bottom-Center below Controller) */}
                <G opacity={0.9}>
                  <Rect x="168" y="146" width="12" height="4.2" rx="2.1" fill="#FFD13B" />
                  <Rect x="171.9" y="142.1" width="4.2" height="12" rx="2.1" fill="#FFD13B" />
                </G>
              </Svg>

              {/* Integrated Crown-and-Controller Illustration */}
              <View style={styles.graphicWrap} pointerEvents="none">
                <Image
                  source={require('../../assets/images/alert_controller_graphic.png')}
                  style={styles.controllerImage}
                  resizeMode="contain"
                />
              </View>

              {/* Close Icon (Top-Right) */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseIcon}
                activeOpacity={0.7}
                accessibilityLabel="Close alert"
              >
                <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <Path
                    d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5"
                    stroke="#FFFFFF"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>

              {/* Curved Wave Transition to White Body */}
              <View style={styles.waveOverlay} pointerEvents="none">
                <Svg
                  width="100%"
                  height={26}
                  viewBox={`0 0 ${CARD_WIDTH} 26`}
                  preserveAspectRatio="none"
                >
                  <Path
                    d={`M0,8 Q${CARD_WIDTH / 2},26 ${CARD_WIDTH},8 L${CARD_WIDTH},26 L0,26 Z`}
                    fill="#FFFFFF"
                  />
                </Svg>
              </View>
            </LinearGradient>
          </View>

          {/* White Content Section */}
          <View style={styles.contentWrap}>
            {/* Bold Title in Vibrant Hot Pink/Red */}
            {!!title && <Text style={styles.titleText}>{title}</Text>}

            {/* Short Message in Soft Charcoal */}
            {!!message && <Text style={styles.messageText}>{message}</Text>}

            {/* Buttons Row / Stack */}
            <View style={styles.buttonsContainer}>
              {resolvedButtons.length === 1 ? (
                // Single Button (Standard OK button)
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => handleButtonPress(resolvedButtons[0])}
                  activeOpacity={0.85}
                  accessibilityLabel={resolvedButtons[0].text || 'OK'}
                >
                  <Text style={styles.primaryButtonText}>
                    {resolvedButtons[0].text || 'OK'}
                  </Text>
                </TouchableOpacity>
              ) : isTwoButtons ? (
                // Two Buttons (Secondary Left / Primary Right)
                <View style={styles.twoButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      resolvedButtons[0].style === 'destructive' && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(resolvedButtons[0])}
                    activeOpacity={0.8}
                    accessibilityLabel={resolvedButtons[0].text || 'Cancel'}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        resolvedButtons[0].style === 'destructive' && styles.destructiveButtonText,
                      ]}
                      numberOfLines={1}
                    >
                      {resolvedButtons[0].text || 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButtonHalf,
                      resolvedButtons[1].style === 'destructive' && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(resolvedButtons[1])}
                    activeOpacity={0.85}
                    accessibilityLabel={resolvedButtons[1].text || 'OK'}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,
                        resolvedButtons[1].style === 'destructive' && styles.destructiveButtonText,
                      ]}
                      numberOfLines={1}
                    >
                      {resolvedButtons[1].text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // 3+ Buttons (Vertical Stack)
                <View style={styles.stackedButtonsCol}>
                  {resolvedButtons.map((btn, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <TouchableOpacity
                        key={`alert_btn_${idx}`}
                        style={isFirst ? styles.primaryButton : styles.secondaryButtonFull}
                        onPress={() => handleButtonPress(btn)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            isFirst ? styles.primaryButtonText : styles.secondaryButtonText
                          }
                        >
                          {btn.text || 'OK'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99999,
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    overflow: 'hidden',
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 42, 84, 0.65)',
  },
  headerWrap: {
    width: '100%',
    height: 184,
  },
  headerGradient: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicWrap: {
    width: '100%',
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  controllerImage: {
    width: 220,
    height: 148,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  waveOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
  },
  contentWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 28,
    alignItems: 'center',
  },
  titleText: {
    color: '#FF2A54',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  messageText: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonsContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF2A54',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  twoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonHalf: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF2A54',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  stackedButtonsCol: {
    gap: 10,
    width: '100%',
  },
  secondaryButtonFull: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
