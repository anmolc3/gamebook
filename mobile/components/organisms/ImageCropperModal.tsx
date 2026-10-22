import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../../icons';
import { ImageCropService, CropRect } from '../../services/imageCrop.service';

export interface AspectRatioOption {
  id: string;
  label: string;
  ratio: number | null; // width / height, or null for dynamic/free
  iconText: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: 'original', label: 'Original', ratio: null, iconText: 'Fit' },
  { id: '1:1', label: '1:1', ratio: 1, iconText: '1:1' },
  { id: '4:5', label: '4:5', ratio: 4 / 5, iconText: '4:5' },
  { id: '3:4', label: '3:4', ratio: 3 / 4, iconText: '3:4' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, iconText: '16:9' },
  { id: 'free', label: 'Free', ratio: null, iconText: 'Free' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWPORT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
const VIEWPORT_MAX_HEIGHT = Math.min(SCREEN_HEIGHT * 0.44, 380);

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

  // Natural image dimensions
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(true);

  // Selected aspect ratio preset
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(ASPECT_RATIOS[0]);

  // Rotation: 0, 90, 180, 270
  const [rotation, setRotation] = useState<number>(0);

  // Pan (X, Y) and Zoom Scale (1.0 to 4.0)
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);

  // Free crop dimensions
  const [freeCropWidth, setFreeCropWidth] = useState<number>(VIEWPORT_MAX_WIDTH * 0.85);
  const [freeCropHeight, setFreeCropHeight] = useState<number>(VIEWPORT_MAX_HEIGHT * 0.85);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Gesture tracking refs
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);
  const freeHandleRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  // Effective dimensions accounting for rotation (90 or 270 deg swaps width/height)
  const isSwap = rotation === 90 || rotation === 270;
  const rotWidth = isSwap ? naturalHeight : naturalWidth;
  const rotHeight = isSwap ? naturalWidth : naturalHeight;
  const naturalRatio = rotWidth > 0 && rotHeight > 0 ? rotWidth / rotHeight : 1;

  // Measure natural image size on imageUri change or modal open
  useEffect(() => {
    if (!imageUri || !visible) return;

    setIsMeasuring(true);
    Image.getSize(
      imageUri,
      (width, height) => {
        setNaturalWidth(width);
        setNaturalHeight(height);
        setIsMeasuring(false);
      },
      () => {
        // Fallback for web or errors
        setNaturalWidth(1000);
        setNaturalHeight(1000);
        setIsMeasuring(false);
      }
    );
  }, [imageUri, visible]);

  // Compute crop frame dimensions based on chosen preset
  const { cropWidth, cropHeight } = useMemo(() => {
    if (selectedRatio.id === 'free') {
      return {
        cropWidth: Math.max(80, Math.min(freeCropWidth, VIEWPORT_MAX_WIDTH)),
        cropHeight: Math.max(80, Math.min(freeCropHeight, VIEWPORT_MAX_HEIGHT)),
      };
    }

    const targetRatio =
      selectedRatio.id === 'original'
        ? naturalRatio
        : selectedRatio.ratio || 1;

    let w = VIEWPORT_MAX_WIDTH;
    let h = w / targetRatio;

    if (h > VIEWPORT_MAX_HEIGHT) {
      h = VIEWPORT_MAX_HEIGHT;
      w = h * targetRatio;
    }

    return {
      cropWidth: Math.round(w),
      cropHeight: Math.round(h),
    };
  }, [selectedRatio, naturalRatio, freeCropWidth, freeCropHeight]);

  // Base rendered image dimensions so it completely covers the crop frame at scale = 1.0
  const baseScaleFactor = useMemo(() => {
    if (rotWidth <= 0 || rotHeight <= 0) return 1;
    return Math.max(cropWidth / rotWidth, cropHeight / rotHeight);
  }, [cropWidth, cropHeight, rotWidth, rotHeight]);

  const baseDispWidth = rotWidth * baseScaleFactor;
  const baseDispHeight = rotHeight * baseScaleFactor;

  // Rendered dimensions with user scale
  const renderedWidth = baseDispWidth * scale;
  const renderedHeight = baseDispHeight * scale;

  // Max allowable pan so image NEVER leaves crop box (no blank gaps)
  const maxPanX = Math.max(0, (renderedWidth - cropWidth) / 2);
  const maxPanY = Math.max(0, (renderedHeight - cropHeight) / 2);

  // Clamp pan within safe boundaries
  const clampPan = (px: number, py: number) => {
    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, px));
    const clampedY = Math.max(-maxPanY, Math.min(maxPanY, py));
    return { x: clampedX, y: clampedY };
  };

  // Keep pan in bounds when crop size or scale changes
  useEffect(() => {
    const { x, y } = clampPan(panX, panY);
    if (x !== panX) setPanX(x);
    if (y !== panY) setPanY(y);
  }, [cropWidth, cropHeight, scale, maxPanX, maxPanY]);

  // Reset all adjustments
  const handleReset = () => {
    setSelectedRatio(ASPECT_RATIOS[0]);
    setRotation(0);
    setPanX(0);
    setPanY(0);
    setScale(1.0);
    setFreeCropWidth(VIEWPORT_MAX_WIDTH * 0.85);
    setFreeCropHeight(VIEWPORT_MAX_HEIGHT * 0.85);
  };

  // Rotate clockwise by 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPanX(0);
    setPanY(0);
  };

  // Zoom slider buttons
  const handleZoomIn = () => {
    setScale((prev) => Math.min(4.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(1.0, Number((prev - 0.25).toFixed(2))));
  };

  // PanResponder for Image Drag and Multi-Touch Pinch-to-Zoom
  const imagePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          // Pinch gesture start
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartDistRef.current = Math.hypot(dx, dy);
          pinchStartScaleRef.current = scale;
        } else {
          // Single touch drag
          panStartRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            panX,
            panY,
          };
          pinchStartDistRef.current = null;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          // Pinch zoom update
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);
          if (pinchStartDistRef.current && pinchStartDistRef.current > 0) {
            const factor = dist / pinchStartDistRef.current;
            const newScale = Math.max(1.0, Math.min(4.0, pinchStartScaleRef.current * factor));
            setScale(Number(newScale.toFixed(2)));
          }
        } else {
          // Drag update
          const deltaX = evt.nativeEvent.pageX - panStartRef.current.x;
          const deltaY = evt.nativeEvent.pageY - panStartRef.current.y;
          const targetX = panStartRef.current.panX + deltaX;
          const targetY = panStartRef.current.panY + deltaY;
          const { x, y } = clampPan(targetX, targetY);
          setPanX(x);
          setPanY(y);
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistRef.current = null;
      },
    })
  ).current;

  // PanResponders for Free Crop Handles
  const createHandleResponder = (handleId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        freeHandleRef.current = {
          handle: handleId,
          startX: evt.nativeEvent.pageX,
          startY: evt.nativeEvent.pageY,
          startW: cropWidth,
          startH: cropHeight,
        };
      },
      onPanResponderMove: (evt) => {
        if (!freeHandleRef.current) return;
        const dx = evt.nativeEvent.pageX - freeHandleRef.current.startX;
        const dy = evt.nativeEvent.pageY - freeHandleRef.current.startY;
        const { startW, startH } = freeHandleRef.current;

        let nextW = startW;
        let nextH = startH;

        if (handleId.includes('R')) nextW = startW + dx * 2;
        if (handleId.includes('L')) nextW = startW - dx * 2;
        if (handleId.includes('B')) nextH = startH + dy * 2;
        if (handleId.includes('T')) nextH = startH - dy * 2;

        setFreeCropWidth(Math.max(80, Math.min(VIEWPORT_MAX_WIDTH, Math.round(nextW))));
        setFreeCropHeight(Math.max(80, Math.min(VIEWPORT_MAX_HEIGHT, Math.round(nextH))));
      },
      onPanResponderRelease: () => {
        freeHandleRef.current = null;
      },
    });
  };

  const handleTL = useRef(createHandleResponder('TL')).current;
  const handleTR = useRef(createHandleResponder('TR')).current;
  const handleBL = useRef(createHandleResponder('BL')).current;
  const handleBR = useRef(createHandleResponder('BR')).current;
  const handleT = useRef(createHandleResponder('T')).current;
  const handleB = useRef(createHandleResponder('B')).current;
  const handleL = useRef(createHandleResponder('L')).current;
  const handleR = useRef(createHandleResponder('R')).current;

  // Export exact cropped area on Done
  const handleDone = async () => {
    if (!imageUri || isExporting) return;
    setIsExporting(true);

    try {
      // Relative offset of the crop frame top-left within the rendered image
      const offsetImageX = (renderedWidth - cropWidth) / 2 - panX;
      const offsetImageY = (renderedHeight - cropHeight) / 2 - panY;

      // Ratio of source rotated image pixels to rendered pixels
      const pixelRatio = rotWidth / renderedWidth;

      const originX = Math.max(0, offsetImageX * pixelRatio);
      const originY = Math.max(0, offsetImageY * pixelRatio);
      const targetWidth = Math.min(rotWidth - originX, cropWidth * pixelRatio);
      const targetHeight = Math.min(rotHeight - originY, cropHeight * pixelRatio);

      const cropRect: CropRect = {
        originX,
        originY,
        width: targetWidth,
        height: targetHeight,
      };

      const resultUri = await ImageCropService.cropImage(imageUri, cropRect, rotation);
      onCropDone(resultUri, selectedRatio.id);
      onClose();
    } catch (err) {
      console.warn('Crop export error:', err);
      onCropDone(imageUri, selectedRatio.id);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#07090E' }]}>
        <StatusBar barStyle="light-content" />

        {/* Top Navbar */}
        <View style={[styles.navbar, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.navBtn} activeOpacity={0.7} disabled={isExporting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.navTitle}>Crop & Position</Text>
            <Text style={[styles.navSubtitle, { color: theme.colors.primary }]}>
              {selectedRatio.label} • {rotation}°
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDone}
            style={[styles.doneBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.8}
            disabled={isExporting || isMeasuring}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.doneBtnText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Crop Viewport */}
        <View style={styles.viewportContainer}>
          {isMeasuring ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <View
              style={[
                styles.cropFrame,
                {
                  width: cropWidth,
                  height: cropHeight,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              {/* Draggable & Zoomable Image */}
              <View
                {...imagePanResponder.panHandlers}
                style={[
                  styles.imageDragArea,
                  {
                    width: cropWidth,
                    height: cropHeight,
                  },
                ]}
              >
                <View
                  style={{
                    width: renderedWidth,
                    height: renderedHeight,
                    transform: [{ translateX: panX }, { translateY: panY }],
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: isSwap ? renderedHeight : renderedWidth,
                      height: isSwap ? renderedWidth : renderedHeight,
                      transform: [{ rotate: `${rotation}deg` }],
                    }}
                    resizeMode="cover"
                  />
                </View>
              </View>

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

              {/* Interactive Free Crop Edge & Corner Handles */}
              {selectedRatio.id === 'free' && (
                <>
                  <View {...handleTL.panHandlers} style={[styles.freeHandleTouch, styles.handleTL]} />
                  <View {...handleTR.panHandlers} style={[styles.freeHandleTouch, styles.handleTR]} />
                  <View {...handleBL.panHandlers} style={[styles.freeHandleTouch, styles.handleBL]} />
                  <View {...handleBR.panHandlers} style={[styles.freeHandleTouch, styles.handleBR]} />
                  <View {...handleT.panHandlers} style={[styles.freeEdgeTouch, styles.edgeT]}>
                    <View style={styles.edgeHandleBarH} />
                  </View>
                  <View {...handleB.panHandlers} style={[styles.freeEdgeTouch, styles.edgeB]}>
                    <View style={styles.edgeHandleBarH} />
                  </View>
                  <View {...handleL.panHandlers} style={[styles.freeEdgeTouch, styles.edgeL]}>
                    <View style={styles.edgeHandleBarV} />
                  </View>
                  <View {...handleR.panHandlers} style={[styles.freeEdgeTouch, styles.edgeR]}>
                    <View style={styles.edgeHandleBarV} />
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Gestures Hint */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            {selectedRatio.id === 'free'
              ? 'Drag edges/corners to resize crop frame • Drag image to reposition'
              : 'Drag image to reposition • Pinch or use slider below to zoom'}
          </Text>
        </View>

        {/* Zoom & Rotation Controls Bar */}
        <View style={styles.toolRow}>
          {/* Zoom Out */}
          <TouchableOpacity onPress={handleZoomOut} style={styles.zoomBtn} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>-</Text>
          </TouchableOpacity>

          {/* Zoom Label Indicator */}
          <View style={styles.zoomBadge}>
            <Text style={styles.zoomBadgeText}>{Math.round(scale * 100)}%</Text>
          </View>

          {/* Zoom In */}
          <TouchableOpacity onPress={handleZoomIn} style={styles.zoomBtn} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>

          <View style={styles.toolDivider} />

          {/* Rotate Button */}
          <TouchableOpacity onPress={handleRotate} style={styles.toolBtn} activeOpacity={0.7}>
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.toolBtnText}>Rotate ({rotation}°)</Text>
          </TouchableOpacity>

          {/* Reset Button */}
          <TouchableOpacity onPress={handleReset} style={styles.toolBtn} activeOpacity={0.7}>
            <Icon name="close" size={14} color="#94A3B8" />
            <Text style={[styles.toolBtnText, { color: '#94A3B8' }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Aspect Ratio Presets Selector Strip */}
        <View style={styles.ratioSection}>
          <Text style={styles.ratioSectionTitle}>ASPECT RATIO</Text>
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
                  onPress={() => {
                    setSelectedRatio(item);
                    setPanX(0);
                    setPanY(0);
                  }}
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
                      isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
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
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  doneBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#07090E',
    fontSize: 14,
    fontWeight: '800',
  },
  viewportContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#05070B',
  },
  cropFrame: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDragArea: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 18,
    height: 18,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  // Free handles
  freeHandleTouch: {
    position: 'absolute',
    width: 36,
    height: 36,
    zIndex: 20,
  },
  handleTL: { top: -6, left: -6 },
  handleTR: { top: -6, right: -6 },
  handleBL: { bottom: -6, left: -6 },
  handleBR: { bottom: -6, right: -6 },
  freeEdgeTouch: {
    position: 'absolute',
    zIndex: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeT: { top: 0, left: 30, right: 30, height: 26 },
  edgeB: { bottom: 0, left: 30, right: 30, height: 26 },
  edgeL: { left: 0, top: 30, bottom: 30, width: 26 },
  edgeR: { right: 0, top: 30, bottom: 30, width: 26 },
  edgeHandleBarH: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  edgeHandleBarV: {
    height: 32,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  hintBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#07090E',
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#07090E',
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  zoomBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  zoomBadgeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratioSection: {
    paddingVertical: 12,
    backgroundColor: '#07090E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  ratioSectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  ratioScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  ratioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  ratioIconBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontWeight: '600',
  },
});

export default ImageCropperModal;
