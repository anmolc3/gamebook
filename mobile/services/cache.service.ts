import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class CacheService {
  private static memoryCache = new Map<string, CacheEntry<any>>();
  private static inFlightPromises = new Map<string, Promise<any>>();

  /**
   * Synchronous memory cache lookup (0ms instantaneous return)
   */
  static getSync<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Preload keys from AsyncStorage into memory cache in bulk
   */
  static async preload(keys: string[]): Promise<void> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [key, val] of pairs) {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (!parsed.ttl || Date.now() - parsed.timestamp <= parsed.ttl) {
              this.memoryCache.set(key, parsed);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[CacheService] Failed to preload keys:', err);
    }
  }

  /**
   * Asynchronous cache lookup: checks memory cache first, then AsyncStorage
   */
  static async get<T>(key: string): Promise<T | null> {
    const mem = this.getSync<T>(key);
    if (mem !== null) return mem;

    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      const parsed: CacheEntry<T> = JSON.parse(stored);
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        AsyncStorage.removeItem(key).catch(() => null);
        return null;
      }
      this.memoryCache.set(key, parsed);
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Store item in memory cache and persist to AsyncStorage
   */
  static async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    this.memoryCache.set(key, entry);

    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
      console.warn(`[CacheService] Failed to persist key ${key}:`, err);
    }
  }

  /**
   * Remove item from memory cache and AsyncStorage
   */
  static async remove(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }

  /**
   * Deduplicate identical concurrent promises to avoid duplicate network requests
   */
  static dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlightPromises.has(key)) {
      return this.inFlightPromises.get(key) as Promise<T>;
    }
    const promise = fetcher()
      .finally(() => {
        this.inFlightPromises.delete(key);
      });
    this.inFlightPromises.set(key, promise);
    return promise;
  }

  /**
   * Stale-While-Revalidate helper:
   * Returns cached data immediately if available, triggers background fetch,
   * deduplicates concurrent calls, and invokes onFresh callback if fresh data arrives.
   */
  static async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttl?: number;
      onFresh?: (freshData: T) => void;
      onError?: (err: any) => void;
    }
  ): Promise<{ data: T | null; isCached: boolean; refreshPromise: Promise<T> }> {
    const cached = await this.get<T>(key);

    const refreshPromise = this.dedupe<T>(key, async () => {
      try {
        const fresh = await fetcher();
        await this.set<T>(key, fresh, options?.ttl);
        if (options?.onFresh) {
          options.onFresh(fresh);
        }
        return fresh;
      } catch (err) {
        if (options?.onError) {
          options.onError(err);
        }
        throw err;
      }
    });

    return {
      data: cached,
      isCached: cached !== null,
      refreshPromise,
    };
  }

  /**
   * Thoroughly clear all user-scoped cached data on logout or account switch.
   * Prevents displaying one user's private data to another user.
   */
  static async clearAllUserScopedData(userId?: string): Promise<void> {
    this.memoryCache.clear();
    this.inFlightPromises.clear();

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userSpecificPrefixes = [
        '@gameapp:cache:',
        '@gameapp_auth_user',
        '@gameapp:profile_',
        '@gameapp:archived_convs',
        '@gameapp:favorite_convs',
        '@gameapp:locked_convs',
        '@gameapp:disappearing_',
        '@gameapp:muted_',
      ];

      const keysToRemove = allKeys.filter((k) =>
        userSpecificPrefixes.some((prefix) => k.startsWith(prefix)) ||
        (userId && k.includes(userId))
      );

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (err) {
      console.warn('[CacheService] Error clearing user scoped data:', err);
    }
  }
}
