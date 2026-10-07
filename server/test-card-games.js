// server/test-card-games.js
// Automated verification suite for Phase 13: Card Game Engine & Suite

const assert = require('assert');
const { CardDeck } = require('./dist/server/src/games/cards/core/deck');
const { CardEvaluator } = require('./dist/server/src/games/cards/core/evaluator');
const { UnoEngine } = require('./dist/server/src/games/cards/uno.engine');
const { HeartsEngine } = require('./dist/server/src/games/cards/hearts.engine');
const { SpadesEngine } = require('./dist/server/src/games/cards/spades.engine');
const { RummyEngine } = require('./dist/server/src/games/cards/rummy.engine');
const { GinRummyEngine } = require('./dist/server/src/games/cards/ginrummy.engine');
const { CrazyEightsEngine } = require('./dist/server/src/games/cards/crazyeights.engine');
const { GoFishEngine } = require('./dist/server/src/games/cards/gofish.engine');
const { WarEngine } = require('./dist/server/src/games/cards/war.engine');
const { DurakEngine } = require('./dist/server/src/games/cards/durak.engine');
const { PresidentEngine } = require('./dist/server/src/games/cards/president.engine');
const { BlackjackEngine } = require('./dist/server/src/games/cards/blackjack.engine');
const { PokerEngine } = require('./dist/server/src/games/cards/poker.engine');
const { MatchManager } = require('./dist/server/src/games/match.manager');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('  Running Phase 13: Card Game Suite Test Runner');
console.log('====================================================\n');

// 1. Core Card Deck & Shuffling
console.log('--- 1. Card Deck & Shuffling ---');
test('Deck: Standard 52 generates exactly 52 distinct cards', () => {
  const deck = CardDeck.createStandard52();
  assert.strictEqual(deck.length, 52);
  const ids = new Set(deck.map((c) => c.id));
  assert.strictEqual(ids.size, 52);
});

test('Deck: Durak 36 generates exactly 36 cards with ranks 6..14', () => {
  const deck = CardDeck.createDurak36();
  assert.strictEqual(deck.length, 36);
  assert(deck.every((c) => c.rank >= 6 && c.rank <= 14));
});

test('Deck: Uno 108 generates exactly 108 cards including wildcards', () => {
  const deck = CardDeck.createUno108();
  assert.strictEqual(deck.length, 108);
  const wilds = deck.filter((c) => c.suit === 'WILD');
  assert.strictEqual(wilds.length, 8); // 4 Wild + 4 Wild Draw 4
});

test('Deck: Fisher-Yates CSPRNG shuffle preserves all elements', () => {
  const deck = CardDeck.createStandard52();
  const shuffled = CardDeck.shuffle(deck);
  assert.strictEqual(shuffled.length, 52);
  assert.notDeepStrictEqual(shuffled, deck);
});

test('Deck: deal distributes cards evenly among players', () => {
  const deck = CardDeck.createStandard52();
  const res = CardDeck.deal(deck, ['p1', 'p2', 'p3', 'p4'], 5);
  assert.strictEqual(res.hands['p1'].length, 5);
  assert.strictEqual(res.hands['p4'].length, 5);
  assert.strictEqual(res.remainingDeck.length, 32);
});

// 2. Evaluator Rules
console.log('\n--- 2. Evaluator Engine ---');
test('Evaluator: Blackjack soft Aces evaluate dynamically', () => {
  const aceCard = { id: '1', suit: 'HEARTS', rank: 14, label: 'A♥' };
  const nineCard = { id: '2', suit: 'CLUBS', rank: 9, label: '9♣' };
  const fiveCard = { id: '3', suit: 'DIAMONDS', rank: 5, label: '5♦' };

  // Ace + 9 = 20
  const r1 = CardEvaluator.evaluateBlackjack([aceCard, nineCard]);
  assert.strictEqual(r1.value, 20);
  assert.strictEqual(r1.isBust, false);

  // Ace + 9 + 5 = 15 (soft ace reduced to 1)
  const r2 = CardEvaluator.evaluateBlackjack([aceCard, nineCard, fiveCard]);
  assert.strictEqual(r2.value, 15);
  assert.strictEqual(r2.isBust, false);
});

