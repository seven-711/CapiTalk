'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, DepartmentType } from '../lib/constants';
import { validateLoudspeakerContent } from '../lib/utils/loudspeakerValidation';
import {
  Megaphone,
  X,
  Clock,
  Sparkles,
  Music,
  Radio,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Eye,
  Trash2,
  Send,
  Zap,
  ArrowRight,
  ChevronRight,
  Lock,
} from 'lucide-react';

const THEME_OPTIONS = [
  { id: 'maroon', name: 'Maroon', hex: '#701a31', textHex: '#ffffff' },
  { id: 'gold', name: 'Gold', hex: '#d97706', textHex: '#ffffff' },
  { id: 'rose', name: 'Rose', hex: '#e11d48', textHex: '#ffffff' },
  { id: 'emerald', name: 'Emerald', hex: '#059669', textHex: '#ffffff' },
  { id: 'blue', name: 'Electric Blue', hex: '#2563eb', textHex: '#ffffff' },
  { id: 'zinc', name: 'Slate Dark', hex: '#18181b', textHex: '#ffffff' },
];

const cleanSlotLabel = (label?: string) => {
  if (!label) return 'Scheduled Slot';
  return label.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|⚡|📢|🔴|★|🔒|📅/gu, '').trim() || 'Scheduled Slot';
};

