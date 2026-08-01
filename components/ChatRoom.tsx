'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../lib/types';
import { useChatStore } from '../lib/store/useChatStore';
import { useBroadcastStore } from '../lib/store/useBroadcastStore';
import { roomManager } from '../lib/realtime/roomManager';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { filterProfanity } from '../lib/utils/safety';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { ReportModal } from './ReportModal';
import { FeedbackModal } from './FeedbackModal';
import { AnimatedReactionPicker, AnimatedReactionBadge } from './AnimatedReactionPicker';
import {
  Send,
  Image as ImageIcon,
  Smile,
  ShieldAlert,
  UserX,
  FastForward,
  CornerUpLeft,
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
  Megaphone,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
    broadcastAnnouncement,
    setShowFeedbackModal,
  } = useChatStore();

  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

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

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);

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

  // Loudspeaker Broadcast Booking Modal state
  const [showLoudspeakerModal, setShowLoudspeakerModal] = useState(false);
  const [loudspeakerText, setLoudspeakerText] = useState('');
  const [loudspeakerError, setLoudspeakerError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'maya' | 'credits'>('gcash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleLoudspeakerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoudspeakerError(null);

    if (!loudspeakerText.trim()) {
      setLoudspeakerError('Please enter your announcement message.');
      return;
    }

    const modResult = analyzeContentModeration(loudspeakerText);
    const { cleanText, isFlagged } = filterProfanity(loudspeakerText);

    if (modResult.contains_profanity || modResult.recommended_action === 'block' || isFlagged) {
      setLoudspeakerError(
        modResult.reason || '⚠️ Message blocked: Contains inappropriate profanity. Please keep loudspeaker announcements friendly!'
      );
      return;
    }

    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowLoudspeakerModal(false);
      setLoudspeakerText('');

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}

      const senderName = currentUser ? currentUser.username : 'Anonymous Student';
      
      // Post to Global Broadcast System queue/active banner
      useBroadcastStore.getState().createBroadcast({
        title: `📢 A message from @${senderName}`,
        description: cleanText,
        owner_name: senderName,
        duration_minutes: 30,
      });

      broadcastAnnouncement(`📢 A message from @${senderName}: ${cleanText}`);
    }, 1200);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const resetInactivity = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityAlert(false);
  }, []);

  // Monitor 20 seconds of user inactivity
  useEffect(() => {
    if (partnerLeft) return;

    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= 20000 && !showInactivityAlert) {
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
    // Only scroll when new messages arrive or when partner STARTS typing (not when stopping typing)
    if (messages.length > 0 || (partnerTyping && !prevTypingRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevTypingRef.current = partnerTyping;
  }, [messages, partnerTyping]);

  // Auto-inject live broadcast announcement card into the chatroom conversation feed
  useEffect(() => {
    const activeBcast = useBroadcastStore.getState().activeBroadcast;
    if (activeRoom && activeBcast && (activeBcast.description || activeBcast.title)) {
      const annMsgId = 'msg_ann_' + activeBcast.id;
      const currentMsgs = useChatStore.getState().messages;
      if (!currentMsgs.some((m) => m.id === annMsgId)) {
        const annMsg: ChatMessage = {
          id: annMsgId,
          room_id: activeRoom.id,
          sender_id: 'system_announcement',
          sender_username: '📢 Campus Announcement',
          message: activeBcast.description || activeBcast.title,
          created_at: activeBcast.starts_at || new Date().toISOString(),
        };
        try {
          useChatStore.setState({ messages: [...currentMsgs, annMsg] });
          roomManager.injectSystemMessage(annMsg);
        } catch (e) {}
      }
    }
  }, [activeRoom?.id, messages.length]);

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

  const partner = activeRoom.user_two;

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
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden overscroll-none touch-pan-y">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-[#d1d5dc] px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-20">
        {/* Partner Info */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={partner.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${partner.username}`}
              alt={partner.username}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#f4f4f0] border-2 transition-all duration-500 ${
                partnerLeft ? 'border-red-400 opacity-50 grayscale' : 'border-black'
              }`}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white transition-all duration-500 ${
                partnerLeft ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className={`font-extrabold text-sm sm:text-base leading-tight transition-colors duration-300 ${
                partnerLeft ? 'text-gray-400 line-through' : 'text-black'
              }`}>
                {partner.username}
              </h3>
              {partnerLeft && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse border ${
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
            <p className={`text-[11px] sm:text-xs font-medium transition-colors duration-300 ${
              partnerLeft ? 'text-gray-400' : 'text-[#242423]'
            }`}>
              {partner.department.replace('College of ', '')}
            </p>
          </div>
        </div>

        {/* Action Buttons: Report, Block, Exit, Next */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded border border-[#d1d5dc]"
            title="Report User"
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={blockPartner}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded border border-[#d1d5dc]"
            title="Block User"
          >
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={leaveRoom}
            className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 flex items-center gap-1 transition-colors"
            title="Exit Chat"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs font-semibold hidden md:inline">Exit</span>
          </button>

          <button
            type="button"
            onClick={nextMatch}
            className="btn-gumroad-primary text-xs py-1.5 px-2 sm:px-4"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Next Chat</span>
          </button>
        </div>
      </div>

      {/* Loudspeaker Campus Announcement Booking Bar (Temporarily commented pending GCash Business approval) */}
      {/* <div className="bg-white border-b-2 border-black px-3 sm:px-6 py-2 flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#fff1f3] border-2 border-black flex items-center justify-center text-[#701a31] shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Megaphone className="w-4 h-4 text-[#701a31]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-xs sm:text-sm text-black leading-tight">
                Loudspeaker
              </h4>
              <span className="px-2 py-0.5 bg-[#701a31] text-white border border-black text-[10px] font-extrabold rounded-md leading-none">
                Visible to everyone in chat
              </span>
            </div>
            <p className="text-[11px] text-[#242423] truncate mt-0.5">
              Book a short announcement for the chat room.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLoudspeakerModal(true)}
          className="btn-gumroad-primary text-xs px-3.5 py-1.5 bg-[#701a31] hover:bg-[#4d0d1f] text-white border-2 border-black font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0"
        >
          Book
        </button>
      </div> */}

      {/* Message Feed Area — flex-1 min-h-0 fills remaining space and scrolls internally */}
      <div className="bg-[#fbf9f5] flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 overscroll-contain">
        {messages.map((msg) => {
          if (msg.reaction_update || (!msg.message?.trim() && !msg.image_url && !msg.id.startsWith('msg_ann_') && msg.sender_id !== 'system')) {
            return null;
          }

          const isSystem = msg.sender_id === 'system';
          const isMe = msg.sender_id === currentUser.id;

          if (isSystem || msg.sender_id === 'system_announcement' || msg.id.startsWith('msg_ann_')) {
            if (msg.sender_id === 'system_announcement' || msg.id.startsWith('msg_ann_')) {
              const displayMessage = msg.message?.replace(/^\[ADMIN\]\s*/i, '') || '';

              return (
                <div key={msg.id} className="my-3.5 p-3.5 sm:p-4 bg-[#fff1f3] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-black animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap sm:flex-nowrap">
                    <span className="px-3 py-1 bg-[#701a31] text-white border-2 border-black text-[10px] sm:text-xs font-extrabold rounded-full uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                      📢 ADMIN NA GWAPO
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-black/70 shrink-0">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold leading-relaxed text-black">
                    {displayMessage}
                  </p>
                </div>
              );
            }

            if (msg.message?.includes('Profanity Warning')) {
              return (
                <div key={msg.id} className="my-3 p-3.5 bg-[#dc341e]/10 border-2 border-[#dc341e] rounded-2xl shadow-sm text-black animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#dc341e] text-white text-[10px] font-extrabold rounded uppercase tracking-wider">
                      ⚠️ Profanity Warning
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#dc341e] leading-relaxed">{msg.message}</p>
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
                <span className="inline-block bg-white border border-[#d1d5dc] text-xs font-semibold px-4 py-1.5 rounded-full text-black">
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
                <span className="text-[11px] font-bold text-[#242423]">
                  {isMe ? 'You' : msg.sender_username}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Reply Reference Bubble */}
              {msg.reply_to && (
                <div className="mb-1 p-2 bg-white/70 border-l-2 border-black rounded text-xs text-[#242423]">
                  <span className="font-bold">{msg.reply_to.sender_username}:</span> {msg.reply_to.message}
                </div>
              )}

              {/* Smooth Floating Animated Reaction Picker (positioned directly above message) */}
              {activePickerMsgId === msg.id && (
                <div className="mb-2.5 relative z-40 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 drop-shadow-xl">
                  <AnimatedReactionPicker
                    onSelectReaction={(key) => {
                      toggleReaction(msg.id, key);
                      setActivePickerMsgId(null);
                    }}
                    onClose={() => setActivePickerMsgId(null)}
                  />
                </div>
              )}

              {/* Message Bubble + Inline Quick Reply Action Row */}
              <div className={`flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Main Message Content */}
                <div
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={`p-3.5 rounded-[12px] border text-sm relative select-none cursor-pointer flex-1 min-w-0 ${
                    isMe
                      ? msg.is_profane
                        ? 'bg-red-950 text-white border-red-600 rounded-tr-none'
                        : 'bg-black text-white border-black rounded-tr-none'
                      : msg.is_profane
                      ? 'bg-red-50 text-black border-red-400 rounded-tl-none'
                      : 'bg-white text-black border-[#d1d5dc] rounded-tl-none'
                  }`}
                >
                  {msg.message && <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>}

                  {msg.image_url && (
                    <div className="mt-2 rounded overflow-hidden border border-[#d1d5dc]">
                      <img
                        src={msg.image_url}
                        alt="Uploaded media"
                        className="max-h-60 w-auto object-cover rounded"
                      />
                    </div>
                  )}

                  {/* Quick Action Toolbar on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 bg-white border border-black rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm text-black z-10">
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
                  className="p-1.5 text-gray-400 hover:text-black hover:bg-black/5 active:scale-95 rounded-full transition-all shrink-0"
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
            <div className="flex items-center gap-2 text-xs text-[#242423] font-medium bg-white px-3 py-1.5 rounded-full border border-[#d1d5dc] w-fit animate-pulse">
              <span className="w-2 h-2 rounded-full bg-black animate-bounce" />
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
              <p className="text-sm font-extrabold text-black">
                {partnerLeftReason === 'inactivity'
                  ? 'User Disconnected (Inactivity)'
                  : partnerLeftReason === 'exited'
                  ? 'Partner Exited Chat'
                  : partnerLeftReason === 'skipped'
                  ? 'Partner Skipped Chat'
                  : 'Connection Ended'}
              </p>
              
              {/* Ended Chat Indicator with Report / Block & Feedback Prompt */}
              <div className="text-xs text-[#242423] space-y-1.5 pt-1">
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

                <p className="text-[11px] font-bold tracking-wider uppercase text-gray-500 pt-1">
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

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar Overlay */}
      {replyTo && (
        <div className="bg-[#ffc900] border-x border-t border-black p-2 text-xs text-black font-medium flex items-center justify-between">
          <div className="truncate">
            Replying to <span className="font-bold">{replyTo.sender_username}</span>: "{replyTo.message}"
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-black/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="bg-[#dc341e] text-white p-2 text-xs font-semibold flex items-center justify-between">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Disconnected action bar — replaces input when partner leaves */}
      {partnerLeft ? (
        <div className="bg-white border-t border-[#d1d5dc] p-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-20 animate-in slide-in-from-bottom-1 duration-200">
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
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={leaveRoom}
              className="btn-gumroad-ghost text-xs px-4 py-2"
            >
              <span>Stay Here</span>
            </button>
            <button
              type="button"
              onClick={nextMatch}
              className="btn-gumroad-primary text-xs px-4 py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Find Next Chat</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-t border-[#d1d5dc] p-2 sm:p-2.5 relative shrink-0 z-20">
          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-3 bg-white border-2 border-black p-3 rounded-lg flex items-center gap-2 flex-wrap shadow-lg z-30">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Exit / Leave Chat Button */}
            <button
              type="button"
              onClick={leaveRoom}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 flex items-center gap-1 transition-colors shrink-0"
              title="Exit Chat"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold hidden md:inline">Exit</span>
            </button>

            {/* File Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-[#242423] hover:text-black hover:bg-gray-100 rounded"
              title="Upload Image (Max 10MB)"
            >
              {isUploading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Emoji Picker Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-[#242423] hover:text-black hover:bg-gray-100 rounded"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder="Type a message to fellow CU student..."
              className="gumroad-input flex-1 py-2 text-sm"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() && !replyTo}
              className="btn-gumroad-primary py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-black rounded-[16px] max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#d1d5dc] pb-3">
              <h3 className="font-extrabold text-base text-black flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#ffc900]" />
                Image Preview
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setCaptionText('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f4f4f0] rounded-xl p-2 flex items-center justify-center border border-[#d1d5dc]">
              <img
                src={pendingImage.previewUrl}
                alt="Image Preview"
                className="max-h-64 sm:max-h-80 w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#242423] uppercase tracking-wider mb-1">
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
                className="gumroad-input w-full py-2.5 px-3 text-sm"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#d1d5dc]">
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setCaptionText('');
                }}
                className="btn-gumroad-ghost text-xs px-4 py-2.5"
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

      {/* 20s Inactivity Timeout Warning Modal */}
      {showInactivityAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-black rounded-[16px] max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#ffc900] border-2 border-black flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-7 h-7 text-black" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-black tracking-tight">
                Are You Still There?
              </h3>
              <p className="text-xs sm:text-sm text-[#242423] mt-1.5 leading-relaxed">
                You've been inactive for <span className="font-bold text-black">20 seconds</span>. Please confirm you are still active, or this chat will automatically end in:
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

      {/* Loudspeaker Booking & Demo Checkout Modal (Temporarily commented pending GCash Business approval) */}
      {/* {showLoudspeakerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-3xl max-w-lg w-full text-left shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => {
                setShowLoudspeakerModal(false);
                setLoudspeakerError(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-black/10 rounded-full transition-colors text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#00e599] border border-black text-black text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                📣 Loudspeaker Announcement
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight">
              Book Campus Loudspeaker 📢
            </h3>
            <p className="text-xs text-[#242423] mt-1 mb-4 leading-relaxed">
              Broadcast a custom live announcement card to <strong>all active students</strong> across every chatroom!
            </p>

            {loudspeakerError && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{loudspeakerError}</span>
              </div>
            )}

            <form onSubmit={handleLoudspeakerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#242423] uppercase mb-1">
                  Your Broadcast Announcement Text
                </label>
                <textarea
                  rows={3}
                  value={loudspeakerText}
                  onChange={(e) => setLoudspeakerText(e.target.value)}
                  maxLength={150}
                  placeholder="e.g. Shoutout to Nursing Batch 2026 studying in the library! 🥳"
                  className="w-full p-3 text-xs sm:text-sm border-2 border-black rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-[#f4f4f0] text-black"
                />
                <span className="text-[10px] font-bold text-gray-500 float-right mt-1">
                  {loudspeakerText.length}/150
                </span>
              </div>

              <div className="p-4 bg-[#f4f4f0] border-2 border-black rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-black uppercase flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    Payment Gateway (Demo)
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 bg-black text-white rounded-full">
                    ₱20.00 / Broadcast
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('gcash')}
                    className={`p-2.5 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'gcash'
                        ? 'bg-blue-600 text-white border-black shadow-sm'
                        : 'bg-white text-black border-black/30 hover:border-black'
                    }`}
                  >
                    <span>💙 GCash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('maya')}
                    className={`p-2.5 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'maya'
                        ? 'bg-emerald-600 text-white border-black shadow-sm'
                        : 'bg-white text-black border-black/30 hover:border-black'
                    }`}
                  >
                    <span>💚 Maya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credits')}
                    className={`p-2.5 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'credits'
                        ? 'bg-amber-400 text-black border-black shadow-sm'
                        : 'bg-white text-black border-black/30 hover:border-black'
                    }`}
                  >
                    <span>🟡 Credits</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center font-medium">
                  🔒 Demo Checkout Mode Enabled — No actual money will be charged.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoudspeakerModal(false)}
                  className="btn-gumroad-ghost text-xs px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="btn-gumroad-primary text-xs px-6 py-2.5 bg-[#00e599] hover:bg-[#00c985] text-black border-black font-extrabold flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}
      {/* Feedback & Bug Report Modal */}
      <FeedbackModal />
    </div>
  );
};
