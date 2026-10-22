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
    name: 'Otter',
    title: 'Tactical Strategist',
    avatarSeed: 'otter_mascot',
    personality: 'Balanced and methodical. Calculates thoughtful moves.',
    preferredDifficulty: 'MEDIUM',
  },
  {
    id: 'BOT_ACE',
    name: 'Ollie',
    title: 'Aggressive Master',
    avatarSeed: 'otter_mascot',
    personality: 'Sharp and opportunistic. Capitalizes quickly on errors.',
    preferredDifficulty: 'HARD',
  },
  {
    id: 'BOT_ATLAS',
    name: 'Otto',
    title: 'Grandmaster Solver',
    avatarSeed: 'otter_mascot',
    personality: 'Deep calculation with long-term positional foresight.',
    preferredDifficulty: 'HARD',
  },
  {
    id: 'BOT_PIXEL',
    name: 'River',
    title: 'Casual Companion',
    avatarSeed: 'otter_mascot',
    personality: 'Friendly, playful, and great for newcomers to learn against.',
    preferredDifficulty: 'EASY',
  },
  {
    id: 'BOT_SCOUT',
    name: 'Pebble',
    title: 'Agile Competitor',
    avatarSeed: 'otter_mascot',
    personality: 'Quick reflex decisions and dynamic counterplay.',
    preferredDifficulty: 'MEDIUM',
  },
];

// Mapping aliases for bot IDs and names
const BOT_ALIASES: Record<string, string> = {
  bot_otter: 'BOT_NOVA',
  otter: 'BOT_NOVA',
  bot_ollie: 'BOT_ACE',
  ollie: 'BOT_ACE',
  bot_otto: 'BOT_ATLAS',
  otto: 'BOT_ATLAS',
  bot_river: 'BOT_PIXEL',
  river: 'BOT_PIXEL',
  bot_pebble: 'BOT_SCOUT',
  pebble: 'BOT_SCOUT',
};

export function getBotProfile(botIdOrDifficulty?: string): AiBotProfile {
  if (botIdOrDifficulty) {
    const raw = botIdOrDifficulty.trim();
    const lower = raw.toLowerCase();

    // Check direct ID match
    const byId = BOT_PROFILES.find(
      (b) => b.id === raw || b.id.toLowerCase() === lower
    );
    if (byId) return byId;

    // Check alias or name match
    const aliasId = BOT_ALIASES[lower];
    if (aliasId) {
      const byAlias = BOT_PROFILES.find((b) => b.id === aliasId);
      if (byAlias) return byAlias;
    }

    const byName = BOT_PROFILES.find((b) => b.name.toLowerCase() === lower);
    if (byName) return byName;

    // Check preferred difficulty
    const byDiff = BOT_PROFILES.find(
      (b) => b.preferredDifficulty === raw.toUpperCase()
    );
    if (byDiff) return byDiff;
  }
  // Default to Otter
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
      return min + Math.floor(randomJitter * 0.3); // Quick, less contemplation
    case 'MEDIUM':
      return min + 250 + Math.floor(randomJitter * 0.5);
    case 'HARD':
      return min + 500 + Math.floor(randomJitter * 0.7);
    case 'EXPERT':
      return min + 800 + randomJitter;
    default:
      return min + randomJitter;
  }
}

