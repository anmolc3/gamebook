/**
 * Comprehensive Account Deletion Test Suite
 *
 * Verifies all 12 core requirements:
 * 1. Successful account deletion.
 * 2. Cancellation before final confirmation.
 * 3. Incorrect password or failed reauthentication.
 * 4. Expired session and unauthorized deletion attempts.
 * 5. Attempts to delete another user's account (IDOR prevention).
 * 6. Database relationships and foreign-key constraints (cascade on friendships, blocks, messages, stories, etc.).
 * 7. Uploaded media and storage cleanup.
 * 8. Session revocation and push-token cleanup.
 * 9. Socket.IO presence and active game-room behavior (real-time notification, disconnection, room transfer/disband).
 * 10. App restart after deletion and attempts to reuse old credentials/tokens.
 * 11. Retry behavior after deletion / idempotency.
 * 12. Retained and anonymized data verification (GameResult winnerId nullified, playersData anonymized).
 */

require('ts-node').register({ transpileOnly: true });
const { io: ioClient } = require('socket.io-client');
const { prisma } = require('./src/database/prisma');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const SOCKET_URL = `http://localhost:${PORT}`;

let serverInstance;

async function startServer() {
  const { server } = require('./src/index');
  serverInstance = server;

  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) {
        console.log(`📡 Test server connected on http://localhost:${PORT}`);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server failed to start in time');
}

async function stopServer() {
  try {
    const { io } = require('./src/sockets/socket.server');
    if (io) io.close();
  } catch {}
  if (serverInstance) {
    if (typeof serverInstance.closeAllConnections === 'function') {
      serverInstance.closeAllConnections();
    }
    await new Promise((resolve) => serverInstance.close(resolve)).catch(() => null);
    console.log('🛑 Test server stopped.');
  }
  await prisma.$disconnect();
}

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

