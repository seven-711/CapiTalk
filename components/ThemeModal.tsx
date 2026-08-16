'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Palette } from 'lucide-react';

export interface ChatThemeConfig {
  id: string;
  name: string;
  dotColor: string;
  bubbleBg: string;
  bubbleText: string;
  bubbleBorder: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
  headerButtonBg?: string;
  headerButtonText?: string;
  chatFeedBg?: string;
  badgeAccent?: string;
  btnBg?: string;
}

export const CHAT_THEMES: ChatThemeConfig[] = [
  {
    id: 'maroon',
    name: 'Default Chat Theme',
    dotColor: '#701a31',
    bubbleBg: '#701a31',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#701a31',
    headerText: '#ffffff',
    headerBorder: '#531123',
    headerButtonBg: 'rgba(255, 255, 255, 0.15)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#fff8f9',
    badgeAccent: '#ffc900',
    btnBg: '#701a31',
  },
  {
    id: 'yellow',
    name: 'Yellow Chat Theme',
    dotColor: '#ffc900',
    bubbleBg: '#ffc900',
    bubbleText: '#000000',
    bubbleBorder: '#000000',
    headerBg: '#ffc900',
    headerText: '#000000',
    headerBorder: '#000000',
    headerButtonBg: 'rgba(0, 0, 0, 0.08)',
    headerButtonText: '#000000',
    chatFeedBg: '#fffdf2',
    badgeAccent: '#701a31',
    btnBg: '#ffc900',
  },
  {
    id: 'pink',
    name: 'Pink Chat Theme',
    dotColor: '#ff4b91',
    bubbleBg: '#ff4b91',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#ff4b91',
    headerText: '#ffffff',
    headerBorder: '#e11d48',
    headerButtonBg: 'rgba(255, 255, 255, 0.18)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#fff5f8',
    badgeAccent: '#ffffff',
    btnBg: '#ff4b91',
  },
  {
    id: 'blue',
    name: 'Blue Chat Theme',
    dotColor: '#2563eb',
    bubbleBg: '#2563eb',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#2563eb',
    headerText: '#ffffff',
    headerBorder: '#1d4ed8',
    headerButtonBg: 'rgba(255, 255, 255, 0.18)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#f3f8ff',
    badgeAccent: '#ffffff',
    btnBg: '#2563eb',
  },
  {
    id: 'black',
    name: 'Black Theme',
    dotColor: '#18181b',
    bubbleBg: '#18181b',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#18181b',
    headerText: '#ffffff',
    headerBorder: '#27272a',
    headerButtonBg: 'rgba(255, 255, 255, 0.12)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#121212',
    badgeAccent: '#ffc900',
    btnBg: '#18181b',
  },
  {
    id: 'green',
    name: 'Green Chat Theme',
    dotColor: '#16a34a',
    bubbleBg: '#16a34a',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#16a34a',
    headerText: '#ffffff',
    headerBorder: '#15803d',
    headerButtonBg: 'rgba(255, 255, 255, 0.18)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#f2fbf5',
    badgeAccent: '#ffffff',
    btnBg: '#16a34a',
  },
  {
    id: 'tyron',
    name: "Tyron's Chat Theme",
    dotColor: '#e06d87',
    bubbleBg: '#e06d87',
    bubbleText: '#ffffff',
    bubbleBorder: '#000000',
    headerBg: '#e06d87',
    headerText: '#ffffff',
    headerBorder: '#c85670',
    headerButtonBg: 'rgba(255, 255, 255, 0.18)',
    headerButtonText: '#ffffff',
    chatFeedBg: '#fff4f6',
    badgeAccent: '#ffffff',
    btnBg: '#e06d87',
  },
];

