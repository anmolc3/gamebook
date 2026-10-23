import type * as NotificationsType from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api';
import { MobileSocketService } from './socket.service';
import { CacheService } from './cache.service';

// Detect whether running inside Expo Go
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require('expo-notifications');
} catch (err) {
  console.warn('[Notifications] Could not load expo-notifications module:', err);
}

// ─── Active conversation tracker for smart foreground notification handling ───
let currentActiveConversationId: string | null = null;
let currentActivePeerId: string | null = null;

export function setActiveConversation(conversationId: string | null, peerId: string | null = null): void {
  currentActiveConversationId = conversationId;
  currentActivePeerId = peerId;
}

export function getActiveConversation(): { conversationId: string | null; peerId: string | null } {
  return { conversationId: currentActiveConversationId, peerId: currentActivePeerId };
}

// ─── Configure foreground notification behaviour ───────────────────────────────
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification?.request?.content?.data as any;
      const conversationId = data?.conversationId;
      const senderId = data?.senderId;

      // If user is actively viewing this conversation, suppress the notification alert
      if (
        (conversationId && currentActiveConversationId && conversationId === currentActiveConversationId) ||
        (senderId && currentActivePeerId && senderId === currentActivePeerId)
      ) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
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
  | 'MENTION'
  | 'MISSED_CALL'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'GAME_INVITE'
  | 'ACHIEVEMENT'
  | 'YOUR_TURN'
  | string;

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationData {
  type: NotificationType;
  roomCode?: string;
  recipientId?: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  callerId?: string;
  messageId?: string;
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
    if (!Notifications) {
      return null;
    }

    // Create Android notification channels first
    if (Platform.OS === 'android') {
      try {
        await this.createAndroidChannels();
      } catch (channelErr) {
        console.warn('[Notifications] Failed to create Android channels:', channelErr);
      }
    }

    // Request notification permission from the system
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Notification permission was denied.');
        return null;
      }
    } catch (permErr) {
      console.warn('[Notifications] Permission request error:', permErr);
    }

    // In Expo Go on Android, remote push tokens (FCM) are not supported by Expo (SDK 53+ limitation).
    // Local system drawer notifications and channels work, but remote push requires a development build or APK.
    if (isExpoGo) {
      console.log('[Notifications] Running in Expo Go: system drawer notifications and channels active; remote push tokens require a development build / APK.');
      return null;
    }

    // Push token registration only works on physical devices
    if (!Device.isDevice) {
      console.log('[Notifications] Push token registration skipped on simulator/emulator.');
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
        name: 'Otter General',
        description: 'Otter general updates and notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.MESSAGES, {
        name: 'Otter Messages',
        description: 'New chat messages in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 200, 100],
        lightColor: '#3ED598',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.SOCIAL, {
        name: 'Otter Social',
        description: 'Friend requests and social updates in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#60A5FA',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.GAMES, {
        name: 'Otter Games',
        description: 'Game invites and turn reminders in Otter',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 300],
        lightColor: '#F59E0B',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.ACHIEVEMENTS, {
        name: 'Otter Achievements',
        description: 'Otter achievement unlocks and milestones',
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

  private static recentNotifMap = new Map<string, number>();
  private static inAppBannerListeners = new Set<(banner: { title: string; body: string; data?: any }) => void>();

  static addInAppBannerListener(listener: (banner: { title: string; body: string; data?: any }) => void): () => void {
    this.inAppBannerListeners.add(listener);
    return () => {
      this.inAppBannerListeners.delete(listener);
    };
  }

  static setActiveConversation = setActiveConversation;
  static getActiveConversation = getActiveConversation;

  /**
   * Dispatches an in-app floating toast banner for instant visual feedback inside the app.
   * Debounces duplicate banners within 3.5 seconds using messageId/event key to prevent spam.
   * Does NOT schedule an OS-level notification (OS notifications are owned by Push / FCM).
   */
  static displayInAppBanner(
    title: string,
    body: string,
    data?: any
  ): void {
    const cleanTitle = (title || '').replace(/^💬\s*/, '').trim() || 'Notification';
    const cleanBody = (body || '').replace(/^💬\s*/, '').trim();
    const notifKey = data?.messageId
      ? `msg:${data.messageId}`
      : `${cleanTitle}:::${cleanBody}:::${data?.conversationId || ''}`;
    const now = Date.now();
    const lastTimestamp = this.recentNotifMap.get(notifKey);
    if (lastTimestamp && now - lastTimestamp < 3500) {
      return; // Suppress duplicate banner
    }
    this.recentNotifMap.set(notifKey, now);

    // Garbage-collect old keys
    if (this.recentNotifMap.size > 50) {
      for (const [k, t] of this.recentNotifMap.entries()) {
        if (now - t > 10000) this.recentNotifMap.delete(k);
      }
    }

    this.inAppBannerListeners.forEach((cb) => {
      try {
        cb({ title: cleanTitle, body: cleanBody, data });
      } catch (err) {
        console.warn('[Notifications] Error in banner listener:', err);
      }
    });
  }

  /**
   * Immediately present a notification:
   * 1. Fires in-app banner for instant visual feedback inside the app.
   * 2. Only schedules OS-level system notification if explicitly requested (e.g. offline local tasks).
   * Note: Remote events (chat messages, invites, social notifications) are delivered by FCM / Expo Push,
   * so scheduling a local notification here would create duplicate entries in the Android notification shade.
   */
  static async displayLocalNotification(
    title: string,
    body: string,
    data?: any,
    channelId: string = CHANNELS.MESSAGES,
    forceScheduleOS = false
  ): Promise<void> {
    this.displayInAppBanner(title, body, data);

    if (!forceScheduleOS || !Notifications) return;

    try {
      if (Platform.OS === 'android') {
        await this.createAndroidChannels();
      }
      const cleanTitle = (title || '').replace(/^💬\s*/, '').trim() || 'Notification';
      const cleanBody = (body || '').replace(/^💬\s*/, '').trim();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: cleanTitle,
          body: cleanBody,
          data,
          sound: 'default',
          color: '#3ED598',
          ...(channelId ? { channelId } : {}),
        } as any,
        trigger: null,
      });
    } catch (err) {
      console.warn('[Notifications] Failed to schedule local notification:', err);
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

  // ─── Unified In-App Notifications & Real-Time Syncing ───────────────────────

  private static notifListeners = new Set<(notif: AppNotification) => void>();
  private static unreadListeners = new Set<(count: number) => void>();
  private static cachedNotifications: AppNotification[] = [];
  private static cachedUnreadCount: number = 0;
  private static lastClearedAt: number = 0;
  private static socketSubscribed = false;

  static initRealtimeListeners(): void {
    if (this.socketSubscribed) return;
    this.socketSubscribed = true;

    MobileSocketService.onNotificationReceived((newNotif: any) => {
      if (!newNotif || !newNotif.id) return;
      // Do not accept notifications created before the last clear
      if (newNotif.createdAt && new Date(newNotif.createdAt).getTime() <= this.lastClearedAt) {
        return;
      }

      const existsIndex = this.cachedNotifications.findIndex((n) => n.id === newNotif.id);
      if (existsIndex >= 0) {
        this.cachedNotifications[existsIndex] = { ...this.cachedNotifications[existsIndex], ...newNotif };
      } else {
        this.cachedNotifications = [newNotif, ...this.cachedNotifications];
        if (!newNotif.isRead) {
          this.cachedUnreadCount += 1;
          this.notifyUnreadListeners(this.cachedUnreadCount);
        }
      }
      CacheService.set('@gameapp:cache:notifications', this.cachedNotifications, 1000 * 60 * 15).catch(() => null);

      this.notifListeners.forEach((cb) => {
        try {
          cb(newNotif);
        } catch (e) {
          console.warn('[NotificationService] Error in notif listener:', e);
        }
      });
    });

    MobileSocketService.onNotificationsCleared(() => {
      this.lastClearedAt = Date.now();
      this.cachedNotifications = [];
      this.cachedUnreadCount = 0;
      this.notifyUnreadListeners(0);
      CacheService.set('@gameapp:cache:notifications', []).catch(() => null);
    });

    MobileSocketService.onUnreadNotificationCount((data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === 'number') {
        this.cachedUnreadCount = data.unreadCount;
        this.notifyUnreadListeners(this.cachedUnreadCount);
      }
    });
  }

  static addNotificationListener(listener: (notif: AppNotification) => void): () => void {
    this.initRealtimeListeners();
    this.notifListeners.add(listener);
    return () => {
      this.notifListeners.delete(listener);
    };
  }

  static addUnreadCountListener(listener: (count: number) => void): () => void {
    this.initRealtimeListeners();
    this.unreadListeners.add(listener);
    listener(this.cachedUnreadCount);
    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  private static notifyUnreadListeners(count: number): void {
    this.unreadListeners.forEach((cb) => {
      try {
        cb(count);
      } catch (e) {
        console.warn('[NotificationService] Error in unread listener:', e);
      }
    });
  }

  /**
   * Synchronous memory cache lookup (0ms instantaneous return)
   */
  static getCachedNotificationsSync(): AppNotification[] {
    return this.cachedNotifications || [];
  }

  /**
   * Synchronous unread count lookup (0ms instantaneous return)
   */
  static getCachedUnreadCountSync(): number {
    return this.cachedUnreadCount || 0;
  }

  /**
   * Get cached notifications from memory or storage immediately
   */
  static async getCachedNotifications(): Promise<AppNotification[]> {
    if (this.cachedNotifications && this.cachedNotifications.length > 0) {
      return this.cachedNotifications;
    }
    const stored = await CacheService.get<AppNotification[]>('@gameapp:cache:notifications');
    if (stored && stored.length > 0) {
      // Filter out items older than lastClearedAt
      const valid = this.lastClearedAt
        ? stored.filter((n) => new Date(n.createdAt).getTime() > this.lastClearedAt)
        : stored;
      this.cachedNotifications = valid;
      return valid;
    }
    return [];
  }

  /**
   * Load existing notifications from the backend API.
   */
  static async fetchNotifications(limit: number = 40): Promise<AppNotification[]> {
    const fetchStartTime = Date.now();
    return CacheService.dedupe('fetchNotifications', async () => {
      try {
        this.initRealtimeListeners();
        const res = await apiGet<{ success: boolean; data: AppNotification[] }>(
          `/notifications?limit=${limit}`
        );
        // If a Clear All was executed after or during this fetch, discard results immediately
        if (this.lastClearedAt >= fetchStartTime) {
          this.cachedNotifications = [];
          this.cachedUnreadCount = 0;
          this.notifyUnreadListeners(0);
          return [];
        }

        if (res && res.data && Array.isArray(res.data)) {
          // Drop any notifications created prior to lastClearedAt
          const filtered = this.lastClearedAt
            ? res.data.filter((n) => new Date(n.createdAt).getTime() > this.lastClearedAt)
            : res.data;

          this.cachedNotifications = filtered;
          this.cachedUnreadCount = filtered.filter((n) => !n.isRead).length;
          this.notifyUnreadListeners(this.cachedUnreadCount);
          await CacheService.set('@gameapp:cache:notifications', filtered, 1000 * 60 * 15);
          return filtered;
        }
        return [];
      } catch (err) {
        console.warn('[NotificationService] fetchNotifications failed:', err);
        return this.cachedNotifications || [];
      }
    });
  }

  /**
   * Fetch unread notification count.
   */
  static async fetchUnreadCount(): Promise<number> {
    try {
      this.initRealtimeListeners();
      const res = await apiGet<{ success: boolean; data: { unreadCount: number } }>(
        '/notifications/unread-count'
      );
      if (res && res.data && typeof res.data.unreadCount === 'number') {
        this.cachedUnreadCount = res.data.unreadCount;
        this.notifyUnreadListeners(this.cachedUnreadCount);
        return this.cachedUnreadCount;
      }
      return this.cachedUnreadCount;
    } catch (err) {
      console.warn('[NotificationService] fetchUnreadCount failed:', err);
      return this.cachedUnreadCount;
    }
  }

  /**
   * Mark all unread notifications as read.
   */
  static async markAllAsRead(): Promise<void> {
    // Optimistic update
    this.cachedNotifications = this.cachedNotifications.map((n) => ({ ...n, isRead: true }));
    this.cachedUnreadCount = 0;
    this.notifyUnreadListeners(0);
    await CacheService.set('@gameapp:cache:notifications', this.cachedNotifications, 1000 * 60 * 15);

    try {
      await apiPut('/notifications/mark-read');
    } catch (err) {
      console.warn('[NotificationService] markAllAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(id: string): Promise<void> {
    // Optimistic update
    this.cachedNotifications = this.cachedNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.cachedUnreadCount = Math.max(0, this.cachedNotifications.filter((n) => !n.isRead).length);
    this.notifyUnreadListeners(this.cachedUnreadCount);
    await CacheService.set('@gameapp:cache:notifications', this.cachedNotifications, 1000 * 60 * 15);

    try {
      await apiPatch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn('[NotificationService] markAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Clear all notifications.
   * Immediately clears memory cache, disk cache, and updates unread badge before network call.
   */
  static async clearAll(): Promise<void> {
    this.lastClearedAt = Date.now();
    this.cachedNotifications = [];
    this.cachedUnreadCount = 0;
    this.notifyUnreadListeners(0);
    await CacheService.set('@gameapp:cache:notifications', []);

    try {
      await apiDelete('/notifications');
    } catch (err) {
      console.warn('[NotificationService] clearAll failed:', err);
      throw err;
    }
  }

  /**
   * Delete a single notification.
   */
  static async deleteNotification(id: string): Promise<void> {
    this.cachedNotifications = this.cachedNotifications.filter((n) => n.id !== id);
    this.cachedUnreadCount = this.cachedNotifications.filter((n) => !n.isRead).length;
    this.notifyUnreadListeners(this.cachedUnreadCount);
    await CacheService.set('@gameapp:cache:notifications', this.cachedNotifications, 1000 * 60 * 15);

    try {
      await apiDelete(`/notifications/${id}`);
    } catch (err) {
      console.warn('[NotificationService] deleteNotification failed:', err);
      throw err;
    }
  }

  /**
   * Human readable time ago formatting.
   */
  static formatTimeAgo(dateString: string): string {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';

    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 45) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