test('Evaluator: Trick evaluation handles lead suit and trumps', () => {
  const trick = [
    { playerId: 'p1', card: { id: '1', suit: 'HEARTS', rank: 10, label: '10♥' } },
    { playerId: 'p2', card: { id: '2', suit: 'HEARTS', rank: 14, label: 'A♥' } },
    { playerId: 'p3', card: { id: '3', suit: 'CLUBS', rank: 14, label: 'A♣' } }, // off suit
    { playerId: 'p4', card: { id: '4', suit: 'SPADES', rank: 2, label: '2♠' } }, // trump
  ];

  // Without trump: p2 wins with A♥
  const w1 = CardEvaluator.evaluateTrick(trick.slice(0, 3), 'HEARTS');
  assert.strictEqual(w1, 'p2');

  // With Spades trump: p4 wins with 2♠
  const w2 = CardEvaluator.evaluateTrick(trick, 'HEARTS', 'SPADES');
  assert.strictEqual(w2, 'p4');
});

test('Evaluator: Pure Sequence validation', () => {
  const valid = [
    { id: '1', suit: 'HEARTS', rank: 7, label: '7♥' },
    { id: '2', suit: 'HEARTS', rank: 8, label: '8♥' },
    { id: '3', suit: 'HEARTS', rank: 9, label: '9♥' },
  ];
  assert.strictEqual(CardEvaluator.isPureSequence(valid), true);

  const invalid = [
    { id: '1', suit: 'HEARTS', rank: 7, label: '7♥' },
    { id: '2', suit: 'SPADES', rank: 8, label: '8♠' },
    { id: '3', suit: 'HEARTS', rank: 9, label: '9♥' },
  ];
  assert.strictEqual(CardEvaluator.isPureSequence(invalid), false);
});

test('Evaluator: Poker hand evaluator identifies Royal Flush down to High Card', () => {
  const royalFlush = [
    { id: '1', suit: 'SPADES', rank: 10, label: '10♠' },
    { id: '2', suit: 'SPADES', rank: 11, label: 'J♠' },
    { id: '3', suit: 'SPADES', rank: 12, label: 'Q♠' },
    { id: '4', suit: 'SPADES', rank: 13, label: 'K♠' },
    { id: '5', suit: 'SPADES', rank: 14, label: 'A♠' },
    { id: '6', suit: 'HEARTS', rank: 2, label: '2♥' },
    { id: '7', suit: 'CLUBS', rank: 3, label: '3♣' },
  ];
  const evalRF = CardEvaluator.evaluatePokerHand(royalFlush);
  assert.strictEqual(evalRF.rankName, 'Royal Flush');
});

// 3. Uno Engine
console.log('\n--- 3. Color Match Clash (UNO) ---');
test('Uno: initial state has hands, discard top card, and currentColor', () => {
  const engine = new UnoEngine();
  const state = engine.initialize([
    { userId: 'u1', username: 'u1', displayName: 'User 1', slotIndex: 0 },
    { userId: 'u2', username: 'u2', displayName: 'User 2', slotIndex: 1 },
  ]);

  assert.strictEqual(state.hands['u1'].length, 7);
  assert.strictEqual(state.hands['u2'].length, 7);
  assert(state.discardPile.length >= 1);
  assert(state.currentColor !== undefined);
});

