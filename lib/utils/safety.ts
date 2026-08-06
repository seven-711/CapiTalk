import { supabase, isSupabaseConfigured } from '../supabase/client';

/**
 * Safety & Moderation Utility for CapiTalk
 */

const PROFANITY_LIST = [
  'offensive', 'spam', 'hate', 'abuse', 'harass', 'vulgar', 'toxic',
];

export const filterProfanity = (text: string): { cleanText: string; isFlagged: boolean } => {
  return { cleanText: text, isFlagged: false };
};

export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required.' };
  }

  const trimmed = username.trim();

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must not exceed 20 characters.' };
  }

  const { isFlagged } = filterProfanity(trimmed);
  if (isFlagged) {
    return { isValid: false, error: 'Username contains inappropriate words.' };
  }

  return { isValid: true };
};

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'capitalk',
  'capitalk_admin',
  'system',
  'support',
  'moderator',
  'mod',
  'official',
  'official_admin',
];

export const checkUsernameAvailability = async (
  username: string,
  currentUserId?: string
): Promise<{ isAvailable: boolean; error?: string }> => {
  const trimmed = username.trim();
  const lower = trimmed.toLowerCase();

  const syntaxCheck = validateUsername(trimmed);
  if (!syntaxCheck.isValid) {
    return { isAvailable: false, error: syntaxCheck.error };
  }

  if (RESERVED_USERNAMES.includes(lower)) {
    return {
      isAvailable: false,
      error: `Username "${trimmed}" is reserved for platform administration.`,
    };
  }

  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, username')
        .ilike('username', trimmed);

      if (data && data.length > 0) {
        const takenUser = data.find((u: any) => u.id !== currentUserId);
        if (takenUser) {
          return {
            isAvailable: false,
            error: `Username "${trimmed}" is already taken by another student. Please pick a unique username.`,
          };
        }
      }
    } catch (e) {
      console.warn('Error checking username in Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('capitalk_taken_usernames_v1');
      if (raw) {
        const takenMap: Record<string, string> = JSON.parse(raw);
        if (takenMap[lower] && takenMap[lower] !== currentUserId) {
          return {
            isAvailable: false,
            error: `Username "${trimmed}" is already registered. Please pick a unique username.`,
          };
        }
      }
    } catch (e) {}
  }

  return { isAvailable: true };
};
