import { apiGet, apiPost, apiDelete } from './api';
import { StoryTrayItem } from '../components/organisms/StoryBar';
import { CacheService } from './cache.service';

const CACHE_STORIES_KEY = '@gameapp:cache:stories';

export class StoryService {
  static getCachedStoryFeedSync(): StoryTrayItem[] | null {
    return CacheService.getSync<StoryTrayItem[]>(CACHE_STORIES_KEY);
  }

  static async getCachedStoryFeed(): Promise<StoryTrayItem[] | null> {
    return await CacheService.get<StoryTrayItem[]>(CACHE_STORIES_KEY);
  }

  static async clearCachedStoryFeed(): Promise<void> {
    await CacheService.remove(CACHE_STORIES_KEY);
  }

  /**
   * Retrieves active 24h stories feed for friends and self from real backend
   */
  static async getStoryFeed(): Promise<StoryTrayItem[]> {
    return CacheService.dedupe('getStoryFeed', async () => {
      try {
        const data = await apiGet<{ trays: StoryTrayItem[] } | StoryTrayItem[]>('/stories/feed');
        let trays: StoryTrayItem[] = [];
        if (Array.isArray(data)) trays = data;
        else if (data && Array.isArray((data as any).trays)) trays = (data as any).trays;

        // Persist real backend data in cache
        await CacheService.set(CACHE_STORIES_KEY, trays, 1000 * 60 * 5);
        return trays;
      } catch (err) {
        console.warn('[StoryService] Failed to fetch feed:', err);
        return (await this.getCachedStoryFeed()) || [];
      }
    });
  }

  /**
   * Creates a new story persisted in database
   */
  static async createStory(
    mediaUrl: string,
    mediaType = 'IMAGE',
    caption?: string,
    privacy = 'FRIENDS'
  ) {
    const res = await apiPost('/stories', { mediaUrl, mediaType, caption, privacy });
    await this.clearCachedStoryFeed();
    return res;
  }

  /**
   * Marks a story as viewed in database
   */
  static async viewStory(storyId: string) {
    return apiPost(`/stories/${storyId}/view`);
  }

  /**
   * Replies to a story (sends DM)
   */
  static async replyStory(storyId: string, content: string) {
    return apiPost(`/stories/${storyId}/reply`, { content });
  }

  /**
   * Deletes user's own story from database
   */
  static async deleteStory(storyId: string) {
    const res = await apiDelete(`/stories/${storyId}`);
    await this.clearCachedStoryFeed();
    return res;
  }
}

