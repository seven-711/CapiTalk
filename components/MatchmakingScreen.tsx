'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { MATCHMAKING_TIPS, CU_DEPARTMENTS, DepartmentType } from '../lib/constants';
import { QueueFilter } from '../lib/types';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  SlidersHorizontal,
  ChevronRight,
  X,
  Check,
  Target,
  Sparkles,
  HelpCircle,
  Globe,
  GraduationCap,
  Shuffle,
  Laptop,
  Cog,
  HeartPulse,
  Microscope,
  Briefcase,
  BookOpen,
  Shield,
  Palette,
  Anchor,
  Building2,
} from 'lucide-react';

const getDepartmentIcon = (dept: DepartmentType, className = 'w-4 h-4') => {
  switch (dept) {
    case 'College of Computer Studies':
      return <Laptop className={className} />;
    case 'College of Engineering':
      return <Cog className={className} />;
    case 'College of Nursing':
      return <HeartPulse className={className} />;
    case 'College of Medical Technology':
      return <Microscope className={className} />;
    case 'College of Business Administration':
      return <Briefcase className={className} />;
    case 'College of Education':
      return <BookOpen className={className} />;
    case 'College of Criminology':
      return <Shield className={className} />;
    case 'College of Arts and Sciences':
      return <Palette className={className} />;
    case 'College of Maritime Education':
      return <Anchor className={className} />;
    case 'Senior High School':
      return <GraduationCap className={className} />;
    default:
      return <Building2 className={className} />;
  }
};

const getPreferenceIconElement = (filter: QueueFilter, className = 'w-4 h-4') => {
  if (filter === 'anyone') return <Globe className={className} />;
  if (filter === 'same') return <GraduationCap className={className} />;
  if (filter === 'different') return <Shuffle className={className} />;
  return getDepartmentIcon(filter as DepartmentType, className);
};

const getPreferenceTitle = (filter: QueueFilter, myDept?: string) => {
  if (filter === 'anyone') return 'Anyone (Any Department)';
  if (filter === 'same') return `Same Department (${myDept ? myDept.replace('College of ', '') : 'My Dept'})`;
  if (filter === 'different') return 'Different Department';
  return filter.replace('College of ', '');
};

const getPreferenceSubtitle = (filter: QueueFilter, myDept?: string) => {
  if (filter === 'anyone') return 'Open to all students';
  if (filter === 'same') return `Match within ${myDept ? myDept.replace('College of ', '') : 'your college'}`;
  if (filter === 'different') return `Match outside ${myDept ? myDept.replace('College of ', '') : 'your college'}`;
  return 'Match with this college';
};

