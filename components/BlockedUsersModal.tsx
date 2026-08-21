'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { UserX, ShieldCheck, X, Trash2, CheckCircle2 } from 'lucide-react';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ isOpen, onClose }) => {
  const { blockedUserIds, blockedUsers, unblockUser, unblockAllUsers } = useChatStore();

  if (!isOpen) return null;

  // Merge blockedUsers metadata with any legacy blockedUserIds
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
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#f4f4f0] border-3 border-black rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-100 border-2 border-black flex items-center justify-center text-red-600 shadow-2xs">
              <UserX className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-black leading-tight">
                  Blocked Users
                </h3>
                {allBlockedList.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-black border border-black">
                    {allBlockedList.length}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold">
                Students you won't be matched with
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {allBlockedList.length > 1 && (
              <button
                type="button"
                onClick={unblockAllUsers}
                className="text-[10px] font-extrabold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                title="Unblock all users"
              >
                <Trash2 className="w-3 h-3" />
                <span>Unblock All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Body / Blocked List */}
        <div className="overflow-y-auto py-3 space-y-2.5 custom-scrollbar pr-1 flex-1">
          {allBlockedList.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-black flex items-center justify-center text-emerald-600 mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <ShieldCheck className="w-7 h-7 stroke-[2]" />
              </div>
              <h4 className="text-sm font-black text-black">No Blocked Users</h4>
              <p className="text-xs text-gray-500 font-medium mt-1 max-w-xs leading-relaxed">
                You haven't blocked anyone yet. Any peers you block during chat sessions will appear here.
              </p>
            </div>
          ) : (
            allBlockedList.map((user) => (
              <div
                key={user.id}
                className="p-3 bg-white border-2 border-black rounded-2xl flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={
                      user.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
                    }
                    alt={user.username}
                    className="w-9 h-9 rounded-xl bg-[#f4f4f0] border-2 border-black shrink-0 object-cover"
                  />
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-black block truncate leading-tight">
                      {user.username}
                    </span>
                    <span className="text-[10px] font-bold text-[#701a31] block truncate leading-tight mt-0.5">
                      {user.department.replace('College of ', '')}
                    </span>
                    {user.blocked_at && (
                      <span className="text-[9px] text-gray-400 font-medium block truncate mt-0.5">
                        Blocked {formatDate(user.blocked_at)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => unblockUser(user.id)}
                  className="px-3 py-1.5 bg-white hover:bg-black hover:text-white text-black border-2 border-black rounded-xl font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Unblock</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t-2 border-black/10 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-gray-500 font-medium">
            Unblocking allows future random pairing
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-black hover:text-white text-black border-2 border-black shadow-2xs active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
