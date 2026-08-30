'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../lib/types';
import { useChatStore } from '../lib/store/useChatStore';
import { roomManager } from '../lib/realtime/roomManager';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { filterProfanity } from '../lib/utils/safety';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { ReportModal } from './ReportModal';
import { FeedbackModal } from './FeedbackModal';
import { BlockUserModal } from './BlockUserModal';
import { AnimatedReactionPicker, AnimatedReactionBadge } from './AnimatedReactionPicker';
import { CampusGamesModal, GameType } from './CampusGamesModal';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  Gamepad2,
  ShieldAlert,
  UserX,
  FastForward,
  CornerUpLeft,
  CornerUpRight,
  Copy,
  Check,
  X,
  Loader2,
  Lock,
  WifiOff,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Hourglass,
  Sparkles,
  Palette,
  Flag,
  Flame,
  Scale,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import FloatingLines from './FloatingLines';
import { ThemeModal, getThemeConfig } from './ThemeModal';
import { getAvatarForPseudonym } from '../lib/constants';
import { LoudspeakerLiveBanner } from './LoudspeakerLiveBanner';

const ADMIN_LINES_GRADIENT = ['#ffc900', '#701a31', '#00f2fe', '#e11d48'];

interface SwipeableMessageRowProps {
  msg: ChatMessage;
  isMe: boolean;
  onReply: (msg: ChatMessage) => void;
  children: React.ReactNode;
}

