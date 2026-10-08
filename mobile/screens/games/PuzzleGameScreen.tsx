import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme';
import { TrophyIcon, CrownIcon, StarIcon, GamepadIcon, TargetIcon, InfoIcon } from '../../icons';
import { Avatar } from '../../components/atoms/Avatar';
import { GameRulesModal } from '../../components';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';

export type PuzzleGameType =
  | 'ROCK_PAPER_SCISSORS'
  | 'REACTION_TEST'
  | 'NUMBER_GUESS'
  | 'SPEED_TAP'
  | 'COLOR_MATCH'
  | 'MATH_BATTLE'
  | 'QUICK_DRAW'
  | 'WORDLE_DUEL'
  | 'HANGMAN'
  | 'MEMORY_MATCH'
  | 'QUIZ_BATTLE'
  | '2048_MULTIPLAYER'
  | 'MINESWEEPER_DUEL'
  | 'PATTERN_MATCH'
  | 'MASTERMIND'
  | 'WORD_SCRAMBLE'
  | 'TYPING_RACE';

export interface PuzzleGameScreenProps {
  roomCode: string;
  gameType: PuzzleGameType;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 28, 380);

export const PuzzleGameScreen: React.FC<PuzzleGameScreenProps> = ({
  roomCode,
  gameType,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Match Authoritative State
  const [gameState, setGameState] = useState<any>(null);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [rematchModalVisible, setRematchModalVisible] = useState<boolean>(false);
  const [rematchOfferPending, setRematchOfferPending] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Local Game Form & Input States
  const [numberGuessInput, setNumberGuessInput] = useState<string>('50');
  const [wordleInput, setWordleInput] = useState<string>('');
  const [hangmanSolveInput, setHangmanSolveInput] = useState<string>('');
  const [mastermindGuess, setMastermindGuess] = useState<string[]>(['RED', 'RED', 'RED', 'RED']);
  const [mastermindColorIdx, setMastermindColorIdx] = useState<number>(0);
  const [scrambleInput, setScrambleInput] = useState<string>('');
  const [typingInput, setTypingInput] = useState<string>('');
  const [minesweeperMode, setMinesweeperMode] = useState<'REVEAL' | 'FLAG'>('REVEAL');

  const turnTimerRef = useRef<any>(null);

  const isMyTurn = gameState?.turnPlayerId ? gameState?.turnPlayerId === user?.id : true;

  // --------------------------------------------------------------------------
  // Socket.IO Listeners
  // --------------------------------------------------------------------------
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          setGameState(res.state);
          if (res.scores) setScores(res.scores);
          if (res.round) setRound(res.round);
          if (res.players) setPlayerList(res.players);
        }
      })
      .catch((err) => console.log('[PuzzleGameScreen] getGameState err:', err));

    const unsubState = MobileSocketService.onGameState((data) => {
      if (data.state) setGameState(data.state);
      if (data.scores) setScores(data.scores);
      if (data.round) setRound(data.round);
    });

    const unsubGameOver = MobileSocketService.onGameOver((data) => {
      setGameResult(data);
      setRematchModalVisible(true);
    });

    const unsubRematch = MobileSocketService.onRematchOffered((data) => {
      if (data.offeredByUserId !== user?.id) {
        setRematchOfferPending(true);
      }
    });

    return () => {
      unsubState();
      unsubGameOver();
      unsubRematch();
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [roomCode, user?.id]);

  // Turn timer countdown
  useEffect(() => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    turnTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gameState?.turnExpiresAt]);

  const sendAction = useCallback(
    (action: any) => {
      MobileSocketService.getSocket()?.emit('match:action', {
        roomCode,
        action,
      });
    },
    [roomCode]
  );

  const handleOfferRematch = () => {
    MobileSocketService.requestRematch(roomCode);
  };

  const handleAcceptRematch = () => {
    MobileSocketService.respondRematch(roomCode, true);
    setRematchOfferPending(false);
    setRematchModalVisible(false);
  };

  const p1 = playerList[0];
  const p2 = playerList[1];
  const p1Name = p1?.user?.displayName || p1?.user?.username || 'Player 1';
  const p2Name = p2?.user?.displayName || p2?.user?.username || 'Player 2';

  const getGameTitle = () => {
    switch (gameType) {
      case 'ROCK_PAPER_SCISSORS': return 'Rock Paper Scissors';
      case 'REACTION_TEST': return 'Reaction Speed Test';
      case 'NUMBER_GUESS': return 'Number Guessing Duel';
      case 'SPEED_TAP': return 'Speed Tap Rush';
      case 'COLOR_MATCH': return 'Color Match Reflex';
      case 'MATH_BATTLE': return 'Speed Math Battle';
      case 'QUICK_DRAW': return 'Quick Draw Duel';
      case 'WORDLE_DUEL': return 'Wordle Duel';
      case 'HANGMAN': return 'Hangman Duel';
      case 'MEMORY_MATCH': return 'Memory Card Match';
      case 'QUIZ_BATTLE': return 'Quiz Battle Arena';
      case '2048_MULTIPLAYER': return '2048 Versus Race';
      case 'MINESWEEPER_DUEL': return 'Minesweeper Battle';
      case 'PATTERN_MATCH': return 'Pattern Simon Matrix';
      case 'MASTERMIND': return 'Mastermind Code Breaker';
      case 'WORD_SCRAMBLE': return 'Anagram Word Scramble';
      case 'TYPING_RACE': return 'Mobile Typing Race';
      default: return 'Puzzle Arena';
    }
  };

  // --------------------------------------------------------------------------
  // Vector Renderers for 17 Games
  // --------------------------------------------------------------------------

  // 1. Rock Paper Scissors
  const renderRps = () => {
    const choices = ['ROCK', 'PAPER', 'SCISSORS'];
    const myChoice = gameState?.choices?.[user?.id || ''];
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Choose your move for Round {gameState?.currentRound || 1}
        </Text>
        <View style={styles.rpsButtonGroup}>
          {choices.map((c) => {
            const isSelected = myChoice === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.rpsChoiceBtn,
                  { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface },
                  isSelected && { borderColor: '#3ED598', borderWidth: 2 },
                ]}
                onPress={() => sendAction({ type: 'CHOICE', choice: c })}
              >
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                  {c === 'ROCK' ? (
                    <Circle cx="12" cy="12" r="9" stroke={isSelected ? '#1F2C34' : '#3ED598'} strokeWidth="2.5" />
                  ) : c === 'PAPER' ? (
                    <Rect x="4" y="4" width="16" height="16" rx="3" stroke={isSelected ? '#1F2C34' : '#FFC542'} strokeWidth="2.5" />
                  ) : (
                    <Path d="M6 6L18 18M6 18L18 6" stroke={isSelected ? '#1F2C34' : '#FF565E'} strokeWidth="2.5" strokeLinecap="round" />
                  )}
                </Svg>
                <Text style={[styles.rpsBtnText, { color: isSelected ? '#1F2C34' : theme.colors.textPrimary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {gameState?.lastRoundWinner && (
          <View style={[styles.bannerPill, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: '#FFC542', fontWeight: '700' }}>
              Last Round: {gameState.lastRoundWinner === 'TIE' ? 'Tie Game' : `${gameState.lastRoundWinner} won`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 2. Reaction Speed Test
  const renderReactionTest = () => {
    const isReady = gameState?.stage === 'READY';
    const triggerAt = gameState?.signalTriggerAt || 0;
    const now = Date.now();
    const isSignalActive = !isReady || now >= triggerAt;
    const myTime = gameState?.reactionTimes?.[user?.id || ''];

    return (
      <View style={styles.puzzleBox}>
        <TouchableOpacity
          style={[
            styles.reactionPad,
            { backgroundColor: isSignalActive ? '#3ED598' : '#FF565E' },
          ]}
          onPress={() => sendAction({ type: 'TAP', timestamp: Date.now() })}
          activeOpacity={0.8}
        >
          <Text style={styles.reactionPadHeader}>
            {isSignalActive ? 'TAP NOW!!!' : 'WAIT FOR GREEN...'}
          </Text>
          <Text style={styles.reactionPadSub}>
            {isSignalActive ? 'Tap as fast as humanly possible!' : 'False start incurs 9999ms penalty'}
          </Text>
        </TouchableOpacity>
        {myTime !== null && myTime !== undefined && (
          <Text style={[styles.reactionTimeDisplay, { color: '#3ED598' }]}>
            Your Reaction Time: {myTime} ms
          </Text>
        )}
      </View>
    );
  };

  // 3. Number Guessing Duel
  const renderNumberGuess = () => {
    const attempts = gameState?.attempts?.[user?.id || ''] || [];
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Guess the secret number between 1 and 100
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.numberInput, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary }]}
            value={numberGuessInput}
            onChangeText={setNumberGuessInput}
            keyboardType="number-pad"
            maxLength={3}
          />
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              const val = parseInt(numberGuessInput, 10);
              if (!isNaN(val)) sendAction({ type: 'GUESS', number: val });
            }}
          >
            <Text style={styles.actionBtnText}>GUESS</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.historyList} horizontal showsHorizontalScrollIndicator={false}>
          {attempts.map((att: any, idx: number) => (
            <View key={idx} style={[styles.historyBadge, { backgroundColor: att.hint === 'CORRECT' ? '#3ED598' : theme.colors.surface }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>#{att.guess}</Text>
              <Text style={{ color: att.hint === 'HIGHER' ? '#3ED598' : '#FF565E', fontSize: 11, fontWeight: '800' }}>
                {att.hint}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 4. Speed Tap Rush
  const renderSpeedTap = () => {
    const myTaps = gameState?.tapCounts?.[user?.id || ''] || 0;
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Rapid Rush! Tap as many times as you can!
        </Text>
        <TouchableOpacity
          style={[styles.speedTapRushPad, { backgroundColor: '#FFC542' }]}
          onPress={() => sendAction({ type: 'TAP_TARGET' })}
          activeOpacity={0.7}
        >
          <Text style={styles.speedTapPadText}>TAP RUSH!</Text>
          <Text style={styles.speedTapCounterText}>{myTaps}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 5. Color Match Reflex
  const renderColorMatch = () => {
    const item = gameState?.currentItem || { word: 'RED', displayColor: '#FF565E', isMatching: true };
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Round {gameState?.currentRound || 1} / {gameState?.totalRounds || 5}
        </Text>
        <View style={[styles.stroopCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.stroopWord, { color: item.displayColor }]}>
            {item.word}
          </Text>
          <Text style={[styles.stroopQuestion, { color: theme.colors.textMuted }]}>
            Does the font color match the word?
          </Text>
        </View>
        <View style={styles.stroopActions}>
          <TouchableOpacity
            style={[styles.stroopBtn, { backgroundColor: '#3ED598' }]}
            onPress={() => sendAction({ type: 'ANSWER', matches: true })}
          >
            <Text style={styles.stroopBtnText}>YES (MATCH)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stroopBtn, { backgroundColor: '#FF565E' }]}
            onPress={() => sendAction({ type: 'ANSWER', matches: false })}
          >
            <Text style={styles.stroopBtnText}>NO (DIFFERENT)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 6. Speed Math Battle
  const renderMathBattle = () => {
    const eq = gameState?.equation || { num1: 12, num2: 8, operator: '+', options: [18, 20, 22, 24] };
    return (
      <View style={styles.puzzleBox}>
        <View style={[styles.mathCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.mathEquation, { color: theme.colors.textPrimary }]}>
            {eq.num1} {eq.operator} {eq.num2} = ?
          </Text>
        </View>
        <View style={styles.mathGrid}>
          {(eq.options || []).map((opt: number, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[styles.mathOptionBtn, { backgroundColor: theme.colors.surface }]}
              onPress={() => sendAction({ type: 'SUBMIT_ANSWER', answer: opt })}
            >
              <Text style={styles.mathOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 7. Quick Draw Western Duel
  const renderQuickDraw = () => {
    const isStandby = gameState?.stage === 'STANDBY';
    const bellTime = gameState?.bellTime || 0;
    const isBellFired = Date.now() >= bellTime;
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Western Standoff: Wait for the FIRE bell!
        </Text>
        <TouchableOpacity
          style={[
            styles.quickDrawPad,
            { backgroundColor: isBellFired ? '#FF565E' : theme.colors.surface },
          ]}
          onPress={() => sendAction({ type: 'DRAW' })}
          activeOpacity={0.8}
        >
          <Svg width={60} height={60} viewBox="0 0 24 24" fill="none">
            <Path d="M4 14L8 10L14 16L20 8" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.quickDrawPrompt}>
            {isBellFired ? 'DRAW NOW! 🔥' : 'STEADY...'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 8. Wordle Duel
  const renderWordle = () => {
    const guesses = gameState?.guesses?.[user?.id || ''] || [];
    return (
      <View style={styles.puzzleBox}>
        <View style={styles.wordleBoard}>
          {Array.from({ length: 6 }).map((_, rIdx) => {
            const rowGuess = guesses[rIdx];
            return (
              <View key={rIdx} style={styles.wordleRow}>
                {Array.from({ length: 5 }).map((_, cIdx) => {
                  const letter = rowGuess?.word?.[cIdx] || '';
                  const status = rowGuess?.feedback?.[cIdx] || 'EMPTY';
                  let bg = theme.colors.surface;
                  if (status === 'CORRECT') bg = '#3ED598';
                  else if (status === 'PRESENT') bg = '#FFC542';
                  else if (status === 'ABSENT') bg = '#475569';

                  return (
                    <View key={cIdx} style={[styles.wordleCell, { backgroundColor: bg }]}>
                      <Text style={styles.wordleLetter}>{letter}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.wordleInput, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary }]}
            value={wordleInput}
            onChangeText={setWordleInput}
            maxLength={5}
            autoCapitalize="characters"
            placeholder="5 LETTERS"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              if (wordleInput.length === 5) {
                sendAction({ type: 'GUESS_WORD', word: wordleInput });
                setWordleInput('');
              }
            }}
          >
            <Text style={styles.actionBtnText}>ENTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 9. Hangman Duel
  const renderHangman = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const guessed = gameState?.guessedLetters || [];
    const secret = gameState?.secretWord || 'PUZZLE';
    const wrongs = gameState?.wrongGuessesCount || 0;

    return (
      <View style={styles.puzzleBox}>
        <View style={[styles.bannerPill, { backgroundColor: theme.colors.surface }]}>
          <Text style={{ color: '#FFC542', fontWeight: '700' }}>
            CATEGORY: {gameState?.category || 'GENERAL'} | LIVES: {6 - wrongs} / 6
          </Text>
        </View>

        {/* Word Blanks */}
        <View style={styles.hangmanBlanks}>
          {secret.split('').map((ch: string, idx: number) => {
            const revealed = guessed.includes(ch);
            return (
              <View key={idx} style={[styles.hangmanCharBox, { borderBottomColor: theme.colors.primary }]}>
                <Text style={[styles.hangmanChar, { color: theme.colors.textPrimary }]}>
                  {revealed ? ch : ''}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Alphabet Keypad */}
        <View style={styles.alphabetGrid}>
          {letters.map((l) => {
            const isUsed = guessed.includes(l);
            return (
              <TouchableOpacity
                key={l}
                style={[
                  styles.alphabetKey,
                  { backgroundColor: isUsed ? '#1F2C34' : theme.colors.surface },
                ]}
                disabled={isUsed}
                onPress={() => sendAction({ type: 'GUESS_LETTER', letter: l })}
              >
                <Text style={[styles.alphabetKeyText, { color: isUsed ? '#475569' : theme.colors.textPrimary }]}>
                  {l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // 10. Memory Card Match
  const renderMemoryMatch = () => {
    const cards = gameState?.cards || [];
    return (
      <View style={styles.puzzleBox}>
        <View style={styles.memoryGrid}>
          {cards.map((card: any) => {
            const isFlipped = card.isFlipped || card.isMatched;
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.memoryCard,
                  { backgroundColor: isFlipped ? theme.colors.surface : theme.colors.primary },
                  card.isMatched && { borderColor: '#FFC542', borderWidth: 2 },
                ]}
                onPress={() => sendAction({ type: 'FLIP_CARD', cardId: card.id })}
              >
                {isFlipped ? (
                  <Text style={styles.memoryCardIcon}>{card.iconName.slice(0, 3)}</Text>
                ) : (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="8" stroke="#1F2C34" strokeWidth="2" />
                  </Svg>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // 11. Quiz Battle Arena
  const renderQuizBattle = () => {
    const q = gameState?.questions?.[gameState?.currentQuestionIndex || 0] || {
      question: 'Loading Question...',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    };
    return (
      <View style={styles.puzzleBox}>
        <View style={[styles.quizQuestionCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.quizQuestionText, { color: theme.colors.textPrimary }]}>
            {q.question}
          </Text>
        </View>
        <View style={styles.quizOptionsGrid}>
          {(q.options || []).map((opt: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[styles.quizOptionBtn, { backgroundColor: theme.colors.surface }]}
              onPress={() => sendAction({ type: 'SELECT_OPTION', optionIndex: idx })}
            >
              <Text style={styles.quizOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 12. 2048 Versus Race
  const render2048 = () => {
    const board = gameState?.playerBoards?.[user?.id || ''] || [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    return (
      <View style={styles.puzzleBox}>
        <View style={styles.board2048}>
          {board.map((row: number[], r: number) => (
            <View key={r} style={styles.row2048}>
              {row.map((val: number, c: number) => (
                <View
                  key={c}
                  style={[
                    styles.cell2048,
                    { backgroundColor: val === 0 ? '#1F2C34' : val >= 64 ? '#FF565E' : '#3ED598' },
                  ]}
                >
                  <Text style={styles.val2048}>{val > 0 ? val : ''}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {/* Direction Controls */}
        <View style={styles.dpad}>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => sendAction({ type: 'MOVE', direction: 'UP' })}>
            <Text style={styles.dpadText}>▲</Text>
          </TouchableOpacity>
          <View style={styles.dpadMiddle}>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => sendAction({ type: 'MOVE', direction: 'LEFT' })}>
              <Text style={styles.dpadText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => sendAction({ type: 'MOVE', direction: 'DOWN' })}>
              <Text style={styles.dpadText}>▼</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => sendAction({ type: 'MOVE', direction: 'RIGHT' })}>
              <Text style={styles.dpadText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 13. Minesweeper Battle
  const renderMinesweeper = () => {
    const grid = gameState?.grid || [];
    return (
      <View style={styles.puzzleBox}>
        <View style={styles.mineModeRow}>
          <TouchableOpacity
            style={[styles.mineModeBtn, minesweeperMode === 'REVEAL' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setMinesweeperMode('REVEAL')}
          >
            <Text style={[styles.mineModeText, minesweeperMode === 'REVEAL' && { color: '#1F2C34' }]}>REVEAL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mineModeBtn, minesweeperMode === 'FLAG' && { backgroundColor: '#FF565E' }]}
            onPress={() => setMinesweeperMode('FLAG')}
          >
            <Text style={[styles.mineModeText, minesweeperMode === 'FLAG' && { color: '#FFFFFF' }]}>FLAG</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mineGrid}>
          {grid.map((row: any[], r: number) => (
            <View key={r} style={styles.mineRow}>
              {row.map((cell: any, c: number) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.mineCell,
                    { backgroundColor: cell.isRevealed ? '#10131B' : theme.colors.surface },
                    cell.isFlagged && { borderColor: '#FF565E', borderWidth: 1.5 },
                  ]}
                  onPress={() => sendAction({ type: minesweeperMode, row: r, col: c })}
                >
                  <Text style={styles.mineCellText}>
                    {cell.isFlagged ? 'F' : cell.isRevealed ? (cell.adjacentMines > 0 ? cell.adjacentMines : '') : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 14. Pattern Memory Matrix
  const renderPattern = () => {
    return (
      <View style={styles.puzzleBox}>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          Round {gameState?.round || 1}: Repeat the illuminated pads
        </Text>
        <View style={styles.simonGrid}>
          {Array.from({ length: 9 }).map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.simonPad, { backgroundColor: theme.colors.surface }]}
              onPress={() => sendAction({ type: 'PRESS_PAD', index: idx })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 15. Mastermind Code Breaker
  const renderMastermind = () => {
    const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'];
    const myGuesses = gameState?.guesses?.[user?.id || ''] || [];
    return (
      <View style={styles.puzzleBox}>
        <View style={styles.mastermindBoard}>
          {myGuesses.map((g: any, idx: number) => (
            <View key={idx} style={styles.mastermindRow}>
              <View style={styles.mastermindPegs}>
                {g.colors.map((c: string, pIdx: number) => (
                  <View key={pIdx} style={[styles.pegCircle, { backgroundColor: c.toLowerCase() }]} />
                ))}
              </View>
              <Text style={{ color: '#3ED598', fontWeight: '700', fontSize: 12 }}>
                Exact: {g.exactHits} | Color: {g.colorHits}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.colorSelectorRow}>
          {colors.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorBtn, { backgroundColor: c.toLowerCase() }]}
              onPress={() => {
                const updated = [...mastermindGuess];
                updated[mastermindColorIdx] = c;
                setMastermindGuess(updated);
                setMastermindColorIdx((prev) => (prev + 1) % 4);
              }}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary, marginTop: 8 }]}
          onPress={() => sendAction({ type: 'SUBMIT_GUESS', colors: mastermindGuess })}
        >
          <Text style={styles.actionBtnText}>SUBMIT GUESS</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 16. Word Scramble Anagrams
  const renderWordScramble = () => {
    const scrambled = gameState?.scrambledWord || 'ALMPE';
    return (
      <View style={styles.puzzleBox}>
        <View style={[styles.scrambleBanner, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.scrambleText, { color: theme.colors.primary }]}>{scrambled}</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.numberInput, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary }]}
            value={scrambleInput}
            onChangeText={setScrambleInput}
            autoCapitalize="characters"
            placeholder="UNSCRAMBLE"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              if (scrambleInput.trim().length > 0) {
                sendAction({ type: 'SUBMIT_WORD', word: scrambleInput.trim() });
                setScrambleInput('');
              }
            }}
          >
            <Text style={styles.actionBtnText}>SOLVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 17. Mobile Typing Race
  const renderTypingRace = () => {
    const prompt = gameState?.promptText || 'The quick brown fox jumps over the lazy dog.';
    const progress = gameState?.progress?.[user?.id || ''] || 0;
    const wpm = gameState?.wpm?.[user?.id || ''] || 0;

    return (
      <View style={styles.puzzleBox}>
        <View style={[styles.typingCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.typingPrompt, { color: theme.colors.textPrimary }]}>
            <Text style={{ color: '#3ED598' }}>{prompt.slice(0, progress)}</Text>
            <Text style={{ color: theme.colors.textPrimary }}>{prompt.slice(progress)}</Text>
          </Text>
        </View>
        <TextInput
          style={[styles.typingInputBox, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary }]}
          value={typingInput}
          onChangeText={(val) => {
            setTypingInput(val);
            sendAction({ type: 'TYPE_UPDATE', typedText: val });
          }}
          placeholder="Start typing prompt here..."
          placeholderTextColor="#64748B"
          autoCapitalize="none"
        />
        <View style={[styles.bannerPill, { backgroundColor: theme.colors.surface, marginTop: 8 }]}>
          <Text style={{ color: '#3ED598', fontWeight: '800' }}>SPEED: {wpm} WPM</Text>
        </View>
      </View>
    );
  };

  // Switch router for the 17 game components
  const renderGameContent = () => {
    switch (gameType) {
      case 'ROCK_PAPER_SCISSORS': return renderRps();
      case 'REACTION_TEST': return renderReactionTest();
      case 'NUMBER_GUESS': return renderNumberGuess();
      case 'SPEED_TAP': return renderSpeedTap();
      case 'COLOR_MATCH': return renderColorMatch();
      case 'MATH_BATTLE': return renderMathBattle();
      case 'QUICK_DRAW': return renderQuickDraw();
      case 'WORDLE_DUEL': return renderWordle();
      case 'HANGMAN': return renderHangman();
      case 'MEMORY_MATCH': return renderMemoryMatch();
      case 'QUIZ_BATTLE': return renderQuizBattle();
      case '2048_MULTIPLAYER': return render2048();
      case 'MINESWEEPER_DUEL': return renderMinesweeper();
      case 'PATTERN_MATCH': return renderPattern();
      case 'MASTERMIND': return renderMastermind();
      case 'WORD_SCRAMBLE': return renderWordScramble();
      case 'TYPING_RACE': return renderTypingRace();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
          <Text style={styles.leaveBtnText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.gameTitle, { color: theme.colors.textPrimary }]}>
            {getGameTitle()}
          </Text>
          <View style={styles.roomCodePill}>
            <Text style={styles.roomCodeText}>ROOM {roomCode}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.leaveBtn, { backgroundColor: theme.colors.cardTintMint, paddingHorizontal: 8 }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <InfoIcon size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={[styles.timerPill, { backgroundColor: secondsRemaining <= 3 ? '#FF565E' : theme.colors.surface }]}>
            <Text style={styles.timerText}>{secondsRemaining}s</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* HUD Player Comparison Card */}
        <View style={[styles.hudCard, { backgroundColor: '#141822', borderColor: '#262D3D', borderWidth: 1.5 }]}>
          <View style={[styles.playerCol, isMyTurn && styles.activePlayerCol]}>
            <Avatar displayName={p1Name} size="md" />
            <Text style={[styles.playerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {p1Name}
            </Text>
            <Text style={[styles.playerScore, { color: theme.colors.primary }]}>
              {p1 ? scores[p1.userId] || 0 : 0} pts
            </Text>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={[styles.playerCol, !isMyTurn && styles.activePlayerCol]}>
            <Avatar displayName={p2Name} size="md" />
            <Text style={[styles.playerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {p2Name}
            </Text>
            <Text style={[styles.playerScore, { color: theme.colors.primary }]}>
              {p2 ? scores[p2.userId] || 0 : 0} pts
            </Text>
          </View>
        </View>

        {/* Dynamic Game Component */}
        {renderGameContent()}
      </ScrollView>

      {/* Result & Rematch Modal */}
      <Modal visible={rematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <TrophyIcon size={48} color="#FFC542" />
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {gameResult?.winnerId === user?.id ? 'Victory!' : 'Game Over'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
              {gameResult?.winnerId === user?.id
                ? 'Outstanding performance! You won the match.'
                : 'Great match! Better luck in the next duel.'}
            </Text>

            {rematchOfferPending ? (
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3ED598' }]}
                onPress={handleAcceptRematch}
              >
                <Text style={styles.modalBtnText}>ACCEPT REMATCH</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleOfferRematch}
              >
                <Text style={styles.modalBtnText}>PLAY AGAIN</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.surface, marginTop: 6 }]}
              onPress={() => {
                setRematchModalVisible(false);
                onLeave();
              }}
            >
              <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>LEAVE ROOM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={gameType}
        gameTitle={getGameTitle()}
        category="PUZZLE"
        onClose={() => setIsRulesModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E232E',
  },
  leaveBtnText: {
    color: '#FF565E',
    fontWeight: '700',
    fontSize: 13,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  roomCodePill: {
    backgroundColor: '#1E232E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  roomCodeText: {
    color: '#FFC542',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  contentScroll: {
    padding: 14,
    alignItems: 'center',
  },
  hudCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 22,
    marginBottom: 12,
  },
  playerCol: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    minWidth: 100,
    backgroundColor: '#161922',
    borderWidth: 1.5,
    borderColor: '#262D3D',
  },
  activePlayerCol: {
    borderWidth: 2,
    borderColor: '#3ED598',
    backgroundColor: '#133526',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  playerScore: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  vsBadge: {
    backgroundColor: '#1E232E',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#FFC542',
    fontWeight: '800',
    fontSize: 12,
  },
  puzzleBox: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  rpsButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rpsChoiceBtn: {
    width: 90,
    height: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rpsBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bannerPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reactionPad: {
    width: BOARD_SIZE,
    height: 200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  reactionPadHeader: {
    color: '#1F2C34',
    fontSize: 28,
    fontWeight: '900',
  },
  reactionPadSub: {
    color: '#1F2C34',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  reactionTimeDisplay: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 10,
  },
  numberInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryActionBtn: {
    width: 96,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#1F2C34',
    fontSize: 14,
    fontWeight: '800',
  },
  historyList: {
    marginTop: 14,
    width: '100%',
  },
  historyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  speedTapRushPad: {
    width: BOARD_SIZE,
    height: 180,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  speedTapPadText: {
    color: '#1F2C34',
    fontSize: 22,
    fontWeight: '900',
  },
  speedTapCounterText: {
    color: '#1F2C34',
    fontSize: 48,
    fontWeight: '900',
  },
  stroopCard: {
    width: '100%',
    padding: 24,
    borderRadius: 22,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stroopWord: {
    fontSize: 42,
    fontWeight: '900',
  },
  stroopQuestion: {
    fontSize: 14,
    fontWeight: '600',
  },
  stroopActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  stroopBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stroopBtnText: {
    color: '#1F2C34',
    fontSize: 15,
    fontWeight: '800',
  },
  mathCard: {
    width: '100%',
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  mathEquation: {
    fontSize: 34,
    fontWeight: '900',
  },
  mathGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  mathOptionBtn: {
    width: (SCREEN_WIDTH - 38) / 2,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathOptionText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  quickDrawPad: {
    width: BOARD_SIZE,
    height: 190,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  quickDrawPrompt: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  wordleBoard: {
    gap: 6,
    marginBottom: 14,
  },
  wordleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wordleCell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordleLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  wordleInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hangmanBlanks: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },
  hangmanCharBox: {
    width: 32,
    height: 42,
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangmanChar: {
    fontSize: 24,
    fontWeight: '900',
  },
  alphabetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  alphabetKey: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetKeyText: {
    fontSize: 15,
    fontWeight: '800',
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  memoryCard: {
    width: (BOARD_SIZE - 24) / 4,
    height: (BOARD_SIZE - 24) / 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryCardIcon: {
    color: '#FFC542',
    fontSize: 14,
    fontWeight: '900',
  },
  quizQuestionCard: {
    width: '100%',
    padding: 20,
    borderRadius: 22,
    marginBottom: 14,
  },
  quizQuestionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  quizOptionsGrid: {
    gap: 8,
    width: '100%',
  },
  quizOptionBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  quizOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  board2048: {
    backgroundColor: '#161922',
    padding: 8,
    borderRadius: 16,
    gap: 6,
  },
  row2048: {
    flexDirection: 'row',
    gap: 6,
  },
  cell2048: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val2048: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dpad: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dpadMiddle: {
    flexDirection: 'row',
    gap: 16,
  },
  dpadBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E232E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    color: '#3ED598',
    fontSize: 18,
    fontWeight: '900',
  },
  mineModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mineModeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E232E',
  },
  mineModeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  mineGrid: {
    gap: 4,
  },
  mineRow: {
    flexDirection: 'row',
    gap: 4,
  },
  mineCell: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mineCellText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  simonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: 240,
    justifyContent: 'center',
  },
  simonPad: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mastermindBoard: {
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  mastermindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E232E',
    padding: 10,
    borderRadius: 12,
  },
  mastermindPegs: {
    flexDirection: 'row',
    gap: 6,
  },
  pegCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scrambleBanner: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginBottom: 12,
  },
  scrambleText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },
  typingCard: {
    width: '100%',
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
  },
  typingPrompt: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  typingInputBox: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 25,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalBtnText: {
    color: '#1F2C34',
    fontSize: 15,
    fontWeight: '800',
  },
});