export const MatchmakingScreen: React.FC = () => {
  const {
    currentUser,
    isSearching,
    searchingTimeSeconds,
    queueFilter,
    setQueueFilter,
    startSearch,
    cancelSearch,
    setViewState,
    showQueueTimeoutModal,
    setShowQueueTimeoutModal,
  } = useChatStore();

  const [tipIndex, setTipIndex] = useState(0);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % MATCHMAKING_TIPS.length);
    }, 4500);
    return () => clearInterval(tipInterval);
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectPreference = (filter: QueueFilter) => {
    setQueueFilter(filter);
    setShowPreferenceModal(false);
  };

  const isTimedOut = showQueueTimeoutModal || (!isSearching && searchingTimeSeconds >= 35);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 1: TIMEOUT / NOBODY ONLINE
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTimedOut) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300 font-sans text-black dark:text-white">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <div className="absolute inset-2 sm:inset-3 rounded-full bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs pointer-events-none" />
          <DotLottieReact
            src="/animated-assets/nobodyOnline.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full relative z-10"
          />
        </div>

        <h2 className="text-lg font-extrabold text-black dark:text-white mt-2">
          No Match Found
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
          No students are currently active in this queue. Try broadening your filter or check back in a few moments.
        </p>

        <div className="mt-5 flex items-center gap-2 w-full justify-center">
          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              startSearch();
            }}
            className="flex-1 py-2.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              setViewState('freedom_wall');
            }}
            className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-black dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
           Campus Wall
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowPreferenceModal(true)}
          className="mt-3 text-xs font-bold text-[#701a31] dark:text-[#ff90e8] hover:underline cursor-pointer"
        >
          Change match filter
        </button>

        {showPreferenceModal && renderPreferenceModal()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 2: SEARCHING / WAITING
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSearching) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300 font-sans text-black dark:text-white">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <div className="absolute inset-2 sm:inset-3 rounded-full bg-white/80 dark:bg-white/100 dark:blur-[20px] border border-black/5 dark:border-white/10 shadow-xs pointer-events-none" />
          <DotLottieReact
            src="/animated-assets/waiting.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full relative z-10"
          />
        </div>

        <h2 className="text-lg font-extrabold text-black dark:text-white mt-2">
          Finding a match...
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
          {queueFilter === 'anyone'
            ? 'Matching with any student'
            : queueFilter === 'same'
            ? `Matching within ${currentUser?.department.replace('College of ', '') || 'your department'}`
            : queueFilter === 'different'
            ? 'Matching outside your department'
            : `Matching with ${queueFilter.replace('College of ', '')}`}
        </p>

        <span className="mt-2 text-xs font-mono font-bold text-gray-400 dark:text-zinc-500">
          {formatSeconds(searchingTimeSeconds)}
        </span>

        <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
          <button
            type="button"
            onClick={cancelSearch}
            className="w-full py-2.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Cancel Search
          </button>

          <button
            type="button"
            onClick={() => setViewState('freedom_wall')}
            className="w-full py-2 text-xs text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-bold transition-colors cursor-pointer"
          >
            Campus Wall
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 3: CLEAN MODERN MATCHMAKING LOBBY
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-lg mx-auto py-2 sm:py-6 px-3 sm:px-4 font-sans text-black dark:text-white">
      <div className="bg-white dark:bg-[#18181b] border-y sm:border border-[#d1d5dc] dark:border-zinc-800 sm:rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
        {/* User Identity Chip */}
        {currentUser && (
          <div className="flex items-center justify-between gap-3 p-2.5 bg-[#fbfbfa] dark:bg-zinc-900/70 border border-[#d1d5dc] dark:border-zinc-800 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full border border-[#d1d5dc] dark:border-zinc-700 object-cover bg-amber-50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-black dark:text-white truncate">
                    @{currentUser.username}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Ready to match</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewState('register')}
              className="text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* Match Filter Selector Card */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-1">
              <span>Matching with</span>
            </label>
          </div>

          <button
            type="button"
            disabled={isSearching}
            onClick={() => setShowPreferenceModal(true)}
            className="w-full bg-[#fbfbfa] dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-800/80 border border-[#d1d5dc] dark:border-zinc-800 rounded-xl p-3 text-left transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#fff1f3] dark:bg-[#271216] text-[#701a31] dark:text-[#ff90e8] border border-[#701a31]/20 dark:border-rose-900/40 flex items-center justify-center shrink-0 shadow-2xs">
                {getPreferenceIconElement(queueFilter, 'w-4 h-4 text-[#701a31] dark:text-[#ff90e8]')}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-black dark:text-white truncate">
                  {getPreferenceTitle(queueFilter, currentUser?.department)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                  {getPreferenceSubtitle(queueFilter, currentUser?.department)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-[#701a31] dark:text-[#ff90e8] shrink-0">
              <span>Change</span>
            </div>
          </button>
        </div>

        {/* Hero CTA Block */}
        <div className="pt-2 text-center space-y-3">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-black dark:text-white">
              Anonymous Campus Matchmaking
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Meet fellow Capitol University students anonymously in real time.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={startSearch}
              className="w-full sm:flex-1 py-3 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
            >
              <span>Start Matching</span>
            </button>

            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="w-full sm:w-auto px-4 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-black dark:text-white font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
             Campus Wall
            </button>
          </div>
        </div>

        {/* Tip Row */}
        <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-500 dark:text-zinc-400">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
          <span className="font-medium truncate">{MATCHMAKING_TIPS[tipIndex]}</span>
        </div>
      </div>

      {/* Match Preference Selection Modal */}
      {showPreferenceModal && renderPreferenceModal()}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL HELPER: PREFERENCE MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  function renderPreferenceModal() {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        onClick={() => setShowPreferenceModal(false)}
      >
        <div
          className="bg-white dark:bg-[#18181b] border-2 border-black dark:border-white/20 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col overflow-hidden text-left font-sans text-black dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#fff1f3] dark:bg-[#271216] text-[#701a31] dark:text-[#ff90e8] flex items-center justify-center border border-[#701a31]/20 dark:border-rose-900/40">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-black dark:text-white">
                  Match Preferences
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Choose who you want to connect with in chat</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Preference Options */}
          <div className="overflow-y-auto py-3 space-y-4 custom-scrollbar pr-1 flex-1">
            {/* General Scope */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider block px-1">
                General Scope
              </span>

              {/* Anyone */}
              <button
                type="button"
                onClick={() => handleSelectPreference('anyone')}
                className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'anyone'
                    ? 'bg-[#fff1f3] dark:bg-[#271216] border-[#701a31] dark:border-rose-500 text-[#701a31] dark:text-[#ff90e8] shadow-xs'
                    : 'bg-white dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 text-black dark:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    queueFilter === 'anyone' ? 'bg-[#701a31] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                  }`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">Anyone (All Departments)</p>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">Open to all active students</p>
                  </div>
                </div>
                {queueFilter === 'anyone' && <Check className="w-4 h-4 text-[#701a31] dark:text-[#ff90e8] stroke-[2.5]" />}
              </button>

              {/* Same Department */}
              <button
                type="button"
                onClick={() => handleSelectPreference('same')}
                className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'same'
                    ? 'bg-[#fff1f3] dark:bg-[#271216] border-[#701a31] dark:border-rose-500 text-[#701a31] dark:text-[#ff90e8] shadow-xs'
                    : 'bg-white dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 text-black dark:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    queueFilter === 'same' ? 'bg-[#701a31] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">
                      Same Department ({currentUser?.department.replace('College of ', '') || 'My College'})
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">Match only within your college</p>
                  </div>
                </div>
                {queueFilter === 'same' && <Check className="w-4 h-4 text-[#701a31] dark:text-[#ff90e8] stroke-[2.5]" />}
              </button>

              {/* Different Department */}
              <button
                type="button"
                onClick={() => handleSelectPreference('different')}
                className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'different'
                    ? 'bg-[#fff1f3] dark:bg-[#271216] border-[#701a31] dark:border-rose-500 text-[#701a31] dark:text-[#ff90e8] shadow-xs'
                    : 'bg-white dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 text-black dark:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    queueFilter === 'different' ? 'bg-[#701a31] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                  }`}>
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">Different Department</p>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                      Match outside {currentUser?.department.replace('College of ', '') || 'your college'}
                    </p>
                  </div>
                </div>
                {queueFilter === 'different' && <Check className="w-4 h-4 text-[#701a31] dark:text-[#ff90e8] stroke-[2.5]" />}
              </button>
            </div>

            {/* Specific College Section */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider block px-1">
                Filter by College
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {CU_DEPARTMENTS.map((dept) => {
                  const isSelected = queueFilter === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectPreference(dept)}
                      className={`p-2 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#701a31] text-white border-[#701a31] font-black shadow-xs'
                          : 'bg-white dark:bg-zinc-900/60 text-black dark:text-white border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected ? 'text-white' : 'text-gray-600 dark:text-zinc-400'
                        }`}>
                          {getDepartmentIcon(dept, 'w-3.5 h-3.5')}
                        </div>
                        <span className="text-xs truncate">{dept.replace('College of ', '')}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-zinc-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="px-5 py-2 rounded-xl text-xs font-black bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }
};