const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  msg,
  isMe,
  onReply,
  children,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasVibratedRef = useRef(false);

  const SWIPE_THRESHOLD = 35;

  const handleStart = (clientX: number, clientY: number) => {
    touchStartRef.current = { x: clientX, y: clientY };
    isHorizontalSwipeRef.current = null;
    hasVibratedRef.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!touchStartRef.current) return;

    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.3;
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Partner text (isMe=false): Swipe Left to Right (deltaX > 0)
      // Own text (isMe=true): Swipe Right to Left (deltaX < 0)
      const directionalDelta = isMe ? -deltaX : deltaX;

      if (directionalDelta > 0) {
        const clampedOffset = Math.min(directionalDelta, 75);
        const elasticOffset =
          clampedOffset > SWIPE_THRESHOLD
            ? SWIPE_THRESHOLD + (clampedOffset - SWIPE_THRESHOLD) * 0.35
            : clampedOffset;

        setDragOffset(elasticOffset);
        setIsSwiping(true);

        if (elasticOffset >= SWIPE_THRESHOLD && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate(25);
          }
        }
      } else {
        setDragOffset(0);
      }
    }
  };

  const handleEnd = () => {
    if (dragOffset >= SWIPE_THRESHOLD) {
      onReply(msg);
    }

    setDragOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    isHorizontalSwipeRef.current = null;
    hasVibratedRef.current = false;
  };

  const progress = Math.min(1, dragOffset / SWIPE_THRESHOLD);
  const isTriggered = dragOffset >= SWIPE_THRESHOLD;
  const translateXVal = isMe ? -dragOffset : dragOffset;

  return (
    <div className="relative w-full overflow-visible touch-pan-y select-none">
      {/* Swipe Reply Icon Indicator */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all pointer-events-none z-0 ${
          isMe ? 'right-2' : 'left-2'
        }`}
        style={{
          opacity: progress,
          transform: `translateY(-50%) scale(${0.4 + progress * 0.6}) rotate(${
            isMe ? (1 - progress) * -20 : (1 - progress) * 20
          }deg)`,
        }}
      >
        <div
          className={`p-2 rounded-full border-2 border-black transition-all ${
            isTriggered
              ? 'bg-[#ffc900] text-black shadow-md scale-110'
              : 'bg-white text-black shadow-2xs'
          }`}
        >
          {isMe ? (
            <CornerUpLeft className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <CornerUpRight className="w-4 h-4 stroke-[2.5]" />
          )}
        </div>
      </div>

      {/* Sliding Message Bubble Container */}
      <div
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (touchStartRef.current) {
            handleMove(e.clientX, e.clientY);
          }
        }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        className="relative z-10 select-none touch-pan-y"
        style={{
          transform: `translateX(${translateXVal}px)`,
          transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const EMOJI_PRESETS = ['😊', '😂', '😭', '👍', '🔥', '❤️', '😮', '☕', '📚', '🎉', '👋'];

export const ChatRoom: React.FC = () => {
  const {
    currentUser,
    activeRoom,
    messages,
    partnerTyping,
    partnerLeft,
    partnerLeftReason,
    sendMessage,
    updateGameInviteStatus,
    setActionToast,
    toggleReaction,
    sendTypingSignal,
    nextMatch,
    leaveRoom,
    blockPartner,
    systemAnnouncement,
    dismissAnnouncement,
    setShowFeedbackModal,
    keptConnection,
    pendingIncomingRequests,
    pendingOutgoingConnection,
    sendFriendRequest,
    keepPartner,
    acceptPendingRequest,
    declinePendingRequest,
    setViewState,
    themeMode,
    toggleThemeMode,
  } = useChatStore();

  const partner = activeRoom && currentUser
    ? (activeRoom.user_one.id === currentUser.id ? activeRoom.user_two : activeRoom.user_one)
    : null;

  const [text, setText] = useState('');

  // Dark Mode State derived from binary themeMode (1 = dark, 0 = light)
  const isDarkMode = themeMode === 1;

  // Chat Color Theme State (defaults to 'maroon' as CapiTalk brand identity)
  const [chatTheme, setChatTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('capitalk_chat_theme_name');
      if (saved) return saved;
    }
    return 'maroon';
  });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const activeThemeConfig = getThemeConfig(chatTheme);

  // Alive Status State: 'online' | 'idle' | 'offline'
  const [partnerStatus, setPartnerStatus] = useState<'online' | 'idle' | 'offline'>('online');
  const myStatusRef = useRef<'online' | 'idle' | 'offline'>('online');
  const myIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPartnerHeartbeatRef = useRef<number>(Date.now());
  const hiddenTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to realtime theme & status sync signals from partner
  useEffect(() => {
    const unsubTheme = roomManager.onThemeChange((newTheme) => {
      setChatTheme(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('capitalk_chat_theme_name', newTheme);
      }
    });

    const unsubStatus = roomManager.onStatusChange((newStatus) => {
      lastPartnerHeartbeatRef.current = Date.now();
      setPartnerStatus(newStatus);
    });

    const unsubGame = roomManager.onGameSignal((data) => {
      if (!data) return;
      if (data.action === 'GAME_INVITE_ACCEPT') {
        if (data.sessionId) {
          updateGameInviteStatus(data.sessionId, 'accepted');
        }
        if (data.game) {
          setTargetGame(data.game);
          setShowGamesModal(true);
        }
      } else if (data.action === 'GAME_INVITE_DECLINE') {
        if (data.sessionId) {
          updateGameInviteStatus(data.sessionId, 'declined');
        }
      } else if (data.action === 'GAME_UNPARTICIPATE') {
        setShowGamesModal(false);
        setTargetGame('menu');
        setActionToast({
          type: 'announcement',
          message: `🎮 ${data.username || partner?.username || 'Partner'} left the game.`,
        });
      } else if (data.action === 'AUTO_RESET_AND_CLOSE') {
        setShowGamesModal(false);
        setTargetGame('menu');
      }
    });

    const unsubFriendAdd = roomManager.onFriendAdd((partnerProfile) => {
      if (partnerProfile) {
        keepPartner(partnerProfile, true);
      }
    });

    return () => {
      unsubTheme();
      unsubStatus();
      unsubGame();
      unsubFriendAdd();
    };
  }, [partner?.username, updateGameInviteStatus, setActionToast, keepPartner]);

  // Broadcast own presence status ('online' | 'idle' | 'offline') and detect inactivity
  const broadcastMyStatus = React.useCallback((status: 'online' | 'idle' | 'offline') => {
    myStatusRef.current = status;
    roomManager.sendStatusSignal(status);
  }, []);

  useEffect(() => {
    if (partnerLeft) {
      setPartnerStatus('offline');
      return;
    }

    const isBotPartner = Boolean(
      partner?.id?.startsWith('bot_') ||
      activeRoom?.id?.startsWith('bot_')
    );

    if (isBotPartner) {
      setPartnerStatus('online');
    }

    // Immediately announce presence as online upon joining room
    myStatusRef.current = 'online';
    lastPartnerHeartbeatRef.current = Date.now();
    roomManager.sendStatusSignal('online');

    // Periodic heartbeat to keep presence alive every 4s
    const heartbeatInterval = setInterval(() => {
      if (!partnerLeft) {
        roomManager.sendStatusSignal(myStatusRef.current);
      }
    }, 4000);

    // Watchdog: If real partner has not sent any signal for > 15s, consider them offline
    const watchdogInterval = setInterval(() => {
      if (!partnerLeft && !isBotPartner) {
        const timeSinceLastHeartbeat = Date.now() - lastPartnerHeartbeatRef.current;
        if (timeSinceLastHeartbeat > 15000 && partnerStatus !== 'offline') {
          setPartnerStatus('offline');
        }
      }
    }, 2500);

    const resetIdleTimer = () => {
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
      if (document.visibilityState === 'visible') {
        broadcastMyStatus('online');
      }
      if (myIdleTimerRef.current) clearTimeout(myIdleTimerRef.current);
      myIdleTimerRef.current = setTimeout(() => {
        broadcastMyStatus('idle');
      }, 25000); // 25s without interaction -> IDLE
    };

    resetIdleTimer();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Debounce slightly to allow beforeunload/pagehide to take precedence if tab is closing
        hiddenTimerRef.current = setTimeout(() => {
          if (document.hidden) {
            broadcastMyStatus('idle');
          }
        }, 1200);
      } else {
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
        resetIdleTimer();
      }
    };

    const handleWindowFocus = () => {
      resetIdleTimer();
    };

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    const handleUnload = () => {
      broadcastMyStatus('offline');
      roomManager.sendSkipSignal('disconnected');
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity, true);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(watchdogInterval);
      if (myIdleTimerRef.current) clearTimeout(myIdleTimerRef.current);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity, true);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      roomManager.sendStatusSignal('offline');
    };
  }, [partnerLeft, partnerStatus, broadcastMyStatus]);

  // When partner is typing or sends a message, ensure their status is marked as online
  useEffect(() => {
    if (partnerTyping && !partnerLeft) {
      lastPartnerHeartbeatRef.current = Date.now();
      setPartnerStatus('online');
    }
  }, [partnerTyping, partnerLeft]);

  useEffect(() => {
    if (messages.length > 0 && !partnerLeft) {
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg &&
        currentUser &&
        lastMsg.sender_id !== currentUser.id &&
        lastMsg.sender_id !== 'system' &&
        lastMsg.sender_id !== 'system_announcement'
      ) {
        lastPartnerHeartbeatRef.current = Date.now();
        setPartnerStatus('online');
      }
    }
  }, [messages, partnerLeft, currentUser]);

  // Play skip sound effect when partner leaves/skips
  const prevPartnerLeftRef = useRef(false);
  useEffect(() => {
    if (partnerLeft && !prevPartnerLeftRef.current) {
      if (typeof window !== 'undefined') {
        try {
          const audio = new Audio('/audio/skip_sfx.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    }
    prevPartnerLeftRef.current = partnerLeft;
  }, [partnerLeft]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Butter-smooth auto-resize without layout shifts
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const targetH = Math.min(el.scrollHeight, 130);
      el.style.height = `${Math.max(40, targetH)}px`;
    }

    if (val.trim()) {
      sendTypingSignal(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingSignal(false);
      }, 1500);
    } else {
      sendTypingSignal(false);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => {
      const next = prev + emoji;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          const targetH = Math.min(textareaRef.current.scrollHeight, 130);
          textareaRef.current.style.height = `${Math.max(40, targetH)}px`;
          textareaRef.current.focus();
        }
      }, 0);
      return next;
    });
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [targetGame, setTargetGame] = useState<GameType>('menu');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const handleOpenGames = () => {
    setTargetGame('menu');
    setShowGamesModal(true);
  };

  const handleAcceptGameInvite = (msg: ChatMessage) => {
    if (!msg.game_data) return;
    const game = (msg.game_data.game_id || 'menu') as GameType;
    const sessionId = msg.game_data.session_id;

    updateGameInviteStatus(sessionId, 'accepted');

    roomManager.sendGameSignal({
      action: 'GAME_INVITE_ACCEPT',
      game,
      sessionId,
    });

    setTargetGame(game);
    setShowGamesModal(true);
  };

  const handleDeclineGameInvite = (msg: ChatMessage) => {
    if (!msg.game_data) return;
    const sessionId = msg.game_data.session_id;

    updateGameInviteStatus(sessionId, 'declined');

    roomManager.sendGameSignal({
      action: 'GAME_INVITE_DECLINE',
      game: msg.game_data.game_id,
      sessionId,
    });
  };

  const handleReopenGame = (game: GameType) => {
    setTargetGame(game);
    setShowGamesModal(true);
  };
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);
  const [confirmNext, setConfirmNext] = useState(false);
  const confirmNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNextClick = () => {
    if (!confirmNext) {
      setConfirmNext(true);
      // Auto-reset after 3 seconds if not confirmed
      if (confirmNextTimerRef.current) clearTimeout(confirmNextTimerRef.current);
      confirmNextTimerRef.current = setTimeout(() => setConfirmNext(false), 3000);
    } else {
      if (confirmNextTimerRef.current) clearTimeout(confirmNextTimerRef.current);
      setConfirmNext(false);
      nextMatch();
    }
  };

  const [confirmExit, setConfirmExit] = useState(false);
  const confirmExitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleExitClick = () => {
    if (!confirmExit) {
      setConfirmExit(true);
      // Auto-reset after 3 seconds if not confirmed
      if (confirmExitTimerRef.current) clearTimeout(confirmExitTimerRef.current);
      confirmExitTimerRef.current = setTimeout(() => setConfirmExit(false), 3000);
    } else {
      if (confirmExitTimerRef.current) clearTimeout(confirmExitTimerRef.current);
      setConfirmExit(false);
      leaveRoom();
    }
  };

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleBubbleTouchStart = (msgId: string, e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = setTimeout(() => {
      setActivePickerMsgId(msgId);
      touchStartPosRef.current = null;
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(40);
      }
    }, 420);
  };

  const handleBubbleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long press immediately if finger moves more than 4px (e.g. scrolling, backreading)
    if (dx > 4 || dy > 4) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartPosRef.current = null;
    }
  };

  const handleBubbleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Image Preview state
  const [pendingImage, setPendingImage] = useState<{ previewUrl: string } | null>(null);

  // 20s Inactivity Timeout Alert state
  const [showInactivityAlert, setShowInactivityAlert] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(10);
  const lastActivityRef = useRef<number>(Date.now());



  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const resetInactivity = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityAlert(false);
  }, []);

  // Monitor 60 seconds of user inactivity
  useEffect(() => {
    if (partnerLeft) return;

    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= 60000 && !showInactivityAlert) {
        setShowInactivityAlert(true);
        setInactivityCountdown(10);
      }
    }, 1000);

    const handleUserInteraction = () => {
      if (!showInactivityAlert) {
        lastActivityRef.current = Date.now();
      }
    };

    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [partnerLeft, showInactivityAlert]);

  // 10-second countdown for inactivity alert modal before leaving room
  useEffect(() => {
    if (!showInactivityAlert) return;

    const timer = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            roomManager.sendSkipSignal('inactivity');
            leaveRoom();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showInactivityAlert, leaveRoom]);

  const prevTypingRef = useRef(partnerTyping);
  useEffect(() => {
    // Track typing state changes only — no auto-scroll so users can freely browse history
    prevTypingRef.current = partnerTyping;
  }, [messages, partnerTyping]);

  if (!activeRoom || !currentUser || !partner) {
    return (
      <div className="text-center py-16">
        <p className="text-[#242423]">No active chat room found.</p>
        <button onClick={leaveRoom} className="mt-4 btn-gumroad-primary">
          Back
        </button>
      </div>
    );
  }

  // Premium background & dark mode UI for BOTH participants whenever an Admin or bot_admin is in the room
  const isAdminRoom = Boolean(
    currentUser?.is_admin === true ||
    partner.is_admin === true ||
    partner.id === 'bot_admin'
  );

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !replyTo && !pendingImage) return;

    const cleanText = text.trim() ? filterProfanity(text).cleanText : '';

    sendMessage(
      cleanText || undefined,
      pendingImage ? pendingImage.previewUrl : undefined,
      replyTo ? { id: replyTo.id, sender_username: replyTo.sender_username, message: replyTo.message } : undefined
    );

    setText('');
    setPendingImage(null);
    setReplyTo(null);
    setShowEmojiPicker(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const processed = await processUploadedImage(file);
      setPendingImage({ previewUrl: processed.fullDataUrl });
      // Focus textarea so user can immediately type a caption if desired
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyMessageText = (msgId: string, content?: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden overscroll-none touch-pan-y relative ${
      isAdminRoom ? 'bg-slate-950 text-white' : ''
    }`}>
      {/* Full-Screen Floating Lines WebGL Background for Admin Chat */}
      {isAdminRoom && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-90 overflow-hidden">
          <FloatingLines
            linesGradient={ADMIN_LINES_GRADIENT}
            animationSpeed={1}
            interactive={true}
            parallax={true}
            mixBlendMode="normal"
          />
        </div>
      )}

      {/* Transparent Dim Backdrop Overlay across whole chatroom when reacting */}
      {activePickerMsgId && (
        <div
          onClick={() => setActivePickerMsgId(null)}
          className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 cursor-pointer animate-in fade-in"
          title="Click anywhere to close reaction picker"
        />
      )}

      {/* Top Header Bar */}
      <div
        style={{
          backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerBg,
          color: isAdminRoom ? undefined : activeThemeConfig.headerText,
          borderColor: isAdminRoom ? undefined : activeThemeConfig.headerBorder,
        }}
        className={`px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-20 transition-all duration-300 border-b ${
          isAdminRoom ? 'bg-slate-950/80 border-slate-800/80 text-white' : ''
        } ${activePickerMsgId ? 'pointer-events-none' : ''}`}
      >
        {/* Partner Info */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={partner.avatar_url || getAvatarForPseudonym(partner.username)}
              alt={partner.username}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f4f4f0] border-2 transition-all duration-500 ${
                partnerLeft ? 'border-red-400 opacity-50 grayscale' : isDarkMode ? 'border-[#3f3f46]' : 'border-black'
              }`}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none">
              <h3
                style={{ color: isAdminRoom ? undefined : activeThemeConfig.headerText }}
                className={`font-extrabold text-sm sm:text-base leading-tight transition-colors duration-300 ${
                  partnerLeft ? 'line-through opacity-70' : ''
                }`}
              >
                {partner.username}
              </h3>
              {(partner.is_admin || partner.id === 'bot_admin') && (
                <span className="px-2 py-0.5 bg-[#701a31] text-[#ffc900] border border-black text-[11px] font-black rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-1">
                  Admin
                </span>
              )}
            </div>

            {/* Alive Status & Department Line directly under profile name */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Alive Status Pill */}
              <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border transition-all duration-300 ${
                (partnerLeft || partnerStatus === 'offline')
                  ? isDarkMode
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                  : partnerStatus === 'idle'
                  ? isDarkMode
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                  : isDarkMode
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  (partnerLeft || partnerStatus === 'offline')
                    ? 'bg-zinc-400'
                    : partnerStatus === 'idle'
                    ? 'bg-amber-400'
                    : 'bg-emerald-500 animate-pulse'
                }`} />
                {(partnerLeft || partnerStatus === 'offline') ? 'OFFLINE' : partnerStatus === 'idle' ? 'IDLE' : 'ONLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Theme Modal, Report, Block, Exit, Next */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Chooser Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            style={{
              backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
              color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
              borderColor: isAdminRoom ? undefined : activeThemeConfig.id === 'yellow' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            }}
            className="p-1.5 sm:p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-2xs"
            title="Choose Chat Theme"
          >
            <div className="relative flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black/40 shadow-xs"
                style={{ backgroundColor: activeThemeConfig.dotColor }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            style={{
              backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
              color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
              borderColor: isAdminRoom ? undefined : activeThemeConfig.id === 'yellow' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            }}
            className="p-1.5 sm:p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 shadow-2xs"
            title="Report User"
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowBlockModal(true)}
            style={{
              backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
              color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
              borderColor: isAdminRoom ? undefined : activeThemeConfig.id === 'yellow' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            }}
            className="p-1.5 sm:p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 shadow-2xs"
            title="Block User"
          >
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={handleExitClick}
            style={{
              backgroundColor: confirmExit
                ? '#dc2626'
                : isAdminRoom
                ? undefined
                : activeThemeConfig.headerButtonBg,
              color: confirmExit
                ? '#ffffff'
                : isAdminRoom
                ? undefined
                : activeThemeConfig.headerButtonText,
              borderColor: confirmExit
                ? '#b91c1c'
                : isAdminRoom
                ? undefined
                : activeThemeConfig.id === 'yellow' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            }}
            className={`p-1.5 sm:p-2 rounded-lg border flex items-center gap-1 transition-all shadow-2xs ${
              confirmExit ? 'font-bold scale-105 animate-pulse' : 'hover:scale-105 active:scale-95'
            }`}
            title={confirmExit ? 'Click again to confirm exit' : 'Exit Chat'}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className={`text-xs font-semibold ${confirmExit ? 'inline' : 'hidden md:inline'}`}>
              {confirmExit ? 'Sure?' : 'Exit'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleNextClick}
            className={`text-xs py-1.5 px-2 sm:px-4 flex items-center gap-1.5 rounded font-bold border-2 transition-all duration-200 active:scale-95 ${
              confirmNext
                ? 'bg-red-600 border-red-700 text-white shadow-[3px_3px_0px_0px_rgba(185,28,28,1)] hover:bg-red-700 animate-pulse'
                : 'btn-gumroad-primary'
            }`}
            title={confirmNext ? 'Click again to skip to next chat' : 'Skip to next chat'}
          >
            <FastForward className={`w-3.5 h-3.5 shrink-0 ${confirmNext ? 'text-white' : 'text-amber-300'}`} />
            <span className={confirmNext ? 'inline' : 'hidden sm:inline'}>
              {confirmNext ? 'Sure?' : 'Next Chat'}
            </span>
          </button>
        </div>
      </div>

      {/* Campus Loudspeaker Banner (shows Book prompt by default, switches to Live broadcast when on air) */}
      <LoudspeakerLiveBanner inChatRoomOnly={true} />

      {/* Message Feed Area — flex-1 min-h-0 fills remaining space and scrolls internally */}
      <div
        onClick={() => activePickerMsgId && setActivePickerMsgId(null)}
        style={{
          backgroundColor: isAdminRoom ? undefined : activeThemeConfig.chatFeedBg || '#fbf9f5',
        }}
        className={`relative z-30 flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 overscroll-contain transition-colors duration-300 ${
          isAdminRoom ? 'bg-transparent text-white' : ''
        }`}
      >
        <div className="space-y-3 sm:space-y-4">
          {messages.map((msg) => {
          if (msg.reaction_update || msg.sender_id === 'system_loudspeaker' || msg.id.startsWith('msg_ls_') || (!msg.message?.trim() && !msg.image_url && !msg.game_data && !msg.id.startsWith('msg_ann_') && msg.sender_id !== 'system')) {
            return null;
          }

          const isSystem = msg.sender_id === 'system';
          const isMe = msg.sender_id === currentUser.id;

          if (isSystem || msg.sender_id === 'system_announcement' || msg.id.startsWith('msg_ann_')) {
            if (msg.message?.includes('Profanity Warning')) {
              return (
                <div key={msg.id} className={`my-3 p-3.5 border-2 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-200 ${
                  isDarkMode ? 'bg-red-950/40 border-red-700 text-white' : 'bg-[#dc341e]/10 border-[#dc341e] text-black'
                } ${activePickerMsgId ? 'filter blur-[3px] opacity-30 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#dc341e] text-white text-[10px] font-extrabold rounded uppercase tracking-wider">
                      ⚠️ Profanity Warning
                    </span>
                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm font-extrabold leading-relaxed ${isDarkMode ? 'text-red-300' : 'text-[#dc341e]'}`}>{msg.message}</p>
                </div>
              );
            }

            if (msg.message?.includes('Account Suspended')) {
              return (
                <div key={msg.id} className={`my-3 p-4 bg-red-600 text-white border-2 border-black rounded-2xl shadow-lg animate-in fade-in duration-300 ${
                  activePickerMsgId ? 'filter blur-[3px] opacity-30 pointer-events-none' : ''
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] font-extrabold rounded uppercase tracking-wider">
                      ⛔ Account Banned
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold leading-relaxed">{msg.message}</p>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`text-center my-4 ${activePickerMsgId ? 'filter blur-[3px] opacity-30 pointer-events-none' : ''}`}>
                <span className={`inline-block border text-xs font-semibold px-4 py-1.5 rounded-full ${
                  isDarkMode ? 'bg-[#27272a] border-[#3f3f46] text-zinc-200' : 'bg-white border-[#d1d5dc] text-black'
                }`}>
                  {msg.message}
                </span>
              </div>
            );
          }

          const isActivePicker = activePickerMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-all duration-200 ${
                isActivePicker
                  ? 'relative z-50 filter-none opacity-100 scale-[1.02]'
                  : activePickerMsgId
                  ? 'filter blur-[3px] opacity-30 pointer-events-none'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold ${isDarkMode ? 'text-zinc-300' : 'text-[#242423]'}`}>
                  {isMe ? 'You' : msg.sender_username}
                </span>
                <span className={`text-[10px] ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Reply Reference Bubble */}
              {msg.reply_to && (
                <div className={`mb-1 p-2 border-l-2 rounded text-xs ${
                  isDarkMode ? 'bg-[#27272a] border-[#ffc900] text-zinc-200' : 'bg-white/70 border-black text-[#242423]'
                }`}>
                  <span className="font-bold">{msg.reply_to.sender_username}:</span> {msg.reply_to.message}
                </div>
              )}

              {/* iOS-style Floating Reaction Picker — 100% EXCLUDED FROM BLUR, ELEVATED (z-50) */}
              {isActivePicker && (
                <div className="mb-2 relative z-50 filter-none opacity-100 animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-200 drop-shadow-2xl">
                  <AnimatedReactionPicker
                    onSelectReaction={(key) => {
                      toggleReaction(msg.id, key);
                      setActivePickerMsgId(null);
                    }}
                    onClose={() => setActivePickerMsgId(null)}
                  />
                </div>
              )}

              {/* Swipe-to-Reply Interactive Message Container */}
              <SwipeableMessageRow
                msg={msg}
                isMe={isMe}
                onReply={(m) => setReplyTo(m)}
              >
                <div className={`flex items-center gap-1.5 w-fit max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse ml-auto' : 'flex-row mr-auto'}`}>
                  {/* Main Message Content — Long Press specifically on bubble */}
                  <div
                    onTouchStart={(e) => handleBubbleTouchStart(msg.id, e)}
                    onTouchMove={handleBubbleTouchMove}
                    onTouchEnd={handleBubbleTouchEnd}
                    onTouchCancel={handleBubbleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setActivePickerMsgId(msg.id);
                    }}
                    style={
                      isMe && !msg.is_profane && !msg.game_data
                        ? {
                            backgroundColor: activeThemeConfig.bubbleBg,
                            color: activeThemeConfig.bubbleText,
                            borderColor: isDarkMode ? '#3f3f46' : activeThemeConfig.bubbleBorder || '#000000',
                          }
                        : undefined
                    }
                    className={`p-3 sm:p-3.5 rounded-[16px] border text-sm relative cursor-pointer w-fit max-w-full min-w-0 ${
                      isActivePicker ? 'filter-none opacity-100 shadow-2xl ring-2 ring-black/20' : ''
                    } ${
                      msg.game_data
                        ? isDarkMode
                          ? 'bg-[#1c1c20]/95 text-zinc-100 border-zinc-700 shadow-md'
                          : 'bg-white/95 text-zinc-900 border-zinc-300 shadow-md'
                        : isMe
                        ? msg.is_profane
                          ? 'bg-red-950 text-white border-red-600 rounded-tr-none'
                          : 'rounded-tr-none font-bold shadow-xs'
                        : msg.is_profane
                        ? isDarkMode
                          ? 'bg-red-950/80 text-white border-red-700 rounded-tl-none'
                          : 'bg-red-50 text-black border-red-400 rounded-tl-none'
                        : isDarkMode
                        ? 'bg-[#27272a] text-zinc-100 border-[#3f3f46] rounded-tl-none shadow-xs'
                        : 'bg-white text-black border-[#d1d5dc] rounded-tl-none'
                    }`}
                  >
                    {msg.game_data?.game_id === 'redgreenflag' && msg.game_data.game_state ? (() => {
                      const st = msg.game_data.game_state;
                      return (
                        <div className="space-y-3 my-0.5 w-full max-w-[340px] sm:max-w-[380px] select-text">
                          {/* Mini Header Card */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/10 dark:border-white/10">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#701a31] via-[#dc341e] to-rose-400 text-white flex items-center justify-center text-sm shadow-sm font-black shrink-0">
                                🚩
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-xs font-black tracking-tight leading-tight ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  Campus Vibe Report
                                </h4>
                                <span className={`text-[10px] font-semibold block leading-tight ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                  Red Flag or Green Flag?
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-[11px] rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-2xs shrink-0">
                              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              {st.synergyScore}% Match
                            </span>
                          </div>

                          {/* Archetype Hero Spotlight */}
                          <div className={`p-3 rounded-2xl border text-center space-y-1.5 shadow-2xs relative overflow-hidden ${
                            isDarkMode 
                              ? 'bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-emerald-500/10 border-amber-500/30 text-white' 
                              : 'bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 border-amber-300/80 text-zinc-900'
                          }`}>
                            <div className="text-sm sm:text-base font-black tracking-tight flex items-center justify-center gap-1.5">
                              {st.archetypeTitle}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                                isDarkMode ? 'bg-zinc-800/90 text-zinc-200 border-zinc-700' : 'bg-white/90 text-zinc-800 border-zinc-300'
                              }`}>
                                {st.archetypeBadge}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isDarkMode ? 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                              }`}>
                                {st.matchCount}/{st.totalQuestions} Questions Matched
                              </span>
                            </div>

                            {/* Mini Alignment Track Bar */}
                            <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden mt-2 p-0.5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400 transition-all duration-700"
                                style={{ width: `${Math.max(5, Math.min(100, st.synergyScore))}%` }}
                              />
                            </div>
                          </div>

                          {/* Insights Grid */}
                          <div className="space-y-2 text-xs">
                            {/* Mutual Dealbreaker */}
                            {st.biggestRedFlagAlliance && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-red-950/40 border-red-800/60 text-red-100' : 'bg-rose-50 border-rose-200 text-rose-950'
                              }`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1 uppercase tracking-wide">
                                    🚩 Mutual Dealbreaker
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-200/50 dark:bg-rose-900/50 rounded text-rose-800 dark:text-rose-300">
                                    Both Voted Red
                                  </span>
                                </div>
                                <p className={`font-extrabold text-[11px] leading-snug ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  "{st.biggestRedFlagAlliance}"
                                </p>
                              </div>
                            )}

                            {/* Shared Green Flag */}
                            {st.biggestGreenFlagAlliance && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              }`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wide">
                                    🟢 Shared Green Flag
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-200/50 dark:bg-emerald-900/50 rounded text-emerald-800 dark:text-emerald-300">
                                    Both Voted Green
                                  </span>
                                </div>
                                <p className={`font-extrabold text-[11px] leading-snug ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  "{st.biggestGreenFlagAlliance}"
                                </p>
                              </div>
                            )}

                            {/* Spiciest Debate */}
                            {st.spiciestDebate && (
                              <div className={`p-2.5 rounded-xl border ${
                                isDarkMode ? 'bg-amber-950/40 border-amber-800/60 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-950'
                              }`}>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wide">
                                    ⚡ Spiciest Debate
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200/50 dark:bg-amber-900/50 rounded text-amber-800 dark:text-amber-300">
                                    Split Verdict
                                  </span>
                                </div>
                                <p className={`font-extrabold text-[11px] leading-snug mb-1.5 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  "{st.spiciestDebate.scenario}"
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                                  <span className={`px-2 py-0.5 rounded-md border ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300 shadow-2xs'
                                  }`}>
                                    You: {st.spiciestDebate.myChoice}
                                  </span>
                                  <span className="text-zinc-400">vs</span>
                                  <span className={`px-2 py-0.5 rounded-md border ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300 shadow-2xs'
                                  }`}>
                                    Partner: {st.spiciestDebate.partnerChoice}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Standards Radar */}
                            <div className={`p-2 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${
                              isDarkMode ? 'bg-zinc-800/70 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                            }`}>
                              <Scale className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                              <span className="leading-tight">{st.strictnessVerdict}</span>
                            </div>
                          </div>

                          {/* Footer Prompt */}
                          <div className="pt-1 text-center border-t border-black/10 dark:border-white/10">
                            <span className={`text-[10px] font-extrabold inline-flex items-center gap-1 ${
                              isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                            }`}>
                              💬 Drop your takes in the chat!
                            </span>
                          </div>
                        </div>
                      );
                    })() : msg.game_data ? (() => {
                      const gd = msg.game_data;
                      const isInviter = isMe;
                      const isPending = gd.status === 'invited';
                      const isAccepted = gd.status === 'accepted';
                      const isDeclined = gd.status === 'declined';
                      const isCompleted = gd.status === 'completed';

                      return (
                        <div className="space-y-2.5 my-0.5 w-full max-w-[310px] sm:max-w-[340px] select-text">
                          {/* Mini Header Card */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-[#ffc900] text-black border-2 border-black flex items-center justify-center text-base shadow-xs font-black shrink-0">
                                {gd.game_emoji || '🎮'}
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-xs font-black tracking-tight leading-tight ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                  {gd.game_name || 'Campus Mini-Game'}
                                </h4>
                                <span className={`text-[10px] font-bold block leading-tight ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                  {isCompleted
                                    ? 'Match Finished'
                                    : isInviter
                                    ? 'Game Invitation Sent'
                                    : `${msg.sender_username} invited you`}
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            {isPending && (
                              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-600 dark:text-amber-300 font-extrabold text-[10px] rounded-full border border-amber-400/40 shrink-0">
                                ⏳ Pending
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-extrabold text-[10px] rounded-full border border-emerald-500/40 shrink-0">
                                🎮 Playing
                              </span>
                            )}
                            {isDeclined && (
                              <span className="px-2 py-0.5 bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 font-extrabold text-[10px] rounded-full border border-zinc-500/40 shrink-0">
                                ✕ Declined
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 bg-[#00e599]/20 text-[#0f5132] dark:text-[#00e599] font-black text-[10px] rounded-full border border-[#00e599]/40 shrink-0">
                                🏁 Result
                              </span>
                            )}
                          </div>

                          {/* Completed Game Feedback Banner */}
                          {isCompleted && (
                            <div className="space-y-2.5">
                              <div className={`p-3 rounded-2xl border-2 border-black text-center space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                                gd.winner_id === 'draw'
                                  ? 'bg-[#ffc900] text-black'
                                  : gd.winner_id === currentUser.id
                                  ? 'bg-[#00e599] text-black'
                                  : 'bg-[#ff90e8] text-black'
                              }`}>
                                <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black tracking-tight text-black">
                                  {gd.winner_id === 'draw' ? (
                                    <span>🤝 Match Ended in a Draw!</span>
                                  ) : gd.winner_id === currentUser.id ? (
                                    <span>🏆 Victory! You Won!</span>
                                  ) : (
                                    <span>🎉 {gd.game_state?.winnerName || partner.username} Won!</span>
                                  )}
                                </div>

                                {/* Connect 4 Match Result Breakdown */}
                                {gd.game_id === 'connect4' && gd.game_state?.scores && (
                                  <div className="p-2 bg-white/95 rounded-xl border border-black text-[11px] font-black flex items-center justify-around gap-2 text-black shadow-2xs">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full bg-[#dc341e] border border-black" />
                                      {gd.game_state.p1Name}: {gd.game_state.scores.p1}
                                    </span>
                                    <span className="text-black/30 font-bold">•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffc900] border border-black" />
                                      {gd.game_state.p2Name}: {gd.game_state.scores.p2}
                                    </span>
                                  </div>
                                )}

                                {/* Tic-Tac-Toe Match Result Breakdown */}
                                {gd.game_id === 'tictactoe' && gd.game_state?.scores && (
                                  <div className="p-2 bg-white/95 rounded-xl border border-black text-[11px] font-black flex items-center justify-around gap-2 text-black shadow-2xs">
                                    <span className="flex items-center gap-1 text-[#701a31]">
                                      ✕ {gd.game_state.p1Name}: {gd.game_state.scores.p1}
                                    </span>
                                    <span className="text-black/30 font-bold">•</span>
                                    <span className="flex items-center gap-1 text-[#dc341e]">
                                      ◯ {gd.game_state.p2Name}: {gd.game_state.scores.p2}
                                    </span>
                                  </div>
                                )}

                                {/* Rock Paper Scissors Series Breakdown */}
                                {gd.game_id === 'rockpaperscissors' && (
                                  <div className="p-2 bg-white/95 rounded-xl border border-black text-[11px] font-black flex items-center justify-around gap-2 text-black shadow-2xs">
                                    <span className="flex items-center gap-1">
                                      ✌️ {gd.game_state?.p1Name || currentUser.username}: {gd.game_state?.scores?.me ?? 3}
                                    </span>
                                    <span className="text-black/30 font-bold">•</span>
                                    <span className="flex items-center gap-1">
                                      ✌️ {gd.game_state?.p2Name || partner.username}: {gd.game_state?.scores?.partner ?? 0}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Action: Play Another Round */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGames();
                                }}
                                className="w-full py-2 px-3 bg-white hover:bg-black hover:text-white text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Play Another Game</span>
                              </button>
                            </div>
                          )}

                          {/* Invitation Body / Action Section */}
                          {isPending && (
                            <div>
                              {isInviter ? (
                                <div className={`p-2.5 rounded-xl border text-center space-y-1 ${
                                  isDarkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                                }`}>
                                  <p className={`text-xs font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                    Waiting for <span className="font-extrabold text-black dark:text-white">{partner.username}</span> to accept...
                                  </p>
                                  <span className="text-[10px] text-zinc-400 block">
                                    The match will start automatically once accepted!
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                    Ready to play a quick round of <span className="font-extrabold text-black dark:text-white">{gd.game_name}</span> together?
                                  </p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcceptGameInvite(msg);
                                      }}
                                      className="flex-1 py-2 px-3 bg-[#00e599] hover:bg-[#00c985] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <Gamepad2 className="w-3.5 h-3.5" />
                                      <span>Accept &amp; Play</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeclineGameInvite(msg);
                                      }}
                                      className="py-2 px-3 bg-white hover:bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <span>Decline</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isAccepted && (
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                <span>Invitation accepted!</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReopenGame(gd.game_id as GameType);
                                }}
                                className="px-2.5 py-1 bg-black text-[#00e599] font-black text-[11px] rounded-lg border border-black shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              >
                                Open Game
                              </button>
                            </div>
                          )}

                          {isDeclined && (
                            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center">
                              <p className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                {isInviter ? `${partner.username} declined this invitation.` : 'You declined this game invitation.'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })() : msg.message ? (
                      <p className="leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.message}</p>
                    ) : null}

                    {msg.image_url && (
                      <div className={`mt-2 rounded overflow-hidden border ${isDarkMode ? 'border-[#3f3f46]' : 'border-[#d1d5dc]'}`}>
                        <img
                          src={msg.image_url}
                          alt="Uploaded media"
                          className="max-h-60 w-auto object-cover rounded"
                        />
                      </div>
                    )}

                    {/* Quick Action Toolbar on Hover */}
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 border rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm z-10 ${
                      isDarkMode ? 'bg-[#27272a] border-[#3f3f46] text-white' : 'bg-white border-black text-black'
                    }`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePickerMsgId(activePickerMsgId === msg.id ? null : msg.id);
                        }}
                        className="p-1 hover:text-amber-500"
                        title="React"
                      >
                        <Smile className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(msg);
                        }}
                        className="p-1 hover:text-blue-600"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyMessageText(msg.id, msg.message);
                        }}
                        className="p-1 hover:text-green-600"
                        title="Copy"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline Quick Reply Button next to message */}
                  <button
                    type="button"
                    onClick={() => setReplyTo(msg)}
                    className={`p-1.5 active:scale-95 rounded-full transition-all shrink-0 ${
                      isDarkMode ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-400 hover:text-black hover:bg-black/5'
                    }`}
                    title="Reply to message"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </SwipeableMessageRow>

              {/* Animated Reaction Badges Row */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {Object.entries(msg.reactions).map(([key, users]) => (
                    <AnimatedReactionBadge
                      key={key}
                      reactionKey={key}
                      count={users.length}
                      isMe={currentUser ? users.includes(currentUser.id) : false}
                      onClick={() => toggleReaction(msg.id, key)}
                    />
                  ))}
                </div>
              )}

              {/* Profanity Warning Flag Indicator directly under profane message */}
              {msg.is_profane && (
                <div className="mt-1 flex items-center gap-1 px-2.5 py-0.5 bg-red-100 border border-red-300 text-[#dc341e] text-[10px] font-extrabold rounded-full">
                  <span>Profanity Flagged (Strike {msg.strike_count || 1}/3)</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Partner Typing Indicator — height-stable container prevents layout shift */}
        <div className="min-h-[28px] flex items-center transition-all duration-200">
          {partnerTyping && !partnerLeft && (
            <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border w-fit animate-pulse ${
              isDarkMode ? 'bg-[#27272a] border-[#3f3f46] text-zinc-200' : 'bg-white border-[#d1d5dc] text-[#242423]'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-[#ffc900]' : 'bg-black'}`} />
              <span>{partner.username} is typing...</span>
            </div>
          )}
        </div>

        {/* Partner Disconnected / Exited / Skipped — in-chat system card with Lottie Animation */}
        {partnerLeft && (
          <div className="flex flex-col items-center gap-2 py-4 my-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Wonder Why Skipped Lottie Animation */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center -mb-2">
              <DotLottieReact
                src="/animated-assets/wonder_why_skipped.lottie"
                loop={true}
                autoplay={true}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-center max-w-sm space-y-2 w-full flex flex-col items-center">
              {/* Status Pill Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${
                partnerLeftReason === 'inactivity'
                  ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300'
                  : partnerLeftReason === 'exited'
                  ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-300'
                  : partnerLeftReason === 'skipped'
                  ? 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950/60 dark:border-purple-700 dark:text-purple-300'
                  : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-700 dark:text-red-300'
              }`}>
                <span>
                  {partnerLeftReason === 'left' || partnerLeftReason === 'exited'
                    ? 'Your partner left the chat'
                    : partnerLeftReason === 'skipped'
                    ? `@${partner?.username || 'Partner'} skipped the chat`
                    : partnerLeftReason === 'inactivity'
                    ? `@${partner?.username || 'Partner'} disconnected (inactivity)`
                    : 'Chat ended'}
                </span>
              </div>

              {/* Ended Chat Indicator with Report / Block & Feedback Prompt */}
              <div className={`text-xs space-y-1.5 pt-1 ${isDarkMode ? 'text-zinc-300' : 'text-[#242423]'}`}>
                <p className="font-medium">
                  {partnerLeftReason === 'left' || partnerLeftReason === 'exited' ? (
                    <>Your partner ended the chat.</>
                  ) : partnerLeftReason === 'skipped' ? (
                    <>{partner?.username || 'Partner'} skipped the chat.</>
                  ) : partnerLeftReason === 'inactivity' ? (
                    <>{partner?.username || 'Partner'} was disconnected due to inactivity.</>
                  ) : (
                    <>Chat ended.</>
                  )}{' '}
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="font-extrabold text-[#701a31] dark:text-[#ff90e8] hover:underline cursor-pointer"
                  >
                    Report?
                  </button>{' '}
                  ·{' '}
                  <button
                    type="button"
                    onClick={blockPartner}
                    className="font-extrabold text-[#c41e3a] dark:text-[#f87171] hover:underline cursor-pointer"
                  >
                    Block
                  </button>
                </p>

                <p className={`text-[11px] font-bold tracking-wider uppercase pt-1 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                  FOUND A BUG OR HAVE SUGGESTIONS?{' '}
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(true)}
                    className="text-[#701a31] dark:text-[#ff90e8] hover:underline font-extrabold normal-case text-xs cursor-pointer"
                  >
                    Send it here!
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="bg-[#dc341e] text-white p-2.5 text-xs font-semibold flex items-center justify-between mx-2 sm:mx-4 mb-2 rounded-xl shadow-xs z-20">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Disconnected action bar — replaces input when partner leaves */}
      {partnerLeft ? (
        <div
          style={{
            backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerBg,
            borderColor: isAdminRoom ? undefined : activeThemeConfig.headerBorder,
            color: isAdminRoom ? undefined : activeThemeConfig.headerText,
          }}
          className={`p-3 sm:px-4 sm:py-3.5 flex flex-col gap-2.5 shrink-0 z-20 animate-in slide-in-from-bottom-1 duration-200 transition-all border-t pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
            isAdminRoom ? 'bg-slate-950/95 border-slate-800 text-white' : ''
          } ${activePickerMsgId ? 'pointer-events-none' : ''}`}
        >
          {/* Bottom Action Controls: Stay Here, Find Next Chat */}
          <div className="flex items-center justify-end gap-2.5 w-full">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={leaveRoom}
                style={{
                  backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
                  color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
                }}
                className="btn-gumroad-ghost text-xs px-4 py-2 border border-black/20 flex-1 sm:flex-initial text-center justify-center font-bold"
              >
                <span>Stay Here</span>
              </button>
              <button
                type="button"
                onClick={nextMatch}
                style={{
                  color: activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff',
                  backgroundColor: activeThemeConfig.btnBg || '#701a31',
                }}
                className="btn-gumroad-primary text-xs px-4 py-2 flex-1 sm:flex-initial justify-center font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Find Next Chat</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerBg,
            borderColor: isAdminRoom ? undefined : activeThemeConfig.headerBorder,
            color: isAdminRoom ? undefined : activeThemeConfig.headerText,
          }}
          className={`p-2 sm:p-3 relative shrink-0 z-20 transition-all duration-300 border-t pb-[max(0.6rem,env(safe-area-inset-bottom))] ${
            isAdminRoom ? 'bg-slate-950/95 border-slate-800 text-white' : ''
          } ${activePickerMsgId ? 'pointer-events-none' : ''}`}
        >
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div
              className={`absolute bottom-full left-2 sm:left-4 mb-2 p-2 rounded-2xl flex items-center gap-1.5 flex-wrap max-w-[320px] sm:max-w-md shadow-xl z-30 border-2 animate-in slide-in-from-bottom-2 duration-150 backdrop-blur-md ${
                isAdminRoom
                  ? 'bg-slate-900/95 border-slate-700 text-white'
                  : isDarkMode
                  ? 'bg-[#1e1e24]/95 border-[#3f3f46] text-white'
                  : 'bg-white/95 border-black text-black'
              }`}
            >
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 leading-none"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="p-1.5 ml-auto text-gray-400 hover:text-black dark:hover:text-white rounded-lg transition-colors"
                title="Close picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          <form onSubmit={handleSend} className="flex items-end gap-1.5 sm:gap-2 max-w-4xl mx-auto w-full">
            {/* Left Action Buttons (Upload Image + Emoji) */}
            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
                  color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
                  borderColor: isAdminRoom
                    ? undefined
                    : activeThemeConfig.id === 'yellow'
                    ? 'rgba(0,0,0,0.3)'
                    : 'rgba(255,255,255,0.3)',
                }}
                className="w-10 h-10 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-90 shadow-2xs shrink-0 disabled:opacity-50"
                title="Upload Image (Max 10MB)"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <button
                type="button"
                onClick={handleOpenGames}
                style={{
                  backgroundColor: showGamesModal
                    ? (activeThemeConfig.id === 'yellow' ? '#000000' : '#ffc900')
                    : isAdminRoom
                    ? undefined
                    : activeThemeConfig.headerButtonBg,
                  color: showGamesModal
                    ? (activeThemeConfig.id === 'yellow' ? '#ffffff' : '#000000')
                    : isAdminRoom
                    ? undefined
                    : activeThemeConfig.headerButtonText,
                  borderColor: isAdminRoom
                    ? undefined
                    : activeThemeConfig.id === 'yellow'
                    ? 'rgba(0,0,0,0.3)'
                    : 'rgba(255,255,255,0.3)',
                }}
                className="w-10 h-10 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-90 shadow-2xs shrink-0 cursor-pointer"
                title="Play Campus Games & Icebreakers with Partner"
              >
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Center Textarea Pill Capsule with Attached Image Preview & Reply Banner */}
            <div
              className={`flex-1 min-w-0 relative flex flex-col rounded-2xl border-2 transition-colors duration-150 overflow-hidden ${
                isAdminRoom
                  ? 'bg-slate-900 border-slate-700 text-white focus-within:border-[#ffc900]'
                  : activeThemeConfig.id === 'black'
                  ? 'bg-[#27272a] border-[#3f3f46] text-white focus-within:border-[#ffc900]'
                  : 'bg-white border-black text-black focus-within:border-[#701a31]'
              }`}
            >
              {/* Reply Preview Header if Active */}
              {replyTo && (
                <div
                  className={`px-3 py-1.5 border-b flex items-center justify-between text-xs gap-2 ${
                    isAdminRoom
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                      : activeThemeConfig.id === 'black'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-[#fff1f3] border-black/10 text-[#701a31]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <CornerUpLeft className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                    <span className="font-extrabold truncate">Replying to {replyTo.sender_username || 'Student'}:</span>
                    <span className="truncate opacity-80 italic font-medium">"{replyTo.message}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full shrink-0 cursor-pointer"
                    title="Cancel reply"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Embedded Attached Image Thumbnail Preview inside the Capsule */}
              {pendingImage && (
                <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
                  <div className="relative group inline-block">
                    <img
                      src={pendingImage.previewUrl}
                      alt="Attachment preview"
                      className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-gray-100 dark:bg-zinc-800"
                    />
                    {/* Discard Image Button */}
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#dc341e] hover:bg-black text-white rounded-full border border-black flex items-center justify-center shadow-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      title="Remove attached image"
                    >
                      <X className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold opacity-60 italic hidden xs:inline">
                    Image attached • Add a caption below
                  </span>
                </div>
              )}

              {/* Textarea inside the capsule */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={pendingImage ? "Add a caption (optional)..." : "Type a message..."}
                rows={1}
                className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-[16px] sm:text-sm leading-relaxed bg-transparent resize-none overflow-y-auto focus:outline-none border-none ${
                  isAdminRoom
                    ? 'text-white placeholder-slate-400'
                    : activeThemeConfig.id === 'black'
                    ? 'text-white placeholder-zinc-400'
                    : 'text-black placeholder-gray-400'
                }`}
                style={{ minHeight: '40px', maxHeight: '130px' }}
              />
            </div>

            {/* Right Send Button */}
            <button
              type="submit"
              disabled={!text.trim() && !replyTo && !pendingImage}
              style={
                text.trim() || replyTo || pendingImage
                  ? {
                      backgroundColor: activeThemeConfig.btnBg || '#701a31',
                      color: activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff',
                      borderColor: activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff',
                    }
                  : undefined
              }
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 font-black flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5 ${
                text.trim() || replyTo || pendingImage
                  ? 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-90 cursor-pointer opacity-100'
                  : 'bg-black/20 text-white/40 border-transparent cursor-not-allowed opacity-40 shadow-none'
              }`}
              title="Send Message"
            >
              <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </button>
          </form>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          reportedUsername={partner.username}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Campus Games & Icebreakers Bottom Sheet Modal */}
      <CampusGamesModal
        isOpen={showGamesModal}
        onClose={() => {
          setShowGamesModal(false);
          setTargetGame('menu');
        }}
        currentUser={currentUser}
        partner={partner}
        isDarkMode={isDarkMode || isAdminRoom}
        initialGame={targetGame}
      />


      {/* 60s Inactivity Timeout Warning Modal */}
      {showInactivityAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border-2 rounded-[16px] max-w-md w-full p-6 shadow-2xl text-center space-y-4 ${
            isDarkMode ? 'bg-[#18181b] border-[#3f3f46] text-white' : 'bg-white border-black text-black'
          }`}>
            <div className="w-14 h-14 rounded-full bg-[#ffc900] border-2 border-black flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-7 h-7 text-black" />
            </div>

            <div>
              <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Are You Still There?
              </h3>
              <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-[#242423]'}`}>
                You've been inactive for <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>60 seconds</span>. Please confirm you are still active, or this chat will automatically end in:
              </p>
            </div>

            <div className="py-2">
              <div className="inline-flex items-center gap-2 bg-[#ff90e8] text-black font-extrabold text-2xl px-5 py-2 rounded-full border-2 border-black shadow-sm">
                <Hourglass className="w-6 h-6 animate-spin" />
                <span>00:{inactivityCountdown.toString().padStart(2, '0')}s</span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetInactivity}
              className="btn-gumroad-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-[#ff90e8]" />
              <span>I'm Still Here!</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback & Bug Report Modal */}
      <FeedbackModal />

      {/* Block User Confirmation Modal */}
      {showBlockModal && (
        <BlockUserModal
          username={partner.username}
          onConfirm={blockPartner}
          onClose={() => setShowBlockModal(false)}
        />
      )}

      {/* Choose Your Theme Modal */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentTheme={chatTheme}
        onApplyTheme={(themeId) => {
          setChatTheme(themeId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('capitalk_chat_theme_name', themeId);
          }
          roomManager.sendThemeSignal(themeId);
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
