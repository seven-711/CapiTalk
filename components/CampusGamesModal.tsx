'use client';

import React, { useState, useEffect, useRef } from 'react';
import { roomManager } from '../lib/realtime/roomManager';
import { UserProfile } from '../lib/types';
import { useChatStore } from '../lib/store/useChatStore';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  Play,
  Pause,
  RefreshCw,
  Users,
  Flag,
  MessageSquare,
  Share2,
  Scale,
  HeartHandshake,
  Check,
} from 'lucide-react';

export type GameType = 'menu' | 'connect4' | 'tictactoe' | 'redgreenflag' | 'wouldyourather' | 'rockpaperscissors';

interface CampusGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  partner: UserProfile;
  isDarkMode?: boolean;
}

export interface FlagQuestion {
  id: number;
  category: string;
  scenario: string;
  difficulty: 'classic' | 'spicy' | 'campus' | 'deep';
}

export interface FlagHistoryEntry {
  question: FlagQuestion;
  myChoice: 'RED' | 'GREEN' | 'TIMEOUT';
  partnerChoice: 'RED' | 'GREEN' | 'TIMEOUT';
  isMatch: boolean;
}

export interface SmartFeedbackData {
  synergyScore: number;
  matchCount: number;
  totalQuestions: number;
  archetypeTitle: string;
  archetypeBadge: string;
  archetypeDescription: string;
  biggestRedFlagAlliance?: string;
  biggestGreenFlagAlliance?: string;
  spiciestDebate?: {
    scenario: string;
    myChoice: string;
    partnerChoice: string;
  };
  strictnessVerdict: string;
  myRedCount: number;
  partnerRedCount: number;
}

export function computeFlagSmartFeedback(
  history: FlagHistoryEntry[],
  currentUsername: string,
  partnerUsername: string
): SmartFeedbackData {
  const total = history.length || QUESTIONS_PER_ROUND;
  const matches = history.filter((h) => h.isMatch).length;
  const synergyScore = total > 0 ? Math.round((matches / total) * 100) : 0;

  let archetypeTitle = "Twin Flame Alignment";
  let archetypeBadge = "Uncanny Synergy 💖";
  let archetypeDescription = "You two operate on the exact same campus wavelength! Your boundaries, instincts, and green flags match up almost seamlessly. You'd either be an unstoppable duo or complete partners in crime.";

  if (synergyScore < 29) {
    archetypeTitle = "🌪️ Total Chaos & Intrigue";
    archetypeBadge = "Wild Card Dynamic 🎭";
    archetypeDescription = "Polar opposites across the board! Where one sees a red flag, the other sees a green flag. Perfect chemistry for playful banter and a spicy, unpredictable campus dynamic.";
  } else if (synergyScore < 58) {
    archetypeTitle = "⚡ Spicy Debate Partners";
    archetypeBadge = "Opposites in Motion 🌶️";
    archetypeDescription = "You two look at campus dilemmas from wonderfully contrasting perspectives. One is chill and forgiving while the other maintains high standards. Late-night conversations will never run dry.";
  } else if (synergyScore < 85) {
    archetypeTitle = "🔥 Balanced Chemistry";
    archetypeBadge = "Dynamic Duo 🤝";
    archetypeDescription = "You share solid core values with just enough healthy divergence to keep things lively. You agree on what truly matters while keeping each other sharp on the nuances.";
  }

  const mutualRed = history.find((h) => h.myChoice === 'RED' && h.partnerChoice === 'RED');
  const mutualGreen = history.find((h) => h.myChoice === 'GREEN' && h.partnerChoice === 'GREEN');
  const debate = history.find((h) => !h.isMatch && h.myChoice !== 'TIMEOUT' && h.partnerChoice !== 'TIMEOUT');

  const myRedCount = history.filter((h) => h.myChoice === 'RED').length;
  const partnerRedCount = history.filter((h) => h.partnerChoice === 'RED').length;

  let strictnessVerdict = "You both have an identical standard filter!";
  if (myRedCount > partnerRedCount) {
    strictnessVerdict = `${currentUsername} has a stricter radar (${myRedCount} 🚩) compared to ${partnerUsername} (${partnerRedCount} 🚩)!`;
  } else if (partnerRedCount > myRedCount) {
    strictnessVerdict = `${partnerUsername} has a stricter radar (${partnerRedCount} 🚩) compared to ${currentUsername} (${myRedCount} 🚩)!`;
  }

  return {
    synergyScore,
    matchCount: matches,
    totalQuestions: total,
    archetypeTitle,
    archetypeBadge,
    archetypeDescription,
    biggestRedFlagAlliance: mutualRed?.question.scenario,
    biggestGreenFlagAlliance: mutualGreen?.question.scenario,
    spiciestDebate: debate ? {
      scenario: debate.question.scenario,
      myChoice: debate.myChoice === 'RED' ? '🚩 Red Flag' : '🟢 Green Flag',
      partnerChoice: debate.partnerChoice === 'RED' ? '🚩 Red Flag' : '🟢 Green Flag',
    } : undefined,
    strictnessVerdict,
    myRedCount,
    partnerRedCount,
  };
}

