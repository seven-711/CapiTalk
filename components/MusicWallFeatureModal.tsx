'use client';

import React from 'react';
import { Music, Sparkles, Heart, Palette, ShieldCheck, X, ArrowRight } from 'lucide-react';

interface MusicWallFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

export const MusicWallFeatureModal: React.FC<MusicWallFeatureModalProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative my-auto overflow-hidden animate-in zoom-in-95 duration-200 text-black">
        
        {/* Top Header Banner */}
        <div className="bg-[#ffc900] border-b-4 border-black p-4 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 bg-white hover:bg-black hover:text-white rounded-full border-2 border-black transition-colors active:scale-95 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            title="Close announcement"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider mb-2 border border-black shadow-xs">
            <span>WHAT'S NEW ON CAPITALK</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-tight">
            Music Wall & Song Dedications
          </h2>
          <p className="text-xs sm:text-sm font-bold text-black/80 mt-1">
            Express your feelings with live audio previews and personalized souvenir notes!
          </p>
        </div>

        {/* Modal Body Features List */}
        <div className="p-4 sm:p-6 space-y-3.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Feature 1 */}
          <div className="p-3.5 bg-[#f4f4f0] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#ff90e8] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-black">30-Second Audio Previews 🎧</h4>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 leading-snug">
                Search millions of tracks from Apple iTunes with instant 30-sec audio previews and high-res album covers.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-3.5 bg-[#f4f4f0] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#ffc900] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-black">Dedicate To Your Crush 🎯</h4>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 leading-snug">
                Add a recipient tag (e.g. <i>"Sarah from Nursing"</i>) to send sweet song dedications across campus.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-3.5 bg-[#f4f4f0] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#00e599] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-black">Custom Souvenir Colors 🎨</h4>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 leading-snug">
                Pick your favorite souvenir note theme color (Gold, Soft Rose, Mint, Sky Blue, Lavender, Peach, or Clean White).
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-3.5 bg-[#f4f4f0] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-xl bg-[#7dd3fc] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-black">Verified Identity & Moderation 🛡️</h4>
              <p className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 leading-snug">
                Songs post under your registered student username with anti-bot protection and admin moderation.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer CTA Button */}
        <div className="p-4 sm:p-5 border-t-4 border-black bg-[#f4f4f0] flex flex-col sm:flex-row items-center gap-3 justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-black text-gray-600 hover:text-black py-2.5 px-4 rounded-xl transition-colors"
          >
            Maybe Later
          </button>
          
          <button
            type="button"
            onClick={() => {
              onExplore();
              onClose();
            }}
            className="w-full sm:w-auto bg-[#ffc900] hover:bg-[#ffdb4d] text-black font-black py-3 px-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Explore Music Wall</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
