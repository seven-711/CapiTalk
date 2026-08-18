'use client';

import React, { useState, useEffect, useRef } from 'react';
import { roomManager } from '../lib/realtime/roomManager';
import { UserProfile } from '../lib/types';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  X,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
  HelpCircle,
  Flame,
  CheckCircle2,
  AlertCircle,
  Timer,
  Award,
  ChevronRight,
  RefreshCw,
  Users,
} from 'lucide-react';

export type GameType = 'menu' | 'connect4' | 'tictactoe' | 'wouldyourather' | 'rockpaperscissors';

interface CampusGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  partner: UserProfile;
  isDarkMode?: boolean;
}

export interface WYRQuestion {
  id: number;
  category: string;
  questionA: string;
  questionB: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─── Would You Rather Questions (20 Unique Curated Questions) ─────────────────
export const RAW_WYR_QUESTIONS: WYRQuestion[] = [
  {
    id: 1,
    category: "Lifestyle",
    questionA: "Have unlimited free food forever",
    questionB: "Travel anywhere for free forever",
    difficulty: "easy"
  },
  {
    id: 2,
    category: "Technology",
    questionA: "Lose your phone for a year",
    questionB: "Lose your laptop for a year",
    difficulty: "medium"
  },
  {
    id: 3,
    category: "Funny",
    questionA: "Talk like a robot forever",
    questionB: "Walk backwards forever",
    difficulty: "hard"
  },
  {
    id: 4,
    category: "School",
    questionA: "Never take exams again",
    questionB: "Never do assignments again",
    difficulty: "easy"
  },
  {
    id: 5,
    category: "Money",
    questionA: "Receive ₱100,000 now",
    questionB: "Receive ₱1,000 every day forever",
    difficulty: "medium"
  },
  {
    id: 6,
    category: "Gaming",
    questionA: "Play only mobile games forever",
    questionB: "Play only PC games forever",
    difficulty: "easy"
  },
  {
    id: 7,
    category: "Superpower",
    questionA: "Be invisible",
    questionB: "Read minds",
    difficulty: "hard"
  },
  {
    id: 8,
    category: "Food",
    questionA: "Eat only spicy food",
    questionB: "Eat only sweet food",
    difficulty: "easy"
  },
  {
    id: 9,
    category: "Social",
    questionA: "Have 1 million followers",
    questionB: "Have 10 real best friends",
    difficulty: "medium"
  },
  {
    id: 10,
    category: "Travel",
    questionA: "Live in the mountains",
    questionB: "Live near the beach",
    difficulty: "easy"
  },
  {
    id: 11,
    category: "Technology",
    questionA: "Use only dark mode forever",
    questionB: "Use only light mode forever",
    difficulty: "easy"
  },
  {
    id: 12,
    category: "Funny",
    questionA: "Have a duck as your pet",
    questionB: "Have a monkey as your pet",
    difficulty: "medium"
  },
  {
    id: 13,
    category: "Entertainment",
    questionA: "Watch only movies forever",
    questionB: "Watch only series forever",
    difficulty: "easy"
  },
  {
    id: 14,
    category: "School",
    questionA: "Attend classes at 7 AM forever",
    questionB: "Attend classes until 8 PM forever",
    difficulty: "hard"
  },
  {
    id: 15,
    category: "Superpower",
    questionA: "Teleport anywhere",
    questionB: "Stop time",
    difficulty: "hard"
  },
  {
    id: 16,
    category: "Food",
    questionA: "Never eat rice again",
    questionB: "Never eat bread again",
    difficulty: "medium"
  },
  {
    id: 17,
    category: "Social",
    questionA: "Always know when someone lies",
    questionB: "Always know what someone feels",
    difficulty: "hard"
  },
  {
    id: 18,
    category: "Lifestyle",
    questionA: "Live without WiFi",
    questionB: "Live without air conditioning",
    difficulty: "hard"
  },
  {
    id: 19,
    category: "Gaming",
    questionA: "Have unlimited game skins",
    questionB: "Have unlimited in-game currency",
    difficulty: "easy"
  },
  {
    id: 20,
    category: "Funny",
    questionA: "Have a theme song whenever you enter a room",
    questionB: "Have confetti fall whenever you laugh",
    difficulty: "medium"
  }
];

// Deterministic pair-specific shuffle so both chatting users mirror the exact same random order
export function getShuffledQuestionsForPair(userId1: string, userId2: string): WYRQuestion[] {
  const seedString = [userId1 || 'u1', userId2 || 'u2'].sort().join(':');
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
    hash |= 0;
  }

