const { io } = require('socket.io-client');

async function runAuthTests() {
  console.log('🧪 Starting Phase 3 Authentication Test Suite...\n');

  const testUser = {
    email: `alex_${Date.now()}@example.com`,
    username: `alex_${Date.now().toString().slice(-6)}`,
    password: 'SecurePassword123!',
    displayName: 'Alex Rivera',
  };

  // 1. Test Registration
  console.log('1️⃣ Testing User Registration (POST /api/v1/auth/register)...');
  const regRes = await fetch('http://localhost:5000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201 || !regData.data?.token) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log('✅ Registration succeeded. User ID:', regData.data.user.id);
  const userToken = regData.data.token;

  // 2. Test Duplicate Registration
  console.log('2️⃣ Testing Duplicate Registration Rejection...');
  const dupRes = await fetch('http://localhost:5000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  if (dupRes.status !== 400) {
    throw new Error(`Expected 400 for duplicate user, got ${dupRes.status}`);
  }
  console.log('✅ Duplicate user correctly rejected with 400');

  // 3. Test Login
  console.log('3️⃣ Testing User Login (POST /api/v1/auth/login)...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: testUser.username,
      password: testUser.password,
    }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('✅ Login succeeded. Token received.');

  // 4. Test Invalid Credentials
  console.log('4️⃣ Testing Invalid Credentials Rejection...');
  const badLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: testUser.username,
      password: 'WrongPassword!',
    }),
  });
  if (badLoginRes.status !== 401) {
    throw new Error(`Expected 401 for invalid password, got ${badLoginRes.status}`);
  }
  console.log('✅ Invalid password correctly rejected with 401');

  // 5. Test Authenticated Profile Route (GET /api/v1/auth/me)
  console.log('5️⃣ Testing Authenticated Session (GET /api/v1/auth/me)...');
  const meRes = await fetch('http://localhost:5000/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const meData = await meRes.json();
  if (meRes.status !== 200 || meData.data?.user?.username !== testUser.username) {
    throw new Error(`GET /me failed: ${JSON.stringify(meData)}`);
  }
  console.log('✅ GET /me verified for user:', meData.data.user.displayName);

  // 6. Test Authenticated Socket.IO Handshake
  console.log('6️⃣ Testing Authenticated Socket.IO Handshake...');
  await new Promise((resolve, reject) => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      auth: { token: userToken },
    });

    socket.on('connection:established', (payload) => {
      console.log('✅ Socket.IO authenticated handshake received:', payload);
      if (payload.authenticated === true && payload.user?.username === testUser.username) {
        console.log('🎉 Socket successfully authenticated with user ID:', payload.user.userId);
        socket.disconnect();
        resolve(true);
      } else {
        reject(new Error(`Socket handshake failed authentication: ${JSON.stringify(payload)}`));
      }
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });

    setTimeout(() => reject(new Error('Socket handshake timed out')), 5000);
  });

  console.log('\n🌟 ALL 6 AUTHENTICATION TESTS PASSED CLEANLY! 🌟');
}

runAuthTests().catch((err) => {
  console.error('\n❌ Test failure:', err.message);
  process.exit(1);
});
