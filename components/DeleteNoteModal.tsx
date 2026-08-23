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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-[#d1d5dc] rounded-2xl max-w-sm w-full p-5 sm:p-6 relative shadow-2xl animate-in zoom-in-95 duration-150 text-neutral-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Delete Post</h3>
            <p className="text-xs text-neutral-500 font-medium">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Note / Song Preview */}
        <div className="p-3 bg-neutral-50 border border-neutral-200/70 rounded-xl mb-3 text-xs text-neutral-700 font-normal leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
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

        <p className="text-xs text-neutral-600 font-medium leading-relaxed mb-5">
          Are you sure you want to permanently delete this post? It will be removed immediately for all students.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:text-black transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Post</span>
          </button>
        </div>
      </div>
    </div>
  );
};
