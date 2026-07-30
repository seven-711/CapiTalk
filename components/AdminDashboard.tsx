'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS } from '../lib/constants';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  UserX,
  CheckCircle,
  AlertTriangle,
  Radio,
  Lock,
  PieChart,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { reports, bannedUserIds, resolveReport, toggleBanUser, setViewState } = useChatStore();

  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'announcements'>('reports');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin secret key (or process.env.ADMIN_SECRET_KEY)
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
    setAnnouncementSent(true);
    setTimeout(() => {
      setAnnouncementText('');
      setAnnouncementSent(false);
    }, 3000);
  };

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
            <div className="mb-4 p-2 bg-[#dc341e]/10 border border-[#dc341e] text-xs font-bold text-[#dc341e] rounded">
              Invalid Passcode. Default key is: <code className="bg-white px-1">capitalk2026</code>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin key..."
              className="gumroad-input w-full text-center"
            />
            <button type="submit" className="btn-gumroad-primary w-full">
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#d1d5dc]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffc900] border border-black rounded-full text-xs font-bold text-black mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Capitol University Admin Panel
          </div>
          <h1 className="text-3xl font-extrabold text-black tracking-tight">
            Platform Moderation & Analytics
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
          <p className="text-3xl font-extrabold text-black tracking-tight">142</p>
        </div>

        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Active Chats</span>
          </div>
          <p className="text-3xl font-extrabold text-black tracking-tight">58</p>
        </div>

        <div className="gumroad-card p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242423] uppercase mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Reports</span>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#d1d5dc] pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs font-bold rounded capitalize transition-all ${
            activeTab === 'reports' ? 'bg-black text-white' : 'text-[#242423] hover:bg-white'
          }`}
        >
          User Reports ({reports.filter((r) => r.status === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-xs font-bold rounded capitalize transition-all ${
            activeTab === 'announcements' ? 'bg-black text-white' : 'text-[#242423] hover:bg-white'
          }`}
        >
          Campus Announcement Broadcast
        </button>
      </div>

      {/* Tab Content: Reports Table */}
      {activeTab === 'reports' && (
        <div className="gumroad-card overflow-hidden">
          <div className="p-4 bg-[#f4f4f0] border-b border-[#d1d5dc] font-bold text-sm text-black">
            Student Incident Reports
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#242423]">
              No user reports logged yet. Campus moderation is clean! ✨
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f4f0] border-b border-[#d1d5dc] text-black font-bold">
                  <tr>
                    <th className="p-3">Reporter</th>
                    <th className="p-3">Reported User</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1d5dc]">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-[#f4f4f0]/50">
                      <td className="p-3 font-semibold">{rep.reporter_username}</td>
                      <td className="p-3 font-bold text-red-600">{rep.reported_username}</td>
                      <td className="p-3 font-medium">{rep.reason}</td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">{rep.description || 'N/A'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rep.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : rep.status === 'reviewed'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => resolveReport(rep.id, 'dismiss')}
                          className="px-2 py-1 bg-white border border-[#d1d5dc] hover:border-black rounded text-[11px] font-semibold"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => resolveReport(rep.id, 'ban')}
                          className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-[11px] font-semibold"
                        >
                          Ban User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Broadcast Tool */}
      {activeTab === 'announcements' && (
        <div className="gumroad-feature-card p-6">
          <h3 className="text-xl font-extrabold text-black mb-2 flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#ff90e8]" />
            Broadcast System Announcement
          </h3>
          <p className="text-xs text-[#242423] mb-4">
            Send an instant campus news popup or guideline reminder to all active CapiTalk chat sessions.
          </p>

          {announcementSent && (
            <div className="mb-4 p-3 bg-emerald-100 border border-emerald-500 text-emerald-800 text-xs font-bold rounded flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Announcement broadcast successfully!
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            <textarea
              rows={3}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. 📢 Campus Advisory: Intramurals registration is now open! Respect fellow CU students in chat."
              className="gumroad-input w-full text-sm"
              required
            />
            <button type="submit" className="btn-gumroad-primary text-xs px-6 py-2.5">
              Broadcast to All Students
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
