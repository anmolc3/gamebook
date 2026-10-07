import { GameAI, AiDifficulty } from '../ai.interface';
import { UnoAction, UnoColor, UnoState } from '../../../../shared/game-types';

export class UnoAI implements GameAI<UnoState, UnoAction> {
  getMove(state: UnoState, aiPlayerId: string, difficulty: AiDifficulty): UnoAction {
    const hand = state.hands[aiPlayerId] || [];
    const currentColor = state.currentColor;
    const currentRank = state.currentRank;

    // Legal cards to play
    const playableIndices: number[] = [];

    hand.forEach((card, idx) => {
      if (card.suit === 'WILD' || card.suit === currentColor || card.rank === currentRank) {
        playableIndices.push(idx);
      }
    });

    if (playableIndices.length === 0) {
      // Must draw
      return { type: 'DRAW_CARD' };
    }

    if (difficulty === 'EASY') {
      const randIdx = playableIndices[Math.floor(Math.random() * playableIndices.length)];
      const chosenCard = hand[randIdx];
      const chosenColor = chosenCard.suit === 'WILD' ? this.chooseBestColor(hand) : undefined;
      return { type: 'PLAY_CARD', cardId: chosenCard.id, chosenColor };
    }

    // Medium/Hard: Play matching color/number first, save WILD for when needed
    const nonWilds = playableIndices.filter((idx) => hand[idx].suit !== 'WILD');
    const pickIndex = nonWilds.length > 0 ? nonWilds[0] : playableIndices[0];
    const pickedCard = hand[pickIndex];
    const chosenColor = pickedCard.suit === 'WILD' ? this.chooseBestColor(hand) : undefined;

    return { type: 'PLAY_CARD', cardId: pickedCard.id, chosenColor };
  }

  private chooseBestColor(hand: any[]): UnoColor {
    const colorCounts: Record<string, number> = { RED: 0, GREEN: 0, BLUE: 0, YELLOW: 0 };
    for (const card of hand) {
      if (card.suit in colorCounts) {
        colorCounts[card.suit]++;
      }
    }
    let bestColor: UnoColor = 'RED';
    let max = -1;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > max) {
        max = count;
        bestColor = color as UnoColor;
      }
    }
    return bestColor;
  }
}