export const LoudspeakerModal: React.FC = () => {
  const {
    showLoudspeakerModal,
    setShowLoudspeakerModal,
    loudspeakerBookings,
    activeLoudspeaker,
    currentUser,
    bookLoudspeakerSlot,
    cancelLoudspeakerBooking,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'compose' | 'my_bookings'>('schedule');

  // Swipe-down-to-hide gesture state on mobile bottom sheet
  const [modalDragY, setModalDragY] = useState<number>(0);
  const [isModalDragging, setIsModalDragging] = useState<boolean>(false);
  const dragStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
    setIsModalDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;
    if (deltaY > 0) {
      setModalDragY(deltaY);
    } else {
      setModalDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (modalDragY > 75) {
      setShowLoudspeakerModal(false);
    }
    setModalDragY(0);
    setIsModalDragging(false);
    dragStartYRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
    setIsModalDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isModalDragging || dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY > 0) {
      setModalDragY(deltaY);
    } else {
      setModalDragY(0);
    }
  };

  const handlePointerUp = () => {
    if (modalDragY > 75) {
      setShowLoudspeakerModal(false);
    }
    setModalDragY(0);
    setIsModalDragging(false);
    dragStartYRef.current = null;
  };

  // Composer Form State
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('instant');
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>('Instant Broadcast');
  const [message, setMessage] = useState<string>('');
  const [alias, setAlias] = useState<string>(currentUser?.username || 'Anonymous Student');
  const [department, setDepartment] = useState<DepartmentType>(
    currentUser?.department || 'College of Arts and Sciences'
  );
  const [selectedThemeHex, setSelectedThemeHex] = useState<string>('#701a31');
  const [songTitle, setSongTitle] = useState<string>('');
  const [songArtist, setSongArtist] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time derogatory and profanity content moderation analysis
  const contentValidation = useMemo(() => {
    if (!message.trim()) return { isValid: true };
    return validateLoudspeakerContent(message);
  }, [message]);

  // Check if another broadcast is currently live on air
  const isCurrentlyBroadcastingLive = useMemo(() => {
    if (!activeLoudspeaker) return false;
    const schedTime = new Date(activeLoudspeaker.scheduled_at).getTime();
    const durMs = (activeLoudspeaker.duration_seconds || 30) * 1000;
    return schedTime <= Date.now() && (schedTime + durMs) > Date.now();
  }, [activeLoudspeaker]);

  // Generate 15-minute time slots for today starting from current hour
  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Instant Slot first
    slots.push({
      id: 'slot_instant',
      timeISO: 'instant',
      label: 'Instant Broadcast',
      isInstant: true,
    });

    for (let h = currentHour; h <= Math.min(23, currentHour + 6); h++) {
      for (const m of [0, 15, 30, 45]) {
        const slotDate = new Date();
        slotDate.setHours(h, m, 0, 0);

        if (slotDate.getTime() > now.getTime() + 60000) {
          const hour12 = h % 12 === 0 ? 12 : h % 12;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const minStr = m.toString().padStart(2, '0');
          const timeString = `${hour12}:${minStr} ${ampm}`;

          slots.push({
            id: `slot_${h}_${m}`,
            timeISO: slotDate.toISOString(),
            label: `${timeString} Slot`,
            isInstant: false,
          });
        }
      }
    }
    return slots;
  }, [showLoudspeakerModal]);

  // User's own bookings
  const myBookings = useMemo(() => {
    if (!currentUser) return [];
    return (loudspeakerBookings || []).filter(
      (b) => b.user_id === currentUser.id || b.author_alias === currentUser.username
    );
  }, [loudspeakerBookings, currentUser]);

  if (!showLoudspeakerModal) return null;

  const handleSelectSlot = (slot: { timeISO: string; label: string; isInstant?: boolean }) => {
    // Prevent selecting already booked slot
    const isAlreadyBooked = (loudspeakerBookings || []).some(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'completed' &&
        b.scheduled_at === slot.timeISO
    );

    if (isAlreadyBooked) {
      setErrorMessage('This time slot is already reserved. Please select an available slot.');
      return;
    }

    if (slot.isInstant && isCurrentlyBroadcastingLive) {
      setErrorMessage('A broadcast is currently live on air. Please wait 30 seconds or choose a scheduled slot.');
      return;
    }

    setErrorMessage(null);
    setSelectedSlotTime(slot.timeISO);
    setSelectedSlotLabel(slot.label);
    setActiveTab('compose');
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setErrorMessage('Please enter an announcement message.');
      return;
    }

    // Strict Derogatory and Profanity Content Validation
    const validation = validateLoudspeakerContent(trimmedMsg);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Derogatory content detected. Please keep announcements respectful.');
      return;
    }

    // Verify slot is not already reserved
    if (selectedSlotTime !== 'instant') {
      const isSlotTaken = (loudspeakerBookings || []).some(
        (b) =>
          b.status !== 'cancelled' &&
          b.status !== 'completed' &&
          b.scheduled_at === selectedSlotTime
      );
      if (isSlotTaken) {
        setErrorMessage('This time slot has already been reserved by another user. Please choose an available slot.');
        return;
      }
    } else if (isCurrentlyBroadcastingLive) {
      setErrorMessage('Another broadcast is currently transmitting live. Please wait 30 seconds or book a future slot.');
      return;
    }

    bookLoudspeakerSlot({
      user_id: currentUser?.id || 'anon_user_' + Date.now(),
      author_alias: alias.trim() || 'Anonymous Student',
      department,
      message: trimmedMsg,
      theme_color: selectedThemeHex,
      song_title: songTitle.trim() || undefined,
      song_artist: songArtist.trim() || undefined,
      scheduled_at: selectedSlotTime,
      slot_label: cleanSlotLabel(selectedSlotLabel),
      duration_seconds: 30,
    });

    // Reset form
    setMessage('');
    setSongTitle('');
    setSongArtist('');
    setActiveTab('schedule');
  };

  return (
    <div
      onClick={() => setShowLoudspeakerModal(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${modalDragY}px)`,
          transition: isModalDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 max-h-[92dvh] sm:max-h-[88vh] h-[92dvh] sm:h-auto animate-in slide-in-from-bottom duration-300 ease-out font-sans"
      >
        {/* Mobile Drag Indicator Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="pt-3 pb-1.5 flex flex-col items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none bg-zinc-50/80 dark:bg-zinc-900/80 sm:hidden shrink-0 border-b border-zinc-100 dark:border-zinc-800/60"
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Header (also swipeable down on touch) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="p-4 sm:p-6 bg-zinc-50/60 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between touch-none select-none sm:select-auto shrink-0"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#701a31]/10 dark:bg-rose-950/40 text-[#701a31] dark:text-rose-400 border border-[#701a31]/20 dark:border-rose-800/40 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white leading-snug">
                Campus Megaphone
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Broadcast announcements live to all active chatrooms in real time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLoudspeakerModal(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Broadcast Ticker Banner (if currently active) */}
        {activeLoudspeaker && (
          <div className="bg-[#701a31] dark:bg-rose-950 text-white px-5 py-2.5 border-b border-[#701a31]/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 text-xs font-medium truncate">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-300"></span>
              </span>
              <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">Live On Air:</span>
              <span className="truncate opacity-95">"{activeLoudspeaker.message}" — @{activeLoudspeaker.author_alias}</span>
            </div>
            <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
              Active Broadcast
            </span>
          </div>
        )}

        {/* Segmented Pill Tabs */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4 shrink-0">
          <div className="p-1 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Compose</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my_bookings')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'my_bookings'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reservations</span>
              {myBookings.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#701a31] dark:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {myBookings.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Timetable Schedule */}
        {activeTab === 'schedule' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Heads-up & Community Standards Notice */}
            <div className="p-3.5 sm:p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Campus Broadcast Guidelines & Conduct
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Broadcasts transmit live to all active chatrooms. Derogatory remarks, hate speech, harassment, vulgarity, or sexually explicit content are strictly prohibited and will result in an immediate permanent account ban.
                </p>
              </div>
            </div>

            {/* Instant Broadcast Hero Card */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-50 via-zinc-50 to-zinc-100 dark:from-zinc-800/60 dark:via-zinc-800/40 dark:to-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Instant Broadcast
                    </h3>
                    {isCurrentlyBroadcastingLive ? (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        On Air (Occupied)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Available Now
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {isCurrentlyBroadcastingLive
                      ? 'Another broadcast is currently on air. Wait 30 seconds or reserve an upcoming time slot.'
                      : 'Transmit your message immediately across all active chatrooms with zero delay.'}
                  </p>
                </div>
              </div>

              {isCurrentlyBroadcastingLive ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-semibold text-xs rounded-xl cursor-not-allowed pointer-events-none shrink-0"
                >
                  In Use (Wait 30s)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectSlot({ timeISO: 'instant', label: 'Instant Broadcast', isInstant: true })}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  <span>Broadcast Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Slots Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Time Slot Schedule
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Reserved slots are disabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {timeSlots.map((slot) => {
                  const existingBooking = (loudspeakerBookings || []).find(
                    (b) =>
                      b.status !== 'cancelled' &&
                      b.status !== 'completed' &&
                      (b.scheduled_at === slot.timeISO ||
                        (slot.isInstant && b.status === 'live'))
                  );

                  const isMyBooking =
                    existingBooking &&
                    currentUser &&
                    (existingBooking.user_id === currentUser.id ||
                      existingBooking.author_alias === currentUser.username);

                  const isBooked = Boolean(existingBooking);

                  return (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isBooked
                          ? 'bg-zinc-100/70 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800/80 opacity-70'
                          : slot.isInstant
                          ? 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700'
                          : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isBooked
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                                : slot.isInstant
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isBooked ? (
                              <Lock className="w-4 h-4" />
                            ) : slot.isInstant ? (
                              <Zap className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {slot.label}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              30s duration
                            </p>
                          </div>
                        </div>

                        {/* Status Chip */}
                        {isBooked ? (
                          <span
                            className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                              isMyBooking
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            {isMyBooking ? 'Your Slot' : 'Reserved'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Info / Action */}
                      <div className="pt-2 flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
                        {isBooked ? (
                          <p className="text-[11px] text-zinc-500 truncate max-w-[170px]">
                            {existingBooking?.author_alias} ({existingBooking?.department})
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 font-medium">
                            Ready to reserve
                          </p>
                        )}

                        {isBooked ? (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs font-semibold rounded-lg cursor-not-allowed pointer-events-none"
                          >
                            Reserved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSlot(slot)}
                            className="px-3 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Composer & Live Preview */}
        {activeTab === 'compose' && (
          <form onSubmit={handleBookSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Conduct & Content Warning Banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Content Conduct Requirement</p>
                <p className="text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Derogatory remarks, hate speech, harassment, profanity, and explicit content are strictly prohibited. Violations will result in an immediate permanent ban.
                </p>
              </div>
            </div>

            {/* Slot Mode Selector */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                  Broadcast Timing
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs font-semibold text-[#701a31] dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View All Slots</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotTime('instant');
                    setSelectedSlotLabel('Instant Broadcast');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedSlotTime === 'instant'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedSlotTime !== 'instant'
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="truncate">{selectedSlotTime !== 'instant' ? cleanSlotLabel(selectedSlotLabel) : 'Scheduled Slot'}</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Announcement Message Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Announcement Message
                </label>
                <span
                  className={`text-[11px] font-medium ${
                    message.length > 130 ? 'text-rose-500' : 'text-zinc-400'
                  }`}
                >
                  {message.length}/140
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Type your announcement message to the campus..."
                rows={3}
                maxLength={140}
                className={`w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border text-zinc-900 dark:text-white placeholder-zinc-400 text-xs sm:text-sm font-normal focus:outline-hidden focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none ${
                  !contentValidation.isValid
                    ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 focus:border-[#701a31] dark:focus:border-rose-500 focus:ring-2 focus:ring-[#701a31]/10 dark:focus:ring-rose-500/10'
                }`}
              />

              {/* Direct Content Moderation Indicator */}
              {!contentValidation.isValid ? (
                <div className="mt-1.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{contentValidation.error}</span>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Direct announcements are transmitted live across all campus chatrooms for 30 seconds.
                </p>
              )}
            </div>

            {/* Department & Author Alias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Pseudonym / Alias
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Anonymous Student"
                  maxLength={25}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-[#701a31] dark:focus:border-rose-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-[#701a31] dark:focus:border-rose-500 focus:bg-white dark:focus:bg-zinc-900 transition-all cursor-pointer"
                >
                  {CU_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accent Theme Picker */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                Banner Color Theme
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = selectedThemeHex === theme.hex;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedThemeHex(theme.hex)}
                      style={{ backgroundColor: theme.hex, color: theme.textHex }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-102'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Chatroom Preview</span>
              </div>

              <div
                style={{ backgroundColor: selectedThemeHex }}
                className="p-4 rounded-2xl text-white shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-black/35 px-2.5 py-0.5 rounded-full border border-white/20">
                      LIVE
                    </span>
                    <span className="text-xs font-medium opacity-90 truncate max-w-[130px]">
                      {department}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                    00:30
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold leading-snug drop-shadow-xs">
                  {message.trim() || 'Your broadcast message preview will appear right here in real time...'}
                </p>

                <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px]">
                  <span className="font-medium opacity-90">Broadcasted by @{alias || 'Anonymous Student'}</span>
                  {songTitle && (
                    <span className="inline-flex items-center gap-1 font-medium bg-white/15 px-2 py-0.5 rounded-md">
                      <Music className="w-3 h-3" />
                      {songTitle} {songArtist ? `• ${songArtist}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!contentValidation.isValid || !message.trim()}
                className={`w-full py-3.5 px-4 font-bold text-sm sm:text-base rounded-2xl text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                  !contentValidation.isValid || !message.trim()
                    ? 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-[#701a31] hover:bg-[#581426] dark:bg-rose-600 dark:hover:bg-rose-700 active:scale-98 cursor-pointer'
                }`}
              >
                {selectedSlotTime === 'instant' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Broadcast Live Now</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm Reservation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: My Reservations */}
        {activeTab === 'my_bookings' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {myBookings.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center justify-center gap-2.5 text-zinc-500 dark:text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Clock className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">No active reservations</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Select a time slot from the schedule tab to reserve a campus-wide broadcast.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="mt-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Browse Schedule
                </button>
              </div>
            ) : (
              myBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        style={{ backgroundColor: b.theme_color || '#701a31' }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {cleanSlotLabel(b.slot_label)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                        b.status === 'live'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                          : b.status === 'scheduled'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {b.status === 'live' ? 'Live Now' : b.status}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    "{b.message}"
                  </p>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-400">
                      Department: {b.department}
                    </span>

                    {b.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => cancelLoudspeakerBooking(b.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
