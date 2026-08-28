import React, { useState, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  UserX,
  CheckCircle,
  AlertTriangle,
  Radio,
  Lock,
  Search,
  UserCheck,
  Slash,
  X,
  Flag,
  Trash2,
  FileText,
  Send,
  Pin,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { DeleteNoteModal } from './DeleteNoteModal';
import { FreedomPost } from '../lib/types';
import {
  loginAdmin,
  verifyAdminSession,
  clearAdminToken,
  getAdminToken,
  purgeLegacyAdminKeys,
} from '../lib/auth/adminAuth';

export const AdminDashboard: React.FC = () => {
  const {
    reports,
    bannedUserIds,
    freedomPosts,
    deleteFreedomPost,
    approveFreedomPost,
    togglePinFreedomPost,
    resolveReport,
    toggleBanUser,
    setViewState,
  } = useChatStore();

  const onlineCount = useOnlineCount();
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'reports' | 'wall_notes' | 'users' | 'announcements' | 'feedback'>('reports');
  const [selectedReportForRemark, setSelectedReportForRemark] = useState<{
    reportId: string;
    action: 'dismiss' | 'ban' | 'delete_post';
    targetSnippet?: string;
  } | null>(null);
  const [customRemarkText, setCustomRemarkText] = useState('');
  const [wallSearchQuery, setWallSearchQuery] = useState('');
  const [wallFilter, setWallFilter] = useState<'pending' | 'published' | 'all'>('pending');
  const [selectedPostForDelete, setSelectedPostForDelete] = useState<FreedomPost | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('all');
  
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);

  const [manualBanInput, setManualBanInput] = useState('');

  // Check existing session token on mount
  useEffect(() => {
    let isMounted = true;
    purgeLegacyAdminKeys();

    async function checkSession() {
      const token = getAdminToken();
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsVerifying(false);
        }
        return;
      }

      const isValid = await verifyAdminSession();
      if (isMounted) {
        setIsAuthenticated(isValid);
        if (isValid) {
          const { currentUser } = useChatStore.getState();
          if (currentUser && !currentUser.is_admin) {
            useChatStore.setState({ currentUser: { ...currentUser, is_admin: true } });
          }
        }
        setIsVerifying(false);
      }
    }

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting || lockoutSeconds > 0) return;

    setIsSubmitting(true);
    setAuthError(null);

    const result = await loginAdmin(passcode.trim());
    setIsSubmitting(false);

    if (result.success) {
      setIsAuthenticated(true);
      setAuthError(null);
      setPasscode('');
      const { currentUser } = useChatStore.getState();
      if (currentUser) {
        useChatStore.setState({ currentUser: { ...currentUser, is_admin: true } });
      }
    } else {
      setAuthError(result.error || 'Authentication failed. Please check your passcode.');
      if (result.lockoutSeconds) {
        setLockoutSeconds(result.lockoutSeconds);
      }
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    const { currentUser } = useChatStore.getState();
    if (currentUser) {
      useChatStore.setState({ currentUser: { ...currentUser, is_admin: false } });
    }
    setIsAuthenticated(false);
    useChatStore.getState().goBack();
  };

  const handleManualBan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanInput.trim()) return;
    toggleBanUser(manualBanInput.trim());
    setManualBanInput('');
  };

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  if (isVerifying) {
    return (
      <div className="w-full max-w-md mx-auto py-24 px-4 flex flex-col items-center justify-center gap-3 text-center text-black dark:text-white">
        <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
        <p className="text-sm font-bold text-neutral-600 dark:text-zinc-400">Verifying secure admin gateway session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4 text-black dark:text-white">
        <div className="gumroad-feature-card p-8 text-center border-2 border-black dark:border-white/20 bg-white dark:bg-[#18181b] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-[#ff90e8] border-2 border-black dark:border-white/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-2xl font-extrabold text-black dark:text-white">Admin Console Gateway</h2>
          <p className="text-xs text-[#242423] dark:text-zinc-400 mt-1 mb-6">
            Enter administrator master key to verify your session and access the moderation console.
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-[#dc341e]/10 border border-[#dc341e] text-xs font-bold text-[#dc341e] dark:text-red-400 rounded-xl text-left flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isSubmitting || lockoutSeconds > 0}
                placeholder={lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : "Enter master admin key..."}
                className="gumroad-input w-full text-center py-2.5 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!passcode.trim() || isSubmitting || lockoutSeconds > 0}
              className="btn-gumroad-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Key...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Locked for {lockoutSeconds}s</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Admin</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 text-black dark:text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#d1d5dc] dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffc900] border border-black rounded-full text-xs font-bold text-black mb-2 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" />
            CapiTalk Admin Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
            Platform Moderation &amp; Analytics
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="btn-gumroad-ghost text-xs px-4 py-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Exit Admin Mode
        </button>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="gumroad-card p-4 dark:bg-[#18181b] dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] dark:text-zinc-400 uppercase mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Total Online</span>
          </div>
          <p className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{onlineCount}</p>
        </div>

        <div className="gumroad-card p-4 dark:bg-[#18181b] dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] dark:text-zinc-400 uppercase mb-1">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Active Chats</span>
          </div>
          <p className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{Math.ceil(onlineCount / 2)}</p>
        </div>

        <div className="gumroad-card p-4 dark:bg-[#18181b] dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] dark:text-zinc-400 uppercase mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Reports Logged</span>
          </div>
          <p className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{reports.length}</p>
        </div>

        <div className="gumroad-card p-4 dark:bg-[#18181b] dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] dark:text-zinc-400 uppercase mb-1">
            <UserX className="w-4 h-4 text-red-600" />
            <span>Banned Users</span>
          </div>
          <p className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{bannedUserIds.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[#d1d5dc] dark:border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'reports'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-[#242423] dark:text-zinc-300 border-[#d1d5dc] dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500'
          }`}
        >
          Incident Reports ({reports.filter((r) => r.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('wall_notes')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'wall_notes'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-[#242423] dark:text-zinc-300 border-[#d1d5dc] dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500'
          }`}
        >
          📜 Campus Wall Notes ({freedomPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'users'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-[#242423] dark:text-zinc-300 border-[#d1d5dc] dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500'
          }`}
        >
          User Ban List ({bannedUserIds.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'feedback'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-[#242423] dark:text-zinc-300 border-[#d1d5dc] dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500'
          }`}
        >
          💬 Student Feedback ({useChatStore.getState().feedbackList.length})
        </button>
      </div>

      {/* Tab 1: Reports Table */}
      {activeTab === 'reports' && (
        <div className="gumroad-card overflow-hidden dark:bg-[#18181b] dark:border-zinc-800">
          <div className="p-4 bg-[#f4f4f0] dark:bg-zinc-900 border-b border-[#d1d5dc] dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-sm text-black dark:text-white">Student Incident Reports</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const demoReports = [
                    { reason: 'Harassment or Bullying', desc: 'Used offensive remarks in chat.', target_type: 'user' as const },
                    {
                      reason: 'Profanity or Offensive Terminology',
                      desc: 'Inappropriate language on campus wall note.',
                      target_type: 'freedom_post' as const,
                      post_id: freedomPosts[0]?.id || 'post_1',
                      post_author_alias: freedomPosts[0]?.author_alias || 'Anon Student',
                      post_message: freedomPosts[0]?.message || 'To the guy wearing a black hoodie in library...',
                    },
                    { reason: 'Offensive Language / Hate Speech', desc: 'Inappropriate department comments.', target_type: 'user' as const },
                  ];
                  const chosen = demoReports[Math.floor(Math.random() * demoReports.length)];
                  const mockReport = {
                    id: 'rep_' + Math.random().toString(36).substring(2, 9),
                    reporter_id: 'usr_studentA',
                    reporter_username: 'Student_Engineering',
                    reported_user_id: chosen.target_type === 'freedom_post' ? 'wall_author_' + chosen.post_id : 'usr_reported_' + Math.random().toString(36).substring(2, 6),
                    reported_username: chosen.target_type === 'freedom_post' ? (chosen.post_author_alias || 'Anon Student') : ('OffendingUser_' + Math.floor(Math.random() * 900 + 100)),
                    reason: chosen.reason,
                    description: chosen.desc,
                    target_type: chosen.target_type,
                    post_id: chosen.post_id,
                    post_author_alias: chosen.post_author_alias,
                    post_message: chosen.post_message,
                    status: 'pending' as const,
                    created_at: new Date().toISOString(),
                  };
                  const store = useChatStore.getState();
                  const updated = [mockReport, ...store.reports];
                  useChatStore.setState({ reports: updated });
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updated));
                  }
                }}
                className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                + Generate Test Report
              </button>
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-[#d1d5dc] dark:border-zinc-700 p-1 rounded-lg text-xs font-medium">
                {(['all', 'pending', 'reviewed', 'dismissed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setReportFilter(filterKey)}
                    className={`px-2.5 py-1 rounded capitalize font-bold transition-colors cursor-pointer ${
                      reportFilter === filterKey
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-[#242423] dark:text-zinc-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#242423] dark:text-zinc-400 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-black dark:text-white text-sm">No Incident Reports Found</p>
              <p>No student incident reports matching the selected filter status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f0] dark:bg-zinc-900 border-b border-[#d1d5dc] dark:border-zinc-800 text-black dark:text-white font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Reporter</th>
                    <th className="p-3.5">Target</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Details & Content</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5dc] dark:divide-zinc-800 bg-white dark:bg-[#18181b]">
                  {filteredReports.map((rep) => {
                    const isNoteReport = rep.target_type === 'freedom_post' || !!rep.post_id;
                    return (
                      <tr key={rep.id} className="hover:bg-[#f4f4f0]/50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="p-3.5 font-semibold text-black dark:text-white">{rep.reporter_username}</td>
                        <td className="p-3.5">
                          {isNoteReport ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#701a31] text-white text-[10px] font-black rounded-full uppercase">
                                📜 Campus Wall Note
                              </span>
                              <div className="font-extrabold text-black dark:text-white">
                                ~ {rep.post_author_alias || rep.reported_username}
                              </div>
                            </div>
                          ) : (
                            <span className="font-extrabold text-red-600 dark:text-red-400">{rep.reported_username}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{rep.reason}</td>
                        <td className="p-3.5 max-w-xs space-y-1">
                          {isNoteReport && rep.post_message && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded text-[11px] font-medium text-black dark:text-amber-200 italic">
                              "{rep.post_message}"
                            </div>
                          )}
                          <div className="text-gray-600 dark:text-zinc-400 text-[11px]">
                            {rep.description || 'No additional details provided.'}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              rep.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : rep.status === 'reviewed'
                                ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right flex items-center justify-end gap-2">
                          {rep.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedReportForRemark({ reportId: rep.id, action: 'dismiss', targetSnippet: rep.post_message || rep.description });
                                  setCustomRemarkText('✅ Reviewed: No violation found');
                                }}
                                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-[#d1d5dc] dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 rounded text-xs font-bold text-black dark:text-white transition-colors cursor-pointer"
                              >
                                Dismiss
                              </button>
                              {isNoteReport ? (
                                <button
                                  onClick={() => {
                                    setSelectedReportForRemark({ reportId: rep.id, action: 'delete_post', targetSnippet: rep.post_message });
                                    setCustomRemarkText('🗑️ Note deleted: Violates campus community guidelines regarding harassment or inappropriate content.');
                                  }}
                                  className="px-3 py-1 bg-[#dc341e] text-white hover:bg-red-700 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete Note & Remark
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedReportForRemark({ reportId: rep.id, action: 'ban', targetSnippet: rep.description });
                                    setCustomRemarkText('⚠️ Official Admin Warning: Account banned for violating campus conduct rules.');
                                  }}
                                  className="px-3 py-1 bg-[#dc341e] text-white hover:bg-red-700 rounded text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Ban User & Remark
                                </button>
                              )}
                            </>
                          )}
                          {rep.status !== 'pending' && (
                            <span className="text-gray-400 dark:text-zinc-500 font-medium text-[11px] italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Campus Wall Notes Moderation */}
      {activeTab === 'wall_notes' && (
        <div className="space-y-6">
          <div className="gumroad-card p-6 dark:bg-[#18181b] dark:border-zinc-800">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-black dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#701a31] dark:text-[#ff90e8]" />
                  Campus Wall Notes Moderation
                </h3>
                <p className="text-xs text-[#242423] dark:text-zinc-400 mt-0.5">
                  Audit, inspect, or remove any student note posted on the anonymous Freedom Wall.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center bg-white dark:bg-zinc-800 border border-[#d1d5dc] dark:border-zinc-700 p-1 rounded-lg text-xs font-medium w-full sm:w-auto">
                  <button
                    onClick={() => setWallFilter('pending')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded capitalize font-bold transition-colors cursor-pointer ${
                      wallFilter === 'pending'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-[#242423] dark:text-zinc-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Pending ({freedomPosts.filter(p => p.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setWallFilter('published')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded capitalize font-bold transition-colors cursor-pointer ${
                      wallFilter === 'published'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-[#242423] dark:text-zinc-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Published
                  </button>
                  <button
                    onClick={() => setWallFilter('all')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded capitalize font-bold transition-colors cursor-pointer ${
                      wallFilter === 'all'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-[#242423] dark:text-zinc-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    All
                  </button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={wallSearchQuery}
                    onChange={(e) => setWallSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="gumroad-input w-full pl-9 py-2 text-xs dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
              </div>
            </div>

            {freedomPosts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 dark:text-zinc-400">
                No active notes found on the Campus Wall.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freedomPosts
                  .filter((p) => {
                    const statusMatch =
                      wallFilter === 'all' ||
                      (wallFilter === 'pending' && p.status === 'pending') ||
                      (wallFilter === 'published' && p.status !== 'pending');
                    const searchMatch =
                      !wallSearchQuery.trim() ||
                      p.message.toLowerCase().includes(wallSearchQuery.toLowerCase()) ||
                      p.author_alias.toLowerCase().includes(wallSearchQuery.toLowerCase()) ||
                      p.department.toLowerCase().includes(wallSearchQuery.toLowerCase());
                    return statusMatch && searchMatch;
                  })
                  .map((post) => (
                    <div
                      key={post.id}
                      style={{ backgroundColor: post.color || '#ffc900' }}
                      className="p-4 rounded-2xl border-2 border-black flex flex-col justify-between shadow-sm relative text-black"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-extrabold rounded-full uppercase">
                            {post.department}
                          </span>
                          <span className="text-[10px] font-bold opacity-75">
                            {new Date(post.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed mb-3 whitespace-pre-wrap break-words">
                          "{post.message}"
                        </p>
                        {post.image_url && (
                          <div className="mb-3 rounded-xl border border-black overflow-hidden bg-black/5 max-h-36">
                            <img
                              src={post.image_url}
                              alt="Post attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-black/20 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold italic">
                          ~ {post.author_alias || 'Anon Student'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold bg-white/80 border border-black/30 px-2 py-0.5 rounded-full">
                            ❤️ {post.likes_count}
                          </span>
                          {post.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => approveFreedomPost(post.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Approve Note & Publish to Wall"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePinFreedomPost(post.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border border-black transition-all shadow-xs cursor-pointer ${
                              post.is_pinned
                                ? 'bg-[#ffc900] text-black shadow-sm'
                                : 'bg-white text-black hover:bg-amber-50'
                            }`}
                            title={post.is_pinned ? "Unpin note from top" : "Pin note to top"}
                          >
                            <Pin className={`w-3 h-3 ${post.is_pinned ? 'fill-black' : ''}`} />
                            <span>{post.is_pinned ? 'Pinned 📌' : 'Pin'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPostForDelete(post)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{post.status === 'pending' ? 'Reject' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: User Ban List */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Manual Ban Input Card */}
          <div className="gumroad-card p-6 dark:bg-[#18181b] dark:border-zinc-800">
            <h3 className="text-lg font-extrabold text-black dark:text-white mb-2 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              Manual Real-Time Student &amp; IP Ban Control
            </h3>
            <p className="text-xs text-[#242423] dark:text-zinc-400 mb-4">
              Enter a student <strong>User ID</strong>, <strong>Username (e.g. BadUser123)</strong>, or <strong>IP Address</strong> to instantly evict them and restrict access across all devices in real-time.
            </p>

            <form onSubmit={handleManualBan} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualBanInput}
                onChange={(e) => setManualBanInput(e.target.value)}
                placeholder="Enter User ID, Username, or IP Address (e.g. BadUser123 or 192.168.1.1)..."
                className="gumroad-input flex-1 text-sm py-2.5 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500"
                required
              />
              <button type="submit" className="btn-gumroad-primary text-xs px-6 py-2.5 bg-[#dc341e] hover:bg-red-700 text-white cursor-pointer">
                Ban Account &amp; IP
              </button>
            </form>
          </div>

          {/* Active Banned Users List */}
          <div className="gumroad-card overflow-hidden dark:bg-[#18181b] dark:border-zinc-800">
            <div className="p-4 bg-[#f4f4f0] dark:bg-zinc-900 border-b border-[#d1d5dc] dark:border-zinc-800 font-bold text-sm text-black dark:text-white flex items-center justify-between">
              <span>Restricted Student Accounts &amp; Network IPs</span>
              <span className="text-xs font-bold text-[#242423] dark:text-zinc-400">{bannedUserIds.length} Restricted</span>
            </div>

            {bannedUserIds.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#242423] dark:text-zinc-400">
                No user accounts or IP addresses are currently restricted.
              </div>
            ) : (
              <div className="divide-y divide-[#d1d5dc] dark:divide-zinc-800">
                {bannedUserIds.map((id) => {
                  const isIp = id.includes('.') || id.includes(':');
                  return (
                    <div key={id} className="p-4 flex items-center justify-between bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                          <Slash className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-extrabold text-black dark:text-white">{id}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isIp
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                            }`}>
                              {isIp ? '🌐 IP Address Ban' : '👤 Username / ID Ban'}
                            </span>
                          </div>
                          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-0.5">Status: Access Ceased &amp; Evicted</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleBanUser(id)}
                        className="btn-gumroad-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Unban Access</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Student Feedback & Suggestions */}
      {activeTab === 'feedback' && (
        <div className="gumroad-card overflow-hidden dark:bg-[#18181b] dark:border-zinc-800">
          <div className="p-4 bg-[#f4f4f0] dark:bg-zinc-900 border-b border-[#d1d5dc] dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-black dark:text-white">Student Feedback &amp; Suggestions</h3>
            <span className="text-xs font-bold px-3 py-1 bg-[#701a31] text-white border border-black rounded-full">
              {useChatStore.getState().feedbackList.length} Submissions
            </span>
          </div>

          {useChatStore.getState().feedbackList.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-zinc-400">
              <p className="text-sm font-bold text-black dark:text-white">No feedback submissions yet.</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Student feedback and bug reports will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#d1d5dc] dark:divide-zinc-800">
              {useChatStore.getState().feedbackList.map((item) => (
                <div key={item.id} className="p-4 bg-white dark:bg-[#18181b] hover:bg-[#fff1f3]/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-black dark:text-white">@{item.username || 'Anonymous'}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border border-black uppercase tracking-wider ${
                        item.category === 'bug'
                          ? 'bg-[#c41e3a] text-white'
                          : item.category === 'suggestion'
                          ? 'bg-[#ffc900] text-black'
                          : item.category === 'ui_ux'
                          ? 'bg-purple-600 text-white'
                          : 'bg-black text-white'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(item.rating)].map((_, i) => (
                        <span key={i} className="text-amber-400 text-xs">★</span>
                      ))}
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#242423] dark:text-zinc-200 font-medium leading-relaxed bg-[#fbf9f5] dark:bg-zinc-900/80 p-3 rounded-xl border border-[#d1d5dc] dark:border-zinc-800 mt-2">
                    "{item.message}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {selectedPostForDelete && (
        <DeleteNoteModal
          post={selectedPostForDelete}
          onConfirm={() => deleteFreedomPost(selectedPostForDelete.id)}
          onClose={() => setSelectedPostForDelete(null)}
        />
      )}

      {/* Admin Remark Resolution Modal */}
      {selectedReportForRemark && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181b] border-2 sm:border-4 border-black dark:border-white/20 p-6 rounded-3xl max-w-md w-full relative shadow-2xl animate-in zoom-in-95 text-black dark:text-white">
            <button
              type="button"
              onClick={() => {
                setSelectedReportForRemark(null);
                setCustomRemarkText('');
              }}
              className="absolute top-4 right-4 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-black dark:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#701a31] border border-black text-[#ffc900] text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                👑 Admin Resolution Remark
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-black dark:text-white mb-1">
              Add Official Admin Remark 📝
            </h3>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mb-4 leading-relaxed">
              This remark will be sent as a notification to the student's notification feed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-black dark:text-white uppercase mb-1">
                  Quick Remark Presets
                </label>
                <div className="flex flex-col gap-1.5 mb-3">
                  {[
                    '⚠️ Warning: Violates community guidelines regarding harassment',
                    '🗑️ Note deleted due to inappropriate language',
                    '🚫 Official Admin Account Warning Issued',
                    '✅ Reviewed: No violation found',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomRemarkText(preset)}
                      className="px-2.5 py-1.5 bg-[#f4f4f0] dark:bg-zinc-800 hover:bg-[#ffc900] hover:text-black dark:hover:bg-[#ffc900] dark:hover:text-black border border-black dark:border-zinc-700 rounded-lg text-[11px] font-bold text-black dark:text-zinc-200 text-left transition-all cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <label className="block text-[11px] font-bold text-black dark:text-white uppercase mb-1">
                  Custom Admin Remark & Warning Details
                </label>
                <textarea
                  rows={3}
                  value={customRemarkText}
                  onChange={(e) => setCustomRemarkText(e.target.value)}
                  placeholder="Enter official admin warning, reason, or remark..."
                  className="w-full p-2.5 text-xs border-2 border-black dark:border-zinc-700 rounded-xl font-semibold bg-white dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReportForRemark(null);
                    setCustomRemarkText('');
                  }}
                  className="btn-gumroad-ghost text-xs px-4 py-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resolveReport(selectedReportForRemark.reportId, selectedReportForRemark.action, customRemarkText);
                    setSelectedReportForRemark(null);
                    setCustomRemarkText('');
                  }}
                  className="btn-gumroad-primary text-xs px-5 py-2 flex items-center gap-1.5 bg-[#701a31] hover:bg-[#4d0d1f] cursor-pointer text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit & Notify Student</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
