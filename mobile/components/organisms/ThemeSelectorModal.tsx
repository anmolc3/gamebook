import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme, ThemeId, AppearanceMode } from '../../theme';
import { THEME_METADATA, resolveTheme } from '../../theme/themes';
import { Icon } from '../../icons';
import { IconButton } from '../molecules/IconButton';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme, themeId, appearanceMode, effectiveMode, setThemeId, setAppearanceMode } = useTheme();

  const appearanceOptions: { mode: AppearanceMode; label: string; icon: 'sun' | 'moon' | 'palette' }[] = [
    { mode: 'system', label: 'System', icon: 'palette' },
    { mode: 'light', label: 'Light', icon: 'sun' },
    { mode: 'dark', label: 'Dark', icon: 'moon' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <SafeAreaView style={styles.sheetContainer}>
          <View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.radius.sheet,
                borderTopRightRadius: theme.radius.sheet,
                borderColor: theme.colors.border,
              },
              theme.shadows.modal,
            ]}
          >
            {/* Grab Handle */}
            <View style={styles.grabHandleWrapper}>
              <View
                style={[
                  styles.grabHandle,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  Appearance & Themes
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Personalize your visual experience
                </Text>
              </View>
              <IconButton
                icon="close"
                size={36}
                iconSize={18}
                variant="tinted"
                onPress={onClose}
                accessibilityLabel="Close theme selector"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {/* Appearance Mode Segmented Control */}
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Appearance Mode
              </Text>
              <View
                style={[
                  styles.modeContainer,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {appearanceOptions.map((opt) => {
                  const isSelected = appearanceMode === opt.mode;
                  return (
                    <TouchableOpacity
                      key={opt.mode}
                      onPress={() => setAppearanceMode(opt.mode)}
                      style={[
                        styles.modeOption,
                        isSelected && {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.modeText,
                          {
                            color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Theme Palette Choices */}
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: 24 }]}>
                Theme Family (5 Hand-Crafted Palettes)
              </Text>

              {THEME_METADATA.map((meta) => {
                const isSelected = themeId === meta.id;
                const sampleTheme = resolveTheme(meta.id, effectiveMode);

                return (
                  <TouchableOpacity
                    key={meta.id}
                    onPress={() => setThemeId(meta.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: sampleTheme.colors.surface,
                        borderColor: isSelected
                          ? sampleTheme.colors.primary
                          : sampleTheme.colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      isSelected ? theme.shadows.card : theme.shadows.soft,
                    ]}
                  >
                    {/* Visual Card Preview Inside */}
                    <View style={styles.cardHeader}>
                      <View style={styles.colorPills}>
                        <View
                          style={[
                            styles.previewDot,
                            { backgroundColor: sampleTheme.colors.primary },
                          ]}
                        />
                        <View
                          style={[
                            styles.previewDot,
                            { backgroundColor: sampleTheme.colors.secondary },
                          ]}
                        />
                        <View
                          style={[
                            styles.previewDot,
                            { backgroundColor: sampleTheme.colors.accent },
                          ]}
                        />
                      </View>
                      <Text style={[styles.themeName, { color: sampleTheme.colors.textPrimary }]}>
                        {meta.name}
                      </Text>
                      {isSelected ? (
                        <View
                          style={[
                            styles.checkBadge,
                            { backgroundColor: sampleTheme.colors.primary },
                          ]}
                        >
                          <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.unselectedBadge,
                            { borderColor: sampleTheme.colors.border },
                          ]}
                        />
                      )}
                    </View>

                    {/* Miniature UI Demonstration Preview */}
                    <View
                      style={[
                        styles.miniUiPreview,
                        {
                          backgroundColor: sampleTheme.colors.background,
                          borderColor: sampleTheme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.miniElevatedCard,
                          {
                            backgroundColor: sampleTheme.colors.surfaceElevated,
                            borderColor: sampleTheme.colors.border,
                          },
                        ]}
                      >
                        <View style={styles.miniRow}>
                          <Icon name="gamepad" size={14} color={sampleTheme.colors.primary} />
                          <View
                            style={[
                              styles.miniBar,
                              { backgroundColor: sampleTheme.colors.textPrimary },
                            ]}
                          />
                        </View>
                        <View
                          style={[
                            styles.miniButton,
                            { backgroundColor: sampleTheme.colors.primary },
                          ]}
                        >
                          <Text style={[styles.miniBtnText, { color: sampleTheme.colors.textOnPrimary }]}>
                            Play
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '90%',
  },
  content: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '100%',
  },
  grabHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scroll: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeText: {
    fontSize: 13,
    marginLeft: 6,
  },
  themeCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorPills: {
    flexDirection: 'row',
    marginRight: 10,
  },
  previewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  miniUiPreview: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  miniElevatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
    opacity: 0.7,
  },
  miniButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
