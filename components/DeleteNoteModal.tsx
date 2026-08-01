'use client';

import React from 'react';
import { FreedomPost } from '../lib/types';
import { Trash2, X } from 'lucide-react';

interface DeleteNoteModalProps {
  post: FreedomPost;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  post,
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
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-black">Delete Campus Wall Note?</h3>
            <p className="text-xs text-[#242423]">
              Confirm note removal from Freedom Wall
            </p>
          </div>
        </div>

        {/* Note Preview */}
        <div
          style={{ backgroundColor: post.color || '#ffc900' }}
          className="p-3.5 rounded-xl border-2 border-black mb-4 text-xs font-bold text-black shadow-xs max-h-28 overflow-y-auto"
        >
          <p className="italic mb-1">"{post.message}"</p>
          <span className="text-[10px] opacity-75 font-extrabold block text-right">
            — {post.author_alias || 'Anon Student'} ({post.department})
          </span>
        </div>

        <p className="text-xs font-medium text-gray-600 mb-6">
          Are you sure you want to permanently delete this note? It will be removed immediately for all users.
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
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};
