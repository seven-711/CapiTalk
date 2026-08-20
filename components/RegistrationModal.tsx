'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, IP_AVATARS, getAvatarForPseudonym, DepartmentType, AvatarOption } from '../lib/constants';
import { validateUsername, checkUsernameAvailability, MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from '../lib/utils/safety';
import { CoinMascot } from './CoinMascot';
import { Sparkles, CheckCircle2, ShieldCheck, AlertCircle, Shuffle, Wand2 } from 'lucide-react';

export const RegistrationModal: React.FC = () => {
  const { currentUser, registerUser, setViewState } = useChatStore();

  const [username, setUsername] = useState(currentUser ? currentUser.username : '');
  const [department, setDepartment] = useState<DepartmentType>(currentUser ? currentUser.department : 'College of Computer Studies');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar_url || IP_AVATARS[0].url);
  const [hasManuallySelectedAvatar, setHasManuallySelectedAvatar] = useState(Boolean(currentUser?.avatar_url));
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ isAvailable: boolean; message?: string } | null>(null);

  // Automatically suggest a deterministic IP avatar when user types pseudonym (if not manually chosen)
  useEffect(() => {
    if (!hasManuallySelectedAvatar && username.trim().length >= 2) {
      setSelectedAvatar(getAvatarForPseudonym(username));
    }
  }, [username, hasManuallySelectedAvatar]);

  const currentAvatarOption = IP_AVATARS.find((a) => a.url === selectedAvatar) || IP_AVATARS[0];
  const categories = ['All', 'Mascot', 'Chill', 'Social', 'Academic', 'Campus Life', 'Growth', 'Secret'];
  const filteredAvatars = activeCategory === 'All' 
    ? IP_AVATARS 
    : IP_AVATARS.filter((a) => a.category === activeCategory);

  const handleRandomizeAvatar = () => {
    const randomIndex = Math.floor(Math.random() * IP_AVATARS.length);
    setSelectedAvatar(IP_AVATARS[randomIndex].url);
    setHasManuallySelectedAvatar(true);
  };

  const handleAutoMatchPseudonym = () => {
    if (username.trim()) {
      setSelectedAvatar(getAvatarForPseudonym(username));
      setHasManuallySelectedAvatar(true);
    }
  };

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus(null);
      setIsCheckingUsername(false);
      return;
    }

    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameStatus({ isAvailable: false, message: validation.error });
      setIsCheckingUsername(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      const res = await checkUsernameAvailability(username, currentUser?.id);
      setIsCheckingUsername(false);
      if (!res.isAvailable) {
        setUsernameStatus({ isAvailable: false, message: res.error });
      } else {
        setUsernameStatus({ isAvailable: true, message: `Pseudonym @${username.trim()} is available!` });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, currentUser?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    setIsCheckingUsername(true);
    const availability = await checkUsernameAvailability(username, currentUser?.id);
    setIsCheckingUsername(false);

    if (!availability.isAvailable) {
      setError(availability.error || 'Username is already taken by another user.');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Community Guidelines to join.');
      return;
    }

    registerUser(username, department, selectedAvatar, bio);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
      <div className="gumroad-feature-card p-4 sm:p-8 relative overflow-hidden">
        {/* Decorative Mascot */}
        <div className="absolute -top-4 -right-4 opacity-90 hidden sm:block">
          <CoinMascot size={88} tiltAngle={18} />
        </div>

        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
            {currentUser ? 'Edit CapiTalk Profile' : 'Create CapiTalk Profile'}
          </h2>
          <p className="text-sm text-[#242423] mt-1.5">
            Keep your real identity private. Pick a unique username and your college department.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#dc341e]/10 border border-[#dc341e] rounded-md text-sm text-[#dc341e] font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Avatar Selector Section */}
          <div className="rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-black">
                Profile Avatar
              </label>
            </div>

            {/* Active Avatar Highlight Banner */}
            <div className="flex items-center gap-3.5 mb-3 p-2.5 bg-white rounded-lg border border-[#d1d5dc]">
              <div className="relative shrink-0">
                <img
                  src={selectedAvatar}
                  alt={currentAvatarOption.name}
                  className="w-14 h-14 rounded-xl border-2 border-black object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-black text-sm">{currentAvatarOption.name}</span>
                </div>
                <p className="text-xs text-[#242423]/80 truncate mt-0.5">
                  {currentAvatarOption.description}
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black border border-[#d1d5dc] hover:border-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Avatar Grid / Carousel */}
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto p-1.5 bg-white/70 rounded-lg border border-[#d1d5dc]">
              {filteredAvatars.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    title={`${avatar.name} (${avatar.character})`}
                    onClick={() => {
                      setSelectedAvatar(avatar.url);
                      setHasManuallySelectedAvatar(true);
                    }}
                    className={`relative p-0.5 rounded-lg border-2 transition-all transform hover:scale-105 shrink-0 ${
                      isSelected
                        ? 'border-black bg-[#ff90e8] scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-transparent hover:border-[#d1d5dc]'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full aspect-square rounded-md bg-[#f4f4f0] object-cover"
                    />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Username / Pseudonym Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-black">
                Pseudonym / Username <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                  username.length > MAX_USERNAME_LENGTH
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : username.length >= MAX_USERNAME_LENGTH - 2
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                {username.length}/{MAX_USERNAME_LENGTH} chars
              </span>
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. engr_masarap, nursing_mwa"
              className={`gumroad-input w-full ${
                usernameStatus
                  ? usernameStatus.isAvailable
                    ? 'border-emerald-600 focus:ring-emerald-600'
                    : 'border-red-600 focus:ring-red-600'
                  : ''
              }`}
              maxLength={MAX_USERNAME_LENGTH}
            />
            {isCheckingUsername ? (
              <p className="text-xs text-amber-700 font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                Checking pseudonym availability...
              </p>
            ) : usernameStatus ? (
              <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 ${
                usernameStatus.isAvailable ? 'text-emerald-600' : 'text-red-600 font-bold'
              }`}>
                <span>{usernameStatus.isAvailable ? '✓' : '⚠️'}</span> {usernameStatus.message}
              </p>
            ) : (
              <p className="text-xs text-[#242423] mt-1">
                Must be between {MIN_USERNAME_LENGTH} and {MAX_USERNAME_LENGTH} characters. Letters, numbers, hyphens, and underscores only.
              </p>
            )}
          </div>

          {/* Department Select */}
          <div>
            <label className="block text-sm font-semibold text-black mb-1">
              Department / College <span className="text-red-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentType)}
              className="gumroad-input w-full bg-white cursor-pointer"
            >
              {CU_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#242423] mt-1">
              This will be visible to students you get paired with.
            </p>
          </div>
          {/* Community Guidelines Checkbox */}
          <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-md">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-xs text-[#242423] leading-relaxed">
                I agree to the <strong className="text-black">CapiTalk Community Guidelines</strong>. I will not harass, spam, or share inappropriate content with fellow students.
              </span>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isCheckingUsername || (usernameStatus !== null && !usernameStatus.isAvailable)}
              className="btn-gumroad-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isCheckingUsername ? 'Checking...' : currentUser ? 'Save Profile' : 'Start Chatting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
