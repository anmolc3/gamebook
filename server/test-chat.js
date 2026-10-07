/**
 * Chat & Direct Messaging Automated Test Suite
 * Tests 1-to-1 conversation lifecycle, text messaging, in-chat game invites,
 * unread badges, delivery and read receipts, and real-time Socket.IO synchronization.
 */

const { io: ioClient } = require('socket.io-client');

const BASE_URL = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function registerUser(prefix) {
  const nonce = Date.now().toString().slice(-5) + Math.floor(Math.random() * 1000);
  const creds = {
    username: `${prefix}_${nonce}`,
    email: `${prefix}_${nonce}@example.com`,
    password: 'Password123!',
    displayName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Gamer`,
  };
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(creds),
  });
  if (!reg.ok || !reg.data?.data) {
    throw new Error(`Failed to register ${prefix}: ${JSON.stringify(reg.data)}`);
  }
  return { ...reg.data.data.user, token: reg.data.data.token };
}

async function runChatTests() {
  console.log('🧪 Starting Private Chat & Direct Messaging Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Setup Players
  console.log('--- Scenario 1: Setup Test Accounts ---');
  const playerA = await registerUser('chata');
  const playerB = await registerUser('chatb');
  const playerC = await registerUser('chatc');
  assert(playerA.id && playerB.id && playerC.id, 'Register Player A, Player B, and Stranger Player C');

  // 2. Start Conversation
  console.log('\n--- Scenario 2: Create / Retrieve 1-on-1 Conversation ---');
  const createConvRes = await request(`/chat/conversations/${playerB.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
  });
  assert(createConvRes.status === 200 && createConvRes.data.success, 'Player A creates conversation with Player B');
  const convId = createConvRes.data?.data?.id;
  assert(!!convId, 'Conversation ID generated successfully');
  assert(createConvRes.data?.data?.peer?.id === playerB.id, 'Peer correctly assigned to Player B');

  // Idempotency check: calling again returns the same conversation
  const repeatConvRes = await request(`/chat/conversations/${playerB.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
  });
  assert(repeatConvRes.data?.data?.id === convId, 'Idempotent conversation retrieval (same conversation ID)');

  // Cannot start conversation with self
  const selfConvRes = await request(`/chat/conversations/${playerA.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
  });
  assert(selfConvRes.status === 400, 'Reject conversation with self (400 Bad Request)');

  // 3. Send Text Message
  console.log('\n--- Scenario 3: Send Message & Inbox Status ---');
  const sendMsgRes = await request(`/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
    body: JSON.stringify({
      content: 'Hello Bob! Ready for a Tic-Tac-Toe rematch?',
      type: 'TEXT',
    }),
  });
  assert(sendMsgRes.status === 201 && sendMsgRes.data.success, 'Player A sends text message');
  const msg1 = sendMsgRes.data?.data;
  assert(msg1?.content === 'Hello Bob! Ready for a Tic-Tac-Toe rematch?', 'Message content matches payload');
  assert(msg1?.senderId === playerA.id, 'Message senderId matches Player A');
  assert(msg1?.status === 'SENT', 'Initial message status is SENT (recipient offline)');

  // Reject empty message
  const emptyMsgRes = await request(`/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
    body: JSON.stringify({ content: '   ' }),
  });
  assert(emptyMsgRes.status === 400, 'Reject empty message content (400 Bad Request)');

  // 4. Conversation List & Unread Badges
  console.log('\n--- Scenario 4: Conversation Listing & Unread Counters ---');
  const bobInbox = await request('/chat/conversations', {
    headers: { Authorization: `Bearer ${playerB.token}` },
  });
  assert(bobInbox.status === 200, 'Player B retrieves conversations list');
  const convForBob = bobInbox.data?.data?.find((c) => c.id === convId);
  assert(!!convForBob, 'Conversation appears in Player B inbox');
  assert(convForBob?.unreadCount === 1, 'Unread message count is 1 for Player B');
  assert(convForBob?.lastMessage?.content === 'Hello Bob! Ready for a Tic-Tac-Toe rematch?', 'Last message preview matches');
  assert(convForBob?.peer?.id === playerA.id, 'Peer in inbox is Player A');

  // 5. Read Receipt Lifecycle
  console.log('\n--- Scenario 5: Read Receipts & Message Fetching ---');
  const bobMessages = await request(`/chat/conversations/${convId}/messages`, {
    headers: { Authorization: `Bearer ${playerB.token}` },
  });
  assert(bobMessages.status === 200, 'Player B reads conversation messages');
  assert(bobMessages.data?.data?.length === 1, 'Contains 1 message');
  assert(bobMessages.data?.data?.[0]?.status === 'READ', 'Incoming message automatically transitioned to READ');

  // Verify Player B unread count cleared
  const bobInboxAfter = await request('/chat/conversations', {
    headers: { Authorization: `Bearer ${playerB.token}` },
  });
  assert(bobInboxAfter.data?.data?.[0]?.unreadCount === 0, 'Unread message count drops to 0 after viewing');

  // 6. In-Chat Game Invitation Card
  console.log('\n--- Scenario 6: In-Chat Game Invitation Message ---');
  const gameInvitePayload = {
    content: 'Challenge: Tic-Tac-Toe Arena',
    type: 'GAME_INVITE',
    metadata: {
      gameType: 'TICTACTOE',
      roomCode: 'TTT-7722',
      betAmount: 0,
      mode: 'RANKED',
    },
  };
  const inviteRes = await request(`/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerB.token}` },
    body: JSON.stringify(gameInvitePayload),
  });
  assert(inviteRes.status === 201, 'Player B sends in-chat GAME_INVITE message');
  const inviteMsg = inviteRes.data?.data;
  assert(inviteMsg?.type === 'GAME_INVITE', 'Message type is GAME_INVITE');
  assert(inviteMsg?.metadata?.roomCode === 'TTT-7722', 'Game invite metadata contains roomCode TTT-7722');
  assert(inviteMsg?.metadata?.gameType === 'TICTACTOE', 'Game invite metadata specifies TICTACTOE');

  // 7. Security: Unauthorized Member Access
  console.log('\n--- Scenario 7: Unauthorized Access Protection ---');
  const strangerFetch = await request(`/chat/conversations/${convId}/messages`, {
    headers: { Authorization: `Bearer ${playerC.token}` },
  });
  assert(strangerFetch.status === 404 || strangerFetch.status === 400, 'Block non-member Player C from viewing conversation');

  const strangerSend = await request(`/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerC.token}` },
    body: JSON.stringify({ content: 'Intruder message' }),
  });
  assert(strangerSend.status === 400 || strangerSend.status === 404, 'Block non-member Player C from posting message');

  // 8. Real-Time Socket Synchronization
  console.log('\n--- Scenario 8: Socket.IO Real-Time Delivery & Typing Indicator ---');
  const socketA = ioClient(SOCKET_URL, {
    auth: { token: playerA.token },
    transports: ['websocket'],
  });
  const socketB = ioClient(SOCKET_URL, {
    auth: { token: playerB.token },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve) => socketA.on('connection:established', resolve)),
    new Promise((resolve) => socketB.on('connection:established', resolve)),
  ]);
  assert(socketA.connected && socketB.connected, 'Sockets connected for Player A and Player B');

  // Both join conversation room with ack
  await Promise.all([
    new Promise((resolve) => socketA.emit('chat:join', { conversationId: convId }, resolve)),
    new Promise((resolve) => socketB.emit('chat:join', { conversationId: convId }, resolve)),
  ]);

  // Test Typing Indicator
  const typingPromise = new Promise((resolve) => {
    socketB.on('chat:user_typing', (data) => {
      resolve(data);
    });
  });

  socketA.emit('chat:typing', { conversationId: convId, isTyping: true });
  const typingData = await typingPromise;
  assert(
    typingData?.conversationId === convId && typingData?.isTyping === true && typingData?.userId === playerA.id,
    'Player B receives real-time typing indicator from Player A'
  );

  // Test Real-time Message Reception
  const realTimeMsgPromise = new Promise((resolve) => {
    socketB.on('chat:message_received', (data) => {
      resolve(data);
    });
  });

  await request(`/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${playerA.token}` },
    body: JSON.stringify({ content: 'Real-time sync test message' }),
  });

  const receivedRealTime = await realTimeMsgPromise;
  assert(
    receivedRealTime?.content === 'Real-time sync test message',
    'Player B receives real-time message event via Socket.IO'
  );
  assert(receivedRealTime?.status === 'DELIVERED', 'Message status marked as DELIVERED because recipient was online');

  socketA.disconnect();
  socketB.disconnect();

  // Final Summary
  console.log('\n=========================================');
  console.log(`📊 Chat Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runChatTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
