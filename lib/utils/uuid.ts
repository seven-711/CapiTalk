/**
 * CapiTalk Persistent UUID Visitor & Device Identification Utility
 * Generates an RFC 4122 v4 UUID for anonymous visitors & devices.
 */

export function getOrCreatePersistentUUID(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-4000-8000-000000000000';
  }

  let id = localStorage.getItem('capitalk_anon_user_id');

  // Verify it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!id || !uuidRegex.test(id)) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem('capitalk_anon_user_id', id);
    localStorage.setItem('capitalk_device_fingerprint', id);
    localStorage.setItem('capitalk_user_id', id);
  }

  return id;
}

/**
 * Retrieves all registered and used pseudonyms for this visitor UUID (1-to-Many).
 */
export function getKnownPseudonymsForUUID(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('capitalk_my_pseudonyms_v1');
    const list: string[] = raw ? JSON.parse(raw) : [];
    const current = localStorage.getItem('capitalk_user_pseudonym');
    if (current && !list.some((p) => p.toLowerCase() === current.toLowerCase())) {
      list.push(current);
    }
    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Links and records a new pseudonym to the persistent visitor UUID.
 */
export function recordPseudonymForUUID(pseudonym: string): string[] {
  if (typeof window === 'undefined') return [pseudonym];
  const clean = pseudonym.replace(/^@/, '').trim();
  if (!clean || clean.toLowerCase() === 'anon' || clean.toLowerCase() === 'anon student') {
    return getKnownPseudonymsForUUID();
  }
  const current = getKnownPseudonymsForUUID();
  if (!current.some((p) => p.toLowerCase() === clean.toLowerCase())) {
    const updated = [...current, clean];
    try {
      localStorage.setItem('capitalk_my_pseudonyms_v1', JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
}
