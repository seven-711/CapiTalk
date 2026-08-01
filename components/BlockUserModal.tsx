'use client';

import React from 'react';
import { UserX, X } from 'lucide-react';

interface BlockUserModalProps {
  username: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const BlockUserModal: React.FC<BlockUserModalProps> = ({
  username,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-[24px] max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-red-100 border border-red-500 rounded-full text-red-600">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-black">Block {username}?</h3>
            <p className="text-xs text-[#242423]">
              Confirm student block
            </p>
          </div>
        </div>

        <p className="text-xs font-medium text-gray-700 leading-relaxed mb-6">
          Are you sure you want to block <span className="font-extrabold text-black">{username}</span>? You will no longer be paired with this user in future chat queues, and your active chat room will end.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-gumroad-ghost text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn-gumroad-primary text-xs px-5 py-2 bg-[#dc341e] hover:bg-[#dc341e]/90 text-white flex items-center gap-1.5"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Block User</span>
          </button>
        </div>
      </div>
    </div>
  );
};
