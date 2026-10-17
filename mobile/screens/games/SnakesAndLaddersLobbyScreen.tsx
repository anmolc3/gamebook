import React, { useState } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Rect, G } from 'react-native-svg';
import { useAuth } from '../../features/auth/AuthContext';
import { Icon } from '../../icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SnakesAndLaddersLobbyScreenProps {
  onBack: () => void;
  onPlayOnline: (playerCount: 2 | 4) => void;
  onPlayWithFriends?: () => void;
  onCreateRoom: (playerCount: 2 | 4) => void;
  onJoinRoom: (roomCode: string) => Promise<void> | void;
  onPlaySolo?: (playerCount: 2 | 4, difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT', botId?: string) => void;
}

const AI_BOTS = [
  {
    id: 'BOT_PIXEL',
    name: 'Pixel',
    title: 'Casual Companion',
    difficulty: 'EASY' as const,
    badge: '🟢 Easy',
    color: '#10B981',
    desc: 'Relaxed & friendly turns. Great for newcomers.',
  },
  {
    id: 'BOT_NOVA',
    name: 'Nova',
    title: 'Tactical Strategist',
    difficulty: 'MEDIUM' as const,
    badge: '🟡 Medium',
    color: '#3B82F6',
    desc: 'Balanced and methodical. Steady, thoughtful pace.',
  },
  {
    id: 'BOT_ACE',
    name: 'Ace',
    title: 'Aggressive Master',
    difficulty: 'HARD' as const,
    badge: '🟠 Hard',
    color: '#F97316',
    desc: 'Quick, confident, and eager to climb the board.',
  },
  {
    id: 'BOT_ATLAS',
    name: 'Atlas',
    title: 'Grandmaster Solver',
    difficulty: 'EXPERT' as const,
    badge: '🟣 Expert',
    color: '#8B5CF6',
    desc: 'Deep board calculations and maximum precision.',
  },
];

