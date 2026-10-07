const assert = require('assert');
const { CarromEngine } = require('./dist/server/src/games/board2/carrom.engine');
const { SnakesAndLaddersEngine } = require('./dist/server/src/games/board2/snakesandladders.engine');
const { BattleshipEngine } = require('./dist/server/src/games/board2/battleship.engine');
const { DominoesEngine } = require('./dist/server/src/games/board2/dominoes.engine');
const { BackgammonEngine } = require('./dist/server/src/games/board2/backgammon.engine');
const { MancalaEngine } = require('./dist/server/src/games/board2/mancala.engine');
const { ChineseCheckersEngine } = require('./dist/server/src/games/board2/chinesecheckers.engine');
const { MatchManager } = require('./dist/server/src/games/match.manager');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('🧪 Starting Board Game Expansion II Automated Test Suite (Carrom, Snakes & Ladders, Battleship, Dominoes, Backgammon, Mancala, Chinese Checkers)...\n');

  const p1 = { userId: 'u1', username: 'alice', displayName: 'Alice', slotIndex: 0 };
  const p2 = { userId: 'u2', username: 'bob', displayName: 'Bob', slotIndex: 1 };

  // =========================================================================
  // Game 1: Carrom Board
  // =========================================================================
  console.log('--- Game 1: Carrom Board (CARROM) ---');
  const carromEngine = new CarromEngine();
  it('Carrom engine definition ID matches', () => {
    assert.strictEqual(carromEngine.definition.id, 'CARROM');
  });

  const carromInit = carromEngine.initialize([p1, p2]);
  it('Carrom initializes with 19 pieces (1 Queen, 18 men)', () => {
    assert.strictEqual(carromInit.pieces.length, 19);
    const queen = carromInit.pieces.find((p) => p.type === 'QUEEN');
    assert.ok(queen);
    assert.strictEqual(queen.x, 50);
    assert.strictEqual(queen.y, 50);
  });

  it('Player 1 (White) strikes first', () => {
    assert.strictEqual(carromInit.turnPlayerId, 'u1');
    assert.strictEqual(carromInit.players[0].color, 'WHITE');
  });

  it('Reject out of turn strike', () => {
    assert.throws(() => {
      carromEngine.validateAction(carromInit, 'u2', {
        type: 'STRIKE',
        strikerX: 50,
        angle: 0,
        power: 50,
      });
    }, /Not your turn/);
  });

  const carromShot1 = carromEngine.applyAction(carromInit, 'u1', {
    type: 'STRIKE',
    strikerX: 50,
    angle: 0,
    power: 70,
    targetPieceId: 'inner-white-0',
  });

  it('Pocketing white carrom man awards points and retains turn', () => {
    assert.strictEqual(carromShot1.state.players[0].score, 10);
    assert.strictEqual(carromShot1.state.players[0].pocketedCount, 1);
    assert.strictEqual(carromShot1.state.turnPlayerId, 'u1'); // Retain turn
  });

  const carromShot2 = carromEngine.applyAction(carromShot1.state, 'u1', {
    type: 'STRIKE',
    strikerX: 50,
    angle: 0,
    power: 80,
    targetPieceId: 'queen',
  });

  it('Pocketing Queen sets queenCoverPending flag', () => {
    assert.strictEqual(carromShot2.state.queenCoverPending, true);
    assert.strictEqual(carromShot2.state.queenPocketedBy, 'u1');
  });

  const carromShot3 = carromEngine.applyAction(carromShot2.state, 'u1', {
    type: 'STRIKE',
    strikerX: 50,
    angle: 0,
    power: 80,
    targetPieceId: 'inner-white-2',
  });

  it('Covering Queen awards 25 bonus Queen points', () => {
    // 10 (first man) + 10 (second man) + 25 (Queen cover) = 45 points
    assert.strictEqual(carromShot3.state.players[0].score, 45);
    assert.strictEqual(carromShot3.state.queenCoverPending, false);
    assert.strictEqual(carromShot3.state.winnerId, 'u1'); // Wins by passing 25 points
  });

  // =========================================================================
  // Game 2: Snakes & Ladders
  // =========================================================================
  console.log('\n--- Game 2: Snakes & Ladders (SNAKES_AND_LADDERS) ---');
  const snakesEngine = new SnakesAndLaddersEngine();
  it('Snakes & Ladders engine definition ID matches', () => {
    assert.strictEqual(snakesEngine.definition.id, 'SNAKES_AND_LADDERS');
  });

  const snakesInit = snakesEngine.initialize([p1, p2]);
  it('Players start at position 1', () => {
    assert.strictEqual(snakesInit.players[0].position, 1);
    assert.strictEqual(snakesInit.players[1].position, 1);
    assert.strictEqual(snakesInit.turnPlayerId, 'u1');
  });

  it('Reject out of turn dice roll', () => {
    assert.throws(() => {
      snakesEngine.validateAction(snakesInit, 'u2', { type: 'ROLL_DICE' });
    }, /Not your turn/);
  });

  const snakesRoll1 = snakesEngine.applyAction(snakesInit, 'u1', { type: 'ROLL_DICE' });
  it('Dice roll produces integer between 1 and 6', () => {
    assert.ok(snakesRoll1.state.currentDiceRoll >= 1 && snakesRoll1.state.currentDiceRoll <= 6);
    assert.strictEqual(
      snakesRoll1.state.players[0].position,
      1 + snakesRoll1.state.currentDiceRoll
    );
  });

  it('Ladder boosts position upward', () => {
    // Test ladder explicitly: square 4 jumps to 14
    const stateAtLadder = {
      ...snakesInit,
      players: [{ userId: 'u1', position: 3 }, { userId: 'u2', position: 1 }],
      turnPlayerId: 'u1',
    };
    // If player rolls 1, 3 + 1 = 4, climbs to 14
    const ladderStep = 4;
    assert.strictEqual(require('./dist/server/src/games/board2/snakesandladders.engine').LADDERS[ladderStep], 14);
  });

  it('Snake slides position downward', () => {
    // Square 17 slides to 7
    const snakeHead = 17;
    assert.strictEqual(require('./dist/server/src/games/board2/snakesandladders.engine').SNAKES[snakeHead], 7);
  });

  // =========================================================================
  // Game 3: Battleship Fleet Command
  // =========================================================================
  console.log('\n--- Game 3: Battleship Fleet Command (BATTLESHIP) ---');
  const battleEngine = new BattleshipEngine();
  it('Battleship engine definition ID matches', () => {
    assert.strictEqual(battleEngine.definition.id, 'BATTLESHIP');
  });

  const battleInit = battleEngine.initialize([p1, p2]);
  it('Battleship initializes with 2 players and default fleet of 5 ships each', () => {
    assert.strictEqual(battleInit.players['u1'].ships.length, 5);
    assert.strictEqual(battleInit.players['u2'].ships.length, 5);
    assert.strictEqual(battleInit.stage, 'BATTLE');
  });

  it('Fire at empty water records MISS', () => {
    // Water at (0, 0) is empty
    const res = battleEngine.applyAction(battleInit, 'u1', { type: 'FIRE', row: 0, col: 0 });
    assert.strictEqual(res.state.lastShot.result, 'MISS');
    assert.strictEqual(res.state.turnPlayerId, 'u2');
  });

  it('Reject duplicate target coordinates', () => {
    const afterMiss = battleEngine.applyAction(battleInit, 'u1', { type: 'FIRE', row: 0, col: 0 });
    // u2's turn, now let's say u2 fires at (0, 1)
    const afterU2 = battleEngine.applyAction(afterMiss.state, 'u2', { type: 'FIRE', row: 0, col: 1 });
    // Now u1 tries firing at (0, 0) again
    assert.throws(() => {
      battleEngine.validateAction(afterU2.state, 'u1', { type: 'FIRE', row: 0, col: 0 });
    }, /already targeted/);
  });

  it('Fire landing on Carrier (row 1, col 1) records HIT', () => {
    const res = battleEngine.applyAction(battleInit, 'u1', { type: 'FIRE', row: 1, col: 1 });
    assert.strictEqual(res.state.lastShot.result, 'HIT');
    const u2Carrier = res.state.players['u2'].ships.find((s) => s.type === 'CARRIER');
    assert.strictEqual(u2Carrier.hits, 1);
  });

  // =========================================================================
  // Game 4: Dominoes Duel
  // =========================================================================
  console.log('\n--- Game 4: Dominoes Duel (DOMINOES) ---');
  const domEngine = new DominoesEngine();
  it('Dominoes engine definition ID matches', () => {
    assert.strictEqual(domEngine.definition.id, 'DOMINOES');
  });

  const domInit = domEngine.initialize([p1, p2]);
  it('Dominoes initializes 7 tiles per hand, opening tile on board, and boneyard', () => {
    assert.strictEqual(domInit.boardChain.length, 1);
    assert.strictEqual(domInit.playerHands['u1'].length, 6); // 1 played as opening tile
    assert.strictEqual(domInit.playerHands['u2'].length, 7);
    assert.strictEqual(domInit.boneyard.length, 14);
  });

  it('Playing matching tile updates openEnds and boardChain', () => {
    const openLeft = domInit.openEnds[0];
    const openRight = domInit.openEnds[1];
    // Find matching tile in u2's hand
    const hand2 = domInit.playerHands['u2'];
    const matchingTile = hand2.find(
      (t) => t[0] === openLeft || t[1] === openLeft || t[0] === openRight || t[1] === openRight
    );

    if (matchingTile) {
      const end = matchingTile[0] === openLeft || matchingTile[1] === openLeft ? 'LEFT' : 'RIGHT';
      const playRes = domEngine.applyAction(domInit, 'u2', {
        type: 'PLAY_TILE',
        tile: matchingTile,
        end,
      });
      assert.strictEqual(playRes.state.boardChain.length, 2);
      assert.strictEqual(playRes.state.playerHands['u2'].length, 6);
      assert.strictEqual(playRes.state.turnPlayerId, 'u1');
    } else {
      // If no matching tile, drawing tile increases hand length
      const drawRes = domEngine.applyAction(domInit, 'u2', { type: 'DRAW_TILE' });
      assert.strictEqual(drawRes.state.playerHands['u2'].length, 8);
    }
  });

  // =========================================================================
  // Game 5: Backgammon
  // =========================================================================
  console.log('\n--- Game 5: Backgammon (BACKGAMMON) ---');
  const bgEngine = new BackgammonEngine();
  it('Backgammon engine definition ID matches', () => {
    assert.strictEqual(bgEngine.definition.id, 'BACKGAMMON');
  });

  const bgInit = bgEngine.initialize([p1, p2]);
  it('Backgammon initializes 24 points with 15 checkers per player', () => {
    assert.strictEqual(bgInit.points.length, 24);
    const totalWhite = bgInit.points.reduce((sum, pt) => sum + pt.white, 0);
    const totalBlack = bgInit.points.reduce((sum, pt) => sum + pt.black, 0);
    assert.strictEqual(totalWhite, 15);
    assert.strictEqual(totalBlack, 15);
  });

  it('White (Player 1) moves first with active dice', () => {
    assert.strictEqual(bgInit.turnColor, 'WHITE');
    assert.strictEqual(bgInit.turnPlayerId, 'u1');
    assert.ok(bgInit.diceRemaining.length > 0);
  });

  it('Executing legal checker move shifts piece and consumes die', () => {
    const die = bgInit.diceRemaining[0];
    // Move 1 checker from point 23 to 23 - die
    const moveRes = bgEngine.applyAction(bgInit, 'u1', {
      type: 'MOVE_CHECKER',
      from: 23,
      die,
    });
    assert.strictEqual(moveRes.state.points[23].white, 1);
    assert.strictEqual(moveRes.state.points[23 - die].white, 1);
    assert.strictEqual(moveRes.state.diceRemaining.length, bgInit.diceRemaining.length - 1);
  });

  // =========================================================================
  // Game 6: Mancala (Kalah)
  // =========================================================================
  console.log('\n--- Game 6: Mancala Kalah (MANCALA) ---');
  const mancalaEngine = new MancalaEngine();
  it('Mancala engine definition ID matches', () => {
    assert.strictEqual(mancalaEngine.definition.id, 'MANCALA');
  });

  const mancalaInit = mancalaEngine.initialize([p1, p2]);
  it('Mancala initializes 4 stones in each pit (0..5 and 7..12) and 0 in stores', () => {
    assert.strictEqual(mancalaInit.board[0], 4);
    assert.strictEqual(mancalaInit.board[5], 4);
    assert.strictEqual(mancalaInit.board[6], 0); // P1 store
    assert.strictEqual(mancalaInit.board[7], 4);
    assert.strictEqual(mancalaInit.board[12], 4);
    assert.strictEqual(mancalaInit.board[13], 0); // P2 store
  });

  it('Reject Player 1 sowing from opponent pit 7', () => {
    assert.throws(() => {
      mancalaEngine.validateAction(mancalaInit, 'u1', { type: 'SOW_PIT', pitIndex: 7 });
    }, /must select pits 0..5/);
  });

  it('Sowing pit 2 (4 stones) drops last stone in own store (pit 6) awarding free turn', () => {
    // Pit 2 has 4 stones. Sows into 3, 4, 5, 6 (own store)!
    const sowRes = mancalaEngine.applyAction(mancalaInit, 'u1', { type: 'SOW_PIT', pitIndex: 2 });
    assert.strictEqual(sowRes.state.board[2], 0);
    assert.strictEqual(sowRes.state.board[6], 1); // 1 stone in store
    assert.strictEqual(sowRes.state.freeTurnAwarded, true);
    assert.strictEqual(sowRes.state.turnPlayerId, 'u1'); // Free turn awarded!
  });

  // =========================================================================
  // Game 7: Chinese Checkers
  // =========================================================================
  console.log('\n--- Game 7: Chinese Checkers (CHINESE_CHECKERS) ---');
  const ccEngine = new ChineseCheckersEngine();
  it('Chinese Checkers engine definition ID matches', () => {
    assert.strictEqual(ccEngine.definition.id, 'CHINESE_CHECKERS');
  });

  const ccInit = ccEngine.initialize([p1, p2]);
  it('Chinese Checkers initializes 10 Red marbles and 10 Blue marbles', () => {
    const redMarbles = ccInit.marbles.filter((m) => m.color === 'RED');
    const blueMarbles = ccInit.marbles.filter((m) => m.color === 'BLUE');
    assert.strictEqual(redMarbles.length, 10);
    assert.strictEqual(blueMarbles.length, 10);
  });

  it('Player 1 (Red) executes single step move', () => {
    // Red marble at [3, 4] steps to [4, 4]
    const marble = ccInit.marbles.find((m) => m.coord[0] === 3 && m.coord[1] === 4);
    assert.ok(marble);
    const stepRes = ccEngine.applyAction(ccInit, 'u1', {
      type: 'MOVE_MARBLE',
      marbleId: marble.id,
      to: [4, 4],
    });
    const moved = stepRes.state.marbles.find((m) => m.id === marble.id);
    assert.deepStrictEqual(moved.coord, [4, 4]);
    assert.strictEqual(stepRes.state.turnPlayerId, 'u2');
  });

  // =========================================================================
  // Scenario 8: MatchManager Integration for Phase 11 Games
  // =========================================================================
  console.log('\n--- Scenario 8: Real-Time MatchManager End-to-End ---');
  const hostPlayer = { userId: 'host-1', username: 'host', displayName: 'Host', slotIndex: 0 };
  const peerPlayer = { userId: 'peer-2', username: 'peer', displayName: 'Peer', slotIndex: 1 };

  const carromMatch = MatchManager.startMatch('ROOM-CR', 'CARROM', [hostPlayer, peerPlayer]);
  it('Host launches Carrom match in MatchManager', () => {
    assert.ok(carromMatch);
    assert.strictEqual(carromMatch.gameType, 'CARROM');
  });

  const snakesMatch = MatchManager.startMatch('ROOM-SN', 'SNAKES_AND_LADDERS', [hostPlayer, peerPlayer]);
  it('Host launches Snakes & Ladders match in MatchManager', () => {
    assert.ok(snakesMatch);
    assert.strictEqual(snakesMatch.gameType, 'SNAKES_AND_LADDERS');
  });

  const battleMatch = MatchManager.startMatch('ROOM-BS', 'BATTLESHIP', [hostPlayer, peerPlayer]);
  it('Host launches Battleship match in MatchManager', () => {
    assert.ok(battleMatch);
    assert.strictEqual(battleMatch.gameType, 'BATTLESHIP');
  });

  const mancalaMatch = MatchManager.startMatch('ROOM-MC', 'MANCALA', [hostPlayer, peerPlayer]);
  it('Host launches Mancala match in MatchManager', () => {
    assert.ok(mancalaMatch);
    assert.strictEqual(mancalaMatch.gameType, 'MANCALA');
  });

  console.log('\n======================================================');
  console.log(`Board Game Expansion II Test Results: ${passCount} Passed, ${failCount} Failed`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
