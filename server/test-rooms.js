const ioClient = require('socket.io-client');

const API_BASE = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedAssertions++;
  }
}

async function runRoomTests() {
  console.log('🧪 Starting Multiplayer Game Rooms & Lobbies Automated Test Suite...\n');

  const stamp = Date.now().toString().slice(-6);
  const playerAEmail = `room_host_${stamp}@example.com`;
  const playerBEmail = `room_opp_${stamp}@example.com`;
  const playerCEmail = `room_extra_${stamp}@example.com`;

  let tokenA, tokenB, tokenC;
  let userA, userB, userC;
  let roomCode;

  // --- Scenario 1: Register Accounts ---
  console.log('--- Scenario 1: Setup Test Accounts ---');
  try {
    const resA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: playerAEmail,
        username: `host_${stamp}`,
        displayName: 'Host Player',
        password: 'Password123!',
      }),
    });
    const dataA = await resA.json();
    tokenA = dataA.data.token;
    userA = dataA.data.user;

    const resB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: playerBEmail,
        username: `opp_${stamp}`,
        displayName: 'Opponent Player',
        password: 'Password123!',
      }),
    });
    const dataB = await resB.json();
    tokenB = dataB.data.token;
    userB = dataB.data.user;

    const resC = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: playerCEmail,
        username: `extra_${stamp}`,
        displayName: 'Extra Player',
        password: 'Password123!',
      }),
    });
    const dataC = await resC.json();
    tokenC = dataC.data.token;
    userC = dataC.data.user;

    assert(tokenA && tokenB && tokenC, 'Register Host, Opponent, and Extra Player successfully');
  } catch (err) {
    console.error('Fatal in setup:', err);
    return;
  }

  // --- Scenario 2: Create Multiplayer Room ---
  console.log('\n--- Scenario 2: Create Multiplayer Room ---');
  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        gameType: 'TICTACTOE',
        isPrivate: true,
        maxPlayers: 2,
      }),
    });
    const body = await res.json();
    assert(res.status === 201, 'Host creates room with HTTP 201');
    assert(body.data && body.data.code && body.data.code.length === 6, 'Generated 6-character room code');
    assert(body.data.hostId === userA.id, 'Host ID assigned to Player A');
    assert(body.data.status === 'WAITING', 'Initial room status is WAITING');
    assert(body.data.players.length === 1, 'Room contains 1 player (Host)');
    assert(body.data.players[0].slotIndex === 0, 'Host occupies slot 0');
    assert(body.data.players[0].isReady === true, 'Host starts ready by default');

    roomCode = body.data.code;
  } catch (err) {
    console.error('Scenario 2 error:', err);
  }

  // --- Scenario 3: Retrieve Room State by Code ---
  console.log('\n--- Scenario 3: Get Room Details by Code ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const body = await res.json();
    assert(res.status === 200, 'Retrieve room details via GET /rooms/:code');
    assert(body.data.code === roomCode, 'Room code matches requested code');
    assert(body.data.gameType === 'TICTACTOE', 'Game type is TICTACTOE');
    assert(body.data.host.displayName === 'Host Player', 'Host profile returned in response');
  } catch (err) {
    console.error('Scenario 3 error:', err);
  }

  // --- Scenario 4: Opponent Joins Room via Code ---
  console.log('\n--- Scenario 4: Join Room via 6-Character Code ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const body = await res.json();
    assert(res.status === 200, 'Player B joins room with HTTP 200');
    assert(body.data.players.length === 2, 'Room now contains 2 players');
    const playerBInRoom = body.data.players.find((p) => p.userId === userB.id);
    assert(playerBInRoom !== undefined, 'Player B present in room players list');
    assert(playerBInRoom.slotIndex === 1, 'Player B assigned slot 1');
    assert(playerBInRoom.isReady === false, 'Player B initially not ready');

    // Idempotent join test
    const rejoinRes = await fetch(`${API_BASE}/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const rejoinBody = await rejoinRes.json();
    assert(rejoinRes.status === 200, 'Idempotent rejoin succeeds without duplicating player');
    assert(rejoinBody.data.players.length === 2, 'Player count remains 2 after rejoin');
  } catch (err) {
    console.error('Scenario 4 error:', err);
  }

  // --- Scenario 5: Capacity Enforcement (Room Full) ---
  console.log('\n--- Scenario 5: Capacity Enforcement ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const body = await res.json();
    assert(res.status === 400, 'Extra player rejected with HTTP 400');
    assert(body.error && body.error.message.includes('full'), 'Error message confirms room is full');
  } catch (err) {
    console.error('Scenario 5 error:', err);
  }

  // --- Scenario 6: Ready State Synchronization ---
  console.log('\n--- Scenario 6: Ready State Toggle ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ isReady: true }),
    });
    const body = await res.json();
    assert(res.status === 200, 'Player B toggles ready to true');
    const playerBInRoom = body.data.players.find((p) => p.userId === userB.id);
    assert(playerBInRoom.isReady === true, 'Player B ready state is now true');
  } catch (err) {
    console.error('Scenario 6 error:', err);
  }

  // --- Scenario 7: Non-Host Cannot Launch Match ---
  console.log('\n--- Scenario 7: Host Controls Enforcement ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const body = await res.json();
    assert(res.status === 400, 'Non-host launch attempt rejected with HTTP 400');
    assert(body.error && body.error.message.includes('Only the room host'), 'Host permission error enforced');
  } catch (err) {
    console.error('Scenario 7 error:', err);
  }

  // --- Scenario 8: Host Starts Match ---
  console.log('\n--- Scenario 8: Host Launches Match ---');
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    assert(res.status === 200, 'Host starts match with HTTP 200');
    assert(body.data.status === 'PLAYING', 'Room status transitioned to PLAYING');
  } catch (err) {
    console.error('Scenario 8 error:', err);
  }

  // --- Scenario 9: Public Matchmaking Queue ---
  console.log('\n--- Scenario 9: Public Matchmaking Queue ---');
  try {
    // Player A queues for matchmaking (creates waiting room)
    const queueResA = await fetch(`${API_BASE}/rooms/matchmake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ gameType: 'TICTACTOE' }),
    });
    const queueDataA = await queueResA.json();
    assert(queueResA.status === 200, 'Player A enters matchmaking queue');
    assert(queueDataA.data.room && queueDataA.data.room.code, 'Matchmaking room generated for Player A');
    assert(queueDataA.data.room.isPrivate === false, 'Room marked as public (isPrivate: false)');

    const publicCode = queueDataA.data.room.code;

    // Player B queues for matchmaking (should automatically pair with Player A's room)
    const queueResB = await fetch(`${API_BASE}/rooms/matchmake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ gameType: 'TICTACTOE' }),
    });
    const queueDataB = await queueResB.json();
    assert(queueResB.status === 200, 'Player B enters matchmaking queue');
    assert(queueDataB.data.matched === true, 'Player B matched into existing public room');
    assert(queueDataB.data.room.code === publicCode, 'Player B joined Player A public room');
    assert(queueDataB.data.room.players.length === 2, 'Matched room now has 2 players');
  } catch (err) {
    console.error('Scenario 9 error:', err);
  }

  // --- Scenario 10: Real-Time Socket.IO Synchronization & Disconnect Grace ---
  console.log('\n--- Scenario 10: Socket.IO Lobby Events & Disconnect Grace Window ---');
  await new Promise((resolve) => {
    let socketA, socketB;

    socketA = ioClient(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    socketB = ioClient(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    let socketAConnected = false;
    let socketBConnected = false;

    function checkReady() {
      if (socketAConnected && socketBConnected) {
        runSocketFlow();
      }
    }

    socketA.on('connect', () => {
      socketAConnected = true;
      checkReady();
    });

    socketB.on('connect', () => {
      socketBConnected = true;
      checkReady();
    });

    function runSocketFlow() {
      assert(true, 'Sockets connected for Player A and Player B');

      // Create a fresh test room for socket testing
      fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ gameType: 'TICTACTOE', maxPlayers: 2 }),
      })
        .then((r) => r.json())
        .then(({ data: testRoom }) => {
          const testCode = testRoom.code;

          // Socket A joins room
          socketA.emit('room:join', { roomCode: testCode }, () => {
            // Socket B listens for player join
            socketA.on('room:player_joined', (payload) => {
              assert(payload.roomCode === testCode, 'Host receives room:player_joined via WebSocket');
            });

            // Socket A listens for disconnect grace
            socketA.on('room:player_disconnected', (payload) => {
              assert(payload.userId === userB.id, 'Host receives room:player_disconnected event');
              assert(payload.graceSeconds === 30, 'Grace period specified as 30 seconds');

              socketA.disconnect();
              resolve();
            });

            // Player B joins via HTTP (which triggers socket emission)
            fetch(`${API_BASE}/rooms/${testCode}/join`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${tokenB}` },
            })
              .then(() => {
                // Socket B joins socket room
                socketB.emit('room:join', { roomCode: testCode }, () => {
                  // Simulate unexpected disconnect for Player B
                  setTimeout(() => {
                    socketB.disconnect();
                  }, 200);
                });
              });
          });
        });
    }
  });

  console.log('\n=========================================');
  console.log(`📊 Room Test Results: ${passedAssertions} Passed, ${failedAssertions} Failed`);
  console.log('=========================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runRoomTests().catch(console.error);
