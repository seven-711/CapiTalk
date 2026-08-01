import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { GlobalBroadcast, CreateBroadcastInput } from '../types/broadcast';

const STORAGE_KEY = 'capitalk_broadcasts_v1';

interface BroadcastStore {
  activeBroadcast: GlobalBroadcast | null;
  pendingBroadcasts: GlobalBroadcast[];
  expiredBroadcasts: GlobalBroadcast[];
  isInitialized: boolean;
  isLoading: boolean;

  initBroadcasts: () => void;
  createBroadcast: (input: CreateBroadcastInput) => Promise<{ success: boolean; broadcast?: GlobalBroadcast; error?: string }>;
  trackImpression: (id: string) => void;
  trackClick: (id: string) => void;
  cancelBroadcast: (id: string) => Promise<void>;
  skipActiveBroadcast: () => Promise<void>;
  activatePendingBroadcast: (id: string) => Promise<void>;
  checkQueueExpiration: () => void;
}

// Multi-tab sync channel
const broadcastSyncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('capitalk_broadcast_sync_v1')
    : null;

export const useBroadcastStore = create<BroadcastStore>((set, get) => ({
  activeBroadcast: null,
  pendingBroadcasts: [],
  expiredBroadcasts: [],
  isInitialized: false,
  isLoading: false,

  initBroadcasts: () => {
    if (get().isInitialized) return;
    set({ isLoading: true });

    let localBroadcasts: GlobalBroadcast[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          localBroadcasts = JSON.parse(raw);
        }
      } catch (e) {}
    }

    // Process initial local state
    const updateLocalState = (all: GlobalBroadcast[]) => {
      const now = new Date();

      // Process expirations
      const processed = all.map((b) => {
        if (b.status === 'active' && new Date(b.ends_at) <= now) {
          return { ...b, status: 'expired' as const };
        }
        return b;
      });

      let active = processed.find((b) => b.status === 'active') || null;
      let pending = processed.filter((b) => b.status === 'pending').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const expired = processed.filter((b) => b.status === 'expired' || b.status === 'cancelled').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Auto-activate next pending if active expired
      if (!active && pending.length > 0) {
        const next = pending.shift()!;
        const duration = next.duration_minutes || 30;
        const starts = new Date();
        const ends = new Date(starts.getTime() + duration * 60 * 1000);
        active = {
          ...next,
          status: 'active',
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        };
      }

      set({
        activeBroadcast: active,
        pendingBroadcasts: pending,
        expiredBroadcasts: expired,
        isInitialized: true,
        isLoading: false,
      });

      if (typeof window !== 'undefined') {
        const merged = [...(active ? [active] : []), ...pending, ...expired];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    };

    updateLocalState(localBroadcasts);

    // Sync with Supabase Database
    if (supabase && isSupabaseConfigured) {
      try {
        supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (data && data.length > 0 && !error) {
              updateLocalState(data as GlobalBroadcast[]);
            }
          }, () => {});
      } catch (e) {}

      // Supabase Realtime Postgres Changes Listener
      try {
        const channel = supabase.channel('capitalk_realtime_broadcasts_v1');
        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
            // Re-fetch clean list on change
            if (supabase) {
              supabase
                .from('broadcasts')
                .select('*')
                .order('created_at', { ascending: false })
                .then(({ data }) => {
                  if (data) updateLocalState(data as GlobalBroadcast[]);
                }, () => {});
            }
          })
          .subscribe();
      } catch (e) {}
    }

    // HTML5 BroadcastChannel multi-tab listener
    if (broadcastSyncChannel) {
      broadcastSyncChannel.onmessage = (event) => {
        if (event.data?.type === 'BROADCASTS_UPDATED' && event.data.all) {
          updateLocalState(event.data.all);
        }
      };
    }

    // Storage event fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            updateLocalState(JSON.parse(e.newValue));
          } catch (err) {}
        }
      });
    }

    // Automatic 1s Queue Expiration Check & Countdown Loop
    setInterval(() => {
      get().checkQueueExpiration();
    }, 1000);
  },

  checkQueueExpiration: () => {
    const { activeBroadcast, pendingBroadcasts, expiredBroadcasts } = get();
    const now = new Date();

    if (activeBroadcast && new Date(activeBroadcast.ends_at) <= now) {
      // Active broadcast has expired -> auto-transition to next pending broadcast
      const finishedActive: GlobalBroadcast = { ...activeBroadcast, status: 'expired', updated_at: now.toISOString() };
      const remainingPending = [...pendingBroadcasts];
      let nextActive: GlobalBroadcast | null = null;

      if (remainingPending.length > 0) {
        const next = remainingPending.shift()!;
        const duration = next.duration_minutes || 30;
        const starts = now;
        const ends = new Date(starts.getTime() + duration * 60 * 1000);
        nextActive = {
          ...next,
          status: 'active',
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          updated_at: now.toISOString(),
        };
      }

      const updatedExpired = [finishedActive, ...expiredBroadcasts];

      set({
        activeBroadcast: nextActive,
        pendingBroadcasts: remainingPending,
        expiredBroadcasts: updatedExpired,
      });

      const all = [...(nextActive ? [nextActive] : []), ...remainingPending, ...updatedExpired];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      if (broadcastSyncChannel) {
        broadcastSyncChannel.postMessage({ type: 'BROADCASTS_UPDATED', all });
      }

      // Update in Supabase
      if (supabase && isSupabaseConfigured) {
        try {
          supabase.from('broadcasts').update({ status: 'expired', updated_at: now.toISOString() }).eq('id', finishedActive.id).then(() => {}, () => {});
          if (nextActive) {
            supabase.from('broadcasts').update({ status: 'active', starts_at: nextActive.starts_at, ends_at: nextActive.ends_at, updated_at: now.toISOString() }).eq('id', nextActive.id).then(() => {}, () => {});
          }
        } catch (e) {}
      }
    }
  },

  createBroadcast: async (input) => {
    const now = new Date();
    const duration = input.duration_minutes || 30;

    const { activeBroadcast, pendingBroadcasts, expiredBroadcasts } = get();
    const isCurrentlyActive = activeBroadcast && new Date(activeBroadcast.ends_at) > now;
    const initialStatus: GlobalBroadcast['status'] = isCurrentlyActive ? 'pending' : 'active';

    const startsAt = now.toISOString();
    const endsAt = new Date(now.getTime() + duration * 60 * 1000).toISOString();

    const newBroadcast: GlobalBroadcast = {
      id: 'bcast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      owner_id: input.owner_id || 'anon_user',
      owner_name: input.owner_name || 'Anonymous Student',
      title: input.title.trim(),
      description: input.description.trim(),
      image_url: input.image_url || null,
      action_url: input.action_url || null,
      status: initialStatus,
      starts_at: startsAt,
      ends_at: endsAt,
      duration_minutes: duration,
      impressions_count: 0,
      clicks_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    let updatedActive = activeBroadcast;
    let updatedPending = [...pendingBroadcasts];
    const updatedExpired = [...expiredBroadcasts];

    if (initialStatus === 'active') {
      updatedActive = newBroadcast;
    } else {
      updatedPending.push(newBroadcast);
    }

    set({
      activeBroadcast: updatedActive,
      pendingBroadcasts: updatedPending,
      expiredBroadcasts: updatedExpired,
    });

    const all = [...(updatedActive ? [updatedActive] : []), ...updatedPending, ...updatedExpired];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    if (broadcastSyncChannel) {
      broadcastSyncChannel.postMessage({ type: 'BROADCASTS_UPDATED', all });
    }

    // Persist to Supabase Database
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('broadcasts').insert({
          id: newBroadcast.id,
          owner_id: newBroadcast.owner_id,
          owner_name: newBroadcast.owner_name,
          title: newBroadcast.title,
          description: newBroadcast.description,
          image_url: newBroadcast.image_url,
          action_url: newBroadcast.action_url,
          status: newBroadcast.status,
          starts_at: newBroadcast.starts_at,
          ends_at: newBroadcast.ends_at,
          duration_minutes: newBroadcast.duration_minutes,
          impressions_count: 0,
          clicks_count: 0,
          created_at: newBroadcast.created_at,
          updated_at: newBroadcast.updated_at,
        });
      } catch (e) {}
    }

    return { success: true, broadcast: newBroadcast };
  },

  trackImpression: (id) => {
    const { activeBroadcast } = get();
    if (activeBroadcast && activeBroadcast.id === id) {
      const updated = { ...activeBroadcast, impressions_count: activeBroadcast.impressions_count + 1 };
      set({ activeBroadcast: updated });

      if (supabase && isSupabaseConfigured) {
        try {
          supabase
            .from('broadcasts')
            .update({ impressions_count: updated.impressions_count })
            .eq('id', id)
            .then(() => {}, () => {});
        } catch (e) {}
      }
    }
  },

  trackClick: (id) => {
    const { activeBroadcast } = get();
    if (activeBroadcast && activeBroadcast.id === id) {
      const updated = { ...activeBroadcast, clicks_count: activeBroadcast.clicks_count + 1 };
      set({ activeBroadcast: updated });

      if (supabase && isSupabaseConfigured) {
        try {
          supabase
            .from('broadcasts')
            .update({ clicks_count: updated.clicks_count })
            .eq('id', id)
            .then(() => {}, () => {});
        } catch (e) {}
      }
    }
  },

  cancelBroadcast: async (id) => {
    const { activeBroadcast, pendingBroadcasts, expiredBroadcasts } = get();
    let updatedActive = activeBroadcast;
    let updatedPending = pendingBroadcasts.filter((b) => b.id !== id);

    let cancelledItem: GlobalBroadcast | null = null;

    if (activeBroadcast && activeBroadcast.id === id) {
      cancelledItem = { ...activeBroadcast, status: 'cancelled', updated_at: new Date().toISOString() };
      // Auto-activate next pending
      if (updatedPending.length > 0) {
        const next = updatedPending.shift()!;
        const duration = next.duration_minutes || 30;
        const starts = new Date();
        const ends = new Date(starts.getTime() + duration * 60 * 1000);
        updatedActive = {
          ...next,
          status: 'active',
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          updated_at: starts.toISOString(),
        };
      } else {
        updatedActive = null;
      }
    } else {
      const found = pendingBroadcasts.find((b) => b.id === id);
      if (found) {
        cancelledItem = { ...found, status: 'cancelled', updated_at: new Date().toISOString() };
      }
    }

    const updatedExpired = cancelledItem ? [cancelledItem, ...expiredBroadcasts] : expiredBroadcasts;

    set({
      activeBroadcast: updatedActive,
      pendingBroadcasts: updatedPending,
      expiredBroadcasts: updatedExpired,
    });

    const all = [...(updatedActive ? [updatedActive] : []), ...updatedPending, ...updatedExpired];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    if (broadcastSyncChannel) {
      broadcastSyncChannel.postMessage({ type: 'BROADCASTS_UPDATED', all });
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('broadcasts').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
        if (updatedActive) {
          await supabase.from('broadcasts').update({ status: 'active', starts_at: updatedActive.starts_at, ends_at: updatedActive.ends_at }).eq('id', updatedActive.id);
        }
      } catch (e) {}
    }
  },

  skipActiveBroadcast: async () => {
    const { activeBroadcast } = get();
    if (activeBroadcast) {
      await get().cancelBroadcast(activeBroadcast.id);
    }
  },

  activatePendingBroadcast: async (id) => {
    const { activeBroadcast, pendingBroadcasts, expiredBroadcasts } = get();
    const target = pendingBroadcasts.find((b) => b.id === id);
    if (!target) return;

    const now = new Date();
    const duration = target.duration_minutes || 30;
    const newActive: GlobalBroadcast = {
      ...target,
      status: 'active',
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + duration * 60 * 1000).toISOString(),
      updated_at: now.toISOString(),
    };

    let updatedExpired = [...expiredBroadcasts];
    if (activeBroadcast) {
      updatedExpired = [{ ...activeBroadcast, status: 'expired', updated_at: now.toISOString() }, ...updatedExpired];
    }

    const updatedPending = pendingBroadcasts.filter((b) => b.id !== id);

    set({
      activeBroadcast: newActive,
      pendingBroadcasts: updatedPending,
      expiredBroadcasts: updatedExpired,
    });

    const all = [newActive, ...updatedPending, ...updatedExpired];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    if (broadcastSyncChannel) {
      broadcastSyncChannel.postMessage({ type: 'BROADCASTS_UPDATED', all });
    }

    if (supabase && isSupabaseConfigured) {
      try {
        if (activeBroadcast) {
          await supabase.from('broadcasts').update({ status: 'expired' }).eq('id', activeBroadcast.id);
        }
        await supabase.from('broadcasts').update({
          status: 'active',
          starts_at: newActive.starts_at,
          ends_at: newActive.ends_at,
          updated_at: now.toISOString(),
        }).eq('id', id);
      } catch (e) {}
    }
  },
}));
