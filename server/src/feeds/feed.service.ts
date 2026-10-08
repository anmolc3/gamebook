import fs from 'fs';
import path from 'path';
import { prisma } from '../database/prisma';
import { emitToAll } from '../sockets/socket.server';

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  gameTag?: string;
  content: string;
  imageUrl?: string | null;
  likes: string[]; // array of userIds
  likesCount: number;
  comments: PostComment[];
  commentsCount: number;
  createdAt: string;
}

export interface FeedPostResponse extends Omit<FeedPost, 'likes'> {
  isLikedByMe: boolean;
  timeAgo: string;
}

function calculateTimeAgo(dateStr: string): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const FEEDS_FILE = path.join(DATA_DIR, 'feeds.json');

const INITIAL_POSTS: FeedPost[] = [
  {
    id: 'post_seed_1',
    authorId: 'system_player_alex',
    authorName: 'Alex Chen',
    authorUsername: 'alex_99',
    authorAvatar: 'avatar_1.webp',
    gameTag: '🎲 Ludo World • 1st Place',
    content: 'Just pulled off an unbelievable 4-token sweep from behind in 4-player Ludo! Rolled double 6s on the final corridor. Who wants a rematch? 🔥',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=700&q=80',
    likes: ['system_player_alex', 'user_seed_sarah'],
    likesCount: 2,
    comments: [
      {
        id: 'c_seed_1',
        postId: 'post_seed_1',
        authorId: 'user_seed_marcus',
        authorName: 'Marcus Vance',
        authorUsername: 'marcus_v',
        authorAvatar: 'avatar_5.webp',
        text: 'That green token capture was ruthless bro! 😂',
        createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ],
    commentsCount: 1,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'post_seed_2',
    authorId: 'user_seed_sarah',
    authorName: 'Sarah Jenkins',
    authorUsername: 'sarah_j',
    authorAvatar: 'avatar_3.webp',
    gameTag: '♟️ Chess Grandmaster • 18 Moves',
    content: 'Queen sacrifice into smothered checkmate! Best tactical game of the week against top 10 ranked player. Strategy pays off. 👑✨',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=700&q=80',
    likes: ['user_seed_sarah'],
    likesCount: 1,
    comments: [],
    commentsCount: 0,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'post_seed_3',
    authorId: 'user_seed_marcus',
    authorName: 'Marcus Vance',
    authorUsername: 'marcus_v',
    authorAvatar: 'avatar_5.webp',
    gameTag: '🎱 8 Ball Pool • Break & Run',
    content: 'Golden break on table 4! Cleared all solids in 90 seconds without giving up turn once. Ready for all challengers today! 🎱💥',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=700&q=80',
    likes: [],
    likesCount: 0,
    comments: [],
    commentsCount: 0,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
];

class FeedStore {
  private posts: FeedPost[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(FEEDS_FILE)) {
        const raw = fs.readFileSync(FEEDS_FILE, 'utf-8');
        this.posts = JSON.parse(raw);
      } else {
        this.posts = [...INITIAL_POSTS];
        this.save();
      }
    } catch (err) {
      console.error('Error loading feeds store:', err);
      this.posts = [...INITIAL_POSTS];
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FEEDS_FILE, JSON.stringify(this.posts, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving feeds store:', err);
    }
  }

  getAll(): FeedPost[] {
    return [...this.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getById(id: string): FeedPost | undefined {
    return this.posts.find((p) => p.id === id);
  }

  add(post: FeedPost) {
    this.posts.unshift(post);
    this.save();
  }

  update(post: FeedPost) {
    const idx = this.posts.findIndex((p) => p.id === post.id);
    if (idx !== -1) {
      this.posts[idx] = post;
      this.save();
    }
  }

  remove(id: string): boolean {
    const before = this.posts.length;
    this.posts = this.posts.filter((p) => p.id !== id);
    const deleted = this.posts.length < before;
    if (deleted) this.save();
    return deleted;
  }
}

const store = new FeedStore();

export class FeedService {
  /**
   * Fetch all feed posts enriched with current viewer's like state and timeAgo
   */
  static async getFeed(viewerId?: string): Promise<FeedPostResponse[]> {
    const rawPosts = store.getAll();
    return rawPosts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      authorName: post.authorName,
      authorUsername: post.authorUsername,
      authorAvatar: post.authorAvatar,
      gameTag: post.gameTag,
      content: post.content,
      imageUrl: post.imageUrl,
      likesCount: post.likes ? post.likes.length : 0,
      isLikedByMe: viewerId && post.likes ? post.likes.includes(viewerId) : false,
      commentsCount: post.comments ? post.comments.length : 0,
      comments: post.comments || [],
      createdAt: post.createdAt,
      timeAgo: calculateTimeAgo(post.createdAt),
    }));
  }

  /**
   * Create a new real post and broadcast in real time
   */
  static async createPost(
    userId: string,
    data: { content: string; imageUrl?: string | null; gameTag?: string }
  ): Promise<FeedPostResponse> {
    // Resolve user details
    let authorName = 'Player';
    let authorUsername = 'player';
    let authorAvatar: string | null = null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (user) {
        authorUsername = user.username;
        authorName = user.profile?.displayName || user.username;
        authorAvatar = user.profile?.avatarUrl || null;
      }
    } catch {
      // Fallback
    }

    const newPost: FeedPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: userId,
      authorName,
      authorUsername,
      authorAvatar,
      gameTag: data.gameTag?.trim() || undefined,
      content: data.content.trim(),
      imageUrl: data.imageUrl || null,
      likes: [],
      likesCount: 0,
      comments: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    store.add(newPost);

    const postResponse: FeedPostResponse = {
      ...newPost,
      isLikedByMe: false,
      timeAgo: 'Just now',
    };

    // Broadcast in real-time to all connected users
    emitToAll('feed:new_post', postResponse);

    return postResponse;
  }

  /**
   * Toggle like on a post in real time
   */
  static async toggleLike(
    userId: string,
    postId: string
  ): Promise<{ postId: string; isLiked: boolean; likesCount: number }> {
    const post = store.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(userId);
    let isLiked = false;

    if (idx === -1) {
      post.likes.push(userId);
      isLiked = true;
    } else {
      post.likes.splice(idx, 1);
      isLiked = false;
    }

    post.likesCount = post.likes.length;
    store.update(post);

    const result = {
      postId,
      userId,
      isLiked,
      likesCount: post.likesCount,
    };

    // Broadcast real-time like update
    emitToAll('feed:post_liked', result);

    return { postId, isLiked, likesCount: post.likesCount };
  }

  /**
   * Add a real comment to a post in real time
   */
  static async addComment(
    userId: string,
    postId: string,
    text: string
  ): Promise<PostComment> {
    const post = store.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    let authorName = 'Player';
    let authorUsername = 'player';
    let authorAvatar: string | null = null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (user) {
        authorUsername = user.username;
        authorName = user.profile?.displayName || user.username;
        authorAvatar = user.profile?.avatarUrl || null;
      }
    } catch {
      // Fallback
    }

    const comment: PostComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId,
      authorId: userId,
      authorName,
      authorUsername,
      authorAvatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    post.commentsCount = post.comments.length;
    store.update(post);

    // Broadcast real-time comment update
    emitToAll('feed:new_comment', {
      postId,
      comment,
      commentsCount: post.commentsCount,
    });

    return comment;
  }

  /**
   * Delete post
   */
  static async deletePost(userId: string, postId: string): Promise<boolean> {
    const post = store.getById(postId);
    if (!post) return false;
    if (post.authorId !== userId) {
      throw new Error('Unauthorized: you cannot delete this post');
    }

    const deleted = store.remove(postId);
    if (deleted) {
      emitToAll('feed:post_deleted', { postId });
    }
    return deleted;
  }
}
