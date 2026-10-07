// server/test-party-games.js
// Automated verification suite for Phase 15: Party & Social Games (Category F)

const assert = require('assert');
const {
  WouldYouRatherEngine,
  TruthOrDareEngine,
  CharadesEngine,
  GuessPictureEngine,
  GuessWordEngine,
  GuessSongEngine,
  WhoAmIEngine,
  ImposterEngine,
  MafiaEngine,
  DrawAndGuessEngine,
  PictionaryEngine,
  NeverHaveIEverEngine,
  ThisOrThatEngine,
  TwoTruthsAndALieEngine,
} = require('./dist/server/src/games/party');
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
const p3 = { userId: 'u3', username: 'Charlie', displayName: 'Charlie', slotIndex: 2 };
const p4 = { userId: 'u4', username: 'Diana', displayName: 'Diana', slotIndex: 3 };

const players2 = [p1, p2];
const players4 = [p1, p2, p3, p4];

console.log('====================================================');
console.log('  Running Phase 15: Party & Social Games Test Suite');
console.log('====================================================\n');

// 1. Would You Rather?
console.log('--- 1. Would You Rather? (WOULD_YOU_RATHER) ---');
test('WYR: Initializes state with players and initial dilemma', () => {
  const engine = new WouldYouRatherEngine();
  const state = engine.initialize(players2, { totalRounds: 3 });
  assert.strictEqual(state.players.length, 2);
  assert.strictEqual(state.currentRound, 1);
  assert.strictEqual(state.totalRounds, 3);
  assert.ok(state.currentDilemma.optionA);
  assert.ok(state.currentDilemma.optionB);
  assert.strictEqual(state.votes['u1'], null);
  assert.strictEqual(state.votes['u2'], null);
  assert.strictEqual(state.winnerId, null);
});

test('WYR: Records votes and advances round when all voted', () => {
  const engine = new WouldYouRatherEngine();
  let state = engine.initialize(players2, { totalRounds: 3 });

  // Alice votes A
  const res1 = engine.applyAction(state, 'u1', { type: 'VOTE', choice: 'A' });
  assert.strictEqual(res1.success, true);
  state = res1.state;
  assert.strictEqual(state.votes['u1'], 'A');
  assert.strictEqual(state.votes['u2'], null);
  assert.strictEqual(state.currentRound, 1);

  // Bob votes A -> majority consensus bonus!
  const res2 = engine.applyAction(state, 'u2', { type: 'VOTE', choice: 'A' });
  assert.strictEqual(res2.success, true);
  state = res2.state;
  assert.strictEqual(state.currentRound, 2);
  assert.strictEqual(state.scores['u1'], 10);
  assert.strictEqual(state.scores['u2'], 10);
});

