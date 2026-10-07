const ioClient = require('socket.io-client');
const { ConnectFourEngine } = require('./dist/server/src/games/board/connectfour.engine');
const { ReversiEngine } = require('./dist/server/src/games/board/reversi.engine');
const { GomokuEngine } = require('./dist/server/src/games/board/gomoku.engine');
const { CheckersEngine } = require('./dist/server/src/games/board/checkers.engine');
const { ChessEngine } = require('./dist/server/src/games/board/chess.engine');

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
  console.log('🧪 Starting Board Game Expansion I Automated Test Suite (Chess, Checkers, Connect 4, Gomoku, Reversi)...\n');

  try {
    const mockPlayers = [
      { userId: 'uA', username: 'alice', displayName: 'Alice', slotIndex: 0 },
      { userId: 'uB', username: 'bob', displayName: 'Bob', slotIndex: 1 },
    ];

    // =========================================================================
    // Game 1: Connect Four
    // =========================================================================
    console.log('--- Game 1: Connect Four (CONNECT_FOUR) ---');
    const c4Engine = new ConnectFourEngine();
    assert(c4Engine.definition.id === 'CONNECT_FOUR', 'Connect Four engine ID matches');
    let c4State = c4Engine.initialize(mockPlayers);
    assert(c4State.board.length === 6 && c4State.board[0].length === 7, 'Board dimensions are 6 rows x 7 cols');
    assert(c4State.turnPlayerId === 'uA', 'Player A (Red) drops first');

    // Drop in column 3: lands at row 5 (bottom)
    let c4Res = c4Engine.applyAction(c4State, 'uA', { column: 3 });
    assert(c4Res.success, 'Player A drops in column 3');
    assert(c4Res.state.board[5][3] === 'R', 'Disc lands at row 5 (bottom slot)');
    assert(c4Res.state.turnPlayerId === 'uB', 'Turn switches to Player B (Yellow)');

    // Drop in same column: lands at row 4
    c4Res = c4Engine.applyAction(c4Res.state, 'uB', { column: 3 });
    assert(c4Res.state.board[4][3] === 'Y', 'Disc lands at row 4 (stacked on top)');

    // Out of turn rejection
    let threwOutOfTurn = false;
    try {
      c4Engine.validateAction(c4Res.state, 'uB', { column: 0 });
    } catch {
      threwOutOfTurn = true;
    }
    assert(threwOutOfTurn, 'Reject out of turn drop');

    // Horizontal win test
    let winStateC4 = c4Engine.initialize(mockPlayers);
    // Red: 0, 1, 2, 3; Yellow: 0, 1, 2
    winStateC4 = c4Engine.applyAction(winStateC4, 'uA', { column: 0 }).state; // A: col 0, row 5
    winStateC4 = c4Engine.applyAction(winStateC4, 'uB', { column: 0 }).state; // B: col 0, row 4
    winStateC4 = c4Engine.applyAction(winStateC4, 'uA', { column: 1 }).state; // A: col 1, row 5
    winStateC4 = c4Engine.applyAction(winStateC4, 'uB', { column: 1 }).state; // B: col 1, row 4
    winStateC4 = c4Engine.applyAction(winStateC4, 'uA', { column: 2 }).state; // A: col 2, row 5
    winStateC4 = c4Engine.applyAction(winStateC4, 'uB', { column: 2 }).state; // B: col 2, row 4
    winStateC4 = c4Engine.applyAction(winStateC4, 'uA', { column: 3 }).state; // A: col 3, row 5 -> 4 in a row!

    assert(winStateC4.winnerId === 'uA', 'Connect Four horizontal 4-in-a-row win detected for Player A');
    assert(winStateC4.winningLine !== null && winStateC4.winningLine.length === 4, 'Winning line contains 4 coordinates');

    // =========================================================================
    // Game 2: Reversi / Othello
    // =========================================================================
    console.log('\n--- Game 2: Reversi / Othello (REVERSI) ---');
    const revEngine = new ReversiEngine();
    assert(revEngine.definition.id === 'REVERSI', 'Reversi engine ID matches');
    let revState = revEngine.initialize(mockPlayers);
    assert(revState.board.length === 8 && revState.board[0].length === 8, 'Reversi board is 8x8');
    assert(revState.counts.B === 2 && revState.counts.W === 2, 'Initial counts are B: 2, W: 2');
    assert(revState.turnPlayerId === 'uA', 'Player A (Black) plays first');
    assert(revState.validMoves.length === 4, 'Black starts with exactly 4 valid opening moves (e.g. [2,3], [3,2], [4,5], [5,4])');

    // Invalid move rejection (does not outflank)
    let threwInvalidRev = false;
    try {
      revEngine.validateAction(revState, 'uA', { row: 0, col: 0 });
    } catch {
      threwInvalidRev = true;
    }
    assert(threwInvalidRev, 'Reject non-outflanking cell [0, 0]');

    // Play legal move [2, 3]
    const revRes = revEngine.applyAction(revState, 'uA', { row: 2, col: 3 });
    assert(revRes.success, 'Player A plays valid move [2, 3]');
    assert(revRes.state.board[2][3] === 'B', 'Cell [2, 3] set to Black');
    assert(revRes.state.board[3][3] === 'B', 'Opponent disc at [3, 3] flipped from White to Black');
    assert(revRes.state.counts.B === 4 && revRes.state.counts.W === 1, 'Counts updated to B: 4, W: 1');
    assert(revRes.state.turnPlayerId === 'uB', 'Turn passed to White (Player B)');

    // =========================================================================
    // Game 3: Gomoku
    // =========================================================================
    console.log('\n--- Game 3: Gomoku (GOMOKU) ---');
    const gomokuEngine = new GomokuEngine();
    assert(gomokuEngine.definition.id === 'GOMOKU', 'Gomoku engine ID matches');
    let gomokuState = gomokuEngine.initialize(mockPlayers);
    assert(gomokuState.board.length === 15 && gomokuState.board[0].length === 15, 'Gomoku board is 15x15');
    assert(gomokuState.turnPlayerId === 'uA', 'Black starts first');

    // Place stone at center [7, 7]
    let gomokuRes = gomokuEngine.applyAction(gomokuState, 'uA', { row: 7, col: 7 });
    assert(gomokuRes.success, 'Player A places stone at [7, 7]');
    assert(gomokuRes.state.board[7][7] === 'B', 'Stone [7, 7] is Black');

    // Occupied cell rejection
    let threwOccupied = false;
    try {
      gomokuEngine.validateAction(gomokuRes.state, 'uB', { row: 7, col: 7 });
    } catch {
      threwOccupied = true;
    }
    assert(threwOccupied, 'Reject placement on occupied cell [7, 7]');

    // Test 5-in-a-row win
    let winStateGomoku = gomokuEngine.initialize(mockPlayers);
    // Alternate 5 in a row for Black at row 7, cols 0..4
    for (let c = 0; c < 4; c++) {
      winStateGomoku = gomokuEngine.applyAction(winStateGomoku, 'uA', { row: 7, col: c }).state;
      winStateGomoku = gomokuEngine.applyAction(winStateGomoku, 'uB', { row: 8, col: c }).state;
    }
    winStateGomoku = gomokuEngine.applyAction(winStateGomoku, 'uA', { row: 7, col: 4 }).state; // 5th stone!
    assert(winStateGomoku.winnerId === 'uA', 'Gomoku 5-in-a-row win detected for Player A');
    assert(winStateGomoku.winningLine !== null && winStateGomoku.winningLine.length === 5, 'Winning line contains exactly 5 coordinates');

    // =========================================================================
    // Game 4: Checkers / Draughts
    // =========================================================================
    console.log('\n--- Game 4: Checkers (CHECKERS) ---');
    const checkEngine = new CheckersEngine();
    assert(checkEngine.definition.id === 'CHECKERS', 'Checkers engine ID matches');
    let checkState = checkEngine.initialize(mockPlayers);
    assert(checkState.counts.R === 12 && checkState.counts.B === 12, '12 pieces for Red and 12 pieces for Black');
    assert(checkState.turnPlayerId === 'uA', 'Red moves first');
    assert(checkState.validMoves.length > 0, 'Initial valid diagonal moves computed');

    // Execute first legal move
    const firstMove = checkState.validMoves[0];
    let checkRes = checkEngine.applyAction(checkState, 'uA', {
      from: firstMove.from,
      to: firstMove.to,
    });
    assert(checkRes.success, 'Execute first legal checkers move');
    assert(checkRes.state.board[firstMove.to[0]][firstMove.to[1]] === 'R', 'Piece placed at destination');
    assert(checkRes.state.board[firstMove.from[0]][firstMove.from[1]] === null, 'Source cell cleared');
    assert(checkRes.state.turnPlayerId === 'uB', 'Turn passed to Black');

    // Test Jump Capture
    const captureBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    captureBoard[4][4] = 'R'; // Red piece
    captureBoard[3][3] = 'B'; // Black piece adjacent
    // Red can jump over Black from [4, 4] to [2, 2]
    const jumpMoves = checkEngine.calculateValidMoves(captureBoard, 'R');
    assert(jumpMoves.length === 1 && jumpMoves[0].captured !== undefined, 'Capture jump detected');
    assert(jumpMoves[0].to[0] === 2 && jumpMoves[0].to[1] === 2, 'Jump lands at [2, 2]');
    assert(jumpMoves[0].captured[0] === 3 && jumpMoves[0].captured[1] === 3, 'Captured piece at [3, 3]');

    // =========================================================================
    // Game 5: Chess Grandmaster
    // =========================================================================
    console.log('\n--- Game 5: Chess Grandmaster (CHESS) ---');
    const chessEngine = new ChessEngine();
    assert(chessEngine.definition.id === 'CHESS', 'Chess engine ID matches');
    let chessState = chessEngine.initialize(mockPlayers);
    assert(chessState.board.length === 8 && chessState.board[0].length === 8, 'Chess board is 8x8');
    assert(chessState.turnPlayerId === 'uA', 'White plays first');
    assert(chessState.board[6][4].type === 'P' && chessState.board[6][4].color === 'W', 'King pawn at e2 (row 6, col 4)');

    // 1. e4 (move White pawn from [6, 4] to [4, 4])
    let chessRes = chessEngine.applyAction(chessState, 'uA', {
      from: [6, 4],
      to: [4, 4],
    });
    assert(chessRes.success, 'White plays 1. e4 ([6, 4] -> [4, 4])');
    assert(chessRes.state.board[4][4].type === 'P', 'Pawn at e4');
    assert(chessRes.state.board[6][4] === null, 'e2 square cleared');
    assert(chessRes.state.turnColor === 'B', 'Turn passed to Black');

    // 1... e5 (move Black pawn from [1, 4] to [3, 4])
    chessRes = chessEngine.applyAction(chessRes.state, 'uB', {
      from: [1, 4],
      to: [3, 4],
    });
    assert(chessRes.success, 'Black responds 1... e5 ([1, 4] -> [3, 4])');

    // 2. Nf3 (move White Knight from [7, 6] to [5, 5])
    chessRes = chessEngine.applyAction(chessRes.state, 'uA', {
      from: [7, 6],
      to: [5, 5],
    });
    assert(chessRes.success, 'White plays 2. Nf3 ([7, 6] -> [5, 5])');
    assert(chessRes.state.board[5][5].type === 'N', 'Knight at f3');

    // Test Fool\'s Mate Checkmate detection
    let mateState = chessEngine.initialize(mockPlayers);
    // 1. f3 e5 2. g4 Qh4# (Fool's Mate)
    mateState = chessEngine.applyAction(mateState, 'uA', { from: [6, 5], to: [5, 5] }).state; // 1. f3
    mateState = chessEngine.applyAction(mateState, 'uB', { from: [1, 4], to: [3, 4] }).state; // 1... e5
    mateState = chessEngine.applyAction(mateState, 'uA', { from: [6, 6], to: [4, 6] }).state; // 2. g4
    mateState = chessEngine.applyAction(mateState, 'uB', { from: [0, 3], to: [4, 7] }).state; // 2... Qh4#

    assert(mateState.inCheck === true, 'White is in check');
    assert(mateState.winnerId === 'uB', 'Black wins by Fool\'s Mate checkmate!');

    // =========================================================================
    // Scenario 6: Socket.IO & MatchManager End-to-End Match Launch
    // =========================================================================
    console.log('\n--- Scenario 6: Real-Time Socket.IO & MatchManager End-to-End ---');
    const timestamp = Date.now().toString().slice(-6);
    const regA = await request('/auth/register', 'POST', {
      username: `bg1_${timestamp}`,
      email: `bg1_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Board King A',
    });
    const regB = await request('/auth/register', 'POST', {
      username: `bg2_${timestamp}`,
      email: `bg2_${timestamp}@example.com`,
      password: 'Password123!',
      displayName: 'Board King B',
    });

    const tokenA = regA.data.token;
    const tokenB = regB.data.token;

    // Test Match Launch for Connect Four
    const roomC4 = await request('/rooms', 'POST', { gameType: 'CONNECT_FOUR', isPrivate: false }, tokenA);
    const codeC4 = roomC4.data.code;
    await request(`/rooms/${codeC4}/join`, 'POST', {}, tokenB);
    await request(`/rooms/${codeC4}/ready`, 'POST', { isReady: true }, tokenB);
    const launchC4 = await request(`/rooms/${codeC4}/start`, 'POST', {}, tokenA);
    assert(launchC4.status === 200, 'Host launches Connect Four match');

    // Test Active match API
    const activeC4 = await request(`/games/active/${codeC4}`, 'GET', null, tokenA);
    assert(activeC4.status === 200 && activeC4.data.gameType === 'CONNECT_FOUR', 'GET /games/active/:code returns CONNECT_FOUR');

    // Test Match Launch for Chess
    const roomChess = await request('/rooms', 'POST', { gameType: 'CHESS', isPrivate: false }, tokenA);
    const codeChess = roomChess.data.code;
    await request(`/rooms/${codeChess}/join`, 'POST', {}, tokenB);
    await request(`/rooms/${codeChess}/ready`, 'POST', { isReady: true }, tokenB);
    const launchChess = await request(`/rooms/${codeChess}/start`, 'POST', {}, tokenA);
    assert(launchChess.status === 200, 'Host launches Chess match');

    const activeChess = await request(`/games/active/${codeChess}`, 'GET', null, tokenA);
    assert(activeChess.status === 200 && activeChess.data.gameType === 'CHESS', 'GET /games/active/:code returns CHESS');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n======================================================');
    console.log(`Board Game Expansion I Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 Test suite unexpected error:', err);
    process.exit(1);
  }
}

runTests();
