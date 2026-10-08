import { Platform, Alert } from 'react-native';

export interface PickImageResult {
  uri: string;
  base64?: string;
  width?: number;
  height?: number;
  canceled: boolean;
}

/**
 * Universal Image Picker Service
 * Allows users to select photos from their device's local photo library / gallery
 */
export class ImagePickerService {
  /**
   * Prompts user to pick an image from local storage / gallery
   */
  static async pickImageFromDevice(options?: {
    aspect?: [number, number];
    quality?: number;
    allowsEditing?: boolean;
  }): Promise<PickImageResult | null> {
    try {
      // Dynamically load expo-image-picker
      const ImagePicker = require('expo-image-picker');

      if (!ImagePicker) {
        throw new Error('Image picker native module is not available');
      }

      // Request media library permission if required
      if (Platform.OS !== 'web' && ImagePicker.requestMediaLibraryPermissionsAsync) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable photo library access in your device settings to select images.'
          );
          return null;
        }
      }

      const launchOptions: any = {
        mediaTypes: ['images'],
        quality: options?.quality ?? 0.85,
        base64: true,
      };

      if (options?.aspect) {
        launchOptions.aspect = options.aspect;
        launchOptions.allowsEditing = options?.allowsEditing ?? true;
      } else if (options?.allowsEditing !== undefined) {
        launchOptions.allowsEditing = options.allowsEditing;
      } else {
        launchOptions.allowsEditing = false;
      }

      const result = await ImagePicker.launchImageLibraryAsync(launchOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { canceled: true, uri: '' };
      }

      const asset = result.assets[0];
      // Format URI or base64 data URI
      let finalUri = asset.uri;
      if (asset.base64 && !finalUri.startsWith('data:')) {
        const mime = asset.mimeType || 'image/jpeg';
        finalUri = `data:${mime};base64,${asset.base64}`;
      }

      return {
        canceled: false,
        uri: finalUri,
        base64: asset.base64,
        width: asset.width,
        height: asset.height,
      };
    } catch (err: any) {
      console.warn('[ImagePickerService] Could not pick image from device:', err);
      // Fallback for Web standard input if native module isn't loaded
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) {
              resolve({ canceled: true, uri: '' });
              return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              resolve({
                canceled: false,
                uri: dataUrl,
              });
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      }

      Alert.alert('Image Selection Error', 'Could not open device photo library.');
      return null;
    }
  }
}
