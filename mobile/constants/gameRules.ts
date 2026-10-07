export interface GameRuleStep {
  step: number;
  title: string;
  description: string;
}

export interface GameRuleGuide {
  gameId: string;
  title: string;
  category: 'BOARD' | 'CARD' | 'CASUAL' | 'COMPETITIVE' | 'PUZZLE' | 'PARTY';
  tagline: string;
  overview: string;
  playerCount: string;
  duration: string;
  turnTime: string;
  steps: GameRuleStep[];
  keyRules: string[];
  winCondition: string;
  proTips: string[];
}

export const GAME_RULES_DATA: Record<string, GameRuleGuide> = {
  // ==========================================================================
  // Category A: Board Games
  // ==========================================================================
  TICTACTOE: {
    gameId: 'TICTACTOE',
    title: 'Tic-Tac-Toe Arena',
    category: 'BOARD',
    tagline: 'The timeless duel of alignments and diagonals',
    overview: 'Two players take turns placing X or O on a 3x3 grid. The first player to align 3 of their marks horizontally, vertically, or diagonally wins.',
    playerCount: '2 Players',
    duration: '~1-3 mins',
    turnTime: '15 seconds',
    steps: [
      { step: 1, title: 'Choose Your Side', description: 'Player 1 plays as X (first move), and Player 2 plays as O.' },
      { step: 2, title: 'Tap an Empty Cell', description: 'On your turn, tap any open square on the 3x3 grid before your 15s turn timer expires.' },
      { step: 3, title: 'Anticipate & Block', description: 'Watch your opponent’s placement closely to block upcoming lines while setting up two simultaneous winning paths (forks).' },
      { step: 4, title: 'Claim Victory or Draw', description: 'Complete a line of 3 to win immediately, or fill all 9 cells to trigger a draw and head into a rematch.' },
    ],
    keyRules: [
      'Turns strictly alternate between players.',
      'Once a mark is placed, it cannot be changed or moved.',
      'Failing to move within 15 seconds forfeits your turn.',
    ],
    winCondition: 'First player to form an unbroken horizontal, vertical, or diagonal line of 3 marks wins the round.',
    proTips: [
      'Opening in the center gives you the most flexible paths to victory.',
      'Corners give you the best opportunity to build an unstoppable fork.',
      'If going second, match the opponent’s center move or take a corner to force a draw.',
    ],
  },

  LUDO: {
    gameId: 'LUDO',
    title: 'Ludo World Arena',
    category: 'BOARD',
    tagline: 'Strategic token race around the 4-quadrant kingdom',
    overview: 'Race all 4 of your colored tokens from the yard, around the outer 52-cell circuit, and into the home triangle while capturing opponents along the way.',
    playerCount: '2-4 Players',
    duration: '~10-15 mins',
    turnTime: '20 seconds',
    steps: [
      { step: 1, title: 'Roll a 6 to Release', description: 'Tap the 3D dice. Rolling a 6 allows you to move a token from your yard onto the start square, plus grants a bonus roll.' },
      { step: 2, title: 'Navigate the Circuit', description: 'Move active tokens clockwise around the board based on your dice roll.' },
      { step: 3, title: 'Capture Opponents', description: 'Landing on a tile occupied by an opponent’s lone token sends them straight back to their yard and earns you an extra turn.' },
      { step: 4, title: 'Enter the Home Run', description: 'Lead all 4 tokens down your colored home corridor and into the central triangle with exact rolls.' },
    ],
    keyRules: [
      'Colored starting squares and star spaces are designated safe zones where tokens cannot be captured.',
      'Rolling three consecutive 6s forfeits the third roll.',
      'Entering the home triangle requires an exact dice count.',
    ],
    winCondition: 'The first player to maneuver all 4 tokens safely into the central home triangle wins 1st place.',
    proTips: [
      'Spread your risk: advance multiple tokens rather than pushing just one out in the open.',
      'Camp your tokens on safe star tiles just behind enemy tokens to strike on their next move.',
      'Keep one token in reserve inside your yard to capitalize on bonus rolls.',
    ],
  },

  CHESS: {
    gameId: 'CHESS',
    title: 'Chess Grandmaster',
    category: 'BOARD',
    tagline: 'The ultimate royal battlefield of tactical mastery',
    overview: 'Command 16 pieces across an 8x8 battlefield to out-maneuver the opposing army and deliver checkmate to the enemy King.',
    playerCount: '2 Players',
    duration: '~10-20 mins',
    turnTime: '60 seconds',
    steps: [
      { step: 1, title: 'Opening Setup', description: 'White moves first. Develop center pawns and knights/bishops toward the center squares (e4, d4, e5, d5).' },
      { step: 2, title: 'King Safety & Castling', description: 'Castle early (kingside or queenside) to tuck your King into safety and activate your rooks.' },
      { step: 3, title: 'Tactics & Exchanges', description: 'Hunt for pins, forks, skewers, and discovered attacks while controlling open files.' },
      { step: 4, title: 'Checkmate the King', description: 'Trap the enemy King so it is under direct threat with no legal move, block, or capture to escape.' },
    ],
    keyRules: [
      'Standard FIDE movement rules apply for Pawns, Knights, Bishops, Rooks, Queens, and Kings.',
      'En Passant captures and pawn promotion (to Queen, Rook, Bishop, or Knight) are fully authoritative.',
      'Stalemate (no legal moves and not in check) results in an immediate draw.',
    ],
    winCondition: 'Deliver Checkmate to the opponent’s King or win when your opponent runs out of time or resigns.',
    proTips: [
      'Control the center four squares early to grant your pieces maximum mobility.',
      'Do not bring your Queen out too early where it can be harassed by developing minor pieces.',
      'Always calculate your opponent’s most forcing response before finalizing a move.',
    ],
  },

  CHECKERS: {
    gameId: 'CHECKERS',
    title: 'Checkers / Draughts',
    category: 'BOARD',
    tagline: 'Diagonal jumping and kinging duel',
    overview: 'Move diagonally on dark squares to jump and capture enemy pieces. Reaching the opposite side crowns your piece into a multi-directional King.',
    playerCount: '2 Players',
    duration: '~5-10 mins',
    turnTime: '30 seconds',
    steps: [
      { step: 1, title: 'Diagonal Advance', description: 'Move your checkers diagonally forward one square onto adjacent dark spaces.' },
      { step: 2, title: 'Jump to Capture', description: 'When an enemy piece is diagonally adjacent with an empty space behind it, leap over it to capture and remove it.' },
      { step: 3, title: 'Multi-Jump Streaks', description: 'Chain multiple jumps in a single turn if another capture immediately opens up.' },
      { step: 4, title: 'Crown Your Kings', description: 'Reach the opponent’s back row to become a King, unlocking forward and backward diagonal movement.' },
    ],
    keyRules: [
      'Jumping is compulsory when a legal capture is available.',
      'Regular pieces can only move forward diagonally; crowned Kings move both ways.',
    ],
    winCondition: 'Capture all of your opponent’s pieces or block them so they have zero legal moves remaining.',
    proTips: [
      'Keep your back row intact as long as possible to prevent opponent pieces from getting crowned.',
      'Control the center squares to restrict enemy maneuvering and set up multi-jumps.',
    ],
  },

  CONNECT_FOUR: {
    gameId: 'CONNECT_FOUR',
    title: 'Connect Four',
    category: 'BOARD',
    tagline: 'Gravity-powered 4-in-a-row tactical grid',
    overview: 'Drop colored discs into a 7-column, 6-row vertical suspended grid. The first player to align 4 discs in a straight line wins.',
    playerCount: '2 Players',
    duration: '~3-5 mins',
    turnTime: '20 seconds',
    steps: [
      { step: 1, title: 'Choose Your Column', description: 'Select any of the 7 columns to drop your checker disc down to the lowest unoccupied slot.' },
      { step: 2, title: 'Create Alignments', description: 'Stack discs to form horizontal, vertical, or diagonal sequences of 2 and 3.' },
      { step: 3, title: 'Deny Opponent Lines', description: 'Watch the board columns carefully to immediately plug any 3-in-a-row threat.' },
      { step: 4, title: 'Trigger the Winning Drop', description: 'Complete 4 connected discs of your color to claim victory.' },
    ],
    keyRules: [
      'Discs fall straight down by gravity into the lowest open row in that column.',
      'Full columns cannot accept further drops.',
    ],
    winCondition: 'Connect 4 checkers of your color horizontally, vertically, or diagonally.',
    proTips: [
      'Dominating the central column (column 4) gives you the highest mathematical probability of winning.',
      'Set up dual threats (forks) so your opponent can only block one column, leaving the other open.',
    ],
  },

  CARROM: {
    gameId: 'CARROM',
    title: 'Carrom Board Arena',
    category: 'BOARD',
    tagline: 'Flick striker physics and pocket master',
    overview: 'Use the striker to pocket your carrom men (white or black) into the four corner pockets. Pocket the Red Queen and cover it to claim high score points.',
    playerCount: '2-4 Players',
    duration: '~8-12 mins',
    turnTime: '25 seconds',
    steps: [
      { step: 1, title: 'Position the Striker', description: 'Place your striker on your baseline ensuring it touches both baseline lines.' },
      { step: 2, title: 'Aim & Power', description: 'Drag backward to adjust angle and strike power toward target carrom pieces.' },
      { step: 3, title: 'Pocket Pieces', description: 'Pocketing your color earns you another strike. Pocketing the Queen requires covering it on the next shot.' },
      { step: 4, title: 'Clear the Board', description: 'Sink all your assigned carrom men to end the match with the winning score.' },
    ],
    keyRules: [
      'Pocketing the striker is a foul: 1 penalty piece is returned to the center.',
      'The Queen must be covered by pocketing another carrom man on the very next shot.',
    ],
    winCondition: 'Pocket all your designated pieces and the Queen to achieve maximum points.',
    proTips: [
      'Use bank shots off the outer wooden frame when straight lines are congested.',
      'Always plan your cover shot before sinking the Queen.',
    ],
  },

  BATTLESHIP: {
    gameId: 'BATTLESHIP',
    title: 'Battleship Fleet Command',
    category: 'BOARD',
    tagline: 'Naval grid coordinates and tactical bombardment',
    overview: 'Deploy a fleet of 5 naval warships across a secret 10x10 ocean grid. Call out coordinates to bombard and sink the enemy fleet.',
    playerCount: '2 Players',
    duration: '~5-10 mins',
    turnTime: '25 seconds',
    steps: [
      { step: 1, title: 'Deploy Your Fleet', description: 'Place your Carrier (5), Battleship (4), Cruiser (3), Submarine (3), and Destroyer (2) horizontally or vertically.' },
      { step: 2, title: 'Call Coordinates', description: 'On your turn, tap an ocean coordinate (e.g., E-7) on the enemy radar grid.' },
      { step: 3, title: 'Hit or Miss', description: 'A red explosion indicates a hit; a white splash indicates open water.' },
      { step: 4, title: 'Sink Enemy Ships', description: 'Landing hits on all segments of a warship sinks it.' },
    ],
    keyRules: [
      'Ships cannot overlap or hang outside the 10x10 boundary.',
      'Opponents cannot see each other’s ship placements.',
    ],
    winCondition: 'First admiral to locate and sink all 5 ships in the enemy fleet wins.',
    proTips: [
      'Use a checkerboard parity search pattern to find larger ships in fewer shots.',
      'Once you hit a ship, systematically fire north, south, east, and west to determine its orientation.',
    ],
  },

  // ==========================================================================
  // Category B: Card Games
  // ==========================================================================
  UNO_STYLE: {
    gameId: 'UNO_STYLE',
    title: 'Color Match Clash (UNO-style)',
    category: 'CARD',
    tagline: 'Fast card shedding with wild skips and reverses',
    overview: 'Be the first to shed all your cards by matching the top card of the discard pile by color, number, or symbol.',
    playerCount: '2-4 Players',
    duration: '~5-8 mins',
    turnTime: '15 seconds',
    steps: [
      { step: 1, title: 'Inspect Your Hand', description: 'Start with 7 cards. Check for matching colors (Red, Blue, Green, Yellow) or matching numbers (0-9).' },
      { step: 2, title: 'Match or Play Action', description: 'Match the discard pile color/number, or play Skip, Reverse, or Draw Two to disrupt opponents.' },
      { step: 3, title: 'Drop Wild Cards', description: 'Play Wild cards anytime to change active color, or Wild Draw 4 to force opponent card penalties.' },
      { step: 4, title: 'Last Card Alert', description: 'Call out when down to 1 card and play your final card to seal the win.' },
    ],
    keyRules: [
      'If you cannot match the top card, you must draw 1 card from the deck.',
      'Action cards trigger immediately on the next player in sequence.',
    ],
    winCondition: 'First player to empty their hand of all cards wins the match.',
    proTips: [
      'Save your Wild Draw 4 cards for emergencies when you need to change color near endgame.',
      'Keep track of colors opponents draw on to deduce which colors they lack.',
    ],
  },

  BLACKJACK: {
    gameId: 'BLACKJACK',
    title: 'Blackjack 21 (Virtual Chips)',
    category: 'CARD',
    tagline: 'Beat the dealer without going over 21',
    overview: 'Compete against the house dealer to build a hand total closest to 21 with virtual chips. Number cards count as face value, face cards count as 10, and Aces count as 1 or 11.',
    playerCount: '1-5 Players',
    duration: '~3-5 mins',
    turnTime: '20 seconds',
    steps: [
      { step: 1, title: 'Place Virtual Bet', description: 'Choose your virtual chip stake before cards are dealt.' },
      { step: 2, title: 'Receive Deal', description: 'Get 2 cards face up. The dealer receives 1 face up and 1 hole card.' },
      { step: 3, title: 'Hit, Stand, or Double', description: 'Hit to take another card, Stand to hold your total, or Double Down to double your bet on one final card.' },
      { step: 4, title: 'Dealer Showdown', description: 'The dealer reveals their hole card and must hit until reaching 17+. Closest to 21 without busting wins.' },
    ],
    keyRules: [
      'Exceeding 21 is a Bust and results in an automatic loss.',
      'Dealer must hit on soft 16 and stand on hard 17.',
      'Virtual play chips only—no real money value.',
    ],
    winCondition: 'Finish with a hand total closer to 21 than the dealer without exceeding 21.',
    proTips: [
      'Always stand on hard 17 or higher.',
      'If the dealer shows a 4, 5, or 6, they have a high chance of busting—play conservatively.',
    ],
  },

  POKER: {
    gameId: 'POKER',
    title: 'Texas Hold’em (Virtual Chips)',
    category: 'CARD',
    tagline: 'Pre-flop raises, community cards, and showdowns',
    overview: 'Make the best 5-card poker hand using your 2 private hole cards and the 5 shared community cards.',
    playerCount: '2-6 Players',
    duration: '~10-15 mins',
    turnTime: '30 seconds',
    steps: [
      { step: 1, title: 'Pre-Flop Betting', description: 'Receive 2 private cards. Check, Bet, Call, or Fold based on hand strength.' },
      { step: 2, title: 'The Flop', description: 'Dealer reveals 3 community cards face up followed by a second betting round.' },
      { step: 3, title: 'The Turn & River', description: 'A 4th card (Turn) and 5th card (River) are dealt with subsequent betting rounds.' },
      { step: 4, title: 'The Showdown', description: 'Remaining players reveal hands. The best 5-card poker hand scoops the virtual pot.' },
    ],
    keyRules: [
      'Standard hand hierarchy: High Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush.',
      'Virtual play currency only.',
    ],
    winCondition: 'Win the pot by making the highest ranking hand at showdown or by forcing all opponents to fold.',
    proTips: [
      'Position is power: acting last gives you vital information about all other players’ actions.',
      'Fold weak starting hands pre-flop to preserve your stack for high-value pots.',
    ],
  },

  // ==========================================================================
  // Category C: Casual & Sports Multiplayer
  // ==========================================================================
  POOL_8_BALL: {
    gameId: 'POOL_8_BALL',
    title: '8 Ball Pool Arena',
    category: 'CASUAL',
    tagline: 'Cue physics, solids vs stripes, and the 8-ball finish',
    overview: 'Pot your designated group of 7 balls (Solids 1-7 or Stripes 9-15) and finish by cleanly pocketing the black 8 ball.',
    playerCount: '2 Players',
    duration: '~5-10 mins',
    turnTime: '30 seconds',
    steps: [
      { step: 1, title: 'Break the Rack', description: 'Power strike the cue ball into the triangle rack to scatter balls across the cloth.' },
      { step: 2, title: 'Claim Your Group', description: 'The first legally potted ball after the break assigns your group: Solids or Stripes.' },
      { step: 3, title: 'Clear Your Balls', description: 'Aim with spin/english and power to pocket all 7 balls of your assigned category.' },
      { step: 4, title: 'Pocket the 8-Ball', description: 'Call your target pocket and sink the 8-ball cleanly to win.' },
    ],
    keyRules: [
      'Pocketing the cue ball is a scratch (opponent receives ball-in-hand anywhere on table).',
      'Pocketing the 8-ball before clearing your group results in an instant loss.',
    ],
    winCondition: 'Legally pocket all your group balls and then sink the black 8-ball into the called pocket.',
    proTips: [
      'Control cue ball rebound with top/back spin to set up your next shot angles.',
      'Do not just look for the easy ball—look for the ball that leaves the best position.',
    ],
  },

  DARTS: {
    gameId: 'DARTS',
    title: 'Darts 501 Arena',
    category: 'CASUAL',
    tagline: 'Throw precision darts from 501 down to zero',
    overview: 'Throw 3 darts per turn to reduce your score from 501 exactly down to 0, finishing on a double or the bullseye.',
    playerCount: '2 Players',
    duration: '~5-8 mins',
    turnTime: '25 seconds',
    steps: [
      { step: 1, title: 'Aim the Crosshair', description: 'Align your reticle over target numbers (Triple 20 offers maximum 60 points).' },
      { step: 2, title: 'Time the Release', description: 'Tap to lock accuracy and release power meter for pinpoint flight trajectory.' },
      { step: 3, title: 'Manage Your Checkout', description: 'Reduce score toward favorable checkout numbers like 40 (Double 20) or 32 (Double 16).' },
      { step: 4, title: 'Double Out', description: 'Hit the exact double ring to hit exactly 0 and take the leg.' },
    ],
    keyRules: [
      'Going below 0 or hitting 1 is a "Bust" and resets score to before that turn.',
      'Final dart must land on a Double or Bullseye ring.',
    ],
    winCondition: 'First player to reach exactly 0 points on a Double ring wins.',
    proTips: [
      'Triple 20 is worth more points than the bullseye (60 vs 50).',
      'Aim to leave yourself an even number on checkout for multiple chances at doubles.',
    ],
  },

  BOWLING: {
    gameId: 'BOWLING',
    title: 'Bowling Strike',
    category: 'CASUAL',
    tagline: '10 frames of strikes, spares, and hook ball physics',
    overview: 'Roll the bowling ball down the lane across 10 frames to knock down pins and tally high scores.',
    playerCount: '2-4 Players',
    duration: '~5-8 mins',
    turnTime: '20 seconds',
    steps: [
      { step: 1, title: 'Select Lane Position', description: 'Slide starting marker left or right along the approach line.' },
      { step: 2, title: 'Set Hook & Curve', description: 'Adjust ball spin curve angle to create optimal entry into the pocket.' },
      { step: 3, title: 'Strike the Pocket', description: 'Aim between Pin 1 and Pin 3 for right-handers to generate high-percentage strikes.' },
      { step: 4, title: 'Spare Conversions', description: 'Pick up remaining pins on your second roll for bonus frame multipliers.' },
    ],
    keyRules: [
      'Strikes reward 10 points plus the score of the next two rolls.',
      'Spares reward 10 points plus the score of the next single roll.',
    ],
    winCondition: 'Achieve the highest total score at the conclusion of 10 frames.',
    proTips: [
      'Aim for the pocket (space between head pin and adjacent pin) to trigger explosive pin dominoes.',
    ],
  },

  // ==========================================================================
  // Category D: Competitive & Reflex Games
  // ==========================================================================
  REACTION_TEST: {
    gameId: 'REACTION_TEST',
    title: 'Reaction Speed Test',
    category: 'COMPETITIVE',
    tagline: 'Lightning reflex millisecond showdown',
    overview: 'Wait in anticipation while the screen is red. The instant the screen turns green, tap as fast as humanly possible.',
    playerCount: '2-4 Players',
    duration: '~1-2 mins',
    turnTime: '5 seconds',
    steps: [
      { step: 1, title: 'Prepare & Focus', description: 'Keep your thumb hovered right above the reaction surface while the screen is RED.' },
      { step: 2, title: 'Do Not Jump the Gun', description: 'Tapping while red triggers an early false start penalty.' },
      { step: 3, title: 'Tap on GREEN', description: 'The instant the color shifts to neon GREEN, tap instantly.' },
      { step: 4, title: 'Compare Milliseconds', description: 'Your reaction time is measured in exact milliseconds across 5 rounds.' },
    ],
    keyRules: [
      'Tapping before green triggers a False Start foul.',
      'Lowest cumulative millisecond time across rounds takes 1st place.',
    ],
    winCondition: 'Player with the lowest average millisecond response time wins.',
    proTips: [
      'Stay relaxed: tense muscles take longer to contract than primed relaxed muscles.',
    ],
  },

  ROCK_PAPER_SCISSORS: {
    gameId: 'ROCK_PAPER_SCISSORS',
    title: 'Rock Paper Scissors Duel',
    category: 'COMPETITIVE',
    tagline: 'Simultaneous hand sign mind games',
    overview: 'Both players secretly select Rock, Paper, or Scissors simultaneously in a best-of-5 showdown.',
    playerCount: '2 Players',
    duration: '~1-3 mins',
    turnTime: '10 seconds',
    steps: [
      { step: 1, title: 'Read Your Opponent', description: 'Anticipate patterns based on previous rounds.' },
      { step: 2, title: 'Select Sign', description: 'Tap Rock, Paper, or Scissors before the 10s countdown ends.' },
      { step: 3, title: 'Simultaneous Reveal', description: 'Both choices are uncovered together: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.' },
      { step: 4, title: 'Ties Replay', description: 'Matching signs result in a push; play continues until one scores a round point.' },
    ],
    keyRules: [
      'Choices are encrypted and hidden until both players lock in.',
      'First to 3 round points wins the match.',
    ],
    winCondition: 'Win 3 rounds against your opponent.',
    proTips: [
      'Players who lose a round frequently switch to the option that would have beaten what just beat them.',
    ],
  },

  // ==========================================================================
  // Category E: Strategy & Puzzle Games
  // ==========================================================================
  WORDLE_DUEL: {
    gameId: 'WORDLE_DUEL',
    title: 'Word Guess Duel',
    category: 'PUZZLE',
    tagline: 'Deduce the secret 5-letter word in 6 attempts',
    overview: 'Race head-to-head to deduce the hidden 5-letter dictionary word using color-coded letter feedback.',
    playerCount: '2 Players',
    duration: '~3-5 mins',
    turnTime: '60 seconds',
    steps: [
      { step: 1, title: 'Enter Starting Word', description: 'Type a valid 5-letter word with diverse vowels and consonants (e.g., CRANE or SLATE).' },
      { step: 2, title: 'Analyze Tile Colors', description: 'Green = correct letter & position; Yellow = correct letter wrong position; Gray = not in word.' },
      { step: 3, title: 'Deduce Remaining Letters', description: 'Use yellow and green clues to eliminate gray letters on your keyboard.' },
      { step: 4, title: 'Solve Faster than Opponent', description: 'Guess the mystery word in fewer attempts or faster time than your rival.' },
    ],
    keyRules: [
      'Guessed words must be valid English words.',
      'You have a maximum of 6 attempts per word duel.',
    ],
    winCondition: 'Correctly guess the hidden 5-letter word in fewer attempts or faster time.',
    proTips: [
      'Never reuse known gray letters in subsequent guesses.',
      'Look for common digraphs like CH, SH, TH, and ending patterns like -ER or -ED.',
    ],
  },

  SUDOKU_BATTLE: {
    gameId: 'SUDOKU_BATTLE',
    title: 'Sudoku Duel',
    category: 'PUZZLE',
    tagline: '9x9 shared logical number puzzle showdown',
    overview: 'Fill in empty cells in the 9x9 grid with numbers 1 to 9 so every row, column, and 3x3 box contains all digits without repetition.',
    playerCount: '2 Players',
    duration: '~5-10 mins',
    turnTime: '180 seconds',
    steps: [
      { step: 1, title: 'Scan Rows and Columns', description: 'Find cells with the fewest candidate numbers.' },
      { step: 2, title: 'Apply Elimination', description: 'Cross-reference 3x3 boxes with rows and columns to find single solutions.' },
      { step: 3, title: 'Fill Numbers', description: 'Tap a number to lock it into the cell. Correct entries award points; mistakes penalize.' },
      { step: 4, title: 'Race to Completion', description: 'Accumulate more points and solve more cells than your opponent.' },
    ],
    keyRules: [
      'Each row, column, and 3x3 box must contain digits 1 through 9 exactly once.',
      '3 incorrect inputs triggers a 15-second time penalty.',
    ],
    winCondition: 'Score the highest points by solving cells and clearing the puzzle grid.',
    proTips: [
      'Look for rows or 3x3 boxes that are already missing only 1 or 2 digits.',
    ],
  },

  // ==========================================================================
  // Category F: Party & Social Games
  // ==========================================================================
  WOULD_YOU_RATHER: {
    gameId: 'WOULD_YOU_RATHER',
    title: 'Would You Rather?',
    category: 'PARTY',
    tagline: 'Hilarious dilemmas and friend consensus showdown',
    overview: 'Vote between two impossible dilemmas and compare your answers with your friends and global player stats.',
    playerCount: '2-8 Players',
    duration: '~5-10 mins',
    turnTime: '20 seconds',
    steps: [
      { step: 1, title: 'Read the Dilemma', description: 'Option A and Option B present two entertaining or outrageous scenarios.' },
      { step: 2, title: 'Cast Secret Vote', description: 'Tap your choice before the timer runs out without letting friends see your pick.' },
      { step: 3, title: 'Live Reveal', description: 'All player votes and live percentage charts reveal who picked what.' },
      { step: 4, title: 'Friend Compatibility', description: 'Earn bonus points for matching your party’s majority choice.' },
    ],
    keyRules: [
      'No passing allowed—you must pick one of the two options.',
      'Voting is simultaneous and locked until all players submit.',
    ],
    winCondition: 'Earn highest compatibility score by aligning with group consensus across all rounds.',
    proTips: [
      'Think about what your specific group of friends would choose rather than just your personal bias.',
    ],
  },

  MAFIA: {
    gameId: 'MAFIA',
    title: 'Mafia / Werewolf',
    category: 'PARTY',
    tagline: 'Social deduction, secret roles, and deception',
    overview: 'Townspeople must deduce and eliminate the hidden Mafia members before the Mafia outnumbers the honest citizens.',
    playerCount: '5-10 Players',
    duration: '~15-20 mins',
    turnTime: '90 seconds',
    steps: [
      { step: 1, title: 'Receive Secret Role', description: 'You are privately assigned a role: Mafia, Detective, Doctor, or Townsperson.' },
      { step: 2, title: 'Night Phase', description: 'Mafia chooses a victim, Doctor protects a player, Detective investigates an identity.' },
      { step: 3, title: 'Day Discussion', description: 'The town wakes up to learn who perished. Discuss, question, and identify suspects in voice/chat.' },
      { step: 4, title: 'Town Vote', description: 'Nominate and vote to exile a suspect from the town.' },
    ],
    keyRules: [
      'Roles are strictly confidential—never screenshot or reveal system role cards.',
      'Eliminated players are silent and cannot speak or vote.',
    ],
    winCondition: 'Town wins if all Mafia are eliminated. Mafia wins if they equal or outnumber the remaining Town.',
    proTips: [
      'As Town: watch voting patterns—Mafia often vote together or defend each other subtly.',
      'As Mafia: blend in with active town discussions and avoid being suspiciously quiet.',
    ],
  },

  IMPOSTER: {
    gameId: 'IMPOSTER',
    title: 'The Imposter',
    category: 'PARTY',
    tagline: 'One person has no clue what the word is',
    overview: 'Everyone in the room receives the same secret word except for one player: The Imposter. Players give subtle clues to prove they know the word without revealing it to the imposter.',
    playerCount: '4-8 Players',
    duration: '~8-12 mins',
    turnTime: '60 seconds',
    steps: [
      { step: 1, title: 'Check Your Card', description: 'You will see either the Secret Word (e.g. "Airplane") or "YOU ARE THE IMPOSTER".' },
      { step: 2, title: 'Provide One-Word Clues', description: 'In turns, each player says one descriptive word related to the secret topic.' },
      { step: 3, title: 'Bluff or Detect', description: 'If you are the imposter, listen closely to others and bluff a convincing clue.' },
      { step: 4, title: 'Accuse & Vote', description: 'Group votes on who they believe the imposter is. If caught, the imposter gets one guess at the word.' },
    ],
    keyRules: [
      'Clues cannot be too obvious (giving the word away) or too vague.',
      'If the group votes for the wrong person, the imposter wins.',
    ],
    winCondition: 'Town wins if they vote out the imposter. Imposter wins if they remain undetected or correctly guess the secret word.',
    proTips: [
      'Give clues that only someone who knows the word would recognize, but not obvious to an outsider.',
    ],
  },

  DRAW_AND_GUESS: {
    gameId: 'DRAW_AND_GUESS',
    title: 'Draw & Guess Live',
    category: 'PARTY',
    tagline: 'Collaborative live canvas sketch and chat race',
    overview: 'One player draws a secret word on the shared digital canvas while all other players guess in real-time chat.',
    playerCount: '2-8 Players',
    duration: '~8-15 mins',
    turnTime: '60 seconds',
    steps: [
      { step: 1, title: 'Artist Chooses Word', description: 'The designated artist picks 1 of 3 secret words based on difficulty.' },
      { step: 2, title: 'Draw on Live Canvas', description: 'Use digital pencil, brush sizes, and colors to sketch the concept without writing letters.' },
      { step: 3, title: 'Guess in Chat', description: 'Guessers type their answers in chat; the engine auto-detects correct words.' },
      { step: 4, title: 'Earn Speed Points', description: 'Fastest guessers and the artist score points based on how quickly the word was solved.' },
    ],
    keyRules: [
      'No spelling out letters, numbers, or symbols in drawings.',
      'Guessed words are automatically masked with stars to other players until round ends.',
    ],
    winCondition: 'Accumulate the most points as both artist and guesser across all rounds.',
    proTips: [
      'Break complex objects into simple geometric shapes first before adding details.',
    ],
  },
};

