import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';

export interface AspectRatioOption {
  id: string;
  label: string;
  ratio: number | null; // width / height, or null for original
  iconText: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: 'original', label: 'Original', ratio: null, iconText: 'Fit' },
  { id: '1:1', label: '1:1 Square', ratio: 1, iconText: '1:1' },
  { id: '4:5', label: '4:5 Portrait', ratio: 4 / 5, iconText: '4:5' },
  { id: '16:9', label: '16:9 Wide', ratio: 16 / 9, iconText: '16:9' },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16, iconText: '9:16' },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3, iconText: '4:3' },
  { id: '3:2', label: '3:2 Classic', ratio: 3 / 2, iconText: '3:2' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_CONTAINER_SIZE = Math.min(SCREEN_WIDTH - 32, SCREEN_HEIGHT * 0.46);

interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCropDone: (resultUri: string, ratioId: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  onClose,
  onCropDone,
}) => {
  const { theme } = useTheme();
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(ASPECT_RATIOS[0]);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270

  if (!imageUri) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setSelectedRatio(ASPECT_RATIOS[0]);
    setRotation(0);
  };

  const handleDone = () => {
    onCropDone(imageUri, selectedRatio.id);
    onClose();
  };

  // Compute framing box dimensions based on chosen ratio
  let frameWidth = PREVIEW_CONTAINER_SIZE;
  let frameHeight = PREVIEW_CONTAINER_SIZE;

  if (selectedRatio.ratio !== null) {
    if (selectedRatio.ratio >= 1) {
      // Landscape or square
      frameWidth = PREVIEW_CONTAINER_SIZE;
      frameHeight = PREVIEW_CONTAINER_SIZE / selectedRatio.ratio;
    } else {
      // Portrait
      frameHeight = PREVIEW_CONTAINER_SIZE;
      frameWidth = PREVIEW_CONTAINER_SIZE * selectedRatio.ratio;
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0B0E14' }]}>
        <StatusBar barStyle="light-content" />

        {/* Top Navbar */}
        <View style={[styles.navbar, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.navTitle}>Crop & Ratio</Text>
            <Text style={styles.navSubtitle}>{selectedRatio.label}</Text>
          </View>

          <TouchableOpacity onPress={handleDone} style={styles.doneBtn} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Main Crop Frame Viewport */}
        <View style={styles.viewportContainer}>
          <View
            style={[
              styles.cropFrame,
              {
                width: frameWidth,
                height: frameHeight,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.previewImage,
                {
                  transform: [{ rotate: `${rotation}deg` }],
                },
              ]}
              resizeMode={selectedRatio.id === 'original' ? 'contain' : 'cover'}
            />

            {/* Rule of Thirds Grid Overlay */}
            <View style={styles.gridOverlay} pointerEvents="none">
              <View style={[styles.gridLineH, { top: '33.33%' }]} />
              <View style={[styles.gridLineH, { top: '66.66%' }]} />
              <View style={[styles.gridLineV, { left: '33.33%' }]} />
              <View style={[styles.gridLineV, { left: '66.66%' }]} />
            </View>

            {/* Corner Indicators */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: theme.colors.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: theme.colors.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: theme.colors.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: theme.colors.primary }]} />
          </View>
        </View>

        {/* Tool Bar: Rotate & Reset */}
        <View style={styles.toolRow}>
          <TouchableOpacity onPress={handleRotate} style={styles.toolBtn} activeOpacity={0.7}>
            <Icon name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.toolBtnText}>Rotate ({rotation}°)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset} style={styles.toolBtn} activeOpacity={0.7}>
            <Icon name="close" size={16} color="#94A3B8" />
            <Text style={[styles.toolBtnText, { color: '#94A3B8' }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Aspect Ratio Preset Selector Strip */}
        <View style={styles.ratioSection}>
          <Text style={styles.ratioSectionTitle}>SELECT ASPECT RATIO</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ratioScrollContent}
          >
            {ASPECT_RATIOS.map((item) => {
              const isSelected = selectedRatio.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedRatio(item)}
                  style={[
                    styles.ratioChip,
                    isSelected && {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.ratioIconBadge,
                      isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratioBadgeText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {item.iconText}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ratioLabel,
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'android' ? 6 : 0,
  },
  navBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  titleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navSubtitle: {
    color: '#3ED598',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  doneBtn: {
    backgroundColor: '#3ED598',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
  },
  doneBtnText: {
    color: '#0B0E14',
    fontSize: 14,
    fontWeight: '700',
  },
  viewportContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#07090E',
  },
  cropFrame: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0B0E14',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  toolBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratioSection: {
    paddingVertical: 14,
    backgroundColor: '#0B0E14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  ratioSectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  ratioScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  ratioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratioIconBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  ratioBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  ratioLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
});
