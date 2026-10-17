import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useAuth } from '../../features/auth/AuthContext';
import { MobileSocketService } from '../../services/socket.service';
import { RoomPlayer, RoomDetails } from '../../services/room.service';
import { SoundService } from '../../services/sound.service';
import { SoloService } from '../../services/solo.service';
import { Icon } from '../../icons';

export interface SnakesAndLaddersScreenProps {
  roomCode: string;
  roomDetails?: RoomDetails | null;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOARD_PADDING = 12;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - BOARD_PADDING * 2, 384);
const CELL_SIZE = (BOARD_SIZE - 8) / 10;

// Standard authoritative server Snakes & Ladders mappings
export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

// Pastel board cell colors matching the reference board design
const CELL_PALETTE = ['#BAE6FD', '#FEF08A', '#BBF7D0', '#FECDD3'];

// Player token theme colors
const PLAYER_THEMES = [
  { primary: '#2563EB', light: '#93C5FD', dark: '#1D4ED8', name: 'Blue' },
  { primary: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', name: 'Red' },
  { primary: '#10B981', light: '#6EE7B7', dark: '#047857', name: 'Green' },
  { primary: '#F59E0B', light: '#FCD34D', dark: '#B45309', name: 'Yellow' },
];

/**
 * Converts board square number (1 to 100) to pixel coordinates (center of square)
 */
export function getSquareCoords(squareNumber: number): { x: number; y: number } {
  const sq = Math.max(1, Math.min(100, squareNumber));
  const r = Math.floor((sq - 1) / 10); // 0 (bottom row) to 9 (top row)
  const c = r % 2 === 0 ? (sq - 1) % 10 : 9 - ((sq - 1) % 10);
  const screenRow = 9 - r;

  return {
    x: 4 + c * CELL_SIZE + CELL_SIZE / 2,
    y: 4 + screenRow * CELL_SIZE + CELL_SIZE / 2,
  };
}

export const PAWN_SIZE = Math.round(CELL_SIZE * 0.72);

export const getPawnOffsets = (idx: number, totalPlayers: number) => {
  const offsetX = (idx % 2 === 0 ? -1 : 1) * (totalPlayers > 1 ? 5 : 0);
  const offsetY = idx > 1 ? 4 : -2;
  return { offsetX, offsetY };
};

export const getPawnScreenCoords = (squareNum: number, idx: number, totalPlayers: number) => {
  const coords = getSquareCoords(squareNum);
  const { offsetX, offsetY } = getPawnOffsets(idx, totalPlayers);
  const half = PAWN_SIZE / 2;
  return {
    x: coords.x + offsetX - half,
    y: coords.y + offsetY - PAWN_SIZE + 4,
  };
};

/**
 * 3D SVG Conical Board Pawn Component
 */
const Pawn3D: React.FC<{
  colorIndex: number;
  size?: number;
  x?: number;
  y?: number;
}> = ({ colorIndex, size = 26, x = 0, y = 0 }) => {
  const theme = PLAYER_THEMES[colorIndex % PLAYER_THEMES.length];
  const half = size / 2;

  return (
    <G transform={`translate(${x - half}, ${y - size + 4})`}>
      {/* Pawn base cast shadow */}
      <Circle cx={half} cy={size - 2} r={half * 0.65} fill="rgba(0,0,0,0.32)" />

      {/* Pawn conical skirt */}
      <Path
        d={`M ${half * 0.4} ${size * 0.52} 
            C ${half * 0.25} ${size * 0.75}, ${half * 0.15} ${size * 0.88}, ${half * 0.2} ${size * 0.94}
            C ${half * 0.4} ${size * 1.02}, ${size - half * 0.4} ${size * 1.02}, ${size - half * 0.2} ${size * 0.94}
            C ${size - half * 0.15} ${size * 0.88}, ${size - half * 0.25} ${size * 0.75}, ${size - half * 0.4} ${size * 0.52}
            Z`}
        fill={theme.primary}
      />

      {/* Skirt specular 3D highlight */}
      <Path
        d={`M ${half * 0.45} ${size * 0.54}
            C ${half * 0.35} ${size * 0.72}, ${half * 0.3} ${size * 0.86}, ${half * 0.35} ${size * 0.92}
            C ${half * 0.55} ${size * 0.94}, ${half * 0.7} ${size * 0.92}, ${half * 0.75} ${size * 0.86}
            C ${half * 0.65} ${size * 0.72}, ${half * 0.55} ${size * 0.58}, ${half * 0.45} ${size * 0.54} Z`}
        fill={theme.light}
        opacity={0.65}
      />

      {/* Pawn collar ring */}
      <Rect
        x={half * 0.55}
        y={size * 0.45}
        width={size * 0.45}
        height={size * 0.1}
        rx={size * 0.05}
        fill={theme.dark}
      />

      {/* Pawn spherical head */}
      <Circle cx={half} cy={size * 0.26} r={size * 0.24} fill={theme.primary} />

      {/* Head 3D light reflection */}
      <Circle cx={half - size * 0.08} cy={size * 0.18} r={size * 0.08} fill="#FFFFFF" opacity={0.75} />
    </G>
  );
};

/**
 * 3D SVG Wooden Ladder
 */
const SvgLadder: React.FC<{
  startSq: number;
  endSq: number;
}> = ({ startSq, endSq }) => {
  const p1 = getSquareCoords(startSq);
  const p2 = getSquareCoords(endSq);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return null;

  const ux = dx / dist;
  const uy = dy / dist;
  const nx = -uy;
  const ny = ux;

  const ladderWidth = CELL_SIZE * 0.42;
  const halfW = ladderWidth / 2;

  // Rail 1
  const r1Start = { x: p1.x + nx * halfW, y: p1.y + ny * halfW };
  const r1End = { x: p2.x + nx * halfW, y: p2.y + ny * halfW };

  // Rail 2
  const r2Start = { x: p1.x - nx * halfW, y: p1.y - ny * halfW };
  const r2End = { x: p2.x - nx * halfW, y: p2.y - ny * halfW };

  // Rungs
  const rungCount = Math.max(3, Math.floor(dist / (CELL_SIZE * 0.48)));
  const rungs: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    rungs.push({
      x1: p1.x + dx * t + nx * halfW,
      y1: p1.y + dy * t + ny * halfW,
      x2: p1.x + dx * t - nx * halfW,
      y2: p1.y + dy * t - ny * halfW,
    });
  }

  return (
    <G>
      {/* Drop Shadow */}
      <Line
        x1={r1Start.x + 3}
        y1={r1Start.y + 4}
        x2={r1End.x + 3}
        y2={r1End.y + 4}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Line
        x1={r2Start.x + 3}
        y1={r2Start.y + 4}
        x2={r2End.x + 3}
        y2={r2End.y + 4}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={4.5}
        strokeLinecap="round"
      />

      {/* Main Wooden Rails */}
      <Line
        x1={r1Start.x}
        y1={r1Start.y}
        x2={r1End.x}
        y2={r1End.y}
        stroke="#92400E"
        strokeWidth={4.2}
        strokeLinecap="round"
      />
      <Line
        x1={r1Start.x}
        y1={r1Start.y}
        x2={r1End.x}
        y2={r1End.y}
        stroke="#D97706"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      <Line
        x1={r2Start.x}
        y1={r2Start.y}
        x2={r2End.x}
        y2={r2End.y}
        stroke="#92400E"
        strokeWidth={4.2}
        strokeLinecap="round"
      />
      <Line
        x1={r2Start.x}
        y1={r2Start.y}
        x2={r2End.x}
        y2={r2End.y}
        stroke="#D97706"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* Rungs */}
      {rungs.map((r, idx) => (
        <G key={`rung-${idx}`}>
          <Line
            x1={r.x1 + 1}
            y1={r.y1 + 2}
            x2={r.x2 + 1}
            y2={r.y2 + 2}
            stroke="rgba(0,0,0,0.22)"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <Line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#78350F"
            strokeWidth={3.6}
            strokeLinecap="round"
          />
          <Line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#F59E0B"
            strokeWidth={2.0}
            strokeLinecap="round"
          />
        </G>
      ))}
    </G>
  );
};

