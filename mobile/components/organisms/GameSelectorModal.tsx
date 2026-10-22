import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { GameLogo } from '../atoms/GameLogo';
import { GAME_CAPABILITIES } from '../../constants/gameCapabilities';

export interface GameSelectorModalProps {
  visible: boolean;
  selectedGameId: string | null;
  onSelectGame: (gameId: string | null) => void;
  onClose: () => void;
}

interface GameItem {
  id: string;
  name: string;
}

export const GameSelectorModal: React.FC<GameSelectorModalProps> = ({
  visible,
  selectedGameId,
  onSelectGame,
  onClose,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique games list from GAME_CAPABILITIES
  const gamesList: GameItem[] = useMemo(() => {
    return Object.values(GAME_CAPABILITIES).map((g) => ({
      id: g.id,
      name: g.name,
    }));
  }, []);

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return gamesList;
    const q = searchQuery.toLowerCase().trim();
    return gamesList.filter(
      (g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
    );
  }, [gamesList, searchQuery]);

  const handleSelect = (id: string | null) => {
    onSelectGame(id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: theme.colors.background || '#07090E' },
        ]}
      >
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Icon name="close" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Related Game
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
              Tag a game to your post (Optional)
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="search" size={16} color={theme.colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Search games (e.g. Ludo, Chess, Pool)..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Icon name="close" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Games List */}
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            // "No Game (None)" Default Option
            <TouchableOpacity
              onPress={() => handleSelect(null)}
              style={[
                styles.gameItemRow,
                {
                  backgroundColor: !selectedGameId
                    ? theme.colors.cardTintMint || 'rgba(62, 213, 152, 0.12)'
                    : theme.colors.surface,
                  borderColor: !selectedGameId ? theme.colors.primary : theme.colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.noneLogoBox,
                  { backgroundColor: theme.colors.surfaceElevated },
                ]}
              >
                <Icon name="close" size={18} color={theme.colors.textMuted} />
              </View>
              <View style={styles.gameInfo}>
                <Text
                  style={[
                    styles.gameName,
                    {
                      color: !selectedGameId
                        ? theme.colors.primary
                        : theme.colors.textPrimary,
                      fontWeight: !selectedGameId ? '800' : '600',
                    },
                  ]}
                >
                  No Related Game
                </Text>
                <Text style={[styles.gameCategory, { color: theme.colors.textMuted }]}>
                  Post without attaching any game badge (Default)
                </Text>
              </View>
              {!selectedGameId && (
                <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const isSelected = selectedGameId === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item.id)}
                style={[
                  styles.gameItemRow,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.cardTintMint || 'rgba(62, 213, 152, 0.12)'
                      : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                activeOpacity={0.75}
              >
                <GameLogo gameType={item.id} size={40} borderRadius={8} />
                <View style={styles.gameInfo}>
                  <Text
                    style={[
                      styles.gameName,
                      {
                        color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.gameCategory, { color: theme.colors.textMuted }]}>
                    Game ID: {item.id}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}>
                    <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'android' ? 6 : 0,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  gameItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  noneLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 14,
  },
  gameCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameSelectorModal;