  let seed = Math.abs(hash) || 123456789;
  const random = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const copy = [...RAW_WYR_QUESTIONS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const CampusGamesModal: React.FC<CampusGamesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partner,
  isDarkMode = false,
}) => {
  const [activeGame, setActiveGame] = useState<GameType>('menu');

  // Determines who is Player 1 (Red / X / Host) vs Player 2 (Yellow / O / Guest) based on deterministic ID sort
  const isHost = currentUser.id < partner.id;
  const myPlayerId = isHost ? 1 : 2;

  // ─── CONNECT 4 STATE ────────────────────────────────────────────────────────
  // 6 rows x 7 columns (null | 1 | 2)
  const [c4Board, setC4Board] = useState<(number | null)[][]>(() =>
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
  const [c4Turn, setC4Turn] = useState<number>(1);
  const [c4Winner, setC4Winner] = useState<number | 'draw' | null>(null);
  const [c4Scores, setC4Scores] = useState({ p1: 0, p2: 0 });

  // ─── TIC TAC TOE STATE ──────────────────────────────────────────────────────
  const [tttBoard, setTttBoard] = useState<(number | null)[]>(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState<number>(1);
  const [tttWinner, setTttWinner] = useState<number | 'draw' | null>(null);
  const [tttScores, setTttScores] = useState({ p1: 0, p2: 0 });

  // ─── WOULD YOU RATHER STATE (Randomized & Mirrored Per Pair) ───────────────
  const [wyrQuestions, setWyrQuestions] = useState<WYRQuestion[]>(() =>
    getShuffledQuestionsForPair(currentUser.id, partner.id)
  );

  useEffect(() => {
    setWyrQuestions(getShuffledQuestionsForPair(currentUser.id, partner.id));
  }, [currentUser.id, partner.id]);

  const [wyrIndex, setWyrIndex] = useState(0);
  const [wyrMyChoice, setWyrMyChoice] = useState<'A' | 'B' | null>(null);
  const [wyrPartnerChoice, setWyrPartnerChoice] = useState<'A' | 'B' | null>(null);
  const [wyrTimerSeconds, setWyrTimerSeconds] = useState(10);
  const [wyrStats, setWyrStats] = useState({ matches: 0, totalAnswered: 0 });
  const [wyrAutoSkipNotice, setWyrAutoSkipNotice] = useState(false);
  const wyrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wyrAutoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── ROCK PAPER SCISSORS STATE ──────────────────────────────────────────────
  const [rpsMyChoice, setRpsMyChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [rpsPartnerChoice, setRpsPartnerChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [rpsResult, setRpsResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [rpsScores, setRpsScores] = useState({ me: 0, partner: 0 });

  const [victoryData, setVictoryData] = useState<{
    winnerUsername: string;
    isMe: boolean;
    gameName: string;
  } | null>(null);
  const victoryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetAllGameBoards = () => {
    // Fresh Connect 4 board
    setC4Board(Array(6).fill(null).map(() => Array(7).fill(null)));
    setC4Turn(1);
    setC4Winner(null);

    // Fresh Tic-Tac-Toe board
    setTttBoard(Array(9).fill(null));
    setTttTurn(1);
    setTttWinner(null);

    // Fresh RPS state
    setRpsMyChoice(null);
    setRpsPartnerChoice(null);
    setRpsResult(null);

    // Return to game selection menu for fresh next match
    setActiveGame('menu');
  };

  const triggerVictory = (winnerPlayerId: number, gameName: string) => {
    const isMe = winnerPlayerId === myPlayerId;
    const winnerUsername = isMe ? currentUser.username : partner.username;

    setVictoryData({
      winnerUsername,
      isMe,
      gameName,
    });

    if (isMe) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#ffc900', '#701a31', '#00e599', '#ff90e8', '#ffffff'],
        });
      } catch (e) {}
    }

    if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
    victoryTimerRef.current = setTimeout(() => {
      setVictoryData(null);
      resetAllGameBoards();
      onClose();
      roomManager.sendGameSignal({ action: 'AUTO_RESET_AND_CLOSE' });
    }, 3800);
  };

  useEffect(() => {
    return () => {
      if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
    };
  }, []);

  // ─── REALTIME GAME SIGNALS LISTENER ─────────────────────────────────────────
  useEffect(() => {
    const unsub = roomManager.onGameSignal((data) => {
      if (!data) return;

      switch (data.action) {
        case 'OPEN_DRAWER':
          setActiveGame(data.game || 'menu');
          break;

        case 'CHANGE_GAME':
          setActiveGame(data.game);
          break;

        case 'CLOSE_DRAWER':
          onClose();
          break;

        case 'AUTO_RESET_AND_CLOSE':
          setVictoryData(null);
          resetAllGameBoards();
          onClose();
          break;

        // Connect 4 signals
        case 'C4_MOVE':
          setC4Board(data.board);
          setC4Turn(data.nextTurn);
          setC4Winner(data.winner);
          if (data.scores) setC4Scores(data.scores);
          if (data.winner === 1 || data.winner === 2) {
            triggerVictory(data.winner, 'Connect 4');
          }
          break;

        case 'C4_RESET':
          setC4Board(Array(6).fill(null).map(() => Array(7).fill(null)));
          setC4Turn(1);
          setC4Winner(null);
          break;

        // Tic Tac Toe signals
        case 'TTT_MOVE':
          setTttBoard(data.board);
          setTttTurn(data.nextTurn);
          setTttWinner(data.winner);
          if (data.scores) setTttScores(data.scores);
          if (data.winner === 1 || data.winner === 2) {
            triggerVictory(data.winner, 'Tic-Tac-Toe');
          }
          break;

        case 'TTT_RESET':
          setTttBoard(Array(9).fill(null));
          setTttTurn(1);
          setTttWinner(null);
          break;

        // Would You Rather signals
        case 'WYR_PICK':
          setWyrPartnerChoice(data.choice);
          break;

        case 'WYR_NEXT_QUESTION':
          setWyrIndex(data.nextIndex);
          setWyrMyChoice(null);
          setWyrPartnerChoice(null);
          setWyrTimerSeconds(10);
          setWyrAutoSkipNotice(false);
          if (data.stats) setWyrStats(data.stats);
          break;

        // RPS signals
        case 'RPS_PICK':
          setRpsPartnerChoice(data.choice);
          break;

        case 'RPS_RESET':
          setRpsMyChoice(null);
          setRpsPartnerChoice(null);
          setRpsResult(null);
          break;
      }
    });

    return () => {
      unsub();
    };
  }, [onClose, myPlayerId, currentUser.username, partner.username]);

  // ─── WOULD YOU RATHER 10-SECOND TIMER & SMART ACCUMULATION ──────────────────
  useEffect(() => {
    if (activeGame !== 'wouldyourather') {
      if (wyrTimerRef.current) clearInterval(wyrTimerRef.current);
      if (wyrAutoAdvanceTimerRef.current) clearTimeout(wyrAutoAdvanceTimerRef.current);
      return;
    }

    // Both players have made a choice
    if (wyrMyChoice && wyrPartnerChoice) {
      if (wyrTimerRef.current) clearInterval(wyrTimerRef.current);

      // Check if both matched
      const isMatch = wyrMyChoice === wyrPartnerChoice;

      if (isHost) {
        const nextStats = {
          matches: wyrStats.matches + (isMatch ? 1 : 0),
          totalAnswered: wyrStats.totalAnswered + 1,
        };
        setWyrStats(nextStats);

        // Auto-advance after 3.5s
        if (wyrAutoAdvanceTimerRef.current) clearTimeout(wyrAutoAdvanceTimerRef.current);
        wyrAutoAdvanceTimerRef.current = setTimeout(() => {
          advanceWyrQuestion(nextStats);
        }, 3500);
      }
      return;
    }

    // Countdown active
    if (wyrTimerRef.current) clearInterval(wyrTimerRef.current);
    wyrTimerRef.current = setInterval(() => {
      setWyrTimerSeconds((prev) => {
        if (prev <= 1) {
          if (wyrTimerRef.current) clearInterval(wyrTimerRef.current);
          setWyrAutoSkipNotice(true);

          // Auto-skip question when 10 seconds expire
          if (isHost) {
            if (wyrAutoAdvanceTimerRef.current) clearTimeout(wyrAutoAdvanceTimerRef.current);
            wyrAutoAdvanceTimerRef.current = setTimeout(() => {
              advanceWyrQuestion(wyrStats);
            }, 1500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (wyrTimerRef.current) clearInterval(wyrTimerRef.current);
      if (wyrAutoAdvanceTimerRef.current) clearTimeout(wyrAutoAdvanceTimerRef.current);
    };
  }, [activeGame, wyrIndex, wyrMyChoice, wyrPartnerChoice, isHost, wyrStats]);

  const advanceWyrQuestion = (statsToBroadcast = wyrStats) => {
    const nextIdx = (wyrIndex + 1) % wyrQuestions.length;
    setWyrIndex(nextIdx);
    setWyrMyChoice(null);
    setWyrPartnerChoice(null);
    setWyrTimerSeconds(10);
    setWyrAutoSkipNotice(false);

    roomManager.sendGameSignal({
      action: 'WYR_NEXT_QUESTION',
      nextIndex: nextIdx,
      stats: statsToBroadcast,
    });
  };

  const handleWyrPick = (choice: 'A' | 'B') => {
    if (wyrMyChoice || wyrTimerSeconds === 0) return;
    setWyrMyChoice(choice);
    roomManager.sendGameSignal({
      action: 'WYR_PICK',
      choice,
    });
  };

  // ─── RPS EVALUATION ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeGame !== 'rockpaperscissors') return;
    if (rpsMyChoice && rpsPartnerChoice && !rpsResult) {
      if (rpsMyChoice === rpsPartnerChoice) {
        setRpsResult('draw');
      } else if (
        (rpsMyChoice === 'rock' && rpsPartnerChoice === 'scissors') ||
        (rpsMyChoice === 'paper' && rpsPartnerChoice === 'rock') ||
        (rpsMyChoice === 'scissors' && rpsPartnerChoice === 'paper')
      ) {
        setRpsResult('win');
        setRpsScores((s) => ({ ...s, me: s.me + 1 }));
        triggerVictory(myPlayerId, 'Rock Paper Scissors');
      } else {
        setRpsResult('lose');
        setRpsScores((s) => ({ ...s, partner: s.partner + 1 }));
        triggerVictory(myPlayerId === 1 ? 2 : 1, 'Rock Paper Scissors');
      }
    }
  }, [activeGame, rpsMyChoice, rpsPartnerChoice, rpsResult]);

  const handleRpsPick = (choice: 'rock' | 'paper' | 'scissors') => {
    if (rpsMyChoice) return;
    setRpsMyChoice(choice);
    roomManager.sendGameSignal({
      action: 'RPS_PICK',
      choice,
    });
  };

  const handleRpsReset = () => {
    setRpsMyChoice(null);
    setRpsPartnerChoice(null);
    setRpsResult(null);
    roomManager.sendGameSignal({ action: 'RPS_RESET' });
  };

  // ─── CONNECT 4 LOGIC ────────────────────────────────────────────────────────
  const checkC4Win = (board: (number | null)[][]): number | 'draw' | null => {
    const rows = 6;
    const cols = 7;

    // Check horizontal, vertical, and diagonals
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const player = board[r][c];
        if (!player) continue;

        // Horizontal right
        if (c + 3 < cols && player === board[r][c + 1] && player === board[r][c + 2] && player === board[r][c + 3]) return player;
        // Vertical down
        if (r + 3 < rows && player === board[r + 1][c] && player === board[r + 2][c] && player === board[r + 3][c]) return player;
        // Diagonal down-right
        if (r + 3 < rows && c + 3 < cols && player === board[r + 1][c + 1] && player === board[r + 2][c + 2] && player === board[r + 3][c + 3]) return player;
        // Diagonal down-left
        if (r + 3 < rows && c - 3 >= 0 && player === board[r + 1][c - 1] && player === board[r + 2][c - 2] && player === board[r + 3][c - 3]) return player;
      }
    }

    // Check if board full
    const isFull = board[0].every((cell) => cell !== null);
    return isFull ? 'draw' : null;
  };

  const handleC4ColumnClick = (colIdx: number) => {
    if (c4Winner || c4Turn !== myPlayerId) return;

    // Find lowest open row in this column
    let targetRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (c4Board[r][colIdx] === null) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return; // column is full

    const nextBoard = c4Board.map((row) => [...row]);
    nextBoard[targetRow][colIdx] = myPlayerId;

    const winnerResult = checkC4Win(nextBoard);
    const nextTurn = myPlayerId === 1 ? 2 : 1;

    let updatedScores = { ...c4Scores };
    if (winnerResult === 1) updatedScores.p1 += 1;
    if (winnerResult === 2) updatedScores.p2 += 1;

    setC4Board(nextBoard);
    setC4Turn(nextTurn);
    setC4Winner(winnerResult);
    if (winnerResult === 1 || winnerResult === 2) {
      setC4Scores(updatedScores);
      triggerVictory(winnerResult, 'Connect 4');
    }

    roomManager.sendGameSignal({
      action: 'C4_MOVE',
      board: nextBoard,
      nextTurn,
      winner: winnerResult,
      scores: updatedScores,
    });
  };

  const handleC4Reset = () => {
    setC4Board(Array(6).fill(null).map(() => Array(7).fill(null)));
    setC4Turn(1);
    setC4Winner(null);
    roomManager.sendGameSignal({ action: 'C4_RESET' });
  };

  // ─── TIC TAC TOE LOGIC ──────────────────────────────────────────────────────
  const checkTttWin = (b: (number | null)[]): number | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],             // diagonals
    ];
    for (const [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    return b.every((cell) => cell !== null) ? 'draw' : null;
  };

  const handleTttCellClick = (idx: number) => {
    if (tttWinner || tttBoard[idx] !== null || tttTurn !== myPlayerId) return;

    const nextBoard = [...tttBoard];
    nextBoard[idx] = myPlayerId;

    const winnerResult = checkTttWin(nextBoard);
    const nextTurn = myPlayerId === 1 ? 2 : 1;

    let updatedScores = { ...tttScores };
    if (winnerResult === 1) updatedScores.p1 += 1;
    if (winnerResult === 2) updatedScores.p2 += 1;

    setTttBoard(nextBoard);
    setTttTurn(nextTurn);
    setTttWinner(winnerResult);
    if (winnerResult === 1 || winnerResult === 2) {
      setTttScores(updatedScores);
      triggerVictory(winnerResult, 'Tic-Tac-Toe');
    }

    roomManager.sendGameSignal({
      action: 'TTT_MOVE',
      board: nextBoard,
      nextTurn,
      winner: winnerResult,
      scores: updatedScores,
    });
  };

  const handleTttReset = () => {
    setTttBoard(Array(9).fill(null));
    setTttTurn(1);
    setTttWinner(null);
    roomManager.sendGameSignal({ action: 'TTT_RESET' });
  };

  const switchGame = (game: GameType) => {
    setActiveGame(game);
    roomManager.sendGameSignal({ action: 'CHANGE_GAME', game });
  };

  const handleClose = () => {
    onClose();
    roomManager.sendGameSignal({ action: 'CLOSE_DRAWER' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Bottom Sheet Modal Container */}
      <div
        className={`w-full max-w-2xl mx-auto rounded-t-3xl border-t-3 border-x-3 border-black shadow-[0px_-8px_24px_rgba(0,0,0,0.3)] flex flex-col max-h-[88vh] overflow-hidden relative animate-in slide-in-from-bottom duration-300 ${
          isDarkMode ? 'bg-[#18181b] text-white' : 'bg-[#f4f4f0] text-black'
        }`}
      >
        {/* Modal Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b-2 border-black flex items-center justify-between bg-[#ffc900] text-black shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center border border-black shadow-xs">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                Campus Games &amp; Icebreakers
              </h3>
              <p className="text-[10px] font-bold opacity-85">
                Live 2-Player Sync with {partner.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeGame !== 'menu' && (
              <button
                type="button"
                onClick={() => switchGame('menu')}
                className="px-2.5 py-1 text-xs font-black bg-white hover:bg-black hover:text-white text-black rounded-lg border border-black transition-all shadow-xs"
              >
                All Games
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-black hover:text-white text-black border border-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xs"
              title="Close Games Drawer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Scrollable Game Canvas Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: GAME SELECTION MENU
             ═══════════════════════════════════════════════════════════════════ */}
          {activeGame === 'menu' && (
            <div className="w-full space-y-4 max-w-lg mx-auto py-2">
              <div className="text-center space-y-1">
                <span className="px-3 py-1 bg-[#00e599] text-black font-extrabold text-xs rounded-full border border-black uppercase tracking-wider inline-block">
                  ✨ Instant Match Games
                </span>
                <h4 className="text-lg sm:text-xl font-black">Choose a Game to Play Together</h4>
                <p className="text-xs text-[#242423] font-medium">
                  Both of you will be synced in realtime automatically!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Game Card 1: Would You Rather */}
                <button
                  type="button"
                  onClick={() => switchGame('wouldyourather')}
                  className="p-4 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#701a31] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-black">Would You Rather</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-400 text-black border border-black rounded-full">10s Timer</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      10-second rapid campus dilemmas with smart compatibility match stats.
                    </p>
                  </div>
                </button>

                {/* Game Card 2: Connect 4 */}
                <button
                  type="button"
                  onClick={() => switchGame('connect4')}
                  className="p-4 bg-white hover:bg-[#fff1f3] border-2 border-black rounded-2xl flex flex-col items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#dc341e] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                    <div className="flex gap-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-white border border-black" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-black" />
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-black text-black">Connect 4 in a Row</span>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Classic 7x6 tactical board game. Connect 4 discs to defeat your partner.
                    </p>
                  </div>
                </button>

                {/* Game Card 3: Tic Tac Toe */}
                <button
                  type="button"
                  onClick={() => switchGame('tictactoe')}
                  className="p-4 bg-white hover:bg-[#fff8e6] border-2 border-black rounded-2xl flex flex-col items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ffc900] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform font-black text-base">
                    ✕ ◯
                  </div>
                  <div>
                    <span className="text-sm font-black text-black">Tic-Tac-Toe</span>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Quick 3x3 match to settle campus debates in 15 seconds.
                    </p>
                  </div>
                </button>

                {/* Game Card 4: Rock Paper Scissors */}
                <button
                  type="button"
                  onClick={() => switchGame('rockpaperscissors')}
                  className="p-4 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ff90e8] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform text-lg">
                    ✌️
                  </div>
                  <div>
                    <span className="text-sm font-black text-black">Rock Paper Scissors</span>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      Rapid-fire shootout. Pick secretly and reveal at the exact same moment.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: WOULD YOU RATHER (10s Timer + Smart Accumulation)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeGame === 'wouldyourather' && (() => {
            const currentQ = wyrQuestions[wyrIndex] || RAW_WYR_QUESTIONS[0];
            return (
              <div className="w-full max-w-md mx-auto space-y-4">
                {/* Question Tracker & Stats Accumulator */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-white border-2 border-black rounded-2xl shadow-xs text-xs font-black">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#701a31] text-white rounded-md">
                      Q{wyrIndex + 1}/{wyrQuestions.length}
                    </span>
                    <span className="px-2 py-0.5 bg-[#fff8e6] text-black border border-black/30 rounded-md font-bold text-[10px] uppercase tracking-wide">
                      {currentQ.category}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-black/20 ${
                      currentQ.difficulty === 'easy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentQ.difficulty === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {currentQ.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 bg-[#00e599] text-black rounded-md flex items-center gap-1 border border-black shadow-2xs">
                      <Sparkles className="w-3 h-3" />
                      <span>{wyrStats.totalAnswered > 0 ? `${Math.round((wyrStats.matches / wyrStats.totalAnswered) * 100)}% Synergy` : '0% Synergy'}</span>
                    </span>
                    <span className="text-gray-500 font-bold">({wyrStats.matches} matches)</span>
                  </div>
                </div>

                {/* 10-Second Animated Timer Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1 text-[#dc341e]">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Time Remaining:</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border border-black ${
                      wyrTimerSeconds <= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-[#ffc900] text-black'
                    }`}>
                      {wyrTimerSeconds}s
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        wyrTimerSeconds <= 3 ? 'bg-red-500' : 'bg-[#00e599]'
                      }`}
                      style={{ width: `${(wyrTimerSeconds / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Auto Skip Alert Notice */}
                {wyrAutoSkipNotice && (
                  <div className="p-2.5 bg-amber-200 border-2 border-black rounded-xl text-center text-xs font-extrabold animate-bounce">
                    ⏳ 10 seconds expired! Skipping to next question...
                  </div>
                )}

                {/* Both Answered: Smart Match Accumulation Reveal Banner */}
                {wyrMyChoice && wyrPartnerChoice && (
                  <div className={`p-3 border-2 border-black rounded-2xl text-center shadow-xs animate-in zoom-in-95 duration-200 ${
                    wyrMyChoice === wyrPartnerChoice
                      ? 'bg-[#00e599] text-black'
                      : 'bg-[#ffe3e8] text-black'
                  }`}>
                    {wyrMyChoice === wyrPartnerChoice ? (
                      <div className="space-y-0.5">
                        <div className="font-black text-sm flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          <span>✨ Match! You both picked the exact same option!</span>
                        </div>
                        <p className="text-xs font-bold opacity-90">
                          Option {wyrMyChoice} • Great minds think alike!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-black text-sm">
                          ⚡ You disagreed on this one!
                        </div>
                        <p className="text-xs font-bold">
                          You picked <span className="underline font-black">Option {wyrMyChoice}</span>, {partner.username} picked <span className="underline font-black">Option {wyrPartnerChoice}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Option Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Option A */}
                  <button
                    type="button"
                    disabled={Boolean(wyrMyChoice) || wyrTimerSeconds === 0}
                    onClick={() => handleWyrPick('A')}
                    className={`p-4 rounded-2xl border-2 sm:border-3 border-black text-left transition-all relative overflow-hidden group cursor-pointer ${
                      wyrMyChoice === 'A'
                        ? 'bg-[#701a31] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.02]'
                        : 'bg-white text-black hover:bg-[#fff1f3] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                        wyrMyChoice === 'A' ? 'bg-[#ffc900] text-black' : 'bg-[#701a31] text-white'
                      }`}>
                        A
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-extrabold leading-snug">
                          {currentQ.questionA}
                        </p>
                        {wyrMyChoice === 'A' && (
                          <span className="text-[11px] font-black text-amber-300 mt-1 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Your Pick
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Partner Pick Indicator after reveal */}
                    {wyrMyChoice && wyrPartnerChoice === 'A' && (
                      <div className="mt-2 pt-2 border-t border-white/20 text-xs font-black text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
                        <span>{partner.username} chose this too!</span>
                      </div>
                    )}
                  </button>

                  {/* Option B */}
                  <button
                    type="button"
                    disabled={Boolean(wyrMyChoice) || wyrTimerSeconds === 0}
                    onClick={() => handleWyrPick('B')}
                    className={`p-4 rounded-2xl border-2 sm:border-3 border-black text-left transition-all relative overflow-hidden group cursor-pointer ${
                      wyrMyChoice === 'B'
                        ? 'bg-[#701a31] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.02]'
                        : 'bg-white text-black hover:bg-[#fff1f3] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                        wyrMyChoice === 'B' ? 'bg-[#ffc900] text-black' : 'bg-[#ffc900] text-black'
                      }`}>
                        B
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-extrabold leading-snug">
                          {currentQ.questionB}
                        </p>
                        {wyrMyChoice === 'B' && (
                          <span className="text-[11px] font-black text-amber-300 mt-1 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Your Pick
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Partner Pick Indicator after reveal */}
                    {wyrMyChoice && wyrPartnerChoice === 'B' && (
                      <div className="mt-2 pt-2 border-t border-white/20 text-xs font-black text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
                        <span>{partner.username} chose this too!</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Status Note */}
                <div className="text-center text-xs font-bold text-gray-500">
                  {wyrMyChoice && !wyrPartnerChoice && (
                    <span className="inline-flex items-center gap-1.5 text-[#701a31] font-extrabold animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Locked in! Waiting for {partner.username} to pick...
                    </span>
                  )}
                  {!wyrMyChoice && (
                    <span>Pick your choice before the 10-second timer runs out!</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: CONNECT 4 (4 IN A ROW)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeGame === 'connect4' && (
            <div className="w-full max-w-md mx-auto space-y-3">
              {/* Scoreboard & Turn Header */}
              <div className="flex items-center justify-between p-2.5 bg-white border-2 border-black rounded-2xl shadow-xs text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#dc341e] border border-black shrink-0" />
                  <span>You ({myPlayerId === 1 ? c4Scores.p1 : c4Scores.p2})</span>
                </div>

                <div className="px-3 py-1 rounded-full border border-black font-extrabold text-[11px] bg-[#f4f4f0]">
                  {c4Winner ? (
                    c4Winner === 'draw' ? 'Draw Game!' : c4Winner === myPlayerId ? '🎉 You Won!' : `🏆 ${partner.username} Won!`
                  ) : (
                    c4Turn === myPlayerId ? '🔴 Your Turn!' : `⏳ ${partner.username}'s Turn`
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span>{partner.username} ({myPlayerId === 1 ? c4Scores.p2 : c4Scores.p1})</span>
                  <span className="w-4 h-4 rounded-full bg-[#ffc900] border border-black shrink-0" />
                </div>
              </div>

              {/* Connect 4 Board */}
              <div className="bg-[#1877f2] p-2.5 sm:p-3.5 border-3 sm:border-4 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                {/* Column Drop Buttons Header */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                    <button
                      key={col}
                      type="button"
                      disabled={Boolean(c4Winner) || c4Turn !== myPlayerId}
                      onClick={() => handleC4ColumnClick(col)}
                      className={`h-7 sm:h-8 rounded-xl border-2 border-black flex items-center justify-center font-black text-xs transition-all ${
                        c4Turn === myPlayerId && !c4Winner
                          ? 'bg-white hover:bg-amber-300 text-black shadow-xs active:scale-95 cursor-pointer'
                          : 'bg-white/40 text-black/40 cursor-not-allowed border-black/30'
                      }`}
                      title={`Drop in column ${col + 1}`}
                    >
                      ↓
                    </button>
                  ))}
                </div>

                {/* 6x7 Matrix Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 bg-[#0d59b8] p-2 rounded-2xl border-2 border-black">
                  {c4Board.map((row, rIdx) =>
                    row.map((cell, cIdx) => (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        type="button"
                        onClick={() => handleC4ColumnClick(cIdx)}
                        disabled={Boolean(c4Winner) || c4Turn !== myPlayerId}
                        className="aspect-square rounded-full border-2 border-black flex items-center justify-center transition-all bg-[#0a4694] overflow-hidden relative shadow-inner"
                      >
                        {cell === 1 && (
                          <div className="w-full h-full rounded-full bg-[#dc341e] border-2 border-black shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4)] animate-in zoom-in-75 duration-200" />
                        )}
                        {cell === 2 && (
                          <div className="w-full h-full rounded-full bg-[#ffc900] border-2 border-black shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4)] animate-in zoom-in-75 duration-200" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Reset / Rematch Controls */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleC4Reset}
                  className="px-4 py-2 bg-white hover:bg-black hover:text-white text-black font-extrabold text-xs rounded-xl border-2 border-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Match</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: TIC TAC TOE (3X3)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeGame === 'tictactoe' && (
            <div className="w-full max-w-sm mx-auto space-y-3">
              {/* Scoreboard */}
              <div className="flex items-center justify-between p-2.5 bg-white border-2 border-black rounded-2xl shadow-xs text-xs font-black">
                <div className="flex items-center gap-1 text-[#701a31]">
                  <span>You (✕)</span>
                  <span className="px-1.5 py-0.5 bg-[#fff1f3] border border-black rounded">{myPlayerId === 1 ? tttScores.p1 : tttScores.p2}</span>
                </div>

                <div className="px-3 py-1 rounded-full border border-black font-extrabold text-[11px] bg-[#ffc900] text-black">
                  {tttWinner ? (
                    tttWinner === 'draw' ? 'Draw!' : tttWinner === myPlayerId ? '🎉 You Won!' : `🏆 ${partner.username} Won!`
                  ) : (
                    tttTurn === myPlayerId ? 'Your Turn (✕)' : `${partner.username}'s Turn`
                  )}
                </div>

                <div className="flex items-center gap-1 text-[#dc341e]">
                  <span>{partner.username} (◯)</span>
                  <span className="px-1.5 py-0.5 bg-[#ffe3e8] border border-black rounded">{myPlayerId === 1 ? tttScores.p2 : tttScores.p1}</span>
                </div>
              </div>

              {/* 3x3 Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-white border-3 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                {tttBoard.map((cell, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={Boolean(tttWinner) || cell !== null || tttTurn !== myPlayerId}
                    onClick={() => handleTttCellClick(idx)}
                    className={`aspect-square rounded-2xl border-2 border-black flex items-center justify-center font-black text-3xl sm:text-4xl transition-all shadow-xs ${
                      cell === null && tttTurn === myPlayerId && !tttWinner
                        ? 'bg-[#f4f4f0] hover:bg-[#fff1f3] cursor-pointer active:scale-95'
                        : 'bg-white'
                    }`}
                  >
                    {cell === 1 && <span className="text-[#701a31] animate-in zoom-in-75">✕</span>}
                    {cell === 2 && <span className="text-[#ffc900] animate-in zoom-in-75">◯</span>}
                  </button>
                ))}
              </div>

              {/* Rematch Button */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTttReset}
                  className="px-4 py-2 bg-white hover:bg-black hover:text-white text-black font-extrabold text-xs rounded-xl border-2 border-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Tic-Tac-Toe</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VIEW: ROCK PAPER SCISSORS
             ═══════════════════════════════════════════════════════════════════ */}
          {activeGame === 'rockpaperscissors' && (
            <div className="w-full max-w-sm mx-auto space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-white border-2 border-black rounded-2xl shadow-xs text-xs font-black">
                <span>You: {rpsScores.me} wins</span>
                <span className="px-2 py-0.5 bg-[#ff90e8] text-black border border-black rounded-full uppercase">Shootout</span>
                <span>{partner.username}: {rpsScores.partner} wins</span>
              </div>

              {/* Result Reveal Banner */}
              {rpsResult && (
                <div className={`p-4 border-2 border-black rounded-2xl text-center shadow-xs font-black text-sm ${
                  rpsResult === 'win'
                    ? 'bg-[#00e599] text-black'
                    : rpsResult === 'lose'
                    ? 'bg-[#dc341e] text-white'
                    : 'bg-[#ffc900] text-black'
                }`}>
                  {rpsResult === 'win' && '🎉 Victory! You won this round!'}
                  {rpsResult === 'lose' && `🏆 ${partner.username} won this round!`}
                  {rpsResult === 'draw' && "🤝 It's a Tie! Both picked the same!"}
                </div>
              )}

              {/* Pick Options */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'rock' as const, label: 'Rock', icon: '✊' },
                  { key: 'paper' as const, label: 'Paper', icon: '✋' },
                  { key: 'scissors' as const, label: 'Scissors', icon: '✌️' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={Boolean(rpsMyChoice)}
                    onClick={() => handleRpsPick(item.key)}
                    className={`p-3.5 sm:p-5 rounded-2xl border-2 sm:border-3 border-black flex flex-col items-center gap-1.5 transition-all ${
                      rpsMyChoice === item.key
                        ? 'bg-[#701a31] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-105'
                        : 'bg-white text-black hover:bg-[#fff1f3] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl">{item.icon}</span>
                    <span className="text-xs font-black">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Status or Rematch */}
              <div className="text-center text-xs font-bold">
                {rpsMyChoice && !rpsPartnerChoice && (
                  <span className="text-[#701a31] font-extrabold animate-pulse">
                    Locked in! Waiting for {partner.username} to reveal...
                  </span>
                )}
                {rpsResult && (
                  <button
                    type="button"
                    onClick={handleRpsReset}
                    className="px-4 py-2 bg-white hover:bg-black hover:text-white text-black font-extrabold text-xs rounded-xl border-2 border-black shadow-xs flex items-center gap-1.5 mx-auto transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Another Round</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            VICTORY & DUEL WINNER CELEBRATION OVERLAY (DotLottie Animation)
           ═══════════════════════════════════════════════════════════════════ */}
        {victoryData && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 fade-in duration-300">
            {/* Animated Lottie Winner Cup */}
            <div className="relative">
              <DotLottieReact
                src="/animated-reacts/winner.lottie"
                loop={true}
                autoplay={true}
                className="w-48 h-48 sm:w-60 sm:h-60 mx-auto drop-shadow-2xl"
              />
            </div>

            {/* Winner Title Badge */}
            <div className="mt-1 space-y-2 max-w-sm mx-auto">
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                victoryData.isMe ? 'bg-[#00e599] text-black animate-bounce' : 'bg-[#ffc900] text-black'
              }`}>
                <Trophy className="w-4 h-4" />
                <span>{victoryData.isMe ? 'Victory! You Won!' : `${victoryData.winnerUsername} Won!`}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {victoryData.isMe ? 'Campus Duel Champion!' : 'Better Luck Next Round!'}
              </h3>

              <p className="text-xs sm:text-sm text-gray-300 font-medium">
                {victoryData.gameName} duel concluded. Returning to the chatroom...
              </p>

              {/* Pulsing countdown pill */}
              <div className="pt-1.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white/20 text-white rounded-full text-xs font-bold border border-white/30 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Switching to chatroom...</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
