'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { Navbar } from '../components/Navbar';
import { CoinMascot } from '../components/CoinMascot';
import { RegistrationModal } from '../components/RegistrationModal';
import { MatchmakingScreen } from '../components/MatchmakingScreen';
import { ChatRoom } from '../components/ChatRoom';
import { AdminDashboard } from '../components/AdminDashboard';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

export default function Home() {
  const { currentUser, viewState, setViewState, initSession, isSearching, activeRoom, partnerLeft } = useChatStore();

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

  return (
    <div className={`flex flex-col bg-[#f4f4f0] text-[#000000] ${
      viewState === 'chat' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Top Navbar (Hidden in chatroom view) */}
      {viewState !== 'chat' && <Navbar />}

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {viewState === 'register' && <RegistrationModal />}

        {viewState === 'queue' && <MatchmakingScreen />}

        {viewState === 'chat' && <ChatRoom />}

        {viewState === 'admin' && <AdminDashboard />}

        {viewState === 'landing' && (
          <div className="w-full">
            {/* HERO SECTION */}
            <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-8 max-w-[1200px] mx-auto overflow-hidden">
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

              <div className="text-center max-w-3xl mx-auto relative z-10">
                {/* School Tagline Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#000000] rounded-full text-xs font-bold text-black mb-6 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff90e8]" />
                  <span>Campus-Wide Student Chat</span>
                </div>

                {/* Oversized Display Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.02] text-black">
                  Connect Beyond Your Department.
                </h1>

                {/* Subtitle */}
                <p className="mt-6 text-lg sm:text-xl text-[#242423] max-w-2xl mx-auto font-normal leading-relaxed">
                  The anonymous, real-time campus chat built for students. Meet new friends from Computer Studies, Nursing, Engineering, and more.
                </p>

                {/* Main CTA Controls */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {currentUser ? (
                    <button
                      onClick={() => setViewState('queue')}
                      className="btn-gumroad-primary text-lg px-8 py-4 w-full sm:w-auto shadow-lg"
                    >
                      <span>Start Chatting Now</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewState('register')}
                      className="btn-gumroad-primary text-lg px-8 py-4 w-full sm:w-auto shadow-lg"
                    >
                      <span>Join CapiTalk — It's Free</span>
                    </button>
                  )}

                  <a
                    href="#features"
                    className="btn-gumroad-ghost text-base px-6 py-4 w-full sm:w-auto"
                  >
                    <span>Explore Features</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </a>
                </div>

                {/* Micro Guarantee Label */}
                <p className="mt-4 text-xs font-medium text-[#242423]">
                  🔒 No real names or student IDs are ever shared inside chats.
                </p>
              </div>
            </section>


            {/* FEATURE CARDS GRID (Gumroad Hairline Aesthetic) */}
            <section id="features" className="py-8 sm:py-16 px-3 sm:px-8 max-w-[1200px] mx-auto">
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
                <span className="bg-[#ffc900] text-black text-xs font-bold px-3 py-1 rounded-full border border-black uppercase tracking-wider">
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
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ff90e8] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Smart Department Filtering
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Choose to pair with students from your own department or explore connections in Engineering, Nursing, Education, and Business.
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

                {/* Feature 5 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f4f4f0] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Client Image Compression
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Upload notes or study memes safely. Images are compressed client-side and converted to lightweight WebP thumbnails automatically.
                  </p>
                </div>

                {/* Feature 6 */}
                <div className="gumroad-feature-card p-5 sm:p-8 bg-black text-white hover:opacity-95 transition-opacity flex flex-col justify-between">
                  <div>
                    <CoinMascot size={40} tiltAngle={12} className="mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      Ready to Start?
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300 mt-2">
                      Join hundreds of students chatting right now. No lengthy setup required!
                    </p>
                  </div>
                  <button
                    onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                    className="mt-5 sm:mt-6 bg-[#ff90e8] text-black font-bold py-2.5 sm:py-3 px-4 rounded border border-white hover:bg-white transition-colors text-sm"
                  >
                    Launch Chat Room →
                  </button>
                </div>
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
                      Use the top-bar Report button anytime to alert campus moderators to inappropriate behavior.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER — hidden during active chat to save screen space */}
      {viewState !== 'chat' && (
        <footer className="bg-[#f4f4f0] border-t border-[#d1d5dc] py-8 px-4 sm:px-8 mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CoinMascot size={28} tiltAngle={-6} />
              <span className="font-bold text-sm text-black">CapiTalk</span>
              <span className="text-xs text-[#242423]">© 2026 CapiTalk Student Community</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-[#242423]">
              <button onClick={() => setViewState('landing')} className="hover:text-black">
                Home
              </button>
              <button onClick={() => setViewState('register')} className="hover:text-black">
                Register
              </button>
              <button onClick={() => setViewState('admin')} className="hover:text-black">
                Admin Access
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
