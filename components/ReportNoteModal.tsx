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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-[24px] max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#dc341e]/10 border border-[#dc341e] rounded-full text-[#dc341e]">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-black">Report Wall Note</h3>
            <p className="text-xs text-[#242423]">
              Flagging note by <span className="font-bold">{post.author_alias || 'Anon Student'}</span>
            </p>
          </div>
        </div>

        {/* Note Preview Box */}
        <div
          style={{ backgroundColor: post.color || '#ffc900' }}
          className="p-3.5 rounded-xl border-2 border-black mb-4 text-xs font-bold text-black shadow-xs max-h-28 overflow-y-auto"
        >
          <p className="italic mb-1">"{post.message}"</p>
          <span className="text-[10px] opacity-75 font-extrabold block text-right">
            — {post.author_alias || 'Anon Student'} ({post.department})
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              Violation Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="gumroad-input w-full bg-white text-sm"
            >
              {REPORT_NOTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why should this note be removed from the campus wall?"
              className="gumroad-input w-full text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-gumroad-ghost text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gumroad-primary text-xs px-5 py-2 bg-[#dc341e] hover:bg-[#dc341e]/90 text-white flex items-center gap-1.5"
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
