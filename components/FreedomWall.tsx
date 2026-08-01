'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import {
  MessageSquare,
  Plus,
  Heart,
  Search,
  X,
  Send,
  AlertTriangle,
  ArrowLeft,
  Flame,
  Clock,
} from 'lucide-react';

const POST_COLORS = [
  { name: 'Yellow', hex: '#ffc900' },
  { name: 'Pink', hex: '#ff90e8' },
  { name: 'Mint', hex: '#00e599' },
  { name: 'Lavender', hex: '#c4b5fd' },
  { name: 'Sky', hex: '#7dd3fc' },
  { name: 'Peach', hex: '#fca5a5' },
];

export const FreedomWall: React.FC = () => {
  const {
    currentUser,
    freedomPosts,
    addFreedomPost,
    likeFreedomPost,
    setViewState,
    startSearch,
  } = useChatStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alias, setAlias] = useState(currentUser ? currentUser.username : 'Anon Student');
  const [department, setDepartment] = useState<string>(currentUser ? currentUser.department : 'General');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffc900');
  const [moderationError, setModerationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('latest');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    if (!message.trim()) {
      setModerationError('Please enter your message before posting.');
      return;
    }

    // Run profanity moderation check
    const modResult = analyzeContentModeration(message);
    if (modResult.contains_profanity) {
      setModerationError(`⚠️ Message blocked: Contains profane or inappropriate terms (${modResult.matched_terms.join(', ')}). Please keep the Freedom Wall friendly!`);
      return;
    }

    const success = addFreedomPost({
      author_alias: alias.trim() || 'Anon Student',
      department: department || 'General',
      message: message.trim(),
      color: selectedColor,
    });

    if (success) {
      setMessage('');
      setShowCreateModal(false);
      setModerationError(null);
    }
  };

  // Filter & Sort Posts
  const filteredPosts = (freedomPosts || [])
    .filter((post) => {
      const matchDept = departmentFilter === 'all' || post.department === departmentFilter;
      const matchQuery =
        !searchQuery.trim() ||
        post.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchQuery;
    })
    .sort((a, b) => {
      if (activeTab === 'trending') return b.likes_count - a.likes_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 animate-in fade-in duration-200">
      {/* Top Banner Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 bg-white border-2 border-black p-4 sm:p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewState('queue')}
            className="p-2 bg-[#f4f4f0] hover:bg-black hover:text-white border border-black rounded-full transition-all shrink-0"
            title="Back to Matchmaking"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#ff90e8] border border-black text-black text-2xl sm:text-xs font-extrabold rounded-full uppercase tracking-wider">
                Campus Wall
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-gumroad-primary text-xs sm:text-sm px-5 py-3 w-full sm:w-auto flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            <Plus className="w-4 h-4" />
            <span>Share thoughts...</span>
          </button>
          <button
            type="button"
            onClick={startSearch}
            className="btn-gumroad-ghost text-xs sm:text-sm px-4 py-3 w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <span>Start Chat</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#f4f4f0] p-3 border-2 border-black rounded-2xl">
        {/* Tab Selection */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('latest')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap border ${
              activeTab === 'latest'
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-black border-[#d1d5dc] hover:border-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Latest Posts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap border ${
              activeTab === 'trending'
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-black border-[#d1d5dc] hover:border-black'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Trending / Top Liked</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-full md:max-w-md">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-black rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Department Filter Dropdown */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs bg-white border border-black rounded-xl px-2.5 py-2 sm:py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-black w-full sm:w-auto shrink-0"
          >
            <option value="all">All Departments</option>
            {CU_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept.replace('College of ', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Freedom Wall Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-black rounded-3xl p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#ffc900] border-2 border-black flex items-center justify-center mx-auto mb-4 text-2xl">
            📜
          </div>
          <h3 className="text-xl font-extrabold text-black">No Freedom Wall Posts Found</h3>
          <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
            {searchQuery || departmentFilter !== 'all'
              ? 'No posts match your active search filter. Try clearing filters!'
              : 'Be the very first CU student to post an anonymous confession or thought on the wall!'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 btn-gumroad-primary text-xs px-5 py-2.5"
          >
            <span>Write First Post</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPosts.map((post) => {
            const hasLiked = currentUser ? post.liked_by_users?.includes(currentUser.id) : false;

            return (
              <div
                key={post.id}
                style={{ backgroundColor: post.color || '#ffc900' }}
                className="p-5 rounded-3xl border-2 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shrink-0">
                        {post.department.replace('College of ', '')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-black/70 shrink-0">
                      {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm font-extrabold leading-relaxed whitespace-pre-wrap text-black break-words mb-4">
                    "{post.message}"
                  </p>
                </div>

                <div className="pt-3 border-t border-black/20 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-black/80 italic truncate">
                    ~ {post.author_alias || 'Anon Student'}
                  </span>

                  <button
                    type="button"
                    onClick={() => likeFreedomPost(post.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-xs font-extrabold transition-all shadow-sm ${
                      hasLiked
                        ? 'bg-rose-500 text-white border-black shadow-md scale-105'
                        : 'bg-white border-black text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-white text-white animate-pulse' : ''}`} />
                    <span>{post.likes_count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Mobile Action Button */}
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 bg-[#ff90e8] border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black"
        title="Post Anonymous Message"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Create Anonymous Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-3xl max-w-lg w-full text-left shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setModerationError(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-black/10 rounded-full transition-colors text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#ffc900] border border-black text-black text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                Anonymous Post
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight">
              Post to Freedom Wall ✏️
            </h3>
            <p className="text-xs text-[#242423] mt-1 mb-5">
              Share your thoughts safely and anonymously with fellow students.
            </p>

            {moderationError && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{moderationError}</span>
              </div>
            )}

            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#242423] uppercase mb-1">
                    Anonymous Alias / Nickname
                  </label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g. Secret Admirer, Stressed Senior"
                    maxLength={30}
                    className="w-full px-3 py-2 text-xs border-2 border-black rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-black bg-[#f4f4f0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#242423] uppercase mb-1">
                    Department Tag
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border-2 border-black rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-black bg-[#f4f4f0]"
                  >
                    <option value="General">General / All Student</option>
                    {CU_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept.replace('College of ', '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#242423] uppercase mb-1">
                  Card Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {POST_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        selectedColor === c.hex
                          ? 'border-black scale-125 shadow-sm'
                          : 'border-black/40 hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#242423] uppercase">
                    Your Anonymous Message
                  </label>
                  <span className="text-[10px] font-bold text-gray-500">
                    {message.length}/300
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={300}
                  placeholder="Type your confession, thought, shoutout, or campus vibe here..."
                  className="w-full p-3 text-xs sm:text-sm border-2 border-black rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white text-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-gumroad-ghost text-xs px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gumroad-primary text-xs px-6 py-2.5 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish to Freedom Wall</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
