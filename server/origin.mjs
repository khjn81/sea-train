// This is a browser cross-origin guard, not user authentication.
export function allowsOrigin(origin, host, additional = process.env.ALLOWED_ORIGINS || '') {
  if (!origin) return true; // Non-browser protocol clients remain supported.
  try {
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(source.protocol)) return false;
    if (source.host === host) return true;
    return additional.split(',').filter(Boolean).some(value => new URL(value.trim()).origin === source.origin);
  } catch { return false; }
}
