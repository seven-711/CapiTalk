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
import {
  Send,
  Image as ImageIcon,
  Smile,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import FloatingLines from './FloatingLines';
import { ThemeModal, getThemeConfig } from './ThemeModal';

const ADMIN_LINES_GRADIENT = ['#ffc900', '#701a31', '#00f2fe', '#e11d48'];

interface SwipeableMessageRowProps {
  msg: ChatMessage;
  isMe: boolean;
  onReply: (msg: ChatMessage) => void;
  onLongPress: (msgId: string) => void;
  children: React.ReactNode;
}

const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  msg,
  isMe,
  onReply,
  onLongPress,
  children,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasVibratedRef = useRef(false);

  const SWIPE_THRESHOLD = 35;

  const handleStart = (clientX: number, clientY: number) => {
    touchStartRef.current = { x: clientX, y: clientY };
    isHorizontalSwipeRef.current = null;
    hasVibratedRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!isHorizontalSwipeRef.current) {
        onLongPress(msg.id);
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
          window.navigator.vibrate(40);
        }
      }
    }, 380);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!touchStartRef.current) return;

    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
        if (isHorizontalSwipeRef.current && longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
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
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

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

const EMOJI_PRESETS = ['😊', '😂', '👍', '🔥', '❤️', '😮', '☕', '📚', '🎉', '👋'];

export const ChatRoom: React.FC = () => {
  const {
    currentUser,
    activeRoom,
    messages,
    partnerTyping,
    partnerLeft,
    partnerLeftReason,
    sendMessage,
    toggleReaction,
    sendTypingSignal,
    nextMatch,
    leaveRoom,
    blockPartner,
    systemAnnouncement,
    dismissAnnouncement,
    setShowFeedbackModal,
  } = useChatStore();

  const [text, setText] = useState('');

  // Dark Mode State with LocalStorage Persistence & Realtime Room Sync
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('capitalk_chat_theme');
      if (saved) return saved === 'dark';
    }
    return false;
  });

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

    return () => {
      unsubTheme();
      unsubStatus();
    };
  }, []);

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

    // Watchdog: If partner has not sent any signal for > 10s, consider them offline
    const watchdogInterval = setInterval(() => {
      if (!partnerLeft) {
        const timeSinceLastHeartbeat = Date.now() - lastPartnerHeartbeatRef.current;
        if (timeSinceLastHeartbeat > 10000 && partnerStatus !== 'offline') {
          setPartnerStatus('offline');
        }
      }
    }, 2000);

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
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

  const handleTouchStart = (msgId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActivePickerMsgId(msgId);
    }, 380);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Image Preview & Caption state
  const [pendingImage, setPendingImage] = useState<{ previewUrl: string } | null>(null);
  const [captionText, setCaptionText] = useState('');

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

  if (!activeRoom || !currentUser) {
    return (
      <div className="text-center py-16">
        <p className="text-[#242423]">No active chat room found.</p>
        <button onClick={leaveRoom} className="mt-4 btn-gumroad-primary">
          Back to Queue
        </button>
      </div>
    );
  }

  const partner = activeRoom.user_one.id === currentUser.id ? activeRoom.user_two : activeRoom.user_one;

  // Premium background & dark mode UI for BOTH participants whenever an Admin or bot_admin is in the room
  const isAdminRoom = Boolean(
    currentUser?.is_admin === true ||
    partner?.is_admin === true ||
    partner?.id === 'bot_admin'
  );

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !replyTo) return;

    const { cleanText } = filterProfanity(text);

    sendMessage(
      cleanText,
      undefined,
      replyTo ? { id: replyTo.id, sender_username: replyTo.sender_username, message: replyTo.message } : undefined
    );

    setText('');
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
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendPendingImage = () => {
    if (!pendingImage) return;

    const cleanCaption = captionText.trim() ? filterProfanity(captionText).cleanText : undefined;

    sendMessage(
      cleanCaption,
      pendingImage.previewUrl,
      replyTo ? { id: replyTo.id, sender_username: replyTo.sender_username, message: replyTo.message } : undefined
    );

    setPendingImage(null);
    setCaptionText('');
    setReplyTo(null);
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

      {/* Top Header Bar */}
      <div
        style={{
          backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerBg,
          color: isAdminRoom ? undefined : activeThemeConfig.headerText,
          borderColor: isAdminRoom ? undefined : activeThemeConfig.headerBorder,
        }}
        className={`px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-20 transition-all duration-300 border-b ${
          isAdminRoom ? 'bg-slate-950/80 border-slate-800/80 text-white backdrop-blur-md' : ''
        }`}
      >
        {/* Partner Info */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={partner.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${partner.username}`}
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

              {partnerLeft && (
                <span className={`inline-flex items-center gap-0.5 text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse border ${
                  partnerLeftReason === 'inactivity'
                    ? 'text-amber-600 bg-amber-50 border-amber-200'
                    : partnerLeftReason === 'exited'
                    ? 'text-rose-600 bg-rose-50 border-rose-200'
                    : partnerLeftReason === 'skipped'
                    ? 'text-purple-600 bg-purple-50 border-purple-200'
                    : 'text-red-500 bg-red-50 border-red-200'
                }`}>
                  {partnerLeftReason === 'inactivity' ? (
                    <>
                      <Hourglass className="w-2 h-2" />
                      Inactive
                    </>
                  ) : partnerLeftReason === 'exited' ? (
                    <>
                      <LogOut className="w-2 h-2" />
                      Exited
                    </>
                  ) : partnerLeftReason === 'skipped' ? (
                    <>
                      <FastForward className="w-2 h-2" />
                      Skipped
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2 h-2" />
                      Disconnected
                    </>
                  )}
                </span>
              )}
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
            <FastForward className={`w-3.5 h-3.5 ${confirmNext ? 'text-white' : 'text-amber-300'}`} />
            <span className={confirmNext ? 'inline' : 'hidden sm:inline'}>
              {confirmNext ? 'Sure?' : 'Next Chat'}
            </span>
          </button>
        </div>
      </div>

      {/* Message Feed Area — flex-1 min-h-0 fills remaining space and scrolls internally */}
      <div
        onClick={() => activePickerMsgId && setActivePickerMsgId(null)}
        style={{
          backgroundColor: isAdminRoom ? undefined : activeThemeConfig.chatFeedBg || '#fbf9f5',
        }}
        className={`relative z-10 flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 overscroll-contain transition-colors duration-300 ${
          isAdminRoom ? 'bg-transparent text-white' : ''
        }`}
      >
        <div className="space-y-3 sm:space-y-4">
          {messages.map((msg) => {
          if (msg.reaction_update || (!msg.message?.trim() && !msg.image_url && !msg.id.startsWith('msg_ann_') && msg.sender_id !== 'system')) {
            return null;
          }

          const isSystem = msg.sender_id === 'system';
          const isMe = msg.sender_id === currentUser.id;

          if (isSystem || msg.sender_id === 'system_announcement' || msg.id.startsWith('msg_ann_')) {
            if (msg.message?.includes('Profanity Warning')) {
              return (
                <div key={msg.id} className={`my-3 p-3.5 border-2 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-200 ${
                  isDarkMode ? 'bg-red-950/40 border-red-700 text-white' : 'bg-[#dc341e]/10 border-[#dc341e] text-black'
                }`}>
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
                <div key={msg.id} className="my-3 p-4 bg-red-600 text-white border-2 border-black rounded-2xl shadow-lg animate-in fade-in duration-300">
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
              <div key={msg.id} className="text-center my-4">
                <span className={`inline-block border text-xs font-semibold px-4 py-1.5 rounded-full ${
                  isDarkMode ? 'bg-[#27272a] border-[#3f3f46] text-zinc-200' : 'bg-white border-[#d1d5dc] text-black'
                }`}>
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
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

              {/* iOS-style Floating Reaction Picker — above blur layer (z-40) */}
              {activePickerMsgId === msg.id && (
                <div className="mb-2 relative z-40 animate-in fade-in slide-in-from-bottom-3 zoom-in-90 duration-200">
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
                onLongPress={(mId) => setActivePickerMsgId(mId)}
              >
                <div className={`flex items-center gap-1.5 w-fit max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse ml-auto' : 'flex-row mr-auto'}`}>
                  {/* Main Message Content */}
                  <div
                    style={
                      isMe && !msg.is_profane
                        ? {
                            backgroundColor: activeThemeConfig.bubbleBg,
                            color: activeThemeConfig.bubbleText,
                            borderColor: isDarkMode ? '#3f3f46' : activeThemeConfig.bubbleBorder || '#000000',
                          }
                        : undefined
                    }
                    className={`p-3 sm:p-3.5 rounded-[16px] border text-sm relative cursor-pointer w-fit max-w-full min-w-0 ${
                      isMe
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
                    {msg.message && <p className="leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.message}</p>}

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

        {/* Partner Disconnected / Exited / Skipped — in-chat system card */}
        {partnerLeft && (
          <div className="flex flex-col items-center gap-3 py-4 my-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
              partnerLeftReason === 'inactivity'
                ? 'bg-amber-100 border-amber-300 text-amber-600'
                : partnerLeftReason === 'exited'
                ? 'bg-rose-100 border-rose-300 text-rose-600'
                : partnerLeftReason === 'skipped'
                ? 'bg-purple-100 border-purple-300 text-purple-600'
                : 'bg-red-100 border-red-300 text-red-500'
            }`}>
              {partnerLeftReason === 'inactivity' ? (
                <Hourglass className="w-5 h-5 animate-pulse" />
              ) : partnerLeftReason === 'exited' ? (
                <LogOut className="w-5 h-5" />
              ) : partnerLeftReason === 'skipped' ? (
                <FastForward className="w-5 h-5" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
            <div className="text-center max-w-sm space-y-2">
              <p className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {partnerLeftReason === 'inactivity'
                  ? 'User Disconnected (Inactivity)'
                  : partnerLeftReason === 'exited'
                  ? 'Partner Exited Chat'
                  : partnerLeftReason === 'skipped'
                  ? 'Partner Skipped Chat'
                  : 'Connection Ended'}
              </p>
              
              {/* Ended Chat Indicator with Report / Block & Feedback Prompt */}
              <div className={`text-xs space-y-1.5 pt-1 ${isDarkMode ? 'text-zinc-400' : 'text-[#242423]'}`}>
                <p className="font-medium">
                  {partnerLeftReason === 'left' || partnerLeftReason === 'exited' ? (
                    <>You ended the chat.</>
                  ) : partnerLeftReason === 'skipped' ? (
                    <>{partner.username} skipped the chat.</>
                  ) : partnerLeftReason === 'inactivity' ? (
                    <>{partner.username} was disconnected due to inactivity.</>
                  ) : (
                    <>Chat ended.</>
                  )}{' '}
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="font-extrabold text-[#701a31] hover:underline"
                  >
                    Report?
                  </button>{' '}
                  ·{' '}
                  <button
                    type="button"
                    onClick={blockPartner}
                    className="font-extrabold text-[#c41e3a] hover:underline"
                  >
                    Block
                  </button>
                </p>

                <p className={`text-[11px] font-bold tracking-wider uppercase pt-1 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                  FOUND A BUG OR HAVE SUGGESTIONS?{' '}
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(true)}
                    className="text-[#701a31] hover:underline font-extrabold normal-case text-xs"
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

      {/* Reply Bar Overlay */}
      {replyTo && (
        <div
          style={{
            backgroundColor: isDarkMode ? '#1e1e24' : '#fff9eb',
            borderColor: activeThemeConfig.dotColor || '#ffc900',
          }}
          className="mx-2 sm:mx-4 mb-2 p-2.5 rounded-xl border-l-4 border-y border-r flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-bottom-2 duration-200 z-20"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft className="w-4 h-4 shrink-0 text-[#701a31] dark:text-[#ffc900]" />
            <div className="text-xs truncate">
              <span className="font-extrabold text-black dark:text-white">
                Replying to {replyTo.sender_username}
              </span>
              <span className="text-gray-500 dark:text-zinc-400 ml-1.5 truncate">
                "{replyTo.message}"
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-gray-500 hover:text-black dark:hover:text-white"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          className={`p-3 sm:px-4 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-20 animate-in slide-in-from-bottom-1 duration-200 transition-all border-t pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
            isAdminRoom ? 'bg-slate-950/95 border-slate-800 text-white backdrop-blur-md' : ''
          }`}
        >
          <div className="flex items-center gap-2 text-sm">
            {partnerLeftReason === 'inactivity' ? (
              <Hourglass className="w-4 h-4 text-amber-500 shrink-0" />
            ) : partnerLeftReason === 'exited' ? (
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            ) : partnerLeftReason === 'skipped' ? (
              <FastForward className="w-4 h-4 text-purple-500 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span className="font-semibold text-xs sm:text-sm opacity-90">
              {partnerLeftReason === 'inactivity'
                ? 'Partner timed out due to inactivity.'
                : partnerLeftReason === 'exited'
                ? 'Partner exited the conversation.'
                : partnerLeftReason === 'skipped'
                ? 'Partner skipped to next chat.'
                : 'Partner disconnected.'}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={leaveRoom}
              style={{
                backgroundColor: isAdminRoom ? undefined : activeThemeConfig.headerButtonBg,
                color: isAdminRoom ? undefined : activeThemeConfig.headerButtonText,
              }}
              className="btn-gumroad-ghost text-xs px-4 py-2 border border-black/20 flex-1 sm:flex-initial text-center justify-center"
            >
              <span>Stay Here</span>
            </button>
            <button
              type="button"
              onClick={nextMatch}
              className="btn-gumroad-primary text-xs px-4 py-2 flex-1 sm:flex-initial justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Find Next Chat</span>
            </button>
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
            isAdminRoom ? 'bg-slate-950/95 border-slate-800 text-white backdrop-blur-md' : ''
          }`}
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
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  backgroundColor: showEmojiPicker
                    ? (activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff')
                    : isAdminRoom
                    ? undefined
                    : activeThemeConfig.headerButtonBg,
                  color: showEmojiPicker
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
                className="w-10 h-10 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-90 shadow-2xs shrink-0"
                title="Add Emoji"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Center Textarea Pill Capsule */}
            <div className="flex-1 min-w-0 relative flex items-center">
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
                placeholder="Type a message..."
                rows={1}
                className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-[16px] sm:text-sm leading-relaxed rounded-2xl border-2 transition-colors duration-150 resize-none overflow-y-auto focus:outline-none ${
                  isAdminRoom
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-[#ffc900]'
                    : activeThemeConfig.id === 'black'
                    ? 'bg-[#27272a] border-[#3f3f46] text-white placeholder-zinc-400 focus:border-[#ffc900]'
                    : 'bg-white border-black text-black placeholder-gray-400 focus:border-[#ffc900]'
                }`}
                style={{ minHeight: '40px', maxHeight: '130px' }}
              />
            </div>

            {/* Right Send Button */}
            <button
              type="submit"
              disabled={!text.trim() && !replyTo}
              style={
                text.trim() || replyTo
                  ? {
                      backgroundColor: activeThemeConfig.btnBg || '#701a31',
                      color: activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff',
                      borderColor: activeThemeConfig.id === 'yellow' ? '#000000' : '#ffffff',
                    }
                  : undefined
              }
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 font-black flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5 ${
                text.trim() || replyTo
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

      {/* Image Preview & Confirmation Modal */}
      {pendingImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border-2 rounded-[16px] max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#18181b] border-[#3f3f46] text-white' : 'bg-white border-black text-black'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-[#3f3f46]' : 'border-[#d1d5dc]'}`}>
              <h3 className={`font-extrabold text-base flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                <ImageIcon className="w-5 h-5 text-[#ffc900]" />
                Image Preview
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setCaptionText('');
                }}
                className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-100 text-black'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`rounded-xl p-2 flex items-center justify-center border ${isDarkMode ? 'bg-[#27272a] border-[#3f3f46]' : 'bg-[#f4f4f0] border-[#d1d5dc]'}`}>
              <img
                src={pendingImage.previewUrl}
                alt="Image Preview"
                className="max-h-64 sm:max-h-80 w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-[#242423]'}`}>
                Caption (Optional)
              </label>
              <input
                type="text"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendPendingImage();
                }}
                placeholder="Write a caption to go with your image..."
                className={`gumroad-input w-full py-2.5 px-3 text-sm ${isDarkMode ? 'bg-[#27272a] border-[#3f3f46] text-white placeholder-zinc-500' : ''}`}
                autoFocus
              />
            </div>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isDarkMode ? 'border-[#3f3f46]' : 'border-[#d1d5dc]'}`}>
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setCaptionText('');
                }}
                className={`btn-gumroad-ghost text-xs px-4 py-2.5 ${isDarkMode ? 'text-zinc-300 border-[#3f3f46] hover:bg-[#27272a]' : ''}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPendingImage}
                className="btn-gumroad-primary text-xs px-5 py-2.5 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
