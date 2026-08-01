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

  if (trimmed.length < 3 || trimmed.length > 20) {
    return { isValid: false, error: 'Username must be between 3 and 20 characters.' };
  }

  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }

  const { isFlagged } = filterProfanity(trimmed);
  if (isFlagged) {
    return { isValid: false, error: 'Username contains inappropriate words.' };
  }

  return { isValid: true };
};
