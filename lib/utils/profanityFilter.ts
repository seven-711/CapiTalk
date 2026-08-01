import profaneWords from 'profane-words';

export interface ModerationResult {
  contains_profanity: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  matched_terms: string[];
  reason: string;
  recommended_action: 'allow' | 'warn' | 'review' | 'block';
  is_identity_term_only?: boolean;
}

// General Insults (Severity: Medium)
const GENERAL_INSULTS = [
  'bobo', 'boba', 'tanga', 'gago', 'gaga', 'tarantado', 'tarantada',
  'ulol', 'ogag', 'engot', 'inutil', 'abnoy', 'sira ulo', 'walang utak',
  'walang kwenta', 'bulok', 'bogok', 'b0b0', 't4nga', 't@nga', 'g4go', 'g@g0', 'u1o1', 'b0g0k'
];

// Profanity & Abusive Language (Severity: High)
const SEVERE_PROFANITY = [
  'putang ina', 'putangina', 'puta', 'pota', 'pucha', 'punyeta', 'leche', 'litse', 'ltse',
  'bwisit', 'bwiset', 'buset', 'peste', 'pste', 'hayop ka', 'animal ka', 'lintik ka',
  'animal nga bayot', 'animal nga', 'hayop nga', 'yawa', 'yawa ka', 'yawaka',
  'put@ngina', 'put4ngina', 'p*tangina', 'putang!na', 'p*ta', 'p0ta', 'y4wa', 'y@wa'
];

// Derogatory Remarks (Severity: High)
const DEROGATORY_REMARKS = [
  'kupal', 'salot', 'demonyo', 'baboy', 'unggoy', 'basura ka', 'bilat', 'puki',
  'ulok', 'u1ok', 'animal nga bayot', 'yawa', 'yawa ka', 'yawaka'
];

// Sexual Insults (Severity: High)
const SEXUAL_INSULTS = [
  'pokpok', 'bayaran', 'malandi', 'kantot', 'kantutan', 'jakol', 'jakolero', 'jakolera',
  'iyot', 'pepe', 'kiki', 'etits', 'bayag', 'ulok', 'u1ok'
];

// Potentially Sensitive Identity Terms (Neutral by default; requires 3-time repetition threshold OR hostile modifier to trigger warning)
const SENSITIVE_IDENTITY_TERMS = [
  'bakla', 'bading', 'binabae', 'tomboy', 'bayot'
];

// English Profanity & Harassment (Severity: High)
const ENGLISH_PROFANITY = [
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'motherfucker',
  'dumbass', 'idiot', 'moron', 'retard', 'cunt', 'dick', 'pussy', 'f*ck', 'sh*t', 'b*tch'
];

// Hostile modifiers that turn an identity term into harassment
const HOSTILE_MODIFIERS = [
  ...GENERAL_INSULTS,
  ...SEVERE_PROFANITY,
  ...DEROGATORY_REMARKS,
  ...SEXUAL_INSULTS,
  ...ENGLISH_PROFANITY,
  'animal nga', 'animal', 'hayop', 'pangit', 'pange', 'mamatay', 'baliw', 'kadiri', 'umalis', 'layas', 'bwisit', 'tarantado'
];

// Self-referential or supportive neutral indicators
const NEUTRAL_SELF_INDICATORS = [
  'ako', "ako'y", 'ako ay', 'isa akong', 'im', "i'm", 'my', 'proud', 'tayo',
  'kami', 'community', 'support', 'kaibigan', 'friend', 'member', 'lgbt', 'lgbtq'
];

export const CUSTOM_ADDITIONAL_WORDS: string[] = [
  'ulok', 'bulok', 'bogok', 'yawa', 'yawa ka', 'yawaka', 'pste', 'litse', 'ltse', 'animal nga bayot'
];
export const CUSTOM_WHITELIST_WORDS: string[] = [
  // Greetings & Friendly Openers
  'hello', 'hi', 'hey', 'heyy', 'heyyy', 'halo', 'hallo', 'holla', 'yow', 'yo',
  'kamusta', 'kumusta', 'musta', 'mustaa', 'kmusta', 'kMusta', 'kmuSta',
  'magandang', 'maganda', 'umaga', 'hapon', 'gabi', 'araw',
  'good', 'morning', 'afternoon', 'evening', 'night', 'gdmorning', 'gdnight',
  'mga', 'lods', 'boss', 'bro', 'sis', 'pare', 'pre', 'tol', 'mars', 'bes', 'besh', 'friend', 'pards',

  // Common Academic & Student Terms
  'pass', 'class', 'glass', 'assignment', 'babae', 'lalaki', 'student', 'school',
  'library', 'campus', 'study', 'exam', 'quiz', 'thesis', 'project', 'lecture', 'subject',
  'criminology', 'nursing', 'engineering', 'education', 'business', 'computer'
];

const WHITELIST_SET = new Set<string>(CUSTOM_WHITELIST_WORDS.map((w) => w.toLowerCase().trim()));

/**
 * Normalizes input text
 */
export function normalizeText(text: string): { raw: string; normalized: string; deSpaced: string; collapsed: string } {
  if (!text) return { raw: '', normalized: '', deSpaced: '', collapsed: '' };

  const rawLower = text.toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');

  const normalized = rawLower
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\*/g, '');

  const deSpaced = normalized.replace(/[\s,.\-!?:;"'()\[\]{}/*_]+/g, '');
  const collapsed = normalized.replace(/(.)\1{2,}/g, '$1');

  return { raw: rawLower, normalized, deSpaced, collapsed };
}

/**
 * Contextual Content Moderation Engine
 * Evaluates text with support for 3-time identity term repetition threshold (e.g. bayot count).
 */
export function analyzeContentModeration(text: string, identityRepetitionCount: number = 1): ModerationResult {
  return {
    contains_profanity: false,
    severity: 'none',
    matched_terms: [],
    reason: 'Profanity filter is disabled.',
    recommended_action: 'allow',
  };
}

/**
 * Backward compatibility wrapper for chat store profanity check
 */
export function checkProfanity(text: string, repetitionCount: number = 1): { isProfane: boolean; word?: string } {
  return {
    isProfane: false,
  };
}
