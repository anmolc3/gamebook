import { AiRegistry } from './ai.registry';
import { BOT_PROFILES, getBotProfile, getThinkingDelayMs } from './ai.config';
import { TicTacToeEngine } from '../games/tictactoe/tictactoe.engine';
import { ConnectFourEngine } from '../games/board/connectfour.engine';
import { CheckersEngine } from '../games/board/checkers.engine';
import { ChessEngine } from '../games/board/chess.engine';
import { ReversiEngine } from '../games/board/reversi.engine';
import { GomokuEngine } from '../games/board/gomoku.engine';
import { MancalaEngine } from '../games/board2/mancala.engine';
import { BattleshipEngine } from '../games/board2/battleship.engine';
import { LudoEngine } from '../games/ludo/ludo.engine';
import { DominoesEngine } from '../games/board2/dominoes.engine';
import { BlackjackEngine } from '../games/cards/blackjack.engine';
import { UnoEngine } from '../games/cards/uno.engine';
import { SoloManager } from './solo.manager';
import { MatchManager } from '../games/match.manager';

async function runAiTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 STARTING COMPREHENSIVE AI & SOLO MODE AUTOMATED TESTS');
  console.log('🧪 ========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Bot Profiles & Config
  console.log('\n--- 1. Testing Bot Profiles & Config ---');
  assert(BOT_PROFILES.length >= 5, 'At least 5 AI bot personas registered');
  const nova = getBotProfile('BOT_NOVA');
  assert(nova.name === 'Nova', 'Bot Nova profile retrieved correctly');
  const delayEasy = getThinkingDelayMs('EASY');
  const delayExpert = getThinkingDelayMs('EXPERT');
  assert(delayEasy >= 500, 'Easy delay satisfies minimum threshold');
  assert(delayExpert >= delayEasy, 'Expert delay reflects contemplation time');

  // 2. Tic-Tac-Toe AI
  console.log('\n--- 2. Testing Tic-Tac-Toe AI & Minimax ---');
  const tttEngine = new TicTacToeEngine();
  const tttPlayers = [
    { userId: 'HUMAN', username: 'Human', displayName: 'Human', slotIndex: 0 },
    { userId: 'BOT_NOVA', username: 'Nova (AI)', displayName: 'Nova (AI)', slotIndex: 1 },
  ];
  const tttState = tttEngine.initialize(tttPlayers);
  // Human plays center (cell 4)
  const tttRes1 = tttEngine.applyAction(tttState, 'HUMAN', { cellIndex: 4 });
  assert(tttRes1.success && tttRes1.state!.board[4] === 'X', 'Human move applied');

  // AI calculates response
  const tttMove = await AiRegistry.getMove('TICTACTOE', tttRes1.state, 'BOT_NOVA', 'HARD');
  assert(typeof tttMove.cellIndex === 'number' && tttMove.cellIndex !== 4, 'TicTacToe AI picks valid empty cell');
  const tttRes2 = tttEngine.applyAction(tttRes1.state!, 'BOT_NOVA', tttMove);
  assert(tttRes2.success && tttRes2.state!.board[tttMove.cellIndex] === 'O', 'Server validates and applies AI move');

  // 3. Connect Four AI
  console.log('\n--- 3. Testing Connect Four AI ---');
  const c4Engine = new ConnectFourEngine();
  const c4State = c4Engine.initialize(tttPlayers);
  const c4Move = await AiRegistry.getMove('CONNECT_FOUR', c4State, c4State.turnPlayerId, 'MEDIUM');
  assert(c4Move.column >= 0 && c4Move.column < 7, 'Connect Four AI picks valid column');
  const c4Res = c4Engine.applyAction(c4State, c4State.turnPlayerId, c4Move);
  assert(c4Res.success, 'Server validates Connect Four AI move');

  // 4. Checkers AI
  console.log('\n--- 4. Testing Checkers AI ---');
  const checkersEngine = new CheckersEngine();
  const checkersState = checkersEngine.initialize(tttPlayers);
  const checkersMove = await AiRegistry.getMove('CHECKERS', checkersState, 'HUMAN', 'MEDIUM');
  assert(checkersMove.from && checkersMove.to, 'Checkers AI generates valid from/to coordinates');
  const checkersRes = checkersEngine.applyAction(checkersState, 'HUMAN', checkersMove);
  assert(checkersRes.success, 'Server validates Checkers AI move');

  // 5. Chess AI
  console.log('\n--- 5. Testing Chess AI ---');
  const chessEngine = new ChessEngine();
  const chessState = chessEngine.initialize(tttPlayers);
  const chessMove = await AiRegistry.getMove('CHESS', chessState, 'HUMAN', 'MEDIUM');
  assert(chessMove.from && chessMove.to, 'Chess AI produces legal opening move');
  const chessRes = chessEngine.applyAction(chessState, 'HUMAN', chessMove);
  assert(chessRes.success, 'Server validates Chess AI move');

  // 6. Reversi AI
  console.log('\n--- 6. Testing Reversi AI ---');
  const reversiEngine = new ReversiEngine();
  const reversiState = reversiEngine.initialize(tttPlayers);
  const reversiMove = await AiRegistry.getMove('REVERSI', reversiState, 'HUMAN', 'HARD');
  assert(typeof reversiMove.row === 'number' && typeof reversiMove.col === 'number', 'Reversi AI picks valid coordinate');
  const reversiRes = reversiEngine.applyAction(reversiState, 'HUMAN', reversiMove);
  assert(reversiRes.success, 'Server validates Reversi outflanking move');

  // 7. Gomoku AI
  console.log('\n--- 7. Testing Gomoku AI ---');
  const gomokuEngine = new GomokuEngine();
  const gomokuState = gomokuEngine.initialize(tttPlayers);
  const gomokuMove = await AiRegistry.getMove('GOMOKU', gomokuState, 'HUMAN', 'HARD');
  assert(gomokuMove.row === 7 && gomokuMove.col === 7, 'Gomoku AI plays optimal opening center');
  const gomokuRes = gomokuEngine.applyAction(gomokuState, 'HUMAN', gomokuMove);
  assert(gomokuRes.success, 'Server validates Gomoku center stone');

  // 8. Mancala AI
  console.log('\n--- 8. Testing Mancala AI ---');
  const mancalaEngine = new MancalaEngine();
  const mancalaState = mancalaEngine.initialize(tttPlayers);
  const mancalaMove = await AiRegistry.getMove('MANCALA', mancalaState, 'HUMAN', 'EXPERT');
  assert(mancalaMove.type === 'SOW_PIT' && mancalaMove.pitIndex >= 0 && mancalaMove.pitIndex <= 5, 'Mancala AI picks legal player 1 pit');
  const mancalaRes = mancalaEngine.applyAction(mancalaState, 'HUMAN', mancalaMove);
  assert(mancalaRes.success, 'Server validates Mancala sowing');

  // 9. Battleship AI (Hidden Information Protection)
  console.log('\n--- 9. Testing Battleship AI ---');
  const bsEngine = new BattleshipEngine();
  const bsState = bsEngine.initialize(tttPlayers);
  const bsMove = await AiRegistry.getMove('BATTLESHIP', bsState, bsState.turnPlayerId, 'HARD');
  assert(bsMove.type === 'FIRE' && bsMove.row >= 0 && bsMove.col >= 0, 'Battleship AI generates valid fire action');
  const bsRes = bsEngine.applyAction(bsState, bsState.turnPlayerId, bsMove);
  assert(bsRes.success, 'Server validates Battleship naval strike');

  // 10. Ludo AI
  console.log('\n--- 10. Testing Ludo AI ---');
  const ludoEngine = new LudoEngine();
  const ludoState = ludoEngine.initialize(tttPlayers);
  const ludoMove1 = await AiRegistry.getMove('LUDO', ludoState, 'HUMAN', 'HARD');
  assert(ludoMove1.type === 'ROLL_DICE', 'Ludo AI rolls dice on unrolled turn');

  // 11. Uno AI (Hidden Cards Protection)
  console.log('\n--- 11. Testing Uno AI ---');
  const unoEngine = new UnoEngine();
  const unoState = unoEngine.initialize(tttPlayers);
  const unoMove = await AiRegistry.getMove('UNO_STYLE', unoState, 'HUMAN', 'MEDIUM');
  assert(unoMove.type === 'PLAY_CARD' || unoMove.type === 'DRAW_CARD', 'Uno AI selects valid card or draws');

  // 12. SoloManager Full Lifecycle
  console.log('\n--- 12. Testing SoloManager Session Lifecycle ---');
  const session = SoloManager.startSoloSession('TEST_USER_999', 'TestPlayer', 'TICTACTOE' as any, 'HARD');
  assert(session.roomCode.startsWith('SOLO_'), 'SoloManager creates unique SOLO virtual room code');
  assert(session.match.gameMode === 'SOLO', 'ActiveMatch is tagged with SOLO gameMode');
  assert(session.botProfile.name.length > 0, 'Bot profile successfully associated');

  const active = SoloManager.getActiveSession('TEST_USER_999');
  assert(active !== null && active.roomCode === session.roomCode, 'SoloManager supports reconnection/session retrieval');

  SoloManager.clearUserSoloSession('TEST_USER_999');
  const cleared = SoloManager.getActiveSession('TEST_USER_999');
  assert(cleared === null, 'SoloManager cleans up session cleanly');

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
