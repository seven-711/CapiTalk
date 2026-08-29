import { normalizeText } from './profanityFilter';

const ALL_DEROGATORY_TERMS = [
  // Tagalog / Bisaya Insults & Derogatory terms
  'bobo', 'boba', 'tanga', 'gago', 'gaga', 'tarantado', 'tarantada',
  'ulol', 'ogag', 'engot', 'inutil', 'abnoy', 'sira ulo', 'walang utak',
  'walang kwenta', 'bulok', 'bogok', 'kupal', 'salot', 'demonyo',
  'basura ka', 'bilat', 'puki', 'ulok', 'pokpok', 'bayaran', 'malandi',
  'kantot', 'kantutan', 'jakol', 'jakolero', 'jakolera', 'iyot', 'pepe',
  'kiki', 'etits', 'bayag', 'putang ina', 'putangina', 'puta', 'pota',
  'pucha', 'punyeta', 'leche', 'litse', 'ltse', 'bwisit', 'bwiset', 'buset',
  'peste', 'pste', 'hayop ka', 'animal ka', 'lintik ka', 'yawa', 'yawaka',
  'animal nga bayot',

  // English profanity, slurs, harassment, hate speech
  'fuck', 'fucking', 'fucker', 'shit', 'bitch', 'asshole', 'bastard',
  'motherfucker', 'dumbass', 'moron', 'retard', 'cunt', 'dick',
  'pussy', 'nigger', 'nigga', 'faggot', 'slut', 'whore', 'kill yourself',
  'kys'
];

/**
 * Validates loudspeaker broadcast message content against derogatory remarks,
 * profanity, slurs, hate speech, and character limit constraints.
 */
export function validateLoudspeakerContent(text: string): { isValid: boolean; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Announcement message cannot be empty.' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Announcement message must be at least 3 characters.' };
  }
  if (trimmed.length > 140) {
    return { isValid: false, error: 'Announcement message cannot exceed 140 characters.' };
  }

  const { raw, normalized, deSpaced, collapsed } = normalizeText(trimmed);

  for (const term of ALL_DEROGATORY_TERMS) {
    const termNormalized = term.toLowerCase().replace(/[\s,.\-!?:;"'()\[\]{}/*_]+/g, '');

    // 1. Direct word boundary check
    const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (wordRegex.test(raw) || wordRegex.test(normalized)) {
      return {
        isValid: false,
        error: `Derogatory content detected. Derogatory remarks, harassment, and profanity are strictly prohibited.`,
      };
    }

    // 2. Obfuscation & spaced characters check
    if (termNormalized.length >= 4 && (deSpaced.includes(termNormalized) || collapsed.includes(termNormalized))) {
      return {
        isValid: false,
        error: `Derogatory content detected. Derogatory remarks, harassment, and profanity are strictly prohibited.`,
      };
    }
  }

  return { isValid: true };
}
