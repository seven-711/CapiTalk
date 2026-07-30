'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, DEFAULT_AVATARS, DepartmentType } from '../lib/constants';
import { validateUsername } from '../lib/utils/safety';
import { CoinMascot } from './CoinMascot';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const RegistrationModal: React.FC = () => {
  const { registerUser, setViewState } = useChatStore();

  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('College of Computer Studies');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [bio, setBio] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Community Guidelines to join.');
      return;
    }

    registerUser(username, department, selectedAvatar, bio);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
      <div className="gumroad-feature-card p-4 sm:p-8 relative overflow-hidden">
        {/* Decorative Mascot */}
        <div className="absolute -top-4 -right-4 opacity-90 hidden sm:block">
          <CoinMascot size={88} tiltAngle={18} />
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f1f333] border border-black rounded-full text-xs font-bold text-black mb-2 sm:mb-3">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Capitol University Exclusive
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
            Create Your CapiTalk Profile
          </h2>
          <p className="text-sm text-[#242423] mt-1.5">
            Keep your real identity private. Pick a username and your college department.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#dc341e]/10 border border-[#dc341e] rounded-md text-sm text-[#dc341e] font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Avatar Selector */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Choose Avatar
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {DEFAULT_AVATARS.map((avatar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative p-1 rounded-full border-2 transition-all ${
                    selectedAvatar === avatar
                      ? 'border-black bg-[#ff90e8] scale-110'
                      : 'border-transparent hover:border-[#d1d5dc]'
                  }`}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${idx + 1}`}
                    className="w-12 h-12 rounded-full bg-[#f4f4f0]"
                  />
                  {selectedAvatar === avatar && (
                    <span className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-sm font-semibold text-black mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. pixelwizard, dev_july"
              className="gumroad-input w-full"
              maxLength={20}
            />
            <p className="text-xs text-[#242423] mt-1">
              3–20 characters. Letters, numbers, and underscores only. No student IDs or real names.
            </p>
          </div>

          {/* Department Select */}
          <div>
            <label className="block text-sm font-semibold text-black mb-1">
              Department / College <span className="text-red-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentType)}
              className="gumroad-input w-full bg-white cursor-pointer"
            >
              {CU_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#242423] mt-1">
              This will be visible to students you get paired with.
            </p>
          </div>

          {/* Bio Input (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-black mb-1">
              Bio <span className="text-xs font-normal text-gray-500">(Optional - max 80 chars)</span>
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Coffee lover & 3rd year coding student ☕"
              className="gumroad-input w-full"
              maxLength={80}
            />
          </div>

          {/* Community Guidelines Checkbox */}
          <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-md">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-xs text-[#242423] leading-relaxed">
                I agree to the <strong className="text-black">CapiTalk Community Guidelines</strong>. I will not harass, spam, or share inappropriate content with fellow Capitol University students.
              </span>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="btn-gumroad-primary w-full py-3.5 text-base"
            >
              <Sparkles className="w-5 h-5 text-[#ff90e8]" />
              <span>Start Chatting</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
