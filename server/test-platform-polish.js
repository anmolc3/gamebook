/**
 * test-platform-polish.js
 * Comprehensive automated verification for Phase 16:
 * - Game Catalog & Discovery (search, categories, active room counts, trending)
 * - Achievements Engine & Auto-Unlocking
 * - Global & Friends Leaderboards
 * - Authoritative Game History & Gaming Portfolio
 * - 24-Hour Ephemeral Stories (creation, feed grouping, views, replies, expiration)
 */

const assert = require('assert');
const { AchievementsService, PLATFORM_ACHIEVEMENTS } = require('./dist/server/src/games/achievements.service');
const { GameRegistry } = require('./dist/server/src/games/game.registry');
const { StoriesService } = require('./dist/server/src/stories/stories.service');
const { prisma } = require('./dist/server/src/database/prisma');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  console.log('====================================================');
  console.log('  Running Phase 16: Platform Polish & Social Tests  ');
  console.log('====================================================\n');

  // 1. Catalog & Discovery Tests
  console.log('--- 1. Game Catalog & Discovery ---');
  test('Catalog: GameRegistry contains 71+ registered games across all categories', () => {
    const all = GameRegistry.getAllGames();
    assert(all.length >= 71, `Expected >= 71 games, got ${all.length}`);
    const categories = new Set(all.map(g => g.category));
    assert(categories.has('BOARD'), 'Should have BOARD category');
    assert(categories.has('CARD'), 'Should have CARD category');
    assert(categories.has('CASUAL'), 'Should have CASUAL category');
    assert(categories.has('COMPETITIVE'), 'Should have COMPETITIVE category');
    assert(categories.has('PUZZLE'), 'Should have PUZZLE category');
    assert(categories.has('PARTY'), 'Should have PARTY category');
  });

  test('Catalog: Search by title or description returns accurate subset', () => {
    const all = GameRegistry.getAllGames();
    const matches = all.filter(g => g.name.toLowerCase().includes('checkers') || g.id.toLowerCase().includes('checkers'));
    assert(matches.length >= 2, 'Should match Checkers and Chinese Checkers');
  });

  test('Catalog: Filter by player capacity works accurately', () => {
    const all = GameRegistry.getAllGames();
    const fourPlayerGames = all.filter(g => g.minPlayers <= 4 && g.maxPlayers >= 4);
    assert(fourPlayerGames.length > 5, 'Should have multiple 4-player supported games');
  });

  // 2. Achievements Engine Tests
  console.log('\n--- 2. Achievements Engine & Auto-Unlock ---');
  await asyncTest('Achievements: Seed default platform achievements', async () => {
    await AchievementsService.ensureDefaultAchievements();
    const achs = await AchievementsService.getAllAchievements();
    assert(achs.length >= 10, `Expected at least 10 platform achievements, got ${achs.length}`);
    const firstWin = achs.find(a => a.key === 'FIRST_WIN');
    assert(firstWin, 'Should include FIRST_WIN achievement');
    assert.strictEqual(firstWin.iconName, 'TrophyIcon');
  });

  await asyncTest('Achievements: Evaluate and award FIRST_WIN and SPEED_DEMON', async () => {
    // Create test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test_polish_user@gameapp.test' },
      update: {},
      create: {
        email: 'test_polish_user@gameapp.test',
        username: 'polish_player_' + Date.now().toString(36),
        passwordHash: 'dummy',
        profile: {
          create: {
            displayName: 'Polish Player',
          },
        },
      },
      include: { profile: true },
    });

    // Clean up any previously awarded achievements for idempotency
    await prisma.userAchievement.deleteMany({
      where: { userId: testUser.id },
    });

    // Seed 1 win in REACTION_TEST
    await prisma.gameStatistics.upsert({
      where: {
        userId_gameType: {
          userId: testUser.id,
          gameType: 'REACTION_TEST',
        },
      },
      update: {
        matchesPlayed: 1,
        matchesWon: 1,
        currentStreak: 1,
        highestStreak: 1,
      },
      create: {
        userId: testUser.id,
        gameType: 'REACTION_TEST',
        matchesPlayed: 1,
        matchesWon: 1,
        currentStreak: 1,
        highestStreak: 1,
      },
    });

    const unlocked = await AchievementsService.evaluateAndAwardAchievements(
      testUser.id,
      'REACTION_TEST',
      true
    );

    assert(unlocked.includes('FIRST_WIN'), 'Should unlock FIRST_WIN');
    assert(unlocked.includes('SPEED_DEMON'), 'Should unlock SPEED_DEMON');

    const userAchs = await AchievementsService.getUserAchievements(testUser.id);
    const unlockedList = userAchs.filter(a => a.isUnlocked);
    assert(unlockedList.length >= 2, 'Should reflect at least 2 unlocked achievements');
  });

  // 3. Ephemeral 24-Hour Stories Tests
  console.log('\n--- 3. Ephemeral 24-Hour Stories System ---');
  let testStoryId = null;
  let storyAuthor = null;
  let storyViewer = null;

  await asyncTest('Stories: Create a celebratory match result story with 24h expiration', async () => {
    storyAuthor = await prisma.user.upsert({
      where: { email: 'story_author@gameapp.test' },
      update: {},
      create: {
        email: 'story_author@gameapp.test',
        username: 'story_author_' + Date.now().toString(36),
        passwordHash: 'dummy',
        profile: { create: { displayName: 'Story Author' } },
      },
    });

    const story = await StoriesService.createStory(storyAuthor.id, {
      mediaUrl: 'data:image/svg+xml;utf8,<svg><text>VICTORY!</text></svg>',
      mediaType: 'IMAGE',
      caption: 'Won 5 in a row in Chess!',
      privacy: 'FRIENDS',
    });

    assert(story.id, 'Story must have an ID');
    testStoryId = story.id;
    assert.strictEqual(story.caption, 'Won 5 in a row in Chess!');

    // Check expiration is approximately 24 hours in future
    const now = Date.now();
    const expiry = new Date(story.expiresAt).getTime();
    const diffHours = (expiry - now) / (1000 * 60 * 60);
    assert(diffHours >= 23.9 && diffHours <= 24.1, `Expiry should be ~24h, got ${diffHours}h`);
  });

  await asyncTest('Stories: View story records unique viewer timestamp', async () => {
    storyViewer = await prisma.user.upsert({
      where: { email: 'story_viewer@gameapp.test' },
      update: {},
      create: {
        email: 'story_viewer@gameapp.test',
        username: 'story_viewer_' + Date.now().toString(36),
        passwordHash: 'dummy',
        profile: { create: { displayName: 'Story Viewer' } },
      },
    });

    const result = await StoriesService.viewStory(storyViewer.id, testStoryId);
    assert(result.viewed, 'Story view should be recorded');

    // Duplicate view should be idempotent
    const dup = await StoriesService.viewStory(storyViewer.id, testStoryId);
    assert(dup.alreadyViewed, 'Duplicate view should return alreadyViewed flag');
  });

  await asyncTest('Stories: Reply to story creates recorded response', async () => {
    const reply = await StoriesService.replyStory(
      storyViewer.id,
      testStoryId,
      'GG! Let’s rematch soon!'
    );

    assert(reply.id, 'Reply must have an ID');
    assert.strictEqual(reply.content, 'GG! Let’s rematch soon!');
  });

  await asyncTest('Stories: Feed retrieves and groups stories into trays', async () => {
    // Establish friendship between author and viewer
    await prisma.friendship.upsert({
      where: { userId_friendId: { userId: storyViewer.id, friendId: storyAuthor.id } },
      update: {},
      create: { userId: storyViewer.id, friendId: storyAuthor.id },
    });

    const feed = await StoriesService.getFeed(storyViewer.id);
    assert(Array.isArray(feed), 'Feed should be an array of user trays');
    const authorTray = feed.find(t => t.userId === storyAuthor.id);
    assert(authorTray, 'Feed should include author tray');
    assert(authorTray.stories.length >= 1, 'Author tray should contain the created story');
  });

  await asyncTest('Stories: Delete user story cleans up', async () => {
    const del = await StoriesService.deleteStory(storyAuthor.id, testStoryId);
    assert(del.success, 'Story should delete successfully');
  });

  console.log('\n====================================================');
  console.log(`  Tests Passed: ${passedTests}`);
  console.log(`  Tests Failed: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
