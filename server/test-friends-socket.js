/**
 * Friends & Presence Socket.IO Real-Time Test
 * Verifies that when a mutual friend connects or disconnects,
 * real-time presence events are emitted to their friends.
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
    displayName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Player`,
  };
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(creds),
  });
  return { ...reg.data.data.user, token: reg.data.data.token };
}

async function runSocketPresenceTest() {
  console.log('🧪 Starting Socket.IO Friends Real-Time Presence Test...\n');

  // 1. Create two users and make them friends
  const userA = await registerUser('sock_a');
  const userB = await registerUser('sock_b');

  // A sends request to B
  const sendRes = await request(`/friends/request/${userB.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const requestId = sendRes.data.data.requestId;

  // B accepts A's request
  await request(`/friends/request/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userB.token}` },
  });

  console.log('✅ Users registered and friendship established');

  // 2. Connect User A socket client
  const socketA = ioClient(SOCKET_URL, {
    auth: { token: userA.token },
    transports: ['websocket'],
  });

  await new Promise((resolve) => socketA.on('connection:established', resolve));
  console.log('✅ User A socket connected');

  // 3. User A listens for presence updates
  const presencePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for presence:update')), 7000);
    socketA.on('presence:update', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  // 4. Connect User B socket client (this should trigger presence:update to User A)
  const socketB = ioClient(SOCKET_URL, {
    auth: { token: userB.token },
    transports: ['websocket'],
  });

  await new Promise((resolve) => socketB.on('connection:established', resolve));
  console.log('✅ User B socket connected');

  const presenceEvent = await presencePromise;
  console.log('✅ User A received real-time presence event:', presenceEvent);

  if (presenceEvent.userId !== userB.id || presenceEvent.isOnline !== true) {
    throw new Error('Presence payload mismatch');
  }

  socketA.disconnect();
  socketB.disconnect();

  console.log('\n=========================================');
  console.log('📊 Real-Time Presence Test Passed Successfully!');
  console.log('=========================================\n');
}

runSocketPresenceTest().catch((err) => {
  console.error('❌ Socket Presence Test Failed:', err);
  process.exit(1);
});
