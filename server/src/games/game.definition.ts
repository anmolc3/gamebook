import {
  GameCategory,
  GameDefinition,
  GameActionPayload,
  GameActionResult,
  GameEventPayload,
} from '../../../shared/game-types';

export interface GamePlayerMeta {
  userId: string;
  username: string;
  displayName: string;
  slotIndex: number;
}

/**
 * Standard Server-Authoritative Game Engine Interface.
 * Every game module (Tic-Tac-Toe, Ludo, Chess, etc.) implements this contract.
 */
export interface GameEngine<TState = any, TAction = any, TResult = any> {
  readonly definition: GameDefinition;

  /**
   * Initializes state when match starts in a room
   */
  initialize(players: GamePlayerMeta[], settings?: Record<string, any>): TState;

  /**
   * Pure validation: returns true or throws an error explaining why the action is invalid
   */
  validateAction(state: TState, playerId: string, action: TAction): boolean;

  /**
   * State transformation: (State, PlayerId, Action) => NextState
   */
  applyAction(state: TState, playerId: string, action: TAction): GameActionResult<TState>;

  /**
   * Inspects state to determine if game concluded with a win or draw
   */
  checkWinner(state: TState): TResult | null;

  /**
   * Handles player disconnection (pauses timer, sets flag, or starts countdown)
   */
  handlePlayerDisconnect?(state: TState, playerId: string): TState;

  /**
   * Handles player reconnection (resumes timer, reconciles sequence number)
   */
  handlePlayerReconnect?(state: TState, playerId: string): TState;

  /**
   * Handles turn timer expiry (timeout skip, auto-move, or forfeit)
   */
  handleTurnTimeout?(state: TState): GameActionResult<TState>;
}
