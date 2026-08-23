'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import {
  ShieldCheck,
  EyeOff,
  Database,
  Server,
  Trash2,
  ArrowLeft,
  Users,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

const FacebookIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
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
        'Are you sure you want to clear your local CapiTalk data (saved username, avatar, and preferences)?'
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
      a: 'No. CapiTalk does not collect your student ID number, university portal login, official school email, or physical location. Everything on CapiTalk is linked only to your chosen pseudonym and avatar, which you can reset anytime.',
    },
    {
      q: 'Is CapiTalk an official service of Capitol University?',
      a: 'No. CapiTalk is an independent, student-led community platform created exclusively for Capitol University students. It is NOT officially operated by, maintained by, or endorsed by Capitol University administration or faculty.',
    },
    {
      q: 'Are private chat messages saved on a server or recorded permanently?',
      a: 'No. Chat sessions are strictly ephemeral in-memory streams. As soon as a chat ends, is skipped, or either partner disconnects, the conversation memory is immediately discarded. No chat history database is kept.',
    },
    {
      q: 'What information is stored on my personal device?',
      a: 'Only your self-selected pseudonym, chosen avatar, theme settings, and locally blocked user IDs are stored inside your browser’s localStorage. You can clear this anytime.',
    },
    {
      q: 'What happens to notes I post on the Freedom Wall or Music Wall?',
      a: 'Wall notes and music embeds are public community messages. They contain only the note text, selected department category, and creation time. No IP addresses or student profiles are attached.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f4f4f0] py-4 sm:py-8 px-3 sm:px-6 font-sans text-black">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* ── UNIFIED SINGLE CONTAINER ────────────────────────────────────────── */}
        <div className="p-6 sm:p-10 shadow-xs space-y-8 text-left">
          
          {/* 1. Header Section */}
          <div className="space-y-3 pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff1f3] text-[#701a31] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  Privacy &amp; Data Transparency
                </h1>
                <p className="text-xs text-zinc-500 font-medium">Clear breakdown of how data is handled on CapiTalk</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
              CapiTalk operates on a strict <strong>privacy-first, zero-harvesting architecture</strong>. We do not collect student IDs, log IP addresses, or store conversation histories.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="bg-[#ecfdf5] text-emerald-800 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero ID Collection</span>
              </span>
              <span className="bg-[#fff8e6] text-amber-900 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-amber-600" />
                <span>Ephemeral In-Memory Chats</span>
              </span>
              <span className="bg-[#fff1f3] text-[#701a31] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#701a31]" />
                <span>Student-Led Community</span>
              </span>
            </div>
          </div>

          {/* 2. Non-Affiliation Notice */}
          <div className="p-4 bg-[#fff8e6] rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#701a31] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-black tracking-tight">
                Capitol University (CU) Non-Affiliation Notice
              </h2>
            </div>
            <p className="text-xs text-zinc-700 font-medium leading-relaxed">
              CapiTalk is an independent student project created for the Capitol University student body. It is <strong>NOT</strong> an official platform of, operated by, or endorsed by Capitol University administration or faculty.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-amber-200/60 text-xs">
              <span className="text-[11px] text-zinc-600 font-medium">Questions or feedback?</span>
              <a
                href="https://www.facebook.com/share/17PF9MvuSC/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1877f2] font-bold hover:underline inline-flex items-center gap-1"
              >
                <FacebookIcon className="w-3 h-3 fill-[#1877f2]" />
                <span>CapiTalk</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* 3. Core Trust Pillars */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-black uppercase tracking-wider text-zinc-400">
              Core Principles
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-50 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#fff1f3] text-[#701a31] flex items-center justify-center">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-black">1. Zero ID Collection</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  We never ask for or store student IDs, school emails, portal credentials, or phone numbers.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#fff8e6] text-amber-700 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-black">2. Ephemeral Chats</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Messages travel in live RAM streams only. When a chat ends, the session is purged immediately.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-emerald-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-black">3. On-Device Storage</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Your pseudonym, avatar, and blocked users live only in your browser’s local storage on your device.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Data Flow Timeline */}
          <div className="space-y-3 pt-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-black tracking-tight">
                How Data Flows in CapiTalk
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Message transport without persistent server storage</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-zinc-50 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#701a31] text-white font-bold text-[10px] flex items-center justify-center">1</span>
                  <h4 className="font-bold text-xs text-black">Browser Setup</h4>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                  Pseudonym &amp; avatar stay stored locally. No central account required.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#ffc900] text-black font-bold text-[10px] flex items-center justify-center">2</span>
                  <h4 className="font-bold text-xs text-black">Live WebSocket</h4>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                  Messages stream directly between matched peers in active RAM during chat.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#dc341e] text-white font-bold text-[10px] flex items-center justify-center">3</span>
                  <h4 className="font-bold text-xs text-black">Instant Wipe</h4>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                  Skipping or disconnecting deletes all active conversation buffers forever.
                </p>
              </div>
            </div>
          </div>

          {/* 5. Local Storage Controls */}
          <div className="p-4 bg-zinc-50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1 max-w-md">
              <h3 className="text-xs sm:text-sm font-bold text-black">
                On-Device Storage Control
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                Want a fresh start? Clear saved usernames, avatars, and local preferences from this browser.
              </p>
              {currentUser && (
                <p className="text-[11px] text-[#701a31] font-bold">
                  Active profile: @{currentUser.username} ({currentUser.department.replace('College of ', '')})
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearLocalData}
              className="px-4 py-2 bg-[#dc341e] hover:bg-[#b92b17] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Local Data</span>
            </button>
          </div>

          {/* 6. FAQs Accordion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black text-black tracking-tight flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#701a31]" />
                <span>Frequently Asked Questions</span>
              </h2>
            </div>

            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="bg-zinc-50 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 font-bold text-xs sm:text-sm text-black hover:bg-zinc-100/70 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#701a31] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-zinc-600 font-medium leading-relaxed border-t border-zinc-200/50 pt-2.5 bg-white/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
