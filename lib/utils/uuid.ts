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
