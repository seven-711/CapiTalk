'use client';

import React from 'react';
import { ShieldAlert, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useChatStore } from '../lib/store/useChatStore';

export const BannedScreen: React.FC = () => {
  const { currentUser, clientIp, banReason } = useChatStore();

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111111] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#dc341e_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* Main Alert Card */}
      <div className="w-full max-w-lg bg-[#1a1a1a] border-4 border-[#dc341e] rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(220,52,30,0.4)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Icon & Status Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#dc341e]/20 border-2 border-[#dc341e] flex items-center justify-center mb-4 text-[#dc341e] animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#dc341e] text-white rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>ACCESS CEASED</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Account &amp; Network Suspended
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Your account or IP address has been restricted from accessing CapiTalk services due to platform policy enforcement.
          </p>
        </div>

        {/* Ban Details Box */}
        <div className="bg-[#242424] border border-gray-800 rounded-xl p-4 space-y-3 mb-6 font-mono text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-gray-400">User Identity:</span>
            <span className="font-bold text-red-400 truncate max-w-[200px]">
              {currentUser?.username || currentUser?.id || 'Anonymous Student'}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-gray-400">Restricted IP:</span>
            <span className="font-bold text-yellow-400">
              {clientIp || '127.0.0.1'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Enforcement Reason:</span>
            <span className="font-bold text-gray-200 text-right">
              {banReason || 'Community Guidelines & Conduct Violation'}
            </span>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-3 text-xs text-red-200 mb-6">
          <AlertTriangle className="w-5 h-5 text-[#dc341e] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            All matchmaking, chat interactions, freedom wall postings, and admin controls are locked for this device and network IP address.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRefresh}
            className="flex-1 py-3 px-4 bg-[#dc341e] hover:bg-[#b82a17] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Re-Check Status</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-gray-500 text-center mt-6">
          CapiTalk Campus Moderation System &bull; Capitol University
        </p>
      </div>
    </div>
  );
};
