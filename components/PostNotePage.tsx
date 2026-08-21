'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomPollOption } from '../lib/types';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  Link as LinkIcon,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';

const PSEUDONYMS = [
  'BraveTiger', 'SilentOwl', 'HappyPanda', 'CyberEagle', 'NightFalcon',
  'GoldenLion', 'CrimsonFox', 'SwiftOtter', 'WiseDolphin', 'CalmKoala',
  'ZenWolf', 'ChillCapy', 'StarlightBear', 'UrbanHawk', 'MidnightCat'
];

interface CampusGifItem {
  title: string;
  url: string;
}

interface CampusGifCategory {
  id: string;
  name: string;
  gifs?: CampusGifItem[];
}

const CAMPUS_GIF_COLLECTIONS: CampusGifCategory[] = [
  { id: 'all', name: 'All' },
  {
    id: 'reactions',
    name: 'Reactions',
    gifs: [
      { title: 'Excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
      { title: 'Victory', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
      { title: 'High Five', url: 'https://media.giphy.com/media/l0amJzVHIAfl7jMDos/giphy.gif' },
      { title: 'Hype', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
    ],
  },
  {
    id: 'study',
    name: 'Study',
    gifs: [
      { title: 'Studying Late', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif' },
      { title: 'Need Coffee', url: 'https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/giphy.gif' },
      { title: 'Typing Fast', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
      { title: 'Overwhelmed', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
    ],
  },
  {
    id: 'mood',
    name: 'Mood',
    gifs: [
      { title: 'Confused', url: 'https://media.giphy.com/media/3o7TKTDnUxE0g2BTSE/giphy.gif' },
      { title: 'Facepalm', url: 'https://media.giphy.com/media/14aUO0Mf651jeU/giphy.gif' },
      { title: 'Sipping Tea', url: 'https://media.giphy.com/media/3o85xGocUH8RY0WoKs/giphy.gif' },
      { title: 'Fine', url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif' },
    ],
  },
];

const POST_COLORS = [
  { name: 'Gold', hex: '#ffc900' },
  { name: 'Pink', hex: '#ff90e8' },
  { name: 'Mint', hex: '#00e599' },
  { name: 'Sky', hex: '#7dd3fc' },
  { name: 'Maroon', hex: '#701a31' },
  { name: 'Crimson', hex: '#c41e3a' },
];

export const PostNotePage: React.FC = () => {
  const {
    currentUser,
    freedomPosts,
    addFreedomPost,
    setViewState,
    goBack,
    setTargetPostId,
  } = useChatStore();

  const isAdminUser = typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true';
  const [postAsAdmin, setPostAsAdmin] = useState(isAdminUser);

  const [alias, setAlias] = useState(currentUser ? currentUser.username : 'Anon Student');
  const [department, setDepartment] = useState<string>(currentUser ? currentUser.department : 'General');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffc900');
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNoteSentSuccess, setIsNoteSentSuccess] = useState(false);

  // Attached Media State
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'gif'; name?: string } | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifCategory, setGifCategory] = useState('all');
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Poll state
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [pollOption3, setPollOption3] = useState('');
  const [pollOption4, setPollOption4] = useState('');
  const [pollOptionsCount, setPollOptionsCount] = useState(2);

  // Rate limit / cooldown
  const COOLDOWN_SECONDS = 60;
  const DAILY_MAX_POSTS = 10;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailyPostCount, setDailyPostCount] = useState<number>(0);
  const [honeypot, setHoneypot] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistentId = getOrCreatePersistentUUID();
      setDeviceId(persistentId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLimits = () => {
      if (isAdminUser) {
        setCooldownRemaining(0);
        return;
      }
      const lastTs = localStorage.getItem('capitalk_wall_last_post_ts');
      if (lastTs) {
        const elapsed = (Date.now() - parseInt(lastTs, 10)) / 1000;
        if (elapsed < COOLDOWN_SECONDS) {
          setCooldownRemaining(Math.ceil(COOLDOWN_SECONDS - elapsed));
        } else {
          setCooldownRemaining(0);
        }
      }

      try {
        const rawHistory = localStorage.getItem('capitalk_wall_post_history');
        if (rawHistory) {
          const timestamps: number[] = JSON.parse(rawHistory);
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const validHistory = timestamps.filter((ts) => ts > oneDayAgo);
          setDailyPostCount(validHistory.length);
        }
      } catch (e) {}
    };

    checkLimits();
    const interval = setInterval(checkLimits, 1000);
    return () => clearInterval(interval);
  }, [isAdminUser]);

  const handleRandomizeAlias = () => {
    const randomIdx = Math.floor(Math.random() * PSEUDONYMS.length);
    const chosen = PSEUDONYMS[randomIdx];
    const randNum = Math.floor(100 + Math.random() * 900);
    setAlias(`${chosen}#${randNum}`);
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    setIsProcessingMedia(true);

    try {
      if (file.type === 'image/gif') {
        if (file.size > 3 * 1024 * 1024) {
          throw new Error('GIF exceeds 3MB limit.');
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAttachedMedia({ url: dataUrl, type: 'gif', name: file.name });
          setIsProcessingMedia(false);
        };
        reader.onerror = () => {
          setMediaError('Failed to read GIF.');
          setIsProcessingMedia(false);
        };
        reader.readAsDataURL(file);
      } else if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        const processed = await processUploadedImage(file, 900, 240, 0.72);
        let finalMediaUrl = processed.fullDataUrl;

        try {
          const blobRes = await fetch(processed.fullDataUrl);
          const blob = await blobRes.blob();
          const formData = new FormData();
          formData.append('file', blob, processed.fileName);

          const uploadReq = await fetch('/api/freedom-wall/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadReq.ok) {
            const uploadJson = await uploadReq.json();
            if (uploadJson.success && uploadJson.url) {
              finalMediaUrl = uploadJson.url;
            }
          }
        } catch (uploadErr) {
          console.warn('API upload fallback to webp data URL:', uploadErr);
        }

        setAttachedMedia({ url: finalMediaUrl, type: 'image', name: processed.fileName });
        setIsProcessingMedia(false);
      } else {
        throw new Error('Please upload JPG, PNG, WEBP, or GIF.');
      }
    } catch (err: any) {
      setMediaError(err?.message || 'Error processing image.');
      setIsProcessingMedia(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectPresetGif = (gifUrl: string) => {
    setAttachedMedia({ url: gifUrl, type: 'gif' });
    setShowGifModal(false);
    setMediaError(null);
  };

  const handleApplyCustomUrl = () => {
    if (!customMediaUrl.trim()) return;
    const cleanUrl = customMediaUrl.trim();
    const isGif = cleanUrl.toLowerCase().includes('.gif');
    setAttachedMedia({ url: cleanUrl, type: isGif ? 'gif' : 'image' });
    setCustomMediaUrl('');
    setShowCustomUrlInput(false);
    setMediaError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    if (!message.trim() || message.length > 300) {
      setModerationError('Message must be between 1 and 300 characters.');
      return;
    }

    if (!postAsAdmin && !isAdminUser) {
      if (cooldownRemaining > 0) {
        setModerationError(`Please wait ${cooldownRemaining}s before sharing again.`);
        return;
      }
      if (dailyPostCount >= DAILY_MAX_POSTS) {
        setModerationError(`Daily limit of ${DAILY_MAX_POSTS} notes reached.`);
        return;
      }
      const isDuplicate = (freedomPosts || [])
        .slice(0, 20)
        .some((p) => p.message.trim().toLowerCase() === message.trim().toLowerCase());
      if (isDuplicate) {
        setModerationError('An identical note was recently shared.');
        return;
      }
    }

    const modResult = analyzeContentModeration(message);
    if (modResult.contains_profanity) {
      setModerationError(`Message contains inappropriate language (${modResult.matched_terms.join(', ')}).`);
      return;
    }

    let pollOptionsList: FreedomPollOption[] | undefined = undefined;
    let finalPollQuestion: string | undefined = undefined;

    if (showPollForm) {
      const rawOptions = [pollOption1, pollOption2, pollOption3, pollOption4]
        .slice(0, pollOptionsCount)
        .map((opt) => opt.trim())
        .filter(Boolean);

      if (rawOptions.length < 2) {
        setModerationError('Please provide at least 2 options for the poll.');
        return;
      }

      for (const opt of rawOptions) {
        const check = analyzeContentModeration(opt);
        if (check.contains_profanity) {
          setModerationError(`Poll option contains inappropriate term ("${check.matched_terms.join(', ')}").`);
          return;
        }
      }

      finalPollQuestion = pollQuestion.trim() || message.trim();
      pollOptionsList = rawOptions.map((optText, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text: optText,
        votes_count: 0,
        voted_users: [],
      }));
    }

    setIsSubmitting(true);
    try {
      const authorAlias = postAsAdmin
        ? 'Admin'
        : (currentUser ? currentUser.username : (alias.trim() || 'Anon Student'));

      const authorDepartment = postAsAdmin
        ? 'University Administration'
        : (currentUser ? currentUser.department : (department || 'General'));

      const authorAvatar = postAsAdmin
        ? '/avatars/coin-left.jpg'
        : (currentUser?.avatar_url || getAvatarForPseudonym(authorAlias));

      const newPostId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const success = await addFreedomPost({
        author_alias: authorAlias,
        department: authorDepartment,
        author_avatar: authorAvatar,
        author_bio: currentUser?.bio || '',
        message: message.trim(),
        color: postAsAdmin ? '#701a31' : selectedColor,
        is_admin: postAsAdmin,
        image_url: attachedMedia?.url,
        image_type: attachedMedia?.type,
        poll_question: finalPollQuestion,
        poll_options: pollOptionsList,
      }, honeypot, deviceId);

      if (success) {
        if (!postAsAdmin && !isAdminUser) {
          const now = Date.now();
          localStorage.setItem('capitalk_wall_last_post_ts', String(now));
          try {
            const rawHistory = localStorage.getItem('capitalk_wall_post_history');
            const history: number[] = rawHistory ? JSON.parse(rawHistory) : [];
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const updated = [...history.filter((ts) => ts > oneDayAgo), now];
            localStorage.setItem('capitalk_wall_post_history', JSON.stringify(updated));
          } catch (e) {}
        }

        setTargetPostId(newPostId);
        setIsNoteSentSuccess(true);
        setTimeout(() => {
          setViewState('freedom_wall');
        }, 2200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAuthorAlias = postAsAdmin
    ? 'Admin'
    : (currentUser ? currentUser.username : (alias.trim() || 'Anon Student'));

  const currentAuthorDept = postAsAdmin
    ? 'University Administration'
    : (currentUser ? currentUser.department : (department || 'General'));

  const previewAvatar = postAsAdmin
    ? '/avatars/coin-left.jpg'
    : (currentUser?.avatar_url || getAvatarForPseudonym(currentAuthorAlias));

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black pb-12">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Error Alert */}
        {moderationError && (
          <div className="mb-4 p-3 bg-rose-100 border-2 border-black rounded-xl text-black font-bold text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{moderationError}</span>
            <button type="button" onClick={() => setModerationError(null)} className="p-0.5 hover:bg-black/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form (7 cols on desktop) */}
          <div className="lg:col-span-7 bg-white border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Admin Mode Switcher */}
              {isAdminUser && (
                <div className="p-3 bg-[#701a31] border-2 border-black rounded-xl text-white flex items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-xs font-black text-[#ffc900] block">Admin Mode</span>
                    <span className="text-[10px] text-white/80 font-medium">Post official university note</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={postAsAdmin}
                      onChange={(e) => {
                        setPostAsAdmin(e.target.checked);
                        if (e.target.checked) setSelectedColor('#701a31');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffc900]"></div>
                  </label>
                </div>
              )}

              {/* Alias & Department Stack (Locked to registered user profile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-800 uppercase mb-1.5 flex items-center justify-between">
                    <span>Author</span>
               
                  </label>
                  <div className="flex items-center gap-2 h-10 px-3 border-2 border-black rounded-xl bg-[#f4f4f0] text-black shadow-xs select-none">
                    <img
                      src={previewAvatar}
                      alt={currentAuthorAlias}
                      className="w-5 h-5 rounded-full border border-black object-cover bg-amber-100 shrink-0"
                    />
                    <span className="flex-1 text-xs font-bold truncate">
                      {currentAuthorAlias}
                    </span>
                    <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-800 uppercase mb-1.5 flex items-center justify-between">
                    <span>Department</span>
                  </label>
                  <div className="flex items-center justify-between h-10 px-3 border-2 border-black rounded-xl bg-[#f4f4f0] text-black shadow-xs select-none">
                    <span className="text-xs font-bold truncate">
                      {currentAuthorDept}
                    </span>
                    <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Note Colors */}
              {!postAsAdmin && (
                <div className="pt-1">
                  <label className="block text-xs font-bold text-gray-800 uppercase mb-1.5">
                    Note Color
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {POST_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-8 h-8 rounded-full border-2 border-black transition-all flex items-center justify-center cursor-pointer ${
                          selectedColor === c.hex
                            ? 'scale-110 shadow-xs ring-2 ring-black'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.name}
                      >
                        {selectedColor === c.hex && (
                          <Check className={`w-4 h-4 ${c.hex === '#701a31' || c.hex === '#c41e3a' ? 'text-white' : 'text-black'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-800 uppercase">
                    Message
                  </label>
                  <span className="text-xs font-bold text-gray-500">
                    {message.length}/300
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={300}
                  placeholder="Type your message here..."
                  className="w-full p-3 text-xs sm:text-sm border-2 border-black rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-black bg-[#f4f4f0] text-black leading-relaxed"
                />
              </div>

              {/* Media Attachment */}
              <div className="p-3.5 bg-[#f4f4f0] border-2 border-black rounded-xl space-y-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleMediaFileChange}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase">
                    Media Attachment
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">Image / GIF</span>
                </div>

                {mediaError && (
                  <div className="p-2 bg-rose-100 border border-black rounded-lg text-black text-xs font-bold flex items-center gap-2">
                    <span className="flex-1">{mediaError}</span>
                    <button type="button" onClick={() => setMediaError(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {attachedMedia ? (
                  <div className="p-2 bg-white border-2 border-black rounded-xl flex items-center gap-3">
                    <img
                      src={attachedMedia.url}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-black shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-black truncate block">
                        {attachedMedia.name || (attachedMedia.type === 'gif' ? 'Reaction GIF' : 'Image Attachment')}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        {attachedMedia.type === 'gif' ? 'GIF Format' : 'WebP Format'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedMedia(null)}
                      className="p-2 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer shrink-0 transition-colors"
                      title="Remove media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingMedia}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 h-9 px-3 rounded-xl border-2 border-black bg-white hover:bg-gray-100 text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {isProcessingMedia ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Upload Image</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowGifModal(true)}
                        className="h-9 px-3 rounded-xl border-2 border-black bg-[#ff90e8] hover:bg-[#ff7be3] text-black text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>GIFs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                        className={`h-9 px-3 rounded-xl border-2 border-black cursor-pointer shadow-xs active:scale-95 shrink-0 flex items-center justify-center ${
                          showCustomUrlInput ? 'bg-black text-white' : 'bg-white hover:bg-gray-100 text-black'
                        }`}
                        title="Direct URL"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {showCustomUrlInput && (
                      <div className="p-2 bg-white border border-black rounded-lg flex items-center gap-1.5">
                        <input
                          type="url"
                          value={customMediaUrl}
                          onChange={(e) => setCustomMediaUrl(e.target.value)}
                          placeholder="Paste image or GIF URL..."
                          className="flex-1 p-1.5 text-xs border border-black rounded bg-[#f4f4f0] text-black font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          disabled={!customMediaUrl.trim()}
                          className="px-3 py-1.5 bg-[#00e599] text-black text-xs font-bold rounded border border-black disabled:opacity-50 cursor-pointer"
                        >
                          Attach
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Poll Feature */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPollForm(!showPollForm)}
                  className={`w-full py-2 px-3 rounded-xl border-2 border-black flex items-center justify-between text-xs font-bold cursor-pointer transition-all shadow-xs ${
                    showPollForm ? 'bg-[#ffc900] text-black' : 'bg-[#f4f4f0] hover:bg-gray-200 text-black'
                  }`}
                >
                  <span>{showPollForm ? 'Poll Added' : 'Add Poll'}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-black text-white rounded-md">
                    {showPollForm ? 'Remove' : '+ Poll'}
                  </span>
                </button>

                {showPollForm && (
                  <div className="mt-2.5 p-3.5 bg-amber-50/80 border-2 border-black rounded-xl space-y-2 text-black shadow-xs">
                    <input
                      type="text"
                      maxLength={100}
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Poll question (optional)..."
                      className="w-full p-2 text-xs border-2 border-black rounded-lg font-medium bg-white text-black focus:outline-none"
                    />

                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        maxLength={60}
                        value={pollOption1}
                        onChange={(e) => setPollOption1(e.target.value)}
                        placeholder="Option 1"
                        className="w-full p-2 text-xs border border-black rounded-lg bg-white text-black focus:outline-none"
                      />

                      <input
                        type="text"
                        maxLength={60}
                        value={pollOption2}
                        onChange={(e) => setPollOption2(e.target.value)}
                        placeholder="Option 2"
                        className="w-full p-2 text-xs border border-black rounded-lg bg-white text-black focus:outline-none"
                      />

                      {pollOptionsCount >= 3 && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={60}
                            value={pollOption3}
                            onChange={(e) => setPollOption3(e.target.value)}
                            placeholder="Option 3"
                            className="w-full p-2 text-xs border border-black rounded-lg bg-white text-black focus:outline-none"
                          />
                          {pollOptionsCount === 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPollOption3('');
                                setPollOptionsCount(2);
                              }}
                              className="p-2 border border-black rounded-lg bg-rose-200 text-black text-xs font-bold shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}

                      {pollOptionsCount >= 4 && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={60}
                            value={pollOption4}
                            onChange={(e) => setPollOption4(e.target.value)}
                            placeholder="Option 4"
                            className="w-full p-2 text-xs border border-black rounded-lg bg-white text-black focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPollOption4('');
                              setPollOptionsCount(3);
                            }}
                            className="p-2 border border-black rounded-lg bg-rose-200 text-black text-xs font-bold shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {pollOptionsCount < 4 && (
                        <button
                          type="button"
                          onClick={() => setPollOptionsCount(Math.min(4, pollOptionsCount + 1))}
                          className="w-full py-1.5 px-2 border border-dashed border-black rounded-lg bg-white hover:bg-amber-100 text-black text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Option</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => goBack()}
                  className="px-4 py-2.5 rounded-xl border-2 border-black bg-white hover:bg-gray-100 text-black text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS))}
                  className={`px-6 py-2.5 rounded-xl border-2 border-black text-black font-bold text-xs transition-all cursor-pointer ${
                    isSubmitting || (!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS))
                      ? 'bg-gray-300 opacity-60 cursor-not-allowed'
                      : 'bg-[#ffc900] hover:bg-[#ffb700] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  }`}
                >
                  {isSubmitting
                    ? 'Sharing...'
                    : cooldownRemaining > 0 && !postAsAdmin
                    ? `Wait ${cooldownRemaining}s`
                    : 'Share'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Preview (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-2 lg:sticky lg:top-16">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Preview
            </span>

            {/* Note Card Simulation */}
            <div
              style={{ backgroundColor: postAsAdmin ? '#701a31' : selectedColor }}
              className={`p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                postAsAdmin ? 'text-white' : 'text-black'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-bold rounded-full uppercase">
                  {currentAuthorDept.replace('College of ', '')}
                </span>
                <span className={`text-[10px] ${postAsAdmin ? 'text-[#ffc900]' : 'text-black/70'}`}>
                  Just now
                </span>
              </div>

              {/* Message text */}
              <p className={`text-xs sm:text-sm font-bold leading-relaxed whitespace-pre-wrap break-words mb-3.5 ${postAsAdmin ? 'text-white' : 'text-black'}`}>
                {message.trim() || 'Your note message preview will appear here as you type...'}
              </p>

              {/* Attached Media Preview */}
              {attachedMedia && (
                <div className="mb-3.5 rounded-xl border border-black overflow-hidden bg-black/5">
                  <img
                    src={attachedMedia.url}
                    alt="Attachment Preview"
                    className="w-full max-h-52 object-cover"
                  />
                </div>
              )}

              {/* Poll Preview */}
              {showPollForm && (
                <div className="mb-3.5 p-3 rounded-xl border border-black bg-white/95 text-black space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>{pollQuestion.trim() || 'Poll'}</span>
                    <span className="text-gray-500">0 votes</span>
                  </div>

                  <div className="space-y-1.5">
                    {[pollOption1 || 'Option 1', pollOption2 || 'Option 2', pollOption3, pollOption4]
                      .filter(Boolean)
                      .map((opt, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg border border-black/30 bg-[#f4f4f0] text-xs font-medium flex items-center justify-between"
                        >
                          <span className="truncate">{opt}</span>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Vote</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Footer Author */}
              <div className={`pt-3 border-t flex items-center justify-between gap-2 ${postAsAdmin ? 'border-white/20' : 'border-black/20'}`}>
                <div className="flex items-center gap-2">
                  <img
                    src={previewAvatar}
                    alt={currentAuthorAlias}
                    className="w-6 h-6 rounded-full border border-black object-cover bg-amber-100"
                  />
                  <span className={`text-xs font-bold truncate max-w-[140px] ${postAsAdmin ? 'text-[#ffc900]' : 'text-black'}`}>
                    ~ {currentAuthorAlias}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GIFs Modal */}
      {showGifModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-3">
          <div className="bg-white border-2 border-black p-4 rounded-2xl max-w-md w-full text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-black shrink-0">
              <span className="text-sm font-bold text-black">Select a GIF</span>
              <button
                type="button"
                onClick={() => setShowGifModal(false)}
                className="p-1 hover:bg-black/10 rounded-full text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-black/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gifSearchTerm}
                  onChange={(e) => setGifSearchTerm(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-black rounded-lg bg-[#f4f4f0] text-black font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-2 shrink-0 scrollbar-none">
              {CAMPUS_GIF_COLLECTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGifCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border border-black whitespace-nowrap cursor-pointer ${
                    gifCategory === cat.id
                      ? 'bg-[#ffc900] text-black'
                      : 'bg-white hover:bg-gray-100 text-black'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[180px]">
              {(() => {
                const allGifs: CampusGifItem[] = CAMPUS_GIF_COLLECTIONS.flatMap((c) => (c.gifs ? c.gifs : []));
                const activeCategoryGifs: CampusGifItem[] = gifCategory === 'all'
                  ? allGifs
                  : (CAMPUS_GIF_COLLECTIONS.find((c) => c.id === gifCategory)?.gifs || []);

                const filteredGifs: CampusGifItem[] = gifSearchTerm.trim()
                  ? allGifs.filter((g) => g.title.toLowerCase().includes(gifSearchTerm.toLowerCase()))
                  : activeCategoryGifs;

                if (filteredGifs.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-gray-500 font-medium">
                      No GIFs found
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {filteredGifs.map((gif: CampusGifItem, idx: number) => (
                      <button
                        key={`${gif.url}-${idx}`}
                        type="button"
                        onClick={() => handleSelectPresetGif(gif.url)}
                        className="relative rounded-xl border border-black overflow-hidden bg-black/5 hover:border-black transition-all text-left cursor-pointer"
                      >
                        <img
                          src={gif.url}
                          alt={gif.title}
                          className="w-full h-28 object-cover"
                          loading="lazy"
                        />
                        <div className="p-1 bg-white border-t border-black text-[10px] font-bold text-black truncate">
                          {gif.title}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sent Celebration Overlay (Plain Minimalist Animation) */}
      {isNoteSentSuccess && (
        <div className="fixed inset-0 z-[120] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-xs w-full flex flex-col items-center text-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              <DotLottieReact
                src="/animated-assets/sent.lottie"
                loop={false}
                autoplay={true}
                className="w-full h-full"
              />
            </div>

            <h3 className="text-lg font-extrabold text-black mt-2">
              Note Shared
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              {postAsAdmin
                ? 'Published live to Freedom Wall'
                : 'Submitted for review'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
