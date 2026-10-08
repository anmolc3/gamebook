import { apiGet, apiPost } from './api';
import { StoryTrayItem } from '../components/organisms/StoryBar';

export class StoryService {
  /**
   * Retrieves active 24h stories feed for friends and self
   */
  static async getStoryFeed(): Promise<StoryTrayItem[]> {
    try {
      const data = await apiGet<{ trays: StoryTrayItem[] } | StoryTrayItem[]>('/stories/feed');
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).trays)) return (data as any).trays;
      return [];
    } catch (err) {
      console.warn('[StoryService] Failed to fetch feed:', err);
      return [];
    }
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
