'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { Navbar } from '../components/Navbar';
import { CoinMascot } from '../components/CoinMascot';
import { RegistrationModal } from '../components/RegistrationModal';
import { MatchmakingScreen } from '../components/MatchmakingScreen';
import { ChatRoom } from '../components/ChatRoom';
import { AdminDashboard } from '../components/AdminDashboard';
import { FreedomWall } from '../components/FreedomWall';
import { MusicWall } from '../components/MusicWall';
import { CampusMap } from '../components/CampusMap';
import { BannedScreen } from '../components/BannedScreen';
import { PrivacyPolicy } from '../components/PrivacyPolicy';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  MessageSquare,
  ChevronDown,
  X,
  Radio,
  ExternalLink,
  Music,
  MapPin,
  Compass,
  Heart,
  MessageCircle,
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

export default function Home() {
  const {
    currentUser,
    viewState,
    setViewState,
    initSession,
    isSearching,
    activeRoom,
    partnerLeft,
    actionToast,
    clearToast,
    systemAnnouncement,
    dismissAnnouncement,
    freedomPosts,
    mapPins,
  } = useChatStore();

  React.useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionToast, clearToast]);

  React.useEffect(() => {
    initSession();
  }, [initSession]);

  // Prevent accidental page reloads while searching or active in a chat
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSearching || (activeRoom && !partnerLeft)) {
        e.preventDefault();
        e.returnValue = 'You are currently searching for or chatting with a student. Are you sure you want to reload?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSearching, activeRoom, partnerLeft]);

  if (viewState === 'ceased') {
    return <BannedScreen />;
  }

  return (
    <div className={`flex flex-col bg-[#f4f4f0] text-[#000000] ${
      viewState === 'chat' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] animate-in fade-in slide-in-from-top-3 duration-300">
          <div className={`p-3 rounded-xl border-2 shadow-2xl flex items-center justify-between gap-3 text-xs font-bold ${
            actionToast.type === 'error' || actionToast.type === 'ban'
              ? 'bg-[#dc341e] text-white border-black'
              : actionToast.type === 'block' || actionToast.type === 'report'
              ? 'bg-black text-white border-black'
              : 'bg-[#ffc900] text-black border-black'
          }`}>
            <div className="flex items-center gap-2">
              <span>{actionToast.message}</span>
            </div>
            <button onClick={clearToast} className="p-0.5 hover:opacity-75 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar (Hidden in chatroom view) */}
      {viewState !== 'chat' && <Navbar />}

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {viewState === 'register' && <RegistrationModal />}

        {viewState === 'queue' && <MatchmakingScreen />}

        {viewState === 'chat' && <ChatRoom />}

        {viewState === 'admin' && <AdminDashboard />}

        {viewState === 'freedom_wall' && <FreedomWall />}
        {viewState === 'music_wall' && <MusicWall />}
        {viewState === 'campus_map' && <CampusMap />}
        {viewState === 'privacy' && <PrivacyPolicy />}

        {viewState === 'landing' && (
          <div className="w-full">
            {/* HERO SECTION */}
            <section className="relative pt-3 pb-8 sm:pt-6 sm:pb-12 px-3 sm:px-6 max-w-[1200px] mx-auto overflow-hidden">
              {/* Floating Decorative Mascot Coins */}
              <div className="absolute top-6 left-4 sm:left-12 pointer-events-none opacity-85">
                <CoinMascot size={76} tiltAngle={-18} symbol="C" />
              </div>
              <div className="absolute top-12 right-6 sm:right-16 pointer-events-none opacity-90">
                <CoinMascot size={96} tiltAngle={22} symbol="G" />
              </div>
              <div className="absolute bottom-4 right-1/3 pointer-events-none opacity-40 hidden sm:block">
                <CoinMascot size={54} tiltAngle={-8} symbol="CU" />
              </div>

              <div className="text-center max-w-4xl mx-auto relative z-10">
                {/* School Tagline Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-black rounded-full text-xs font-extrabold text-black mb-4 sm:mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c41e3a] animate-pulse" />
                  <span>Capitol University Student Hub</span>
                </div>

                {/* Oversized Display Headline */}
                <h1 className="text-3xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-black">
                  Connect Beyond Your Department.
                </h1>

                {/* Subtitle */}
                <p className="mt-4 sm:mt-6 text-base sm:text-xl text-[#242423] max-w-2xl mx-auto font-normal leading-relaxed">
                  The anonymous, real-time campus platform built for CU students. Chat, share confessions on the Freedom Wall, dedicate songs, or drop memories on the campus map.
                </p>

                {/* Mobile & Desktop Quick Feature Jump Bar */}
                <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-2xl mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                    className="p-3 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#701a31] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-black leading-tight">1-on-1 Chat</span>
                    <span className="text-[10px] text-gray-600 font-bold">Live Match</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewState('freedom_wall')}
                    className="p-3 bg-white hover:bg-[#fff1f3] border-2 border-black rounded-2xl flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#ffc900] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                      <Radio className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-black leading-tight">Freedom Wall</span>
                    <span className="text-[10px] text-gray-600 font-bold">{freedomPosts.length > 0 ? `${freedomPosts.length} Posts` : 'Confessions'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewState('music_wall')}
                    className="p-3 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#ff90e8] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                      <Music className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-black leading-tight">Music Wall</span>
                    <span className="text-[10px] text-gray-600 font-bold">Dedications</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewState('campus_map')}
                    className="p-3 bg-white hover:bg-[#e2f9eb] border-2 border-black rounded-2xl flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#00e599] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-black leading-tight">Silip Map</span>
                    <span className="text-[10px] text-gray-600 font-bold">{mapPins.length > 0 ? `${mapPins.length} Pins` : 'CU Pins'}</span>
                  </button>
                </div>

                {/* Main CTA Controls */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  {currentUser ? (
                    <button
                      onClick={() => setViewState('queue')}
                      className="btn-gumroad-primary text-base sm:text-lg px-8 py-3.5 sm:py-4 w-full sm:w-auto shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Start Chatting Now</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewState('register')}
                      className="btn-gumroad-primary text-base sm:text-lg px-8 py-3.5 sm:py-4 w-full sm:w-auto shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Join CapiTalk — It's Free</span>
                    </button>
                  )}

                  <a
                    href="#campus-features"
                    className="btn-gumroad-ghost text-sm sm:text-base px-6 py-3.5 sm:py-4 w-full sm:w-auto flex items-center justify-center gap-1.5"
                  >
                    <span>View All Features</span>
                  </a>
                </div>

                {/* Micro Guarantee Label & Privacy Link */}
                <div className="mt-4 flex flex-col items-center gap-1 text-xs font-medium text-[#242423]">
                  <p className="text-[11px] sm:text-xs">No real names, student numbers, or university logins are ever collected.</p>
                  <button
                    type="button"
                    onClick={() => setViewState('privacy')}
                    className="text-[11px] sm:text-xs font-black text-[#701a31] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Read our Privacy &amp; Data Transparency Guarantee</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </section>


            {/* FEATURE CARDS GRID (Gumroad Hairline Aesthetic) */}
            <section id="features" className="py-8 sm:py-16 px-3 sm:px-8 max-w-[1200px] mx-auto">
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
                <span className="bg-[#701a31] text-white text-xs font-extrabold px-3.5 py-1 rounded-full border-2 border-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Campus Built
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-black tracking-tight mt-3">
                  Designed for CU Students
                </h2>
                <p className="text-sm sm:text-base text-[#242423] mt-2">
                  Everything you need to discover new friendships and expand your campus network safely.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Feature 1 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#701a31] border-2 border-black flex items-center justify-center mb-4 sm:mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Smart Department Filtering
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Choose to pair with students from your own department or explore connections in Engineering, Nursing, Education, Business, Computer Studies, CAS, Maritime, and Criminology.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ffc900] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Instant Real-Time Chat
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Fast messaging powered by WebSocket real-time streams with live typing indicators, delivery checkmarks, and instant skip options.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f1f333] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Privacy-First &amp; Ephemeral
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    No real names or student numbers are exposed. Chat logs and temporary media expire automatically when a conversation ends.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#dc341e] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Safety &amp; Moderation
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Integrated profanity filters, instant reporting, user blocking, and administrative review to keep the community safe.
                  </p>
                </div>

                {/* Feature 5 - Campus Freedom Wall */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors bg-[#fff1f3] border-2 border-black flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ffc900] border-2 border-black flex items-center justify-center mb-4 sm:mb-6 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      📜
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                        Campus Freedom Wall
                      </h3>
                      <span className="px-2.5 py-0.5 bg-[#701a31] text-white text-[10px] font-extrabold rounded-full border border-black uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                      Leave anonymous thoughts, confessions, study advice, &amp; campus shoutouts on a dedicated public board with upvotes and department filtering.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewState('freedom_wall')}
                    className="mt-4 text-xs font-extrabold text-[#701a31] underline hover:text-black transition-colors flex items-center gap-1 self-start"
                  >
                    <span>View Freedom Wall</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Feature 6 - Action CTA Card */}
                <div className="gumroad-feature-card p-5 sm:p-8 bg-[#701a31] text-black hover:opacity-95 transition-opacity flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div>
                    <CoinMascot size={40} tiltAngle={12} className="mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                      Ready to Connect &amp; Share?
                    </h3>
                    <p className="text-xs sm:text-sm text-black-200 mt-2">
                      Join hundreds of students chatting live or posting on the Freedom Wall right now!
                    </p>
                  </div>
                  <div className="mt-5 sm:mt-6 flex flex-col gap-2">
                    <button
                      onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                      className="bg-[#c41e3a] text-white font-extrabold py-2.5 px-4 rounded-xl border-2 border-black hover:bg-white hover:text-black transition-all text-xs sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Launch Chat Room →
                    </button>
                    <button
                      onClick={() => setViewState('freedom_wall')}
                      className="bg-white text-black font-extrabold py-2 px-4 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-all text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Open Freedom Wall
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* OFFICIAL FACEBOOK COMMUNITY SHOWCASE */}
            <section className="py-8 sm:py-12 px-3 sm:px-8 max-w-[1200px] mx-auto">
              <div className="p-6 sm:p-10 text-left">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  {/* Left Info Column */}
                  <div className="max-w-xl flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2]/10 border border-[#1877f2]/30 text-[#1877f2] font-black text-xs rounded-full mb-3 shadow-2xs">
                      <FacebookIcon className="w-3.5 h-3.5 fill-[#1877f2]" />
                      <span>Official Facebook Page</span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight leading-tight">
                      Follow CapiTalk on Facebook
                    </h2>

                    <p className="text-xs sm:text-sm text-[#242423] font-medium mt-3 leading-relaxed">
                      Stay connected with the latest campus updates, featured Freedom Wall confessions, platform news, maintenance notices, and student community announcements.
                    </p>

                    <div className="mt-4 p-3.5 bg-[#fbf9f5] border border-black/15 rounded-2xl space-y-1.5 text-xs text-gray-700 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📍</span>
                        <span>Capitol University, Cagayan de Oro, Philippines, 9000</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">💬</span>
                        <span>Direct inquiries via Facebook Messenger</span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                      <a
                        href="https://www.facebook.com/share/17PF9MvuSC/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gumroad-primary w-full sm:w-auto text-xs sm:text-sm px-6 py-3.5 bg-[#1877f2] hover:bg-[#166fe5] text-white flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-full"
                      >
                        <FacebookIcon className="w-4 h-4 fill-white" />
                        <span>Visit Facebook Page</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    </div>
                  </div>

                  {/* Right Visual Card — Phone / Screenshot Showcase */}
                  <div className="w-full lg:w-[360px] shrink-0 flex justify-center">
                    <a
                      href="https://www.facebook.com/share/17PF9MvuSC/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative rounded-2xl overflow-hidden border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.02] active:scale-[0.99] transition-all bg-[#701a31] max-w-[300px] sm:max-w-[330px]"
                    >
                      {/* Top banner image */}
                      <div className="relative aspect-[3/1] w-full overflow-hidden bg-[#701a31] border-b-2 border-black">
                        <img
                          src="/images/fb-cover-banner.png"
                          alt="CapiTalk Facebook Banner"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Main Mobile Screenshot Mockup */}
                      <div className="relative bg-[#1c1c1e] p-2 text-white">
                        <img
                          src="/images/fb-page-preview.png"
                          alt="CapiTalk Facebook Page Preview"
                          className="w-full h-auto rounded-xl object-contain shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-xs">
                          <span className="px-4 py-2 bg-white text-black font-extrabold text-xs rounded-full border-2 border-black shadow-lg flex items-center gap-1.5">
                            <FacebookIcon className="w-3.5 h-3.5 fill-[#1877f2]" />
                            <span>Open Page on Facebook ↗</span>
                          </span>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* DATA PRIVACY & NON-AFFILIATION DISCLAIMER BANNER */}
            <section className="py-8 sm:py-12 px-3 sm:px-8 max-w-[1200px] mx-auto">
              <div className="bg-[#fff8e6] border-3 border-black rounded-3xl p-6 sm:p-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <span className="bg-[#ffc900] text-black text-[10px] sm:text-xs font-black px-3 py-1 rounded-full border border-black uppercase tracking-wider shadow-2xs mb-3 inline-block">
                    Student Data Guarantee &amp; Disclaimer
                  </span>
                  <h3 className="text-xl sm:text-3xl font-black text-black tracking-tight">
                    Zero Data Harvested. Built Exclusively for CU Students.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] font-medium mt-2 leading-relaxed">
                    CapiTalk is an independent, student-led community project. We do not collect student IDs, university portal logins, or personal details, and chats disappear when sessions end.
                  </p>
                  <p className="text-[11px] sm:text-xs text-gray-600 font-semibold mt-2">
                    * Note: CapiTalk is an independent platform and not officially affiliated with Capitol University.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewState('privacy')}
                  className="btn-gumroad-primary text-xs sm:text-sm px-6 py-3.5 whitespace-nowrap bg-[#701a31] hover:bg-[#4d0d1f] text-white shrink-0 self-start md:self-center"
                >
                  <span>Read Data Policy &amp; Disclaimer →</span>
                </button>
              </div>
            </section>

            {/* COMMUNITY GUIDELINES SECTION */}
            <section className="bg-white border-t border-[#d1d5dc] py-16 px-4 sm:px-8">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-black tracking-tight">
                    Community Guidelines
                  </h2>
                  <p className="text-sm text-[#242423] mt-1">
                    Keep CapiTalk safe, welcoming, and fun for all students.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Be Respectful
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Treat every fellow student with kindness. Harassment or toxicity will result in an immediate ban.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Keep Private Details Safe
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Do not share passwords, phone numbers, or student ID numbers in random chat rooms.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> No Explicit Media
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      NSFW images or hate speech are strictly prohibited and flagged for administrative review.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Report Misconduct
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Use the top-bar Report button anytime to alert CapiTalk moderators to inappropriate behavior.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER — hidden during active chat & full screen campus map */}
      {viewState !== 'chat' && viewState !== 'campus_map' && (
        <footer className="bg-[#f4f4f0] border-t border-[#d1d5dc] py-8 px-4 sm:px-8 mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <CoinMascot size={28} tiltAngle={-6} />
                <span className="font-extrabold text-sm text-black">CapiTalk</span>
              </div>
              <span className="text-xs text-[#242423] font-medium">
                Independent student community platform • Not affiliated with Capitol University
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#242423]">
              <button onClick={() => setViewState('landing')} className="hover:text-black transition-colors">
                Home
              </button>
              <button onClick={() => setViewState('register')} className="hover:text-black transition-colors">
                Register
              </button>
              <button onClick={() => setViewState('freedom_wall')} className="hover:text-black transition-colors">
                Freedom Wall
              </button>
              <button onClick={() => setViewState('privacy')} className="text-[#701a31] hover:underline font-extrabold transition-colors">
                Privacy Policy
              </button>
              <a
                href="https://www.facebook.com/share/17PF9MvuSC/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full font-extrabold text-xs shadow-2xs border border-black transition-all hover:scale-105 active:scale-95"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-white" />
                <span>Facebook Page</span>
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