export const getThemeConfig = (themeId?: string): ChatThemeConfig => {
  return CHAT_THEMES.find((t) => t.id === themeId) || CHAT_THEMES[0];
};

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onApplyTheme: (themeId: string) => void;
  isDarkMode?: boolean;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onApplyTheme,
  isDarkMode = false,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentTheme || 'maroon');

  useEffect(() => {
    if (isOpen) {
      setSelectedThemeId(currentTheme || 'maroon');
    }
  }, [isOpen, currentTheme]);

  if (!isOpen) return null;

  const previewTheme = getThemeConfig(selectedThemeId);

  const handleApply = () => {
    onApplyTheme(selectedThemeId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border-2 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDarkMode ? 'bg-[#18181b] border-[#3f3f46] text-white' : 'bg-white border-black text-black'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start justify-between border-b border-black/10 dark:border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#701a31] dark:text-[#ffc900]" />
              Choose Your Theme
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
              Select a color theme for your chat experience
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors text-gray-500 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List */}
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[220px] space-y-1.5 custom-scrollbar">
          {CHAT_THEMES.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? isDarkMode
                      ? 'border-[#ffc900] bg-zinc-800/90 shadow-sm'
                      : 'border-[#701a31] bg-[#fff1f3] shadow-xs'
                    : isDarkMode
                    ? 'border-transparent hover:bg-zinc-800/50 text-zinc-300'
                    : 'border-transparent hover:bg-gray-100/80 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full border-2 border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: theme.dotColor }}
                  />
                  <span className="font-extrabold text-xs sm:text-sm">{theme.name}</span>
                </div>
                {isSelected && (
                  <Check
                    className="w-5 h-5 stroke-[3]"
                    style={{ color: theme.id === 'maroon' ? '#701a31' : theme.dotColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Preview Box */}
        <div className="px-4 pb-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
            Preview
          </h4>
          <div
            className="rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col transition-colors duration-300"
            style={{
              borderColor: previewTheme.headerBorder,
              backgroundColor: previewTheme.chatFeedBg || '#f4f4f0',
            }}
          >
            {/* Themed Header Preview */}
            <div
              className="px-3.5 py-2.5 flex items-center justify-between border-b transition-colors duration-300"
              style={{
                backgroundColor: previewTheme.headerBg,
                color: previewTheme.headerText,
                borderColor: previewTheme.headerBorder,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-black/20 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <div className="font-extrabold text-xs leading-none">Anon Student</div>
                  <div className="text-[9.5px] font-semibold opacity-85 mt-0.5">ONLINE • Computer Science</div>
                </div>
              </div>
              <div
                className="text-[10px] px-2 py-0.5 rounded-full border border-black/20 font-bold"
                style={{
                  backgroundColor: previewTheme.headerButtonBg,
                  color: previewTheme.headerButtonText,
                }}
              >
                CapiTalk
              </div>
            </div>

            {/* Themed Chat Feed Preview */}
            <div className="p-3.5 space-y-2 flex flex-col justify-end min-h-[110px]">
              {/* Partner message bubble */}
              <div className="flex items-center">
                <div
                  className={`px-3 py-1.5 rounded-2xl rounded-tl-none border text-xs font-semibold max-w-[75%] shadow-2xs ${
                    selectedThemeId === 'black' ? 'bg-[#27272a] text-zinc-100 border-[#3f3f46]' : 'bg-white text-black border-[#d1d5dc]'
                  }`}
                >
                  Hello World!
                </div>
              </div>

              {/* User message bubble in preview theme */}
              <div className="flex items-center justify-end">
                <div
                  className="px-3 py-1.5 rounded-2xl rounded-tr-none border text-xs font-black max-w-[75%] shadow-xs transition-all duration-300"
                  style={{
                    backgroundColor: previewTheme.bubbleBg,
                    color: previewTheme.bubbleText,
                    borderColor: previewTheme.bubbleBorder || '#000000',
                  }}
                >
                  LOL!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-black/10 dark:border-zinc-800 flex items-center justify-end gap-2.5 bg-gray-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
              isDarkMode
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-xs active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            style={{
              backgroundColor: previewTheme.btnBg || '#701a31',
              color: previewTheme.id === 'yellow' ? '#000000' : '#ffffff',
            }}
          >
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
};