// ─── Red Flag or Green Flag Questions (28 Curated Dating & Campus Scenarios) ───
export const RAW_FLAG_QUESTIONS: FlagQuestion[] = [
  {
    id: 1,
    category: "Dating & Exes",
    scenario: "They are still close best friends with their ex and hang out one-on-one regularly.",
    difficulty: "spicy",
  },
  {
    id: 2,
    category: "Communication",
    scenario: "They leave you on 'Delivered' for 2 days, but post 5 Instagram stories throughout the day.",
    difficulty: "spicy",
  },
  {
    id: 3,
    category: "Campus Life",
    scenario: "They remind the professor 2 minutes before class ends that there was supposed to be a quiz today.",
    difficulty: "campus",
  },
  {
    id: 4,
    category: "Romance & Dates",
    scenario: "They offer to pay the entire bill on the first date without making a scene or expecting anything.",
    difficulty: "classic",
  },
  {
    id: 5,
    category: "Lifestyle & Phone",
    scenario: "They have 0 unread emails, 0 unread notification badges, and a pristine organized phone home screen.",
    difficulty: "classic",
  },
  {
    id: 6,
    category: "Academic Solidarity",
    scenario: "They share their complete color-coded lecture notes and exam reviewer in the group chat before finals.",
    difficulty: "campus",
  },
  {
    id: 7,
    category: "Social Habits",
    scenario: "They check their phone and scroll TikTok while you are in the middle of telling them an emotional personal story.",
    difficulty: "spicy",
  },
  {
    id: 8,
    category: "Character & Respect",
    scenario: "They are extremely sweet to you, but rude or impatient to cafeteria servers and university security guards.",
    difficulty: "classic",
  },
  {
    id: 9,
    category: "Thoughtfulness",
    scenario: "They remember tiny, obscure details you mentioned in passing weeks ago (like your exact coffee order or favorite candy).",
    difficulty: "classic",
  },
  {
    id: 10,
    category: "Study Habits",
    scenario: "They only start a 10-page thesis chapter 3 hours before the 11:59 PM deadline and submit at 11:58 PM.",
    difficulty: "campus",
  },
  {
    id: 11,
    category: "Conflict & Maturity",
    scenario: "They apologize immediately and take sincere accountability whenever they realize they made a mistake.",
    difficulty: "deep",
  },
  {
    id: 12,
    category: "Social Media",
    scenario: "They have 3,000 active followers but strictly refuse to post you or even acknowledge having a partner anywhere online.",
    difficulty: "spicy",
  },
  {
    id: 13,
    category: "Group Projects",
    scenario: "They quietly do 90% of the entire group project all by themselves just to make sure everyone gets a 1.0 (A) grade.",
    difficulty: "campus",
  },
  {
    id: 14,
    category: "Independence",
    scenario: "They actively encourage you to spend time with your own friends and have hobbies outside the relationship.",
    difficulty: "classic",
  },
  {
    id: 15,
    category: "Friendship Loyalty",
    scenario: "They gossip and talk badly about their closest best friend the instant they step out of the room.",
    difficulty: "spicy",
  },
  {
    id: 16,
    category: "Communication",
    scenario: "They prefer calling you on the phone immediately instead of texting back and forth for 20 minutes.",
    difficulty: "classic",
  },
  {
    id: 17,
    category: "Humor & Ego",
    scenario: "They can genuinely laugh at themselves without getting defensive when they do something clumsy or awkward.",
    difficulty: "deep",
  },
  {
    id: 18,
    category: "Dating Memories",
    scenario: "They still keep a dedicated photo album of their ex in their private hidden phone gallery folder.",
    difficulty: "spicy",
  },
  {
    id: 19,
    category: "Daily Routine",
    scenario: "They wake up at 5:00 AM every single morning including weekends and holidays to run or workout.",
    difficulty: "classic",
  },
  {
    id: 20,
    category: "Campus Etiquette",
    scenario: "They borrow your pens, highlighters, or scientific calculators during class and never remember to return them.",
    difficulty: "campus",
  },
  {
    id: 21,
    category: "Texting Style",
    scenario: "They send 10 rapid 2-word text bubbles in a row within 5 seconds instead of sending one complete paragraph.",
    difficulty: "classic",
  },
  {
    id: 22,
    category: "Support & Hype",
    scenario: "They actively celebrate your personal wins and hype up your achievements to everyone they know.",
    difficulty: "classic",
  },
  {
    id: 23,
    category: "Food Habits",
    scenario: "They put hot sauce / sriracha / extra chili on literally every single meal, including breakfast toast.",
    difficulty: "classic",
  },
  {
    id: 24,
    category: "Caring & Late Nights",
    scenario: "They always ask 'Have you eaten dinner yet?' or 'Did you get home safe?' before starting a late-night chat.",
    difficulty: "classic",
  },
  {
    id: 25,
    category: "Transparency",
    scenario: "They share their permanent live GPS location with 15 different friends and family members 24/7.",
    difficulty: "spicy",
  },
  {
    id: 26,
    category: "Study Sessions",
    scenario: "They bring extra snacks, milk tea, or coffee for the entire study table without anyone asking.",
    difficulty: "campus",
  },
  {
    id: 27,
    category: "Emotional Intelligence",
    scenario: "They ask 'Do you want advice or do you just want to vent right now?' when you share a stressful problem.",
    difficulty: "deep",
  },
  {
    id: 28,
    category: "Dating Pace",
    scenario: "They say 'I think I love you' or plan a couple vacation after talking for only 3 days.",
    difficulty: "spicy",
  },
];

export const QUESTIONS_PER_ROUND = 7;

