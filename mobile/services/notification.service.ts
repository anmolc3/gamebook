import type * as NotificationsType from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiPost } from './api';

// Detect whether running inside Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Dynamically require expo-notifications only outside Expo Go (or non-Android)
// to prevent Expo SDK 53+ fatal error:
// "expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go"
let Notifications: typeof NotificationsType | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (err) {
    console.warn('[Notifications] Could not load expo-notifications module:', err);
  }
}

// ─── Configure foreground notification behaviour ───────────────────────────────
// Show alerts even when the app is in the foreground
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Notification channel IDs ─────────────────────────────────────────────────
export const CHANNELS = {
  DEFAULT: 'default',
  MESSAGES: 'messages',
  SOCIAL: 'social',
  GAMES: 'games',
  ACHIEVEMENTS: 'achievements',
} as const;

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'GAME_INVITE'
  | 'ACHIEVEMENT'
  | 'YOUR_TURN';

export interface NotificationData {
  type: NotificationType;
  roomCode?: string;
  recipientId?: string;
  userId?: string;
}

/**
 * NotificationService
 *
 * Handles:
 *  1. Requesting notification permissions
 *  2. Registering Expo push token with the backend
 *  3. Setting up Android notification channels
 *  4. Providing listener helpers for in-app handling
 */
export class NotificationService {
  private static _expoPushToken: string | null = null;

  // ─── Initialise (call once after login) ──────────────────────────────────────

  /**
   * Request permissions, create Android channels, obtain push token,
   * and register it with the server. Safe to call multiple times.
   */
  static async initialize(): Promise<string | null> {
    if (isExpoGo) {
      console.log('[Notifications] Push notifications are not supported in Expo Go (SDK 53+). Use an EAS development build for push testing.');
      return null;
    }

    if (!Notifications) {
      return null;
    }

    // Create Android notification channels first
    if (Platform.OS === 'android') {
      await this.createAndroidChannels();
    }

    // Push token registration only works on physical devices
    if (!Device.isDevice) {
      console.log('[Notifications] Push token registration skipped on simulator/emulator.');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push notification permission was denied.');
      return null;
    }

    // Get the Expo push token
    try {
      const resolvedProjectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        resolvedProjectId && resolvedProjectId !== 'REPLACE_WITH_YOUR_EAS_PROJECT_ID'
          ? { projectId: resolvedProjectId }
          : undefined
      );
      this._expoPushToken = tokenData.data;
      console.log('[Notifications] Expo push token:', this._expoPushToken);

      // Register with backend
      await this.registerTokenWithServer(this._expoPushToken);
      return this._expoPushToken;
    } catch (err) {
      console.warn('[Notifications] Failed to obtain push token:', err);
      return null;
    }
  }

  /**
   * Unregister push token from the server (called on logout).
   */
  static async unregister(): Promise<void> {
    try {
      await apiPost('/notifications/push-token', undefined);
      // Use DELETE via direct fetch since apiPost only does POST
      const { MobileAuthService } = await import('./auth.service');
      const token = await MobileAuthService.getStoredToken();
      if (!token) return;

      const { API_BASE_URL } = await import('./api');
      await fetch(`${API_BASE_URL}/notifications/push-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      this._expoPushToken = null;
    } catch (err) {
      console.warn('[Notifications] Failed to unregister push token:', err);
    }
  }

  // ─── Android channel setup ────────────────────────────────────────────────────

  static async createAndroidChannels(): Promise<void> {
    if (!Notifications) return;

    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
        name: 'General',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.MESSAGES, {
        name: 'Messages',
        description: 'New chat messages from friends',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 200, 100],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.SOCIAL, {
        name: 'Social',
        description: 'Friend requests and social activity',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#60A5FA',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.GAMES, {
        name: 'Games',
        description: 'Game invites and turn reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 300],
        lightColor: '#F59E0B',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.ACHIEVEMENTS, {
        name: 'Achievements',
        description: 'Achievement unlocks and milestones',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        lightColor: '#FFD700',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
    ]);
  }

  /**
   * Immediately present a notification in the device notification area / drawer.
   */
  static async displayLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId: string = CHANNELS.MESSAGES
  ): Promise<void> {
    if (!Notifications) return;
    try {
      if (Platform.OS === 'android') {
        await this.createAndroidChannels();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          ...(channelId ? { channelId } : {}),
        } as any,
        trigger: null,
      });
    } catch (err) {
      console.warn('[Notifications] Failed to display local notification:', err);
    }
  }

  // ─── Token registration ───────────────────────────────────────────────────────

  private static async registerTokenWithServer(pushToken: string): Promise<void> {
    try {
      await apiPost('/notifications/push-token', { pushToken });
      console.log('[Notifications] Push token registered with server.');
    } catch (err) {
      console.warn('[Notifications] Failed to register token with server:', err);
    }
  }

  // ─── Listener helpers (for use in App.tsx) ───────────────────────────────────

  /**
   * Add a listener for notifications received while the app is in the foreground.
   * Returns a cleanup function.
   */
  static addForegroundListener(
    handler: (notification: NotificationsType.Notification) => void
  ): () => void {
    if (!Notifications) return () => {};
    const subscription = Notifications.addNotificationReceivedListener(handler);
    return () => subscription.remove();
  }

  /**
   * Add a listener for when the user taps a notification (app in background or killed).
   * Returns a cleanup function.
   */
  static addResponseListener(
    handler: (response: NotificationsType.NotificationResponse) => void
  ): () => void {
    if (!Notifications) return () => {};
    const subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return () => subscription.remove();
  }

  /**
   * Get the last notification response (app opened via notification tap).
   * Useful on initial mount to handle cold-start taps.
   */
  static async getLastNotificationResponse(): Promise<NotificationsType.NotificationResponse | null> {
    if (!Notifications) return null;
    return Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Clear the badge count (iOS / Android badge).
   */
  static async clearBadge(): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Schedule a local notification (for offline reminders, etc.)
   */
  static async scheduleLocal(
    title: string,
    body: string,
    data?: NotificationData,
    delaySeconds = 0
  ): Promise<string> {
    if (!Notifications) return '';
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as any,
        sound: 'default',
      },
      trigger:
        delaySeconds > 0
          ? { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
          : null,
    });
  }

  static get expoPushToken(): string | null {
    return this._expoPushToken;
  }
}
