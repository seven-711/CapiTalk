'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomPollOption } from '../lib/types';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Sparkles,
} from 'lucide-react';

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

  // Poll Feature State
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Attached Media State
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'gif'; name?: string } | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifCategory, setGifCategory] = useState('all');
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

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

    let finalPollQuestion: string | undefined = undefined;
    let pollOptionsList: FreedomPollOption[] | undefined = undefined;

    if (showPollForm) {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setModerationError('Please provide at least 2 options for the poll.');
        return;
      }

      for (const opt of validOptions) {
        const check = analyzeContentModeration(opt);
        if (check.contains_profanity) {
          setModerationError(`Poll option contains inappropriate term ("${check.matched_terms.join(', ')}").`);
          return;
        }
      }

      finalPollQuestion = pollQuestion.trim() || message.trim();
      pollOptionsList = validOptions.map((optText, idx) => ({
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
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans pb-16">
      {/* ── Main Composer Container ──────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-6">
        {/* Error Alert */}
        {moderationError && (
          <div className="mx-3 sm:mx-0 my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{moderationError}</span>
            <button type="button" onClick={() => setModerationError(null)} className="p-0.5 hover:bg-rose-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Composer Card with Modern Hairline Styling */}
        <div className="bg-white border-y sm:border border-[#d1d5dc] sm:rounded-2xl p-4 sm:p-6 space-y-4">
          {/* Author Badge Info */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={previewAvatar}
                alt={currentAuthorAlias}
                className="w-9 h-9 rounded-full border border-[#d1d5dc] object-cover bg-amber-50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-black truncate">
                    {currentAuthorAlias}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#fff1f3] text-[#701a31] rounded-md border border-[#701a31]/20 shrink-0">
                    {currentAuthorDept.replace('College of ', '')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Posting to Campus Wall</p>
              </div>
            </div>

            {/* Admin Switcher */}
            {isAdminUser && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#701a31]">
                <input
                  type="checkbox"
                  checked={postAsAdmin}
                  onChange={(e) => {
                    setPostAsAdmin(e.target.checked);
                    if (e.target.checked) setSelectedColor('#701a31');
                  }}
                  className="rounded text-[#701a31] focus:ring-[#701a31]"
                />
                <span>Admin Post</span>
              </label>
            )}
          </div>

          {/* Text Area */}
          <div className="space-y-1">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              placeholder="What's on your mind? Share confession, midterm notes, or campus vibe..."
              className="w-full p-1 text-sm sm:text-base text-black placeholder-gray-400 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none leading-relaxed"
              autoFocus
            />
            <div className="flex justify-end text-[11px] font-medium text-gray-400">
              <span>{message.length}/300</span>
            </div>
          </div>

          {/* Attached Media Preview */}
          {attachedMedia && (
            <div className="relative rounded-xl overflow-hidden border border-[#d1d5dc] bg-gray-50 max-w-md">
              <img
                src={attachedMedia.url}
                alt="Media Preview"
                className="w-full max-h-60 object-contain bg-black/5"
              />
              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer shadow-md"
                title="Remove media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Campus Poll Creator Form */}
          {showPollForm && (
            <div className="p-3 sm:p-4 bg-[#fbfbfa] border border-[#d1d5dc] rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#701a31]" />
                  <span>Campus Poll</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPollForm(false);
                    setPollQuestion('');
                    setPollOptions(['', '']);
                  }}
                  className="text-xs text-gray-400 hover:text-rose-600 font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>

              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll question / topic (optional)"
                maxLength={100}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#d1d5dc] rounded-lg font-medium focus:outline-none focus:border-black transition-colors"
              />

              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      maxLength={60}
                      className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#d1d5dc] rounded-lg font-medium focus:outline-none focus:border-black transition-colors"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs font-bold text-[#701a31] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option ({pollOptions.length}/4)</span>
                </button>
              )}
            </div>
          )}

          {/* Color & Toolbar Actions + Bottom Buttons */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            {/* Color Palette & Media Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!postAsAdmin && (
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[11px] font-bold text-gray-400">Color:</span>
                  {POST_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border border-black/10 transition-all flex items-center justify-center cursor-pointer ${
                        selectedColor === c.hex
                          ? 'ring-2 ring-black scale-110 shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.hex && (
                        <Check className={`w-3 h-3 ${c.hex === '#701a31' || c.hex === '#c41e3a' ? 'text-white' : 'text-black'}`} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Media & Poll Action Buttons */}
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleMediaFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingMedia}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-black transition-colors cursor-pointer"
                  title="Attach Image"
                >
                  {isProcessingMedia ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGifModal(true)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-black transition-colors cursor-pointer"
                  title="Attach GIF"
                >
                  <Film className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPollForm(!showPollForm)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    showPollForm
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                  }`}
                  title={showPollForm ? 'Remove Poll' : 'Add Poll'}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Action Controls (Cancel & Share Note) */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => goBack()}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS)) || !message.trim()}
                className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-black text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : cooldownRemaining > 0 && !postAsAdmin ? (
                  <span>Wait {cooldownRemaining}s</span>
                ) : (
                  <span>Share</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Live Note Preview Card ────────────────────────────────────────── */}
        <div className="space-y-2 mt-5 px-3 sm:px-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Preview</span>
            </span>
          </div>

          {/* Note Card Simulation */}
          <div
            style={{ backgroundColor: postAsAdmin ? '#701a31' : selectedColor }}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all flex flex-col justify-between relative overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
              postAsAdmin ? 'border-4 border-[#ffc900] text-white' : 'border-black text-black'
            }`}
          >
            <div>
              {/* Top Header inside preview */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold rounded-full uppercase tracking-wider shrink-0 ${
                    postAsAdmin ? 'bg-[#ffc900] text-black border border-black' : 'bg-black text-white'
                  }`}>
                    {postAsAdmin ? 'ADMIN NOTE' : currentAuthorDept.replace('College of ', '')}
                  </span>
                  <span className="px-2 py-0.5 bg-[#701a31] text-white text-[9px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs">
                    YOU
                  </span>
                </div>
                <span className={`text-[10px] font-bold ${postAsAdmin ? 'text-[#ffc900]' : 'text-black/70'}`}>
                  Just now
                </span>
              </div>

              {/* Note Message */}
              <p className={`text-xs sm:text-sm font-extrabold leading-relaxed whitespace-pre-wrap break-words mb-3 ${
                postAsAdmin ? 'text-white' : 'text-black'
              }`}>
                {message.trim() ? `"${message.trim()}"` : '"Your note message will appear here..."'}
              </p>

              {/* Attached Media Preview */}
              {attachedMedia && (
                <div className="mb-3 rounded-2xl border-2 border-black overflow-hidden bg-black/5 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img
                    src={attachedMedia.url}
                    alt="Attachment Preview"
                    className="w-full max-h-52 object-cover object-center rounded-xl"
                  />
                  {attachedMedia.type === 'gif' && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/85 text-[#ffc900] text-[9px] font-black uppercase rounded-md border border-black shadow-xs pointer-events-none">
                      GIF
                    </span>
                  )}
                </div>
              )}

              {/* Poll Preview */}
              {showPollForm && (
                <div className="my-2.5 p-2.5 sm:p-3 rounded-xl border-2 border-black bg-white/95 text-black shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5 truncate">
                      <BarChart2 className="w-3.5 h-3.5 text-[#701a31] shrink-0" />
                      <span className="truncate">{pollQuestion.trim() || 'Campus Poll'}</span>
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 sm:px-2 py-0.5 bg-black text-white rounded-full shrink-0">
                      Tap to vote
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {pollOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="w-full text-left p-1.5 sm:p-2 rounded-lg border-2 border-black bg-gray-50 text-xs font-bold truncate"
                      >
                        {opt.trim() || `Option ${idx + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Note Footer */}
            <div className="pt-3 border-t border-black/15 flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={previewAvatar}
                  alt={currentAuthorAlias}
                  className="w-6 h-6 rounded-full border border-black/30 object-cover bg-amber-50 shrink-0"
                />
                <span className={`text-xs font-black truncate ${postAsAdmin ? 'text-white' : 'text-black'}`}>
                  @{currentAuthorAlias}
                </span>
              </div>
              <span className={`text-[10px] font-bold ${postAsAdmin ? 'text-white/80' : 'text-black/70'}`}>
                0 likes · 0 comments
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* GIFs Modal */}
      {showGifModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white border border-[#d1d5dc] p-4 rounded-2xl max-w-md w-full text-left shadow-2xl relative max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 shrink-0">
              <span className="text-sm font-bold text-black">Select a GIF</span>
              <button
                type="button"
                onClick={() => setShowGifModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-600 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gifSearchTerm}
                  onChange={(e) => setGifSearchTerm(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-[#d1d5dc] rounded-lg bg-[#f4f4f0] text-black font-medium focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-2 shrink-0 scrollbar-none">
              {CAMPUS_GIF_COLLECTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGifCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    gifCategory === cat.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-100 text-black border-[#d1d5dc]'
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
                        className="relative rounded-xl border border-[#d1d5dc] overflow-hidden bg-black/5 hover:border-black transition-all text-left cursor-pointer"
                      >
                        <img
                          src={gif.url}
                          alt={gif.title}
                          className="w-full h-28 object-cover"
                          loading="lazy"
                        />
                        <div className="p-1 bg-white border-t border-[#d1d5dc] text-[10px] font-bold text-black truncate">
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

      {/* Sent Celebration Overlay */}
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
