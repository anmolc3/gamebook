const assert = require('assert');
const { Pool8BallEngine } = require('./dist/server/src/games/casual/pool8ball.engine');
const { MiniGolfEngine } = require('./dist/server/src/games/casual/minigolf.engine');
const { AirHockeyEngine } = require('./dist/server/src/games/casual/airhockey.engine');
const { DartsEngine } = require('./dist/server/src/games/casual/darts.engine');
const { BowlingEngine } = require('./dist/server/src/games/casual/bowling.engine');
const { TableTennisEngine } = require('./dist/server/src/games/casual/tabletennis.engine');
const { MatchManager } = require('./dist/server/src/games/match.manager');

let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(err);
    failedTests++;
  }
}

async function runTests() {
  console.log('🧪 Starting Casual & Arcade Games Automated Test Suite (Pool, Golf, Air Hockey, Darts, Bowling, Table Tennis)...\n');

  const p1 = { userId: 'u1', username: 'player1', displayName: 'Player One', slotIndex: 0 };
  const p2 = { userId: 'u2', username: 'player2', displayName: 'Player Two', slotIndex: 1 };

  // --------------------------------------------------------------------------
  // Game 1: 8 Ball Pool Arena
  // --------------------------------------------------------------------------
  console.log('--- Game 1: 8 Ball Pool Arena (POOL_8_BALL) ---');
  const poolEngine = new Pool8BallEngine();
  it('Pool engine definition ID matches', () => {
    assert.strictEqual(poolEngine.definition.id, 'POOL_8_BALL');
  });

  const poolInit = poolEngine.initialize([p1, p2]);
  it('Pool initializes with 16 balls (0 cue, 1..15 object balls)', () => {
    assert.strictEqual(poolInit.balls.length, 16);
    const cue = poolInit.balls.find((b) => b.id === 0);
    assert.ok(cue);
    assert.strictEqual(cue.type, 'CUE');
    assert.strictEqual(cue.x, 250);
  });

  it('Reject shot from non-turn player', () => {
    assert.strictEqual(
      poolEngine.validateAction(poolInit, 'u2', { type: 'STRIKE', power: 50, angle: 0 }),
      false
    );
  });

  // Shoot and pocket solid ball 1
  const poolShot1 = poolEngine.applyAction(poolInit, 'u1', {
    type: 'STRIKE',
    power: 70,
    angle: 0,
    simulatedPocketed: [1],
  });
  it('Pocketing solid ball assigns SOLIDS to shooter and STRIPES to opponent', () => {
    assert.strictEqual(poolShot1.success, true);
    assert.strictEqual(poolShot1.state.players[0].suit, 'SOLIDS');
    assert.strictEqual(poolShot1.state.players[1].suit, 'STRIPES');
    assert.strictEqual(poolShot1.state.players[0].pocketedCount, 1);
    assert.strictEqual(poolShot1.state.turnPlayerId, 'u1'); // Retains turn
  });

  // Scratch shot (pocketing cue ball 0)
  const poolScratch = poolEngine.applyAction(poolShot1.state, 'u1', {
    type: 'STRIKE',
    power: 80,
    angle: 45,
    simulatedPocketed: [0],
  });
  it('Pocketing cue ball registers scratch foul and gives ball-in-hand to opponent', () => {
    assert.strictEqual(poolScratch.success, true);
    assert.strictEqual(poolScratch.state.lastShotFoul, 'SCRATCH');
    assert.strictEqual(poolScratch.state.ballInHand, true);
    assert.strictEqual(poolScratch.state.turnPlayerId, 'u2');
  });

  // Early 8-ball foul
  const poolEarly8 = poolEngine.applyAction(poolInit, 'u1', {
    type: 'STRIKE',
    power: 50,
    angle: 0,
    simulatedPocketed: [8],
  });
  it('Pocketing 8-ball before clearing suit causes early 8-ball foul and opponent victory', () => {
    assert.strictEqual(poolEarly8.success, true);
    assert.strictEqual(poolEarly8.state.winnerId, 'u2');
    const winResult = poolEngine.checkWinner(poolEarly8.state);
    assert.ok(winResult);
    assert.strictEqual(winResult.winnerId, 'u2');
  });

  // --------------------------------------------------------------------------
  // Game 2: Mini Golf Battle
  // --------------------------------------------------------------------------
  console.log('\n--- Game 2: Mini Golf Battle (MINI_GOLF) ---');
  const golfEngine = new MiniGolfEngine();
  it('Mini Golf engine definition ID matches', () => {
    assert.strictEqual(golfEngine.definition.id, 'MINI_GOLF');
  });

  const golfInit = golfEngine.initialize([p1, p2]);
  it('Mini Golf initializes with 3 holes and tee positions', () => {
    assert.strictEqual(golfInit.holes.length, 3);
    assert.strictEqual(golfInit.players[0].ballPosition.x, 100);
    assert.strictEqual(golfInit.players[0].currentHoleStrokes, 0);
  });

  // Putt towards cup (simulate sinking ball into cup at 850, 250)
  const hole1Cup = golfInit.holes[0].cup;
  // Apply putt with angle 0 (east towards cup) and power 100
  const golfPutt1 = golfEngine.applyAction(golfInit, 'u1', {
    type: 'PUTT',
    angle: 0,
    power: 100,
  });
  it('Putt updates ball position and increments strokes', () => {
    assert.strictEqual(golfPutt1.success, true);
    assert.strictEqual(golfPutt1.state.players[0].currentHoleStrokes, 1);
    assert.strictEqual(golfPutt1.state.turnPlayerId, 'u2'); // Turn passes to P2
  });

  // Test cup completion when within radius
  const holeCupState = JSON.parse(JSON.stringify(golfPutt1.state));
  holeCupState.players[1].ballPosition = { x: hole1Cup.x - 10, y: hole1Cup.y };
  const golfCupPutt = golfEngine.applyAction(holeCupState, 'u2', {
    type: 'PUTT',
    angle: 0,
    power: 5,
  });
  it('Putt landing in cup marks hole completed for player', () => {
    assert.strictEqual(golfCupPutt.success, true);
    assert.strictEqual(golfCupPutt.state.players[1].isHoleCompleted, true);
  });

  // --------------------------------------------------------------------------
  // Game 3: Air Hockey
  // --------------------------------------------------------------------------
  console.log('\n--- Game 3: Air Hockey (AIR_HOCKEY) ---');
  const hockeyEngine = new AirHockeyEngine();
  it('Air Hockey engine definition ID matches', () => {
    assert.strictEqual(hockeyEngine.definition.id, 'AIR_HOCKEY');
  });

  const hockeyInit = hockeyEngine.initialize([p1, p2], { targetScore: 3 });
  it('Air Hockey initializes center puck and dual mallets', () => {
    assert.strictEqual(hockeyInit.puck.x, 400);
    assert.strictEqual(hockeyInit.puck.y, 600);
    assert.strictEqual(hockeyInit.scores.player1, 0);
    assert.strictEqual(hockeyInit.scores.player2, 0);
  });

  it('Reject out-of-boundary mallet movement (P1 trying to cross into top half)', () => {
    assert.strictEqual(
      hockeyEngine.validateAction(hockeyInit, 'u1', { type: 'MOVE_MALLET', x: 400, y: 300 }),
      false
    );
  });

  it('Accept legal mallet movement in bottom half for P1', () => {
    assert.strictEqual(
      hockeyEngine.validateAction(hockeyInit, 'u1', { type: 'MOVE_MALLET', x: 400, y: 800 }),
      true
    );
  });

  // Strike puck towards top goal (angle -90, power 100)
  const hockeyStrike1 = hockeyEngine.applyAction(hockeyInit, 'u1', {
    type: 'STRIKE_PUCK',
    x: 400,
    y: 800,
    strikeAngle: -90,
    strikePower: 100,
  });
  it('Striking puck towards top goal scores for Player 1', () => {
    assert.strictEqual(hockeyStrike1.success, true);
    assert.strictEqual(hockeyStrike1.state.scores.player1, 1);
    assert.strictEqual(hockeyStrike1.state.lastScorerId, 'u1');
    assert.strictEqual(hockeyStrike1.state.puck.x, 400); // Puck reset to center
  });

  // --------------------------------------------------------------------------
  // Game 4: Darts 501
  // --------------------------------------------------------------------------
  console.log('\n--- Game 4: Darts 501 (DARTS) ---');
  const dartsEngine = new DartsEngine();
  it('Darts engine definition ID matches', () => {
    assert.strictEqual(dartsEngine.definition.id, 'DARTS');
  });

  const dartsInit = dartsEngine.initialize([p1, p2], { startingScore: 501 });
  it('Darts initializes both players with 501 points and 3 darts', () => {
    assert.strictEqual(dartsInit.players[0].scoreRemaining, 501);
    assert.strictEqual(dartsInit.players[1].scoreRemaining, 501);
    assert.strictEqual(dartsInit.dartsRemainingInTurn, 3);
  });

  // Throw 1: Triple 20 (60 points)
  const dart1 = dartsEngine.applyAction(dartsInit, 'u1', {
    type: 'THROW_DART',
    x: 0,
    y: 0,
    targetSector: 20,
    targetMultiplier: 3,
  });
  it('Triple 20 deducts 60 points from remaining score', () => {
    assert.strictEqual(dart1.success, true);
    assert.strictEqual(dart1.state.players[0].scoreRemaining, 441);
    assert.strictEqual(dart1.state.dartsRemainingInTurn, 2);
  });

  // Throw 2: Bullseye (50 points)
  const dart2 = dartsEngine.applyAction(dart1.state, 'u1', {
    type: 'THROW_DART',
    x: 0,
    y: 0,
    targetSector: 50,
    targetMultiplier: 2,
  });
  it('Bullseye deducts 50 points', () => {
    assert.strictEqual(dart2.success, true);
    assert.strictEqual(dart2.state.players[0].scoreRemaining, 391);
    assert.strictEqual(dart2.state.dartsRemainingInTurn, 1);
  });

  // Bust test
  const bustSetup = JSON.parse(JSON.stringify(dartsInit));
  bustSetup.players[0].scoreRemaining = 20;
  const dartBust = dartsEngine.applyAction(bustSetup, 'u1', {
    type: 'THROW_DART',
    x: 0,
    y: 0,
    targetSector: 20,
    targetMultiplier: 3, // 60 points exceeds 20 -> Bust!
  });
  it('Bust resets turn score and switches turn to opponent', () => {
    assert.strictEqual(dartBust.success, true);
    assert.strictEqual(dartBust.state.isBust, false); // cleared for next turn
    assert.strictEqual(dartBust.state.players[0].scoreRemaining, 20); // Reverted
    assert.strictEqual(dartBust.state.turnPlayerId, 'u2');
  });

  // Checkout win test: Remaining 40, hit Double 20 (multiplier 2)
  const checkoutSetup = JSON.parse(JSON.stringify(dartsInit));
  checkoutSetup.players[0].scoreRemaining = 40;
  const dartWin = dartsEngine.applyAction(checkoutSetup, 'u1', {
    type: 'THROW_DART',
    x: 0,
    y: 0,
    targetSector: 20,
    targetMultiplier: 2, // Double 20 = 40
  });
  it('Double 20 checkout hits exactly zero and awards victory', () => {
    assert.strictEqual(dartWin.success, true);
    assert.strictEqual(dartWin.state.winnerId, 'u1');
    assert.strictEqual(dartWin.state.players[0].scoreRemaining, 0);
  });

  // --------------------------------------------------------------------------
  // Game 5: Bowling Strike
  // --------------------------------------------------------------------------
  console.log('\n--- Game 5: Bowling Strike (BOWLING) ---');
  const bowlEngine = new BowlingEngine();
  it('Bowling engine definition ID matches', () => {
    assert.strictEqual(bowlEngine.definition.id, 'BOWLING');
  });

  const bowlInit = bowlEngine.initialize([p1, p2]);
  it('Bowling initializes with 10 frames and 10 standing pins', () => {
    assert.strictEqual(bowlInit.players[0].frames.length, 10);
    assert.strictEqual(bowlInit.standingPins.length, 10);
    assert.strictEqual(bowlInit.currentFrameIndex, 0);
  });

  // Roll 1: Perfect pocket hit (Strike)
  const strikeRoll = bowlEngine.applyAction(bowlInit, 'u1', {
    type: 'ROLL_BALL',
    lanePosition: 0,
    angle: 0,
    speed: 70,
    spin: 0,
  });
  it('Pocket roll knocks down all 10 pins for a Strike', () => {
    assert.strictEqual(strikeRoll.success, true);
    assert.strictEqual(strikeRoll.state.players[0].frames[0].isStrike, true);
    assert.strictEqual(strikeRoll.state.players[0].frames[0].rolls[0], 10);
    assert.strictEqual(strikeRoll.state.turnPlayerId, 'u2'); // Strike completes frame, passes to P2
  });

  // Gutter roll for P2
  const gutterRoll = bowlEngine.applyAction(strikeRoll.state, 'u2', {
    type: 'ROLL_BALL',
    lanePosition: 46,
    angle: 10,
    speed: 50,
    spin: 5,
  });
  it('Off-lane roll results in gutter ball (0 pins knocked)', () => {
    assert.strictEqual(gutterRoll.success, true);
    assert.strictEqual(gutterRoll.state.players[1].frames[0].rolls[0], 0);
    assert.strictEqual(gutterRoll.state.turnPlayerId, 'u2'); // Roll 2 needed for P2
  });

  // --------------------------------------------------------------------------
  // Game 6: Table Tennis Duel
  // --------------------------------------------------------------------------
  console.log('\n--- Game 6: Table Tennis Duel (TABLE_TENNIS) ---');
  const ttEngine = new TableTennisEngine();
  it('Table Tennis engine definition ID matches', () => {
    assert.strictEqual(ttEngine.definition.id, 'TABLE_TENNIS');
  });

  const ttInit = ttEngine.initialize([p1, p2], { targetScore: 11 });
  it('Table Tennis initializes with 0-0 score and P1 as initial server', () => {
    assert.strictEqual(ttInit.scores.player1, 0);
    assert.strictEqual(ttInit.scores.player2, 0);
    assert.strictEqual(ttInit.serverPlayerId, 'u1');
    assert.strictEqual(ttInit.turnPlayerId, 'u1');
  });

  // Legal serve from P1
  const serve1 = ttEngine.applyAction(ttInit, 'u1', {
    type: 'SERVE',
    shotType: 'TOPSPIN',
    targetX: 20,
    targetY: 60,
    power: 60,
  });
  it('Legal serve increments rally count and passes turn to P2', () => {
    assert.strictEqual(serve1.success, true);
    assert.strictEqual(serve1.state.rallyCount, 1);
    assert.strictEqual(serve1.state.turnPlayerId, 'u2');
  });

  // Out of bounds return from P2
  const returnOut = ttEngine.applyAction(serve1.state, 'u2', {
    type: 'RETURN',
    shotType: 'SMASH',
    targetX: 95, // Out of bounds (> 80)
    targetY: 50,
    power: 90,
  });
  it('Out of bounds shot awards point to opponent (P1)', () => {
    assert.strictEqual(returnOut.success, true);
    assert.strictEqual(returnOut.state.scores.player1, 1);
    assert.strictEqual(returnOut.state.scores.player2, 0);
    assert.strictEqual(returnOut.state.rallyCount, 0); // Rally resets
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Real-Time MatchManager End-to-End
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Real-Time MatchManager End-to-End ---');
  const poolMatch = MatchManager.startMatch('ROOM-POOL', 'POOL_8_BALL', [p1, p2]);
  it('Host launches 8 Ball Pool match in MatchManager', () => {
    assert.ok(poolMatch);
    assert.strictEqual(poolMatch.gameType, 'POOL_8_BALL');
    assert.strictEqual(poolMatch.state.balls.length, 16);
  });

  const golfMatch = MatchManager.startMatch('ROOM-GOLF', 'MINI_GOLF', [p1, p2]);
  it('Host launches Mini Golf match in MatchManager', () => {
    assert.ok(golfMatch);
    assert.strictEqual(golfMatch.gameType, 'MINI_GOLF');
    assert.strictEqual(golfMatch.state.holes.length, 3);
  });

  const hockeyMatch = MatchManager.startMatch('ROOM-HOCKEY', 'AIR_HOCKEY', [p1, p2]);
  it('Host launches Air Hockey match in MatchManager', () => {
    assert.ok(hockeyMatch);
    assert.strictEqual(hockeyMatch.gameType, 'AIR_HOCKEY');
    assert.strictEqual(hockeyMatch.state.puck.x, 400);
  });

  const dartsMatch = MatchManager.startMatch('ROOM-DARTS', 'DARTS', [p1, p2]);
  it('Host launches Darts match in MatchManager', () => {
    assert.ok(dartsMatch);
    assert.strictEqual(dartsMatch.gameType, 'DARTS');
    assert.strictEqual(dartsMatch.state.startingScore, 501);
  });

  const bowlMatch = MatchManager.startMatch('ROOM-BOWL', 'BOWLING', [p1, p2]);
  it('Host launches Bowling match in MatchManager', () => {
    assert.ok(bowlMatch);
    assert.strictEqual(bowlMatch.gameType, 'BOWLING');
    assert.strictEqual(bowlMatch.state.standingPins.length, 10);
  });

  const ttMatch = MatchManager.startMatch('ROOM-TT', 'TABLE_TENNIS', [p1, p2]);
  it('Host launches Table Tennis match in MatchManager', () => {
    assert.ok(ttMatch);
    assert.strictEqual(ttMatch.gameType, 'TABLE_TENNIS');
    assert.strictEqual(ttMatch.state.targetScore, 11);
  });

  // Final summary
  console.log('\n======================================================');
  console.log(`Casual & Arcade Games Test Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
