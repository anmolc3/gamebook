import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export class ImageCropService {
  /**
   * Crops and rotates an image cleanly across Web and Mobile (iOS / Android).
   * Web uses HTML5 Canvas for zero-latency, high-precision pixel manipulation.
   * Native uses expo-image-manipulator with high JPEG quality (0.95).
   */
  static async cropImage(
    uri: string,
    cropRect: CropRect,
    rotation: number = 0
  ): Promise<string> {
    if (!uri) return uri;

    const normalizedRotation = ((rotation % 360) + 360) % 360;

    // 1. Web Implementation: HTML5 Canvas
    if (Platform.OS === 'web') {
      return new Promise<string>((resolve) => {
        try {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';

          img.onload = () => {
            try {
              const origW = img.naturalWidth || img.width;
              const origH = img.naturalHeight || img.height;

              // Swapped dimensions if rotated by 90 or 270 deg
              const isSwap = normalizedRotation === 90 || normalizedRotation === 270;
              const rotW = isSwap ? origH : origW;
              const rotH = isSwap ? origW : origH;

              // Safe bounds clamping
              const safeX = Math.max(0, Math.min(Math.round(cropRect.originX), rotW - 1));
              const safeY = Math.max(0, Math.min(Math.round(cropRect.originY), rotH - 1));
              const safeW = Math.max(1, Math.min(Math.round(cropRect.width), rotW - safeX));
              const safeH = Math.max(1, Math.min(Math.round(cropRect.height), rotH - safeY));

              const canvas = document.createElement('canvas');
              canvas.width = safeW;
              canvas.height = safeH;
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                resolve(uri);
                return;
              }

              // High-quality image rendering
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              ctx.save();
              // Offset canvas by crop origin
              ctx.translate(-safeX, -safeY);

              // Rotate around center of the rotated bounding box
              if (normalizedRotation !== 0) {
                ctx.translate(rotW / 2, rotH / 2);
                ctx.rotate((normalizedRotation * Math.PI) / 180);
                ctx.drawImage(img, -origW / 2, -origH / 2);
              } else {
                ctx.drawImage(img, 0, 0);
              }
              ctx.restore();

              const exported = canvas.toDataURL('image/jpeg', 0.95);
              resolve(exported);
            } catch (canvasErr) {
              console.warn('Canvas export error:', canvasErr);
              resolve(uri);
            }
          };

          img.onerror = (e: any) => {
            console.warn('Image loading error in canvas crop:', e);
            resolve(uri);
          };

          img.src = uri;
        } catch (err) {
          console.warn('Web crop execution failure:', err);
          resolve(uri);
        }
      });
    }

    // 2. Native Implementation: expo-image-manipulator
    try {
      const actions: ImageManipulator.Action[] = [];

      if (normalizedRotation !== 0) {
        actions.push({ rotate: normalizedRotation });
      }

      actions.push({
        crop: {
          originX: Math.max(0, Math.round(cropRect.originX)),
          originY: Math.max(0, Math.round(cropRect.originY)),
          width: Math.max(1, Math.round(cropRect.width)),
          height: Math.max(1, Math.round(cropRect.height)),
        },
      });

      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        {
          compress: 0.95,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (nativeErr) {
      console.warn('Native expo-image-manipulator error:', nativeErr);
      return uri;
    }
  }
}
