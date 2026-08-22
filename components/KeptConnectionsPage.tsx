'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { getAvatarForPseudonym } from '../lib/constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { AnimatedReactionPicker, AnimatedReactionBadge } from './AnimatedReactionPicker';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  Send,
  Trash2,
  MoreVertical,
  Check,
  CheckCheck,
  MessageCircle,
  ChevronRight,
  Sparkles,
  Shield,
  Smile,
  CornerUpLeft,
  CornerUpRight,
  Copy,
  X,
} from 'lucide-react';

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isMe?: boolean;
  read?: boolean;
  reply_to?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: Record<string, string[]>;
}

interface SwipeableDmRowProps {
  msg: DirectMessage;
  isMe: boolean;
  onReply: (msg: DirectMessage) => void;
  children: React.ReactNode;
}

const SwipeableDmRow: React.FC<SwipeableDmRowProps> = ({
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
          className={`p-2 rounded-full border border-zinc-700 transition-all ${
            isTriggered
              ? 'bg-[#ffc900] text-black shadow-md scale-110'
              : 'bg-[#27272a] text-white shadow-2xs'
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

export const KeptConnectionsPage: React.FC = () => {
  const {
    keptConnection,
    removeKeptConnection,
    setViewState,
    goBack,
    currentUser,
    setHasNewConnectionNotif,
  } = useChatStore();

  const [activeChatOpen, setActiveChatOpen] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [lastSeenTime, setLastSeenTime] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Message Reply & Reaction States
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const presenceHeartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Deterministic pairwise key between the two users
  const pairKey = currentUser && keptConnection
    ? [currentUser.id, keptConnection.user_id].sort().join('__')
    : keptConnection ? `pair__${keptConnection.user_id}` : 'default_pair';

  const storageKey = `capitalk_dm_${pairKey}`;

  // Helper to persist message list
  const persistMessages = useCallback((newMsgs: DirectMessage[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMsgs));
    } catch {}
  }, [storageKey]);

  // Copy message text helper
  const copyMessageText = useCallback((msgId: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }, []);

  // Toggle emoji reaction on direct message
  const toggleReaction = useCallback((messageId: string, reactionKey: string) => {
    if (!currentUser) return;
    const myUserId = currentUser.id;

    setMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions: Record<string, string[]> = { ...(m.reactions || {}) };
        const currentUsersForThisKey = currentReactions[reactionKey] || [];
        const hasReacted = currentUsersForThisKey.includes(myUserId);

        // Remove user from all keys first
        Object.keys(currentReactions).forEach((k) => {
          currentReactions[k] = (currentReactions[k] || []).filter((id) => id !== myUserId);
          if (currentReactions[k].length === 0) {
            delete currentReactions[k];
          }
        });

        // Toggle on if wasn't already reacted with this key
        if (!hasReacted) {
          currentReactions[reactionKey] = [...(currentReactions[reactionKey] || []), myUserId];
        }

        return {
          ...m,
          reactions: currentReactions,
        };
      });

      persistMessages(updated);
      return updated;
    });

    const payload = {
      messageId,
      reactionKey,
      userId: myUserId,
    };

    broadcastChannelRef.current?.postMessage({
      type: 'dm_reaction',
      payload,
    });

    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'dm_reaction',
          payload,
        });
      } catch {}
    }
  }, [currentUser, persistMessages]);

  // Partner typing watchdog with 3.5s automatic fallback reset
  const handlePartnerTyping = useCallback((isTyping: boolean) => {
    if (partnerTypingTimerRef.current) {
      clearTimeout(partnerTypingTimerRef.current);
      partnerTypingTimerRef.current = null;
    }
    if (isTyping) {
      setPartnerTyping(true);
      partnerTypingTimerRef.current = setTimeout(() => {
        setPartnerTyping(false);
      }, 3500);
    } else {
      setPartnerTyping(false);
    }
  }, []);

  // Mark partner online and reset offline countdown timer (14s)
  const markPartnerOnline = useCallback(() => {
    setIsPartnerOnline(true);
    setLastSeenTime(Date.now());

    if (lastSignalTimeoutRef.current) clearTimeout(lastSignalTimeoutRef.current);
    lastSignalTimeoutRef.current = setTimeout(() => {
      setIsPartnerOnline(false);
      setLastSeenTime(Date.now());
    }, 14000);
  }, []);

  const markPartnerOffline = useCallback(() => {
    setIsPartnerOnline(false);
    setLastSeenTime(Date.now());
    if (lastSignalTimeoutRef.current) clearTimeout(lastSignalTimeoutRef.current);
  }, []);

  // Emit Read Receipt Broadcast
  const sendReadReceipt = useCallback(() => {
    if (!currentUser) return;
    broadcastChannelRef.current?.postMessage({
      type: 'dm_read_receipt',
      payload: { readerId: currentUser.id, readAt: Date.now() },
    });

    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'dm_read_receipt',
          payload: { readerId: currentUser.id, readAt: Date.now() },
        });
      } catch {}
    }
  }, [currentUser]);

  // Emit presence ping heartbeat
  const sendPresencePing = useCallback(() => {
    if (!currentUser) return;
    const payload = { senderId: currentUser.id, username: currentUser.username, timestamp: Date.now() };
    broadcastChannelRef.current?.postMessage({
      type: 'dm_presence_ping',
      payload,
    });
    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'dm_presence_ping',
          payload,
        });
      } catch {}
    }
  }, [currentUser]);

  // Emit presence pong response
  const sendPresencePong = useCallback(() => {
    if (!currentUser) return;
    const payload = { senderId: currentUser.id, username: currentUser.username, timestamp: Date.now() };
    broadcastChannelRef.current?.postMessage({
      type: 'dm_presence_pong',
      payload,
    });
    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'dm_presence_pong',
          payload,
        });
      } catch {}
    }
  }, [currentUser]);

  // Load existing message history
  useEffect(() => {
    if (!keptConnection) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: DirectMessage[] = JSON.parse(saved);
        setMessages(
          parsed.map((m) => ({
            ...m,
            isMe: m.senderId === (currentUser?.id || 'me'),
          }))
        );
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [keptConnection, storageKey, currentUser?.id]);

  // Connect Real-Time Subscriptions (Supabase Realtime + Local BroadcastChannel + Storage Event)
  useEffect(() => {
    if (!keptConnection || !currentUser) return;

    // Clear unread notification when viewing conversation
    setHasNewConnectionNotif(false);

    // Send read receipt and presence ping on mount
    sendReadReceipt();
    sendPresencePing();

    // Regular heartbeat ping every 5 seconds
    presenceHeartbeatTimerRef.current = setInterval(() => {
      sendPresencePing();
    }, 5000);

    // 1. BroadcastChannel for instant local cross-tab / multi-window sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`capitalk_dm_bc_${pairKey}`);
        broadcastChannelRef.current = bc;

        bc.onmessage = (e) => {
          const data = e.data;
          if (data?.type === 'dm_message' && data.payload?.senderId !== currentUser.id) {
            markPartnerOnline();
            handlePartnerTyping(false);
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.payload.id)) return prev;
              // Mark all my sent messages as read since partner responded
              const marked = prev.map((m) => (m.isMe ? { ...m, read: true } : m));
              const updated = [...marked, { ...data.payload, isMe: false, read: true }];
              persistMessages(updated);
              return updated;
            });
            sendReadReceipt();
          } else if (data?.type === 'dm_read_receipt' && data.payload?.readerId !== currentUser.id) {
            markPartnerOnline();
            setMessages((prev) => {
              const updated = prev.map((m) => (m.isMe ? { ...m, read: true } : m));
              persistMessages(updated);
              return updated;
            });
          } else if (data?.type === 'dm_typing' && data.payload?.senderId !== currentUser.id) {
            markPartnerOnline();
            handlePartnerTyping(Boolean(data.payload.isTyping));
          } else if (data?.type === 'dm_reaction' && data.payload?.userId !== currentUser.id) {
            const { messageId, reactionKey, userId } = data.payload;
            markPartnerOnline();
            setMessages((prev) => {
              const updated = prev.map((m) => {
                if (m.id !== messageId) return m;
                const currentReactions: Record<string, string[]> = { ...(m.reactions || {}) };
                const currentUsersForThisKey = currentReactions[reactionKey] || [];
                const hasReacted = currentUsersForThisKey.includes(userId);

                Object.keys(currentReactions).forEach((k) => {
                  currentReactions[k] = (currentReactions[k] || []).filter((id) => id !== userId);
                  if (currentReactions[k].length === 0) {
                    delete currentReactions[k];
                  }
                });

                if (!hasReacted) {
                  currentReactions[reactionKey] = [...(currentReactions[reactionKey] || []), userId];
                }

                return { ...m, reactions: currentReactions };
              });
              persistMessages(updated);
              return updated;
            });
          } else if (data?.type === 'dm_presence_ping' && data.payload?.senderId !== currentUser.id) {
            markPartnerOnline();
            sendPresencePong();
          } else if (data?.type === 'dm_presence_pong' && data.payload?.senderId !== currentUser.id) {
            markPartnerOnline();
          } else if (data?.type === 'dm_presence_leave' && data.payload?.senderId !== currentUser.id) {
            markPartnerOffline();
          }
        };
      } catch {}
    }

    // 2. Storage event listener for cross-tab fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed: DirectMessage[] = JSON.parse(e.newValue);
          setMessages(
            parsed.map((m) => ({
              ...m,
              isMe: m.senderId === currentUser.id,
            }))
          );
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Supabase Realtime Channel for global real-time cross-device messaging & presence
    if (isSupabaseConfigured && supabase) {
      try {
        const channel = supabase.channel(`capitalk:dm:${pairKey}`, {
          config: { presence: { key: currentUser.id } },
        });
        supabaseChannelRef.current = channel;

        channel
          .on('broadcast', { event: 'dm_message' }, ({ payload }: { payload: DirectMessage }) => {
            if (payload && payload.senderId !== currentUser.id) {
              markPartnerOnline();
              handlePartnerTyping(false);
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.id)) return prev;
                const marked = prev.map((m) => (m.isMe ? { ...m, read: true } : m));
                const updated = [...marked, { ...payload, isMe: false, read: true }];
                persistMessages(updated);
                return updated;
              });
              sendReadReceipt();
            }
          })
          .on('broadcast', { event: 'dm_read_receipt' }, ({ payload }: { payload: { readerId: string } }) => {
            if (payload && payload.readerId !== currentUser.id) {
              markPartnerOnline();
              setMessages((prev) => {
                const updated = prev.map((m) => (m.isMe ? { ...m, read: true } : m));
                persistMessages(updated);
                return updated;
              });
            }
          })
          .on('broadcast', { event: 'dm_typing' }, ({ payload }: { payload: { senderId: string; isTyping: boolean } }) => {
            if (payload && payload.senderId !== currentUser.id) {
              markPartnerOnline();
              handlePartnerTyping(Boolean(payload.isTyping));
            }
          })
          .on('broadcast', { event: 'dm_reaction' }, ({ payload }: any) => {
            if (payload && payload.userId !== currentUser.id) {
              const { messageId, reactionKey, userId } = payload;
              markPartnerOnline();
              setMessages((prev) => {
                const updated = prev.map((m) => {
                  if (m.id !== messageId) return m;
                  const currentReactions: Record<string, string[]> = { ...(m.reactions || {}) };
                  const currentUsersForThisKey = currentReactions[reactionKey] || [];
                  const hasReacted = currentUsersForThisKey.includes(userId);

                  Object.keys(currentReactions).forEach((k) => {
                    currentReactions[k] = (currentReactions[k] || []).filter((id) => id !== userId);
                    if (currentReactions[k].length === 0) {
                      delete currentReactions[k];
                    }
                  });

                  if (!hasReacted) {
                    currentReactions[reactionKey] = [...(currentReactions[reactionKey] || []), userId];
                  }

                  return { ...m, reactions: currentReactions };
                });
                persistMessages(updated);
                return updated;
              });
            }
          })
          .on('broadcast', { event: 'dm_presence_ping' }, ({ payload }: { payload: { senderId: string } }) => {
            if (payload && payload.senderId !== currentUser.id) {
              markPartnerOnline();
              sendPresencePong();
            }
          })
          .on('broadcast', { event: 'dm_presence_pong' }, ({ payload }: { payload: { senderId: string } }) => {
            if (payload && payload.senderId !== currentUser.id) {
              markPartnerOnline();
            }
          })
          .on('broadcast', { event: 'dm_presence_leave' }, ({ payload }: { payload: { senderId: string } }) => {
            if (payload && payload.senderId !== currentUser.id) {
              markPartnerOffline();
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const partnerPresent = Object.values(state).some((presences: any) =>
              presences.some((p: any) => p.userId === keptConnection.user_id || p.username === keptConnection.username)
            );
            if (partnerPresent) markPartnerOnline();
          })
          .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            const joined = newPresences.some((p: any) => p.userId === keptConnection.user_id || p.username === keptConnection.username);
            if (joined) markPartnerOnline();
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
            const left = leftPresences.some((p: any) => p.userId === keptConnection.user_id || p.username === keptConnection.username);
            if (left) markPartnerOffline();
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                userId: currentUser.id,
                username: currentUser.username,
                onlineAt: Date.now(),
              });
              sendPresencePing();
            }
          });
      } catch {}
    }

    const handleBeforeUnload = () => {
      broadcastChannelRef.current?.postMessage({
        type: 'dm_presence_leave',
        payload: { senderId: currentUser.id },
      });
      if (supabaseChannelRef.current) {
        try {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'dm_presence_leave',
            payload: { senderId: currentUser.id },
          });
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();

      if (presenceHeartbeatTimerRef.current) clearInterval(presenceHeartbeatTimerRef.current);
      if (lastSignalTimeoutRef.current) clearTimeout(lastSignalTimeoutRef.current);
      if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      if (supabaseChannelRef.current && supabase) {
        try {
          supabase.removeChannel(supabaseChannelRef.current);
        } catch {}
        supabaseChannelRef.current = null;
      }
    };
  }, [keptConnection, currentUser, pairKey, storageKey, persistMessages, sendReadReceipt, sendPresencePing, sendPresencePong, markPartnerOnline, markPartnerOffline, handlePartnerTyping, setHasNewConnectionNotif]);

  // Scroll to bottom on new message or typing state change when chat is open
  useEffect(() => {
    if (activeChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping, activeChatOpen]);

  // Handle typing signal broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Broadcast typing indicator
    if (currentUser) {
      broadcastChannelRef.current?.postMessage({
        type: 'dm_typing',
        payload: { senderId: currentUser.id, isTyping: val.length > 0 },
      });

      if (supabaseChannelRef.current) {
        try {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'dm_typing',
            payload: { senderId: currentUser.id, isTyping: val.length > 0 },
          });
        } catch {}
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        broadcastChannelRef.current?.postMessage({
          type: 'dm_typing',
          payload: { senderId: currentUser.id, isTyping: false },
        });
        if (supabaseChannelRef.current) {
          try {
            supabaseChannelRef.current.send({
              type: 'broadcast',
              event: 'dm_typing',
              payload: { senderId: currentUser.id, isTyping: false },
            });
          } catch {}
        }
      }, 1500);
    }
  };

  // Send Direct Message in Real Time
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !keptConnection || !currentUser) return;

    const myMessage: DirectMessage = {
      id: 'dm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      senderId: currentUser.id,
      senderName: currentUser.username,
      text: inputText.trim(),
      timestamp: Date.now(),
      isMe: true,
      read: false, // 1 check initially
      reply_to: replyTo
        ? {
            id: replyTo.id,
            senderName: replyTo.senderName,
            text: replyTo.text,
          }
        : undefined,
    };

    const updated = [...messages, myMessage];
    setMessages(updated);
    persistMessages(updated);
    setInputText('');
    setReplyTo(null);

    // Play sent message SFX
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/audio/sent_msg.webm');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    // 1. Broadcast over local BroadcastChannel
    broadcastChannelRef.current?.postMessage({
      type: 'dm_message',
      payload: myMessage,
    });

    // 2. Broadcast over Supabase Realtime Channel
    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'dm_message',
          payload: myMessage,
        });
      } catch {}
    }

    // 3. Global notification broadcast so recipient gets notified anywhere in the app
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const globalBc = new BroadcastChannel('capitalk_global_realtime');
        globalBc.postMessage({
          type: 'GLOBAL_DM_MESSAGE',
          message: myMessage,
          recipientId: keptConnection.user_id,
          senderName: currentUser.username,
        });
        setTimeout(() => globalBc.close(), 1000);
      } catch {}
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const globalChan = supabase.channel('capitalk_global_announcements_v1');
        globalChan.send({
          type: 'broadcast',
          event: 'global_dm_message',
          payload: {
            message: myMessage,
            recipientId: keptConnection.user_id,
            senderName: currentUser.username,
          },
        });
      } catch {}
    }

    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastChannelRef.current?.postMessage({
      type: 'dm_typing',
      payload: { senderId: currentUser.id, isTyping: false },
    });
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#121214] text-white font-sans flex flex-col max-w-2xl mx-auto w-full border-x border-zinc-800/80 overflow-hidden select-none">
      {keptConnection ? (
        activeChatOpen ? (
          /* ═══════════════════════════════════════════════════════════════════════
             VIEW A: ACTIVE DIRECT MESSAGE CHATROOM
             ═══════════════════════════════════════════════════════════════════════ */
          <>
            {/* Header */}
            <header className="bg-[#18181b] border-b border-zinc-800 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Back to Chats List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={keptConnection.avatar_url || getAvatarForPseudonym(keptConnection.username)}
                    alt={keptConnection.username}
                    className="w-10 h-10 rounded-full border border-zinc-700 object-cover bg-zinc-900"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#18181b] transition-all ${
                      isPartnerOnline
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                        : 'bg-zinc-500'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm sm:text-base text-white truncate leading-tight">
                      {keptConnection.username}
                    </h2>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#701a31]/60 text-[#ff90e8] rounded-md border border-[#701a31] shrink-0">
                      {keptConnection.department.replace('College of ', '')}
                    </span>
                  </div>
                  {partnerTyping ? (
                    <p className="text-[11px] font-bold text-amber-400 truncate leading-tight mt-0.5 animate-pulse">
                      typing...
                    </p>
                  ) : isPartnerOnline ? (
                    <p className="text-[11px] font-bold text-emerald-400 truncate leading-tight mt-0.5">
                      Online
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-zinc-400 truncate leading-tight mt-0.5">
                      {lastSeenTime
                        ? (() => {
                            const diffSec = Math.max(0, Math.floor((Date.now() - lastSeenTime) / 1000));
                            if (diffSec < 60) return 'Offline · Active just now';
                            const diffMin = Math.floor(diffSec / 60);
                            if (diffMin < 60) return `Offline · Active ${diffMin}m ago`;
                            const diffHr = Math.floor(diffMin / 60);
                            if (diffHr < 24) return `Offline · Active ${diffHr}h ago`;
                            return 'Offline';
                          })()
                        : 'Offline'}
                    </p>
                  )}
                </div>
              </div>

              {/* Top Right Options */}
              <div className="relative flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-11 bg-[#1e1e24] border border-zinc-700 rounded-2xl shadow-2xl p-1.5 min-w-[170px] z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowRemoveConfirm(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Unfriend</span>
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#121214]">
              {/* Profile Intro Banner */}
              <div className="text-center py-4 space-y-1">
                <img
                  src={keptConnection.avatar_url || getAvatarForPseudonym(keptConnection.username)}
                  alt={keptConnection.username}
                  className="w-16 h-16 rounded-full border-2 border-zinc-700 object-cover bg-zinc-900 mx-auto shadow-md"
                />
                <h3 className="font-extrabold text-base text-white">
                  {keptConnection.username}
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Mutual 1:1 friend connection. Messages are encrypted and delivered in real time.
                </p>
              </div>

              {/* Empty Chat State Notice */}
              {messages.length === 0 && (
                <div className="text-center py-6 text-xs text-zinc-400 space-y-1">
                  <p className="font-bold text-zinc-200">No messages yet 👋</p>
                  <p>Say hi to @{keptConnection.username} to start the conversation!</p>
                </div>
              )}

              {/* Real-time Message Bubbles with Swipe-to-Reply & Reactions */}
              {messages.map((msg) => (
                <SwipeableDmRow
                  key={msg.id}
                  msg={msg}
                  isMe={!!msg.isMe}
                  onReply={(m) => {
                    setReplyTo(m);
                    inputRef.current?.focus();
                  }}
                >
                  <div
                    id={`msg-${msg.id}`}
                    className={`flex flex-col group relative ${msg.isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Floating Reaction Picker Popover */}
                    {activePickerMsgId === msg.id && (
                      <div className={`absolute z-50 animate-in zoom-in-95 duration-150 ${
                        msg.isMe ? 'right-0 -top-11' : 'left-0 -top-11'
                      }`}>
                        <AnimatedReactionPicker
                          onSelectReaction={(key) => {
                            toggleReaction(msg.id, key);
                            setActivePickerMsgId(null);
                          }}
                          onClose={() => setActivePickerMsgId(null)}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
                      <div
                        className={`relative px-3.5 py-2 text-[13.5px] leading-relaxed break-words shadow-sm transition-all ${
                          msg.isMe
                            ? 'bg-[#701a31] text-white rounded-2xl rounded-br-xs border border-[#8b233e]/50'
                            : 'bg-[#27272a] text-zinc-100 border border-zinc-700/60 rounded-2xl rounded-bl-xs'
                        }`}
                      >
                        {/* Reply Quote Banner inside bubble */}
                        {msg.reply_to && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = document.getElementById(`msg-${msg.reply_to?.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('ring-2', 'ring-[#ffc900]');
                                setTimeout(() => el.classList.remove('ring-2', 'ring-[#ffc900]'), 1500);
                              }
                            }}
                            className={`mb-1.5 p-2 rounded-xl text-xs cursor-pointer border-l-3 transition-opacity hover:opacity-90 ${
                              msg.isMe
                                ? 'bg-black/25 border-[#ffc900] text-zinc-200'
                                : 'bg-black/40 border-[#ff90e8] text-zinc-300'
                            }`}
                          >
                            <p className={`font-bold text-[10.5px] truncate ${msg.isMe ? 'text-[#ffc900]' : 'text-[#ff90e8]'}`}>
                              {msg.reply_to.senderName === currentUser?.username ? 'You' : `@${msg.reply_to.senderName}`}
                            </p>
                            <p className="text-[11px] text-zinc-300 line-clamp-1 truncate">{msg.reply_to.text}</p>
                          </div>
                        )}

                        <p className="leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.text}</p>

                        {/* Quick Action Toolbar on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 right-2 border rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg z-20 bg-[#1e1e24] border-zinc-700 text-white">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePickerMsgId(activePickerMsgId === msg.id ? null : msg.id);
                            }}
                            className="p-1 hover:text-amber-400 text-zinc-400 transition-colors cursor-pointer"
                            title="React"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyTo(msg);
                              inputRef.current?.focus();
                            }}
                            className="p-1 hover:text-[#ff90e8] text-zinc-400 transition-colors cursor-pointer"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyMessageText(msg.id, msg.text);
                            }}
                            className="p-1 hover:text-emerald-400 text-zinc-400 transition-colors cursor-pointer"
                            title="Copy"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Inline Quick Reply Button next to message */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(msg);
                          inputRef.current?.focus();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 active:scale-95 rounded-full transition-all text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
                        title="Reply to message"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

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

                    {/* Message Timestamp & Read Status */}
                    <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-zinc-400 font-medium">
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.isMe && (
                        <span className="flex items-center ml-0.5" title={msg.read ? 'Read by partner' : 'Sent (Unread)'}>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </SwipeableDmRow>
              ))}

              {/* Partner Live Typing indicator */}
              {partnerTyping && (
                <div className="flex items-center gap-1.5 py-1.5 px-3 bg-[#27272a] border border-zinc-700/60 text-xs font-semibold rounded-2xl rounded-bl-xs w-fit text-zinc-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-zinc-400 ml-1">@{keptConnection.username} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview Bar above input */}
            {replyTo && (
              <div className="bg-[#1e1e24] border-t border-x border-zinc-700/80 px-3.5 py-2 flex items-center justify-between gap-2 text-xs rounded-t-2xl animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2 min-w-0 border-l-3 border-[#ffc900] pl-2.5">
                  <CornerUpLeft className="w-3.5 h-3.5 text-[#ffc900] shrink-0" />
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#ffc900] text-[11px] truncate leading-tight">
                      Replying to {replyTo.senderName === currentUser?.username ? 'yourself' : `@${replyTo.senderName}`}
                    </p>
                    <p className="text-zinc-300 text-[11.5px] truncate leading-tight mt-0.5">{replyTo.text}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Cancel Reply"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="bg-[#18181b] border-t border-zinc-800 p-2.5 sm:p-3 flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Message @${keptConnection.username}...`}
                className="flex-1 bg-[#27272a] hover:bg-[#2f2f35] focus:bg-[#27272a] text-[13.5px] text-white placeholder-zinc-500 px-4 py-2 rounded-full border border-zinc-700 focus:border-zinc-500 focus:outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-full bg-[#ffc900] hover:bg-[#ffd633] disabled:opacity-20 disabled:hover:bg-[#ffc900] text-black flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 shadow-sm font-bold"
                title="Send Message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════
             VIEW B: MESSENGER-STYLE FRIENDS & CHATS LIST
             ═══════════════════════════════════════════════════════════════════════ */
          <>
            {/* Header */}
            <header className="bg-[#18181b] border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between gap-2 shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => (goBack ? goBack() : setViewState('landing'))}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Back to Home"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight leading-tight">
                      Chats
                    </h1>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium">Your kept connections &amp; direct messages</p>
                </div>
              </div>
            </header>

            {/* Messenger Conversation List Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-[#121214]">
              {/* 1:1 Rule Notice Banner */}
              <div className="p-3 bg-zinc-900/90 flex items-start gap-2.5 text-xs text-zinc-300">
                <Shield className="w-4 h-4 text-[#ffc900] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="text-[11px] text-zinc-400">
                    You can only hold 1 active friend connection at a time. To connect with someone new from chat, you must unfriend your current contact.
                  </p>
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Active Friends ({keptConnection ? '1' : '0'})
                </h3>
              </div>

              {/* Friend Conversation Card */}
              <div
                onClick={() => setActiveChatOpen(true)}
                className="group p-3.5 hover:bg-[#202024] cursor-pointer transition-all shadow-sm active:scale-[0.99] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <img
                      src={keptConnection.avatar_url || getAvatarForPseudonym(keptConnection.username)}
                      alt={keptConnection.username}
                      className="w-12 h-12 rounded-full border-2 border-zinc-700 object-cover bg-zinc-900"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#18181b] transition-all ${
                        isPartnerOnline
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                          : 'bg-zinc-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <p className="font-extrabold text-sm text-white truncate">
                          @{keptConnection.username}
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                        {lastMessage ? formatTime(lastMessage.timestamp) : (keptConnection.last_chat_date || 'Recent')}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                      {partnerTyping ? (
                        <span className="text-amber-400 font-bold animate-pulse">typing...</span>
                      ) : lastMessage ? (
                        <>
                          <span className="font-semibold text-zinc-300">
                            {lastMessage.isMe ? 'You: ' : ''}
                          </span>
                          <span className="truncate">{lastMessage.text}</span>
                        </>
                      ) : (
                        <span className="text-zinc-500 italic">Connected · Tap to chat</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemoveConfirm(true);
                    }}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Unfriend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          </>
        )
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           VIEW C: EMPTY STATE (NO MUTUALS)
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4 bg-[#121214]">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center mx-auto shadow-md overflow-hidden p-2">
            <DotLottieReact
              src="/animated-assets/cool.lottie"
              loop
              autoplay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              No mutuals yet
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Found someone in chat worth keeping even after they skip? Tap <span className="font-bold text-[#ff90e8]">&ldquo;Worth keeping? Add friend&rdquo;</span> at the end of a chat session to save your 1 connection and chat with them!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setViewState('queue')}
              className="w-full sm:w-auto px-6 py-3 bg-[#ffc900] hover:bg-[#ffd633] text-black font-black text-xs sm:text-sm rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <span>Look for someone</span>
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal (Dark Mode) */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowRemoveConfirm(false)}
        >
          <div
            className="bg-[#18181b] border-2 border-zinc-700 rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Unfriend?</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to remove <span className="font-bold text-white">@{keptConnection?.username}</span>? This will clear your direct message history and free up your 1 friend slot.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs rounded-xl border border-zinc-600 cursor-pointer transition-colors"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  removeKeptConnection();
                  setShowRemoveConfirm(false);
                  setActiveChatOpen(false);
                }}
                className="flex-1 py-2 bg-[#dc341e] hover:bg-red-700 text-white font-black text-xs rounded-xl border border-black shadow-xs cursor-pointer transition-colors"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
