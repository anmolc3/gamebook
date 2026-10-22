import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Rect, G } from 'react-native-svg';
import { GameLogo } from '../../components/atoms/GameLogo';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import {
  AiDifficulty,
  AiDifficultySelector,
  loadSavedAiDifficulty,
  saveAiDifficultyPreference,
} from '../../components/molecules/AiDifficultySelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type LudoPlayerCount = 2 | 3 | 4;

export interface LudoLobbyScreenProps {
  onBack: () => void;
  onPlayOnline: (playerCount: LudoPlayerCount) => void;
  onPlayWithFriends?: (playerCount: LudoPlayerCount) => void;
  onCreateRoom: (playerCount: LudoPlayerCount) => void;
  onJoinRoom: (roomCode: string) => Promise<void> | void;
  onPlaySolo?: (playerCount: LudoPlayerCount, difficulty?: AiDifficulty) => void;
}

export const LudoLobbyScreen: React.FC<LudoLobbyScreenProps> = ({
  onBack,
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onPlaySolo,
}) => {
  const { theme, effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';

  const [selectedPlayers, setSelectedPlayers] = useState<LudoPlayerCount>(4);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isAiSetupVisible, setIsAiSetupVisible] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('MEDIUM');

  useEffect(() => {
    loadSavedAiDifficulty().then((diff) => {
      setAiDifficulty(diff);
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAiSetupVisible) {
        setIsAiSetupVisible(false);
        return true;
      }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, isAiSetupVisible]);

  const handleJoin = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 3) {
      setJoinError('Please enter a valid room code');
      return;
    }
    setJoinError(null);
    setIsJoining(true);
    try {
      await onJoinRoom(code);
    } catch (err: any) {
      setJoinError(err?.message || 'Could not join room. Check code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#080E13" />

      {/* Top Header - No Coins */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Back"
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Polyline
                points="15 18 9 12 15 6"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <GameLogo gameType="LUDO" size={30} borderRadius={8} />
          <Text style={styles.headerTitle}>Ludo</Text>
        </View>

        {/* Format Badge Indicator */}
        <View style={styles.headerRightBadge}>
          <Text style={styles.headerRightBadgeText}>Classic Arena</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        alwaysBounceVertical={true}
        nestedScrollEnabled={true}
        overScrollMode="always"
        scrollEventThrottle={16}
      >
        {/* Hero 3D Ludo Art Container */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/images/ludo_hero_art.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Merged Player Count Selector */}
        <View style={styles.selectorSection}>
          <View style={styles.selectorHeader}>
            <View style={styles.selectorTitleRow}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z"
                  stroke="#FFB800"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={styles.selectorTitle}>PLAYERS</Text>
            </View>
            <View style={styles.activePlayerCountPill}>
              <Text style={styles.activePlayerCountText}>{selectedPlayers} Players Selected</Text>
            </View>
          </View>

          {/* 3 Segmented Selector Cards */}
          <View style={styles.segmentedRow}>
            {/* 2 Players */}
            <TouchableOpacity
              style={[
                styles.segmentCard,
                selectedPlayers === 2 && styles.segmentCardActive,
              ]}
              onPress={() => setSelectedPlayers(2)}
              activeOpacity={0.8}
            >
              <View style={styles.segmentDotsRow}>
                <View style={[styles.playerColorDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#F59E0B' }]} />
              </View>
              <Text
                style={[
                  styles.segmentCountText,
                  selectedPlayers === 2 && styles.segmentCountTextActive,
                ]}
              >
                2 Players
              </Text>
              <Text style={styles.segmentLabelText}>Duel (1v1)</Text>
              {selectedPlayers === 2 && (
                <View style={styles.activeCheckPill}>
                  <Text style={styles.activeCheckPillText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 3 Players */}
            <TouchableOpacity
              style={[
                styles.segmentCard,
                selectedPlayers === 3 && styles.segmentCardActive,
              ]}
              onPress={() => setSelectedPlayers(3)}
              activeOpacity={0.8}
            >
              <View style={styles.segmentDotsRow}>
                <View style={[styles.playerColorDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#10B981' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#F59E0B' }]} />
              </View>
              <Text
                style={[
                  styles.segmentCountText,
                  selectedPlayers === 3 && styles.segmentCountTextActive,
                ]}
              >
                3 Players
              </Text>
              <Text style={styles.segmentLabelText}>Clash</Text>
              {selectedPlayers === 3 && (
                <View style={styles.activeCheckPill}>
                  <Text style={styles.activeCheckPillText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 4 Players */}
            <TouchableOpacity
              style={[
                styles.segmentCard,
                selectedPlayers === 4 && styles.segmentCardActive,
              ]}
              onPress={() => setSelectedPlayers(4)}
              activeOpacity={0.8}
            >
              <View style={styles.segmentDotsRow}>
                <View style={[styles.playerColorDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#10B981' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#F59E0B' }]} />
                <View style={[styles.playerColorDot, { backgroundColor: '#2563EB' }]} />
              </View>
              <Text
                style={[
                  styles.segmentCountText,
                  selectedPlayers === 4 && styles.segmentCountTextActive,
                ]}
              >
                4 Players
              </Text>
              <Text style={styles.segmentLabelText}>Classic</Text>
              {selectedPlayers === 4 && (
                <View style={styles.activeCheckPill}>
                  <Text style={styles.activeCheckPillText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Description Subtitle Banner */}
          <View style={styles.formatDescriptionBanner}>
            <Text style={styles.formatDescriptionText}>
              {selectedPlayers === 2
                ? '⚔️ 1v1 Head-to-Head Duel across opposite Red & Yellow corners'
                : selectedPlayers === 3
                ? '⚡ 3-Way Token Clash racing to the center triangle'
                : '👑 Classic 4-Player Board Race with all corners active'}
            </Text>
          </View>
        </View>

        {/* Merged Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {/* 1. Play Online (Prominent Gold Action) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.goldActionCard]}
            onPress={() => onPlayOnline(selectedPlayers)}
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.goldIconWrapper}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#080E13" strokeWidth="2.2" />
                  <Path
                    d="M2 12H22M12 2C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 22C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 2Z"
                    stroke="#080E13"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <View style={styles.actionTexts}>
                <Text style={styles.goldTitle}>Play Online</Text>
                <Text style={styles.goldSubtitle}>
                  Match with {selectedPlayers} players instantly
                </Text>
              </View>
            </View>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18L15 12L9 6"
                stroke="#080E13"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* 2. Create Room (Vibrant Blue Action) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.blueActionCard]}
            onPress={() => onCreateRoom(selectedPlayers)}
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.blueIconWrapper}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13ZM23 21V19C22.99 18.18 22.42 17.47 21.62 17.24M16 5.13C17.7 5.67 18.88 7.21 18.88 9C18.88 10.79 17.7 12.33 16 12.87"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.actionTexts}>
                <Text style={styles.blueTitle}>Create Room ({selectedPlayers}P)</Text>
                <Text style={styles.blueSubtitle}>Invite friends with a private room code</Text>
              </View>
            </View>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18L15 12L9 6"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* 3. Inline Merged Join Room Card */}
          <View style={styles.joinInlineCard}>
            <View style={styles.joinHeaderRow}>
              <View style={styles.darkIconWrapper}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 7V5C3 3.9 3.9 3 5 3H7M17 3H19C20.1 3 21 3.9 21 5V7M21 17V19C21 20.1 20.1 21 19 21H17M7 21H5C3.9 21 3 20.1 3 19V17M7 9H9V11H7V9ZM15 9H17V11H15V9ZM7 15H9V17H7V15ZM15 15H17V17H15V15Z"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.actionTexts}>
                <Text style={styles.darkTitle}>Join Room</Text>
                <Text style={styles.darkSubtitle}>Enter 6-digit room code to join</Text>
              </View>
            </View>

            {/* Inline Input and Action Button Row */}
            <View style={styles.joinInputRow}>
              <TextInput
                style={styles.joinInput}
                placeholder="ROOM CODE"
                placeholderTextColor="#6B7A90"
                value={roomCodeInput}
                onChangeText={(text) => {
                  setRoomCodeInput(text.toUpperCase());
                  setJoinError(null);
                }}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.joinSubmitBtn,
                  roomCodeInput.trim().length < 3 && styles.joinSubmitBtnDisabled,
                ]}
                onPress={handleJoin}
                disabled={roomCodeInput.trim().length < 3 || isJoining}
                activeOpacity={0.85}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#080E13" />
                ) : (
                  <Text style={styles.joinSubmitBtnText}>JOIN</Text>
                )}
              </TouchableOpacity>
            </View>

            {joinError ? (
              <Text style={styles.joinErrorText}>{joinError}</Text>
            ) : null}
          </View>

          {/* 4. Play vs Otter (Solo Practice) */}
          {onPlaySolo ? (
            <TouchableOpacity
              style={[styles.actionCard, styles.darkActionCard]}
              onPress={() => setIsAiSetupVisible(true)}
              activeOpacity={0.88}
            >
              <View style={styles.actionLeft}>
                <View style={styles.darkIconWrapper}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.darkTitle}>Play vs AI Bots</Text>
                  <Text style={styles.darkSubtitle}>
                    {selectedPlayers === 2
                      ? 'Practice solo vs Otter'
                      : selectedPlayers === 3
                      ? 'Practice vs Otter & Ollie'
                      : 'Practice vs Otter, Ollie & Otto'}
                  </Text>
                </View>
              </View>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 18L15 12L9 6"
                  stroke="#6B7A90"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* AI DIFFICULTY SELECTION MODAL */}
      <Modal
        visible={isAiSetupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAiSetupVisible(false)}
      >
        <View style={styles.aiModalBackdrop}>
          <View
            style={[
              styles.aiModalCard,
              {
                backgroundColor: isDark ? theme.colors.surfaceElevated : '#FFFFFF',
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.aiModalHeader}>
              <View style={styles.aiModalHeaderTitleCol}>
                <Text
                  style={[
                    styles.aiModalTitle,
                    { color: isDark ? theme.colors.textPrimary : '#0F172A' },
                  ]}
                >
                  🦦 Play vs AI Bots
                </Text>
                <Text
                  style={[
                    styles.aiModalSubtitle,
                    { color: isDark ? theme.colors.textSecondary : '#64748B' },
                  ]}
                >
                  {selectedPlayers === 2
                    ? '2-Player Match (You vs Otter)'
                    : selectedPlayers === 3
                    ? '3-Player Match (You vs Otter & Ollie)'
                    : '4-Player Match (You vs Otter, Ollie & Otto)'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsAiSetupVisible(false)}
                style={[
                  styles.aiModalCloseBtn,
                  { backgroundColor: isDark ? theme.colors.surface : '#F1F5F9' },
                ]}
                activeOpacity={0.7}
              >
                <Icon
                  name="close"
                  size={18}
                  color={isDark ? theme.colors.textSecondary : '#64748B'}
                />
              </TouchableOpacity>
            </View>

            {/* AI Difficulty Selector Component */}
            <AiDifficultySelector
              value={aiDifficulty}
              onChange={(diff) => {
                setAiDifficulty(diff);
                saveAiDifficultyPreference(diff);
              }}
              variant="cards"
              showDescription={true}
              title="Select AI Difficulty"
            />

            {/* Start AI Match Button */}
            <TouchableOpacity
              style={[
                styles.aiModalStartBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setIsAiSetupVisible(false);
                onPlaySolo?.(selectedPlayers, aiDifficulty);
              }}
              activeOpacity={0.88}
            >
              <Icon name="play" size={18} color={theme.colors.textOnPrimary} />
              <Text
                style={[
                  styles.aiModalStartBtnText,
                  { color: theme.colors.textOnPrimary },
                ]}
              >
                Start Match ({aiDifficulty.charAt(0) + aiDifficulty.slice(1).toLowerCase()})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E13',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerRightBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#111822',
    borderWidth: 1.2,
    borderColor: '#1D2838',
  },
  headerRightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E9CAE',
    letterSpacing: 0.4,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  heroImage: {
    width: Math.min(SCREEN_WIDTH - 40, 320),
    height: 200,
  },
  /* Merged Player Count Selector Styles */
  selectorSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#0E1520',
    borderWidth: 1.5,
    borderColor: '#1D2838',
    gap: 12,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 0.8,
  },
  activePlayerCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#192330',
  },
  activePlayerCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentCard: {
    flex: 1,
    backgroundColor: '#111822',
    borderWidth: 1.5,
    borderColor: '#1D2838',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    position: 'relative',
  },
  segmentCardActive: {
    backgroundColor: '#152130',
    borderColor: '#FFB800',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentDotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginBottom: 2,
  },
  playerColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E9CAE',
  },
  segmentCountTextActive: {
    color: '#FFFFFF',
  },
  segmentLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activeCheckPill: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#080E13',
    lineHeight: 12,
  },
  formatDescriptionBanner: {
    backgroundColor: '#121A24',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A2534',
  },
  formatDescriptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  /* Action Cards Area */
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  actionTexts: {
    gap: 3,
    flex: 1,
  },
  /* Gold Action */
  goldActionCard: {
    backgroundColor: '#FFB800',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  goldIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#080E13',
    letterSpacing: 0.2,
  },
  goldSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A1F04',
  },
  /* Blue Action */
  blueActionCard: {
    backgroundColor: '#0066FF',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  blueIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  blueSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B3D4FF',
  },
  /* Dark Action */
  darkActionCard: {
    backgroundColor: '#111822',
    borderColor: '#1D2838',
    borderWidth: 1.5,
  },
  darkIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  darkSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E9CAE',
  },
  /* Inline Merged Join Room Card */
  joinInlineCard: {
    backgroundColor: '#111822',
    borderColor: '#1D2838',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  joinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  joinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  joinInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#090F16',
    borderWidth: 1.5,
    borderColor: '#243245',
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  joinSubmitBtn: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinSubmitBtnDisabled: {
    opacity: 0.45,
  },
  joinSubmitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#080E13',
    letterSpacing: 0.5,
  },
  joinErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: -4,
  },

  /* AI Setup Modal Styles */
  aiModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aiModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  aiModalHeaderTitleCol: {
    flex: 1,
    gap: 2,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  aiModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModalStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  aiModalStartBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
