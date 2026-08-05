'use client';

import React from 'react';
import { CoinMascot } from './CoinMascot';
import { useChatStore } from '../lib/store/useChatStore';
import {
  ShieldAlert,
  Lock,
  MessageSquare,
  Radio,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Sparkles,
  ExternalLink,
  Info,
  XCircle,
} from 'lucide-react';

export const CeasedPage: React.FC = () => {
  const { setViewState } = useChatStore();

  const handleServiceClick = (serviceName: string) => {
    // Calling setViewState triggers the blocked state & toast in store
    setViewState('queue');
  };

  return (
    <div className="w-full bg-[#f4f4f0] text-black pb-16">
      {/* Sunset Banner / Header */}
      <section className="relative pt-6 pb-10 sm:pt-12 sm:pb-16 px-4 sm:px-8 max-w-[1200px] mx-auto overflow-hidden">
        {/* Floating Decorative Mascot Coins */}
        <div className="absolute top-4 left-4 sm:left-12 pointer-events-none opacity-40 grayscale">
          <CoinMascot size={72} tiltAngle={-15} symbol="C" />
        </div>
        <div className="absolute top-10 right-6 sm:right-16 pointer-events-none opacity-40 grayscale">
          <CoinMascot size={88} tiltAngle={20} symbol="CU" />
        </div>

        <div className="text-center max-w-3xl mx-auto relative z-10">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#dc341e] text-white border-2 border-black rounded-full text-xs sm:text-sm font-black mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Service Discontinued</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-black">
            CapiTalk Has Officially Ceased Operations
          </h1>

          {/* Subtitle / Farewell Note */}
          <p className="mt-6 text-base sm:text-xl text-[#242423] font-medium leading-relaxed max-w-2xl mx-auto">
            Thank you, Capitol University! CapiTalk has concluded its journey. All chat services, freedom wall postings, music wall dedications, and campus features are now permanently offline.
          </p>

          {/* Quick Notice Badge */}
          <div className="mt-8 p-4 bg-[#ffe3e8] border-2 border-black rounded-2xl max-w-xl mx-auto flex items-start sm:items-center gap-3 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-2 bg-[#dc341e] text-white rounded-xl border border-black shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-black">
                Notice on Platform Access &amp; Data
              </p>
              <p className="text-xs text-gray-800 mt-0.5 font-normal">
                Access to all live chats, public boards, and user accounts has been disabled. All active sessions and temporary data have been securely cleared per privacy policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE STATUS BREAKDOWN GRID */}
      <section className="py-8 px-4 sm:px-8 max-w-[1200px] mx-auto">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
          <span className="bg-black text-white text-xs font-extrabold px-3 py-1 rounded-full border border-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Decommissioned Services
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-black tracking-tight mt-3">
            Feature Availability Status
          </h2>
          <p className="text-xs sm:text-sm text-[#242423] mt-2">
            All interactive platform services have been decommissioned.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Anonymous Chat */}
          <div
            onClick={() => handleServiceClick('chat')}
            className="p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative opacity-75 hover:opacity-100 transition-all cursor-not-allowed group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-black flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-700" />
              </div>
              <span className="px-2.5 py-1 bg-[#dc341e] text-white text-[10px] font-black rounded-full border border-black uppercase">
                Offline
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-black">Random Student Chat</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Peer-to-peer anonymous matching across CU departments.
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-[#dc341e]" /> Disabled
              </span>
              <span className="group-hover:underline text-black">Ceased →</span>
            </div>
          </div>

          {/* Card 2: Freedom Wall */}
          <div
            onClick={() => handleServiceClick('freedom_wall')}
            className="p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative opacity-75 hover:opacity-100 transition-all cursor-not-allowed group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-black flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gray-700" />
              </div>
              <span className="px-2.5 py-1 bg-[#dc341e] text-white text-[10px] font-black rounded-full border border-black uppercase">
                Archived
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-black">Campus Freedom Wall</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Public confessions, thoughts, and campus shoutouts.
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-[#dc341e]" /> Disabled
              </span>
              <span className="group-hover:underline text-black">Ceased →</span>
            </div>
          </div>

          {/* Card 3: Music Wall */}
          <div
            onClick={() => handleServiceClick('music_wall')}
            className="p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative opacity-75 hover:opacity-100 transition-all cursor-not-allowed group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-black flex items-center justify-center">
                <Radio className="w-5 h-5 text-gray-700" />
              </div>
              <span className="px-2.5 py-1 bg-[#dc341e] text-white text-[10px] font-black rounded-full border border-black uppercase">
                Offline
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-black">Music Dedications</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Spotify song dedications and departmental jams.
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-[#dc341e]" /> Disabled
              </span>
              <span className="group-hover:underline text-black">Ceased →</span>
            </div>
          </div>

          {/* Card 4: Silip Campus Map */}
          <div
            onClick={() => handleServiceClick('campus_map')}
            className="p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative opacity-75 hover:opacity-100 transition-all cursor-not-allowed group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-black flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-700" />
              </div>
              <span className="px-2.5 py-1 bg-[#dc341e] text-white text-[10px] font-black rounded-full border border-black uppercase">
                Offline
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-black">Silip Campus Map</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Interactive memory map pins around Capitol University campus.
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-[#dc341e]" /> Disabled
              </span>
              <span className="group-hover:underline text-black">Ceased →</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAREWELL TRIBUTE & HIGHLIGHTS */}
      <section className="py-12 px-4 sm:px-8 max-w-[1000px] mx-auto">
        <div className="p-6 sm:p-10 bg-[#701a31] text-white rounded-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffc900] text-black font-black text-xs rounded-full border border-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Heart className="w-3.5 h-3.5 fill-current text-red-600" />
              <span>Final Farewell Message</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              To the Capitolians who shared their stories:
            </h2>

            <p className="mt-4 text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
              CapiTalk was built with a simple mission — to connect Capitol University students across departments, break down social barriers, and give everyone a safe space to talk, express, and dedicate music.
            </p>

            <p className="mt-3 text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
              Whether you made a lifelong friend from Nursing, shared study tips with Computer Studies students, or posted your favorite song on the Music Wall, thank you for being part of this experience.
            </p>

            {/* Department Badges Grid */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-xs font-extrabold text-[#ffc900] uppercase tracking-wider mb-3">
                Connected Colleges Across CU Campus
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'College of Computer Studies',
                  'College of Nursing',
                  'College of Engineering',
                  'College of Arts and Sciences',
                  'College of Business & Accountancy',
                  'College of Education',
                  'College of Maritime Education',
                  'College of Criminology',
                ].map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 bg-white/15 border border-white/30 rounded-full text-xs font-semibold text-white"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DATA PRIVACY & COMPLIANCE STATEMENTS */}
      <section className="py-8 px-4 sm:px-8 max-w-[1000px] mx-auto">
        <div className="p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-black" />
            <h3 className="text-lg font-extrabold text-black">
              Data Privacy &amp; Data Wiping Confirmation
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#f4f4f0] border border-gray-300 rounded-xl">
              <p className="font-extrabold text-black mb-1">💬 Ephemeral Chat Logs</p>
              <p className="text-gray-600">All live room messages, image uploads, and active sockets have been destroyed.</p>
            </div>
            <div className="p-3 bg-[#f4f4f0] border border-gray-300 rounded-xl">
              <p className="font-extrabold text-black mb-1">📜 Public Wall Posts</p>
              <p className="text-gray-600">Freedom wall posts, comments, and upvotes have been locked and unlinked.</p>
            </div>
            <div className="p-3 bg-[#f4f4f0] border border-gray-300 rounded-xl">
              <p className="font-extrabold text-black mb-1">👤 User Profiles</p>
              <p className="text-gray-600">Temporary session keys and local cache identifiers have been rendered inactive.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
