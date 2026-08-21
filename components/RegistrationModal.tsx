'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, IP_AVATARS, getAvatarForPseudonym, DepartmentType, AvatarOption } from '../lib/constants';
import { validateUsername, checkUsernameAvailability, MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from '../lib/utils/safety';
import { CoinMascot } from './CoinMascot';
import { Sparkles, CheckCircle2, ShieldCheck, AlertCircle, Shuffle, Wand2, ArrowLeft, X } from 'lucide-react';

export const RegistrationModal: React.FC = () => {
  const { currentUser, registerUser, setViewState, goBack } = useChatStore();

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

        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => goBack()}
            className="btn-gumroad-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 hover:border-black rounded-lg shadow-2xs font-extrabold bg-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
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
                  alt="Selected avatar preview"
                  className="w-12 h-12 rounded-lg border-2 border-black object-cover bg-amber-50"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', IP_AVATARS[0].url);
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-black flex items-center justify-center text-[10px] text-white font-bold">
                  ✓
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-black truncate">{currentAvatarOption.name}</p>
                <p className="text-[11px] text-[#242423] truncate">{currentAvatarOption.description}</p>
              </div>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="btn-gumroad-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 hover:border-black shrink-0"
                title="Randomize avatar"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Random</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#d1d5dc] hover:border-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid of 2x2 Avatars */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2 bg-[#f4f4f0] rounded-lg border border-[#d1d5dc] max-h-36 overflow-y-auto">
              {filteredAvatars.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar.url);
                      setHasManuallySelectedAvatar(true);
                    }}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all group ${
                      isSelected
                        ? 'border-black ring-2 ring-[#ffc900] scale-105 shadow-sm'
                        : 'border-[#d1d5dc] hover:border-black opacity-80 hover:opacity-100'
                    }`}
                    title={avatar.name}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', IP_AVATARS[0].url);
                      }}
                    />
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#00e599]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pseudonym Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-black">
                Pseudonym / Nickname <span className="text-red-500">*</span>
              </label>
              {username.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={handleAutoMatchPseudonym}
                  className="text-[11px] text-[#701a31] hover:underline font-bold flex items-center gap-1"
                  title="Generate a character matching this pseudonym"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Match Character</span>
                </button>
              )}
            </div>
            <input
              type="text"
              required
              minLength={MIN_USERNAME_LENGTH}
              maxLength={MAX_USERNAME_LENGTH}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="e.g. BraveTiger or Starlight"
              className={`gumroad-input w-full ${
                usernameStatus?.isAvailable === false ? 'border-red-500 focus:border-red-500' : ''
              }`}
            />
            {isCheckingUsername ? (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ffc900] animate-ping" /> Checking availability...
              </p>
            ) : usernameStatus ? (
              <p className={`text-xs mt-1 font-medium ${
                usernameStatus.isAvailable ? 'text-emerald-600' : 'text-red-600'
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
              type="button"
              onClick={() => goBack()}
              className="btn-gumroad-ghost w-1/3 py-3.5 text-sm font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCheckingUsername || (usernameStatus !== null && !usernameStatus.isAvailable)}
              className="btn-gumroad-primary flex-1 py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{isCheckingUsername ? 'Checking...' : currentUser ? 'Save Profile' : 'Start Chatting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