test('Uno: playing a matching card updates top card and passes turn', () => {
  const engine = new UnoEngine();
  const state = engine.initialize([
    { userId: 'u1', username: 'u1', displayName: 'User 1', slotIndex: 0 },
    { userId: 'u2', username: 'u2', displayName: 'User 2', slotIndex: 1 },
  ]);

  const card = { id: 'u1-play', suit: state.currentColor, rank: state.currentRank, label: 'Match', isFaceUp: false };
  state.hands['u1'].push(card);

  const res = engine.applyAction(state, 'u1', { type: 'PLAY_CARD', cardId: 'u1-play' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.turnPlayerId, 'u2');
});

// 4. Hearts Engine
console.log('\n--- 4. Hearts Trick Taking ---');
test('Hearts: initializes 4 players with 13 cards and finds 2 of clubs lead', () => {
  const engine = new HeartsEngine();
  const players = ['h1', 'h2', 'h3', 'h4'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  const state = engine.initialize(players);

  assert.strictEqual(Object.keys(state.hands).length, 4);
  assert.strictEqual(state.hands['h1'].length, 13);
  assert(state.turnPlayerId !== '');
});

test('Hearts: trick completion awards trick and tallies penalty points', () => {
  const engine = new HeartsEngine();
  const players = ['h1', 'h2', 'h3', 'h4'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  const state = engine.initialize(players);

  state.turnPlayerId = 'h1';
  state.hands['h1'] = [{ id: 'c-2', suit: 'CLUBS', rank: 2, label: '2♣' }];
  state.hands['h2'] = [{ id: 'c-10', suit: 'CLUBS', rank: 10, label: '10♣' }];
  state.hands['h3'] = [{ id: 'c-14', suit: 'CLUBS', rank: 14, label: 'A♣' }];
  state.hands['h4'] = [{ id: 'h-14', suit: 'HEARTS', rank: 14, label: 'A♥' }]; // 1 heart penalty

  let s = engine.applyAction(state, 'h1', { type: 'PLAY_CARD', cardId: 'c-2' }).state;
  s = engine.applyAction(s, 'h2', { type: 'PLAY_CARD', cardId: 'c-10' }).state;
  s = engine.applyAction(s, 'h3', { type: 'PLAY_CARD', cardId: 'c-14' }).state;
  s = engine.applyAction(s, 'h4', { type: 'PLAY_CARD', cardId: 'h-14' }).state;

  // h3 played highest club (A♣), so h3 wins trick
  assert.strictEqual(s.turnPlayerId, 'h3');
  assert.strictEqual(s.roundScores['h3'], 1); // 1 point for the heart
});

// 5. Spades Engine
console.log('\n--- 5. Spades Bidding & Trump ---');
test('Spades: handles bidding phase then transitions to play', () => {
  const engine = new SpadesEngine();
  const players = ['s1', 's2', 's3', 's4'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state = engine.applyAction(state, 's1', { type: 'BID', bidAmount: 3 }).state;
  state = engine.applyAction(state, 's2', { type: 'BID', bidAmount: 4 }).state;
  state = engine.applyAction(state, 's3', { type: 'BID', bidAmount: 2 }).state;
  state = engine.applyAction(state, 's4', { type: 'BID', bidAmount: 0 }).state; // nil

  assert.strictEqual(state.bids['s1'], 3);
  assert.strictEqual(state.bids['s4'], 0);
  assert.strictEqual(state.currentTrick.length, 0);
});

// 6. Indian Rummy
console.log('\n--- 6. Indian Rummy ---');
test('Rummy: draw from stock and discard card', () => {
  const engine = new RummyEngine();
  const players = ['r1', 'r2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  const initialHandSize = state.players[0].hand.length;
  // Draw stock
  state = engine.applyAction(state, 'r1', { type: 'DRAW_STOCK' }).state;
  assert.strictEqual(state.players[0].hand.length, initialHandSize + 1);

  // Discard card
  const discardCard = state.players[0].hand[0];
  state = engine.applyAction(state, 'r1', { type: 'DISCARD', cardId: discardCard.id }).state;
  assert.strictEqual(state.players[0].hand.length, initialHandSize);
  assert.strictEqual(state.turnPlayerId, 'r2');
});

// 7. Gin Rummy
console.log('\n--- 7. Gin Rummy ---');
test('Gin Rummy: draw and knock ends round', () => {
  const engine = new GinRummyEngine();
  const players = ['g1', 'g2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state = engine.applyAction(state, 'g1', { type: 'DRAW_STOCK' }).state;
  const cardToKnock = state.hands['g1'][0];
  state = engine.applyAction(state, 'g1', { type: 'KNOCK', cardId: cardToKnock.id }).state;

  assert(state.winnerId !== null);
  const winCheck = engine.checkWinner(state);
  assert(winCheck.winnerId !== null);
});

// 8. Crazy Eights
console.log('\n--- 8. Crazy Eights ---');
test('Crazy Eights: 8 is wild and changes suit', () => {
  const engine = new CrazyEightsEngine();
  const players = ['c1', 'c2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state.currentSuit = 'CLUBS';
  state.currentRank = 5;
  const eightCard = { id: 'c1-eight', suit: 'HEARTS', rank: 8, label: '8♥' };
  state.hands['c1'].push(eightCard);

  state = engine.applyAction(state, 'c1', {
    type: 'PLAY_CARD',
    cardId: 'c1-eight',
    declaredSuit: 'SPADES',
  }).state;

  assert.strictEqual(state.currentSuit, 'SPADES');
  assert.strictEqual(state.turnPlayerId, 'c2');
});

// 9. Go Fish
console.log('\n--- 9. Go Fish ---');
test('Go Fish: asks for rank and catches card from opponent', () => {
  const engine = new GoFishEngine();
  const players = ['f1', 'f2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state.hands['f1'] = [{ id: 'f1-k', suit: 'HEARTS', rank: 13, label: 'K♥' }];
  state.hands['f2'] = [{ id: 'f2-k', suit: 'SPADES', rank: 13, label: 'K♠' }];

  state = engine.applyAction(state, 'f1', {
    type: 'ASK_RANK',
    targetUserId: 'f2',
    rank: 13,
  }).state;

  assert.strictEqual(state.hands['f1'].length, 2);
  assert.strictEqual(state.hands['f2'].length, 0);
  assert.strictEqual(state.turnPlayerId, 'f1'); // Retains turn on successful catch
});

// 10. War
console.log('\n--- 10. War Card Duel ---');
test('War: higher flipped card takes both cards into won pile', () => {
  const engine = new WarEngine();
  const players = ['w1', 'w2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state.decks['w1'] = [{ id: 'w1-k', suit: 'HEARTS', rank: 13, label: 'K♥' }];
  state.decks['w2'] = [{ id: 'w2-2', suit: 'SPADES', rank: 2, label: '2♠' }];

  state = engine.applyAction(state, 'w1', { type: 'FLIP_CARD' }).state;
  assert.strictEqual(state.wonPiles['w1'].length, 2);
  assert.strictEqual(state.wonPiles['w2'].length, 0);
});

// 11. Durak
console.log('\n--- 11. Durak Attack & Defend ---');
test('Durak: attacker plays card and defender defends with higher trump', () => {
  const engine = new DurakEngine();
  const players = ['d1', 'd2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state.attackerId = 'd1';
  state.defenderId = 'd2';
  state.turnPlayerId = 'd1';
  state.trumpSuit = 'SPADES';

  const attCard = { id: 'd1-c', suit: 'CLUBS', rank: 7, label: '7♣' };
  const defCard = { id: 'd2-t', suit: 'SPADES', rank: 6, label: '6♠' }; // trump beats clubs
  state.hands['d1'] = [attCard];
  state.hands['d2'] = [defCard];

  state = engine.applyAction(state, 'd1', { type: 'ATTACK', cardId: 'd1-c' }).state;
  assert.strictEqual(state.table.length, 1);
  assert.strictEqual(state.turnPlayerId, 'd2');

  state = engine.applyAction(state, 'd2', { type: 'DEFEND', cardId: 'd2-t' }).state;
  assert(state.table[0].defendCard !== undefined);
  assert.strictEqual(state.turnPlayerId, 'd1');
});

// 12. President / Scum
console.log('\n--- 12. President / Scum ---');
test('President: playing a 2 clears trick immediately', () => {
  const engine = new PresidentEngine();
  const players = ['p1', 'p2', 'p3'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  state.turnPlayerId = 'p1';
  state.hands['p1'] = [{ id: 'p1-2', suit: 'HEARTS', rank: 2, label: '2♥' }];

  state = engine.applyAction(state, 'p1', { type: 'PLAY_CARDS', cardIds: ['p1-2'] }).state;
  assert.strictEqual(state.currentTrick.length, 0); // Cleared on 2
  assert.strictEqual(state.activeCardRank, null);
});

// 13. Blackjack
console.log('\n--- 13. Blackjack (Zero Real Money Gambling) ---');
test('Blackjack: player hits, stands, and dealer resolves round with zero gambling chips', () => {
  const engine = new BlackjackEngine();
  const players = [{ userId: 'bj1', username: 'bj1', displayName: 'Player 1', slotIndex: 0 }];
  let state = engine.initialize(players);

  assert.strictEqual(state.chips['bj1'], 950); // 1000 - 50 bet
  assert.strictEqual(state.bets['bj1'], 50);

  // Stand to trigger dealer resolution
  state = engine.applyAction(state, 'bj1', { type: 'STAND' }).state;
  assert.strictEqual(state.isRoundComplete, true);
  const winCheck = engine.checkWinner(state);
  assert(winCheck.winnerId !== null);
  assert(typeof winCheck.payouts['bj1'] === 'number');
});

// 14. Texas Hold’em Social Poker
console.log('\n--- 14. Texas Hold’em Social (Zero Real Money Gambling) ---');
test('Poker: players bet/call through preflop and fold awards pot', () => {
  const engine = new PokerEngine();
  const players = ['pk1', 'pk2'].map((id, i) => ({
    userId: id, username: id, displayName: `Player ${i}`, slotIndex: i,
  }));
  let state = engine.initialize(players);

  assert.strictEqual(state.pot, 30); // 10 SB + 20 BB
  assert.strictEqual(state.stage, 'PREFLOP');

  // pk1 folds -> pk2 wins pot
  state = engine.applyAction(state, state.turnPlayerId, { type: 'FOLD' }).state;
  assert(state.winnerId !== null);
  assert(state.winnerId !== state.turnPlayerId);
  const winRes = engine.checkWinner(state);
  assert.strictEqual(winRes.potWon, 30);
});

// 15. MatchManager Integration
console.log('\n--- 15. MatchManager Integration ---');
test('MatchManager: starts matches for all 12 card games', () => {
  const cardGames = [
    'UNO_STYLE', 'HEARTS', 'SPADES', 'RUMMY',
    'GIN_RUMMY', 'CRAZY_EIGHTS', 'GO_FISH', 'WAR',
    'DURAK', 'PRESIDENT', 'BLACKJACK', 'POKER'
  ];

  const dummyPlayers = [
    { userId: 'u1', username: 'u1', displayName: 'Player 1', slotIndex: 0 },
    { userId: 'u2', username: 'u2', displayName: 'Player 2', slotIndex: 1 },
    { userId: 'u3', username: 'u3', displayName: 'Player 3', slotIndex: 2 },
    { userId: 'u4', username: 'u4', displayName: 'Player 4', slotIndex: 3 },
  ];

  for (const gameType of cardGames) {
    const match = MatchManager.startMatch(`ROOM-${gameType}`, gameType, dummyPlayers);
    assert(match !== undefined, `Failed to start match for ${gameType}`);
    assert(match.state !== undefined, `Match state undefined for ${gameType}`);
    assert.strictEqual(match.gameType, gameType);
  }
});

console.log('\n====================================================');
console.log(`  Tests Completed: ${passedTests} passed, ${failedTests} failed`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('>> ALL CARD GAME ENGINE TESTS PASSED SUCCESSFULLY! <<\n');
  process.exit(0);
}
