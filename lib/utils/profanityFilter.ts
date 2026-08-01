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
export const CUSTOM_WHITELIST_WORDS: string[] = ['pass', 'class', 'glass', 'assignment', 'hello'];

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
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      contains_profanity: false,
      severity: 'none',
      matched_terms: [],
      reason: 'Empty or valid clean text.',
      recommended_action: 'allow',
    };
  }

  const { normalized, deSpaced, collapsed } = normalizeText(text);
  const words = normalized.split(/[\s,.\-!?:;"'()\[\]{}/*_]+/).filter(Boolean);

  // 1. Check for explicit profanity & compound slurs
  const explicitMatchedTerms = new Set<string>();
  let highestSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';

  const EXPLICIT_PROFANITY_LIST = [
    ...SEVERE_PROFANITY.map((t) => ({ term: t, severity: 'high' as const })),
    ...SEXUAL_INSULTS.map((t) => ({ term: t, severity: 'high' as const })),
    ...DEROGATORY_REMARKS.map((t) => ({ term: t, severity: 'high' as const })),
    ...ENGLISH_PROFANITY.map((t) => ({ term: t, severity: 'high' as const })),
    ...GENERAL_INSULTS.map((t) => ({ term: t, severity: 'medium' as const })),
    ...profaneWords.map((t) => ({ term: t, severity: 'medium' as const })),
    ...CUSTOM_ADDITIONAL_WORDS.map((t) => ({ term: t, severity: 'high' as const })),
  ];

  for (const item of EXPLICIT_PROFANITY_LIST) {
    const term = item.term.toLowerCase();
    if (WHITELIST_SET.has(term)) continue;

    const termDeSpaced = term.replace(/\s+/g, '');

    if (
      words.includes(term) ||
      normalized.includes(term) ||
      (termDeSpaced.length >= 3 && (deSpaced.includes(termDeSpaced) || collapsed.includes(term)))
    ) {
      explicitMatchedTerms.add(term);
      if (item.severity === 'high') highestSeverity = 'high';
      else if (item.severity === 'medium' && highestSeverity !== 'high') highestSeverity = 'medium';
    }
  }

  // 2. Check for Sensitive Identity Terms (bayot, bakla, etc.)
  const matchedIdentityTerms = new Set<string>();
  for (const term of SENSITIVE_IDENTITY_TERMS) {
    if (words.includes(term) || deSpaced.includes(term) || normalized.includes(term)) {
      matchedIdentityTerms.add(term);
    }
  }

  // 3. CONTEXTUAL & REPETITION DISAMBIGUATION
  if (matchedIdentityTerms.size > 0 && explicitMatchedTerms.size === 0) {
    const hasHostileModifier = HOSTILE_MODIFIERS.some((mod) => normalized.includes(mod) || deSpaced.includes(mod));
    const hasNeutralSelfIndicator = NEUTRAL_SELF_INDICATORS.some((ind) => normalized.includes(ind));

    // If identity term is repeated 3+ times in chat -> TRIGGER WARNING (3-repetition threshold requirement)
    if (identityRepetitionCount >= 3) {
      return {
        contains_profanity: true,
        severity: 'medium',
        matched_terms: Array.from(matchedIdentityTerms),
        reason: `Repeated use of identity term (${Array.from(matchedIdentityTerms).join(', ')}) 3 times in chatroom.`,
        recommended_action: 'warn',
        is_identity_term_only: true,
      };
    }

    // Single or 2nd time without hostile modifiers -> ALLOW (neutral/identity use)
    if (!hasHostileModifier || hasNeutralSelfIndicator) {
      return {
        contains_profanity: false,
        severity: 'none',
        matched_terms: Array.from(matchedIdentityTerms),
        reason: `Identity term (${Array.from(matchedIdentityTerms).join(', ')}) used neutrally (Count: ${identityRepetitionCount}/3).`,
        recommended_action: 'allow',
        is_identity_term_only: true,
      };
    } else {
      // Used with hostile modifiers -> Flag immediately as harassment
      return {
        contains_profanity: true,
        severity: 'medium',
        matched_terms: Array.from(matchedIdentityTerms),
        reason: `Identity term used in an abusive/harassing context: ${Array.from(matchedIdentityTerms).join(', ')}.`,
        recommended_action: 'warn',
        is_identity_term_only: true,
      };
    }
  }

  const allMatched = Array.from(new Set([...explicitMatchedTerms, ...matchedIdentityTerms]));

  if (allMatched.length === 0) {
    return {
      contains_profanity: false,
      severity: 'none',
      matched_terms: [],
      reason: 'No profane, abusive, or harmful terms detected.',
      recommended_action: 'allow',
    };
  }

  const recommended_action = highestSeverity === 'high' ? (allMatched.length >= 2 ? 'block' : 'warn') : 'warn';

  return {
    contains_profanity: true,
    severity: highestSeverity,
    matched_terms: allMatched,
    reason: `Detected profanity, insults, or harassment: ${allMatched.join(', ')}.`,
    recommended_action,
  };
}

/**
 * Backward compatibility wrapper for chat store profanity check
 */
export function checkProfanity(text: string, repetitionCount: number = 1): { isProfane: boolean; word?: string } {
  const result = analyzeContentModeration(text, repetitionCount);
  return {
    isProfane: result.contains_profanity,
    word: result.matched_terms[0],
  };
}