test('WYR: Concludes after totalRounds with winner determination', () => {
  const engine = new WouldYouRatherEngine();
  let state = engine.initialize(players2, { totalRounds: 1 });

  engine.applyAction(state, 'u1', { type: 'VOTE', choice: 'A' });
  state.votes['u1'] = 'A';
  const res = engine.applyAction(state, 'u2', { type: 'VOTE', choice: 'A' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.ok(state.winnerId !== null);
  const win = engine.checkWinner(state);
  assert.ok(win !== null);
});

// 2. Truth or Dare Social
console.log('\n--- 2. Truth or Dare Social (TRUTH_OR_DARE) ---');
test('TOD: Turn player chooses category and receives prompt', () => {
  const engine = new TruthOrDareEngine();
  let state = engine.initialize(players2);
  assert.strictEqual(state.turnPlayerId, 'u1');
  assert.strictEqual(state.selectedType, null);

  const res = engine.applyAction(state, 'u1', { type: 'CHOOSE_CATEGORY', category: 'TRUTH' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.selectedType, 'TRUTH');
  assert.ok(state.currentPrompt.length > 5);
});

test('TOD: Verifies completion and awards points', () => {
  const engine = new TruthOrDareEngine();
  let state = engine.initialize(players2);
  state = engine.applyAction(state, 'u1', { type: 'CHOOSE_CATEGORY', category: 'DARE' }).state;

  const res = engine.applyAction(state, 'u1', { type: 'VERIFY_COMPLETION', completed: true });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 20);
  assert.strictEqual(state.turnPlayerId, 'u2');
});

// 3. Charades Party
console.log('\n--- 3. Charades Party (CHARADES) ---');
test('CHARADES: Non-actor guesses correctly and awards points', () => {
  const engine = new CharadesEngine();
  let state = engine.initialize(players2, { word: { word: 'Moonwalk', category: 'Dance' } });
  assert.strictEqual(state.actorId, 'u1');
  assert.strictEqual(state.secretWord, 'Moonwalk');

  // Wrong guess
  const res1 = engine.applyAction(state, 'u2', { type: 'GUESS', guess: 'Singing' });
  assert.strictEqual(res1.success, true);
  state = res1.state;
  assert.strictEqual(state.isSolved, false);

  // Correct guess
  const res2 = engine.applyAction(state, 'u2', { type: 'GUESS', guess: 'Moonwalk' });
  assert.strictEqual(res2.success, true);
  state = res2.state;
  assert.strictEqual(state.scores['u2'], 15);
  assert.strictEqual(state.scores['u1'], 10);
  assert.strictEqual(state.actorId, 'u2');
});

test('CHARADES: Actor can confirm solve', () => {
  const engine = new CharadesEngine();
  let state = engine.initialize(players2);
  const res = engine.applyAction(state, 'u1', { type: 'CONFIRM_SOLVE' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.scores['u1'], 10);
});

// 4. Pixel Reveal Guess
console.log('\n--- 4. Pixel Reveal Guess (GUESS_PICTURE) ---');
test('GUESS_PICTURE: Incorrect guess degrades pixelation level', () => {
  const engine = new GuessPictureEngine();
  let state = engine.initialize(players2, { item: { targetWord: 'Guitar', category: 'Music', clueHint: 'Strings' } });
  assert.strictEqual(state.pixelationLevel, 10);

  const res = engine.applyAction(state, 'u1', { type: 'SUBMIT_GUESS', guess: 'Piano' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.pixelationLevel, 9);
});

test('GUESS_PICTURE: Correct guess awards score scaled by pixelation', () => {
  const engine = new GuessPictureEngine();
  let state = engine.initialize(players2, { item: { targetWord: 'Guitar', category: 'Music', clueHint: 'Strings' } });

  const res = engine.applyAction(state, 'u2', { type: 'SUBMIT_GUESS', guess: 'guitar' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.solvedPlayerId, 'u2');
  assert.strictEqual(state.winnerId, 'u2');
  assert.strictEqual(state.scores['u2'], 100);
});

// 5. Taboo Word Clue
console.log('\n--- 5. Taboo Word Clue (GUESS_WORD) ---');
test('GUESS_WORD: Penalizes clue giver when taboo word is spoken', () => {
  const engine = new GuessWordEngine();
  let state = engine.initialize(players2, {
    card: { targetWord: 'Coffee', tabooWords: ['Tea', 'Morning', 'Cup', 'Caffeine'] },
  });

  // Clue contains taboo word 'Morning'
  const res = engine.applyAction(state, 'u1', { type: 'GIVE_CLUE', clue: 'Hot morning drink' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.penaltyCount, 1);
  assert.strictEqual(state.scores['u1'], -5);
});

test('GUESS_WORD: Correct guess resolves word and awards points', () => {
  const engine = new GuessWordEngine();
  let state = engine.initialize(players2, {
    card: { targetWord: 'Coffee', tabooWords: ['Tea', 'Morning', 'Cup'] },
  });

  engine.applyAction(state, 'u1', { type: 'GIVE_CLUE', clue: 'Dark roasted beverage' });
  const res = engine.applyAction(state, 'u2', { type: 'SUBMIT_GUESS', guess: 'coffee' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.isGuessed, true);
  assert.strictEqual(state.scores['u2'], 20);
  assert.strictEqual(state.scores['u1'], 10);
});

// 6. Name That Tune
console.log('\n--- 6. Name That Tune (GUESS_SONG) ---');
test('GUESS_SONG: Submits answer and advances when all answered', () => {
  const engine = new GuessSongEngine();
  const sampleRiddle = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    snippetLyrics: 'Is this the real life?',
    options: ['Bohemian Rhapsody', 'Somebody to Love', 'Radio Ga Ga', 'We Are The Champions'],
  };
  let state = engine.initialize(players2, { riddle: sampleRiddle });

  engine.applyAction(state, 'u1', { type: 'ANSWER_SONG', selectedTitle: 'Bohemian Rhapsody' });
  state.answers['u1'] = 'Bohemian Rhapsody';
  state.scores['u1'] = 15;

  const res = engine.applyAction(state, 'u2', { type: 'ANSWER_SONG', selectedTitle: 'Somebody to Love' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.round, 2);
  assert.strictEqual(state.scores['u1'], 15);
  assert.strictEqual(state.scores['u2'], 0);
});

// 7. Who Am I?
console.log('\n--- 7. Who Am I? (WHO_AM_I) ---');
test('WHO_AM_I: Player asks question and other player responds', () => {
  const engine = new WhoAmIEngine();
  let state = engine.initialize(players2);

  const res1 = engine.applyAction(state, 'u1', { type: 'ASK_QUESTION', question: 'Am I a scientist?' });
  assert.strictEqual(res1.success, true);
  state = res1.state;
  assert.strictEqual(state.questionHistory.length, 1);

  const res2 = engine.applyAction(state, 'u2', { type: 'ANSWER_QUESTION', yes: true });
  assert.strictEqual(res2.success, true);
  state = res2.state;
  assert.strictEqual(state.turnPlayerId, 'u2');
});

test('WHO_AM_I: Correct identity guess marks solved', () => {
  const engine = new WhoAmIEngine();
  let state = engine.initialize(players2);
  const secret = state.targetIdentity['u1'];

  const res = engine.applyAction(state, 'u1', { type: 'GUESS_IDENTITY', identity: secret });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.solved['u1'], true);
  assert.strictEqual(state.scores['u1'], 30);
});

// 8. The Imposter
console.log('\n--- 8. The Imposter (IMPOSTER) ---');
test('IMPOSTER: Clue submission and voting caught imposter', () => {
  const engine = new ImposterEngine();
  let state = engine.initialize(players4, { imposterId: 'u4', location: 'Grand Casino' });
  assert.strictEqual(state.phase, 'DISCUSSION');
  assert.strictEqual(state.imposterId, 'u4');

  // Submit clues
  for (const p of players4) {
    state = engine.applyAction(state, p.userId, { type: 'SUBMIT_CLUE', clue: 'There are chips here' }).state;
  }
  assert.strictEqual(state.phase, 'VOTING');

  // Everyone votes for u4
  for (let i = 0; i < 3; i++) {
    state = engine.applyAction(state, players4[i].userId, { type: 'VOTE_IMPOSTER', targetUserId: 'u4' }).state;
  }
  const res = engine.applyAction(state, 'u4', { type: 'VOTE_IMPOSTER', targetUserId: 'u1' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.phase, 'REVEAL');
  assert.strictEqual(state.accusedId, 'u4');
  const win = engine.checkWinner(state);
  assert.strictEqual(win.imposterWon, false);
});

test('IMPOSTER: Imposter can guess location and win', () => {
  const engine = new ImposterEngine();
  let state = engine.initialize(players4, { imposterId: 'u4', location: 'Grand Casino' });

  const res = engine.applyAction(state, 'u4', { type: 'GUESS_LOCATION', location: 'Grand Casino' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.winnerId, 'u4');
  const win = engine.checkWinner(state);
  assert.strictEqual(win.imposterWon, true);
});

// 9. Mafia / Werewolf
console.log('\n--- 9. Mafia / Werewolf (MAFIA) ---');
test('MAFIA: Night kill and doctor save scenario', () => {
  const engine = new MafiaEngine();
  let state = engine.initialize(players4, {
    roles: { u1: 'MAFIA', u2: 'DETECTIVE', u3: 'DOCTOR', u4: 'VILLAGER' },
  });
  assert.strictEqual(state.phase, 'NIGHT');

  // Doctor saves u4
  state = engine.applyAction(state, 'u3', { type: 'DOCTOR_SAVE', targetUserId: 'u4' }).state;
  // Mafia attempts to kill u4 (Doctor saved him!)
  const res = engine.applyAction(state, 'u1', { type: 'MAFIA_KILL', targetUserId: 'u4' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.eliminatedLastNight, null); // Saved!
  assert.strictEqual(state.alivePlayers.length, 4);
  assert.strictEqual(state.phase, 'DAY_VOTING');
});

test('MAFIA: Day voting lynches Mafia and Villagers win', () => {
  const engine = new MafiaEngine();
  let state = engine.initialize(players4, {
    roles: { u1: 'MAFIA', u2: 'DETECTIVE', u3: 'DOCTOR', u4: 'VILLAGER' },
  });
  state.phase = 'DAY_VOTING';

  // All villagers vote u1 (Mafia)
  state = engine.applyAction(state, 'u2', { type: 'DAY_VOTE', targetUserId: 'u1' }).state;
  state = engine.applyAction(state, 'u3', { type: 'DAY_VOTE', targetUserId: 'u1' }).state;
  state = engine.applyAction(state, 'u4', { type: 'DAY_VOTE', targetUserId: 'u1' }).state;
  const res = engine.applyAction(state, 'u1', { type: 'DAY_VOTE', targetUserId: 'u2' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.winnerSide, 'VILLAGERS');
  const win = engine.checkWinner(state);
  assert.strictEqual(win.winnerSide, 'VILLAGERS');
});

// 10. Draw & Guess Live
console.log('\n--- 10. Draw & Guess Live (DRAW_AND_GUESS) ---');
test('DRAW_AND_GUESS: Drawer draws strokes and guesser solves', () => {
  const engine = new DrawAndGuessEngine();
  let state = engine.initialize(players2, { prompt: 'Castle' });
  assert.strictEqual(state.drawerId, 'u1');

  // Drawer draws stroke
  const res1 = engine.applyAction(state, 'u1', {
    type: 'DRAW_STROKE',
    point: { x: 50, y: 50, color: '#FF0000', width: 4 },
  });
  assert.strictEqual(res1.success, true);
  state = res1.state;
  assert.strictEqual(state.strokes.length, 1);

  // Guesser solves
  const res2 = engine.applyAction(state, 'u2', { type: 'SUBMIT_GUESS', guess: 'Castle' });
  assert.strictEqual(res2.success, true);
  state = res2.state;
  assert.strictEqual(state.scores['u2'], 20);
  assert.strictEqual(state.scores['u1'], 10);
});

// 11. Pictionary Duel
console.log('\n--- 11. Pictionary Duel (PICTIONARY) ---');
test('PICTIONARY: Drawing strokes and solving prompt', () => {
  const engine = new PictionaryEngine();
  let state = engine.initialize(players2, { word: { targetWord: 'Bicycle', category: 'Vehicles' } });
  assert.strictEqual(state.drawerId, 'u1');

  engine.applyAction(state, 'u1', {
    type: 'DRAW_STROKE',
    point: { x: 10, y: 10, color: '#000000', width: 2 },
  });

  const res = engine.applyAction(state, 'u2', { type: 'SUBMIT_GUESS', guess: 'Bicycle' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.isSolved, true);
  assert.strictEqual(state.winnerId, 'u2');
  const win = engine.checkWinner(state);
  assert.strictEqual(win.winnerId, 'u2');
});

// 12. Never Have I Ever
console.log('\n--- 12. Never Have I Ever (NEVER_HAVE_I_EVER) ---');
test('NEVER_HAVE_I_EVER: Confessions reduce lives for affirmative answers', () => {
  const engine = new NeverHaveIEverEngine();
  let state = engine.initialize(players2);
  assert.strictEqual(state.lives['u1'], 10);
  assert.strictEqual(state.lives['u2'], 10);

  // u1 did it -> loses 1 life
  state = engine.applyAction(state, 'u1', { type: 'CONFESS', iHaveDoneThis: true }).state;
  assert.strictEqual(state.lives['u1'], 9);

  // u2 did not do it -> lives stay 10
  const res = engine.applyAction(state, 'u2', { type: 'CONFESS', iHaveDoneThis: false });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.lives['u2'], 10);
  assert.strictEqual(state.round, 2);
});

// 13. This or That
console.log('\n--- 13. This or That (THIS_OR_THAT) ---');
test('THIS_OR_THAT: Both choose same option gaining match score', () => {
  const engine = new ThisOrThatEngine();
  let state = engine.initialize(players2);

  state = engine.applyAction(state, 'u1', { type: 'CHOOSE', choice: 'A' }).state;
  const res = engine.applyAction(state, 'u2', { type: 'CHOOSE', choice: 'A' });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.matchScores['u1'], 1);
  assert.strictEqual(state.matchScores['u2'], 1);
  assert.strictEqual(state.round, 2);
});

// 14. 2 Truths and a Lie
console.log('\n--- 14. 2 Truths and a Lie (TWO_TRUTHS_AND_A_LIE) ---');
test('TWO_TRUTHS_AND_A_LIE: Speaker submits custom statements and friends vote', () => {
  const engine = new TwoTruthsAndALieEngine();
  let state = engine.initialize(players2);
  assert.strictEqual(state.speakerId, 'u1');

  // Speaker submits custom statements (statement index 2 is the lie)
  state = engine.applyAction(state, 'u1', {
    type: 'SUBMIT_STATEMENTS',
    statements: ['I like apples', 'I have a cat', 'I have traveled to Mars'],
    lieIndex: 2,
  }).state;
  assert.strictEqual(state.lieIndex, 2);

  // u2 votes for statement 2 (correct lie)
  const res = engine.applyAction(state, 'u2', { type: 'VOTE_LIE', statementIndex: 2 });
  assert.strictEqual(res.success, true);
  state = res.state;
  assert.strictEqual(state.isRevealed, true);
  assert.strictEqual(state.scores['u2'], 15);
  const win = engine.checkWinner(state);
  assert.ok(win !== null);
});

// 15. MatchManager Integration for all 14 games
console.log('\n--- 15. MatchManager StartMatch for All 14 Party Games ---');
const partyGames = [
  'WOULD_YOU_RATHER',
  'TRUTH_OR_DARE',
  'CHARADES',
  'GUESS_PICTURE',
  'GUESS_WORD',
  'GUESS_SONG',
  'WHO_AM_I',
  'IMPOSTER',
  'MAFIA',
  'DRAW_AND_GUESS',
  'PICTIONARY',
  'NEVER_HAVE_I_EVER',
  'THIS_OR_THAT',
  'TWO_TRUTHS_AND_A_LIE',
];

partyGames.forEach((gt) => {
  test(`MatchManager starts match successfully for ${gt}`, () => {
    const roomCode = `RM_${gt.substring(0, 4)}`;
    const match = MatchManager.startMatch(roomCode, gt, players4);
    assert.ok(match, 'Match should be created');
    assert.strictEqual(match.gameType, gt);
    assert.strictEqual(match.players.length, 4);
    assert.strictEqual(match.isConcluded, false);
    assert.ok(match.engine, 'Engine must be attached');
    assert.ok(match.state, 'Initial state must exist');

    // Clean up
    MatchManager.clearMatch(roomCode);
  });
});

console.log('\n====================================================');
console.log(`  Tests Passed: ${passedTests}`);
console.log(`  Tests Failed: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
