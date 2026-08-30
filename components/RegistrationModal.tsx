'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, IP_AVATARS, getAvatarForPseudonym, DepartmentType } from '../lib/constants';
import { validateUsername, checkUsernameAvailability, MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from '../lib/utils/safety';
import { CheckCircle2, Shuffle, ArrowLeft, Wand2, RefreshCw } from 'lucide-react';

export const RegistrationModal: React.FC = () => {
  const { currentUser, registerUser, goBack } = useChatStore();

  const [username, setUsername] = useState(currentUser ? currentUser.username : '');
  const [department, setDepartment] = useState<DepartmentType>(currentUser ? currentUser.department : 'College of Computer Studies');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar_url || IP_AVATARS[0].url);
  const [hasManuallySelectedAvatar, setHasManuallySelectedAvatar] = useState(Boolean(currentUser?.avatar_url));
  const [bio] = useState(currentUser?.bio || '');
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

  const categories = ['All', 'Mascot', 'Chill', 'Social', 'Academic', 'Growth'];
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
        setUsernameStatus({ isAvailable: true, message: `Available` });
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
      setError(availability.error || 'Username is already taken.');
      return;
    }

    registerUser(username, department, selectedAvatar, bio);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-2 sm:py-6 px-3 sm:px-4 font-sans text-black dark:text-[#f4f4f6] transition-colors duration-200">
      {/* Main Container Card */}
      <div className="bg-white dark:bg-[#18181b] border-y sm:border border-[#d1d5dc] dark:border-zinc-800 sm:rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)]">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goBack()}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-black dark:text-zinc-200 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-extrabold text-black dark:text-white">
              {currentUser ? 'Edit Profile' : 'Create Profile'}
            </h1>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-400 uppercase tracking-wide">
                Avatar
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="text-[11px] text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
            </div>

            {/* Avatar Preview Row */}
            <div className="flex items-center gap-3 p-2 bg-[#fbfbfa] dark:bg-[#121214] rounded-xl border border-[#d1d5dc] dark:border-zinc-800 transition-colors">
              <img
                src={selectedAvatar}
                alt="Selected avatar"
                className="w-12 h-12 rounded-full border border-[#d1d5dc] dark:border-zinc-700 object-cover bg-amber-50 dark:bg-zinc-800 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-black dark:text-white truncate">@{username.trim() || 'username'}</p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate">{department.replace('College of ', '')}</p>
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    activeCategory === cat
                      ? 'bg-black text-white border-black dark:bg-[#00e599] dark:text-black dark:border-[#00e599]'
                      : 'bg-white dark:bg-[#18181b] text-gray-600 dark:text-zinc-400 border-[#d1d5dc] dark:border-zinc-800 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 bg-[#fbfbfa] dark:bg-[#121214] rounded-xl border border-[#d1d5dc] dark:border-zinc-800 max-h-32 overflow-y-auto">
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
                    className={`relative aspect-square rounded-lg overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-black dark:ring-[#00e599] scale-105 shadow-xs'
                        : 'opacity-70 hover:opacity-100 hover:scale-102'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className="w-full h-full object-cover bg-amber-50/50 dark:bg-zinc-800"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black dark:bg-[#00e599] rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#00e599] dark:text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Username Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-400 uppercase tracking-wide">
                Pseudonym / Username
              </label>
              {usernameStatus && (
                <span className={`text-[11px] font-bold ${usernameStatus.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {usernameStatus.isAvailable ? '✓ Available' : `⚠️ ${usernameStatus.message}`}
                </span>
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
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121214] text-black dark:text-white border border-[#d1d5dc] dark:border-zinc-800 rounded-xl font-medium focus:outline-none focus:border-black dark:focus:border-[#00e599] transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Department Field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-400 uppercase tracking-wide">
              College Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentType)}
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#121214] text-black dark:text-white border border-[#d1d5dc] dark:border-zinc-800 rounded-xl font-medium focus:outline-none focus:border-black dark:focus:border-[#00e599] cursor-pointer transition-colors"
            >
              {CU_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className="bg-white dark:bg-[#18181b] text-black dark:text-white">
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => goBack()}
              className="w-1/3 py-2.5 text-xs sm:text-sm font-bold text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-[#d1d5dc] dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCheckingUsername || (usernameStatus !== null && !usernameStatus.isAvailable) || !username.trim()}
              className="flex-1 py-2.5 bg-black hover:bg-zinc-800 dark:bg-[#00e599] dark:hover:bg-[#00c985] text-white dark:text-black disabled:opacity-40 font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer active:scale-98 shadow-xs"
            >
              {currentUser ? 'Save Changes' : 'Get Started'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
