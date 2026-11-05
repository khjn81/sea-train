// Browser storage is optional: privacy modes must still allow a quiet visit.
export function readPreference(key) {
  try { return globalThis.localStorage.getItem(key); }
  catch { return null; }
}

export function writePreference(key, value) {
  try { globalThis.localStorage.setItem(key, String(value)); return true; }
  catch { return false; }
}

export function readVolumePercent() {
  const raw = readPreference('sea:volume');
  if (raw === null || raw.trim() === '') return 45;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 45;
}
