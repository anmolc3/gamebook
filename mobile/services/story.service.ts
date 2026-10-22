import { apiGet, apiPost } from './api';
import { StoryTrayItem } from '../components/organisms/StoryBar';
import { CacheService } from './cache.service';

const CACHE_STORIES_KEY = '@gameapp:cache:stories';

export class StoryService {
  static async getCachedStoryFeed(): Promise<StoryTrayItem[] | null> {
    return await CacheService.get<StoryTrayItem[]>(CACHE_STORIES_KEY);
  }

  /**
   * Retrieves active 24h stories feed for friends and self
   */
  static async getStoryFeed(): Promise<StoryTrayItem[]> {
    return CacheService.dedupe('getStoryFeed', async () => {
      try {
        const data = await apiGet<{ trays: StoryTrayItem[] } | StoryTrayItem[]>('/stories/feed');
        let trays: StoryTrayItem[] = [];
        if (Array.isArray(data)) trays = data;
        else if (data && Array.isArray((data as any).trays)) trays = (data as any).trays;
        if (trays.length > 0) {
          await CacheService.set(CACHE_STORIES_KEY, trays, 1000 * 60 * 15);
        }
        return trays;
      } catch (err) {
        console.warn('[StoryService] Failed to fetch feed:', err);
        return (await this.getCachedStoryFeed()) || [];
      }
    });
  }

  /**
   * Creates a new story
   */
  static async createStory(mediaUrl: string, mediaType = 'IMAGE', caption?: string) {
    return apiPost('/stories', { mediaUrl, mediaType, caption });
  }

  /**
   * Marks a story as viewed
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
}
