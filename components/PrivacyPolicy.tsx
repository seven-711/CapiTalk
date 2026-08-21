'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Server,
  AlertTriangle,
  FileText,
  Trash2,
  ArrowLeft,
  Sparkles,
  Users,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Info,
} from 'lucide-react';

const FacebookIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      clipRule="evenodd"
    />
  </svg>
);

export const PrivacyPolicy: React.FC = () => {
  const { setViewState, goBack, currentUser } = useChatStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleClearLocalData = () => {
    if (typeof window !== 'undefined') {
      const confirmClear = window.confirm(
        'Are you sure you want to clear your local CapiTalk data (saved username, avatar, and custom themes)?'
      );
      if (confirmClear) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const faqs = [
    {
      q: 'Can professors, university staff, or anyone trace my real identity?',
      a: 'No. CapiTalk does not collect your student ID number, university portal login, official school email, or physical location. Everything you do on CapiTalk is linked only to your chosen pseudonym and avatar, which you can reset anytime.',
    },
    {
      q: 'Is CapiTalk an official service of Capitol University?',
      a: 'No. CapiTalk is an independent, student-led community platform created exclusively for Capitol University students. It is NOT officially run by, maintained by, or endorsed by Capitol University administration or faculty.',
    },
    {
      q: 'Are my private chat messages saved on a server or recorded permanently?',
      a: 'No. Chat sessions are strictly ephemeral in-memory streams. As soon as a chat ends, is skipped, or either partner disconnects, the conversation memory is immediately discarded. No chat history database is kept.',
    },
    {
      q: 'What information is stored on my personal device?',
      a: 'Only your self-selected pseudonym, chosen avatar, selected theme, and locally blocked user IDs are stored inside your browser’s localStorage. You can erase this data in 1 click using the reset button below.',
    },
    {
      q: 'What happens to notes I post on the Freedom Wall or Music Wall?',
      a: 'Wall notes and music embeds are public community messages visible to other students. They contain only the note text, selected department category, and creation time. No IP addresses or student profiles are attached.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#fbf9f5] py-4 sm:py-10 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && sessionStorage.getItem('capitalk_toc_accepted_session') !== 'true') {
                setViewState('terms');
              } else {
                goBack();
              }
            }}
            className="btn-gumroad-ghost text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 hover:border-black rounded-xl shadow-2xs font-extrabold bg-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black rounded-full text-[10px] sm:text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
              <span>Zero Data Logging</span>
            </span>
          </div>
        </div>

        {/* HERO HEADER CARD (Enhanced Neo-Brutalist Aesthetic) */}
        <div className="gumroad-feature-card p-6 sm:p-12 text-center bg-white relative overflow-hidden border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          {/* Floating Mascot Coins in Background */}
          <div className="absolute top-4 left-4 sm:left-8 pointer-events-none opacity-80 hidden sm:block">
            <CoinMascot size={56} tiltAngle={-16} symbol="C" />
          </div>
          <div className="absolute top-6 right-4 sm:right-8 pointer-events-none opacity-80 hidden sm:block">
            <CoinMascot size={64} tiltAngle={20} symbol="G" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            {/* Top Icon Badge */}
            <div className="inline-flex p-3.5 bg-[#fff1f3] border-2 border-black rounded-2xl mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#701a31]" />
            </div>

            {/* Display Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">
              Privacy &amp; Data Transparency
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-xs sm:text-base text-[#242423] font-medium leading-relaxed">
              CapiTalk operates on a strict <strong>privacy-first, zero-harvesting architecture</strong>. We don't collect student IDs, log IP addresses, or store conversation histories.
            </p>

            {/* Trust Pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-black text-gray-800">
              <span className="bg-[#ecfdf5] border-2 border-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero ID Collection</span>
              </span>
              <span className="bg-[#fff8e6] border-2 border-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Server className="w-4 h-4 text-amber-600" />
                <span>Ephemeral In-Memory Chats</span>
              </span>
              <span className="bg-[#fff1f3] border-2 border-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Users className="w-4 h-4 text-[#701a31]" />
                <span>Student-Led Initiative</span>
              </span>
            </div>
          </div>
        </div>

        {/* PROMINENT INSTITUTIONAL NON-AFFILIATION DISCLAIMER */}
        <div className="p-5 sm:p-8 bg-[#fff8e6] border-3 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left relative overflow-hidden">
          <div className="flex items-start gap-4 sm:gap-5">

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-black text-black tracking-tight mb-2">
                Capitol University (CU) Non-Affiliation Disclaimer
              </h2>
              <p className="text-xs sm:text-sm text-[#242423] font-medium leading-relaxed">
                <strong>CapiTalk is an independent student project created exclusively for the Capitol University student body.</strong> It is <strong>NOT</strong> an official platform of, operated by, maintained by, affiliated with, or endorsed by Capitol University administration or faculty.
              </p>
              <p className="text-xs sm:text-sm text-[#242423] font-medium leading-relaxed mt-2.5">
                All college names, department labels, and campus landmarks referenced on CapiTalk are used strictly for student community identification, peer discovery, and matchmaking purposes.
              </p>

              {/* Official Social Links Banner */}
              <div className="mt-4 pt-4 border-t-2 border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Info className="w-4 h-4 text-[#701a31] shrink-0" />
                  <span>Have questions or suggestions? Reach out via our Facebook page:</span>
                </div>

                <a
                  href="https://www.facebook.com/share/17PF9MvuSC/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gumroad-primary text-xs px-4 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white flex items-center justify-center gap-2 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 self-start sm:self-center"
                >
                  <span>@CapiTalk on Facebook</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3 CORE TRUST PILLARS (Enhanced Hairline Cards) */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Pillar 1 */}
          <div className="gumroad-feature-card p-6 sm:p-7 bg-white border-3 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fff1f3] border-2 border-black flex items-center justify-center text-[#701a31] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <EyeOff className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                1. Zero ID Collection
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed font-medium">
                We <strong>never</strong> request or store your student ID number, university portal passwords, school email, phone number, or government credentials.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="gumroad-feature-card p-6 sm:p-7 bg-white border-3 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fff8e6] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Server className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                2. Ephemeral Chats
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed font-medium">
                Private chat messages exist strictly in active browser RAM and encrypted WebSocket transport streams. When a chat ends, it is permanently wiped.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="gumroad-feature-card p-6 sm:p-7 bg-white border-3 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] border-2 border-black flex items-center justify-center text-emerald-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Database className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                3. On-Device Storage
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed font-medium">
                Your pseudonym, selected avatar, custom theme, and local blocklists remain strictly inside your browser’s <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">localStorage</code>.
              </p>
            </div>
          </div>
        </div>

        {/* VISUAL DATA LIFECYCLE PIPELINE */}
        <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left">
          <div className="border-b-2 border-black/10 pb-4 mb-6">
            <span className="bg-[#701a31] text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full border border-black uppercase tracking-wider shadow-2xs mb-2 inline-block">
              Technical Architecture
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              How Data Flows in CapiTalk
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
              A transparent look at how messages travel between student devices without server logging.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 relative">
            {/* Step 1 */}
            <div className="p-4 sm:p-5 bg-[#fbf9f5] border-2 border-black rounded-2xl flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#701a31] text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-black text-sm text-black">Local Browser Setup</h4>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  Your chosen pseudonym and avatar are saved exclusively on your own phone or laptop in browser storage.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> No central account created
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 sm:p-5 bg-[#fff8e6] border-2 border-black rounded-2xl flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#ffc900] text-black font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <h4 className="font-black text-sm text-black">Live WebSocket Stream</h4>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  During an active chat, messages travel in encrypted real-time streams between the two matched students in RAM.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Direct real-time transport
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 sm:p-5 bg-[#fff1f3] border-2 border-black rounded-2xl flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#c41e3a] text-white font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <h4 className="font-black text-sm text-black">Immediate Memory Wipe</h4>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  The moment either student taps "Next" or leaves the chat, the active session is destroyed and all message memory is purged.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-bold text-red-600 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> 100% Wiped on disconnect
              </div>
            </div>
          </div>
        </div>

        {/* DETAILED FEATURE-BY-FEATURE DATA HANDLING */}
        <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-6 text-left">
          <div className="border-b-2 border-black/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#701a31]" />
              Detailed Breakdown by Feature
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
              Transparent review of every feature available on the platform.
            </p>
          </div>

          {/* Feature 1 */}
          <div className="p-4 bg-[#fbf9f5] border-2 border-black/15 rounded-2xl">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#701a31] text-white text-xs flex items-center justify-center font-bold">1</span>
              Matchmaking &amp; Real-Time Chat Rooms
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed mb-2">
              When searching for a partner, only your chosen pseudonym and department are broadcast to the queue engine to find a match:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1 pl-2">
              <li>Messages, reactions, and image attachments are temporary live transmissions.</li>
              <li>No chat history database tables are indexed or saved.</li>
              <li>Exiting or skipping immediately purges all conversation buffers from memory.</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="p-4 bg-[#fbf9f5] border-2 border-black/15 rounded-2xl">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#ffc900] text-black text-xs flex items-center justify-center font-bold">2</span>
              Campus Freedom Wall &amp; Music Dedications
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed mb-2">
              Public wall notes and song dedications are intended for public campus sharing:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1 pl-2">
              <li>Notes contain only the text message, optional department tag, and timestamp.</li>
              <li>No IP addresses, student IDs, or cookies are attached to public posts.</li>
              <li>Notes auto-expire after their active duration or upon moderation review.</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="p-4 bg-[#fbf9f5] border-2 border-black/15 rounded-2xl">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#dc341e] text-white text-xs flex items-center justify-center font-bold">3</span>
              Safety Moderation &amp; Profanity Heuristics
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed mb-2">
              To keep the platform safe, supportive, and harassment-free:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1 pl-2">
              <li>Profanity and cyberbullying filters run locally in real-time without logging your messages.</li>
              <li>You can block abusive peers with 1 tap; blocked user lists stay on your device.</li>
              <li>Reports submitted via the top bar flag content to student moderators to enforce community rules.</li>
            </ul>
          </div>
        </div>

        {/* INTERACTIVE LOCAL DATA CONSOLE */}
        <div className="bg-[#fff1f3] border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-black text-red-700 font-black text-xs rounded-full mb-2 shadow-2xs">
                <Trash2 className="w-3.5 h-3.5" />
                <span>On-Device Storage Control</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-black tracking-tight">
                Manage or Reset Your Local Data
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1 leading-relaxed max-w-xl">
                Want a fresh start? You can completely clear all saved pseudonyms, avatars, color theme preferences, and local blocklists from this browser anytime.
              </p>
              {currentUser && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold bg-white/80 border border-black/20 px-3 py-1.5 rounded-xl">
                  <span>Current Local Profile:</span>
                  <span className="text-[#701a31] font-black">{currentUser.username}</span>
                  <span className="text-gray-500">({currentUser.department})</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearLocalData}
              className="btn-gumroad-primary text-xs sm:text-sm px-5 py-3 bg-[#dc341e] hover:bg-[#b92b17] text-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 font-black flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Local Data</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE FAQS ACCORDION */}
        <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-black tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#701a31]" />
              Frequently Asked Questions
            </h2>
            <span className="text-xs font-bold text-gray-500">Tap to expand</span>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className={`border-2 border-black rounded-2xl transition-all overflow-hidden ${
                    isOpen ? 'bg-[#fffdf7] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#fbf9f5] hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 font-extrabold text-xs sm:text-sm text-black"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#701a31] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs sm:text-sm text-gray-700 font-medium leading-relaxed border-t border-black/10 pt-3 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CTA BANNER (Vibrant Maroon + Coin Mascot) */}
        <div className="gumroad-feature-card p-6 sm:p-10 bg-[#701a31] text-black border-3 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">
          <div className="relative z-10 max-w-lg mx-auto">
            <CoinMascot size={52} tiltAngle={12} className="mx-auto mb-3" />
            <h3 className="text-xl sm:text-3xl font-black tracking-tight">
              Ready to Connect Safely?
            </h3>
            <p className="text-xs sm:text-sm text-black/90 mt-2 leading-relaxed font-medium">
              Experience anonymous campus conversation without compromising your privacy or personal information.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                className="bg-[#ffc900] text-black font-black py-3.5 px-7 rounded-full border-2 border-black hover:bg-white transition-all text-xs sm:text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
              >
                <span>{currentUser ? 'Start Chatting Now' : 'Join CapiTalk'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewState('freedom_wall')}
                className="bg-white text-black font-black py-3.5 px-7 rounded-full border-2 border-black hover:bg-gray-100 transition-all text-xs sm:text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto hover:scale-105 active:scale-95"
              >
                <span>Explore Freedom Wall →</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
