// server/test-puzzle-games.js
// Automated verification suite for Phase 14: Word, Quiz & Fast Puzzle Games

const assert = require('assert');
const { RpsEngine } = require('./dist/server/src/games/puzzle/rps.engine');
const { ReactionEngine } = require('./dist/server/src/games/puzzle/reaction.engine');
const { NumberGuessEngine } = require('./dist/server/src/games/puzzle/numberguess.engine');
const { SpeedTapEngine } = require('./dist/server/src/games/puzzle/speedtap.engine');
const { ColorMatchEngine } = require('./dist/server/src/games/puzzle/colormatch.engine');
const { MathBattleEngine } = require('./dist/server/src/games/puzzle/math.engine');
const { QuickDrawEngine } = require('./dist/server/src/games/puzzle/quickdraw.engine');
const { WordleEngine } = require('./dist/server/src/games/puzzle/wordle.engine');
const { HangmanEngine } = require('./dist/server/src/games/puzzle/hangman.engine');
const { MemoryMatchEngine } = require('./dist/server/src/games/puzzle/memory.engine');
const { QuizBattleEngine } = require('./dist/server/src/games/puzzle/quiz.engine');
const { Game2048Engine } = require('./dist/server/src/games/puzzle/game2048.engine');
const { MinesweeperEngine } = require('./dist/server/src/games/puzzle/minesweeper.engine');
const { PatternMatchEngine } = require('./dist/server/src/games/puzzle/pattern.engine');
const { MastermindEngine } = require('./dist/server/src/games/puzzle/mastermind.engine');
const { WordScrambleEngine } = require('./dist/server/src/games/puzzle/scramble.engine');
const { TypingRaceEngine } = require('./dist/server/src/games/puzzle/typing.engine');
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

const p1 = { userId: 'u1', username: 'Alice', displayName: 'Alice', slotIndex: 0 };
const p2 = { userId: 'u2', username: 'Bob', displayName: 'Bob', slotIndex: 1 };
const players2 = [p1, p2];

console.log('====================================================');
console.log('  Running Phase 14: Puzzle & Fast Games Test Suite');
console.log('====================================================\n');

// 1. Rock Paper Scissors
console.log('--- 1. Rock Paper Scissors Engine ---');
test('RPS: Initialize creates default state and scores', () => {
  const engine = new RpsEngine();
  const state = engine.initialize(players2, { targetWins: 2 });
  assert.strictEqual(state.currentRound, 1);
  assert.strictEqual(state.targetWins, 2);
  assert.strictEqual(state.roundScores['u1'], 0);
  assert.strictEqual(state.roundScores['u2'], 0);
  assert.strictEqual(state.winnerId, null);
});

