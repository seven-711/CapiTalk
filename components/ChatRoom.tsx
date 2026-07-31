'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { filterProfanity } from '../lib/utils/safety';
import { ReportModal } from './ReportModal';
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
} from 'lucide-react';

const EMOJI_PRESETS = ['😊', '😂', '👍', '🔥', '❤️', '😮', '☕', '📚', '🎉', '👋'];

export const ChatRoom: React.FC = () => {
  const {
    currentUser,
    activeRoom,
    messages,
    partnerTyping,
    partnerLeft,
    sendMessage,
    sendTypingSignal,
    nextMatch,
    leaveRoom,
    blockPartner,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      sendMessage(
        undefined,
        processed.fullDataUrl,
        replyTo ? { id: replyTo.id, sender_username: replyTo.sender_username, message: replyTo.message } : undefined
      );
      setReplyTo(null);
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
    <div className="w-full flex-1 flex flex-col h-[calc(100dvh-48px)] sm:h-[calc(100dvh-64px)]">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-[#d1d5dc] px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm shrink-0">
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
                <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full animate-pulse">
                  <WifiOff className="w-2 h-2" />
                  Disconnected
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
            <FastForward className="w-3.5 h-3.5 text-[#ff90e8]" />
            <span className="hidden sm:inline">Next Chat</span>
          </button>
        </div>
      </div>

      {/* Message Feed Area — flex-1 fills all remaining screen space */}
      <div className="bg-[#f4f4f0] flex-1 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
        {messages.map((msg) => {
          const isSystem = msg.sender_id === 'system';
          const isMe = msg.sender_id === currentUser.id;

          if (isSystem) {
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

              {/* Main Message Content */}
              <div
                className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-[12px] border text-sm relative ${
                  isMe
                    ? 'bg-black text-white border-black rounded-tr-none'
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
                    onClick={() => setReplyTo(msg)}
                    className="p-1 hover:text-blue-600"
                    title="Reply"
                  >
                    <CornerUpLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => copyMessageText(msg.id, msg.message)}
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
            </div>
          );
        })}

        {/* Partner Typing Indicator */}
        {partnerTyping && !partnerLeft && (
          <div className="flex items-center gap-2 text-xs text-[#242423] font-medium bg-white px-3 py-1.5 rounded-full border border-[#d1d5dc] w-fit animate-pulse">
            <span className="w-2 h-2 rounded-full bg-black animate-bounce" />
            <span>{partner.username} is typing...</span>
          </div>
        )}

        {/* Partner Disconnected — in-chat system card */}
        {partnerLeft && (
          <div className="flex flex-col items-center gap-3 py-4 my-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-extrabold text-black">Connection Lost</p>
              <p className="text-xs text-[#242423] mt-0.5">
                <span className="font-semibold">{partner.username}</span> has left the conversation.
              </p>
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

      {/* Disconnected sticky action bar — replaces input when partner leaves */}
      {partnerLeft ? (
        <div className="bg-white border-t border-[#d1d5dc] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-2 text-sm">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-semibold text-black">This conversation has ended.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => useChatStore.getState().setViewState('queue')}
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
        <div className="bg-white border-t border-[#d1d5dc] p-3 sm:p-4 relative shrink-0">
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
              className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 flex items-center gap-1 transition-colors shrink-0"
              title="Exit Chat"
            >
              <LogOut className="w-5 h-5" />
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
              className="p-2.5 text-[#242423] hover:text-black hover:bg-gray-100 rounded border border-[#d1d5dc]"
              title="Upload Image (Max 10MB)"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            </button>

            {/* Emoji Picker Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 text-[#242423] hover:text-black hover:bg-gray-100 rounded border border-[#d1d5dc]"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder="Type a message to fellow CU student..."
              className="gumroad-input flex-1 py-2.5 text-sm"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() && !replyTo}
              className="btn-gumroad-primary py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};
