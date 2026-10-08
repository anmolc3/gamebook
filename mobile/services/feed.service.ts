import { apiGet, apiPost, apiDelete } from './api';
import { MobileSocketService } from './socket.service';

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
}

export interface FeedPostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  timeAgo: string;
  gameTag?: string;
  content: string;
  imageUrl?: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  commentsCount: number;
  comments?: FeedComment[];
  createdAt: string;
}

export class FeedService {
  /**
   * Fetch all feed posts from real backend API
   */
  static async getFeeds(): Promise<FeedPostItem[]> {
    const res = await apiGet<{ success: boolean; posts: FeedPostItem[] }>('/feeds');
    return res.posts || [];
  }

  /**
   * Publish a real post
   */
  static async createPost(payload: {
    content: string;
    imageUrl?: string | null;
    gameTag?: string;
  }): Promise<FeedPostItem> {
    const res = await apiPost<{ success: boolean; post: FeedPostItem }>('/feeds', payload);
    return res.post;
  }

  /**
   * Toggle like in real time
   */
  static async toggleLike(postId: string): Promise<{ postId: string; isLiked: boolean; likesCount: number }> {
    const res = await apiPost<{ success: boolean; postId: string; isLiked: boolean; likesCount: number }>(
      `/feeds/${postId}/like`
    );
    return {
      postId: res.postId,
      isLiked: res.isLiked,
      likesCount: res.likesCount,
    };
  }

  /**
   * Add a real comment
   */
  static async addComment(postId: string, text: string): Promise<FeedComment> {
    const res = await apiPost<{ success: boolean; comment: FeedComment }>(`/feeds/${postId}/comment`, {
      text,
    });
    return res.comment;
  }

  /**
   * Delete a post
   */
  static async deletePost(postId: string): Promise<void> {
    await apiDelete(`/feeds/${postId}`);
  }

  /**
   * Real-Time Socket Event Listeners
   */
  static onNewPost(callback: (post: FeedPostItem) => void): () => void {
    const socket = MobileSocketService.getSocket();
    if (!socket) return () => {};
    socket.on('feed:new_post', callback);
    return () => {
      socket.off('feed:new_post', callback);
    };
  }

  static onPostLiked(
    callback: (data: { postId: string; userId: string; isLiked: boolean; likesCount: number }) => void
  ): () => void {
    const socket = MobileSocketService.getSocket();
    if (!socket) return () => {};
    socket.on('feed:post_liked', callback);
    return () => {
      socket.off('feed:post_liked', callback);
    };
  }

  static onNewComment(
    callback: (data: { postId: string; comment: FeedComment; commentsCount: number }) => void
  ): () => void {
    const socket = MobileSocketService.getSocket();
    if (!socket) return () => {};
    socket.on('feed:new_comment', callback);
    return () => {
      socket.off('feed:new_comment', callback);
    };
  }

  static onPostDeleted(callback: (data: { postId: string }) => void): () => void {
    const socket = MobileSocketService.getSocket();
    if (!socket) return () => {};
    socket.on('feed:post_deleted', callback);
    return () => {
      socket.off('feed:post_deleted', callback);
    };
  }
}
