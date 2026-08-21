'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { ArrowLeft, UserX, CheckCircle2, Trash2, ShieldCheck, MessageSquare } from 'lucide-react';

export const BlockedUsersPage: React.FC = () => {
  const {
    blockedUserIds,
    blockedUsers,
    unblockUser,
    unblockAllUsers,
    goBack,
    setViewState,
  } = useChatStore();

  // Merge metadata with legacy IDs if any
  const allBlockedList = (blockedUserIds || []).map((id) => {
    const found = (blockedUsers || []).find((u) => u.id === id);
    if (found) return found;
    return {
      id,
      username: `Blocked Student (${id.slice(0, 6)})`,
      department: 'Capitol University',
      avatar_url: undefined,
      blocked_at: '',
    };
  });

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-3 sm:px-4">
      {/* Top Header / Back Navigation */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {allBlockedList.length > 1 && (
            <button
              type="button"
              onClick={unblockAllUsers}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unblock All</span>
            </button>
          )}
        </div>
      </div>

      {/* Page Title */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-black">Blocked Users</h1>
          {allBlockedList.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
              {allBlockedList.length}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Students you have blocked will not be paired with you in chat matchmaking.
        </p>
      </div>

      {/* List of Blocked Users */}
      {allBlockedList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-black">No Blocked Users</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
            You have not blocked anyone. Peers you block during chat sessions will appear here for easy unblocking.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewState('queue')}
              className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Go to Matchmaking
            </button>
            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="px-4 py-1.5 bg-gray-100 text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Freedom Wall
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {allBlockedList.map((user) => (
            <div
              key={user.id}
              className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    user.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
                  }
                  alt={user.username}
                  className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 shrink-0 object-cover"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-black truncate">
                    {user.username}
                  </div>
                  <div className="text-[11px] text-[#701a31] font-semibold truncate">
                    {user.department.replace('College of ', '')}
                  </div>
                  {user.blocked_at && (
                    <div className="text-[10px] text-gray-400">
                      Blocked on {formatDate(user.blocked_at)}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => unblockUser(user.id)}
                className="px-3 py-1.5 bg-white hover:bg-black hover:text-white text-black border border-gray-300 hover:border-black rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unblock</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
