import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { useAuth } from '../../features/auth/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface LudoLobbyScreenProps {
  onBack: () => void;
  onPlayOnline: () => void;
  onPlayWithFriends: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const LudoLobbyScreen: React.FC<LudoLobbyScreenProps> = ({
  onBack,
  onPlayOnline,
  onPlayWithFriends,
  onCreateRoom,
  onJoinRoom,
}) => {
  const { user } = useAuth();
  const coinsDisplay = (user as any)?.coins !== undefined
    ? Number((user as any).coins).toLocaleString()
    : '12,450';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#080E13" />

      {/* Top Header */}
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
          <Text style={styles.headerTitle}>Ludo</Text>
        </View>

        {/* Coin Balance Capsule */}
        <View style={styles.coinCapsule}>
          <View style={styles.coinIconBadge}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill="#FFB800" stroke="#FFE082" strokeWidth="1.5" />
              <Circle cx="12" cy="12" r="7" stroke="#D97706" strokeWidth="1" strokeDasharray="2 2" />
              <Path d="M12 7V17M9.5 9.5H14.5" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={styles.coinBalanceText}>{coinsDisplay}</Text>
          <TouchableOpacity
            style={styles.coinAddBtn}
            activeOpacity={0.7}
            accessibilityLabel="Add coins"
          >
            <Text style={styles.coinAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero 3D Ludo Art Container */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/images/ludo_hero_art.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {/* 1. Play Online (Prominent Gold Action) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.goldActionCard]}
            onPress={onPlayOnline}
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
                <Text style={styles.goldSubtitle}>Find random players</Text>
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

          {/* 2. Play with Friends (Vibrant Blue Action) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.blueActionCard]}
            onPress={onPlayWithFriends}
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
                <Text style={styles.blueTitle}>Play with Friends</Text>
                <Text style={styles.blueSubtitle}>Create or join a room</Text>
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

          {/* 3. Create Room (Subtle Dark Gray Card) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.darkActionCard]}
            onPress={onCreateRoom}
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.darkIconWrapper}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.actionTexts}>
                <Text style={styles.darkTitle}>Create Room</Text>
                <Text style={styles.darkSubtitle}>Invite friends with a code</Text>
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

          {/* 4. Join Room (Subtle Dark Gray Card) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.darkActionCard]}
            onPress={onJoinRoom}
            activeOpacity={0.88}
          >
            <View style={styles.actionLeft}>
              <View style={styles.darkIconWrapper}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 7V5C3 3.9 3.9 3 5 3H7M17 3H19C20.1 3 21 3.9 21 5V7M21 17V19C21 20.1 20.1 21 19 21H17M7 21H5C3.9 21 3 20.1 3 19V17M7 9H9V11H7V9ZM15 9H17V11H15V9ZM7 15H9V17H7V15ZM15 15H17V17H15V15Z"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={styles.actionTexts}>
                <Text style={styles.darkTitle}>Join Room</Text>
                <Text style={styles.darkSubtitle}>Enter room code</Text>
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
        </View>
      </ScrollView>
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
  coinCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111822',
    borderColor: '#1D2838',
    borderWidth: 1.2,
    borderRadius: 24,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 8,
  },
  coinIconBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinBalanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  coinAddBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinAddText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#080E13',
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  heroImage: {
    width: Math.min(SCREEN_WIDTH - 40, 320),
    height: 230,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 14,
    marginTop: 6,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  actionTexts: {
    gap: 3,
    flex: 1,
  },
  /* 1. Gold Action */
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
    fontSize: 18,
    fontWeight: '800',
    color: '#080E13',
    letterSpacing: 0.2,
  },
  goldSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1F04',
  },
  /* 2. Blue Action */
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
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  blueSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B3D4FF',
  },
  /* 3 & 4. Dark Action */
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
    fontSize: 13,
    fontWeight: '500',
    color: '#8E9CAE',
  },
});
