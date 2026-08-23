'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { FreedomPost } from '../lib/types';
import { ShieldAlert, X, Flag } from 'lucide-react';

interface ReportNoteModalProps {
  post: FreedomPost;
  onClose: () => void;
}

const REPORT_NOTE_REASONS = [
  'Profanity or Offensive Terminology',
  'Harassment or Personal Attacks',
  'Hate Speech or Discrimination',
  'Spam or Advertising',
  'Inappropriate or Explicit Content',
  'Fake Information or Impersonation',
  'Other Guideline Violation',
];

export const ReportNoteModal: React.FC<ReportNoteModalProps> = ({
  post,
  onClose,
}) => {
  const { reportFreedomPost } = useChatStore();
  const [reason, setReason] = useState(REPORT_NOTE_REASONS[0]);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportFreedomPost(
      post.id,
      post.author_alias || 'Anon Student',
      post.message,
      reason,
      description
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-[#d1d5dc] rounded-2xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl animate-in zoom-in-95 duration-150 text-neutral-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Report Post</h3>
            <p className="text-xs text-neutral-500 font-medium">
              Flagging content by @{post.author_alias || 'Anon Student'}
            </p>
          </div>
        </div>

        {/* Note / Song Preview Box */}
        <div className="p-3 bg-neutral-50 border border-neutral-200/70 rounded-xl mb-4 text-xs text-neutral-700 font-normal leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
          {post.song_title ? (
            <div>
              <p className="font-bold text-neutral-900">{post.song_title} <span className="font-normal text-neutral-500">— {post.song_artist}</span></p>
              {post.message && post.message.trim() && !post.message.startsWith('🎵 ') && (
                <p className="italic mt-1 text-neutral-600">&ldquo;{post.message}&rdquo;</p>
              )}
            </div>
          ) : (
            <p className="italic">&ldquo;{post.message}&rdquo;</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-neutral-900 mb-1">
              Violation Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#f4f4f0] border border-[#d1d5dc] focus:border-black focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none transition-all cursor-pointer"
            >
              {REPORT_NOTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-900 mb-1 flex items-center justify-between">
              <span>Additional Details</span>
              <span className="text-[11px] text-neutral-400 font-medium">Optional</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why should this post be reviewed or removed?"
              className="w-full bg-[#f4f4f0] border border-[#d1d5dc] focus:border-black focus:bg-white rounded-xl p-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none leading-relaxed transition-all font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:text-black transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