/**
 * Cartoon SVG Snake Component with expressive head, tongue, and segmented body
 */
const SvgSnake: React.FC<{
  headSq: number;
  tailSq: number;
  colorScheme?: 'green' | 'red' | 'blue' | 'yellow';
}> = ({ headSq, tailSq, colorScheme = 'green' }) => {
  const pHead = getSquareCoords(headSq);
  const pTail = getSquareCoords(tailSq);

  const dx = pTail.x - pHead.x;
  const dy = pTail.y - pHead.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return null;

  // Winding control points
  const cp1x = pHead.x + dx * 0.35 + (headSq % 2 === 0 ? 30 : -30);
  const cp1y = pHead.y + dy * 0.35;
  const cp2x = pHead.x + dx * 0.7 - (headSq % 2 === 0 ? 25 : -25);
  const cp2y = pHead.y + dy * 0.7;

  const pathD = `M ${pHead.x} ${pHead.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pTail.x} ${pTail.y}`;

  // Color schemes matching the vibrant reference art
  const colors = {
    green: { body: '#10B981', dark: '#047857', belly: '#86EFAC', spots: '#064E3B' },
    red: { body: '#EF4444', dark: '#B91C1C', belly: '#FECDD3', spots: '#7F1D1D' },
    blue: { body: '#0284C7', dark: '#0369A1', belly: '#BAE6FD', spots: '#0C4A6E' },
    yellow: { body: '#F59E0B', dark: '#B45309', belly: '#FEF08A', spots: '#78350F' },
  }[colorScheme];

  return (
    <G>
      {/* Drop Shadow */}
      <Path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={14}
        strokeLinecap="round"
        transform="translate(2, 4)"
      />

      {/* Snake Body Outline */}
      <Path
        d={pathD}
        fill="none"
        stroke={colors.dark}
        strokeWidth={14}
        strokeLinecap="round"
      />

      {/* Snake Body Main */}
      <Path
        d={pathD}
        fill="none"
        stroke={colors.body}
        strokeWidth={11}
        strokeLinecap="round"
      />

      {/* Snake Belly Strip */}
      <Path
        d={pathD}
        fill="none"
        stroke={colors.belly}
        strokeWidth={4.5}
        strokeLinecap="round"
      />

      {/* Snake Head */}
      <G transform={`translate(${pHead.x}, ${pHead.y})`}>
        {/* Cute Snake Head Shape */}
        <Circle cx={0} cy={0} r={10} fill={colors.dark} />
        <Circle cx={0} cy={0} r={8.8} fill={colors.body} />

        {/* Forked Pink Tongue */}
        <Path
          d="M 6 -2 L 12 -4 M 6 -2 L 12 0"
          stroke="#F43F5E"
          strokeWidth={1.8}
          strokeLinecap="round"
        />

        {/* Expressive Cartoon Eyes */}
        <Circle cx={-3} cy={-3.5} r={3.2} fill="#FFFFFF" />
        <Circle cx={3} cy={-3.5} r={3.2} fill="#FFFFFF" />
        <Circle cx={-2.2} cy={-3.5} r={1.8} fill="#111827" />
        <Circle cx={3.8} cy={-3.5} r={1.8} fill="#111827" />
        {/* Eye Shine */}
        <Circle cx={-2.6} cy={-4.2} r={0.7} fill="#FFFFFF" />
        <Circle cx={3.4} cy={-4.2} r={0.7} fill="#FFFFFF" />

        {/* Nostrils */}
        <Circle cx={-1.5} cy={2.5} r={0.7} fill={colors.spots} />
        <Circle cx={1.5} cy={2.5} r={0.7} fill={colors.spots} />
      </G>

      {/* Tail point */}
      <Circle cx={pTail.x} cy={pTail.y} r={3} fill={colors.dark} />
    </G>
  );
};

