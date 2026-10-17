/**
 * Automated Test Suite for "Who Can Add Me to Groups" Privacy Setting
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

async function runGroupPrivacyTests() {
  console.log('🧪 Starting Group Add Privacy Automated Test Suite...\n');
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

  // 1. Setup accounts
  console.log('--- Step 1: Register Accounts ---');
  const userA = {
    username: `priv_user_a_${nonce}`,
    email: `priv_user_a_${nonce}@test.com`,
    password: 'Password123!',
    displayName: 'User A',
  };
  const userB = {
    username: `priv_user_b_${nonce}`,
    email: `priv_user_b_${nonce}@test.com`,
    password: 'Password123!',
    displayName: 'User B',
  };

  const regA = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userA),
  });
  assert(regA.status === 201, 'Register User A');
  const tokenA = regA.data.data.token;
  const userAId = regA.data.data.user.id;

  const regB = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userB),
  });
  assert(regB.status === 201, 'Register User B');
  const tokenB = regB.data.data.token;
  const userBId = regB.data.data.user.id;

  // 2. Verify default groupAddPrivacy
  console.log('\n--- Step 2: Verify Initial Group Privacy ---');
  const meA = await request('/profiles/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(meA.status === 200, 'User A fetches own profile');
  assert(meA.data.data.groupAddPrivacy === 'EVERYONE', 'Default groupAddPrivacy is EVERYONE');

  // 3. User A updates to NOBODY
  console.log('\n--- Step 3: Update groupAddPrivacy to NOBODY ---');
  const updateToNobody = await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ groupAddPrivacy: 'NOBODY' }),
  });
  assert(updateToNobody.status === 200, 'User A updates privacy to NOBODY');
  assert(updateToNobody.data.data.groupAddPrivacy === 'NOBODY', 'Profile response reflects NOBODY');

  // 4. User B tries to create a group adding User A -> should FAIL
  console.log('\n--- Step 4: User B Attempts to Create Group with User A (NOBODY) ---');
  const createGroupNobody = await request('/chat/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Secret Club',
      memberIds: [userAId],
    }),
  });
  assert(createGroupNobody.status === 400, 'Creating group with NOBODY privacy user is rejected (400)');
  assert(
    createGroupNobody.data?.error?.message?.includes('privacy settings'),
    'Error message explains privacy restriction',
    createGroupNobody.data?.error?.message
  );

  // 5. User A updates to MY_FRIENDS
  console.log('\n--- Step 5: Update groupAddPrivacy to MY_FRIENDS ---');
  const updateToFriends = await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ groupAddPrivacy: 'MY_FRIENDS' }),
  });
  assert(updateToFriends.status === 200, 'User A updates privacy to MY_FRIENDS');
  assert(updateToFriends.data.data.groupAddPrivacy === 'MY_FRIENDS', 'Profile reflects MY_FRIENDS');

  // 6. User B tries to add User A when not friends -> should FAIL
  console.log('\n--- Step 6: User B Attempts to Add User A Before Friending (MY_FRIENDS) ---');
  const createGroupNotFriend = await request('/chat/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Friend Club',
      memberIds: [userAId],
    }),
  });
  assert(createGroupNotFriend.status === 400, 'Creating group fails when not friends (400)');
  assert(
    createGroupNotFriend.data?.error?.message?.includes('privacy settings'),
    'Error message explains privacy restriction',
    createGroupNotFriend.data?.error?.message
  );

  // 7. Make them friends
  console.log('\n--- Step 7: Connect as Friends ---');
  const sendReq = await request(`/friends/request/${userAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(sendReq.status === 201, 'User B sends friend request to User A');
  const reqId = sendReq.data?.data?.requestId;

  const acceptReq = await request(`/friends/request/${reqId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(acceptReq.status === 200, 'User A accepts friend request');

  // 8. Now User B creates group with User A -> should SUCCEED
  console.log('\n--- Step 8: User B Creates Group with User A (Now Friends) ---');
  const createGroupAsFriend = await request('/chat/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      title: 'Gamer Squad',
      memberIds: [userAId],
    }),
  });
  assert(createGroupAsFriend.status === 201, 'Creating group with friend succeeds (201)');
  const groupId = createGroupAsFriend.data.data.id;

  // 9. Register User C
  const userC = {
    username: `priv_user_c_${nonce}`,
    email: `priv_user_c_${nonce}@test.com`,
    password: 'Password123!',
    displayName: 'User C',
  };
  const regC = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userC),
  });
  const userCId = regC.data.data.user.id;
  const tokenC = regC.data.data.token;

  // User C sets NOBODY
  await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ groupAddPrivacy: 'NOBODY' }),
  });

  // 10. Admin User B tries to add User C to existing group -> should FAIL
  console.log('\n--- Step 9: User B Attempts to Add User C (NOBODY) to Existing Group ---');
  const addMemberNobody = await request(`/chat/groups/${groupId}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      memberIds: [userCId],
    }),
  });
  assert(addMemberNobody.status === 400, 'Adding NOBODY privacy user to existing group is rejected (400)');
  assert(
    addMemberNobody.data?.error?.message?.includes('privacy settings'),
    'Error message explains privacy restriction',
    addMemberNobody.data?.error?.message
  );

  // 11. User C changes to EVERYONE
  console.log('\n--- Step 10: User C Updates to EVERYONE and is Added ---');
  await request('/profiles/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ groupAddPrivacy: 'EVERYONE' }),
  });

  const addMemberEveryone = await request(`/chat/groups/${groupId}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      memberIds: [userCId],
    }),
  });
  assert(addMemberEveryone.status === 200, 'Adding EVERYONE user to existing group succeeds (200)');

  console.log('\n=========================================');
  console.log(`📊 Group Privacy Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================');
}

runGroupPrivacyTests();