// Deterministic pair-specific shuffle that rotates 7 unique questions from the deck
export function getShuffledQuestionsForPair(userId1: string, userId2: string): FlagQuestion[] {
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

  const copy = [...RAW_FLAG_QUESTIONS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, QUESTIONS_PER_ROUND);
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

  // ─── RED FLAG OR GREEN FLAG STATE (7 Scenarios per match) ───────────────────
  const [flagQuestions, setFlagQuestions] = useState<FlagQuestion[]>(() =>
    getShuffledQuestionsForPair(currentUser.id, partner.id)
  );

  useEffect(() => {
    setFlagQuestions(getShuffledQuestionsForPair(currentUser.id, partner.id));
  }, [currentUser.id, partner.id]);

  const [flagIndex, setFlagIndex] = useState(0);
  const [flagMyChoice, setFlagMyChoice] = useState<'RED' | 'GREEN' | null>(null);
  const [flagPartnerChoice, setFlagPartnerChoice] = useState<'RED' | 'GREEN' | null>(null);
  const [flagTimerSeconds, setFlagTimerSeconds] = useState(10);
  const [flagStats, setFlagStats] = useState({ matches: 0, totalAnswered: 0 });
  const [flagAutoSkipNotice, setFlagAutoSkipNotice] = useState(false);
  const [flagHistory, setFlagHistory] = useState<FlagHistoryEntry[]>([]);
  const [flagIsFinished, setFlagIsFinished] = useState(false);
  const [flagFeedbackStep, setFlagFeedbackStep] = useState<number>(0);
  const [isAutoPlayingFeedback, setIsAutoPlayingFeedback] = useState<boolean>(true);
  const [flagSharedToChat, setFlagSharedToChat] = useState(false);
  const { sendMessage } = useChatStore();

  const flagTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flagAutoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEvaluatedQRef = useRef<number>(-1);
  const scheduledAdvanceQRef = useRef<number>(-1);

  // ─── RED FLAG OR GREEN FLAG AUTOMATIC SMART FEEDBACK ANIMATION SEQUENCE ─────
  useEffect(() => {
    if (!flagIsFinished || !isAutoPlayingFeedback) return;

    // Time to display each section before smoothly fading to next:
    // Step 0 (Archetype & Synergy): 4200ms
    // Step 1 (Mutual Dealbreakers & Green Flags): 4000ms
    // Step 2 (Debates & Standards Radar): 4000ms
    // Step 3 (Round Breakdown): stops at breakdown for manual review & actions
    const stepDurations = [4200, 4000, 4000, 5000];
    const duration = stepDurations[flagFeedbackStep] || 4000;

    const timer = setTimeout(() => {
      setFlagFeedbackStep((prev) => {
        if (prev < 3) {
          return prev + 1;
        } else {
          // Reached final breakdown summary: pause auto-play so user can freely explore and share
          setIsAutoPlayingFeedback(false);
          return prev;
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [flagIsFinished, flagFeedbackStep, isAutoPlayingFeedback]);

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

    // Fresh Red Flag or Green Flag state
    setFlagIndex(0);
    setFlagMyChoice(null);
    setFlagPartnerChoice(null);
    setFlagTimerSeconds(10);
    setFlagStats({ matches: 0, totalAnswered: 0 });
    setFlagAutoSkipNotice(false);
    setFlagHistory([]);
    setFlagIsFinished(false);
    setFlagFeedbackStep(0);
    setIsAutoPlayingFeedback(true);
    setFlagSharedToChat(false);
    lastEvaluatedQRef.current = -1;
    scheduledAdvanceQRef.current = -1;
    if (flagTimerRef.current) clearInterval(flagTimerRef.current);
    if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);

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

        // Red Flag or Green Flag signals
        case 'FLAG_PICK':
        case 'WYR_PICK':
          if (data.questionIndex === undefined || data.questionIndex === flagIndex) {
            setFlagPartnerChoice(data.choice);
          }
          break;

        case 'FLAG_NEXT_QUESTION':
        case 'WYR_NEXT_QUESTION':
          if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
          scheduledAdvanceQRef.current = -1;
          lastEvaluatedQRef.current = -1;

          setFlagIndex(data.nextIndex);
          setFlagMyChoice(null);
          setFlagPartnerChoice(null);
          setFlagTimerSeconds(10);
          setFlagAutoSkipNotice(false);
          if (data.stats) setFlagStats(data.stats);
          if (data.historyItem) {
            setFlagHistory((prev) => {
              // Avoid duplicates
              const exists = prev.some((h) => h.question.id === data.historyItem.question.id);
              return exists ? prev : [...prev, data.historyItem];
            });
          }
          break;

        case 'FLAG_FINISH':
          if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
          scheduledAdvanceQRef.current = -1;
          lastEvaluatedQRef.current = -1;
          if (data.stats) setFlagStats(data.stats);
          if (data.history) setFlagHistory(data.history);
          setFlagIsFinished(true);
          setFlagFeedbackStep(0);
          setIsAutoPlayingFeedback(true);
          try {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.5 },
              colors: ['#ffc900', '#dc341e', '#00e599', '#ff90e8', '#ffffff'],
            });
          } catch (e) {}
          break;

        case 'FLAG_RESTART_ROUND':
          if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
          if (flagTimerRef.current) clearInterval(flagTimerRef.current);
          scheduledAdvanceQRef.current = -1;
          lastEvaluatedQRef.current = -1;

          if (data.questions) setFlagQuestions(data.questions);
          setFlagIndex(0);
          setFlagMyChoice(null);
          setFlagPartnerChoice(null);
          setFlagTimerSeconds(10);
          setFlagStats({ matches: 0, totalAnswered: 0 });
          setFlagAutoSkipNotice(false);
          setFlagHistory([]);
          setFlagIsFinished(false);
          setFlagFeedbackStep(0);
          setIsAutoPlayingFeedback(true);
          setFlagSharedToChat(false);
          setActiveGame('redgreenflag');
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
  }, [onClose, myPlayerId, currentUser.username, partner.username, flagIndex]);

  // ─── RED FLAG OR GREEN FLAG 10-SECOND COUNTDOWN TIMER ───────────────────────
  useEffect(() => {
    if (activeGame !== 'redgreenflag' && activeGame !== 'wouldyourather') {
      if (flagTimerRef.current) clearInterval(flagTimerRef.current);
      return;
    }

    if (flagIsFinished) {
      if (flagTimerRef.current) clearInterval(flagTimerRef.current);
      return;
    }

    // Stop countdown if both already picked
    if (flagMyChoice && flagPartnerChoice) {
      if (flagTimerRef.current) clearInterval(flagTimerRef.current);
      return;
    }

    if (flagTimerRef.current) clearInterval(flagTimerRef.current);
    flagTimerRef.current = setInterval(() => {
      setFlagTimerSeconds((prev) => {
        if (prev <= 1) {
          if (flagTimerRef.current) clearInterval(flagTimerRef.current);
          setFlagAutoSkipNotice(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (flagTimerRef.current) clearInterval(flagTimerRef.current);
    };
  }, [activeGame, flagIndex, flagIsFinished, flagMyChoice, flagPartnerChoice]);

  // ─── RED FLAG OR GREEN FLAG EVALUATION & AUTO-ADVANCEMENT ───────────────────
  useEffect(() => {
    if (activeGame !== 'redgreenflag' && activeGame !== 'wouldyourather') return;
    if (flagIsFinished) return;

    const bothAnswered = Boolean(flagMyChoice && flagPartnerChoice);
    const isTimeout = flagTimerSeconds === 0;

    if (!bothAnswered && !isTimeout) return;

    // Check if advancement has already been scheduled for this question index
    if (scheduledAdvanceQRef.current === flagIndex) return;
    scheduledAdvanceQRef.current = flagIndex;

    const currentQ = flagQuestions[flagIndex] || RAW_FLAG_QUESTIONS[0];
    const myPick = flagMyChoice || 'TIMEOUT';
    const partnerPick = flagPartnerChoice || 'TIMEOUT';
    const isMatch = myPick !== 'TIMEOUT' && myPick === partnerPick;

    const historyItem: FlagHistoryEntry = {
      question: currentQ,
      myChoice: myPick,
      partnerChoice: partnerPick,
      isMatch,
    };

    setFlagHistory((prev) => {
      const exists = prev.some((h) => h.question.id === currentQ.id);
      return exists ? prev : [...prev, historyItem];
    });

    setFlagStats((prev) => {
      const nextStats = {
        matches: prev.matches + (isMatch ? 1 : 0),
        totalAnswered: prev.totalAnswered + 1,
      };

      const nextQIndex = flagIndex + 1;
      const isFinalQuestion = nextQIndex >= QUESTIONS_PER_ROUND;
      const advanceDelay = isTimeout ? 1800 : 2500;

      if (isHost) {
        if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
        flagAutoAdvanceTimerRef.current = setTimeout(() => {
          if (isFinalQuestion) {
            setFlagIsFinished(true);
            setFlagFeedbackStep(0);
            setIsAutoPlayingFeedback(true);
            try {
              confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#ffc900', '#dc341e', '#00e599', '#ff90e8', '#ffffff'],
              });
            } catch (e) {}

            setFlagHistory((currentHistory) => {
              roomManager.sendGameSignal({
                action: 'FLAG_FINISH',
                stats: nextStats,
                history: currentHistory,
              });
              return currentHistory;
            });
          } else {
            advanceFlagQuestion(nextQIndex, nextStats, historyItem);
          }
        }, advanceDelay);
      } else {
        // Guest Fallback Timer: in case Host packet is dropped, smoothly advance to next question
        if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
        flagAutoAdvanceTimerRef.current = setTimeout(() => {
          if (isFinalQuestion) {
            setFlagIsFinished(true);
            setFlagFeedbackStep(0);
            setIsAutoPlayingFeedback(true);
          } else {
            advanceFlagQuestion(nextQIndex, nextStats, historyItem);
          }
        }, advanceDelay + 2000);
      }

      return nextStats;
    });
  }, [activeGame, flagIndex, flagMyChoice, flagPartnerChoice, flagTimerSeconds, flagIsFinished, isHost, flagQuestions]);

  const advanceFlagQuestion = (
    targetIndex: number,
    statsToBroadcast?: { matches: number; totalAnswered: number },
    historyItem?: FlagHistoryEntry
  ) => {
    if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
    scheduledAdvanceQRef.current = -1;
    lastEvaluatedQRef.current = -1;

    setFlagIndex(targetIndex);
    setFlagMyChoice(null);
    setFlagPartnerChoice(null);
    setFlagTimerSeconds(10);
    setFlagAutoSkipNotice(false);

    roomManager.sendGameSignal({
      action: 'FLAG_NEXT_QUESTION',
      nextIndex: targetIndex,
      stats: statsToBroadcast,
      historyItem,
    });
  };

  const handleFlagPick = (choice: 'RED' | 'GREEN') => {
    if (flagMyChoice || flagTimerSeconds === 0) return;
    setFlagMyChoice(choice);
    roomManager.sendGameSignal({
      action: 'FLAG_PICK',
      choice,
      questionIndex: flagIndex,
    });
  };

  const handleRestartFlagRound = () => {
    const newQuestions = [...RAW_FLAG_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_ROUND);
    if (flagAutoAdvanceTimerRef.current) clearTimeout(flagAutoAdvanceTimerRef.current);
    if (flagTimerRef.current) clearInterval(flagTimerRef.current);
    scheduledAdvanceQRef.current = -1;
    lastEvaluatedQRef.current = -1;

    setFlagQuestions(newQuestions);
    setFlagIndex(0);
    setFlagMyChoice(null);
    setFlagPartnerChoice(null);
    setFlagTimerSeconds(10);
    setFlagStats({ matches: 0, totalAnswered: 0 });
    setFlagAutoSkipNotice(false);
    setFlagHistory([]);
    setFlagIsFinished(false);
    setFlagFeedbackStep(0);
    setIsAutoPlayingFeedback(true);
    setFlagSharedToChat(false);
    setActiveGame('redgreenflag');

    roomManager.sendGameSignal({
      action: 'FLAG_RESTART_ROUND',
      questions: newQuestions,
    });
  };

  const handleShareFlagFeedbackToChat = (feedback: SmartFeedbackData) => {
    if (flagSharedToChat) return;

    // Visual alignment bar: e.g. 🟩🟩🟩🟩🟩🟩⬜⬜ 75%
    const filledCount = Math.round((feedback.synergyScore / 100) * 8);
    const emptyCount = 8 - filledCount;
    const visualBar = `${'🟩'.repeat(Math.max(0, Math.min(8, filledCount)))}${'⬜'.repeat(Math.max(0, Math.min(8, emptyCount)))}`;

    const lines: string[] = [
      `🚩 RED FLAG OR GREEN FLAG 🟢`,
      `✦ CAMPUS VIBE REPORT ✦`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `${feedback.archetypeTitle}`,
      `${feedback.archetypeBadge}`,
      ``,
      `📊 Vibe Alignment: ${feedback.synergyScore}% (${feedback.matchCount}/${feedback.totalQuestions} Matched)`,
      `${visualBar}`,
    ];

    if (feedback.biggestRedFlagAlliance) {
      lines.push(``);
      lines.push(`🚩 Mutual Dealbreaker:`);
      lines.push(`"${feedback.biggestRedFlagAlliance}"`);
    }

    if (feedback.biggestGreenFlagAlliance) {
      lines.push(``);
      lines.push(`🟢 Shared Green Flag:`);
      lines.push(`"${feedback.biggestGreenFlagAlliance}"`);
    }

    if (feedback.spiciestDebate) {
      lines.push(``);
      lines.push(`⚡ Spiciest Debate:`);
      lines.push(`"${feedback.spiciestDebate.scenario}"`);
      lines.push(`↳ You: ${feedback.spiciestDebate.myChoice} • Partner: ${feedback.spiciestDebate.partnerChoice}`);
    }

    lines.push(``);
    lines.push(`⚖️ Standards Radar: ${feedback.strictnessVerdict}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`💬 Drop your takes in the chat below!`);

    const msg = lines.join('\n');

    const gameData = {
      game_id: 'redgreenflag',
      game_name: 'Red Flag or Green Flag',
      game_emoji: '🚩',
      session_id: `flag_${Date.now()}`,
      status: 'completed' as const,
      scores: {
        [currentUser.id]: feedback.matchCount,
        [partner.id]: feedback.matchCount,
      },
      game_state: feedback,
    };

    try {
      sendMessage(msg, undefined, undefined, gameData);
      setFlagSharedToChat(true);
    } catch (e) {
      console.error(e);
    }
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
                Games &amp; Icebreakers
              </h3>
              <p className="text-[10px] font-bold opacity-85">
                Playing with {partner.username}
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
                <h4 className="text-lg sm:text-xl font-black">Choose a Game to Play Together</h4>
                <p className="text-xs text-[#fffff] font-medium">
                  Both of you will be synced in realtime automatically!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Game Card 1: Red Flag or Green Flag */}
                <button
                  type="button"
                  onClick={() => switchGame('redgreenflag')}
                  className="p-4 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dc341e] to-[#00e599] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                    <Flag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-black">Red Flag or Green Flag?</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-[#ff90e8] text-black border border-black rounded-full">10s Vibe Check</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      10-second rapid dating & campus dilemma vibe check with instant compatibility stats.
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
              VIEW: RED FLAG OR GREEN FLAG (Game Play or Smart Feedback Report)
             ═══════════════════════════════════════════════════════════════════ */}
          {(activeGame === 'redgreenflag' || activeGame === 'wouldyourather') && (() => {
            // If the 7 questions are finished, render the Smart Feedback conclusion screen!
            if (flagIsFinished) {
              const feedback = computeFlagSmartFeedback(flagHistory, currentUser.username, partner.username);

              const FEEDBACK_TABS = [
                { id: 0, label: 'Synergy & Vibe', short: '✨ Synergy', icon: Sparkles },
                { id: 1, label: 'Flag Alliances', short: '🚩 Alliances', icon: Flag },
                { id: 2, label: 'Debates & Radar', short: '⚡ Radar', icon: Flame },
                { id: 3, label: 'Round Breakdown', short: '📋 Full Log', icon: Scale },
              ];

              return (
                <div className="w-full max-w-lg mx-auto space-y-3 py-1 animate-in zoom-in-95 duration-300">
                  {/* Story-style Auto-progress Bars */}
                  <div className="flex items-center gap-1.5 px-1 pt-1">
                    {FEEDBACK_TABS.map((tab) => {
                      const isPast = tab.id < flagFeedbackStep;
                      const isCurrent = tab.id === flagFeedbackStep;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setFlagFeedbackStep(tab.id);
                          }}
                          aria-label={`Jump to ${tab.label}`}
                          className="flex-1 h-1.5 bg-black/15 rounded-full overflow-hidden relative cursor-pointer"
                        >
                          {isPast ? (
                            <div className="w-full h-full bg-black rounded-full" />
                          ) : isCurrent ? (
                            <motion.div
                              key={`progress-${tab.id}-${isAutoPlayingFeedback}`}
                              initial={{ width: '0%' }}
                              animate={{ width: isAutoPlayingFeedback ? '100%' : '100%' }}
                              transition={{
                                duration: isAutoPlayingFeedback ? (tab.id === 0 ? 4.2 : 4.0) : 0,
                                ease: 'linear',
                              }}
                              className="h-full bg-black rounded-full"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Divided Smart Feedback Content with Short Fade-in / Fade-out */}
                  <div className="min-h-[290px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {flagFeedbackStep === 0 && (
                        <motion.div
                          key="feedback-step-0"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="space-y-3"
                        >
                          {/* Top Trophy & Synergy Archetype Card */}
                          <div className="p-5 bg-gradient-to-br from-[#ffc900] via-[#ffe3e8] to-[#00e599]/30 border-3 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">

                            <h3 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-tight">
                              {feedback.archetypeTitle}
                            </h3>

                            <div className="my-3 flex items-center justify-center gap-3">
                              <div className="px-3.5 py-1.5 bg-white border-2 border-black rounded-2xl shadow-xs">
                                <span className="text-2xl sm:text-3xl font-black text-[#dc341e]">
                                  {feedback.matchCount} / {feedback.totalQuestions}
                                </span>
                                <span className="block text-[10px] font-black uppercase text-gray-600">
                                  Matched Flags
                                </span>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-gray-800 leading-relaxed px-2 bg-white/70 p-3 rounded-2xl border border-black/20">
                              {feedback.archetypeDescription}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {flagFeedbackStep === 1 && (
                        <motion.div
                          key="feedback-step-1"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          {/* Mutual Dealbreaker Card */}
                          <div className="p-4 bg-[#ffe3e8] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px]">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-black text-[#dc341e] mb-1.5">
                                <Flag className="w-3.5 h-3.5 fill-[#dc341e]" />
                                <span>Mutual Dealbreaker</span>
                              </div>
                              <p className="text-xs sm:text-sm font-extrabold text-black leading-snug">
                                {feedback.biggestRedFlagAlliance
                                  ? `"${feedback.biggestRedFlagAlliance}"`
                                  : "No mutual red flags — you both kept an open mind!"}
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-gray-600 mt-3 pt-2 border-t border-black/10 block">
                              {feedback.biggestRedFlagAlliance ? "🚩 Both waved Red Flag" : "✨ High tolerance"}
                            </span>
                          </div>

                          {/* Shared Green Flag Card */}
                          <div className="p-4 bg-[#e6fcf5] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px]">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-black text-[#0f5132] mb-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
                                <span>Shared Green Flag</span>
                              </div>
                              <p className="text-xs sm:text-sm font-extrabold text-black leading-snug">
                                {feedback.biggestGreenFlagAlliance
                                  ? `"${feedback.biggestGreenFlagAlliance}"`
                                  : "No mutual green flags — strict standards all around!"}
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-gray-600 mt-3 pt-2 border-t border-black/10 block">
                              {feedback.biggestGreenFlagAlliance ? "🟢 Both waved Green Flag" : "⚡ Tough judges"}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {flagFeedbackStep === 2 && (
                        <motion.div
                          key="feedback-step-2"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="space-y-3"
                        >
                          {/* Spiciest Debate Card */}
                          <div className="p-3.5 bg-[#fff8e6] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-1">
                              <Flame className="w-3.5 h-3.5 text-amber-600" />
                              <span>Spiciest Campus Debate</span>
                            </div>
                            {feedback.spiciestDebate ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-extrabold text-black">
                                  "{feedback.spiciestDebate.scenario}"
                                </p>
                                <div className="flex items-center gap-2 text-[11px] font-black flex-wrap">
                                  <span className="px-2 py-0.5 bg-white border border-black rounded-md">
                                    You: {feedback.spiciestDebate.myChoice}
                                  </span>
                                  <span className="text-gray-400">vs</span>
                                  <span className="px-2 py-0.5 bg-white border border-black rounded-md">
                                    {partner.username}: {feedback.spiciestDebate.partnerChoice}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-extrabold text-black">
                                Flawless harmony! You didn't have any major disagreements.
                              </p>
                            )}
                          </div>

                          {/* Standards Radar Card */}
                          <div className="p-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
                            <div className="flex items-center justify-between text-xs font-black">
                              <div className="flex items-center gap-1.5 text-gray-800">
                                <Scale className="w-3.5 h-3.5 text-[#701a31]" />
                                <span>Standards &amp; Strictness Radar</span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-bold">
                                {feedback.strictnessVerdict}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-black pt-1">
                              <div className="p-2 bg-[#f4f4f0] border border-black rounded-xl text-center">
                                <span className="text-gray-600 block text-[10px]">You</span>
                                <span>{feedback.myRedCount} 🚩 Red • {feedback.totalQuestions - feedback.myRedCount} 🟢 Green</span>
                              </div>
                              <div className="p-2 bg-[#f4f4f0] border border-black rounded-xl text-center">
                                <span className="text-gray-600 block text-[10px]">{partner.username}</span>
                                <span>{feedback.partnerRedCount} 🚩 Red • {feedback.totalQuestions - feedback.partnerRedCount} 🟢 Green</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {flagFeedbackStep === 3 && (
                        <motion.div
                          key="feedback-step-3"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="space-y-2"
                        >
                          {/* Scrollable Questions Breakdown */}
                          {flagHistory.length > 0 ? (
                            <div className="p-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-black">
                                  Full Round Breakdown ({flagHistory.length} Scenarios):
                                </span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-[#00e599]/20 text-[#0f5132] rounded-full border border-black/20">
                                  {feedback.matchCount} Matches
                                </span>
                              </div>
                              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {flagHistory.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded-xl border border-black/30 flex items-center justify-between gap-2 text-[11px] font-bold ${
                                      item.isMatch ? 'bg-emerald-50/60' : 'bg-rose-50/60'
                                    }`}
                                  >
                                    <span className="line-clamp-1 flex-1 text-gray-900">
                                      <strong className="text-black font-black">Q{idx + 1}:</strong> {item.question.scenario}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0 text-[10px] font-black">
                                      <span className={`px-1.5 py-0.5 rounded border border-black/20 ${
                                        item.myChoice === 'RED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        You: {item.myChoice === 'RED' ? '🚩' : '🟢'}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded border border-black/20 ${
                                        item.partnerChoice === 'RED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {item.partnerChoice === 'RED' ? '🚩' : '🟢'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-white border-2 border-black rounded-2xl text-center text-xs font-bold text-gray-600">
                              No history recorded for this round.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Navigation Stepper & Play/Pause Controls */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFlagFeedbackStep((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={flagFeedbackStep === 0}
                      className={`py-2 px-3 rounded-xl border-2 border-black font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer ${
                        flagFeedbackStep === 0
                          ? 'opacity-35 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-300 shadow-none'
                          : 'bg-white hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    {/* Auto-Play / Pause / Replay Controls Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (flagFeedbackStep === 3) {
                          setFlagFeedbackStep(0);
                          setIsAutoPlayingFeedback(true);
                        } else {
                          setIsAutoPlayingFeedback((prev) => !prev);
                        }
                      }}
                      className="py-1.5 px-3 bg-white hover:bg-gray-50 border-2 border-black rounded-xl font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer text-black"
                    >
                      {flagFeedbackStep === 3 ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Replay Story</span>
                        </>
                      ) : isAutoPlayingFeedback ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-black" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>Auto Play</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (flagFeedbackStep < FEEDBACK_TABS.length - 1) {
                          setFlagFeedbackStep((prev) => prev + 1);
                        } else {
                          setFlagFeedbackStep(0);
                          setIsAutoPlayingFeedback(true);
                        }
                      }}
                      className="py-2 px-3 bg-[#ffc900] hover:bg-[#ffb700] text-black rounded-xl border-2 border-black font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      <span>{flagFeedbackStep === FEEDBACK_TABS.length - 1 ? 'Replay' : 'Next'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-black/10">
                    {/* Share to chat button */}
                    <button
                      type="button"
                      onClick={() => handleShareFlagFeedbackToChat(feedback)}
                      disabled={flagSharedToChat}
                      className={`w-full sm:flex-1 py-2.5 px-3.5 rounded-2xl border-2 border-black font-black text-xs flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer ${
                        flagSharedToChat
                          ? 'bg-[#00e599] text-black opacity-90'
                          : 'bg-[#ff90e8] hover:bg-[#ff7be3] text-black'
                      }`}
                    >
                      {flagSharedToChat ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Shared to Chat Room!</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Share Summary to Chat</span>
                        </>
                      )}
                    </button>

                    {/* Play another round */}
                    <button
                      type="button"
                      onClick={handleRestartFlagRound}
                      className="w-full sm:flex-1 py-2.5 px-3.5 bg-[#ffc900] hover:bg-[#ffb700] text-black rounded-2xl border-2 border-black font-black text-xs flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                      <span>Play Another Round</span>
                    </button>

                    {/* Menu button */}
                    <button
                      type="button"
                      onClick={() => switchGame('menu')}
                      className="w-full sm:w-auto py-2.5 px-3.5 bg-white hover:bg-black hover:text-white text-black rounded-2xl border-2 border-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    >
                      <span>Menu</span>
                    </button>
                  </div>
                </div>
              );
            }

            const currentQ = flagQuestions[flagIndex] || RAW_FLAG_QUESTIONS[0];
            const isAnsweredBoth = Boolean(flagMyChoice && flagPartnerChoice);
            const isMatch = flagMyChoice === flagPartnerChoice;
            const synergyPct = flagStats.totalAnswered > 0 ? Math.round((flagStats.matches / flagStats.totalAnswered) * 100) : 0;

            return (
              <div className="w-full max-w-md mx-auto space-y-4">
                {/* Question Tracker & Stats Accumulator */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-white border-2 border-black rounded-2xl shadow-xs text-xs font-black">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#701a31] text-white rounded-md">
                      Q{flagIndex + 1}/{flagQuestions.length}
                    </span>
                    <span className="px-2 py-0.5 bg-[#fff8e6] text-black border border-black/30 rounded-md font-bold text-[10px] uppercase tracking-wide">
                      {currentQ.category}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-black/20 ${
                      currentQ.difficulty === 'spicy'
                        ? 'bg-rose-100 text-rose-800'
                        : currentQ.difficulty === 'campus'
                        ? 'bg-amber-100 text-amber-800'
                        : currentQ.difficulty === 'deep'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentQ.difficulty === 'spicy' ? '🔥 Spicy' : currentQ.difficulty === 'campus' ? '🏫 Campus' : currentQ.difficulty === 'deep' ? '💭 Deep' : '⭐ Classic'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 bg-[#00e599] text-black rounded-md flex items-center gap-1 border border-black shadow-2xs">
                      <span>{synergyPct}% Alignment</span>
                    </span>
                    <span className="text-gray-500 font-bold">({flagStats.matches} matches)</span>
                  </div>
                </div>

                {/* 10-Second Animated Timer Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1 text-[#dc341e]">
                      <Timer className="w-3.5 h-3.5" />
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border border-black ${
                      flagTimerSeconds <= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-[#ffc900] text-black'
                    }`}>
                      {flagTimerSeconds}s
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        flagTimerSeconds <= 3 ? 'bg-red-500' : 'bg-[#00e599]'
                      }`}
                      style={{ width: `${(flagTimerSeconds / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Auto Skip Alert Notice */}
                {flagAutoSkipNotice && (
                  <div className="p-2.5 bg-amber-200 border-2 border-black text-black rounded-xl text-center text-xs font-extrabold animate-bounce">
                    ⏳ 10 seconds expired! Moving to the next scenario...
                  </div>
                )}

                {/* Scenario Presentation Card */}
                <div className="p-5 sm:p-6 bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">
                  <div className="absolute top-2 left-3 text-4xl text-gray-200 select-none font-serif leading-none">“</div>
                  <div className="absolute bottom-1 right-3 text-4xl text-gray-200 select-none font-serif leading-none">”</div>
                  
                  <div className="relative z-10 space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-[#701a31]">
                      Is this a Red Flag or a Green Flag?
                    </p>
                    <p className="text-base sm:text-lg font-black text-black leading-snug px-2">
                      {currentQ.scenario}
                    </p>
                  </div>
                </div>

                {/* Both Answered Reveal Banner */}
                {isAnsweredBoth && (
                  <div className={`p-3 border-2 border-black rounded-2xl text-center shadow-xs animate-in zoom-in-95 duration-200 ${
                    isMatch
                      ? flagMyChoice === 'RED'
                        ? 'bg-[#ffe3e8] text-[#dc341e]'
                        : 'bg-[#e6fcf5] text-[#0f5132]'
                      : 'bg-[#fff8e6] text-black'
                  }`}>
                    {isMatch ? (
                      <div className="space-y-0.5">
                        <div className="font-black text-sm flex items-center justify-center gap-1.5">
                          <span>
                            {flagMyChoice === 'RED'
                              ? 'You BOTH called this a Red Flag! 🚩'
                              : 'You BOTH called this a Green Flag! 🟢'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-black text-sm">
                          hmm.. a little disagreement there.
                        </div>
                        <p className="text-xs font-bold">
                          You chose <span className="font-black">{flagMyChoice === 'RED' ? '🚩 Red Flag' : '🟢 Green Flag'}</span>, while {partner.username} chose <span className="font-black">{flagPartnerChoice === 'RED' ? '🚩 Red Flag' : '🟢 Green Flag'}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Red Flag & Green Flag Choice Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* RED FLAG BUTTON */}
                  <button
                    type="button"
                    disabled={Boolean(flagMyChoice) || flagTimerSeconds === 0}
                    onClick={() => handleFlagPick('RED')}
                    className={`p-4 rounded-2xl border-3 border-black flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group cursor-pointer ${
                      flagMyChoice === 'RED'
                        ? 'bg-[#dc341e] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.03] ring-4 ring-red-400'
                        : 'bg-white text-black hover:bg-[#ffe3e8] hover:border-[#dc341e] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:scale-110 ${
                      flagMyChoice === 'RED' ? 'bg-white text-[#dc341e]' : 'bg-[#dc341e]/15 text-[#dc341e]'
                    }`}>
                      🚩
                    </div>
                    <div className="text-center">
                      <span className="text-sm sm:text-base font-black tracking-tight block">
                        RED FLAG
                      </span>
                    </div>

                    {flagMyChoice === 'RED' && (
                      <span className="text-[10px] font-black bg-white text-black px-2 py-0.5 rounded-full border border-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-[#dc341e]" /> Locked In
                      </span>
                    )}

                    {/* Partner Reveal Badge */}
                    {isAnsweredBoth && flagPartnerChoice === 'RED' && (
                      <div className="w-full mt-1 pt-1.5 border-t border-black/20 text-[10px] font-black text-center flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <span>{partner.username} picked Red Flag</span>
                      </div>
                    )}
                  </button>

                  {/* GREEN FLAG BUTTON */}
                  <button
                    type="button"
                    disabled={Boolean(flagMyChoice) || flagTimerSeconds === 0}
                    onClick={() => handleFlagPick('GREEN')}
                    className={`p-4 rounded-2xl border-3 border-black flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group cursor-pointer ${
                      flagMyChoice === 'GREEN'
                        ? 'bg-[#00e599] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.03] ring-4 ring-emerald-300'
                        : 'bg-white text-black hover:bg-[#e6fcf5] hover:border-[#00e599] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:scale-110 ${
                      flagMyChoice === 'GREEN' ? 'bg-black text-[#00e599]' : 'bg-[#00e599]/20 text-[#0f5132]'
                    }`}>
                      🟢
                    </div>
                    <div className="text-center">
                      <span className="text-sm sm:text-base font-black tracking-tight block">
                        GREEN FLAG
                      </span>
                    </div>

                    {flagMyChoice === 'GREEN' && (
                      <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full border border-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-[#00e599]" /> Locked In
                      </span>
                    )}

                    {/* Partner Reveal Badge */}
                    {isAnsweredBoth && flagPartnerChoice === 'GREEN' && (
                      <div className="w-full mt-1 pt-1.5 border-t border-black/20 text-[10px] font-black text-center flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        <span>{partner.username} picked Green Flag</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Waiting indicator */}
                <div className="text-center text-xs font-bold text-gray-500">
                  {flagMyChoice && !flagPartnerChoice && (
                    <span className="inline-flex items-center gap-1.5 text-[#701a31] font-extrabold animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Vote locked in! Waiting for {partner.username} to vote...
                    </span>
                  )}
                  {!flagMyChoice && (
                    <span>Vote Red or Green before the 10-second timer expires!</span>
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
