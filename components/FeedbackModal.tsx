'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { UserFeedback } from '../lib/types';
import { X, Star, MessageSquareHeart, Bug, Lightbulb, Sparkles, Send } from 'lucide-react';

export const FeedbackModal: React.FC = () => {
  const { showFeedbackModal, setShowFeedbackModal, submitFeedback } = useChatStore();

  const [category, setCategory] = useState<UserFeedback['category']>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!showFeedbackModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please write your feedback or bug report message.');
      return;
    }

    submitFeedback({ category, rating, message });
    setMessage('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-3xl max-w-md w-full text-left shadow-2xl animate-in zoom-in-95 duration-200 relative">
        <button
          type="button"
          onClick={() => {
            setShowFeedbackModal(false);
            setError(null);
          }}
          className="absolute top-4 right-4 p-1.5 hover:bg-black/10 rounded-full transition-colors text-black"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 bg-[#701a31] text-white border-2 border-black text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Feedback &amp; Suggestions
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight">
          Help Us Improve CapiTalk 🚀
        </h3>
        <p className="text-xs text-[#242423] mt-1 mb-4 leading-relaxed font-medium">
          Found a bug or have an idea to make campus chat better? We read every student submission!
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold rounded-2xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[#242423] uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('suggestion')}
                className={`p-2.5 rounded-2xl border-2 text-xs font-extrabold flex items-center gap-2 transition-all ${
                  category === 'suggestion'
                    ? 'bg-[#701a31] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black border-black/30 hover:border-black'
                }`}
              >
                <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Suggestion</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('bug')}
                className={`p-2.5 rounded-2xl border-2 text-xs font-extrabold flex items-center gap-2 transition-all ${
                  category === 'bug'
                    ? 'bg-[#c41e3a] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black border-black/30 hover:border-black'
                }`}
              >
                <Bug className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Bug Report</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('ui_ux')}
                className={`p-2.5 rounded-2xl border-2 text-xs font-extrabold flex items-center gap-2 transition-all ${
                  category === 'ui_ux'
                    ? 'bg-purple-700 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black border-black/30 hover:border-black'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-purple-300" />
                <span>UI / UX</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('general')}
                className={`p-2.5 rounded-2xl border-2 text-xs font-extrabold flex items-center gap-2 transition-all ${
                  category === 'general'
                    ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black border-black/30 hover:border-black'
                }`}
              >
                <MessageSquareHeart className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>General</span>
              </button>
            </div>
          </div>

          {/* Rating Star Selection */}
          <div>
            <label className="block text-xs font-bold text-[#242423] uppercase tracking-wider mb-1.5">
              Rate your experience
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-[#242423] ml-2">
                {rating === 5 ? '😍 Excellent' : rating === 4 ? '😃 Good' : rating === 3 ? '😐 Okay' : '🙁 Needs Work'}
              </span>
            </div>
          </div>

          {/* Feedback Text Input */}
          <div>
            <label className="block text-xs font-bold text-[#242423] uppercase tracking-wider mb-1">
              Your Message or Bug Details
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you loved, what broke, or feature suggestions..."
              className="w-full p-3 text-xs sm:text-sm border-2 border-black rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-black bg-[#fbf9f5] text-black"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFeedbackModal(false)}
              className="btn-gumroad-ghost text-xs px-4 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gumroad-primary text-xs px-6 py-2.5 bg-[#701a31] hover:bg-[#4d0d1f] text-white border-2 border-black font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Feedback</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
