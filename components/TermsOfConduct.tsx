'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  AlertTriangle,
  FileText,
  Users,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Heart,
  Scale,
  Ban,
  ShieldAlert,
  MessageSquare,
  Music,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';

interface TermsOfConductProps {
  onAccept?: () => void;
  isStandaloneView?: boolean;
}

export const TermsOfConduct: React.FC<TermsOfConductProps> = ({
  onAccept,
  isStandaloneView = false,
}) => {
  const { setViewState, goBack, themeMode, toggleThemeMode } = useChatStore();
  const [hasAgreedCheck, setHasAgreedCheck] = useState(false);

  const isDarkMode = themeMode === 1;

  const handleAgreeClick = () => {
    if (onAccept) {
      onAccept();
    } else {
      goBack();
    }
  };

  const conductPillars = [
    {
      icon: <Users className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#701a31]',
      title: '1. Safe, Inclusive & Respectful Space',
      badgeColor: 'bg-[#dc341e] text-white',
      points: [
        'Treat every student with kindness, empathy, and dignity regardless of college or department.',
        'Cyberbullying, hate speech, threats, harassment, discrimination, and targeted hostility are strictly forbidden.',
        'Respect diverse opinions, viewpoints, and backgrounds across our university community.',
      ],
    },
    {
      icon: <Lock className="w-5 h-5 text-black" />,
      iconBg: 'bg-[#ffc900]',
      title: '2. Ephemeral Chat & Data Privacy',
      badgeColor: 'bg-[#00e599] text-black',
      points: [
        'Chats are temporary in-memory sessions — messages automatically disappear forever when conversations end.',
        'Never share real personal identifiers: real full names, student ID numbers, physical home addresses, phone numbers, or passwords.',
        'CapiTalk does NOT require student portal credentials or official university login data.',
      ],
    },
    {
      icon: <Ban className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#dc341e]',
      title: '3. Prohibited Content & Media',
      badgeColor: 'bg-black text-white',
      points: [
        'Sharing explicit, pornographic, lewd, or NSFW media is strictly prohibited.',
        'No distribution of non-consensual imagery, doxxing materials, malware, phishing links, or unauthorized commercial spam.',
        'Automatic profanity filters and real-time report triggers are actively maintained to safeguard students.',
      ],
    },
    {
      icon: <Scale className="w-5 h-5 text-black" />,
      iconBg: 'bg-[#00e599]',
      title: '4. Student-Led Project & Non-Affiliation',
      badgeColor: 'bg-[#ffe3e8] text-black',
      points: [
        'CapiTalk is an independent, student-led community project built exclusively for Capitol University students.',
        'CapiTalk is NOT officially operated, endorsed, or affiliated with Capitol University administration or faculty.',
        'Students participate voluntarily and are responsible for their own individual interactions.',
      ],
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-black" />,
      iconBg: 'bg-[#ff90e8]',
      title: '5. Moderation & Platform Enforcement',
      badgeColor: 'bg-[#ffc900] text-black',
      points: [
        'Users can instantly report inappropriate behavior or block partners during any live chat.',
        'Administrators review flagged reports and enforce permanent IP & device restrictions against severe rule violators.',
        'Disciplinary actions and bans are binding across all platform sub-services.',
      ],
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f4f4f0] dark:bg-[#0e0e11] text-black dark:text-[#f4f4f6] py-6 sm:py-12 px-3 sm:px-6 transition-colors duration-200 font-sans">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        
        {/* TOP BAR / NAVIGATION */}
        <div className="flex items-center justify-between">
          {isStandaloneView ? (
            <button
              type="button"
              onClick={() => goBack()}
              className="px-3.5 py-2 flex items-center gap-1.5 rounded-xl border-2 border-black dark:border-zinc-700 shadow-2xs font-black text-xs sm:text-sm bg-white dark:bg-[#18181b] text-black dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        {/* TOP HERO BANNER */}
        <div className="p-6 sm:p-10 relative overflow-hidden text-center sm:text-left rounded-3xl bg-white dark:bg-[#18181b] border-2 border-black dark:border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)]">
          {/* Decorative Background Coin Mascot */}
          <div className="absolute top-4 right-4 pointer-events-none opacity-20 sm:opacity-90 hidden sm:block">
            <CoinMascot size={88} tiltAngle={15} symbol="TOC" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-black dark:text-white leading-[1.1]">
              CapiTalk Terms & Conditions
            </h1>

            <p className="mt-3 text-xs sm:text-base text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
              Welcome to CapiTalk! To keep our campus community safe, respectful, and enjoyable for all students, you must review and confirm our Terms and Conditions before participating.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-black/10 dark:border-zinc-800 text-xs text-gray-700 dark:text-zinc-300 font-bold">
              <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Peer-to-Peer Safe</span>
              </span>
              <span className="text-gray-300 dark:text-zinc-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 bg-[#701a31]/10 text-[#701a31] dark:text-[#ff90e8] px-2.5 py-1 rounded-full border border-[#701a31]/20 dark:border-[#ff90e8]/20">
                <EyeOff className="w-3.5 h-3.5" />
                <span>Zero Logging</span>
              </span>
              <span className="text-gray-300 dark:text-zinc-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>For Capitolians</span>
              </span>
            </div>
          </div>
        </div>

        {/* TOP CONFIRMATION & AGREEMENT CARD (Immediately Visible at a Glance) */}
        <div className="bg-[#fff8e6] dark:bg-[#18181b] rounded-3xl p-5 sm:p-7 border-2 border-black dark:border-amber-500/40 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.6)] space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree-checkbox"
              checked={hasAgreedCheck}
              onChange={(e) => setHasAgreedCheck(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded-md border-2 border-black dark:border-zinc-500 text-[#701a31] dark:text-[#00e599] focus:ring-[#701a31] dark:focus:ring-[#00e599] cursor-pointer shrink-0 accent-[#701a31] dark:accent-[#00e599]"
            />
            <label htmlFor="agree-checkbox" className="text-xs sm:text-sm text-black dark:text-zinc-100 font-extrabold cursor-pointer leading-snug select-none">
              I confirm that I have read, understood, and agree to uphold the <span className="text-[#701a31] dark:text-[#ff90e8]">CapiTalk Terms and Conditions</span> and treat my peers with respect.
            </label>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-black/15 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setViewState('privacy')}
              className="text-xs font-black text-gray-700 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors order-2 sm:order-1 cursor-pointer"
            >
              <span>Read Full Privacy &amp; Data Transparency Policy</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={handleAgreeClick}
              disabled={!hasAgreedCheck}
              className={`w-full sm:w-auto text-xs sm:text-sm px-7 py-3.5 rounded-2xl border-2 sm:border-3 border-black font-black flex items-center justify-center gap-2 transition-all order-1 sm:order-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                hasAgreedCheck
                  ? 'bg-[#00e599] hover:bg-[#00c985] text-black cursor-pointer scale-102 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-gray-200 dark:bg-zinc-800/80 text-gray-400 dark:text-zinc-600 border-gray-400 dark:border-zinc-700 cursor-not-allowed opacity-60 shadow-none'
              }`}
            >
              <span>I Understand &amp; Agree</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONDUCT PILLARS CARDS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>Community Standards &amp; Policies</span>
            </h2>
          </div>

          <div className="space-y-3.5">
            {conductPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#18181b] border-2 border-black dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.8)] transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${pillar.iconBg} border-2 border-black dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-xs`}>
                      {pillar.icon}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-black dark:text-white tracking-tight">
                      {pillar.title}
                    </h3>
                  </div>
                </div>

                <ul className="space-y-1.5 pl-3 sm:pl-4 border-l-2 border-black/15 dark:border-zinc-700 ml-4 sm:ml-5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {pillar.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-[#701a31] dark:text-[#ff90e8] font-black text-xs mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER MICRO NOTE */}
        <div className="text-center text-xs text-gray-600 dark:text-zinc-500 font-semibold space-y-1 pt-2">
          <p>CapiTalk @2026</p>
        </div>

      </div>
    </div>
  );
};
