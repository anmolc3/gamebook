/**
 * Profile API Test Suite
 * Tests Profile retrieval, profile updates, peer profile viewing, stats calculation,
 * and relationship status resolution between players.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

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

async function runProfileTests() {
  console.log('🧪 Starting Profile API Automated Test Suite...\n');
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

  const nonce = Date.now().toString().slice(-6);

  // 1. Setup: Register Player One and Player Two
  console.log('--- Scenario 1: Setup Test Accounts ---');
  const user1Creds = {
    username: `pro_gamer_${nonce}`,
    email: `progamer_${nonce}@example.com`,
    password: 'Password123!',
    displayName: 'Pro Gamer',
  };

  const user2Creds = {
    username: `casual_p2_${nonce}`,
    email: `casual_${nonce}@example.com`,
    password: 'Password123!',
    displayName: 'Casual Player',
  };

  const reg1 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(user1Creds),
  });
  assert(reg1.status === 201 && reg1.data.success, 'Register Player One account');
  const token1 = reg1.data.data.token;
  const user1Id = reg1.data.data.user.id;

  const reg2 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(user2Creds),
  });
  assert(reg2.status === 201 && reg2.data.success, 'Register Player Two account');
  const token2 = reg2.data.data.token;
  const user2Id = reg2.data.data.user.id;

  // 2. Fetch Own Profile (GET /profiles/me)
  console.log('\n--- Scenario 2: Fetch Own Profile ---');
  const myProfileRes = await request('/profiles/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token1}` },
  });

  assert(myProfileRes.status === 200, 'GET /profiles/me responds with 200 OK');
  const myProfile = myProfileRes.data?.data;
  assert(myProfile?.username === user1Creds.username, 'Profile username matches registered username');
  assert(myProfile?.displayName === user1Creds.displayName, 'Profile displayName matches initial setting');
  assert(myProfile?.stats?.matchesPlayed === 0, 'Initial matchesPlayed is 0');
  assert(myProfile?.stats?.winRate === 0, 'Initial winRate is 0%');
  assert(Array.isArray(myProfile?.achievements), 'Achievements list is an array');

  // 3. Update Own Profile (PUT /profiles/me)
  console.log('\n--- Scenario 3: Update Profile Information ---');
  const updatePayload = {
    displayName: 'Grandmaster Apex',
    bio: 'Multiplayer tactician & strategy master. Challenge me in Ludo or Tic-Tac-Toe!',
    avatarUrl: 'avatar_preset_05',
    themePreference: 'moonViolet',
    appearanceMode: 'dark',
  };

  const updateRes = await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(updatePayload),
  });

  assert(updateRes.status === 200, 'PUT /profiles/me returns 200 OK');
  const updatedData = updateRes.data?.data;
  assert(updatedData?.displayName === updatePayload.displayName, 'Display name successfully updated');
  assert(updatedData?.bio === updatePayload.bio, 'Bio successfully updated');
  assert(updatedData?.avatarUrl === updatePayload.avatarUrl, 'Avatar preset successfully updated');
  assert(updatedData?.themePreference === updatePayload.themePreference, 'Theme preference updated to moonViolet');

  // 4. View Peer Profile (GET /profiles/:userId)
  console.log('\n--- Scenario 4: Peer Profile & Relationship Status ---');
  const peerProfileRes = await request(`/profiles/${user1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token2}` },
  });

  assert(peerProfileRes.status === 200, 'Player Two views Player One profile successfully');
  const peerProfile = peerProfileRes.data?.data;
  assert(peerProfile?.displayName === 'Grandmaster Apex', 'Player Two sees updated display name');
  assert(peerProfile?.relationship === 'NONE', 'Relationship status correctly reports NONE between strangers');
  assert(peerProfile?.email === undefined, 'Sensitive field email is omitted from public profile');
  assert(peerProfile?.passwordHash === undefined, 'Sensitive field passwordHash is omitted');

  // 5. Validation and Edge Cases
  console.log('\n--- Scenario 5: Validation and Error Cases ---');
  // 5a. Unauthorized request without token
  const unauthRes = await request('/profiles/me', { method: 'GET' });
  assert(unauthRes.status === 401, 'Reject profile request without token (401 Unauthorized)');

  // 5b. Invalid bio length exceeding max 300 characters
  const tooLongBio = 'a'.repeat(301);
  const invalidBioRes = await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({ bio: tooLongBio }),
  });
  assert(invalidBioRes.status === 400, 'Reject profile update with bio > 300 characters (400 Bad Request)');

  // 5c. Query non-existent user profile
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const notFoundRes = await request(`/profiles/${fakeUserId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token1}` },
  });
  assert(notFoundRes.status === 404, 'Return 404 Not Found for non-existent player profile');

  // Final Summary
  console.log('\n=========================================');
  console.log(`📊 Profile Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProfileTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
