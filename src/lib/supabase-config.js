// Public browser configuration only. Never include credential values in errors.
export function readSupabaseConfig(env = {}) {
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const invalid = reason => ({ status: 'invalid', reason });
  if (Object.entries(env).some(([name, value]) => /^VITE_.*(?:SERVICE_ROLE|PASSWORD|SECRET)/i.test(name) && value)) {
    return invalid('unsafe-key');
  }
  if (!url && !key) return { status: 'demo' };
  // Check the key even when the URL is missing, so builds never embed a secret key.
  if (key && !isPublicKey(key)) return invalid('unsafe-key');
  if (!url || !key) return { status: 'incomplete' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['','/'].includes(parsed.pathname)) return invalid('url');
    return { status: 'configured', url: parsed.origin, key };
  } catch { return invalid('url'); }
}
function isPublicKey(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // Legacy anon JWTs are accepted only for the anon role. This is format/role
  // screening, not cryptographic authentication; the server validates the key.
  try {
    const parts = key.split('.');
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return false;
    return JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/'))).role === 'anon';
  } catch { return false; }
}
