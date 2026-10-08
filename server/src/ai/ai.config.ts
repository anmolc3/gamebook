import { AiBotProfile, AiDifficulty } from './ai.interface';

// Thinking delay bounds in milliseconds
export const AI_CONFIG = {
  MIN_DELAY_MS: 1200,
  MAX_DELAY_MS: 2200,
  EXPERT_DEPTH_TIMEOUT_MS: 3000,
};

export const BOT_PROFILES: AiBotProfile[] = [
  {
    id: 'BOT_NOVA',
    name: 'Nova',
    title: 'Tactical Strategist',
    avatarSeed: 'nova-ai',
    personality: 'Balanced and methodical. Calculates thoughtful moves.',
    preferredDifficulty: 'MEDIUM',
  },
  {
    id: 'BOT_ACE',
    name: 'Ace',
    title: 'Aggressive Master',
    avatarSeed: 'ace-ai',
    personality: 'Sharp and opportunistic. Capitalizes quickly on errors.',
    preferredDifficulty: 'HARD',
  },
  {
    id: 'BOT_ATLAS',
    name: 'Atlas',
    title: 'Grandmaster Solver',
    avatarSeed: 'atlas-ai',
    personality: 'Deep calculation with long-term positional foresight.',
    preferredDifficulty: 'EXPERT',
  },
  {
    id: 'BOT_PIXEL',
    name: 'Pixel',
    title: 'Casual Companion',
    avatarSeed: 'pixel-ai',
    personality: 'Friendly, playful, and great for newcomers to learn against.',
    preferredDifficulty: 'EASY',
  },
  {
    id: 'BOT_SCOUT',
    name: 'Scout',
    title: 'Agile Competitor',
    avatarSeed: 'scout-ai',
    personality: 'Quick reflex decisions and dynamic counterplay.',
    preferredDifficulty: 'MEDIUM',
  },
];

export function getBotProfile(botIdOrDifficulty?: string): AiBotProfile {
  if (botIdOrDifficulty) {
    const byId = BOT_PROFILES.find((b) => b.id === botIdOrDifficulty || b.name.toLowerCase() === botIdOrDifficulty.toLowerCase());
    if (byId) return byId;

    const byDiff = BOT_PROFILES.find((b) => b.preferredDifficulty === botIdOrDifficulty);
    if (byDiff) return byDiff;
  }
  // Default to Nova
  return BOT_PROFILES[0];
}

/**
 * Calculates a natural human-like thinking delay based on difficulty
 */
export function getThinkingDelayMs(difficulty: AiDifficulty): number {
  const min = AI_CONFIG.MIN_DELAY_MS;
  const max = AI_CONFIG.MAX_DELAY_MS;
  const randomJitter = Math.floor(Math.random() * (max - min));
  
  switch (difficulty) {
    case 'EASY':
      return min + Math.floor(randomJitter * 0.7); // Faster, less contemplation
    case 'MEDIUM':
      return min + randomJitter;
    case 'HARD':
      return min + 200 + randomJitter;
    case 'EXPERT':
      return min + 350 + randomJitter;
    default:
      return min + randomJitter;
  }
}
