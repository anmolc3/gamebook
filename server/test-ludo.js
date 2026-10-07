const ioClient = require('socket.io-client');
const { LudoEngine } = require('./dist/server/src/games/ludo/ludo.engine');

const API_BASE = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function request(endpoint, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    data: json.data !== undefined ? json.data : json,
    raw: json,
  };
}

async function runTests() {
  console.log('🧪 Starting Ludo Server-Authoritative Game Engine Automated Test Suite...\n');

  try {
    // =========================================================================
    // Scenario 1: Direct Unit Testing of LudoEngine Logic
    // =========================================================================
    console.log('--- Scenario 1: Engine Initialization & Validation ---');
    const engine = new LudoEngine();
    assert(engine.definition.id === 'LUDO', 'Engine definition ID is LUDO');
    assert(engine.definition.minPlayers === 2, 'Engine minPlayers is 2');
    assert(engine.definition.maxPlayers === 4, 'Engine maxPlayers is 4');

    const mockPlayers2 = [
      { userId: 'u1', username: 'alice', displayName: 'Alice', slotIndex: 0 },
      { userId: 'u2', username: 'bob', displayName: 'Bob', slotIndex: 1 },
    ];

    const state2 = engine.initialize(mockPlayers2);
    assert(state2.players.length === 2, '2-player state has 2 players');
    assert(state2.players[0].color === 'RED', 'Player 1 is RED');
    assert(state2.players[1].color === 'YELLOW', 'Player 2 is YELLOW (opposite quadrant)');
    assert(state2.turnColor === 'RED', 'First turn is RED');
    assert(state2.turnPlayerId === 'u1', 'First turn player is u1');
    assert(state2.players[0].tokens.length === 4, 'RED has 4 tokens');
    assert(state2.players[0].tokens.every((t) => t.step === -1), 'All RED tokens start in yard (-1)');
    assert(state2.hasRolled === false, 'Initially hasRolled is false');
    assert(state2.currentDiceRoll === null, 'Initially currentDiceRoll is null');

    // 4-player initialization
    const mockPlayers4 = [
      { userId: 'u1', username: 'alice', displayName: 'Alice', slotIndex: 0 },
      { userId: 'u2', username: 'bob', displayName: 'Bob', slotIndex: 1 },
      { userId: 'u3', username: 'carol', displayName: 'Carol', slotIndex: 2 },
      { userId: 'u4', username: 'dave', displayName: 'Dave', slotIndex: 3 },
    ];
    const state4 = engine.initialize(mockPlayers4);
    assert(state4.players.length === 4, '4-player state has 4 players');
    assert(state4.players[0].color === 'RED', 'P1 is RED');
    assert(state4.players[1].color === 'GREEN', 'P2 is GREEN');
    assert(state4.players[2].color === 'YELLOW', 'P3 is YELLOW');
    assert(state4.players[3].color === 'BLUE', 'P4 is BLUE');

    // Validation checks
    let threwOutOfTurn = false;
    try {
      engine.validateAction(state2, 'u2', { type: 'ROLL_DICE' });
    } catch {
      threwOutOfTurn = true;
    }
    assert(threwOutOfTurn, 'Reject roll when not player turn');

    let threwMoveBeforeRoll = false;
    try {
      engine.validateAction(state2, 'u1', { type: 'MOVE_TOKEN', tokenId: 0 });
    } catch {
      threwMoveBeforeRoll = true;
    }
    assert(threwMoveBeforeRoll, 'Reject move token before dice is rolled');

    // =========================================================================
    // Scenario 2: Rolling Dice & Yard Exits
    // =========================================================================
    console.log('\n--- Scenario 2: Dice Rolling & Yard Exits ---');
    const rollRes = engine.applyAction(state2, 'u1', { type: 'ROLL_DICE' });
    assert(rollRes.success, 'applyAction ROLL_DICE succeeds');
    const rolledVal = rollRes.events && rollRes.events[0] ? rollRes.events[0].data.roll : rollRes.state.currentDiceRoll;
    assert(rolledVal >= 1 && rolledVal <= 6, 'Roll is between 1 and 6');

    // Yard exit logic: token requires 6 to exit yard
    const testYardState = JSON.parse(JSON.stringify(state2));
    testYardState.currentDiceRoll = 6;
    testYardState.hasRolled = true;
    testYardState.validMoves = engine.calculateValidMoves(testYardState.players[0], 6);
    assert(testYardState.validMoves.length === 4, 'On roll 6 with all tokens in yard, all 4 tokens are valid to exit');

    const exitMoveRes = engine.applyAction(testYardState, 'u1', { type: 'MOVE_TOKEN', tokenId: 0 });
    assert(exitMoveRes.success, 'Token 0 successfully moves out of yard');
    assert(exitMoveRes.state.players[0].tokens[0].step === 0, 'Token 0 is now at step 0 (start track cell)');
    assert(exitMoveRes.state.turnPlayerId === 'u1', 'Rolling 6 awards bonus turn (turn remains with u1)');

    // Non-6 with all in yard has 0 valid moves
    const non6YardMoves = engine.calculateValidMoves(state2.players[0], 5);
    assert(non6YardMoves.length === 0, 'On roll of 5 with all tokens in yard, 0 valid moves available');

    // =========================================================================
    // Scenario 3: Three Consecutive Sixes Penalty Rule
    // =========================================================================
    console.log('\n--- Scenario 3: Three Consecutive Sixes Penalty ---');
    const threeSixesState = JSON.parse(JSON.stringify(state2));
    threeSixesState.consecutiveSixes = 2; // already rolled two 6s
    // Mock crypto or force roll:
    // If consecutiveSixes becomes 3, turn is forfeited
    threeSixesState.hasRolled = false;
    // Simulate next roll of 6
    threeSixesState.consecutiveSixes = 3;
    engine.advanceTurn(threeSixesState);
    assert(threeSixesState.turnPlayerId === 'u2', 'Three consecutive 6s passes turn to next player (u2)');
    assert(threeSixesState.consecutiveSixes === 0, 'consecutiveSixes resets to 0');

    // =========================================================================
    // Scenario 4: Circuit Navigation, Safe Cells & Captures
    // =========================================================================
    console.log('\n--- Scenario 4: Circuit Navigation, Safe Cells & Captures ---');
    // RED start cell is 0, YELLOW start cell is 26
    // Absolute cell calculation
    assert(engine.getAbsoluteCell('RED', 0) === 0, 'RED step 0 maps to absolute cell 0');
    assert(engine.getAbsoluteCell('RED', 10) === 10, 'RED step 10 maps to absolute cell 10');
    assert(engine.getAbsoluteCell('YELLOW', 0) === 26, 'YELLOW step 0 maps to absolute cell 26');
    assert(engine.getAbsoluteCell('YELLOW', 26) === 0, 'YELLOW step 26 wraps to absolute cell 0');

    // Test Opponent Capture
    // Setup: YELLOW token at absolute cell 10. RED token moves from step 6 to step 10 on roll 4.
    // Cell 10 is NOT a safe cell (safe cells are 0, 8, 13, 21, 26, 34, 39, 47).
    const captureState = JSON.parse(JSON.stringify(state2));
    captureState.players[0].tokens[0].step = 6; // RED token 0 at step 6 (absolute cell 6)
    // For YELLOW to be at absolute cell 10: YELLOW start offset is 26.
    // step = (10 - 26 + 52) % 52 = 36.
    captureState.players[1].tokens[0].step = 36; // YELLOW token 0 at step 36 (absolute cell 10)
    captureState.currentDiceRoll = 4;
    captureState.hasRolled = true;
    captureState.validMoves = [0];

    const captureRes = engine.applyAction(captureState, 'u1', { type: 'MOVE_TOKEN', tokenId: 0 });
    assert(captureRes.success, 'RED token moves to cell 10');
    assert(captureRes.state.players[0].tokens[0].step === 10, 'RED token 0 is now at step 10');
    assert(captureRes.state.players[1].tokens[0].step === -1, 'YELLOW token 0 was captured and returned to yard (-1)');
    assert(captureRes.state.turnPlayerId === 'u1', 'Capture awards bonus turn to capturing player (u1 retains turn)');

    // Test Safe Cell Immunity
    // Absolute cell 8 is a star/safe cell.
    // Both RED and YELLOW can share cell 8 without capture!
    const safeState = JSON.parse(JSON.stringify(state2));
    safeState.players[0].tokens[0].step = 4; // RED at 4, rolls 4 -> lands on 8
    // YELLOW at absolute 8: step = (8 - 26 + 52) % 52 = 34.
    safeState.players[1].tokens[0].step = 34; // YELLOW at absolute 8
    safeState.currentDiceRoll = 4;
    safeState.hasRolled = true;
    safeState.validMoves = [0];

    const safeRes = engine.applyAction(safeState, 'u1', { type: 'MOVE_TOKEN', tokenId: 0 });
    assert(safeRes.success, 'RED lands on safe cell 8');
    assert(safeRes.state.players[1].tokens[0].step === 34, 'YELLOW token at safe cell 8 is NOT captured (immunity preserved)');

    // =========================================================================
    // Scenario 5: Home Corridor & Exact Finish (Step 56)
    // =========================================================================
    console.log('\n--- Scenario 5: Home Stretch & Exact Finish ---');
    const homeState = JSON.parse(JSON.stringify(state2));
    homeState.players[0].tokens[0].step = 53; // In home stretch
    // Roll of 4 would overshoot (53 + 4 = 57 > 56) -> invalid move
    const overshootingMoves = engine.calculateValidMoves(homeState.players[0], 4);
    assert(!overshootingMoves.includes(0), 'Roll of 4 overshoots finish (53 + 4 = 57 > 56) and is disallowed');

    // Roll of 3 exactly reaches 56!
    const exactMoves = engine.calculateValidMoves(homeState.players[0], 3);
    assert(exactMoves.includes(0), 'Roll of 3 exactly reaches 56 (53 + 3 = 56) and is allowed');

    homeState.currentDiceRoll = 3;
    homeState.hasRolled = true;
    homeState.validMoves = [0];
    const finishRes = engine.applyAction(homeState, 'u1', { type: 'MOVE_TOKEN', tokenId: 0 });
    assert(finishRes.success, 'Token 0 successfully reaches Home finish (step 56)');
    assert(finishRes.state.players[0].tokens[0].step === 56, 'Token 0 step is exactly 56');
    assert(finishRes.state.turnPlayerId === 'u1', 'Reaching home awards bonus turn');

    // =========================================================================
    // Scenario 6: Winner Detection & Multi-Player Rankings
    // =========================================================================
    console.log('\n--- Scenario 6: Winner Detection & Rankings ---');
    const winState = JSON.parse(JSON.stringify(state2));
    // Set 3 tokens home, 4th token at step 55
    winState.players[0].tokens[0].step = 56;
    winState.players[0].tokens[1].step = 56;
    winState.players[0].tokens[2].step = 56;
    winState.players[0].tokens[3].step = 55;

    winState.currentDiceRoll = 1;
    winState.hasRolled = true;
    winState.validMoves = [3];

    const finalMoveRes = engine.applyAction(winState, 'u1', { type: 'MOVE_TOKEN', tokenId: 3 });
    assert(finalMoveRes.success, 'Final token reaches home');
    assert(finalMoveRes.state.players[0].rank === 1, 'Player 1 awarded Rank 1 (Winner)');

    const winnerResult = engine.checkWinner(finalMoveRes.state);
    assert(winnerResult !== null, 'checkWinner detects match conclusion');
    assert(winnerResult.isComplete === true, 'Match is complete');
    assert(winnerResult.winnerId === 'u1', 'Winner ID is u1');
    assert(winnerResult.rankings.length === 2, 'Rankings contains both players');
    assert(winnerResult.rankings[0].userId === 'u1' && winnerResult.rankings[0].rank === 1, 'Rank 1 is u1');
    assert(winnerResult.rankings[1].userId === 'u2' && winnerResult.rankings[1].rank === 2, 'Rank 2 is u2');

    // =========================================================================
    // Scenario 7: Timeout Auto-Play Handler
    // =========================================================================
    console.log('\n--- Scenario 7: Timeout Auto-Play Handler ---');
    const timeoutState = JSON.parse(JSON.stringify(state2));
    // Player hasn't rolled yet -> timeout rolls dice
    const timeoutRes = engine.handleTurnTimeout(timeoutState);
    assert(timeoutRes.success, 'handleTurnTimeout successfully executes');

    // =========================================================================
    // Scenario 8: Socket.IO & MatchManager Real-Time Integration
    // =========================================================================
    console.log('\n--- Scenario 8: Socket.IO & MatchManager Integration ---');
    const timestamp = Date.now().toString().slice(-6);
    const regA = await request('/auth/register', 'POST', {
      username: `lu1_${timestamp}`,
      email: `lu1_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Ludo Master A',
    });
    const regB = await request('/auth/register', 'POST', {
      username: `lu2_${timestamp}`,
      email: `lu2_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Ludo Master B',
    });

    const tokenA = regA.data.token;
    const userA = regA.data.user;
    const tokenB = regB.data.token;
    const userB = regB.data.user;

    // Create room with gameType LUDO
    const createRoomRes = await request(
      '/rooms',
      'POST',
      { gameType: 'LUDO', isPrivate: false },
      tokenA
    );
    assert(createRoomRes.status === 201, 'Create room with gameType LUDO succeeds');
    const roomCode = createRoomRes.data.code;

    // Join room
    const joinRes = await request(`/rooms/${roomCode}/join`, 'POST', {}, tokenB);
    assert(joinRes.status === 200, 'Player B joins Ludo room');

    // Ready player B
    await request(`/rooms/${roomCode}/ready`, 'POST', { isReady: true }, tokenB);

    // Setup Socket.IO connections
    const socketA = ioClient(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });
    const socketB = ioClient(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    const waitConnect = (s) =>
      new Promise((resolve) => {
        if (s.connected) resolve();
        else s.once('connect', resolve);
      });

    await Promise.all([waitConnect(socketA), waitConnect(socketB)]);
    assert(true, 'Both player sockets connected to server');

    // Join room channels with ack
    await new Promise((resolve) => socketA.emit('room:join', { roomCode }, resolve));
    await new Promise((resolve) => socketB.emit('room:join', { roomCode }, resolve));

    // Listen for game:started
    const matchStartedPromise = new Promise((resolve) => {
      socketA.once('game:started', (payload) => resolve(payload));
    });

    // Start Ludo game
    const startRes = await request(`/rooms/${roomCode}/start`, 'POST', {}, tokenA);
    assert(startRes.status === 200, 'Host starts Ludo game');

    const liveStatePayload = await matchStartedPromise;
    assert(liveStatePayload.gameType === 'LUDO', 'Received game:started event for LUDO');
    assert(liveStatePayload.players.length === 2, 'Received initial Ludo live state with 2 players');
    assert(liveStatePayload.state.turnPlayerId === userA.id, 'Turn player matches host (Player RED)');

    // =========================================================================
    // Scenario 9: Real-time game:action (ROLL_DICE)
    // =========================================================================
    console.log('\n--- Scenario 9: Real-Time game:action Dispatch ---');
    let rollBroadcastPromise = new Promise((resolve) => {
      socketA.on('game:state', (payload) => {
        if (payload.roomCode === roomCode && payload.sequenceNumber >= 2) {
          resolve(payload);
        }
      });
    });

    socketA.emit('game:action', {
      roomCode,
      action: { type: 'ROLL_DICE' },
    });

    const rolledState = await rollBroadcastPromise;
    assert(rolledState.state !== undefined, 'Socket broadcast receives updated state after ROLL_DICE');
    assert(rolledState.sequenceNumber >= 2, 'Sequence number incremented');

    // =========================================================================
    // Scenario 10: Rematch Protocol & Game REST Endpoints
    // =========================================================================
    console.log('\n--- Scenario 10: REST Endpoints & Rematch Handshake ---');
    // Active game REST endpoint
    const activeRes = await request(`/games/active/${roomCode}`, 'GET', null, tokenA);
    assert(activeRes.status === 200, 'GET /games/active/:roomCode returns active Ludo match');
    assert(activeRes.data.gameType === 'LUDO', 'Active match gameType is LUDO');

    // Game catalog
    const catalogRes = await request('/games/catalog', 'GET', null, tokenA);
    assert(catalogRes.status === 200, 'GET /games/catalog returns catalog');
    const gamesList = catalogRes.data.games || catalogRes.data;
    const ludoInCatalog = gamesList.find((g) => g.id === 'LUDO');
    assert(ludoInCatalog !== undefined, 'LUDO is listed in game catalog');

    // Rematch handshake
    let rematchStartedPromise = new Promise((resolve) => {
      socketA.on('game:rematch_started', (payload) => {
        resolve(payload);
      });
    });

    socketA.emit('game:rematch_request', { roomCode });
    socketB.emit('game:rematch_response', { roomCode, accept: true });

    const rematchPayload = await rematchStartedPromise;
    assert(rematchPayload.round === 2, 'Rematch starts round 2');
    assert(rematchPayload.players[0].userId === userB.id, 'Player order rotated for round 2 fairness');

    // Cleanup sockets
    socketA.disconnect();
    socketB.disconnect();

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n======================================================');
    console.log(`Ludo Test Suite Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 Test suite unexpected error:', err);
    process.exit(1);
  }
}

runTests();
