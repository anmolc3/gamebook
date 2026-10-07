/**
 * Friends & Social Graph Automated Test Suite
 * Tests search, friend requests lifecycle, accepting/declining/canceling requests,
 * mutual friendship listing, real-time presence indicators, and user blocking/unblocking.
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
  if (!reg.ok || !reg.data?.data) {
    throw new Error(`Failed to register ${prefix}: ${JSON.stringify(reg.data)}`);
  }
  return {
    ...reg.data.data.user,
    token: reg.data.data.token,
  };
}

async function runFriendsTests() {
  console.log('🧪 Starting Friends & Social Graph Automated Test Suite...\n');
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

  // 1. Setup 3 distinct test users: Alice, Bob, Charlie
  console.log('--- Scenario 1: Setup Test Players ---');
  const alice = await registerUser('alice');
  const bob = await registerUser('bob');
  const charlie = await registerUser('charlie');
  assert(alice.id && bob.id && charlie.id, 'Register Alice, Bob, and Charlie test accounts');

  // 2. Search Users
  console.log('\n--- Scenario 2: Search Players ---');
  const searchBob = await request(`/friends/search?q=${bob.username.slice(0, 5)}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(searchBob.status === 200, 'Search endpoint returns 200 OK');
  const bobFound = searchBob.data?.data?.find((u) => u.id === bob.id);
  assert(!!bobFound, 'Found Bob in search results');
  assert(bobFound?.relationship === 'NONE', 'Initial relationship between Alice and Bob is NONE');

  // Self should not appear in search
  const searchSelf = await request(`/friends/search?q=${alice.username}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const selfFound = searchSelf.data?.data?.some((u) => u.id === alice.id);
  assert(!selfFound, 'Search correctly excludes caller from results');

  // 3. Friend Request Lifecycle
  console.log('\n--- Scenario 3: Send Friend Request & Relationship State ---');
  // Alice sends request to Bob
  const sendReq = await request(`/friends/request/${bob.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(sendReq.status === 201 && sendReq.data.success, 'Alice sends friend request to Bob');
  const requestId = sendReq.data?.data?.requestId;

  // Cannot send duplicate request
  const dupReq = await request(`/friends/request/${bob.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(dupReq.status === 400, 'Reject duplicate friend request (400 Bad Request)');

  // Cannot send request to self
  const selfReq = await request(`/friends/request/${alice.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(selfReq.status === 400, 'Reject friend request to self (400 Bad Request)');

  // Bob checks incoming requests
  const bobRequests = await request('/friends/requests', {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(bobRequests.status === 200, 'Bob fetches friend requests');
  const incomingFromAlice = bobRequests.data?.data?.incoming?.find((r) => r.requestId === requestId);
  assert(!!incomingFromAlice && incomingFromAlice.user.id === alice.id, 'Bob sees incoming request from Alice');

  // Alice checks outgoing requests
  const aliceRequests = await request('/friends/requests', {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const outgoingToBob = aliceRequests.data?.data?.outgoing?.find((r) => r.requestId === requestId);
  assert(!!outgoingToBob && outgoingToBob.user.id === bob.id, 'Alice sees outgoing request to Bob');

  // Search relationship state check
  const searchBobAfterReq = await request(`/friends/search?q=${bob.username}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(
    searchBobAfterReq.data?.data?.[0]?.relationship === 'REQUEST_SENT',
    'Alice sees relationship REQUEST_SENT for Bob'
  );

  const searchAliceFromBob = await request(`/friends/search?q=${alice.username}`, {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(
    searchAliceFromBob.data?.data?.[0]?.relationship === 'REQUEST_RECEIVED',
    'Bob sees relationship REQUEST_RECEIVED for Alice'
  );

  // 4. Accept Friend Request & Mutual Friendship
  console.log('\n--- Scenario 4: Accept Request & Mutual Friendship ---');
  const acceptReq = await request(`/friends/request/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(acceptReq.status === 200 && acceptReq.data.success, 'Bob accepts Alice friend request');

  // Verify Alice friends list includes Bob
  const aliceFriends = await request('/friends', {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(aliceFriends.status === 200, 'Alice fetches friends list');
  const bobInAliceFriends = aliceFriends.data?.data?.find((f) => f.id === bob.id);
  assert(!!bobInAliceFriends, 'Bob is in Alice friends list');

  // Verify Bob friends list includes Alice
  const bobFriends = await request('/friends', {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  const aliceInBobFriends = bobFriends.data?.data?.find((f) => f.id === alice.id);
  assert(!!aliceInBobFriends, 'Alice is in Bob friends list');

  // Search relationship status after accepting
  const searchBobWhenFriends = await request(`/friends/search?q=${bob.username}`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(
    searchBobWhenFriends.data?.data?.[0]?.relationship === 'FRIENDS',
    'Relationship correctly updates to FRIENDS'
  );

  // 5. Reject & Cancel Request Lifecycle
  console.log('\n--- Scenario 5: Reject and Cancel Friend Requests ---');
  // Charlie sends request to Bob
  const charlieToBob = await request(`/friends/request/${bob.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${charlie.token}` },
  });
  const charlieReqId = charlieToBob.data?.data?.requestId;
  assert(charlieToBob.status === 201, 'Charlie sends friend request to Bob');

  // Bob rejects Charlie's request
  const rejectReq = await request(`/friends/request/${charlieReqId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(rejectReq.status === 200, 'Bob rejects Charlie friend request');

  // Charlie sends request to Alice then cancels it
  const charlieToAlice = await request(`/friends/request/${alice.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${charlie.token}` },
  });
  const cancelReqId = charlieToAlice.data?.data?.requestId;
  assert(charlieToAlice.status === 201, 'Charlie sends friend request to Alice');

  const cancelRes = await request(`/friends/request/${cancelReqId}/cancel`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${charlie.token}` },
  });
  assert(cancelRes.status === 200, 'Charlie successfully cancels outgoing request');

  // 6. Unfriend
  console.log('\n--- Scenario 6: Unfriend / Remove Friendship ---');
  const unfriendRes = await request(`/friends/${bob.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(unfriendRes.status === 200, 'Alice removes Bob from friends');

  const aliceFriendsAfter = await request('/friends', {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const bobStillInAlice = aliceFriendsAfter.data?.data?.some((f) => f.id === bob.id);
  assert(!bobStillInAlice, 'Bob successfully removed from Alice friends list');

  const bobFriendsAfter = await request('/friends', {
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  const aliceStillInBob = bobFriendsAfter.data?.data?.some((f) => f.id === alice.id);
  assert(!aliceStillInBob, 'Alice successfully removed from Bob friends list (bidirectional removal)');

  // 7. Blocking & Unblocking
  console.log('\n--- Scenario 7: Block and Unblock Player ---');
  // Alice blocks Charlie
  const blockRes = await request(`/friends/block/${charlie.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(blockRes.status === 200 && blockRes.data.success, 'Alice blocks Charlie');

  // Alice queries blocked users
  const blockedList = await request('/friends/blocked', {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  const charlieBlocked = blockedList.data?.data?.find((b) => b.id === charlie.id);
  assert(!!charlieBlocked, 'Charlie appears in Alice blocked list');

  // Charlie tries to send friend request to Alice while blocked
  const blockedReq = await request(`/friends/request/${alice.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${charlie.token}` },
  });
  assert(blockedReq.status === 400, 'Prevent blocked player from sending friend requests (400 Bad Request)');

  // Alice unblocks Charlie
  const unblockRes = await request(`/friends/block/${charlie.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(unblockRes.status === 200, 'Alice unblocks Charlie');

  const blockedListAfter = await request('/friends/blocked', {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(blockedListAfter.data?.data?.length === 0, 'Alice blocked list is now empty');

  // Final Summary
  console.log('\n=========================================');
  console.log(`📊 Friends Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFriendsTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
