import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import { ShieldAlert, Users, MessageSquare, ShieldCheck, UserCheck, Bell, Heart, MessageCircle, X, ArrowLeft } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';
import { WallNotification } from '../lib/types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    viewState,
    setViewState,
    wallNotifications,
    markWallNotificationsAsRead,
    clearWallNotifications,
    setTargetPostId,
  } = useChatStore();

  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const onlineCount = useOnlineCount();

  const unreadCount = (wallNotifications || []).filter((n) => !n.read).length;

  const handleNotifClick = (notif: WallNotification) => {
    setShowNotifPopover(false);
    // Except for admin: admin remarks do not scroll to a specific note
    if (notif.type === 'admin_remark') {
      setViewState('freedom_wall');
      return;
    }
    if (notif.post_id) {
      setTargetPostId(notif.post_id);
    }
    setViewState('freedom_wall');
  };

  if (viewState === 'chat') {
    return null;
  }

  const renderNotifItem = (notif: WallNotification) => (
    <div
      key={notif.id}
      onClick={() => handleNotifClick(notif)}
      className={`p-3 rounded-2xl border-2 border-black/20 hover:border-black cursor-pointer transition-all flex items-start gap-3 shadow-xs ${
        !notif.read ? 'bg-[#ffc900]/25 font-semibold border-black' : 'bg-white hover:bg-[#fff1f3]'
      }`}
    >
      <div className="p-2 rounded-full border-2 border-black shrink-0 bg-white shadow-xs">
        {notif.type === 'like' ? (
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        ) : notif.type === 'admin_remark' ? (
          <ShieldAlert className="w-4 h-4 text-[#701a31]" />
        ) : (
          <MessageCircle className="w-4 h-4 text-blue-600 fill-blue-100" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-black text-black leading-snug">
          {notif.type === 'like' ? (
            <>
              <span className="text-[#701a31]">{notif.actor_alias}</span> loved your note
            </>
          ) : notif.type === 'admin_remark' ? (
            <span className="text-[#701a31] font-black flex items-center gap-1">
              {notif.actor_alias} Notice & Remark
            </span>
          ) : (
            <>
              <span className="text-blue-700">{notif.actor_alias}</span> replied to your note
            </>
          )}
        </p>
        
        {notif.comment_text && (
          <p className="text-xs text-black/90 font-bold italic mt-1 line-clamp-2 bg-[#f4f4f0] p-2 rounded-xl border border-black/20">
            "{notif.comment_text}"
          </p>
        )}

        {notif.admin_remark && (
          <div className="mt-2 p-2.5 bg-[#ffc900]/30 border-2 border-black rounded-xl text-black text-xs font-bold leading-relaxed shadow-xs">
            <p className="text-[10px] uppercase text-[#701a31] font-black tracking-wider">Official Admin Remark:</p>
            <p className="text-xs text-black mt-0.5 font-extrabold">{notif.admin_remark}</p>
          </div>
        )}

        <p className="text-[10px] sm:text-xs text-gray-600 mt-1.5 flex items-center justify-between">
          <span className="truncate max-w-[200px]">Note: "{notif.message_snippet}"</span>
          <span className="shrink-0 font-bold">
            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <header className="w-full bg-[#f4f4f0] border-b border-[#d1d5dc] sticky p-2 top-0 z-40">
      <div className="max-w-[1200px] mx-auto px-2 sm:px-6 h-10 sm:h-14 flex items-center justify-between gap-1 sm:gap-2 relative">
        {/* Brand & Wordmark */}
        <div 
          onClick={() => setViewState('landing')}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
        >
          <CoinMascot size={22} tiltAngle={-8} />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm sm:text-xl tracking-tight text-[#000000]">
                CapiTalk
              </span>
            </div>
            <p className="text-[10px] text-[#242423] font-medium hidden md:block">
              Connect Beyond Your Department
            </p>
          </div>
        </div>

        {/* Live Status Badge — desktop only */}
        <div className="hidden lg:flex items-center gap-1.5 stat-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold whitespace-nowrap">
            {onlineCount > 0 ? `${onlineCount} Online` : 'Connecting...'}
          </span>
        </div>

        {/* Navigation Links & Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {viewState !== 'landing' && (
            <button
              type="button"
              onClick={() => setViewState('landing')}
              className="text-xs font-medium text-[#242423] hover:text-black px-2 py-1 rounded hidden sm:block"
            >
              Home
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:flex items-center gap-2 border border-[#d1d5dc] bg-white rounded-full px-3 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[80px]">{currentUser.username}</span>
                <span className="text-[#242423] opacity-75 hidden md:inline">({currentUser.department.replace('College of ', '')})</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setViewState('freedom_wall')}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full border-2 transition-all ${
                  viewState === 'freedom_wall'
                    ? 'bg-[#701a31] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black border-black hover:bg-[#fff1f3]'
                }`}
                title="Campus Freedom Wall"
              >
                <span className="sm:hidden">📜 Wall</span>
                <span className="hidden sm:inline">📜 Freedom Wall</span>
              </button>

              <button
                type="button"
                onClick={() => setViewState('register')}
                className="btn-gumroad-primary text-[11px] sm:text-xs px-2.5 py-1"
              >
                <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Join CapiTalk</span>
                <span className="sm:hidden">Join</span>
              </button>
            </div>
          )}

          {/* Wall Notifications Bell Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const nextState = !showNotifPopover;
                setShowNotifPopover(nextState);
                if (nextState && unreadCount > 0) {
                  markWallNotificationsAsRead();
                }
              }}
              className={`p-1.5 sm:p-2 rounded-full border border-[#d1d5dc] bg-white text-black hover:border-black transition-all relative flex items-center justify-center shadow-xs ${
                showNotifPopover ? 'bg-black text-white border-black' : ''
              }`}
              title="Campus Wall Notifications"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    markWallNotificationsAsRead();
                    setShowNotifPopover(true);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-[#dc341e] text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black animate-pulse cursor-pointer hover:scale-110 active:scale-95 transition-transform shadow-xs"
                  title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Desktop Notification Dropdown Menu */}
            {showNotifPopover && (
              <div className="hidden sm:block absolute right-0 mt-2 w-88 bg-white border-2 border-black rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-black/15">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#701a31]" />
                    <h4 className="text-xs sm:text-sm font-black text-black">Wall Notifications</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {wallNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearWallNotifications}
                        className="text-[10px] font-bold text-gray-500 hover:text-red-600 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifPopover(false)}
                      className="p-1 hover:bg-black/10 rounded-full text-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                  {wallNotifications.length === 0 ? (
                    <div className="text-center py-6 text-xs font-bold text-gray-500">
                      🔔 No wall notifications yet! Leave a note on the Campus Wall to get likes and replies.
                    </div>
                  ) : (
                    wallNotifications.map(renderNotifItem)
                  )}
                </div>
              </div>
            )}

            {/* Mobile Full-Screen Notifications View */}
            {showNotifPopover && (
              <div className="block sm:hidden fixed inset-0 z-[100] bg-[#f4f4f0] p-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
                {/* Mobile View Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-3 shrink-0 bg-[#f4f4f0]">
                  <button
                    type="button"
                    onClick={() => setShowNotifPopover(false)}
                    className="flex items-center gap-1.5 text-xs font-black text-black bg-white px-3 py-1.5 rounded-full border-2 border-black shadow-xs active:scale-95 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 text-black" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Bell className="w-5 h-5 text-[#701a31]" />
                    <h3 className="text-base font-extrabold text-black">Notifications</h3>
                  </div>

                  {wallNotifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearWallNotifications}
                      className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full active:scale-95"
                    >
                      Clear
                    </button>
                  ) : (
                    <div className="w-12" />
                  )}
                </div>

                {/* Mobile Notification List */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-6">
                  {wallNotifications.length === 0 ? (
                    <div className="text-center py-16 text-sm font-bold text-gray-500">
                      🔔 No wall notifications yet!<br />Leave a note on the Campus Wall to get likes and replies.
                    </div>
                  ) : (
                    wallNotifications.map(renderNotifItem)
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => useChatStore.getState().setShowFeedbackModal(true)}
            className="rounded pl-1 pr-1 text-[#242423] border-[#d1d5dc] border hover:border-black bg-white transition-colors"
            title="Feedback & Bug Report"
          >
            <span className="text-xs font-bold">💬</span>
          </button>

          <button
            type="button"
            onClick={() => setViewState('admin')}
            className={`p-1 sm:p-1.5 rounded border transition-colors ${
              viewState === 'admin'
                ? 'bg-black text-white border-black'
                : 'bg-white text-[#242423] border-[#d1d5dc] hover:border-black'
            }`}
            title="Admin Dashboard"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <FeedbackModal />
    </header>
  );
};
