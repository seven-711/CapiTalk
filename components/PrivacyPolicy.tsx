'use client';

import React from 'react';
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
} from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  const { setViewState, currentUser } = useChatStore();

  const handleClearLocalData = () => {
    if (typeof window !== 'undefined') {
      const confirmClear = window.confirm(
        'Are you sure you want to clear your local CapiTalk data (saved username, avatar, and theme)?'
      );
      if (confirmClear) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fbf9f5] py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
        {/* Navigation Breadcrumb / Back Button */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setViewState('landing')}
            className="btn-gumroad-ghost text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 hover:border-black rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <span className="text-[11px] sm:text-xs font-bold text-gray-500 bg-white border border-[#d1d5dc] px-3 py-1 rounded-full shadow-2xs">
            Student Data Transparency &amp; Policy
          </span>
        </div>

        {/* Hero Section */}
        <div className="gumroad-feature-card p-6 sm:p-10 text-center bg-white relative overflow-hidden border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
          <div className="inline-flex p-3 bg-[#fff1f3] border-2 border-black rounded-2xl mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#701a31]" />
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">
            Privacy &amp; Data Transparency
          </h1>

          <p className="mt-3 text-xs sm:text-base text-[#242423] max-w-2xl mx-auto font-medium leading-relaxed">
            CapiTalk is designed with a strict <strong>privacy-first, zero-data-harvesting architecture</strong>. Here is exactly how your privacy is safeguarded and how information is processed.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-black text-gray-700">
            <span className="bg-[#f4f4f0] border border-black/20 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero Personal ID Logging
            </span>
            <span className="bg-[#f4f4f0] border border-black/20 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ephemeral In-Memory Chats
            </span>
            <span className="bg-[#f4f4f0] border border-black/20 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Independent Student-Led
            </span>
          </div>
        </div>

        {/* PROMINENT INSTITUTIONAL DISCLAIMER */}
        <div className="p-5 sm:p-7 bg-[#fff8e6] border-3 border-black rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 bg-[#ffc900] border-2 border-black rounded-xl text-black shrink-0 mt-0.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-black tracking-tight mb-1.5 uppercase">
                Capitol University (CU) Non-Affiliation Disclaimer
              </h2>
              <p className="text-xs sm:text-sm text-[#242423] font-medium leading-relaxed">
                <strong>CapiTalk is an independent student project created exclusively for the Capitol University student community.</strong> It is <strong>NOT</strong> an official platform of, operated by, maintained by, affiliated with, or endorsed by Capitol University administration or faculty.
              </p>
              <p className="text-xs sm:text-sm text-[#242423] font-medium leading-relaxed mt-2">
                All college names, department labels, and campus landmarks referenced on CapiTalk are used strictly for community organization, peer discovery, and student matchmaking purposes.
              </p>
              <div className="mt-3.5 pt-3 border-t border-black/10 flex flex-wrap items-center gap-3">
                <a
                  href="https://www.facebook.com/share/17PF9MvuSC/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-black rounded-full shadow-2xs border border-black transition-all hover:scale-105"
                >
                  <span>Official Facebook Page: @CapiTalk</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Trust Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          <div className="gumroad-feature-card p-5 sm:p-6 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#fff1f3] border-2 border-black flex items-center justify-center mb-3.5 text-[#701a31] shadow-2xs">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-black">1. Zero ID Collection</h3>
            <p className="text-xs text-gray-700 mt-2 leading-relaxed font-medium">
              We <strong>never</strong> ask for your student ID number, university portal password, official school email, phone number, or government identity.
            </p>
          </div>

          <div className="gumroad-feature-card p-5 sm:p-6 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#fff8e6] border-2 border-black flex items-center justify-center mb-3.5 text-[#ffc900] shadow-2xs">
              <Server className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-black">2. Ephemeral Chat Streams</h3>
            <p className="text-xs text-gray-700 mt-2 leading-relaxed font-medium">
              Private chat messages exist only in active browser memory and real-time WebSocket transport. When a chat ends, the conversation is wiped.
            </p>
          </div>

          <div className="gumroad-feature-card p-5 sm:p-6 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] border-2 border-black flex items-center justify-center mb-3.5 text-emerald-700 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-black">3. On-Device Storage</h3>
            <p className="text-xs text-gray-700 mt-2 leading-relaxed font-medium">
              Your pseudonym, selected avatar, and custom color themes are saved locally inside your browser's <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">localStorage</code>.
            </p>
          </div>
        </div>

        {/* Detailed Data Processing Breakdown */}
        <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6 sm:space-y-8 text-left">
          <div className="border-b-2 border-black/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#701a31]" />
              Detailed Breakdown: How Your Data is Handled
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
              Transparency on what happens during each feature of CapiTalk.
            </p>
          </div>

          {/* Section 1: Chatroom & Random Matchmaking */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#701a31] text-white text-xs flex items-center justify-center font-bold">1</span>
              Matchmaking &amp; Real-Time Chat Rooms
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed pl-8">
              When entering the queue, only your selected pseudonym and department are broadcast to the live matchmaking engine to find a compatible partner. Once matched:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1.5 pl-8">
              <li>Messages, reactions, and uploaded images are streamed via real-time WebSocket/Supabase channels directly between the two active peers.</li>
              <li>No chat history database records are indexed or permanently stored.</li>
              <li>Exiting or skipping the chat terminates the session and frees memory.</li>
            </ul>
          </div>

          {/* Section 2: Freedom Wall & Music Wall */}
          <div className="space-y-2 border-t border-black/10 pt-4">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#ffc900] text-black text-xs flex items-center justify-center font-bold">2</span>
              Campus Freedom Wall &amp; Music Wall Posts
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed pl-8">
              Public board notes and shared song embeds are intended for community sharing:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1.5 pl-8">
              <li>Freedom Wall notes contain only the message text, optional category/department tag, and timestamp.</li>
              <li>No IP addresses, device identifiers, or tracking tokens are linked to your notes.</li>
              <li>Notes expire automatically after their active duration or can be moderated/reported by students.</li>
            </ul>
          </div>

          {/* Section 3: Safety, Moderation & Profanity Filtering */}
          <div className="space-y-2 border-t border-black/10 pt-4">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#dc341e] text-white text-xs flex items-center justify-center font-bold">3</span>
              Safety Moderation &amp; Profanity Filtering
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed pl-8">
              To keep CapiTalk welcoming, respectful, and safe for all students:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 font-medium space-y-1.5 pl-8">
              <li>Harmful keywords and hate speech are checked in real-time client-side heuristics.</li>
              <li>Users can block abusive peers with 1-click; your blocklist remains strictly on your device.</li>
              <li>Reported content is flagged for review solely to enforce community safety guidelines.</li>
            </ul>
          </div>

          {/* Section 4: User Control & Reset */}
          <div className="border-t border-black/10 pt-4 bg-[#fcfbf9] p-4 rounded-2xl border border-black/20">
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Full Control Over Your Local Data
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed mt-1">
              You can wipe all saved avatars, pseudonyms, custom theme choices, and cached preferences stored on this browser anytime:
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleClearLocalData}
                className="btn-gumroad-ghost text-xs px-4 py-2 text-red-600 border-red-300 hover:border-red-600 hover:bg-red-50 rounded-xl font-black"
              >
                Clear All Local Data &amp; Reset Browser Storage
              </button>
            </div>
          </div>
        </div>

        {/* Quick FAQs */}
        <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left space-y-4">
          <h2 className="text-lg sm:text-xl font-black text-black tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#701a31]" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            <div className="p-3.5 bg-[#fbf9f5] border border-black/10 rounded-xl">
              <h4 className="text-xs sm:text-sm font-extrabold text-black">
                Can teachers, university staff, or anyone see my real name?
              </h4>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">
                No. Because CapiTalk never collects your real name, student number, or school login, nobody can identify you through the platform unless you personally choose to disclose your info in chat.
              </p>
            </div>

            <div className="p-3.5 bg-[#fbf9f5] border border-black/10 rounded-xl">
              <h4 className="text-xs sm:text-sm font-extrabold text-black">
                Is CapiTalk officially run by Capitol University?
              </h4>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">
                No. CapiTalk is a student-built independent initiative created for fellow CU students to connect across departments and share campus life.
              </p>
            </div>

            <div className="p-3.5 bg-[#fbf9f5] border border-black/10 rounded-xl">
              <h4 className="text-xs sm:text-sm font-extrabold text-black">
                Are my messages saved on a server permanently?
              </h4>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed font-medium">
                No. Chat conversations are ephemeral and exist only during your active chat session. They are cleared when you or your partner disconnects.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="gumroad-feature-card p-6 sm:p-8 bg-[#701a31] text-white border-3 border-black rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <CoinMascot size={48} tiltAngle={12} className="mx-auto mb-3" />
          <h3 className="text-lg sm:text-2xl font-black tracking-tight">
            Ready to Connect with Fellow CU Students?
          </h3>
          <p className="text-xs sm:text-sm text-white/90 mt-1.5 max-w-md mx-auto leading-relaxed">
            Jump into the live matchmaking queue or share your thoughts on the Freedom Wall.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setViewState(currentUser ? 'queue' : 'register')}
              className="bg-[#ffc900] text-black font-extrabold py-3 px-6 rounded-full border-2 border-black hover:bg-white transition-all text-xs sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>{currentUser ? 'Start Chatting Now' : 'Join CapiTalk'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="bg-white text-black font-extrabold py-3 px-6 rounded-full border-2 border-black hover:bg-gray-100 transition-all text-xs sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto"
            >
              <span>View Freedom Wall</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
