import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '../../features/call/CallContext';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../../icons';

// Safe dynamic require for expo-camera to support web and all environments
let CameraView: any = null;
try {
  const cameraPkg = require('expo-camera');
  CameraView = cameraPkg.CameraView || null;
} catch {
  CameraView = null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const CallModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    callState,
    callType,
    peer,
    durationSeconds,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    facing,
    endReason,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    toggleSpeaker,
  } = useCall();

  // Pulse animation for ringing and sound waves
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callState === 'incoming' || callState === 'outgoing') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else if (callState === 'connected' && callType === 'audio') {
      const waveLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(waveAnim1, {
              toValue: 1.25,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: 1.45,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(waveAnim1, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: 1,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      waveLoop.start();
      return () => waveLoop.stop();
    }
  }, [callState, callType, pulseAnim, waveAnim1, waveAnim2]);

  if (callState === 'idle') return null;

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={endCall}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 44),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        {/* ======================================================== */}
        {/* VIDEO CALL ACTIVE VIEW                                   */}
        {/* ======================================================== */}
        {callType === 'video' && callState === 'connected' ? (
          <View style={styles.videoContainer}>
            {/* Camera Preview or Privacy Placeholder */}
            {!isVideoOff && CameraView ? (
              <CameraView style={styles.cameraFill} facing={facing} />
            ) : (
              <View style={styles.videoOffPlaceholder}>
                <Avatar
                  displayName={peer?.name || 'Player'}
                  avatarUrl={peer?.avatarUrl || null}
                  size="xl"
                />
                <Text style={styles.videoOffText}>Camera Paused</Text>
              </View>
            )}

            {/* Video Overlay Top Bar */}
            <View style={styles.videoTopBar}>
              <View style={styles.videoPeerPill}>
                <Text style={styles.videoPeerName}>{peer?.name || 'Player'}</Text>
                <View style={styles.timerBadge}>
                  <View style={styles.timerLiveDot} />
                  <Text style={styles.timerText}>{formatDuration(durationSeconds)}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={flipCamera}
                style={styles.flipCameraBtn}
                activeOpacity={0.8}
                accessibilityLabel="Switch Camera"
              >
                <Icon name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Video Controls Bar */}
            <View style={styles.videoBottomControls}>
              <TouchableOpacity
                onPress={toggleMute}
                style={[styles.circleBtn, isMuted && styles.activeControlBtn]}
                activeOpacity={0.8}
                accessibilityLabel="Mute Microphone"
              >
                <Icon name="mic" size={22} color={isMuted ? '#EF4444' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleVideo}
                style={[styles.circleBtn, isVideoOff && styles.activeControlBtn]}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Camera"
              >
                <Icon name="videoCall" size={22} color={isVideoOff ? '#EF4444' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleSpeaker}
                style={[styles.circleBtn, isSpeakerOn && styles.speakerOnBtn]}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Speaker"
              >
                <Icon name="volume" size={22} color={isSpeakerOn ? '#3B82F6' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={endCall}
                style={styles.hangupBtn}
                activeOpacity={0.8}
                accessibilityLabel="End Video Call"
              >
                <Icon name="phoneOff" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ======================================================== */
          /* AUDIO / INCOMING / OUTGOING / ENDED CALL VIEW            */
          /* ======================================================== */
          <View style={styles.audioContent}>
            {/* Header Status */}
            <View style={styles.headerCol}>
              <View style={styles.callTypeBadge}>
                <Icon
                  name={callType === 'video' ? 'videoCall' : 'audioCall'}
                  size={14}
                  color="#3B82F6"
                />
                <Text style={styles.callTypeBadgeText}>
                  {callType === 'video' ? 'HD VIDEO CALL' : 'HIGH DEFINITION VOICE'}
                </Text>
              </View>

              <Text style={styles.statusLabel}>
                {callState === 'incoming'
                  ? 'INCOMING CALL'
                  : callState === 'outgoing'
                  ? 'CALLING...'
                  : callState === 'connected'
                  ? formatDuration(durationSeconds)
                  : endReason || 'CALL ENDED'}
              </Text>
            </View>

            {/* Avatar & Pulse Rings */}
            <View style={styles.centerAvatarArea}>
              {callState === 'connected' && (
                <>
                  <Animated.View
                    style={[styles.pulseRing, styles.pulseRingOuter, { transform: [{ scale: waveAnim2 }] }]}
                  />
                  <Animated.View
                    style={[styles.pulseRing, styles.pulseRingInner, { transform: [{ scale: waveAnim1 }] }]}
                  />
                </>
              )}

              {(callState === 'incoming' || callState === 'outgoing') && (
                <Animated.View
                  style={[styles.pulseRing, styles.pulseRingInner, { transform: [{ scale: pulseAnim }] }]}
                />
              )}

              <View style={styles.avatarWrap}>
                <Avatar
                  displayName={peer?.name || 'Player'}
                  avatarUrl={peer?.avatarUrl || null}
                  size="xl"
                />
              </View>
            </View>

            {/* Player Details */}
            <View style={styles.peerDetailsCol}>
              <Text style={styles.peerDisplayName} numberOfLines={1}>
                {peer?.name || 'Player'}
              </Text>
              <Text style={styles.peerUsernameText}>@{peer?.username || 'player'}</Text>
              {callState === 'connected' && (
                <View style={styles.secureBanner}>
                  <Icon name="check" size={12} color="#10B981" />
                  <Text style={styles.secureBannerText}>End-to-End Realtime Audio Connected</Text>
                </View>
              )}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActionsArea}>
              {callState === 'incoming' ? (
                /* Incoming Controls: Decline (Red) & Accept (Green) */
                <View style={styles.incomingBtnRow}>
                  <TouchableOpacity
                    onPress={() => rejectCall('declined')}
                    style={[styles.callActionBtn, styles.declineBtn]}
                    activeOpacity={0.8}
                    accessibilityLabel="Decline Call"
                  >
                    <Icon name="phoneOff" size={28} color="#FFFFFF" />
                    <Text style={styles.btnActionLabel}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={acceptCall}
                    style={[styles.callActionBtn, styles.acceptBtn]}
                    activeOpacity={0.8}
                    accessibilityLabel="Accept Call"
                  >
                    <Icon
                      name={callType === 'video' ? 'videoCall' : 'audioCall'}
                      size={28}
                      color="#FFFFFF"
                    />
                    <Text style={styles.btnActionLabel}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ) : callState === 'connected' ? (
                /* Connected Audio Controls: Mute, Hang Up, Speaker */
                <View style={styles.connectedControlsRow}>
                  <TouchableOpacity
                    onPress={toggleMute}
                    style={[styles.circleBtn, isMuted && styles.activeControlBtn]}
                    activeOpacity={0.8}
                    accessibilityLabel="Mute Microphone"
                  >
                    <Icon name="mic" size={24} color={isMuted ? '#EF4444' : '#FFFFFF'} />
                    <Text style={styles.controlBtnLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={endCall}
                    style={styles.hangupBtn}
                    activeOpacity={0.8}
                    accessibilityLabel="End Call"
                  >
                    <Icon name="phoneOff" size={28} color="#FFFFFF" />
                    <Text style={styles.controlBtnLabel}>End</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleSpeaker}
                    style={[styles.circleBtn, isSpeakerOn && styles.speakerOnBtn]}
                    activeOpacity={0.8}
                    accessibilityLabel="Toggle Speaker"
                  >
                    <Icon name="volume" size={24} color={isSpeakerOn ? '#3B82F6' : '#FFFFFF'} />
                    <Text style={styles.controlBtnLabel}>{isSpeakerOn ? 'Speaker On' : 'Speaker'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Outgoing or Ended: Cancel / End */
                <View style={styles.outgoingControlsRow}>
                  <TouchableOpacity
                    onPress={endCall}
                    style={styles.hangupBtn}
                    activeOpacity={0.8}
                    accessibilityLabel="Cancel Call"
                  >
                    <Icon name="phoneOff" size={28} color="#FFFFFF" />
                    <Text style={styles.controlBtnLabel}>
                      {callState === 'ended' ? 'Dismiss' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    justifyContent: 'space-between',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#05070A',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoOffPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111622',
    gap: 16,
  },
  videoOffText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  videoTopBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoPeerPill: {
    backgroundColor: '#141926',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242C40',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoPeerName: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E2638',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  timerText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  flipCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141926',
    borderWidth: 1,
    borderColor: '#242C40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#111622',
    paddingVertical: 14,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#242C40',
  },
  audioContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerCol: {
    alignItems: 'center',
    marginTop: 20,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141E33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#253556',
    marginBottom: 12,
  },
  callTypeBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusLabel: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerAvatarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 220,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 150,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  pulseRingInner: {
    width: 170,
    height: 170,
    backgroundColor: '#1E293B',
  },
  pulseRingOuter: {
    width: 210,
    height: 210,
    borderColor: '#1D4ED8',
  },
  avatarWrap: {
    borderWidth: 4,
    borderColor: '#3B82F6',
    borderRadius: 70,
    padding: 4,
    backgroundColor: '#0F172A',
  },
  peerDetailsCol: {
    alignItems: 'center',
  },
  peerDisplayName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  peerUsernameText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  secureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  secureBannerText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomActionsArea: {
    marginBottom: 10,
  },
  incomingBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  callActionBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  btnActionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  connectedControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111622',
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#242C40',
  },
  outgoingControlsRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#1E2638',
    borderWidth: 1,
    borderColor: '#333F58',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlBtn: {
    backgroundColor: '#451A1A',
    borderColor: '#EF4444',
  },
  speakerOnBtn: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  hangupBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  controlBtnLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
