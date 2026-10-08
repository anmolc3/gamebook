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

export type PartyGameType =
  | 'WOULD_YOU_RATHER'
  | 'TRUTH_OR_DARE'
  | 'CHARADES'
  | 'GUESS_PICTURE'
  | 'GUESS_WORD'
  | 'GUESS_SONG'
  | 'WHO_AM_I'
  | 'IMPOSTER'
  | 'MAFIA'
  | 'DRAW_AND_GUESS'
  | 'PICTIONARY'
  | 'NEVER_HAVE_I_EVER'
  | 'THIS_OR_THAT'
  | 'TWO_TRUTHS_AND_A_LIE';

export interface PartyGameScreenProps {
  roomCode: string;
  gameType: PartyGameType;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PartyGameScreen: React.FC<PartyGameScreenProps> = ({
  roomCode,
  gameType,
  roomDetails,
  onLeave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Authoritative match state
  const [gameState, setGameState] = useState<any>(null);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);
  const [rematchModalVisible, setRematchModalVisible] = useState<boolean>(false);
  const [rematchOfferPending, setRematchOfferPending] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Local inputs
  const [charadesGuess, setCharadesGuess] = useState<string>('');
  const [pictureGuess, setPictureGuess] = useState<string>('');
  const [tabooClueInput, setTabooClueInput] = useState<string>('');
  const [tabooGuessInput, setTabooGuessInput] = useState<string>('');
  const [whoAmIQuestionInput, setWhoAmIQuestionInput] = useState<string>('');
  const [whoAmIIdentityInput, setWhoAmIIdentityInput] = useState<string>('');
  const [imposterClueInput, setImposterClueInput] = useState<string>('');
  const [imposterLocationInput, setImposterLocationInput] = useState<string>('');
  const [drawGuessInput, setDrawGuessInput] = useState<string>('');
  const [pictionaryGuessInput, setPictionaryGuessInput] = useState<string>('');
  const [customStatements, setCustomStatements] = useState<[string, string, string]>([
    'I have met a celebrity',
    'I can juggle four oranges',
    'I have never broken a bone',
  ]);
  const [customLieIdx, setCustomLieIdx] = useState<number>(1);

  // Drawing state
  const [brushColor, setBrushColor] = useState<string>('#54D6FF');
  const [brushWidth, setBrushWidth] = useState<number>(3);

  const turnTimerRef = useRef<any>(null);

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
      .catch((err) => console.log('[PartyGameScreen] getGameState err:', err));

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

  const getGameTitle = () => {
    switch (gameType) {
      case 'WOULD_YOU_RATHER': return 'Would You Rather?';
      case 'TRUTH_OR_DARE': return 'Truth or Dare Social';
      case 'CHARADES': return 'Charades Party';
      case 'GUESS_PICTURE': return 'Pixel Reveal Guess';
      case 'GUESS_WORD': return 'Taboo Word Clue';
      case 'GUESS_SONG': return 'Name That Tune';
      case 'WHO_AM_I': return 'Who Am I?';
      case 'IMPOSTER': return 'The Imposter';
      case 'MAFIA': return 'Mafia / Werewolf';
      case 'DRAW_AND_GUESS': return 'Draw & Guess Live';
      case 'PICTIONARY': return 'Pictionary Duel';
      case 'NEVER_HAVE_I_EVER': return 'Never Have I Ever';
      case 'THIS_OR_THAT': return 'This or That';
      case 'TWO_TRUTHS_AND_A_LIE': return '2 Truths and a Lie';
      default: return 'Party Game';
    }
  };

  // --------------------------------------------------------------------------
  // Game Stage Renderers
  // --------------------------------------------------------------------------

  // 1. WOULD YOU RATHER
  const renderWouldYouRather = () => {
    const dilemma = gameState?.currentDilemma;
    const myVote = gameState?.votes?.[user?.id || ''];
    return (
      <View style={styles.cardContainer}>
        <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
          Which one would you choose?
        </Text>
        <TouchableOpacity
          style={[
            styles.wyrCard,
            myVote === 'A' && styles.selectedOptionCard,
            { backgroundColor: myVote === 'A' ? theme.colors.surfaceElevated : theme.colors.surface },
          ]}
          onPress={() => sendAction({ type: 'VOTE', choice: 'A' })}
          activeOpacity={0.8}
        >
          <View style={styles.optionBadge}><Text style={styles.optionBadgeText}>A</Text></View>
          <Text style={[styles.wyrText, { color: theme.colors.textPrimary }]}>
            {dilemma?.optionA || 'Option A'}
          </Text>
        </TouchableOpacity>

        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>OR</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.wyrCard,
            myVote === 'B' && styles.selectedOptionCard,
            { backgroundColor: myVote === 'B' ? theme.colors.surfaceElevated : theme.colors.surface },
          ]}
          onPress={() => sendAction({ type: 'VOTE', choice: 'B' })}
          activeOpacity={0.8}
        >
          <View style={styles.optionBadge}><Text style={styles.optionBadgeText}>B</Text></View>
          <Text style={[styles.wyrText, { color: theme.colors.textPrimary }]}>
            {dilemma?.optionB || 'Option B'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 2. TRUTH OR DARE
  const renderTruthOrDare = () => {
    const isMyTurn = gameState?.turnPlayerId === user?.id;
    const selectedType = gameState?.selectedType;
    const prompt = gameState?.currentPrompt;

    return (
      <View style={styles.cardContainer}>
        <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
          {isMyTurn ? "It's your turn!" : `Waiting for player's choice...`}
        </Text>

        {!selectedType ? (
          <View style={styles.dualActionRow}>
            <TouchableOpacity
              style={[styles.bigActionButton, { backgroundColor: '#29B6F6' }]}
              disabled={!isMyTurn}
              onPress={() => sendAction({ type: 'CHOOSE_CATEGORY', category: 'TRUTH' })}
            >
              <Text style={styles.bigActionText}>TRUTH</Text>
              <Text style={styles.actionSubtext}>Honest confessions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigActionButton, { backgroundColor: '#FF7043' }]}
              disabled={!isMyTurn}
              onPress={() => sendAction({ type: 'CHOOSE_CATEGORY', category: 'DARE' })}
            >
              <Text style={styles.bigActionText}>DARE</Text>
              <Text style={styles.actionSubtext}>Exciting challenges</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{selectedType}</Text>
            </View>
            <Text style={[styles.promptContentText, { color: theme.colors.textPrimary }]}>
              {prompt || 'Loading challenge...'}
            </Text>
            {isMyTurn && (
              <View style={styles.verifyRow}>
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: '#26A69A' }]}
                  onPress={() => sendAction({ type: 'VERIFY_COMPLETION', completed: true })}
                >
                  <Text style={styles.verifyButtonText}>Completed (+{selectedType === 'DARE' ? '20' : '10'} pts)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: '#78909C' }]}
                  onPress={() => sendAction({ type: 'VERIFY_COMPLETION', completed: false })}
                >
                  <Text style={styles.verifyButtonText}>Pass / Forfeit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // 3. CHARADES
  const renderCharades = () => {
    const isActor = gameState?.actorId === user?.id;
    return (
      <View style={styles.cardContainer}>
        {isActor ? (
          <View style={[styles.actorCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.actorNotice}>YOU ARE THE ACTOR!</Text>
            <Text style={styles.secretWordHighlight}>{gameState?.secretWord || '...'}</Text>
            <Text style={[styles.categoryInfo, { color: theme.colors.textSecondary }]}>
              Category: {gameState?.category || 'General'}
            </Text>
            <TouchableOpacity
              style={[styles.confirmSolveBtn, { backgroundColor: '#54D6FF' }]}
              onPress={() => sendAction({ type: 'CONFIRM_SOLVE' })}
            >
              <Text style={styles.confirmSolveBtnText}>Mark Solved (+10 pts)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guesserContainer}>
            <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.actorNotice}>WATCH THE ACTOR</Text>
              <Text style={[styles.categoryInfo, { color: theme.colors.textSecondary }]}>
                Category: {gameState?.category || 'General'}
              </Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
                placeholder="Type your guess here..."
                placeholderTextColor={theme.colors.textSecondary}
                value={charadesGuess}
                onChangeText={setCharadesGuess}
              />
              <TouchableOpacity
                style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
                onPress={() => {
                  if (charadesGuess.trim()) {
                    sendAction({ type: 'GUESS', guess: charadesGuess });
                    setCharadesGuess('');
                  }
                }}
              >
                <Text style={styles.submitGuessBtnText}>Guess</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // 4. GUESS PICTURE
  const renderGuessPicture = () => {
    const level = gameState?.pixelationLevel || 10;
    return (
      <View style={styles.cardContainer}>
        <View style={styles.pictureCanvasBox}>
          <Svg width={240} height={180} viewBox="0 0 240 180">
            <Rect x="0" y="0" width="240" height="180" rx="16" fill="#161922" />
            <Circle cx="120" cy="90" r={40 + (10 - level) * 4} fill="#54D6FF" opacity={0.3} />
            <Circle cx="120" cy="90" r={24} fill="#54D6FF" opacity={0.6} />
            <SvgText
              x="120"
              y="98"
              fill="#FFFFFF"
              fontSize="16"
              fontWeight="bold"
              textAnchor="middle"
            >
              {level > 1 ? `Pixelation: ${level}/10` : 'REVEALED!'}
            </SvgText>
          </Svg>
          <Text style={[styles.clueHintText, { color: theme.colors.textSecondary }]}>
            Hint: {gameState?.clueHint || 'Identify the secret item'}
          </Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
            placeholder="Guess the image..."
            placeholderTextColor={theme.colors.textSecondary}
            value={pictureGuess}
            onChangeText={setPictureGuess}
          />
          <TouchableOpacity
            style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
            onPress={() => {
              if (pictureGuess.trim()) {
                sendAction({ type: 'SUBMIT_GUESS', guess: pictureGuess });
                setPictureGuess('');
              }
            }}
          >
            <Text style={styles.submitGuessBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 5. TABOO WORD CLUE
  const renderGuessWord = () => {
    const isClueGiver = gameState?.clueGiverId === user?.id;
    const card = gameState?.currentCard;

    return (
      <View style={styles.cardContainer}>
        {isClueGiver ? (
          <View style={[styles.tabooCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.tabooTargetWord}>{card?.targetWord || 'TARGET'}</Text>
            <Text style={styles.tabooWarning}>DO NOT SAY THESE WORDS:</Text>
            <View style={styles.tabooChipWrap}>
              {card?.tabooWords?.map((tw: string, idx: number) => (
                <View key={idx} style={styles.tabooForbiddenChip}>
                  <Text style={styles.tabooForbiddenText}>{tw}</Text>
                </View>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#FF7043' }]}
                placeholder="Give a safe clue..."
                placeholderTextColor={theme.colors.textSecondary}
                value={tabooClueInput}
                onChangeText={setTabooClueInput}
              />
              <TouchableOpacity
                style={[styles.submitGuessBtn, { backgroundColor: '#FF7043' }]}
                onPress={() => {
                  if (tabooClueInput.trim()) {
                    sendAction({ type: 'GIVE_CLUE', clue: tabooClueInput });
                    setTabooClueInput('');
                  }
                }}
              >
                <Text style={styles.submitGuessBtnText}>Clue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.guesserContainer}>
            <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.actorNotice}>LISTEN TO CLUES</Text>
              <Text style={[styles.categoryInfo, { color: theme.colors.textSecondary }]}>
                Recent clues: {gameState?.cluesGiven?.slice(-2).join(' • ') || 'None yet'}
              </Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
                placeholder="Type your guess..."
                placeholderTextColor={theme.colors.textSecondary}
                value={tabooGuessInput}
                onChangeText={setTabooGuessInput}
              />
              <TouchableOpacity
                style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
                onPress={() => {
                  if (tabooGuessInput.trim()) {
                    sendAction({ type: 'SUBMIT_GUESS', guess: tabooGuessInput });
                    setTabooGuessInput('');
                  }
                }}
              >
                <Text style={styles.submitGuessBtnText}>Guess</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // 6. NAME THAT TUNE
  const renderGuessSong = () => {
    const riddle = gameState?.currentRiddle;
    const myAnswer = gameState?.answers?.[user?.id || ''];

    return (
      <View style={styles.cardContainer}>
        <View style={styles.vinylContainer}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="48" fill="#12141A" stroke="#222632" strokeWidth="3" />
            <Circle cx="50" cy="50" r="32" fill="#161922" />
            <Circle cx="50" cy="50" r="14" fill="#54D6FF" />
            <Circle cx="50" cy="50" r="4" fill="#FFFFFF" />
          </Svg>
        </View>
        <Text style={[styles.lyricSnippetText, { color: theme.colors.textPrimary }]}>
          "{riddle?.snippetLyrics || 'Song snippet...'}"
        </Text>
        <Text style={[styles.artistHintText, { color: theme.colors.textSecondary }]}>
          Artist: {riddle?.artist || 'Unknown'}
        </Text>
        <View style={styles.songOptionsGrid}>
          {riddle?.options?.map((opt: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.songOptionButton,
                myAnswer === opt && styles.selectedOptionCard,
                { backgroundColor: myAnswer === opt ? theme.colors.surfaceElevated : theme.colors.surface },
              ]}
              onPress={() => sendAction({ type: 'ANSWER_SONG', selectedTitle: opt })}
            >
              <Text style={[styles.songOptionText, { color: theme.colors.textPrimary }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 7. WHO AM I?
  const renderWhoAmI = () => {
    const isMyTurn = gameState?.turnPlayerId === user?.id;
    return (
      <View style={styles.cardContainer}>
        <View style={[styles.stickyNote, { backgroundColor: '#FFD54F' }]}>
          <Text style={styles.stickyPin}>📌</Text>
          <Text style={styles.stickyTitle}>ON YOUR FOREHEAD</Text>
          <Text style={styles.stickySubtitle}>Ask Yes/No questions to deduce who you are!</Text>
        </View>

        {isMyTurn ? (
          <View style={styles.whoAmIActionBox}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
                placeholder="Ask Yes/No question..."
                placeholderTextColor={theme.colors.textSecondary}
                value={whoAmIQuestionInput}
                onChangeText={setWhoAmIQuestionInput}
              />
              <TouchableOpacity
                style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
                onPress={() => {
                  if (whoAmIQuestionInput.trim()) {
                    sendAction({ type: 'ASK_QUESTION', question: whoAmIQuestionInput });
                    setWhoAmIQuestionInput('');
                  }
                }}
              >
                <Text style={styles.submitGuessBtnText}>Ask</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#81C784' }]}
                placeholder="Guess your identity..."
                placeholderTextColor={theme.colors.textSecondary}
                value={whoAmIIdentityInput}
                onChangeText={setWhoAmIIdentityInput}
              />
              <TouchableOpacity
                style={[styles.submitGuessBtn, { backgroundColor: '#81C784' }]}
                onPress={() => {
                  if (whoAmIIdentityInput.trim()) {
                    sendAction({ type: 'GUESS_IDENTITY', identity: whoAmIIdentityInput });
                    setWhoAmIIdentityInput('');
                  }
                }}
              >
                <Text style={styles.submitGuessBtnText}>Solve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.whoAmIResponderBox}>
            <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
              Answer the current player's question:
            </Text>
            <View style={styles.dualActionRow}>
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => sendAction({ type: 'ANSWER_QUESTION', yes: true })}
              >
                <Text style={styles.verifyButtonText}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: '#E53935' }]}
                onPress={() => sendAction({ type: 'ANSWER_QUESTION', yes: false })}
              >
                <Text style={styles.verifyButtonText}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // 8. THE IMPOSTER
  const renderImposter = () => {
    const isImposter = gameState?.imposterId === user?.id;
    const phase = gameState?.phase || 'DISCUSSION';

    return (
      <View style={styles.cardContainer}>
        <View
          style={[
            styles.imposterDossier,
            { backgroundColor: isImposter ? '#C62828' : theme.colors.surface },
          ]}
        >
          <Text style={styles.dossierBadge}>
            {isImposter ? 'CONFIDENTIAL • YOU ARE THE IMPOSTER' : 'MISSION DOSSIER'}
          </Text>
          <Text style={styles.dossierLocation}>
            {isImposter ? 'BLUFF YOUR WAY THROUGH' : gameState?.secretLocation || 'Classified'}
          </Text>
          <Text style={styles.dossierPhase}>Phase: {phase}</Text>
        </View>

        {phase === 'DISCUSSION' && (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
              placeholder="Submit a subtle clue..."
              placeholderTextColor={theme.colors.textSecondary}
              value={imposterClueInput}
              onChangeText={setImposterClueInput}
            />
            <TouchableOpacity
              style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
              onPress={() => {
                if (imposterClueInput.trim()) {
                  sendAction({ type: 'SUBMIT_CLUE', clue: imposterClueInput });
                  setImposterClueInput('');
                }
              }}
            >
              <Text style={styles.submitGuessBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'VOTING' && (
          <View style={styles.votingContainer}>
            <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
              Vote for the Imposter:
            </Text>
            <View style={styles.suspectGrid}>
              {playerList.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.suspectChip,
                    gameState?.votes?.[user?.id || ''] === p.userId && styles.selectedOptionCard,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={() => sendAction({ type: 'VOTE_IMPOSTER', targetUserId: p.userId })}
                >
                  <Text style={[styles.suspectName, { color: theme.colors.textPrimary }]}>
                    {p.user?.displayName || p.user?.username || `P${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {isImposter && (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#FFB300' }]}
              placeholder="Guess location to win..."
              placeholderTextColor={theme.colors.textSecondary}
              value={imposterLocationInput}
              onChangeText={setImposterLocationInput}
            />
            <TouchableOpacity
              style={[styles.submitGuessBtn, { backgroundColor: '#FFB300' }]}
              onPress={() => {
                if (imposterLocationInput.trim()) {
                  sendAction({ type: 'GUESS_LOCATION', location: imposterLocationInput });
                  setImposterLocationInput('');
                }
              }}
            >
              <Text style={[styles.submitGuessBtnText, { color: '#000' }]}>Guess</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 9. MAFIA / WEREWOLF
  const renderMafia = () => {
    const role = gameState?.playerRoles?.[user?.id || ''] || 'VILLAGER';
    const phase = gameState?.phase || 'NIGHT';
    const alivePlayers: string[] = gameState?.alivePlayers || [];

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.mafiaRoleCard, { backgroundColor: role === 'MAFIA' ? '#B71C1C' : '#263238' }]}>
          <Text style={styles.mafiaRoleTitle}>YOUR SECRET ROLE: {role}</Text>
          <Text style={styles.mafiaPhaseStatus}>
            {phase === 'NIGHT' ? '🌙 Night Phase • Quiet Eliminations' : '☀️ Day Phase • Public Lynching Vote'}
          </Text>
        </View>

        {phase === 'NIGHT' && role === 'MAFIA' && (
          <View style={styles.votingContainer}>
            <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
              Pick Target to Eliminate:
            </Text>
            <View style={styles.suspectGrid}>
              {alivePlayers.filter((id) => id !== user?.id).map((targetId, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suspectChip, { backgroundColor: '#D32F2F' }]}
                  onPress={() => sendAction({ type: 'MAFIA_KILL', targetUserId: targetId })}
                >
                  <Text style={styles.suspectName}>{targetId}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {phase === 'NIGHT' && role === 'DOCTOR' && (
          <View style={styles.votingContainer}>
            <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
              Pick Player to Save Tonight:
            </Text>
            <View style={styles.suspectGrid}>
              {alivePlayers.map((targetId, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suspectChip, { backgroundColor: '#00897B' }]}
                  onPress={() => sendAction({ type: 'DOCTOR_SAVE', targetUserId: targetId })}
                >
                  <Text style={styles.suspectName}>{targetId}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {phase === 'DAY_VOTING' && (
          <View style={styles.votingContainer}>
            <Text style={[styles.promptTitle, { color: theme.colors.textPrimary }]}>
              Vote to Lynch Suspect:
            </Text>
            <View style={styles.suspectGrid}>
              {alivePlayers.map((targetId, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suspectChip, { backgroundColor: '#37474F' }]}
                  onPress={() => sendAction({ type: 'DAY_VOTE', targetUserId: targetId })}
                >
                  <Text style={styles.suspectName}>{targetId}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // 10. DRAW & GUESS LIVE
  const renderDrawAndGuess = () => {
    const isDrawer = gameState?.drawerId === user?.id;
    const strokes = gameState?.strokes || [];

    return (
      <View style={styles.cardContainer}>
        {isDrawer ? (
          <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.actorNotice}>YOU ARE DRAWING</Text>
            <Text style={styles.secretWordHighlight}>{gameState?.secretPrompt || '...'}</Text>
          </View>
        ) : (
          <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.actorNotice}>GUESS WHAT'S BEING DRAWN!</Text>
          </View>
        )}

        <View style={styles.drawingBoard}>
          <Svg width={300} height={200} viewBox="0 0 300 200">
            <Rect x="0" y="0" width="300" height="200" rx="12" fill="#1C272C" />
            {strokes.map((st: any, idx: number) => (
              <Circle
                key={idx}
                cx={st.x}
                cy={st.y}
                r={st.width || 3}
                fill={st.color || '#54D6FF'}
              />
            ))}
          </Svg>
        </View>

        {isDrawer ? (
          <View style={styles.drawControls}>
            <TouchableOpacity
              style={[styles.colorDot, { backgroundColor: '#54D6FF' }]}
              onPress={() => setBrushColor('#54D6FF')}
            />
            <TouchableOpacity
              style={[styles.colorDot, { backgroundColor: '#FF7043' }]}
              onPress={() => setBrushColor('#FF7043')}
            />
            <TouchableOpacity
              style={[styles.colorDot, { backgroundColor: '#FFD54F' }]}
              onPress={() => setBrushColor('#FFD54F')}
            />
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: '#37474F' }]}
              onPress={() => sendAction({ type: 'CLEAR_CANVAS' })}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
              placeholder="Submit chat guess..."
              placeholderTextColor={theme.colors.textSecondary}
              value={drawGuessInput}
              onChangeText={setDrawGuessInput}
            />
            <TouchableOpacity
              style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
              onPress={() => {
                if (drawGuessInput.trim()) {
                  sendAction({ type: 'SUBMIT_GUESS', guess: drawGuessInput });
                  setDrawGuessInput('');
                }
              }}
            >
              <Text style={styles.submitGuessBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 11. PICTIONARY DUEL
  const renderPictionary = () => {
    const isDrawer = gameState?.drawerId === user?.id;
    return (
      <View style={styles.cardContainer}>
        {isDrawer ? (
          <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.actorNotice}>PICTIONARY: YOUR WORD</Text>
            <Text style={styles.secretWordHighlight}>{gameState?.targetWord || '...'}</Text>
          </View>
        ) : (
          <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.actorNotice}>PICTIONARY DUEL</Text>
            <Text style={[styles.categoryInfo, { color: theme.colors.textSecondary }]}>
              Category: {gameState?.category || 'General'}
            </Text>
          </View>
        )}

        <View style={styles.drawingBoard}>
          <Svg width={300} height={180} viewBox="0 0 300 180">
            <Rect x="0" y="0" width="300" height="180" rx="12" fill="#1C272C" />
            {(gameState?.strokes || []).map((st: any, idx: number) => (
              <Circle key={idx} cx={st.x} cy={st.y} r={st.width || 3} fill={st.color || '#54D6FF'} />
            ))}
          </Svg>
        </View>

        {!isDrawer && (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: '#54D6FF' }]}
              placeholder="Guess the drawing..."
              placeholderTextColor={theme.colors.textSecondary}
              value={pictionaryGuessInput}
              onChangeText={setPictionaryGuessInput}
            />
            <TouchableOpacity
              style={[styles.submitGuessBtn, { backgroundColor: '#54D6FF' }]}
              onPress={() => {
                if (pictionaryGuessInput.trim()) {
                  sendAction({ type: 'SUBMIT_GUESS', guess: pictionaryGuessInput });
                  setPictionaryGuessInput('');
                }
              }}
            >
              <Text style={styles.submitGuessBtnText}>Solve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 12. NEVER HAVE I EVER
  const renderNeverHaveIEver = () => {
    const myLives = gameState?.lives?.[user?.id || ''] ?? 10;
    const answered = gameState?.confessions?.[user?.id || ''] !== null;

    return (
      <View style={styles.cardContainer}>
        <View style={styles.livesBar}>
          <Text style={styles.livesText}>Fingers Up: {myLives} / 10</Text>
        </View>

        <View style={[styles.promptBox, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.promptContentText, { color: theme.colors.textPrimary }]}>
            {gameState?.currentPrompt || 'Loading statement...'}
          </Text>
        </View>

        <View style={styles.dualActionRow}>
          <TouchableOpacity
            style={[
              styles.bigActionButton,
              { backgroundColor: '#E53935' },
              answered && { opacity: 0.6 },
            ]}
            disabled={answered}
            onPress={() => sendAction({ type: 'CONFESS', iHaveDoneThis: true })}
          >
            <Text style={styles.bigActionText}>I HAVE</Text>
            <Text style={styles.actionSubtext}>Put 1 finger down</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.bigActionButton,
              { backgroundColor: '#43A047' },
              answered && { opacity: 0.6 },
            ]}
            disabled={answered}
            onPress={() => sendAction({ type: 'CONFESS', iHaveDoneThis: false })}
          >
            <Text style={styles.bigActionText}>NEVER</Text>
            <Text style={styles.actionSubtext}>Keep your finger up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 13. THIS OR THAT
  const renderThisOrThat = () => {
    const pair = gameState?.currentPair;
    const myChoice = gameState?.selections?.[user?.id || ''];

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[
            styles.wyrCard,
            myChoice === 'A' && styles.selectedOptionCard,
            { backgroundColor: myChoice === 'A' ? theme.colors.surfaceElevated : theme.colors.surface },
          ]}
          onPress={() => sendAction({ type: 'CHOOSE', choice: 'A' })}
        >
          <Text style={[styles.wyrText, { color: theme.colors.textPrimary }]}>
            {pair?.optionA || 'Option A'}
          </Text>
        </TouchableOpacity>

        <View style={styles.vsDivider}><Text style={styles.vsText}>VS</Text></View>

        <TouchableOpacity
          style={[
            styles.wyrCard,
            myChoice === 'B' && styles.selectedOptionCard,
            { backgroundColor: myChoice === 'B' ? theme.colors.surfaceElevated : theme.colors.surface },
          ]}
          onPress={() => sendAction({ type: 'CHOOSE', choice: 'B' })}
        >
          <Text style={[styles.wyrText, { color: theme.colors.textPrimary }]}>
            {pair?.optionB || 'Option B'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 14. 2 TRUTHS AND A LIE
  const renderTwoTruths = () => {
    const isSpeaker = gameState?.speakerId === user?.id;
    const statements: string[] = gameState?.statements || [];
    const myVote = gameState?.votes?.[user?.id || ''];

    return (
      <View style={styles.cardContainer}>
        <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
          {isSpeaker ? 'Your Statements' : 'Spot the LIE! Tap the statement you think is false:'}
        </Text>

        {statements.map((stmt, idx) => (
          <TouchableOpacity
            key={idx}
            disabled={isSpeaker}
            style={[
              styles.twoTruthsCard,
              myVote === idx && styles.selectedOptionCard,
              { backgroundColor: myVote === idx ? theme.colors.surfaceElevated : theme.colors.surface },
            ]}
            onPress={() => sendAction({ type: 'VOTE_LIE', statementIndex: idx })}
          >
            <View style={styles.optionBadge}><Text style={styles.optionBadgeText}>{idx + 1}</Text></View>
            <Text style={[styles.twoTruthsText, { color: theme.colors.textPrimary }]}>
              {stmt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderActiveStage = () => {
    switch (gameType) {
      case 'WOULD_YOU_RATHER': return renderWouldYouRather();
      case 'TRUTH_OR_DARE': return renderTruthOrDare();
      case 'CHARADES': return renderCharades();
      case 'GUESS_PICTURE': return renderGuessPicture();
      case 'GUESS_WORD': return renderGuessWord();
      case 'GUESS_SONG': return renderGuessSong();
      case 'WHO_AM_I': return renderWhoAmI();
      case 'IMPOSTER': return renderImposter();
      case 'MAFIA': return renderMafia();
      case 'DRAW_AND_GUESS': return renderDrawAndGuess();
      case 'PICTIONARY': return renderPictionary();
      case 'NEVER_HAVE_I_EVER': return renderNeverHaveIEver();
      case 'THIS_OR_THAT': return renderThisOrThat();
      case 'TWO_TRUTHS_AND_A_LIE': return renderTwoTruths();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onLeave}>
          <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {getGameTitle()}
          </Text>
          <Text style={[styles.roomCodeText, { color: theme.colors.textSecondary }]}>
            Room: {roomCode} • R{round}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.timerBadge, { backgroundColor: theme.colors.cardTintMint, paddingHorizontal: 8 }]}
            onPress={() => setIsRulesModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Game Rules & Steps"
          >
            <InfoIcon size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{secondsRemaining}s</Text>
          </View>
        </View>
      </View>

      {/* Score Summary Bar */}
      <View style={[styles.scoresBar, { backgroundColor: theme.colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreScroll}>
          {playerList.map((p, idx) => (
            <View key={idx} style={styles.playerScoreItem}>
              <Avatar displayName={p.user?.displayName || p.user?.username || `P${idx + 1}`} size="sm" />
              <Text style={[styles.playerNameText, { color: theme.colors.textPrimary }]}>
                {p.user?.displayName || p.user?.username || `P${idx + 1}`}
              </Text>
              <Text style={styles.playerScoreValue}>{scores[p.userId] || 0}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Main Interactive Stage */}
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {renderActiveStage()}
      </ScrollView>

      {/* Rematch / Game Over Modal */}
      <Modal visible={rematchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surfaceElevated }]}>
            <TrophyIcon size={48} color="#FFD54F" />
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Game Concluded!
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {gameResult?.winnerId ? `Winner: ${gameResult.winnerId}` : 'Social Session Completed!'}
            </Text>

            <TouchableOpacity
              style={[styles.rematchButton, { backgroundColor: '#54D6FF' }]}
              onPress={rematchOfferPending ? handleAcceptRematch : handleOfferRematch}
            >
              <Text style={styles.rematchButtonText}>
                {rematchOfferPending ? 'Accept Rematch!' : 'Play Again'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.leaveModalButton} onPress={onLeave}>
              <Text style={[styles.leaveModalText, { color: theme.colors.textSecondary }]}>
                Return to Lobby
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GameRulesModal
        visible={isRulesModalVisible}
        gameType={gameType}
        gameTitle={getGameTitle()}
        category="PARTY"
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#1E232E',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roomCodeText: {
    fontSize: 12,
    marginTop: 2,
  },
  timerBadge: {
    backgroundColor: '#1E232E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scoresBar: {
    marginHorizontal: 14,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  scoreScroll: {
    alignItems: 'center',
  },
  playerScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#1E232E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  playerScoreValue: {
    color: '#FFD54F',
    fontWeight: 'bold',
    fontSize: 13,
  },
  mainScroll: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  cardContainer: {
    marginTop: 10,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  wyrCard: {
    borderRadius: 25,
    padding: 24,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOptionCard: {
    borderWidth: 2,
    borderColor: '#54D6FF',
  },
  optionBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C272C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  wyrText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  vsText: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dualActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bigActionButton: {
    flex: 1,
    height: 120,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  bigActionText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  promptBox: {
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#1C272C',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: '#FF7043',
    fontWeight: 'bold',
    fontSize: 12,
  },
  promptContentText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  verifyRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  verifyButton: {
    flex: 1,
    height: 54,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actorCard: {
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
  },
  actorNotice: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 12,
  },
  secretWordHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  categoryInfo: {
    fontSize: 14,
    marginBottom: 20,
  },
  confirmSolveBtn: {
    height: 54,
    width: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmSolveBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  guesserContainer: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  textInput: {
    flex: 1,
    height: 54,
    backgroundColor: '#161922',
    borderWidth: 0,
    borderRadius: 25,
    paddingHorizontal: 18,
    fontSize: 15,
  },
  submitGuessBtn: {
    width: 80,
    height: 54,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitGuessBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  pictureCanvasBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  clueHintText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  tabooCard: {
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
  },
  tabooTargetWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#54D6FF',
    marginBottom: 12,
  },
  tabooWarning: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF7043',
    marginBottom: 10,
  },
  tabooChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  tabooForbiddenChip: {
    backgroundColor: '#C62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tabooForbiddenText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  vinylContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lyricSnippetText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  artistHintText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  songOptionsGrid: {
    gap: 10,
  },
  songOptionButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  songOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stickyNote: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  stickyPin: {
    fontSize: 24,
    marginBottom: 4,
  },
  stickyTitle: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stickySubtitle: {
    color: '#333333',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  whoAmIActionBox: {
    gap: 12,
  },
  whoAmIResponderBox: {
    alignItems: 'center',
  },
  imposterDossier: {
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  dossierBadge: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  dossierLocation: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 6,
    textAlign: 'center',
  },
  dossierPhase: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  votingContainer: {
    marginTop: 10,
  },
  suspectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suspectChip: {
    flex: 1,
    minWidth: '45%',
    height: 54,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suspectName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  mafiaRoleCard: {
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  mafiaRoleTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 6,
  },
  mafiaPhaseStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  drawingBoard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  drawControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  livesBar: {
    alignItems: 'center',
    marginBottom: 14,
  },
  livesText: {
    color: '#54D6FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  twoTruthsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    padding: 18,
    marginBottom: 12,
  },
  twoTruthsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 36,
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
    borderRadius: 25,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 14,
  },
  modalSubtitle: {
    fontSize: 15,
    marginVertical: 10,
    textAlign: 'center',
  },
  rematchButton: {
    height: 54,
    width: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  rematchButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  leaveModalButton: {
    marginTop: 14,
    padding: 8,
  },
  leaveModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
