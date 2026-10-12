import { GameAI, AiDifficulty } from '../ai.interface';
import { WordleAction, WordleGuess, WordleState } from '../../../../shared/game-types';

export const WORDLE_DICTIONARY = [
  'ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
  'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE',
  'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA',
  'ARGUE', 'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AUDIO', 'AUDIT', 'AVOID', 'AWARD', 'AWARE',
  'BADLY', 'BAKER', 'BASIC', 'BASIS', 'BEACH', 'BEGAN', 'BEGIN', 'BEGUN', 'BEING',
  'BELOW', 'BENCH', 'BIRTH', 'BLACK', 'BLAME', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD',
  'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING',
  'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CARRY', 'CATCH',
  'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD',
  'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLOCK', 'CLOSE',
  'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY',
  'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DATED',
  'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA',
  'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY',
  'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR',
  'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD',
  'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID',
  'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH',
  'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE',
  'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD',
  'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HEART', 'HEAVY', 'HENCE', 'NIGHT', 'HORSE',
  'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE',
  'JOINT', 'JUDGE', 'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH',
  'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LIGHT', 'LIMIT', 'LINKS',
  'LIVES', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR',
  'MAKER', 'MARCH', 'MATCH', 'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS',
  'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE',
  'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NOBLE', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE',
  'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER',
  'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE',
  'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE',
  'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET',
  'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER', 'RIGHT',
  'RIVAL', 'RIVER', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL',
  'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE',
  'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT',
  'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL',
  'SMART', 'SMILE', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE',
  'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE',
  'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE',
  'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR',
  'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEETH',
  'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK',
  'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY',
  'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND',
  'TRIAL', 'TRIED', 'TRUCK', 'TRULY', 'TRUST', 'TRUTH', 'TWICE', 'UNDER',
  'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE',
  'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE',
  'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE',
  'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOUTH',
  'SPARK', 'BRAVE', 'CLOUD', 'FLAME', 'GHOST',
];

function simulateFeedback(guess: string, target: string): string[] {
  const feedback: string[] = new Array(5).fill('ABSENT');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');

  // 1st pass: CORRECT
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      feedback[i] = 'CORRECT';
      targetLetters[i] = '#';
    }
  }

  // 2nd pass: PRESENT
  for (let i = 0; i < 5; i++) {
    if (feedback[i] !== 'CORRECT') {
      const foundIdx = targetLetters.indexOf(guessLetters[i]);
      if (foundIdx !== -1) {
        feedback[i] = 'PRESENT';
        targetLetters[foundIdx] = '#';
      }
    }
  }

  return feedback;
}

function matchesAllGuesses(candidate: string, pastGuesses: WordleGuess[]): boolean {
  for (const g of pastGuesses) {
    const sim = simulateFeedback(g.word, candidate);
    for (let i = 0; i < 5; i++) {
      if (sim[i] !== g.feedback[i]) return false;
    }
  }
  return true;
}

export class WordleAI implements GameAI<WordleState, WordleAction> {
  getMove(state: WordleState, aiPlayerId: string, difficulty: AiDifficulty): WordleAction {
    const aiGuesses = state?.guesses?.[aiPlayerId] || [];
    const alreadyGuessed = new Set<string>(aiGuesses.map((g) => g.word.toUpperCase()));

    // 1. Opening guess selection when no previous attempts exist
    if (aiGuesses.length === 0) {
      const opening = this.getOpeningGuess(difficulty);
      return { type: 'GUESS_WORD', word: opening };
    }

    // 2. Filter entire dictionary to words matching all green, yellow, and gray clues
    const matchingCandidates = WORDLE_DICTIONARY.filter(
      (w) => !alreadyGuessed.has(w) && matchesAllGuesses(w, aiGuesses)
    );

    // Fallback if dictionary filter yields no candidates
    const fallbackList = WORDLE_DICTIONARY.filter((w) => !alreadyGuessed.has(w));
    const candidatePool = matchingCandidates.length > 0 ? matchingCandidates : fallbackList;

    // 3. Selection based on difficulty
    let chosenWord: string;

    if (difficulty === 'EASY') {
      // 35% chance of making a casual guess from fallback (mimicking human sub-optimal attempts)
      if (Math.random() < 0.35 && fallbackList.length > 0) {
        chosenWord = fallbackList[Math.floor(Math.random() * fallbackList.length)];
      } else {
        chosenWord = candidatePool[Math.floor(Math.random() * candidatePool.length)];
      }
    } else if (difficulty === 'MEDIUM') {
      // Pick randomly among strictly compatible candidates
      chosenWord = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    } else if (difficulty === 'HARD') {
      // Pick candidate that tests the most popular remaining unrevealed letters
      chosenWord = this.pickInformationRichCandidate(candidatePool, aiGuesses);
    } else {
      // EXPERT: Highly optimized candidate selection
      if (candidatePool.length <= 2) {
        chosenWord = candidatePool[0];
      } else {
        chosenWord = this.pickInformationRichCandidate(candidatePool, aiGuesses);
      }
    }

    return {
      type: 'GUESS_WORD',
      word: chosenWord || 'CRANE',
    };
  }

  private getOpeningGuess(difficulty: AiDifficulty): string {
    const EASY_OPENERS = ['APPLE', 'HOUSE', 'BEACH', 'TIGER', 'WATER', 'MUSIC', 'PIANO'];
    const MEDIUM_OPENERS = ['AUDIO', 'ROAST', 'TRAIN', 'PLANT', 'LIGHT', 'STORM'];
    const HARD_OPENERS = ['CRANE', 'SLATE', 'TRACE', 'STARE', 'SPARK'];
    const EXPERT_OPENERS = ['CRANE', 'SLATE', 'TRACE'];

    let list = MEDIUM_OPENERS;
    if (difficulty === 'EASY') list = EASY_OPENERS;
    else if (difficulty === 'HARD') list = HARD_OPENERS;
    else if (difficulty === 'EXPERT') list = EXPERT_OPENERS;

    return list[Math.floor(Math.random() * list.length)];
  }

  private pickInformationRichCandidate(
    candidates: string[],
    pastGuesses: WordleGuess[]
  ): string {
    // Collect all letters already tested in past guesses
    const testedLetters = new Set<string>();
    pastGuesses.forEach((g) => {
      g.word.split('').forEach((ch) => testedLetters.add(ch));
    });

    // Compute frequency of untested letters across the remaining candidate pool
    const letterFreq: Record<string, number> = {};
    candidates.forEach((cand) => {
      cand.split('').forEach((ch) => {
        if (!testedLetters.has(ch)) {
          letterFreq[ch] = (letterFreq[ch] || 0) + 1;
        }
      });
    });

    // Score each candidate by unique untested letter popularity
    let bestScore = -1;
    let bestCandidate = candidates[0];

    for (const cand of candidates) {
      const uniqueLetters = new Set(cand.split(''));
      let score = 0;
      uniqueLetters.forEach((ch) => {
        score += letterFreq[ch] || 0;
      });

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    return bestCandidate;
  }
}