test('RPS: Evaluates Rock beats Scissors round correctly', () => {
  const engine = new RpsEngine();
  let state = engine.initialize(players2, { targetWins: 2 });
  let res = engine.applyAction(state, 'u1', { type: 'CHOICE', choice: 'ROCK' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.choices['u1'], 'ROCK');
  assert.strictEqual(state.currentRound, 1);

  res = engine.applyAction(state, 'u2', { type: 'CHOICE', choice: 'SCISSORS' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.roundScores['u1'], 1);
  assert.strictEqual(state.roundScores['u2'], 0);
  assert.strictEqual(state.lastRoundWinner, 'u1');
});

test('RPS: Evaluates Tie round without incrementing scores', () => {
  const engine = new RpsEngine();
  let state = engine.initialize(players2, { targetWins: 2 });
  let res = engine.applyAction(state, 'u1', { type: 'CHOICE', choice: 'PAPER' });
  state = res.state;
  res = engine.applyAction(state, 'u2', { type: 'CHOICE', choice: 'PAPER' });
  state = res.state;
  assert.strictEqual(state.roundScores['u1'], 0);
  assert.strictEqual(state.roundScores['u2'], 0);
  assert.strictEqual(state.lastRoundWinner, 'TIE');
});

test('RPS: Match ends when target score is achieved', () => {
  const engine = new RpsEngine();
  let state = engine.initialize(players2, { targetWins: 1 });
  let res = engine.applyAction(state, 'u1', { type: 'CHOICE', choice: 'PAPER' });
  state = res.state;
  res = engine.applyAction(state, 'u2', { type: 'CHOICE', choice: 'ROCK' });
  state = res.state;
  assert.strictEqual(state.winnerId, 'u1');
});

// 2. Reaction Speed Test
console.log('--- 2. Reaction Speed Test Engine ---');
test('Reaction: Initializes in READY stage', () => {
  const engine = new ReactionEngine();
  const state = engine.initialize(players2);
  assert.strictEqual(state.stage, 'READY');
  assert.strictEqual(state.winnerId, null);
  assert.strictEqual(state.reactionTimes['u1'], null);
  assert.strictEqual(state.reactionTimes['u2'], null);
});

test('Reaction: Penalizes early tap (false start) before signal', () => {
  const engine = new ReactionEngine();
  const state = engine.initialize(players2);
  // Tap with timestamp before signalTriggerAt
  const res = engine.applyAction(state, 'u1', { type: 'TAP', timestamp: state.signalTriggerAt - 500 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.reactionTimes['u1'], 9999);
});

test('Reaction: Records sub-second reaction time after signal', () => {
  const engine = new ReactionEngine();
  let state = engine.initialize(players2);
  const signalTime = state.signalTriggerAt;
  let res = engine.applyAction(state, 'u1', { type: 'TAP', timestamp: signalTime + 245 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.reactionTimes['u1'], 245);

  res = engine.applyAction(state, 'u2', { type: 'TAP', timestamp: signalTime + 310 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.reactionTimes['u2'], 310);
  assert.strictEqual(state.stage, 'FINISHED');
  assert.strictEqual(state.winnerId, 'u1');
});

// 3. Number Guessing Duel
console.log('--- 3. Number Guessing Duel Engine ---');
test('Number Guess: Gives HIGHER and LOWER hints and detects exact match', () => {
  const engine = new NumberGuessEngine();
  let state = engine.initialize(players2, { targetNumber: 50 });

  // u1 guesses 25 (lower than 50)
  let res = engine.applyAction(state, 'u1', { type: 'GUESS', number: 25 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.attempts['u1'][0].hint, 'HIGHER');
  assert.strictEqual(state.turnPlayerId, 'u2');

  // u2 guesses 75 (higher than 50)
  res = engine.applyAction(state, 'u2', { type: 'GUESS', number: 75 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.attempts['u2'][0].hint, 'LOWER');
  assert.strictEqual(state.turnPlayerId, 'u1');

  // u1 guesses exact 50
  res = engine.applyAction(state, 'u1', { type: 'GUESS', number: 50 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.attempts['u1'][1].hint, 'CORRECT');
  assert.strictEqual(state.winnerId, 'u1');
});

// 4. Speed Tap Rush
console.log('--- 4. Speed Tap Rush Engine ---');
test('Speed Tap: Records rapid target taps and generates new targets', () => {
  const engine = new SpeedTapEngine();
  let state = engine.initialize(players2);
  const initialTargetId = state.activeTarget.id;

  for (let i = 0; i < 15; i++) {
    const res = engine.applyAction(state, 'u1', { type: 'TAP_TARGET' });
    assert.strictEqual(res.success, true);
    state = res.state;
  }
  for (let i = 0; i < 10; i++) {
    const res = engine.applyAction(state, 'u2', { type: 'TAP_TARGET' });
    assert.strictEqual(res.success, true);
    state = res.state;
  }

  assert.strictEqual(state.tapCounts['u1'], 15);
  assert.strictEqual(state.tapCounts['u2'], 10);
  assert.notStrictEqual(state.activeTarget.id, initialTargetId);
});

// 5. Color Match Reflex (Stroop Effect)
console.log('--- 5. Color Match Reflex Engine ---');
test('Color Match: Scores correct Stroop match response', () => {
  const engine = new ColorMatchEngine();
  let state = engine.initialize(players2, { totalRounds: 3 });
  const isMatch = state.currentItem.isMatching;
  let res = engine.applyAction(state, 'u1', { type: 'ANSWER', matches: isMatch });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 10);
});

test('Color Match: No score added on incorrect answer', () => {
  const engine = new ColorMatchEngine();
  let state = engine.initialize(players2, { totalRounds: 3 });
  const wrongMatch = !state.currentItem.isMatching;
  let res = engine.applyAction(state, 'u1', { type: 'ANSWER', matches: wrongMatch });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 0);
});

// 6. Math Battle Duel
console.log('--- 6. Math Battle Duel Engine ---');
test('Math Battle: Accurately validates arithmetic calculations', () => {
  const engine = new MathBattleEngine();
  let state = engine.initialize(players2, { totalRounds: 3 });
  const correct = state.equation.answer;
  let res = engine.applyAction(state, 'u1', { type: 'SUBMIT_ANSWER', answer: correct });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 10);
});

test('Math Battle: Zero score on wrong answer', () => {
  const engine = new MathBattleEngine();
  let state = engine.initialize(players2, { totalRounds: 3 });
  const wrong = state.equation.answer + 99;
  let res = engine.applyAction(state, 'u1', { type: 'SUBMIT_ANSWER', answer: wrong });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 0);
});

// 7. Quick Draw Western Duel
console.log('--- 7. Quick Draw Western Duel Engine ---');
test('Quick Draw: Detects foul if drawn before bell time', () => {
  const engine = new QuickDrawEngine();
  const state = engine.initialize(players2);
  // Default bell is in future, drawing now is foul!
  const res = engine.applyAction(state, 'u1', { type: 'DRAW' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.earlyDrawFouls['u1'], true);
  assert.strictEqual(res.state.winnerId, 'u2'); // Opponent wins on foul
});

test('Quick Draw: Awards round to fastest draw after bell time', () => {
  const engine = new QuickDrawEngine();
  const state = engine.initialize(players2);
  // Set bellTime in past
  state.bellTime = Date.now() - 500;
  const res = engine.applyAction(state, 'u1', { type: 'DRAW' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.winnerId, 'u1');
  assert(res.state.drawTimes['u1'] >= 500);
});

// 8. Wordle Duel
console.log('--- 8. Wordle Duel Engine ---');
test('Wordle: Accurately categorizes letters into CORRECT, PRESENT, ABSENT', () => {
  const engine = new WordleEngine();
  const state = engine.initialize(players2, { targetWord: 'CRANE' });
  const res = engine.applyAction(state, 'u1', { type: 'GUESS_WORD', word: 'TRACE' });
  assert.strictEqual(res.success, true);
  const feedback = res.state.guesses['u1'][0].feedback;
  assert.strictEqual(feedback[0], 'ABSENT'); // T
  assert.strictEqual(feedback[1], 'CORRECT'); // R
  assert.strictEqual(feedback[2], 'CORRECT'); // A
  assert.strictEqual(feedback[3], 'PRESENT'); // C
  assert.strictEqual(feedback[4], 'CORRECT'); // E
});

test('Wordle: Solves duel when exact word guessed', () => {
  const engine = new WordleEngine();
  const state = engine.initialize(players2, { targetWord: 'PLANT' });
  const res = engine.applyAction(state, 'u1', { type: 'GUESS_WORD', word: 'PLANT' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.winnerId, 'u1');
  assert.strictEqual(res.state.isFinished['u1'], true);
});

// 9. Hangman Duel
console.log('--- 9. Hangman Duel Engine ---');
test('Hangman: Reveals matched letters and keeps turn', () => {
  const engine = new HangmanEngine();
  let state = engine.initialize(players2, { item: { word: 'BANANA', category: 'FOOD' } });
  let res = engine.applyAction(state, 'u1', { type: 'GUESS_LETTER', letter: 'A' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.guessedLetters.includes('A'), true);
  assert.strictEqual(state.wrongGuessesCount, 0);
  assert.strictEqual(state.turnPlayerId, 'u1'); // Retains turn on correct letter
});

test('Hangman: Increments wrongGuessesCount on incorrect guess and switches turn', () => {
  const engine = new HangmanEngine();
  let state = engine.initialize(players2, { item: { word: 'FOX', category: 'ANIMALS' } });
  let res = engine.applyAction(state, 'u1', { type: 'GUESS_LETTER', letter: 'Z' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.wrongGuessesCount, 1);
  assert.strictEqual(state.turnPlayerId, 'u2'); // Turn passed to opponent
});

// 10. Memory Card Match
console.log('--- 10. Memory Card Match Engine ---');
test('Memory: Matching cards retains turn and adds score', () => {
  const engine = new MemoryMatchEngine();
  let state = engine.initialize(players2);
  // Find matching card IDs
  const c0 = state.cards[0];
  let matchingCard = state.cards.find((c) => c.id !== c0.id && c.iconName === c0.iconName);
  assert(matchingCard !== undefined);

  let res = engine.applyAction(state, 'u1', { type: 'FLIP_CARD', cardId: c0.id });
  assert.strictEqual(res.success, true);
  state = res.state;

  res = engine.applyAction(state, 'u1', { type: 'FLIP_CARD', cardId: matchingCard.id });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 1);
  assert.strictEqual(state.turnPlayerId, 'u1'); // Retains turn on match
});

// 11. Quiz Battle Arena
console.log('--- 11. Quiz Battle Arena Engine ---');
test('Quiz: Scores correct answers and records choice', () => {
  const engine = new QuizBattleEngine();
  let state = engine.initialize(players2);
  const q0 = state.questions[0];
  let res = engine.applyAction(state, 'u1', { type: 'SELECT_OPTION', optionIndex: q0.correctIndex });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 10);
});

test('Quiz: Rejects duplicate answers for same question', () => {
  const engine = new QuizBattleEngine();
  let state = engine.initialize(players2);
  let res = engine.applyAction(state, 'u1', { type: 'SELECT_OPTION', optionIndex: 0 });
  state = res.state;
  const dup = engine.applyAction(state, 'u1', { type: 'SELECT_OPTION', optionIndex: 1 });
  assert.strictEqual(dup.success, false);
});

// 12. 2048 Versus Race
console.log('--- 12. 2048 Versus Race Engine ---');
test('2048: Shifts tiles and merges identical values', () => {
  const engine = new Game2048Engine();
  let state = engine.initialize(players2);
  // Custom board: row 0 has [2, 2, 0, 0]
  state.playerBoards['u1'] = [
    [2, 2, 0, 0],
    [4, 0, 4, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  let res = engine.applyAction(state, 'u1', { type: 'MOVE', direction: 'LEFT' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.playerBoards['u1'][0][0], 4);
  assert.strictEqual(state.playerBoards['u1'][1][0], 8);
  assert.strictEqual(state.scores['u1'], 12);
});

// 13. Minesweeper Battle
console.log('--- 13. Minesweeper Battle Engine ---');
test('Minesweeper: Safe cell reveal and flagging operate cleanly', () => {
  const engine = new MinesweeperEngine();
  let state = engine.initialize(players2);
  // Find a safe cell
  let safeR = -1, safeC = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!state.grid[r][c].isMine) {
        safeR = r; safeC = c; break;
      }
    }
    if (safeR !== -1) break;
  }

  // Flag cell with u1
  let res = engine.applyAction(state, 'u1', { type: 'FLAG', row: safeR, col: safeC });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.grid[safeR][safeC].isFlagged, true);

  // Turn passed to u2, unflag with u2
  res = engine.applyAction(state, 'u2', { type: 'FLAG', row: safeR, col: safeC });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.grid[safeR][safeC].isFlagged, false);

  // Turn back to u1, reveal safe cell
  res = engine.applyAction(state, 'u1', { type: 'REVEAL', row: safeR, col: safeC });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.grid[safeR][safeC].isRevealed, true);
  assert.strictEqual(state.scores['u1'] >= 1, true);
});

// 14. Pattern Memory Matrix (Simon Says)
console.log('--- 14. Pattern Memory Matrix Engine ---');
test('Pattern Match: Completing sequence advances round', () => {
  const engine = new PatternMatchEngine();
  let state = engine.initialize(players2);
  const pattern = [...state.pattern];
  assert(pattern.length >= 3);

  let res;
  for (let i = 0; i < pattern.length; i++) {
    res = engine.applyAction(state, 'u1', { type: 'PRESS_PAD', index: pattern[i] });
    assert.strictEqual(res.success, true);
    state = res.state;
  }
  assert.strictEqual(state.round, 2);
  assert.strictEqual(state.pattern.length, pattern.length + 1);
});

test('Pattern Match: Wrong pad press transfers victory to opponent', () => {
  const engine = new PatternMatchEngine();
  let state = engine.initialize(players2);
  const wrongPad = (state.pattern[0] + 1) % 9;
  const res = engine.applyAction(state, 'u1', { type: 'PRESS_PAD', index: wrongPad });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.winnerId, 'u2');
});

// 15. Mastermind Code Breaker
console.log('--- 15. Mastermind Code Breaker Engine ---');
test('Mastermind: Accurately counts exact position and color-only matches', () => {
  const engine = new MastermindEngine();
  const state = engine.initialize(players2, { secretCode: ['RED', 'BLUE', 'GREEN', 'YELLOW'] });
  // Guess: ['RED', 'GREEN', 'PURPLE', 'ORANGE'] -> RED is exact, GREEN is color
  const res = engine.applyAction(state, 'u1', {
    type: 'SUBMIT_GUESS',
    colors: ['RED', 'GREEN', 'PURPLE', 'ORANGE']
  });
  assert.strictEqual(res.success, true);
  const lastAttempt = res.state.guesses['u1'][0];
  assert.strictEqual(lastAttempt.exactHits, 1);
  assert.strictEqual(lastAttempt.colorHits, 1);
});

test('Mastermind: Exact code guess triggers victory', () => {
  const engine = new MastermindEngine();
  const state = engine.initialize(players2, { secretCode: ['RED', 'BLUE', 'GREEN', 'YELLOW'] });
  const res = engine.applyAction(state, 'u1', {
    type: 'SUBMIT_GUESS',
    colors: ['RED', 'BLUE', 'GREEN', 'YELLOW']
  });
  assert.strictEqual(res.state.winnerId, 'u1');
});

// 16. Word Scramble Anagrams
console.log('--- 16. Word Scramble Anagrams Engine ---');
test('Word Scramble: Validates unscrambled word and awards victory', () => {
  const engine = new WordScrambleEngine();
  const state = engine.initialize(players2, { word: 'PLANET' });
  assert.strictEqual(state.scrambledWord.length, 6);
  assert.notStrictEqual(state.scrambledWord, 'PLANET');

  const res = engine.applyAction(state, 'u1', { type: 'SUBMIT_WORD', word: 'PLANET' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.winnerId, 'u1');
  assert.strictEqual(res.state.solvedBy, 'u1');
});

test('Word Scramble: Rejects incorrect word guess without victory', () => {
  const engine = new WordScrambleEngine();
  const state = engine.initialize(players2, { word: 'PLANET' });
  const res = engine.applyAction(state, 'u1', { type: 'SUBMIT_WORD', word: 'PLATES' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.winnerId, null);
});

// 17. Typing Race
console.log('--- 17. Typing Race Engine ---');
test('Typing Race: Updates progress character index and calculates WPM', () => {
  const engine = new TypingRaceEngine();
  const promptText = 'The quick brown fox jumps over the lazy dog.';
  const state = engine.initialize(players2, { promptText });
  const partialText = 'The quick brown';
  const res = engine.applyAction(state, 'u1', {
    type: 'TYPE_UPDATE',
    typedText: partialText,
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.state.progress['u1'], partialText.length);
  assert(res.state.wpm['u1'] >= 0);
});

test('Typing Race: Full text submission finishes race', () => {
  const engine = new TypingRaceEngine();
  const promptText = 'Hello world!';
  const state = engine.initialize(players2, { promptText });
  const res = engine.applyAction(state, 'u1', {
    type: 'TYPE_UPDATE',
    typedText: promptText,
  });
  assert.strictEqual(res.state.progress['u1'], promptText.length);
  assert.strictEqual(res.state.winnerId, 'u1');
  assert(res.state.finishedOrder.includes('u1'));
});

// 18. MatchManager Integration for Phase 14 Games
console.log('--- 18. MatchManager Phase 14 Game Integration ---');
const puzzleGames = [
  'ROCK_PAPER_SCISSORS',
  'REACTION_TEST',
  'NUMBER_GUESS',
  'SPEED_TAP',
  'COLOR_MATCH',
  'MATH_BATTLE',
  'QUICK_DRAW',
  'WORDLE_DUEL',
  'HANGMAN',
  'MEMORY_MATCH',
  'QUIZ_BATTLE',
  '2048_MULTIPLAYER',
  'MINESWEEPER_DUEL',
  'PATTERN_MATCH',
  'MASTERMIND',
  'WORD_SCRAMBLE',
  'TYPING_RACE'
];

puzzleGames.forEach((gt) => {
  test(`MatchManager: successfully starts match for ${gt}`, () => {
    const roomCode = `PZ_${gt.substring(0, 4)}_${Date.now() % 10000}`;
    const match = MatchManager.startMatch(roomCode, gt, players2);
    assert(match !== null, `Match failed to start for ${gt}`);
    assert.strictEqual(match.gameType, gt);
    assert.strictEqual(match.players.length, 2);
    assert.strictEqual(match.isConcluded, false);
    MatchManager.clearMatch(roomCode);
  });
});

console.log('\n====================================================');
console.log(`  Tests completed! Passed: ${passedTests}, Failed: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
