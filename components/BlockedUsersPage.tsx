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
    <div className="w-full max-w-2xl mx-auto py-4 px-3 sm:px-4 text-black dark:text-[#f4f4f6]">
      {/* Top Header / Back Navigation */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {allBlockedList.length > 1 && (
            <button
              type="button"
              onClick={unblockAllUsers}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
          <h1 className="text-xl font-black text-black dark:text-white">Blocked Users</h1>
          {allBlockedList.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">
              {allBlockedList.length}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Students you have blocked will not be paired with you in chat matchmaking.
        </p>
      </div>

      {/* List of Blocked Users */}
      {allBlockedList.length === 0 ? (
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-black dark:text-white">No Blocked Users</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
            You have not blocked anyone. Peers you block during chat sessions will appear here for easy unblocking.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewState('queue')}
              className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Go to Matchmaking
            </button>
            <button
              type="button"
              onClick={() => setViewState('freedom_wall')}
              className="px-4 py-1.5 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Freedom Wall
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {allBlockedList.map((user, idx) => (
            <div
              key={`blocked-page-user-${user.id}-${idx}`}
              className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-gray-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    user.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
                  }
                  alt={user.username}
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shrink-0 object-cover"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-black dark:text-white truncate">
                    {user.username}
                  </div>
                  <div className="text-[11px] text-[#701a31] dark:text-[#ff90e8] font-semibold truncate">
                    {user.department.replace('College of ', '')}
                  </div>
                  {user.blocked_at && (
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Blocked on {formatDate(user.blocked_at)}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => unblockUser(user.id)}
                className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white border border-gray-300 dark:border-zinc-700 hover:border-black rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Unblock</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