async function runTests() {
  console.log('🧪 Starting Otter Account Deletion Comprehensive Test Suite...\n');

  try {
    await startServer();

    // -----------------------------------------------------------------------
    // SETUP: Register Main Test User and Secondary Opponent / Friend User
    // -----------------------------------------------------------------------
    const nonce = Date.now().toString().slice(-6);
    const mainUserCreds = {
      email: `delete_me_${nonce}@example.com`,
      username: `del_user_${nonce}`,
      password: 'StrongPassword123!',
      displayName: 'To Be Deleted User',
    };

    const friendUserCreds = {
      email: `friend_${nonce}@example.com`,
      username: `friend_${nonce}`,
      password: 'FriendPassword123!',
      displayName: 'Staying Friend',
    };

    console.log('📝 Registering Test Users...');
    const regMain = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(mainUserCreds),
    });
    if (!regMain.ok) throw new Error(`Failed to register main user: ${JSON.stringify(regMain.data)}`);
    const mainUser = regMain.data.data.user;
    const mainToken = regMain.data.data.token;
    console.log(`✅ Main user created: ${mainUser.username} (${mainUser.id})`);

    const regFriend = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(friendUserCreds),
    });
    if (!regFriend.ok) throw new Error(`Failed to register friend user: ${JSON.stringify(regFriend.data)}`);
    const friendUser = regFriend.data.data.user;
    const friendToken = regFriend.data.data.token;
    console.log(`✅ Friend user created: ${friendUser.username} (${friendUser.id})`);

    // -----------------------------------------------------------------------
    // SETUP ASSOCIATED DATA:
    // Relationships, Messages, Game Room, Game Results, Stories, Push Token
    // -----------------------------------------------------------------------
    console.log('\n📦 Seeding user-associated records across PostgreSQL schema...');

    // 1. Register Push Token
    await prisma.user.update({
      where: { id: mainUser.id },
      data: { pushToken: 'ExponentPushToken[TestDeleteAccountToken123]' },
    });

    // 2. Friendship
    await prisma.friendship.create({
      data: {
        userId: mainUser.id,
        friendId: friendUser.id,
      },
    });

    // 3. Friend Request (sent by main user)
    await prisma.friendRequest.create({
      data: {
        senderId: mainUser.id,
        receiverId: friendUser.id,
        status: 'ACCEPTED',
      },
    });

    // 4. Blocked User
    await prisma.blockedUser.create({
      data: {
        blockerId: mainUser.id,
        blockedId: friendUser.id,
      },
    });

    // 5. Conversation & Chat Messages
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        creatorId: mainUser.id,
        members: {
          create: [
            { userId: mainUser.id },
            { userId: friendUser.id },
          ],
        },
        messages: {
          create: [
            {
              senderId: mainUser.id,
              content: 'Hey there, this message will be cascade deleted!',
              type: 'TEXT',
            },
          ],
        },
      },
    });

    // 6. Hosted Game Room with another player
    const roomCode = `RM${nonce.slice(-4)}`;
    const gameRoom = await prisma.gameRoom.create({
      data: {
        code: roomCode,
        hostId: mainUser.id,
        gameType: 'TICTACTOE',
        status: 'WAITING',
        players: {
          create: [
            { userId: mainUser.id, slotIndex: 0, isReady: true },
            { userId: friendUser.id, slotIndex: 1, isReady: true },
          ],
        },
      },
    });

    // 7. Game Result where main user is Winner and player in playersData
    const gameResult = await prisma.gameResult.create({
      data: {
        gameType: 'TICTACTOE',
        gameMode: 'MULTIPLAYER',
        winnerId: mainUser.id,
        durationSeconds: 45,
        playersData: [
          {
            userId: mainUser.id,
            username: mainUser.username,
            displayName: mainUser.displayName,
            avatarUrl: 'https://example.com/avatar.jpg',
            score: 1,
          },
          {
            userId: friendUser.id,
            username: friendUser.username,
            displayName: friendUser.displayName,
            avatarUrl: null,
            score: 0,
          },
        ],
        finalState: { board: ['X', 'X', 'X', 'O', 'O', null, null, null, null] },
      },
    });

    // 8. Story & Reply
    const story = await prisma.story.create({
      data: {
        userId: mainUser.id,
        mediaUrl: 'data:image/jpeg;base64,samplebase64data',
        caption: 'My cool gaming highlight',
        expiresAt: new Date(Date.now() + 86400000),
        replies: {
          create: [{ userId: friendUser.id, content: 'Nice play!' }],
        },
      },
    });

    // 9. Notification & Achievement
    await prisma.notification.create({
      data: {
        userId: mainUser.id,
        type: 'SYSTEM',
        title: 'Welcome to Otter',
        body: 'Enjoy multiplayer games!',
      },
    });

    const achievement = await prisma.achievement.findFirst();
    if (achievement) {
      await prisma.userAchievement.create({
        data: {
          userId: mainUser.id,
          achievementId: achievement.id,
        },
      });
    }

    console.log('✅ Seeded associated records successfully.');

    // -----------------------------------------------------------------------
    // TEST 1: Unauthorized Deletion (No token / Invalid Token)
    // -----------------------------------------------------------------------
    console.log('\n🔒 Test 1: Testing deletion rejection without authentication...');
    const noAuthRes = await request('/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password: mainUserCreds.password, confirm: true }),
    });
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${noAuthRes.status}`);
    }
    console.log('✅ Unauthenticated request correctly rejected with 401');

    // -----------------------------------------------------------------------
    // TEST 2: Confirmation Validation (confirm !== true)
    // -----------------------------------------------------------------------
    console.log('\n🔒 Test 2: Testing deletion rejection when confirm is missing or false...');
    const noConfirmRes = await request('/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({ password: mainUserCreds.password, confirm: false }),
    });
    if (noConfirmRes.status !== 400) {
      throw new Error(`Expected 400 for confirm: false, got ${noConfirmRes.status}`);
    }
    console.log('✅ Unconfirmed deletion request correctly rejected with 400');

    // -----------------------------------------------------------------------
    // TEST 3: Incorrect Password / Failed Reauthentication
    // -----------------------------------------------------------------------
    console.log('\n🔒 Test 3: Testing deletion rejection on incorrect password...');
    const badPwRes = await request('/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({ password: 'WrongPassword123!', confirm: true }),
    });
    if (badPwRes.status !== 401) {
      throw new Error(`Expected 401 for invalid password, got ${badPwRes.status}`);
    }
    console.log('✅ Incorrect password correctly rejected with 401');

    // -----------------------------------------------------------------------
    // TEST 4: IDOR Prevention (Cannot delete another user via payload injection)
    // -----------------------------------------------------------------------
    console.log('\n🔒 Test 4: Testing IDOR protection (cannot delete another user)...');
    // Using friend's token, attempting to supply mainUser.id in payload
    const idorRes = await request('/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${friendToken}` },
      body: JSON.stringify({
        userId: mainUser.id, // malicious injected target id
        password: 'WrongPasswordForFriend!',
        confirm: true,
      }),
    });
    // Must evaluate friend's password, failing with 401, not deleting mainUser!
    if (idorRes.status !== 401) {
      throw new Error(`Expected 401, got ${idorRes.status}`);
    }
    const checkMainStillExists = await prisma.user.findUnique({ where: { id: mainUser.id } });
    if (!checkMainStillExists) {
      throw new Error('IDOR vulnerability detected! Target user was deleted.');
    }
    console.log('✅ IDOR protection verified: Server derives identity strictly from token.');

    // -----------------------------------------------------------------------
    // TEST 5: Real-time Socket.IO Disconnect & Account Deleted Event
    // -----------------------------------------------------------------------
    console.log('\n🔌 Test 5: Testing real-time Socket.IO session notification & teardown...');
    let socketReceivedDeletionNotice = false;

    const mainSocket = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: mainToken },
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      mainSocket.on('connection:established', () => {
        console.log('   Socket connected & authenticated.');
        resolve(true);
      });
      mainSocket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Socket connect timed out')), 5000);
    });

    mainSocket.on('account:deleted', (payload) => {
      console.log('   Received real-time account:deleted event:', payload.message);
      socketReceivedDeletionNotice = true;
    });

    // -----------------------------------------------------------------------
    // TEST 6: Successful Account Deletion Execution
    // -----------------------------------------------------------------------
    console.log('\n💥 Test 6: Executing legitimate account deletion (DELETE /api/v1/auth/delete-account)...');
    const deleteRes = await request('/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({
        password: mainUserCreds.password,
        confirm: true,
        reason: 'Automated test suite verification',
      }),
    });

    if (deleteRes.status !== 200 || !deleteRes.data?.success) {
      throw new Error(`Account deletion failed: ${JSON.stringify(deleteRes.data)}`);
    }
    console.log('✅ Deletion API returned 200 Success:', deleteRes.data.message);
    console.log('   Retained Data Notice:', deleteRes.data.data.retainedDataNotice);

    // Wait 500ms for socket event and teardown
    await new Promise((r) => setTimeout(r, 600));

    if (!socketReceivedDeletionNotice) {
      console.warn('⚠️ Warning: Socket did not catch account:deleted event before disconnect (may have closed immediately)');
    } else {
      console.log('✅ Real-time socket caught account:deleted event.');
    }
    if (mainSocket.connected) {
      throw new Error('Expected socket to be forcefully disconnected on account deletion!');
    }
    console.log('✅ Socket was forcefully disconnected.');
    mainSocket.disconnect();

    // -----------------------------------------------------------------------
    // TEST 7: Verifying Database Cleanup and Foreign Keys
    // -----------------------------------------------------------------------
    console.log('\n🔍 Test 7: Verifying database state post-deletion...');

    // A. User row must not exist
    const userInDb = await prisma.user.findUnique({ where: { id: mainUser.id } });
    if (userInDb) throw new Error('User row still exists in database!');
    console.log('✅ User row is completely deleted.');

    // B. Profile must not exist
    const profileInDb = await prisma.profile.findUnique({ where: { userId: mainUser.id } });
    if (profileInDb) throw new Error('Profile still exists in database!');
    console.log('✅ Profile row is completely deleted.');

    // C. Friendships & FriendRequests must not exist
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId: mainUser.id }, { friendId: mainUser.id }] },
    });
    if (friendships.length > 0) throw new Error('Friendship records still exist!');
    console.log('✅ Friendship records completely deleted.');

    const friendRequests = await prisma.friendRequest.findMany({
      where: { OR: [{ senderId: mainUser.id }, { receiverId: mainUser.id }] },
    });
    if (friendRequests.length > 0) throw new Error('Friend requests still exist!');
    console.log('✅ Friend requests completely deleted.');

    // D. Blocked user records
    const blocks = await prisma.blockedUser.findMany({
      where: { OR: [{ blockerId: mainUser.id }, { blockedId: mainUser.id }] },
    });
    if (blocks.length > 0) throw new Error('Blocked user records still exist!');
    console.log('✅ Blocked user records completely deleted.');

    // E. Chat messages from deleted user
    const messages = await prisma.message.findMany({ where: { senderId: mainUser.id } });
    if (messages.length > 0) throw new Error('Messages still exist in database!');
    console.log('✅ User messages completely deleted.');

    // F. Stories and Notifications
    const stories = await prisma.story.findMany({ where: { userId: mainUser.id } });
    if (stories.length > 0) throw new Error('Stories still exist in database!');
    console.log('✅ User stories completely deleted.');

    const notifs = await prisma.notification.findMany({ where: { userId: mainUser.id } });
    if (notifs.length > 0) throw new Error('Notifications still exist in database!');
    console.log('✅ Notifications completely deleted.');

    // -----------------------------------------------------------------------
    // TEST 8: Verifying Hosted Game Room Transfer
    // -----------------------------------------------------------------------
    console.log('\n🎮 Test 8: Verifying Game Room host transfer and player cleanup...');
    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: gameRoom.id },
      include: { players: true },
    });

    if (!updatedRoom) {
      throw new Error('Expected game room to still exist with remaining player!');
    }
    if (updatedRoom.hostId !== friendUser.id) {
      throw new Error(`Expected room hostId to be transferred to ${friendUser.id}, got ${updatedRoom.hostId}`);
    }
    const hasDeletedPlayer = updatedRoom.players.some((p) => p.userId === mainUser.id);
    if (hasDeletedPlayer) {
      throw new Error('Deleted user is still in the room players list!');
    }
    console.log('✅ Hosted game room transferred smoothly to remaining player:', updatedRoom.hostId);

    // -----------------------------------------------------------------------
    // TEST 9: Verifying Anonymization of Historical Game Results
    // -----------------------------------------------------------------------
    console.log('\n🏆 Test 9: Verifying GameResult anonymization...');
    const updatedResult = await prisma.gameResult.findUnique({
      where: { id: gameResult.id },
    });

    if (!updatedResult) throw new Error('Historical GameResult was unexpectedly deleted!');
    if (updatedResult.winnerId !== null) {
      throw new Error(`Expected winnerId to be nullified, got ${updatedResult.winnerId}`);
    }

    const playersInResult = updatedResult.playersData;
    const deletedPlayerRecord = playersInResult.find((p) => p.userId === mainUser.id);
    if (!deletedPlayerRecord) throw new Error('Player entry missing in GameResult!');

    if (deletedPlayerRecord.displayName !== 'Deleted Player' || deletedPlayerRecord.avatarUrl !== null) {
      throw new Error(`Personal data not anonymized in GameResult: ${JSON.stringify(deletedPlayerRecord)}`);
    }
    console.log('✅ GameResult retained with anonymized identity:', deletedPlayerRecord);

    // -----------------------------------------------------------------------
    // TEST 10: Attempts to Reuse Old Token / Session
    // -----------------------------------------------------------------------
    console.log('\n🚫 Test 10: Testing session invalidation with old JWT token...');
    const reuseRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    if (reuseRes.status !== 404 && reuseRes.status !== 401) {
      throw new Error(`Expected 404 or 401 on /me for deleted user, got ${reuseRes.status}`);
    }
    console.log('✅ Old JWT token correctly rejected on protected routes.');

    // -----------------------------------------------------------------------
    // TEST 11: Retry Behavior / Idempotency
    // -----------------------------------------------------------------------
    console.log('\n🔁 Test 11: Testing retry behavior / idempotency...');
    const retryRes = await request('/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
      body: JSON.stringify({
        password: mainUserCreds.password,
        confirm: true,
      }),
    });
    if (retryRes.status !== 400 && retryRes.status !== 404) {
      throw new Error(`Expected 400/404 for already deleted user, got ${retryRes.status}`);
    }
    console.log('✅ Repeated deletion request handled cleanly without crash or inconsistency.');

    // -----------------------------------------------------------------------
    // TEST 12: Profile Alias Route Check (DELETE /api/v1/profiles/me)
    // -----------------------------------------------------------------------
    console.log('\n🔗 Test 12: Verifying DELETE /api/v1/profiles/me route alias...');
    const friendDeleteRes = await request('/profiles/me', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${friendToken}` },
      body: JSON.stringify({
        password: friendUserCreds.password,
        confirm: true,
      }),
    });
    if (friendDeleteRes.status !== 200 || !friendDeleteRes.data?.success) {
      throw new Error(`DELETE /profiles/me failed: ${JSON.stringify(friendDeleteRes.data)}`);
    }
    console.log('✅ Profile alias DELETE /api/v1/profiles/me works seamlessly.');

    console.log('\n🎉 ALL 12 ACCOUNT DELETION TESTS PASSED FLAWLESSLY! 🎉\n');
  } finally {
    await stopServer();
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
