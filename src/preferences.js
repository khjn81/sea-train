// Browser storage is optional: privacy modes must still allow a quiet visit.
export function readPreference(key) {
  try { return globalThis.localStorage.getItem(key); }
  catch { return null; }
}

export function writePreference(key, value) {
  try { globalThis.localStorage.setItem(key, String(value)); return true; }
  catch { return false; }
}
