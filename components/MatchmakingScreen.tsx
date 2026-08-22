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
} from 'lucide-react';

const DEPARTMENT_ICONS: Record<DepartmentType, string> = {
  'College of Computer Studies': '💻',
  'College of Engineering': '⚙️',
  'College of Nursing': '🩺',
  'College of Medical Technology': '🔬',
  'College of Business Administration': '📊',
  'College of Education': '📚',
  'College of Criminology': '🛡️',
  'College of Arts and Sciences': '🎭',
  'College of Maritime Education': '⚓',
  'Senior High School': '🎓',
};

const getPreferenceIcon = (filter: QueueFilter) => {
  if (filter === 'anyone') return '🌍';
  if (filter === 'same') return '🎓';
  if (filter === 'different') return '🔀';
  return DEPARTMENT_ICONS[filter as DepartmentType] || '🏛️';
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300 font-sans text-black">
        <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <DotLottieReact
            src="/animated-assets/nobodyOnline.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        </div>

        <h2 className="text-lg font-extrabold text-black mt-2">
          No Match Found
        </h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
          No students are currently active in this queue. Try broadening your filter or check back in a few moments.
        </p>

        <div className="mt-5 flex items-center gap-2 w-full justify-center">
          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              startSearch();
            }}
            className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              setViewState('freedom_wall');
            }}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
           Campus Wall
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowPreferenceModal(true)}
          className="mt-3 text-xs font-bold text-[#701a31] hover:underline cursor-pointer"
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300 font-sans text-black">
        <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <DotLottieReact
            src="/animated-assets/waiting.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        </div>

        <h2 className="text-lg font-extrabold text-black mt-2">
          Finding a match...
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {queueFilter === 'anyone'
            ? 'Matching with any student'
            : queueFilter === 'same'
            ? `Matching within ${currentUser?.department.replace('College of ', '') || 'your department'}`
            : queueFilter === 'different'
            ? 'Matching outside your department'
            : `Matching with ${queueFilter.replace('College of ', '')}`}
        </p>

        <span className="mt-2 text-xs font-mono font-bold text-gray-400">
          {formatSeconds(searchingTimeSeconds)}
        </span>

        <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
          <button
            type="button"
            onClick={cancelSearch}
            className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Cancel Search
          </button>

          <button
            type="button"
            onClick={() => setViewState('freedom_wall')}
            className="w-full py-2 text-xs text-gray-600 hover:text-black font-bold transition-colors cursor-pointer"
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
    <div className="w-full max-w-lg mx-auto py-2 sm:py-6 px-3 sm:px-4 font-sans text-black">
      <div className="bg-white border-y sm:border border-[#d1d5dc] sm:rounded-2xl p-4 sm:p-6 space-y-5">
        {/* User Identity Chip */}
        {currentUser && (
          <div className="flex items-center justify-between gap-3 p-2.5 bg-[#fbfbfa] border border-[#d1d5dc] rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full border border-[#d1d5dc] object-cover bg-amber-50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-black truncate">
                    @{currentUser.username}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#fff1f3] text-[#701a31] rounded-md border border-[#701a31]/20 shrink-0">
                    {currentUser.department.replace('College of ', '')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Ready to match</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewState('register')}
              className="text-xs font-bold text-gray-600 hover:text-black px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* Match Filter Selector Card */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
              <span>Matching with</span>
            </label>
          </div>

          <button
            type="button"
            disabled={isSearching}
            onClick={() => setShowPreferenceModal(true)}
            className="w-full bg-[#fbfbfa] hover:bg-gray-50 border border-[#d1d5dc] rounded-xl p-3 text-left transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#d1d5dc] flex items-center justify-center text-base shrink-0 shadow-2xs">
                {getPreferenceIcon(queueFilter)}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-black truncate">
                  {getPreferenceTitle(queueFilter, currentUser?.department)}
                </p>
                <p className="text-[11px] text-gray-500 font-medium truncate">
                  {getPreferenceSubtitle(queueFilter, currentUser?.department)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-[#701a31] shrink-0">
              <span>Change</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Hero CTA Block */}
        <div className="pt-2 text-center space-y-3">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-black">
              Anonymous Campus Matchmaking
            </h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Meet fellow Capitol University students anonymously in real time.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={startSearch}
              className="w-full sm:flex-1 py-3 bg-black hover:bg-zinc-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
            >
              <span>Start Matching</span>
            </button>

            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="w-full sm:w-auto px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
             Campus Wall
            </button>
          </div>
        </div>

        {/* Tip Row */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-500">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
          className="bg-white border border-[#d1d5dc] rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col overflow-hidden text-left font-sans text-black"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#fff1f3] text-[#701a31] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-black">
                Match Preference
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Preference Options */}
          <div className="overflow-y-auto py-3 space-y-4 custom-scrollbar pr-1 flex-1">
            {/* General Options */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block px-1">
                General
              </span>

              {/* Anyone */}
              <button
                type="button"
                onClick={() => handleSelectPreference('anyone')}
                className={`w-full p-2.5 rounded-xl border transition-colors flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'anyone'
                    ? 'bg-[#fff1f3] border-[#701a31] text-[#701a31]'
                    : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50 text-black'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">🌍</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Anyone (Any Department)</p>
                    <p className="text-[10px] text-gray-500">Open to all students</p>
                  </div>
                </div>
                {queueFilter === 'anyone' && <Check className="w-4 h-4 text-[#701a31]" />}
              </button>

              {/* Same Department */}
              <button
                type="button"
                onClick={() => handleSelectPreference('same')}
                className={`w-full p-2.5 rounded-xl border transition-colors flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'same'
                    ? 'bg-[#fff1f3] border-[#701a31] text-[#701a31]'
                    : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50 text-black'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">🎓</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      Same Department ({currentUser?.department.replace('College of ', '') || 'My College'})
                    </p>
                    <p className="text-[10px] text-gray-500">Match inside your college</p>
                  </div>
                </div>
                {queueFilter === 'same' && <Check className="w-4 h-4 text-[#701a31]" />}
              </button>

              {/* Different Department */}
              <button
                type="button"
                onClick={() => handleSelectPreference('different')}
                className={`w-full p-2.5 rounded-xl border transition-colors flex items-center justify-between text-left cursor-pointer ${
                  queueFilter === 'different'
                    ? 'bg-[#fff1f3] border-[#701a31] text-[#701a31]'
                    : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50 text-black'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">🔀</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Different Department</p>
                    <p className="text-[10px] text-gray-500">
                      Match outside {currentUser?.department.replace('College of ', '') || 'your college'}
                    </p>
                  </div>
                </div>
                {queueFilter === 'different' && <Check className="w-4 h-4 text-[#701a31]" />}
              </button>
            </div>

            {/* Specific Department Section */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block px-1">
                Specific College
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {CU_DEPARTMENTS.map((dept) => {
                  const isSelected = queueFilter === dept;
                  const icon = DEPARTMENT_ICONS[dept] || '🏛️';
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectPreference(dept)}
                      className={`p-2 rounded-xl border transition-colors flex items-center justify-between text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#701a31] text-white border-[#701a31] font-extrabold'
                          : 'bg-white text-black border-[#d1d5dc] hover:border-black hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{icon}</span>
                        <span className="text-xs truncate">{dept.replace('College of ', '')}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-black transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }
};
