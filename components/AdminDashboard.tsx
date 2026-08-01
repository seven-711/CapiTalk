'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    reports,
    bannedUserIds,
    resolveReport,
    toggleBanUser,
    broadcastAnnouncement,
    setViewState,
  } = useChatStore();

  const onlineCount = useOnlineCount();
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'announcements'>('reports');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('all');
  
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);

  const [manualBanInput, setManualBanInput] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'capitalk2026' || passcode.trim() === 'admin') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    broadcastAnnouncement(announcementText);
    setAnnouncementSent(true);
    setTimeout(() => {
      setAnnouncementText('');
      setAnnouncementSent(false);
    }, 4000);
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

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-16 px-4">
        <div className="gumroad-feature-card p-8 text-center border-2 border-black">
          <div className="w-12 h-12 rounded-full bg-[#ff90e8] border-2 border-black flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-2xl font-extrabold text-black">Admin Console Access</h2>
          <p className="text-xs text-[#242423] mt-1 mb-6">
            Enter administrator secret key to view live reports and manage users.
          </p>

          {authError && (
            <div className="mb-4 p-2.5 bg-[#dc341e]/10 border border-[#dc341e] text-xs font-bold text-[#dc341e] rounded text-center">
              ⚠️ Invalid Passcode. Access Denied.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin key..."
              className="gumroad-input w-full text-center py-2.5"
              autoFocus
            />
            <button type="submit" className="btn-gumroad-primary w-full py-3">
              Authenticate Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#d1d5dc]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffc900] border border-black rounded-full text-xs font-bold text-black mb-2 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" />
            CapiTalk Admin Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
            Platform Moderation &amp; Analytics
          </h1>
        </div>

        <button
          onClick={() => setViewState('landing')}
          className="btn-gumroad-ghost text-xs px-4 py-2"
        >
          Exit Admin Mode
        </button>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Total Online</span>
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">{onlineCount}</p>
        </div>

        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Active Chats</span>
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">{Math.ceil(onlineCount / 2)}</p>
        </div>

        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Reports Logged</span>
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">{reports.length}</p>
        </div>

        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <UserX className="w-4 h-4 text-red-600" />
            <span>Banned Users</span>
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">{bannedUserIds.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[#d1d5dc] pb-3">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'reports'
              ? 'bg-black text-white border-black shadow-sm'
              : 'bg-white text-[#242423] border-[#d1d5dc] hover:border-black'
          }`}
        >
          Incident Reports ({reports.filter((r) => r.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'users'
              ? 'bg-black text-white border-black shadow-sm'
              : 'bg-white text-[#242423] border-[#d1d5dc] hover:border-black'
          }`}
        >
          User Ban List ({bannedUserIds.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === 'announcements'
              ? 'bg-black text-white border-black shadow-sm'
              : 'bg-white text-[#242423] border-[#d1d5dc] hover:border-black'
          }`}
        >
          Broadcast Announcement
        </button>
      </div>

      {/* Tab 1: Reports Table */}
      {activeTab === 'reports' && (
        <div className="gumroad-card overflow-hidden">
          <div className="p-4 bg-[#f4f4f0] border-b border-[#d1d5dc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-sm text-black">Student Incident Reports</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const demoReports = [
                    { reason: 'Harassment or Bullying', desc: 'Used offensive remarks in chat.' },
                    { reason: 'Inappropriate or Explicit Images', desc: 'Sent unverified media file.' },
                    { reason: 'Offensive Language / Hate Speech', desc: 'Inappropriate department comments.' },
                  ];
                  const chosen = demoReports[Math.floor(Math.random() * demoReports.length)];
                  const mockReport = {
                    id: 'rep_' + Math.random().toString(36).substring(2, 9),
                    reporter_id: 'usr_studentA',
                    reporter_username: 'Student_Engineering',
                    reported_user_id: 'usr_reported_' + Math.random().toString(36).substring(2, 6),
                    reported_username: 'OffendingUser_' + Math.floor(Math.random() * 900 + 100),
                    reason: chosen.reason,
                    description: chosen.desc,
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
                className="px-2.5 py-1 bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-900 rounded text-xs font-bold transition-colors"
              >
                + Generate Test Report
              </button>
              <div className="flex items-center gap-1 bg-white border border-[#d1d5dc] p-1 rounded-lg text-xs font-medium">
                {(['all', 'pending', 'reviewed', 'dismissed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setReportFilter(filterKey)}
                    className={`px-2.5 py-1 rounded capitalize font-bold transition-colors ${
                      reportFilter === filterKey
                        ? 'bg-black text-white'
                        : 'text-[#242423] hover:text-black'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#242423] space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-black text-sm">No Incident Reports Found</p>
              <p>No student incident reports matching the selected filter status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f0] border-b border-[#d1d5dc] text-black font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Reporter</th>
                    <th className="p-3.5">Reported User</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Details</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5dc] bg-white">
                  {filteredReports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-[#f4f4f0]/50 transition-colors">
                      <td className="p-3.5 font-semibold text-black">{rep.reporter_username}</td>
                      <td className="p-3.5 font-extrabold text-red-600">{rep.reported_username}</td>
                      <td className="p-3.5 font-semibold">{rep.reason}</td>
                      <td className="p-3.5 text-gray-600 max-w-xs truncate">{rep.description || 'No additional notes'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            rep.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : rep.status === 'reviewed'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right flex items-center justify-end gap-2">
                        {rep.status === 'pending' && (
                          <>
                            <button
                              onClick={() => resolveReport(rep.id, 'dismiss')}
                              className="px-3 py-1 bg-white border border-[#d1d5dc] hover:border-black rounded text-xs font-bold text-black transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => resolveReport(rep.id, 'ban')}
                              className="px-3 py-1 bg-[#dc341e] text-white hover:bg-red-700 rounded text-xs font-bold transition-colors"
                            >
                              Ban User
                            </button>
                          </>
                        )}
                        {rep.status !== 'pending' && (
                          <span className="text-gray-400 font-medium text-[11px] italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Ban List */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Manual Ban Input Card */}
          <div className="gumroad-card p-6">
            <h3 className="text-lg font-extrabold text-black mb-2 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              Manual Student Ban Control
            </h3>
            <p className="text-xs text-[#242423] mb-4">
              Enter a student User ID or Username to restrict them from entering matchmaking queue.
            </p>

            <form onSubmit={handleManualBan} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualBanInput}
                onChange={(e) => setManualBanInput(e.target.value)}
                placeholder="Enter User ID or Username (e.g. usr_99a8x or BadUser123)..."
                className="gumroad-input flex-1 text-sm py-2.5"
                required
              />
              <button type="submit" className="btn-gumroad-primary text-xs px-6 py-2.5 bg-[#dc341e]">
                Ban Student ID
              </button>
            </form>
          </div>

          {/* Active Banned Users List */}
          <div className="gumroad-card overflow-hidden">
            <div className="p-4 bg-[#f4f4f0] border-b border-[#d1d5dc] font-bold text-sm text-black flex items-center justify-between">
              <span>Restricted Student Accounts</span>
              <span className="text-xs font-bold text-[#242423]">{bannedUserIds.length} Banned</span>
            </div>

            {bannedUserIds.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#242423]">
                No user accounts are currently restricted.
              </div>
            ) : (
              <div className="divide-y divide-[#d1d5dc]">
                {bannedUserIds.map((id) => (
                  <div key={id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 text-red-600 flex items-center justify-center font-bold text-xs">
                        <Slash className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-black">{id}</p>
                        <p className="text-[11px] text-red-600 font-medium">Status: Suspended</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleBanUser(id)}
                      className="btn-gumroad-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unban Account</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: System Broadcast */}
      {activeTab === 'announcements' && (
        <div className="gumroad-feature-card p-6">
          <h3 className="text-xl font-extrabold text-black mb-2 flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#ff90e8]" />
            Broadcast Campus Announcement
          </h3>
          <p className="text-xs text-[#242423] mb-4">
            Send a live advisory banner to all active student chat sessions across campus.
          </p>

          {announcementSent && (
            <div className="mb-4 p-3 bg-emerald-100 border border-emerald-500 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4" />
              <span>Announcement broadcast successfully to all active chat sessions!</span>
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            <textarea
              rows={3}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. 📢 Campus Advisory: Intramural sports registration is now open! Please adhere to community guidelines in chat."
              className="gumroad-input w-full text-sm resize-none"
              required
            />
            <div className="flex items-center justify-end gap-3">
              <button type="submit" className="btn-gumroad-primary text-xs px-6 py-2.5 flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff90e8]" />
                <span>Broadcast Live Announcement</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