export const SnakesAndLaddersScreen: React.FC<SnakesAndLaddersScreenProps> = ({
  roomCode,
  roomDetails,
  onLeave,
}) => {
  const { user } = useAuth();

  // Authoritative match state (initialized immediately if available)
  const initialRoomState = (roomDetails as any)?.state;
  const [gameState, setGameState] = useState<any>(initialRoomState || null);
  const [round, setRound] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [playerList, setPlayerList] = useState<RoomPlayer[]>(roomDetails?.players || []);
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);
  const [winnerInfo, setWinnerInfo] = useState<{ id: string; name: string } | null>(null);

  // Turn Countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const countdownIntervalRef = useRef<any>(null);

  // Modals & UI States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExitModalVisible, setIsExitModalVisible] = useState<boolean>(false);
  const [isDisbandedModalVisible, setIsDisbandedModalVisible] = useState<boolean>(false);
  const [isConnLostModalVisible, setIsConnLostModalVisible] = useState<boolean>(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState<boolean>(false);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState<boolean>(false);

  // Floating Banner Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastMoveType, setLastMoveType] = useState<string | null>(null);

  // Dice Animation State
  const [isDiceRolling, setIsDiceRolling] = useState<boolean>(false);
  const diceAnim = useRef(new Animated.Value(0)).current;
  const pedestalPulse = useRef(new Animated.Value(1)).current;
  const lastDiceRollRef = useRef<number | null>(null);

  // AI Opponent Thinking State
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [aiThinkingName, setAiThinkingName] = useState<string | null>(null);

  // Rematch State
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  }, []);

  // Preload SoundService audio immediately on match mount
  useEffect(() => {
    SoundService.init();
  }, []);

  // Visual pawn animation references and step animation queue
  const visualPositionsRef = useRef<Record<string, number>>({});
  const pawnAnimMapRef = useRef<Record<string, { x: Animated.Value; y: Animated.Value; scale: Animated.Value }>>({});
  const isAnimatingPawnRef = useRef(false);
  const moveQueueRef = useRef<Array<{
    userId: string;
    fromSq: number;
    toSq: number;
    playerIndex: number;
    totalPlayers: number;
    isBonusSix?: boolean;
  }>>([]);
  const prevTurnPlayerIdRef = useRef<string | null>(null);

  // Synchronized turn change sound trigger
  useEffect(() => {
    if (!gameState?.turnPlayerId) return;
    if (prevTurnPlayerIdRef.current && prevTurnPlayerIdRef.current !== gameState.turnPlayerId) {
      if (gameState.turnPlayerId === user?.id) {
        SoundService.play('turnPing');
      } else {
        SoundService.play('turnChange');
      }
    }
    prevTurnPlayerIdRef.current = gameState.turnPlayerId;
  }, [gameState?.turnPlayerId, user?.id]);

  const getOrCreatePawnAnim = useCallback(
    (userId: string, initialSq: number, idx: number, totalPlayers: number) => {
      if (!pawnAnimMapRef.current[userId]) {
        const coords = getPawnScreenCoords(initialSq, idx, totalPlayers);
        pawnAnimMapRef.current[userId] = {
          x: new Animated.Value(coords.x),
          y: new Animated.Value(coords.y),
          scale: new Animated.Value(1),
        };
        visualPositionsRef.current[userId] = initialSq;
      }
      return pawnAnimMapRef.current[userId];
    },
    []
  );

  // Ref always pointing to the latest processMoveQueue — prevents stale closure
  // inside animation callbacks (Animated.start callbacks capture a closure snapshot).
  const processMoveQueueRef = useRef<() => void>(() => {});

  const processMoveQueue = useCallback(() => {
    if (isAnimatingPawnRef.current) return;
    const nextMove = moveQueueRef.current.shift();
    if (!nextMove) return;

    isAnimatingPawnRef.current = true;
    const { userId, fromSq, toSq, playerIndex, totalPlayers, isBonusSix } = nextMove;
    const anim = getOrCreatePawnAnim(userId, fromSq, playerIndex, totalPlayers);

    // Safety valve: if the animation mutex gets permanently stuck (e.g. a missed .start() callback),
    // force-reset after 6 seconds so the game doesn't freeze forever.
    const safetyTimer = setTimeout(() => {
      if (isAnimatingPawnRef.current) {
        console.warn('[SnakesAndLadders] Animation mutex force-reset by safety valve');
        visualPositionsRef.current[userId] = toSq;
        const fc = getPawnScreenCoords(toSq, playerIndex, totalPlayers);
        anim.x.setValue(fc.x);
        anim.y.setValue(fc.y);
        anim.scale.setValue(1);
        isAnimatingPawnRef.current = false;
        processMoveQueueRef.current();
      }
    }, 6000);

    const finishMove = () => {
      clearTimeout(safetyTimer);
      visualPositionsRef.current[userId] = toSq;
      if (toSq === 100) {
        SoundService.play('homeGoal');
        showToast('🏆 REACHED SQUARE 100!');
      } else if (isBonusSix) {
        SoundService.play('tokenOpen');
        showToast('🎲 ROLLED A 6! BONUS TURN!');
      }
      isAnimatingPawnRef.current = false;
      // Use the ref so we always call the LATEST version of processMoveQueue
      processMoveQueueRef.current();
    };

    // Detect ladder / snake: toSq is already the server-final position.
    // A ladder is triggered when toSq == LADDERS[base] and the base was reachable
    // in a single roll from fromSq (1–6 squares away).
    let intermediateSq = toSq;
    let isLadder = false;
    let isSnake = false;

    const ladderEntry = Object.entries(LADDERS).find(
      ([base, top]) =>
        Number(top) === toSq &&
        Number(base) > fromSq &&
        Number(base) <= fromSq + 6
    );
    if (ladderEntry) {
      intermediateSq = Number(ladderEntry[0]);
      isLadder = true;
    }

    if (!isLadder) {
      const snakeEntry = Object.entries(SNAKES).find(
        ([head, tail]) =>
          Number(tail) === toSq &&
          Number(head) > fromSq &&
          Number(head) <= fromSq + 6 &&
          Number(head) > toSq
      );
      if (snakeEntry) {
        intermediateSq = Number(snakeEntry[0]);
        isSnake = true;
      }
    }

    // Build intermediate step list, capped at 12 for performance
    const MAX_STEPS = 12;
    const allSteps: number[] = [];
    if (intermediateSq > fromSq) {
      for (let s = fromSq + 1; s <= intermediateSq; s++) allSteps.push(s);
    } else if (intermediateSq < fromSq) {
      for (let s = fromSq - 1; s >= intermediateSq; s--) allSteps.push(s);
    }

    // Sub-sample to at most MAX_STEPS evenly spaced squares
    let steps = allSteps;
    if (allSteps.length > MAX_STEPS) {
      steps = [];
      for (let i = 0; i < MAX_STEPS; i++) {
        const sIdx = Math.round((i / (MAX_STEPS - 1)) * (allSteps.length - 1));
        steps.push(allSteps[sIdx]);
      }
    }

    const runStep = (stepIdx: number) => {
      if (stepIdx < steps.length) {
        const sq = steps[stepIdx];
        const targetCoords = getPawnScreenCoords(sq, playerIndex, totalPlayers);

        // Sound every other step to avoid audio spam on long paths
        if (stepIdx % 2 === 0) SoundService.play('tokenMove');

        Animated.parallel([
          Animated.timing(anim.x, {
            toValue: targetCoords.x,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: targetCoords.y,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.scale, {
              toValue: 1.18,
              duration: 60,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 1.0,
              duration: 60,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          // Guard: if the animation was stopped externally, bail out gracefully
          if (!finished) { finishMove(); return; }
          runStep(stepIdx + 1);
        });
      } else {
        // Reached intermediate square — trigger ladder glide or snake slide
        if (isLadder) {
          setTimeout(() => {
            SoundService.play('ladderClimb');
            showToast('🪜 LADDER CLIMB!');
            const ladderTarget = getPawnScreenCoords(toSq, playerIndex, totalPlayers);
            Animated.parallel([
              Animated.timing(anim.x, {
                toValue: ladderTarget.x,
                duration: 450,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.y, {
                toValue: ladderTarget.y,
                duration: 450,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 1.28,
                  duration: 225,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 1.0,
                  duration: 225,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
              ]),
            ]).start(({ finished }) => {
              if (!finished) { finishMove(); return; }
              finishMove();
            });
          }, 80);
        } else if (isSnake) {
          setTimeout(() => {
            SoundService.play('snakeSlide');
            showToast('🐍 SNAKE! SLIDE DOWN!');
            const snakeTarget = getPawnScreenCoords(toSq, playerIndex, totalPlayers);
            Animated.parallel([
              Animated.timing(anim.x, {
                toValue: snakeTarget.x,
                duration: 500,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.y, {
                toValue: snakeTarget.y,
                duration: 500,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 0.85,
                  duration: 250,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 1.0,
                  duration: 250,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
              ]),
            ]).start(({ finished }) => {
              if (!finished) { finishMove(); return; }
              finishMove();
            });
          }, 80);
        } else {
          // Normal move: snap pawn exactly to final square coords
          const fc = getPawnScreenCoords(toSq, playerIndex, totalPlayers);
          anim.x.setValue(fc.x);
          anim.y.setValue(fc.y);
          finishMove();
        }
      }
    };

    if (steps.length > 0) {
      runStep(0);
    } else {
      // toSq === fromSq or a same-square event — just snap & finish
      const fc = getPawnScreenCoords(toSq, playerIndex, totalPlayers);
      anim.x.setValue(fc.x);
      anim.y.setValue(fc.y);
      finishMove();
    }
  }, [getOrCreatePawnAnim, showToast]);

  // Keep the ref in sync with the latest processMoveQueue after every render
  useEffect(() => {
    processMoveQueueRef.current = processMoveQueue;
  });

  // Synchronize authoritative player positions to the animation queue.
  // Deliberately NOT including gameState.currentDiceRoll as a dep — we only
  // want to animate when positions change, not when the dice number updates alone.
  useEffect(() => {
    if (!gameState?.players || !Array.isArray(gameState.players)) return;
    const players = gameState.players;
    players.forEach((p: any, idx: number) => {
      const uid = p.userId || `player-${idx}`;
      const targetPos = Math.max(1, Math.min(100, p.position || 1));
      const currentVis = visualPositionsRef.current[uid];

      if (currentVis === undefined) {
        // First encounter — initialize pawn position without animation
        visualPositionsRef.current[uid] = targetPos;
        const anim = getOrCreatePawnAnim(uid, targetPos, idx, players.length);
        const coords = getPawnScreenCoords(targetPos, idx, players.length);
        anim.x.setValue(coords.x);
        anim.y.setValue(coords.y);
        anim.scale.setValue(1);
      } else if (currentVis !== targetPos) {
        // Position changed — queue an animation move
        moveQueueRef.current.push({
          userId: uid,
          fromSq: currentVis,
          toSq: targetPos,
          playerIndex: idx,
          totalPlayers: players.length,
          isBonusSix: gameState.currentDiceRoll === 6 && gameState.lastMoveType === 'NORMAL',
        });
        // Always use the ref to kick off queue processing
        processMoveQueueRef.current();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.players, getOrCreatePawnAnim]);

  const isSoloMatch = roomCode?.startsWith('SOLO_');

  // Players mapped from authoritative state or room
  const activePlayers = gameState?.players || [];

  const getPlayerDisplayInfo = (slotIdx: number, defaultName: string) => {
    const statePlayer = activePlayers[slotIdx];
    const targetUserId = statePlayer?.userId;
    const roomP = playerList.find(
      (p: any) => p.userId === targetUserId || p.user?.id === targetUserId || p.id === targetUserId
    );

    const isMe = targetUserId === user?.id || (isSoloMatch && slotIdx === 0);
    let name = defaultName;
    if (isMe) {
      name = 'You';
    } else if (targetUserId?.startsWith('BOT_')) {
      name = `${targetUserId.replace('BOT_', '')} (AI)`;
    } else if (roomP) {
      const rAny = roomP as any;
      name =
        rAny.user?.displayName ||
        rAny.user?.username ||
        rAny.displayName ||
        rAny.username ||
        rAny.name ||
        defaultName;
    }

    const isAi = targetUserId?.startsWith('BOT_') || name.includes('(AI)');
    const initial = isMe
      ? user?.displayName?.charAt(0) || 'Y'
      : isAi
      ? '🤖'
      : name.charAt(0) || 'O';

    return {
      userId: targetUserId,
      name,
      initial,
      isMe,
      isAi,
      position: statePlayer?.position || 1,
    };
  };

  const p1Info = getPlayerDisplayInfo(0, 'Player 1');
  const p2Info = getPlayerDisplayInfo(1, 'Opponent');

  const turnPlayerId = gameState?.turnPlayerId || '';
  const isPlayer1Active =
    turnPlayerId === p1Info.userId ||
    (isSoloMatch && (!turnPlayerId || !turnPlayerId.startsWith('BOT_')));
  const isPlayer2Active =
    turnPlayerId === p2Info.userId ||
    (isSoloMatch && turnPlayerId && turnPlayerId.startsWith('BOT_'));

  const isMyTurn = isPlayer1Active && !isMatchOver;
  const currentDice = gameState?.currentDiceRoll || 1;

  // Unconditionally unlock dice whenever it becomes Player 1's turn
  useEffect(() => {
    if (isMyTurn) {
      setIsSubmitting(false);
      setIsDiceRolling(false);
      setIsAiThinking(false);
    }
  }, [isMyTurn]);

  // Pedestal pulsation when it's the user's turn
  useEffect(() => {
    if (isMyTurn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pedestalPulse, {
            toValue: 1.12,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pedestalPulse, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pedestalPulse.setValue(1);
    }
  }, [isMyTurn, pedestalPulse]);

  // Turn timer countdown
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const expiresAt = gameState?.turnExpiresAt || 0;
    if (expiresAt > 0 && !isMatchOver) {
      const updateTimer = () => {
        const diff = expiresAt - Date.now();
        setSecondsRemaining(Math.max(0, Math.ceil(diff / 1000)));
      };
      updateTimer();
      countdownIntervalRef.current = setInterval(updateTimer, 500);
    } else {
      setSecondsRemaining(0);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [gameState?.turnExpiresAt, isMatchOver]);

  // Unified Dice Rolling Animation Helper
  const rollDiceWithAnimation = useCallback(
    (onComplete?: () => void) => {
      setIsDiceRolling(true);
      SoundService.play('diceRoll');
      diceAnim.setValue(0);
      Animated.timing(diceAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start(({ finished }) => {
        setIsDiceRolling(false);
        if (finished) onComplete?.();
      });
    },
    [diceAnim]
  );

  // Handle incoming authoritative game updates
  const applyStateUpdate = useCallback(
    (
      state: any,
      incomingRound?: number,
      incomingScores?: Record<string, number>,
      incomingPlayers?: any[],
      lastActorId?: string
    ) => {
      if (!state) return;
      setGameState(state);
      if (incomingRound !== undefined) setRound(incomingRound);
      if (incomingScores) setScores(incomingScores);
      if (incomingPlayers && Array.isArray(incomingPlayers)) {
        setPlayerList(incomingPlayers);
      }

      // If opponent / AI just rolled, animate dice on pedestal
      const isOpponentActor = lastActorId && (lastActorId.startsWith('BOT_') || lastActorId !== user?.id);
      if (isOpponentActor && state.currentDiceRoll) {
        rollDiceWithAnimation();
      }

      // Clear AI thinking & submitting whenever turn returns to human
      const isNextTurnHuman = !state.turnPlayerId || !state.turnPlayerId.startsWith('BOT_') || state.turnPlayerId === user?.id;
      if (isNextTurnHuman) {
        setIsAiThinking(false);
        setIsSubmitting(false);
        setTimeout(() => setIsDiceRolling(false), 400);
      }

      if (state.lastMoveType) {
        setLastMoveType(state.lastMoveType);
      }

      if (state.winnerId || state.isComplete) {
        setIsMatchOver(true);
        const winPlayer = state.players?.find((p: any) => p.userId === state.winnerId);
        setWinnerInfo({
          id: state.winnerId,
          name:
            winPlayer?.name ||
            (state.winnerId?.startsWith('BOT_')
              ? `${state.winnerId.replace('BOT_', '')} (AI)`
              : 'Player'),
        });
        SoundService.play('gameOver');
      } else {
        setIsMatchOver(false);
      }
    },
    [user?.id, rollDiceWithAnimation, showToast]
  );

  // Real-Time Socket Connection & Synchronization
  useEffect(() => {
    MobileSocketService.connect();
    MobileSocketService.getSocket()?.emit('room:join', { roomCode });

    MobileSocketService.getGameState(roomCode)
      .then((res) => {
        if (res && res.state) {
          applyStateUpdate(res.state, res.round, res.scores, res.players);
        }
      })
      .catch((err) => console.log('Could not fetch active Snakes & Ladders match state:', err));

    const unsubState = MobileSocketService.onGameState((payload) => {
      if (payload.roomCode === roomCode) {
        applyStateUpdate(
          payload.state,
          payload.round,
          payload.scores,
          undefined,
          payload.lastAction?.userId
        );
      }
    });

    const unsubOver = MobileSocketService.onGameOver((payload) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(true);
        if (payload.scores) setScores(payload.scores);
        if (payload.winnerId) {
          const winPlayer = playerList.find((p: any) => p.userId === payload.winnerId || p.id === payload.winnerId) as any;
          const isWinnerAi = payload.winnerId.startsWith('BOT_');
          setWinnerInfo({
            id: payload.winnerId,
            name: isWinnerAi
              ? `${payload.winnerId.replace('BOT_', '')} (AI)`
              : winPlayer?.user?.displayName || winPlayer?.user?.username || winPlayer?.displayName || 'Player',
          });
        }
      }
    });

    const unsubRematchOffered = MobileSocketService.onRematchOffered((payload) => {
      if (payload.roomCode === roomCode && payload.offeredByUserId !== user?.id) {
        showToast('Opponent offered a rematch!');
      }
    });

    const unsubGameStarted = MobileSocketService.onGameStarted((payload: any) => {
      if (payload.roomCode === roomCode) {
        setIsMatchOver(false);
        setRematchRequested(false);
        applyStateUpdate(payload.state, payload.round, payload.scores, payload.players);
        showToast(`Round ${payload.round || 1} has begun!`);
      }
    });

    const socket = MobileSocketService.getSocket();
    const handleDisconnect = () => setIsConnLostModalVisible(true);
    socket?.on('disconnect', handleDisconnect);

    // AI Opponent Thinking Subscriber (Solo Mode)
    const unsubAiThinking = SoloService.onAiThinking((data) => {
      if (data.roomCode === roomCode) {
        setIsAiThinking(true);
        setAiThinkingName(data.aiPlayerName || 'AI Opponent');
        setTimeout(() => {
          setIsAiThinking(false);
          setAiThinkingName(null);
        }, data.thinkingMs || 1500);
      }
    });

    return () => {
      unsubState();
      unsubOver();
      unsubRematchOffered();
      unsubGameStarted();
      unsubAiThinking();
      socket?.off('disconnect', handleDisconnect);
    };
  }, [roomCode, applyStateUpdate, user?.id]);

  // Local authoritative simulation fallback for offline solo play
  const executeLocalDiceRoll = useCallback(
    (playerId: string) => {
      setGameState((prev: any) => {
        if (!prev) return prev;
        const currentPlayers = prev.players || [];
        const playerIndex = currentPlayers.findIndex((p: any) => p.userId === playerId);
        if (playerIndex === -1) return prev;

        const roll = Math.floor(Math.random() * 6) + 1;
        const player = currentPlayers[playerIndex];
        let target = (player.position || 1) + roll;
        let moveType: 'NORMAL' | 'LADDER' | 'SNAKE' | null = 'NORMAL';

        if (target > 100) {
          target = player.position || 1;
          moveType = null;
        } else {
          if (LADDERS[target]) {
            target = LADDERS[target];
            moveType = 'LADDER';
          } else if (SNAKES[target]) {
            target = SNAKES[target];
            moveType = 'SNAKE';
          }
        }

        const updatedPlayers = currentPlayers.map((p: any, idx: number) => {
          if (idx === playerIndex) {
            return {
              ...p,
              position: target,
              rank: target === 100 ? 1 : p.rank,
            };
          }
          return p;
        });

        let winnerId = prev.winnerId;
        const winnerIds = [...(prev.winnerIds || [])];
        let isComplete = prev.isComplete;

        if (target === 100) {
          winnerId = playerId;
          winnerIds.push(playerId);
          isComplete = true;
        }

        const awardsBonusRoll = roll === 6 && !isComplete;
        let nextTurnPlayerId = playerId;
        if (!awardsBonusRoll && !isComplete) {
          const nextIndex = (playerIndex + 1) % currentPlayers.length;
          nextTurnPlayerId = currentPlayers[nextIndex].userId;
        }

        const nextState = {
          players: updatedPlayers,
          turnPlayerId: nextTurnPlayerId,
          currentDiceRoll: roll,
          lastMoveType: moveType,
          winnerId,
          winnerIds,
          isComplete,
          turnExpiresAt: isComplete ? 0 : Date.now() + 20000,
        };

        if (isComplete) {
          setIsMatchOver(true);
          const winName = playerId.startsWith('BOT_')
            ? `${playerId.replace('BOT_', '')} (AI)`
            : 'You';
          setWinnerInfo({ id: playerId, name: winName });
          SoundService.play('gameOver');
        }

        return nextState;
      });
    },
    [showToast]
  );

  const isLocalOffline = roomCode.startsWith('SOLO_LOCAL_') || !MobileSocketService.getSocket()?.connected;

  // Automated AI turn runner ONLY when playing in offline local mode
  useEffect(() => {
    if (!isLocalOffline || isMatchOver || !gameState) return;
    const currentTurn = gameState.turnPlayerId;
    if (!currentTurn || !currentTurn.startsWith('BOT_')) return;

    setIsAiThinking(true);
    setAiThinkingName(p2Info.name || 'AI Opponent');

    const aiTimer = setTimeout(() => {
      if (gameState.turnPlayerId !== currentTurn) return;

      rollDiceWithAnimation(() => {
        setIsAiThinking(false);
        executeLocalDiceRoll(currentTurn);
      });
    }, 1200);

    return () => {
      clearTimeout(aiTimer);
    };
  }, [
    isLocalOffline,
    isMatchOver,
    gameState?.turnPlayerId,
    gameState?.currentDiceRoll,
    p2Info.name,
    executeLocalDiceRoll,
    rollDiceWithAnimation,
  ]);

  // Online AI Turn Watchdog: If server somehow hangs for > 6 seconds during AI turn, recover locally
  useEffect(() => {
    if (isLocalOffline || !isSoloMatch || isMatchOver || !gameState) return;
    const currentTurn = gameState.turnPlayerId;
    if (!currentTurn || !currentTurn.startsWith('BOT_')) return;

    const watchdog = setTimeout(() => {
      if (gameState.turnPlayerId === currentTurn) {
        console.log('[SnakesAndLaddersScreen] AI turn watchdog triggered local recovery');
        rollDiceWithAnimation(() => {
          setIsAiThinking(false);
          executeLocalDiceRoll(currentTurn);
        });
      }
    }, 6000);

    return () => clearTimeout(watchdog);
  }, [
    isLocalOffline,
    isSoloMatch,
    isMatchOver,
    gameState?.turnPlayerId,
    gameState?.currentDiceRoll,
    executeLocalDiceRoll,
    rollDiceWithAnimation,
  ]);

  // Dice Roll Trigger
  const handleRollDice = async () => {
    if (!isMyTurn || isSubmitting || isDiceRolling) return;

    setIsSubmitting(true);

    if (isLocalOffline) {
      // Local offline — run dice animation, then apply roll after animation
      rollDiceWithAnimation(() => {
        executeLocalDiceRoll(turnPlayerId || p1Info.userId || 'local_player');
        setIsSubmitting(false);
      });
      return;
    }

    // Online match (server-authoritative)
    rollDiceWithAnimation();
    try {
      const res = await MobileSocketService.sendGameAction(roomCode, { type: 'ROLL_DICE' });
      if (res && res.state) {
        applyStateUpdate(res.state, res.round, res.scores);
      }
    } catch (err: any) {
      console.log('[SnakesAndLaddersScreen] sendGameAction fallback:', err?.message);
      if (isSoloMatch) {
        executeLocalDiceRoll(turnPlayerId || p1Info.userId || 'local_player');
      } else {
        showToast(err.message || 'Could not roll dice');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRematchPress = () => {
    try {
      MobileSocketService.requestRematch(roomCode);
      setRematchRequested(true);
      showToast('Rematch request sent to opponent!');
    } catch {
      showToast('Could not send rematch request');
    }
  };

  // Dice rotation interpolation
  const diceRotate = diceAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '90deg', '180deg', '270deg', '360deg'],
  });

  const diceScale = diceAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [1, 1.35, 0.9, 1],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      {/* Lush fantasy foliage background header */}
      <View style={styles.topBar}>
        {/* Player 1 Card ("You") */}
        <View
          style={[
            styles.playerCard,
            isPlayer1Active && styles.playerCardActive,
            { borderColor: isPlayer1Active ? '#38BDF8' : '#1E293B' },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarCircle, { borderColor: '#38BDF8' }]}>
              <Text style={styles.avatarInitial}>{p1Info.initial}</Text>
            </View>
            {/* Token pawn color dot */}
            <View style={[styles.tokenDot, { backgroundColor: '#2563EB' }]} />
          </View>
          <View style={styles.playerTextWrap}>
            <Text style={styles.playerName} numberOfLines={1}>
              {p1Info.name}
            </Text>
            <Text style={styles.playerPosText}>Sq. {p1Info.position}</Text>
          </View>
        </View>

        {/* VS Badge */}
        <View style={styles.vsBadge}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Player 2 Card ("Opponent" / "Nova (AI)") */}
        <View
          style={[
            styles.playerCard,
            isPlayer2Active && styles.playerCardActive,
            { borderColor: isPlayer2Active ? (p2Info.isAi ? '#10B981' : '#F43F5E') : '#1E293B' },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatarCircle,
                {
                  borderColor: p2Info.isAi ? '#10B981' : '#F43F5E',
                  backgroundColor: p2Info.isAi ? '#064E3B' : '#881337',
                },
              ]}
            >
              <Text style={styles.avatarInitial}>{p2Info.initial}</Text>
            </View>
            {/* Token pawn color dot */}
            <View style={[styles.tokenDot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={styles.playerTextWrap}>
            <Text style={styles.playerName} numberOfLines={1}>
              {p2Info.name}
            </Text>
            <Text style={styles.playerPosText}>
              {isAiThinking && isPlayer2Active ? 'Rolling...' : `Sq. ${p2Info.position}`}
            </Text>
          </View>
        </View>

        {/* Header Menu Button */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setIsExitModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="menu" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Floating Action Banner */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </View>
      )}

      {/* 10x10 GAME BOARD CONTAINER */}
      <View style={styles.boardCenterWrap}>
        <View style={[styles.boardFrame, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {/* 100 Squares Grid */}
          {Array.from({ length: 10 }).map((_, rowIdx) => {
            const r = 9 - rowIdx; // Row 0 is at bottom
            return (
              <View key={`r-${rowIdx}`} style={styles.gridRow}>
                {Array.from({ length: 10 }).map((__, colIdx) => {
                  const c = r % 2 === 1 ? 9 - colIdx : colIdx;
                  const squareNum = r * 10 + c + 1;
                  const paletteColor = CELL_PALETTE[(r + c) % CELL_PALETTE.length];
                  const is100 = squareNum === 100;

                  return (
                    <View
                      key={`sq-${squareNum}`}
                      style={[
                        styles.gridCell,
                        {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          backgroundColor: is100 ? '#FDE047' : paletteColor,
                        },
                      ]}
                    >
                      <Text style={[styles.cellNumber, is100 && styles.cellNumber100]}>
                        {squareNum}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* SVG Overlays: Ladders, Snakes, and 3D Pawns */}
          <Svg
            style={StyleSheet.absoluteFill}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            pointerEvents="none"
          >
            {/* 1. Ladders */}
            {Object.entries(LADDERS).map(([start, end]) => (
              <SvgLadder
                key={`ladder-${start}-${end}`}
                startSq={parseInt(start, 10)}
                endSq={end}
              />
            ))}

            {/* 2. Snakes */}
            {Object.entries(SNAKES).map(([head, tail], idx) => {
              const scheme = (['green', 'red', 'blue', 'yellow'] as const)[idx % 4];
              return (
                <SvgSnake
                  key={`snake-${head}-${tail}`}
                  headSq={parseInt(head, 10)}
                  tailSq={tail}
                  colorScheme={scheme}
                />
              );
            })}

          </Svg>

          {/* 3. Animated 3D Player Pawns with Step Traversal, Smooth Climbs and Slides */}
          {activePlayers.map((player: any, idx: number) => {
            const uid = player.userId || `player-${idx}`;
            const anim = getOrCreatePawnAnim(
              uid,
              player.position || 1,
              idx,
              activePlayers.length
            );

            return (
              <Animated.View
                key={`pawn-anim-${uid}`}
                pointerEvents="none"
                style={[
                  styles.animatedPawnWrapper,
                  {
                    width: PAWN_SIZE,
                    height: PAWN_SIZE,
                    transform: [
                      { translateX: anim.x },
                      { translateY: anim.y },
                      { scale: anim.scale },
                    ],
                  },
                ]}
              >
                <Svg width={PAWN_SIZE} height={PAWN_SIZE}>
                  <Pawn3D
                    colorIndex={idx}
                    size={PAWN_SIZE}
                    x={PAWN_SIZE / 2}
                    y={PAWN_SIZE - 4}
                  />
                </Svg>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* BOTTOM FOOTER: GRASSY FIELD WITH DICE PEDESTAL & QUICK CONTROLS */}
      <View style={styles.footerContainer}>
        {/* Left Chat Button */}
        <TouchableOpacity
          style={styles.circleToolBtn}
          onPress={() => showToast('In-game chat opening...')}
          activeOpacity={0.7}
        >
          <Icon name="chat" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center: Glowing Elevated Pedestal & 3D Dice */}
        <View style={styles.pedestalSection}>
          <TouchableOpacity
            onPress={handleRollDice}
            disabled={!isMyTurn || isSubmitting || isDiceRolling}
            activeOpacity={0.88}
            style={styles.pedestalTouchable}
          >
            <Animated.View
              style={[
                styles.pedestalAura,
                isMyTurn && styles.pedestalAuraGlow,
                { transform: [{ scale: pedestalPulse }] },
              ]}
            >
              {/* Pedestal Top Platform */}
              <View style={styles.pedestalInnerCircle}>
                {/* 3D Dice Graphic with Rotation Animation */}
                <Animated.View
                  style={[
                    styles.diceBox,
                    {
                      transform: [
                        { rotate: diceRotate },
                        { scale: diceScale },
                      ],
                    },
                  ]}
                >
                  <DiceFace value={currentDice} />
                </Animated.View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Turn Action Label */}
          <View style={styles.turnStatusWrap}>
            <Text
              style={[
                styles.turnStatusText,
                isMyTurn ? styles.turnStatusActive : styles.turnStatusWaiting,
              ]}
            >
              {isMyTurn
                ? isDiceRolling
                  ? 'Rolling...'
                  : 'Tap to Roll'
                : isAiThinking
                ? `🤖 ${aiThinkingName || 'AI'} is rolling...`
                : `Waiting for ${p2Info.name}... (${secondsRemaining}s)`}
            </Text>
          </View>
        </View>

        {/* Right Reaction Emoji Button */}
        <TouchableOpacity
          style={styles.circleToolBtn}
          onPress={() => setIsEmojiPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="heart" size={22} color="#FBBF24" />
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          MODAL 1: VICTORY CELEBRATION SCREEN (SCREEN 3 IN REFERENCE)
         ========================================================================= */}
      <Modal
        visible={isMatchOver}
        transparent={true}
        animationType="fade"
        onRequestClose={onLeave}
      >
        <View style={styles.victoryModalOverlay}>
          {/* Confetti & Radiant Rays background */}
          <View style={styles.victoryCard}>
            {/* Royal Golden Crown and Laurel Wreath */}
            <View style={styles.victoryCrownWrap}>
              <Image
                source={require('../../assets/images/snake_ladder_victory.jpg')}
                style={styles.victoryCrownImage}
                resizeMode="contain"
              />
            </View>

            {/* Embossed 3D Red Ribbon "YOU WIN!" / "VICTORY!" */}
            <View style={styles.ribbonBanner}>
              <Text style={styles.ribbonBannerText}>
                {winnerInfo?.id === user?.id ? 'YOU WIN!' : `${winnerInfo?.name || 'PLAYER'} WINS!`}
              </Text>
            </View>

            {/* Gold Coin Reward Card */}
            <View style={styles.rewardCard}>
              <View style={styles.coinGraphicCircle}>
                <Text style={styles.coinIconText}>🪙</Text>
              </View>
              <Text style={styles.rewardAmountText}>+500</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.victoryPlayAgainBtn}
              onPress={handleRematchPress}
              activeOpacity={0.85}
              disabled={rematchRequested}
            >
              <Text style={styles.victoryPlayAgainText}>
                {rematchRequested ? 'Rematch Sent...' : 'Play Again'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.victoryBackBtn}
              onPress={onLeave}
              activeOpacity={0.75}
            >
              <Text style={styles.victoryBackText}>Back to Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 2: "EXIT GAME?" DIALOG (BOTTOM RIGHT IN REFERENCE)
         ========================================================================= */}
      <Modal
        visible={isExitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsExitModalVisible(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconBadgeYellow}>
              <Text style={styles.dialogEmoji}>🎲 ➔</Text>
            </View>
            <Text style={styles.dialogTitle}>Exit Game?</Text>
            <Text style={styles.dialogSubtitle}>
              Are you sure you want to leave the game?
            </Text>

            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsExitModalVisible(false)}
              >
                <Text style={styles.dialogCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogConfirmBtnYellow}
                onPress={() => {
                  setIsExitModalVisible(false);
                  onLeave();
                }}
              >
                <Text style={styles.dialogConfirmBtnText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 3: "ROOM DISBANDED" DIALOG (BOTTOM LEFT IN REFERENCE)
         ========================================================================= */}
      <Modal
        visible={isDisbandedModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={onLeave}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconBadgeRed}>
              <Text style={styles.dialogEmoji}>⚠️ 🎮</Text>
            </View>
            <Text style={[styles.dialogTitle, { color: '#E11D48' }]}>
              Room Disbanded
            </Text>
            <Text style={styles.dialogSubtitle}>
              The room was closed because the host left.
            </Text>

            <TouchableOpacity
              style={styles.dialogConfirmBtnRed}
              onPress={onLeave}
            >
              <Text style={styles.dialogConfirmBtnTextWhite}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 4: "CONNECTION LOST" DIALOG (BOTTOM CENTER IN REFERENCE)
         ========================================================================= */}
      <Modal
        visible={isConnLostModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsConnLostModalVisible(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconBadgeBlue}>
              <Text style={styles.dialogEmoji}>📡 ❗</Text>
            </View>
            <Text style={[styles.dialogTitle, { color: '#2563EB' }]}>
              Connection Lost
            </Text>
            <Text style={styles.dialogSubtitle}>
              Please check your internet connection and try again.
            </Text>

            <TouchableOpacity
              style={styles.dialogConfirmBtnYellow}
              onPress={() => setIsConnLostModalVisible(false)}
            >
              <Text style={styles.dialogConfirmBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Emoji Reaction Tray Modal */}
      <Modal
        visible={isEmojiPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEmojiPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.emojiTrayBackdrop}
          activeOpacity={1}
          onPress={() => setIsEmojiPickerVisible(false)}
        >
          <View style={styles.emojiTrayCard}>
            {['🎉', '🐍', '🪜', '🎲', '😱', '😎', '🔥'].map((em) => (
              <TouchableOpacity
                key={em}
                onPress={() => {
                  setIsEmojiPickerVisible(false);
                  showToast(`Reaction sent: ${em}`);
                }}
                style={styles.emojiItem}
              >
                <Text style={styles.emojiItemText}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

/**
 * 3D White Game Dice Component with crisp dot pips
 */
const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(1, Math.min(6, value || 1));

  const renderDots = () => {
    switch (v) {
      case 1:
        return <View style={styles.diceCenterDot} />;
      case 2:
        return (
          <>
            <View style={styles.diceTopLeftDot} />
            <View style={styles.diceBottomRightDot} />
          </>
        );
      case 3:
        return (
          <>
            <View style={styles.diceTopLeftDot} />
            <View style={styles.diceCenterDot} />
            <View style={styles.diceBottomRightDot} />
          </>
        );
      case 4:
        return (
          <>
            <View style={styles.diceTopLeftDot} />
            <View style={styles.diceTopRightDot} />
            <View style={styles.diceBottomLeftDot} />
            <View style={styles.diceBottomRightDot} />
          </>
        );
      case 5:
        return (
          <>
            <View style={styles.diceTopLeftDot} />
            <View style={styles.diceTopRightDot} />
            <View style={styles.diceCenterDot} />
            <View style={styles.diceBottomLeftDot} />
            <View style={styles.diceBottomRightDot} />
          </>
        );
      case 6:
      default:
        return (
          <>
            <View style={styles.diceTopLeftDot} />
            <View style={styles.diceTopRightDot} />
            <View style={styles.diceMiddleLeftDot} />
            <View style={styles.diceMiddleRightDot} />
            <View style={styles.diceBottomLeftDot} />
            <View style={styles.diceBottomRightDot} />
          </>
        );
    }
  };

  return (
    <View style={styles.diceFaceWrap}>
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
    justifyContent: 'space-between',
  },

  // Top Versus Header Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 110,
    gap: 8,
  },
  playerCardActive: {
    backgroundColor: '#1E293B',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  tokenDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  playerTextWrap: {
    flexShrink: 1,
  },
  playerName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  playerPosText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  vsBadge: {
    backgroundColor: '#B45309',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  vsText: {
    color: '#FEF08A',
    fontWeight: '900',
    fontSize: 12,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toast Banner
  toastBanner: {
    alignSelf: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  toastBannerText: {
    color: '#451A03',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },

  // 10x10 Board Center
  boardCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  boardFrame: {
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#B45309',
    backgroundColor: '#78350F',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    borderWidth: 0.4,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 1.5,
  },
  cellNumber: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#451A03',
  },
  cellNumber100: {
    color: '#991B1B',
    fontWeight: '900',
    fontSize: 11,
  },

  // Footer & Pedestal
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 10,
    backgroundColor: 'rgba(4, 120, 87, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  circleToolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  pedestalSection: {
    alignItems: 'center',
  },
  pedestalTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalAura: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FDE047',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  pedestalAuraGlow: {
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 14,
  },
  pedestalInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#38BDF8',
  },
  diceBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  turnStatusWrap: {
    marginTop: 6,
  },
  turnStatusText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  turnStatusActive: {
    color: '#FEF08A',
    textShadowColor: '#D97706',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  turnStatusWaiting: {
    color: '#E2E8F0',
  },

  // Dice Face & Dots
  diceFaceWrap: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  diceCenterDot: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceTopLeftDot: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceTopRightDot: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceMiddleLeftDot: {
    position: 'absolute',
    left: 4,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceMiddleRightDot: {
    position: 'absolute',
    right: 4,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceBottomLeftDot: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  diceBottomRightDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },

  // VICTORY CELEBRATION MODAL (SCREEN 3)
  victoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 16,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  victoryCrownWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryCrownImage: {
    width: '100%',
    height: '100%',
  },
  ribbonBanner: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#FEF08A',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginTop: -8,
  },
  ribbonBannerText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#7F1D1D',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginVertical: 20,
    gap: 10,
  },
  coinGraphicCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconText: {
    fontSize: 18,
  },
  rewardAmountText: {
    color: '#FDE047',
    fontSize: 24,
    fontWeight: '900',
  },
  victoryPlayAgainBtn: {
    width: '100%',
    backgroundColor: '#F59E0B',
    paddingVertical: 15,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FEF08A',
    shadowColor: '#D97706',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 12,
  },
  victoryPlayAgainText: {
    color: '#451A03',
    fontSize: 18,
    fontWeight: '900',
  },
  victoryBackBtn: {
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  victoryBackText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },

  // COMMON DIALOG CARD STYLES
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  dialogIconBadgeYellow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogIconBadgeRed: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogIconBadgeBlue: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogEmoji: {
    fontSize: 28,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogCancelBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
  },
  dialogCancelBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '800',
  },
  dialogConfirmBtnYellow: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
  },
  dialogConfirmBtnRed: {
    width: '100%',
    backgroundColor: '#E11D48',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
  },
  dialogConfirmBtnText: {
    color: '#451A03',
    fontSize: 15,
    fontWeight: '800',
  },
  dialogConfirmBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Emoji Tray
  emojiTrayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 90,
  },
  emojiTrayCard: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    marginHorizontal: 24,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  emojiItem: {
    padding: 6,
  },
  emojiItemText: {
    fontSize: 28,
  },
  animatedPawnWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 25,
    elevation: 6,
  },
});