/**
 * Intelligent rules generator that guarantees EVERY game in the app has
 * a rich, beautifully structured guide even if not individually hardcoded above.
 */
export function getGameRules(gameId: string, fallbackName?: string, category?: string): GameRuleGuide {
  const normalizedKey = (gameId || '').toUpperCase().trim();

  if (GAME_RULES_DATA[normalizedKey]) {
    return GAME_RULES_DATA[normalizedKey];
  }

  // Generate systematic rules based on category and title
  const formattedTitle = fallbackName || normalizedKey.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const cat = (category || 'CASUAL').toUpperCase() as GameRuleGuide['category'];

  return {
    gameId: normalizedKey,
    title: formattedTitle,
    category: cat,
    tagline: `Authoritative online multiplayer ${formattedTitle}`,
    overview: `Compete against live opponents in ${formattedTitle}. Test your skill, anticipate your rival's strategy, and climb the arena rankings.`,
    playerCount: '2-4 Players',
    duration: '~5-10 mins',
    turnTime: '30 seconds',
    steps: [
      {
        step: 1,
        title: 'Join the Arena & Ready Up',
        description: 'Ensure all players have marked themselves ready in the room lobby before the host initiates the match.',
      },
      {
        step: 2,
        title: 'Understand the Turn Clock',
        description: 'Each player has an authoritative turn timer. Submitting your move before time expires keeps your momentum alive.',
      },
      {
        step: 3,
        title: 'Execute Tactical Moves',
        description: 'Read the board state carefully. Balance aggressive scoring with defensive positioning to restrict opponent counterplay.',
      },
      {
        step: 4,
        title: 'Reach the Objective',
        description: 'Trigger the victory conditions or accumulate the highest score at match conclusion to claim the winner trophy.',
      },
    ],
    keyRules: [
      'All actions are validated in real-time by the authoritative server engine.',
      'Disconnecting provides a 30-second grace window to reconnect before automatic forfeiture.',
      'Fair play and positive sportsmanship are enforced across all multiplayer rooms.',
    ],
    winCondition: `Complete the primary objective or score more points than your opponents before match expiration.`,
    proTips: [
      'Observe opponent timing patterns to anticipate their upcoming plays.',
      'Stay composed when trailing: tactical mistakes by leaders often open rapid comeback opportunities.',
    ],
  };
}