export const SnakesAndLaddersLobbyScreen: React.FC<SnakesAndLaddersLobbyScreenProps> = ({
  onBack,
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onPlaySolo,
}) => {
  const { user } = useAuth();
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'>('MEDIUM');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
      setIsJoinModalVisible(false);
    } catch (err: any) {
      setJoinError(err?.message || 'Could not join room. Check code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />

      {/* TOP HEADER BAR (REFERENCE IMAGE SCREEN 1) */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="15 18 9 12 15 6"
              stroke="#FFFFFF"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Player Profile & Level */}
        <View style={styles.profileBadge}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'P'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.displayName || user?.username || 'Player'}
            </Text>
            {/* Level Bar */}
            <View style={styles.levelRow}>
              <Text style={styles.levelText}>Lv. 12</Text>
              <View style={styles.levelProgressTrack}>
                <View style={styles.levelProgressFill} />
              </View>
            </View>
          </View>
        </View>

        {/* Gold Coin Balance Pill */}
        <View style={styles.coinPill}>
          <View style={styles.coinIconWrap}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>
          <Text style={styles.coinBalanceText}>12,450</Text>
          <TouchableOpacity
            style={styles.plusCoinBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coins', 'Coin store coming soon!')}
          >
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.settingsBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Game Rules',
              'Climb the ladders to advance quickly! Watch out for slippery snakes that send you backwards. The first player to reach square 100 wins!'
            )
          }
        >
          <Icon name="settings" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* CENTER HERO: 3D TITLE ILLUSTRATION */}
        <View style={styles.heroWrap}>
          <Image
            source={require('../../assets/images/snake_ladder_hero.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* PLAYER COUNT SELECTOR PILLS */}
        <View style={styles.playerSelectRow}>
          <TouchableOpacity
            style={[styles.playerTab, playerCount === 2 && styles.playerTabActive]}
            onPress={() => setPlayerCount(2)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.playerTabText,
                playerCount === 2 && styles.playerTabTextActive,
              ]}
            >
              2 Players (1v1 Duel)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playerTab, playerCount === 4 && styles.playerTabActive]}
            onPress={() => setPlayerCount(4)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.playerTabText,
                playerCount === 4 && styles.playerTabTextActive,
              ]}
            >
              4 Players (Battle Royale)
            </Text>
          </TouchableOpacity>
        </View>

        {/* PRIMARY ACTION BUTTON: PLAY ONLINE */}
        <TouchableOpacity
          style={styles.primaryYellowBtn}
          onPress={() => onPlayOnline(playerCount)}
          activeOpacity={0.88}
        >
          <View style={styles.btnIconLeft}>
            <Text style={styles.btnEmoji}>🎲</Text>
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.primaryBtnTitle}>Play Online</Text>
            <Text style={styles.primaryBtnSubtitle}>With Real Players</Text>
          </View>
        </TouchableOpacity>

        {/* SECONDARY ACTION BUTTON: PLAY WITH FRIENDS */}
        <TouchableOpacity
          style={styles.secondaryBlueBtn}
          onPress={() => setIsJoinModalVisible(true)}
          activeOpacity={0.88}
        >
          <View style={styles.btnIconLeft}>
            <Text style={styles.btnEmoji}>👥</Text>
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.secondaryBtnTitle}>Play with Friends</Text>
            <Text style={styles.secondaryBtnSubtitle}>Create or Join Room</Text>
          </View>
        </TouchableOpacity>

        {/* SOLO PRACTICE VS AI BUTTON */}
        {onPlaySolo && (
          <TouchableOpacity
            style={styles.soloGreenBtn}
            onPress={() => setIsAiModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.soloBtnText}>🤖 Play Solo vs AI Bot</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* CREATE OR JOIN ROOM MODAL */}
      <Modal
        visible={isJoinModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsJoinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Play with Friends</Text>
              <TouchableOpacity
                onPress={() => setIsJoinModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Create a Private Room */}
            <TouchableOpacity
              style={styles.createRoomActionBtn}
              onPress={() => {
                setIsJoinModalVisible(false);
                onCreateRoom(playerCount);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.createRoomActionTitle}>✨ Create Private Room</Text>
              <Text style={styles.createRoomActionSubtitle}>
                Host a private match & invite friends with a room code
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR JOIN BY CODE</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Option 2: Join by Room Code */}
            <TextInput
              style={styles.roomCodeInput}
              placeholder="ENTER ROOM CODE"
              placeholderTextColor="#94A3B8"
              value={roomCodeInput}
              onChangeText={(txt) => {
                setRoomCodeInput(txt.toUpperCase());
                setJoinError(null);
              }}
              autoCapitalize="characters"
              maxLength={8}
            />

            {joinError && <Text style={styles.joinErrorText}>{joinError}</Text>}

            <TouchableOpacity
              style={styles.joinSubmitBtn}
              onPress={handleJoin}
              disabled={isJoining}
              activeOpacity={0.85}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#451A03" />
              ) : (
                <Text style={styles.joinSubmitBtnText}>Join Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI BOT & DIFFICULTY SELECTION MODAL */}
      <Modal
        visible={isAiModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAiModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>🤖 Play vs AI</Text>
                <Text style={styles.aiModalSubtitle}>Choose your AI opponent bot</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAiModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* AI Bot Cards */}
            <View style={styles.aiBotList}>
              {AI_BOTS.map((bot) => {
                const isSelected = selectedDifficulty === bot.difficulty;
                return (
                  <TouchableOpacity
                    key={bot.id}
                    style={[
                      styles.aiBotCard,
                      isSelected && { backgroundColor: '#F1F5F9' },
                    ]}
                    onPress={() => setSelectedDifficulty(bot.difficulty)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.aiBotAvatar, { backgroundColor: bot.color }]}>
                      <Text style={styles.aiBotAvatarEmoji}>🤖</Text>
                    </View>
                    <View style={styles.aiBotInfo}>
                      <View style={styles.aiBotHeader}>
                        <Text style={styles.aiBotName}>{bot.name}</Text>
                        <Text style={[styles.aiBotBadge, { color: bot.color }]}>{bot.badge}</Text>
                      </View>
                      <Text style={styles.aiBotTitle}>{bot.title}</Text>
                      <Text style={styles.aiBotDesc}>{bot.desc}</Text>
                    </View>
                    <View style={[styles.aiRadioCircle, isSelected && { borderColor: bot.color }]}>
                      {isSelected && <View style={[styles.aiRadioDot, { backgroundColor: bot.color }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Start Match Button */}
            <TouchableOpacity
              style={styles.startAiBtn}
              onPress={() => {
                const currentBot = AI_BOTS.find((b) => b.difficulty === selectedDifficulty) || AI_BOTS[1];
                setIsAiModalVisible(false);
                onPlaySolo?.(playerCount, selectedDifficulty, currentBot.id);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.startAiBtnText}>
                Start Match vs {AI_BOTS.find((b) => b.difficulty === selectedDifficulty)?.name || 'Nova'}
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
    backgroundColor: '#0284C7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },

  // TOP HEADER BAR
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0284C7',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '800',
  },
  levelProgressTrack: {
    width: 38,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  levelProgressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#FDE047',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 4,
  },
  coinIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinEmoji: {
    fontSize: 13,
  },
  coinBalanceText: {
    color: '#FEF08A',
    fontWeight: '900',
    fontSize: 13,
  },
  plusCoinBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    lineHeight: 14,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // HERO CARD
  heroWrap: {
    width: '100%',
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 26,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // PLAYER COUNT SELECTOR
  playerSelectRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
  },
  playerTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 14,
  },
  playerTabActive: {
    backgroundColor: '#0284C7',
  },
  playerTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  playerTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // PRIMARY BUTTON: PLAY ONLINE (YELLOW)
  primaryYellowBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 14,
    gap: 16,
  },
  btnIconLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEmoji: {
    fontSize: 26,
  },
  btnTextCol: {
    flex: 1,
  },
  primaryBtnTitle: {
    color: '#451A03',
    fontSize: 20,
    fontWeight: '900',
  },
  primaryBtnSubtitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },

  // SECONDARY BUTTON: PLAY WITH FRIENDS (BLUE)
  secondaryBlueBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
    gap: 16,
  },
  secondaryBtnTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  secondaryBtnSubtitle: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '700',
  },

  // SOLO BUTTON
  soloGreenBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  soloBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // SUPPORTING BOTTOM TOOLBAR
  // MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  createRoomActionBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  createRoomActionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  createRoomActionSubtitle: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  roomCodeInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 8,
  },
  joinErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  joinSubmitBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#B45309',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  joinSubmitBtnText: {
    color: '#451A03',
    fontSize: 16,
    fontWeight: '900',
  },
  aiModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  aiBotList: {
    gap: 10,
    marginVertical: 14,
  },
  aiBotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  aiBotAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiBotAvatarEmoji: {
    fontSize: 22,
  },
  aiBotInfo: {
    flex: 1,
  },
  aiBotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBotName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  aiBotBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiBotTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  aiBotDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  aiRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  aiRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  startAiBtn: {
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    marginTop: 4,
  },
  startAiBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
