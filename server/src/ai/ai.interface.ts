export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface AiBotProfile {
  id: string;
  name: string;
  title: string;
  avatarSeed: string;
  personality: string;
  preferredDifficulty: AiDifficulty;
}

export interface GameAI<TState = any, TAction = any> {
  /**
   * Calculates the best or appropriate move for the AI player given the current state and difficulty.
   * AI must NOT make illegal moves, mutate state, or inspect private opponent data.
   */
  getMove(
    state: TState,
    aiPlayerId: string,
    difficulty: AiDifficulty,
    options?: any
  ): Promise<TAction> | TAction;
}
