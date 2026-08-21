'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { MATCHMAKING_TIPS, CU_DEPARTMENTS, DepartmentType } from '../lib/constants';
import { QueueFilter } from '../lib/types';
import { CoinMascot } from './CoinMascot';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  XCircle,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  X,
  Check,
  Target,
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
  return filter;
};

const getPreferenceSubtitle = (filter: QueueFilter, myDept?: string) => {
  if (filter === 'anyone') return 'Open to meeting all students';
  if (filter === 'same') return `Match with ${myDept ? myDept.replace('College of ', '') : 'your department'} students`;
  if (filter === 'different') return `Match outside ${myDept ? myDept.replace('College of ', '') : 'your department'}`;
  return 'Match specifically with this college';
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
  // STATE 1: NOBODY ONLINE (Dedicated Minimalist Plain Animation)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTimedOut) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300">
        {/* Plain borderless Animation */}
        <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          <DotLottieReact
            src="/animated-assets/nobodyOnline.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        </div>

        {/* Minimalist Heading & Description */}
        <h2 className="text-lg font-extrabold text-black mt-2">
          Nobody Online Right Now
        </h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
          No active students found in the queue after 35 seconds.
        </p>

        {/* Minimalist Actions */}
        <div className="mt-5 flex items-center gap-2.5 w-full justify-center">
          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              startSearch();
            }}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQueueTimeoutModal(false);
              setViewState('freedom_wall');
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Freedom Wall
          </button>
        </div>

        {/* Preference Modifier Shortcut */}
        <button
          type="button"
          onClick={() => setShowPreferenceModal(true)}
          className="mt-3 text-[11px] text-gray-500 hover:text-black hover:underline cursor-pointer"
        >
          Change matching preference
        </button>

        {/* Preference Modal */}
        {showPreferenceModal && renderPreferenceModal()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 2: SEARCHING / WAITING (Dedicated Minimalist Plain Animation)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSearching) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto animate-in fade-in duration-300">
        {/* Plain borderless Animation */}
        <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          <DotLottieReact
            src="/animated-assets/waiting.lottie"
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        </div>

        {/* Minimalist Heading & Description */}
        <h2 className="text-lg font-extrabold text-black mt-2">
          Looking for someone...
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

        {/* Minimalist Timer */}
        <span className="mt-2 text-xs font-mono font-bold text-gray-400">
          {formatSeconds(searchingTimeSeconds)}
        </span>

        {/* Minimalist Cancel Button */}
        <button
          type="button"
          onClick={cancelSearch}
          className="mt-4 px-4 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-medium"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 3: ORIGINAL MATCHMAKING UI (Recovered)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-xl mx-auto py-2 sm:py-6 px-2.5 sm:px-4 box-border overflow-hidden">
      <div className="gumroad-feature-card p-3.5 sm:p-6 text-center relative rounded-2xl w-full max-w-full box-border overflow-hidden">
        {/* User Card Summary */}
        {currentUser && (
          <div className="flex w-full items-center gap-2 sm:gap-3 bg-white border border-[#d1d5dc] px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-full mb-3 sm:mb-5 shadow-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f4f4f0] border-2 border-black shrink-0 object-cover"
              />

              <div className="min-w-0 text-left">
                <span className="font-extrabold text-xs text-black block truncate leading-tight">
                  {currentUser.username}
                </span>

                <span className="text-[10px] sm:text-[11px] font-semibold text-[#701a31] block truncate leading-tight">
                  {currentUser.department.replace('College of ', '')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewState('register')}
              className="ml-auto text-[10px] sm:text-xs font-bold text-black bg-[#f4f4f0] hover:bg-black hover:text-white border border-[#d1d5dc] hover:border-black px-2.5 py-0.5 sm:py-1 rounded-full transition-all shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* Clean Match Preference Trigger Button (Opens Preference Modal) */}
        <div className="mb-3.5 sm:mb-5 text-left max-w-md mx-auto">
          <label className="block text-[11px] sm:text-xs font-bold text-[#242423] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-[#701a31]" />
              I WANT TO MEET SOMEONE FROM...
            </span>
            <span className="text-[10px] font-semibold text-gray-500">Tap to change</span>
          </label>
          <button
            type="button"
            disabled={isSearching}
            onClick={() => setShowPreferenceModal(true)}
            className="w-full bg-white hover:bg-gray-50 border-2 border-black rounded-xl p-2.5 sm:p-3 text-left transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-between gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#fff1f3] border border-black/20 flex items-center justify-center text-base shrink-0">
                {getPreferenceIcon(queueFilter)}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-black truncate">
                  {getPreferenceTitle(queueFilter, currentUser?.department)}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-gray-500 truncate">
                  {getPreferenceSubtitle(queueFilter, currentUser?.department)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-black text-[#701a31] bg-[#fff1f3] px-2 py-1 rounded-lg border border-[#701a31]/20 shrink-0 group-hover:bg-[#701a31] group-hover:text-white transition-colors">
              <span>Change</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </div>
          </button>
        </div>

        {/* Ready to Connect Card Body */}
        <div className="py-2 sm:py-4 flex flex-col items-center justify-center">
          <div className="mb-2.5 sm:mb-4">
            <CoinMascot size={56} tiltAngle={-6} />
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
            Ready to Connect?
          </h3>
          <p className="text-[11px] sm:text-xs text-[#242423] mt-1 max-w-sm mx-auto leading-normal">
            Click below to enter the live matchmaking queue and start a real-time conversation.
          </p>

          <div className="mt-3.5 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={startSearch}
              className="btn-gumroad-secondary text-md sm:text-sm px-5 py-2.5 sm:py-3 w-full sm:w-auto bg-[#701a31] hover:bg-[#4d0d1f] text-white border-2 border-black font-extrabold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-full cursor-pointer"
            >
              <span>Start Searching Now</span>
            </button>
            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="btn-gumroad-secondary text-md sm:text-sm px-4 py-2.5 sm:py-3 w-full sm:w-auto bg-[#c41e3a] hover:bg-[#a1162d] text-white border-2 border-black font-extrabold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-full cursor-pointer"
            >
              <span>Freedom Wall</span>
            </button>
          </div>
        </div>

        {/* Tip Carousel Banner */}
        <div className="mt-3.5 sm:mt-5 p-2.5 sm:p-3 bg-[#f4f4f0] border border-[#d1d5dc] rounded-xl text-[10.5px] sm:text-xs text-[#242423] flex items-center justify-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-black shrink-0" />
          <span className="font-medium">{MATCHMAKING_TIPS[tipIndex]}</span>
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        onClick={() => setShowPreferenceModal(false)}
      >
        <div
          className="bg-white border-3 border-black rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-black/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fff1f3] border border-black/20 flex items-center justify-center text-[#701a31]">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-black leading-tight">
                  Match Preference
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
                  Choose who you want to meet
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Preference Options */}
          <div className="overflow-y-auto py-3 space-y-4 custom-scrollbar pr-1 flex-1">
            {/* General Options */}
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2 px-1">
                General Preferences
              </span>
              <div className="space-y-1.5">
                {/* Anyone */}
                <button
                  type="button"
                  onClick={() => handleSelectPreference('anyone')}
                  className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                    queueFilter === 'anyone'
                      ? 'bg-[#fff1f3] border-[#701a31] shadow-2xs font-extrabold'
                      : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🌍</span>
                    <div>
                      <div className="text-xs font-black text-black">Anyone (Any Department)</div>
                      <div className="text-[10px] text-gray-500 font-medium">Open to meeting any student</div>
                    </div>
                  </div>
                  {queueFilter === 'anyone' && <Check className="w-4 h-4 text-[#701a31] stroke-[3]" />}
                </button>

                {/* Same Department */}
                <button
                  type="button"
                  onClick={() => handleSelectPreference('same')}
                  className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                    queueFilter === 'same'
                      ? 'bg-[#fff1f3] border-[#701a31] shadow-2xs font-extrabold'
                      : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🎓</span>
                    <div>
                      <div className="text-xs font-black text-black">
                        Same Department ({currentUser?.department.replace('College of ', '') || 'My Dept'})
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Match with students in your college</div>
                    </div>
                  </div>
                  {queueFilter === 'same' && <Check className="w-4 h-4 text-[#701a31] stroke-[3]" />}
                </button>

                {/* Different Department */}
                <button
                  type="button"
                  onClick={() => handleSelectPreference('different')}
                  className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                    queueFilter === 'different'
                      ? 'bg-[#fff1f3] border-[#701a31] shadow-2xs font-extrabold'
                      : 'bg-white border-[#d1d5dc] hover:border-black hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🔀</span>
                    <div>
                      <div className="text-xs font-black text-black">Different Department</div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        Match outside {currentUser?.department.replace('College of ', '') || 'your department'}
                      </div>
                    </div>
                  </div>
                  {queueFilter === 'different' && <Check className="w-4 h-4 text-[#701a31] stroke-[3]" />}
                </button>
              </div>
            </div>

            {/* Specific Department Section */}
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2 px-1">
                Specific College Departments
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
                      className={`p-2 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#701a31] text-white border-black shadow-2xs font-black'
                          : 'bg-white text-black border-[#d1d5dc] hover:border-black hover:bg-gray-50 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{icon}</span>
                        <span className="text-xs truncate">{dept.replace('College of ', '')}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-black/10 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowPreferenceModal(false)}
              className="px-4 py-1.5 rounded-xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-black border border-black/20 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
};
