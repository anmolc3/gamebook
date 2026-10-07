const http = require('http');
const ioClient = require('socket.io-client');

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
  console.log('🧪 Starting Tic-Tac-Toe Server-Authoritative Game Engine Automated Test Suite...\n');

  try {
    // =========================================================================
    // Scenario 1: Setup Test Players
    // =========================================================================
    console.log('--- Scenario 1: Setup Test Accounts ---');
    const timestamp = Date.now().toString().slice(-6);
    const regA = await request('/auth/register', 'POST', {
      username: `t1_${timestamp}`,
      email: `t1_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Player One',
    });
    const regB = await request('/auth/register', 'POST', {
      username: `t2_${timestamp}`,
      email: `t2_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Player Two',
    });

    const tokenA = regA.data.token;
    const userA = regA.data.user;
    const tokenB = regB.data.token;
    const userB = regB.data.user;

    assert(tokenA && tokenB, 'Register Player A and Player B test accounts');

    // =========================================================================
    // Scenario 2: Unit Testing TicTacToeEngine State Transitions
    // =========================================================================
    console.log('\n--- Scenario 2: Engine Initialization & Mark Allocation ---');
    const { TicTacToeEngine } = require('./dist/server/src/games/tictactoe/tictactoe.engine.js');
    const engine = new TicTacToeEngine();

    const players = [
      { userId: userA.id, username: userA.username, displayName: userA.displayName, slotIndex: 0 },
      { userId: userB.id, username: userB.username, displayName: userB.displayName, slotIndex: 1 },
    ];

    let state = engine.initialize(players);
    assert(state.board.length === 9, 'Board contains exactly 9 cells');
    assert(state.board.every((c) => c === null), 'All 9 cells initially empty (null)');
    assert(state.players.X === userA.id, 'Player A assigned mark X');
    assert(state.players.O === userB.id, 'Player B assigned mark O');
    assert(state.turnPlayerId === userA.id, 'Player A (Mark X) begins the match');
    assert(state.winnerId === null && !state.isDraw, 'Winner is null and isDraw is false');
    assert(state.turnExpiresAt > Date.now(), '15-second turn timer active');

    // =========================================================================
    // Scenario 3: Authoritative Move Validation
    // =========================================================================
    console.log('\n--- Scenario 3: Authoritative Turn & Move Validation ---');
    // Wrong player attempt
    let wrongPlayerThrew = false;
    try {
      engine.validateAction(state, userB.id, { cellIndex: 0 });
    } catch (e) {
      wrongPlayerThrew = true;
    }
    assert(wrongPlayerThrew, 'Rejects move when it is not player\'s turn');

    // Out of bounds attempt
    let outOfBoundsThrew = false;
    try {
      engine.validateAction(state, userA.id, { cellIndex: 9 });
    } catch (e) {
      outOfBoundsThrew = true;
    }
    assert(outOfBoundsThrew, 'Rejects out-of-bounds cell index (>= 9)');

    // Negative cell index attempt
    let negativeThrew = false;
    try {
      engine.validateAction(state, userA.id, { cellIndex: -1 });
    } catch (e) {
      negativeThrew = true;
    }
    assert(negativeThrew, 'Rejects negative cell index (< 0)');

    // =========================================================================
    // Scenario 4: Valid Moves & Turn Alternation
    // =========================================================================
    console.log('\n--- Scenario 4: Move Application & Turn Switching ---');
    let res = engine.applyAction(state, userA.id, { cellIndex: 0 });
    state = res.state;
    assert(res.success, 'Player A plays cell 0 successfully');
    assert(state.board[0] === 'X', 'Cell 0 contains mark X');
    assert(state.turnPlayerId === userB.id, 'Turn transitions to Player B');

    // Occupied cell attempt
    let occupiedThrew = false;
    try {
      engine.validateAction(state, userB.id, { cellIndex: 0 });
    } catch (e) {
      occupiedThrew = true;
    }
    assert(occupiedThrew, 'Prevents overwriting an already occupied cell');

    // Player B valid move
    res = engine.applyAction(state, userB.id, { cellIndex: 3 });
    state = res.state;
    assert(state.board[3] === 'O', 'Player B plays cell 3 with mark O');
    assert(state.turnPlayerId === userA.id, 'Turn transitions back to Player A');

    // =========================================================================
    // Scenario 5: Horizontal Win Detection
    // =========================================================================
    console.log('\n--- Scenario 5: Horizontal Win Evaluation ---');
    // Board state so far:
    // [X, _, _]
    // [O, _, _]
    // [_, _, _]
    res = engine.applyAction(state, userA.id, { cellIndex: 1 }); // A: X at 1
    state = res.state;
    res = engine.applyAction(state, userB.id, { cellIndex: 4 }); // B: O at 4
    state = res.state;
    res = engine.applyAction(state, userA.id, { cellIndex: 2 }); // A: X at 2 (Wins row [0, 1, 2]!)
    state = res.state;

    assert(state.winnerId === userA.id, 'Player A declared winner');
    assert(JSON.stringify(state.winningLine) === JSON.stringify([0, 1, 2]), 'Winning line correctly identified as [0, 1, 2]');
    assert(!state.isDraw, 'isDraw is false on win');

    // Reject move on completed game
    let finishedThrew = false;
    try {
      engine.validateAction(state, userB.id, { cellIndex: 8 });
    } catch (e) {
      finishedThrew = true;
    }
    assert(finishedThrew, 'Rejects moves after match is completed');

    // =========================================================================
    // Scenario 6: Diagonal Win Detection
    // =========================================================================
    console.log('\n--- Scenario 6: Diagonal Win Evaluation ---');
    let diagState = engine.initialize(players);
    // Move sequence for diagonal [0, 4, 8]:
    diagState = engine.applyAction(diagState, userA.id, { cellIndex: 0 }).state; // A: 0
    diagState = engine.applyAction(diagState, userB.id, { cellIndex: 1 }).state; // B: 1
    diagState = engine.applyAction(diagState, userA.id, { cellIndex: 4 }).state; // A: 4
    diagState = engine.applyAction(diagState, userB.id, { cellIndex: 2 }).state; // B: 2
    diagState = engine.applyAction(diagState, userA.id, { cellIndex: 8 }).state; // A: 8

    assert(diagState.winnerId === userA.id, 'Diagonal win recognized for Player A');
    assert(JSON.stringify(diagState.winningLine) === JSON.stringify([0, 4, 8]), 'Diagonal winning line [0, 4, 8] recorded');

    // =========================================================================
    // Scenario 7: Draw Game Detection
    // =========================================================================
    console.log('\n--- Scenario 7: Draw Game Evaluation ---');
    let drawState = engine.initialize(players);
    // Draw grid layout:
    // X O X
    // X X O
    // O X O
    const drawMoves = [
      { p: userA.id, c: 0 }, // X at 0
      { p: userB.id, c: 1 }, // O at 1
      { p: userA.id, c: 2 }, // X at 2
      { p: userB.id, c: 5 }, // O at 5
      { p: userA.id, c: 3 }, // X at 3
      { p: userB.id, c: 6 }, // O at 6
      { p: userA.id, c: 4 }, // X at 4
      { p: userB.id, c: 8 }, // O at 8
      { p: userA.id, c: 7 }, // X at 7
    ];

    for (const m of drawMoves) {
      drawState = engine.applyAction(drawState, m.p, { cellIndex: m.c }).state;
    }

    assert(drawState.isDraw === true, 'Draw detected when 9 cells filled with no winner');
    assert(drawState.winnerId === null, 'winnerId is null on draw');
    assert(drawState.winningLine === null, 'winningLine is null on draw');

    // =========================================================================
    // Scenario 8: Turn Timeout Auto-Play Handler
    // =========================================================================
    console.log('\n--- Scenario 8: Turn Timeout Auto-Play ---');
    let timeoutState = engine.initialize(players);
    timeoutState = engine.applyAction(timeoutState, userA.id, { cellIndex: 0 }).state; // X at 0, now B's turn
    const timeoutRes = engine.handleTurnTimeout(timeoutState);
    assert(timeoutRes.success, 'Turn timeout auto-play executes successfully');
    assert(timeoutRes.state.board[1] === 'O', 'First empty cell (1) auto-played by Player B on timeout');
    assert(timeoutRes.state.turnPlayerId === userA.id, 'Turn returned to Player A after timeout');

    // =========================================================================
    // Scenario 9: Full Real-Time Multiplayer Room & Match Flow via WebSockets
    // =========================================================================
    console.log('\n--- Scenario 9: Full WebSocket Real-Time Match & Rematch Flow ---');

    // 1. Create room via Player A
    const roomCreateRes = await request('/rooms', 'POST', {
      gameType: 'TICTACTOE',
      isPrivate: true,
      maxPlayers: 2,
    }, tokenA);
    const roomCode = roomCreateRes.data.code;
    assert(roomCreateRes.status === 201 && roomCode, `Host creates room ${roomCode}`);

    // 2. Connect WebSockets for Player A and Player B
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

    // 3. Player B joins room via HTTP
    await request(`/rooms/${roomCode}/join`, 'POST', {}, tokenB);

    // 4. Player B sets ready
    await request(`/rooms/${roomCode}/ready`, 'POST', { isReady: true }, tokenB);

    // Join room channels with ack
    await new Promise((resolve) => socketA.emit('room:join', { roomCode }, resolve));
    await new Promise((resolve) => socketB.emit('room:join', { roomCode }, resolve));

    // Setup match launch listener
    const startPromise = new Promise((resolve) => {
      socketB.once('game:started', (data) => resolve(data));
    });

    // 5. Host launches match
    const startRes = await request(`/rooms/${roomCode}/start`, 'POST', {}, tokenA);
    assert(startRes.status === 200, 'Host launches match via POST /rooms/:code/start');

    const startedData = await startPromise;
    assert(startedData.gameType === 'TICTACTOE', 'Socket receives game:started event');
    assert(startedData.sequenceNumber === 1, 'Initial sequence number is 1');
    assert(startedData.state.board.length === 9, 'Initial state has 9 cells');

    // 6. Play moves via socket
    const moveStatePromise = new Promise((resolve) => {
      socketB.on('game:state', function onState(data) {
        if (data.sequenceNumber === 2) {
          socketB.off('game:state', onState);
          resolve(data);
        }
      });
    });

    socketA.emit('game:action', { roomCode, action: { cellIndex: 0 } });
    const movedState = await moveStatePromise;
    assert(movedState.sequenceNumber === 2, 'Move increments sequenceNumber to 2');
    assert(movedState.state.board[0] === 'X', 'board[0] updated to X over socket');

    // Play remaining moves to complete match:
    // A: 0, B: 3, A: 1, B: 4, A: 2 (A wins!)
    const gameOverPromise = new Promise((resolve) => {
      socketB.once('game:over', (data) => resolve(data));
    });

    await new Promise((resolve) => socketB.emit('game:action', { roomCode, action: { cellIndex: 3 } }, resolve));
    await new Promise((resolve) => socketA.emit('game:action', { roomCode, action: { cellIndex: 1 } }, resolve));
    await new Promise((resolve) => socketB.emit('game:action', { roomCode, action: { cellIndex: 4 } }, resolve));
    await new Promise((resolve) => socketA.emit('game:action', { roomCode, action: { cellIndex: 2 } }, resolve));

    const gameOverData = await gameOverPromise;
    assert(gameOverData.winnerId === userA.id, 'game:over declares Player A winner');
    assert(gameOverData.scores[userA.id] === 1, 'Score for Player A incremented to 1');

    // 7. Instant Rematch handshake
    const rematchOfferPromise = new Promise((resolve) => {
      socketB.once('game:rematch_offered', (data) => resolve(data));
    });
    const rematchStartPromise = new Promise((resolve) => {
      socketA.once('game:rematch_started', (data) => resolve(data));
    });

    // Player A requests rematch
    socketA.emit('game:rematch_request', { roomCode });
    const rematchOffered = await rematchOfferPromise;
    assert(rematchOffered.offeredByUserId === userA.id, 'game:rematch_offered received by Player B');

    // Player B accepts rematch
    socketB.emit('game:rematch_response', { roomCode, accept: true });
    const rematchStarted = await rematchStartPromise;
    assert(rematchStarted.round === 2, 'Rematch starts round 2');
    assert(rematchStarted.players[0].userId === userB.id, 'Player marks swapped: Player B is now Player 0 (Mark X)');
    assert(rematchStarted.players[1].userId === userA.id, 'Player A is now Player 1 (Mark O)');
    assert(rematchStarted.state.board.every((c) => c === null), 'Board reset to empty for rematch');

    // =========================================================================
    // Scenario 10: Match History & Lifetime Statistics Persistence
    // =========================================================================
    console.log('\n--- Scenario 10: Database Persistence & Statistics APIs ---');

    // Wait 500ms for async DB writes
    await new Promise((r) => setTimeout(r, 600));

    // Check stats endpoint
    const statsResA = await request('/games/stats/TICTACTOE', 'GET', null, tokenA);
    assert(statsResA.status === 200, 'GET /games/stats/TICTACTOE returns 200 OK');
    assert(statsResA.data.matchesPlayed >= 1, 'Player A matchesPlayed >= 1');
    assert(statsResA.data.matchesWon >= 1, 'Player A matchesWon >= 1');
    assert(statsResA.data.currentStreak >= 1, 'Player A currentStreak >= 1');

    const statsResB = await request('/games/stats/TICTACTOE', 'GET', null, tokenB);
    assert(statsResB.data.matchesLost >= 1, 'Player B matchesLost >= 1');

    // Check history endpoint
    const historyRes = await request('/games/history/TICTACTOE', 'GET', null, tokenA);
    assert(historyRes.status === 200, 'GET /games/history/TICTACTOE returns 200 OK');
    assert(historyRes.data.results.length >= 1, 'Game history contains recorded match');
    assert(historyRes.data.results[0].gameType === 'TICTACTOE', 'History item gameType is TICTACTOE');
    assert(historyRes.data.results[0].winnerId === userA.id, 'History item records Player A as winner');

    // Disconnect sockets
    socketA.disconnect();
    socketB.disconnect();

  } catch (err) {
    console.error('💥 Test suite crashed with error:', err);
    failed++;
  }

  console.log('\n=========================================');
  console.log(`📊 Tic-Tac-Toe Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
