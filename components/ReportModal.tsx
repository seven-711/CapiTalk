'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { ShieldAlert, X } from 'lucide-react';

interface ReportModalProps {
  reportedUsername: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Spam or Advertising',
  'Harassment or Bullying',
  'Inappropriate or Explicit Images',
  'Offensive Language / Hate Speech',
  'Fake Identity / Impersonation',
  'Other Guideline Violation',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUsername,
  onClose,
}) => {
  const { reportPartner } = useChatStore();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportPartner(reason, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-[24px] max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-black"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#dc341e]/10 border border-[#dc341e] rounded-full text-[#dc341e]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-black">Report Student</h3>
            <p className="text-xs text-[#242423]">Reporting: <span className="font-bold">{reportedUsername}</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              Select Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="gumroad-input w-full bg-white text-sm"
            >
              {REPORT_REASONS.map((r) => (
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
              placeholder="Describe what happened..."
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
              className="btn-gumroad-primary text-xs px-5 py-2 bg-[#dc341e] hover:bg-[#dc341e]/90"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
