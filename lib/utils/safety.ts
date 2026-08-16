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

export const MAX_USERNAME_LENGTH = 12;
export const MIN_USERNAME_LENGTH = 3;

export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Pseudonym is required.' };
  }

  const trimmed = username.trim();

  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return { isValid: false, error: `Pseudonym must be at least ${MIN_USERNAME_LENGTH} characters.` };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return { isValid: false, error: `Pseudonym must contain no more than ${MAX_USERNAME_LENGTH} characters.` };
  }

  // Letters, numbers, underscores, hyphens, or dots only
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Pseudonym can only contain letters, numbers, underscores (_), hyphens (-), or dots (.).' };
  }

  const { isFlagged } = filterProfanity(trimmed);
  if (isFlagged) {
    return { isValid: false, error: 'Pseudonym contains inappropriate words.' };
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
