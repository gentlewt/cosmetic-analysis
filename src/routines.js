export const FREQUENCIES = ['매일', '격일', '주 2~3회', '주 1회', '필요할 때'];
export const PERIODS = { morning: '아침', evening: '저녁' };
export const emptyRoutine = () => ({ morning: [], evening: [] });
export const clone = value => JSON.parse(JSON.stringify(value));
export function addItem(routine, period, productId) {
  const next = clone(routine);
  if (!next[period].some(i => i.productId === productId)) {
    next[period].push({ productId, productVersionId: `${productId}-demo-v1`, frequency: FREQUENCIES[0] });
  }
  return next;
}
export function moveItem(routine, period, from, to) {
  const next = clone(routine), items = next[period];
  if (from >= 0 && from < items.length && to >= 0 && to < items.length) {
    items.splice(to, 0, items.splice(from, 1)[0]);
  }
  return next;
}
export function confirmVersion(versions, draft, now = new Date().toISOString()) {
  const previous = versions.at(-1);
  return [...versions, { id: crypto.randomUUID(), version: (previous?.version || 0) + 1,
    confirmedAt: now, previousVersionId: previous?.id || null, items: clone(draft) }];
}
export const GUEST_KEY = 'cosmetic-guest-v1';
export const MAX_IDLE = 30 * 24 * 60 * 60 * 1000;
export function readGuest(storage, productIds, now = Date.now()) {
  const raw = storage.getItem(GUEST_KEY);
  if (!raw) return { versions: [], favorites: [] };
  const data = JSON.parse(raw);
  if (!Number.isFinite(data.lastUsedAt) || now - data.lastUsedAt >= MAX_IDLE) {
    storage.removeItem(GUEST_KEY);
    return { versions: [], favorites: [] };
  }
  if (!Array.isArray(data.versions) || !Array.isArray(data.favorites)) throw new Error('invalid guest data');
  for (const v of data.versions) {
    if (!v || typeof v.id !== 'string' || !Number.isInteger(v.version) || typeof v.confirmedAt !== 'string') throw new Error('invalid version');
    for (const period of Object.keys(PERIODS)) {
      const items = v.items?.[period];
      if (!Array.isArray(items) || new Set(items.map(i => i?.productId)).size !== items.length ||
          items.some(i => !i || !productIds.includes(i.productId) || typeof i.productVersionId !== 'string' || !FREQUENCIES.includes(i.frequency))) throw new Error('invalid routine');
    }
  }
  if (data.favorites.some(f => !f || !productIds.includes(f.productId) || typeof f.memo !== 'string')) throw new Error('invalid favorite');
  return { versions: data.versions, favorites: data.favorites };
}
export function writeGuest(storage, data, now = Date.now()) {
  storage.setItem(GUEST_KEY, JSON.stringify({ ...data, lastUsedAt: now }));
}
export function toggleComparison(ids, id) {
  return ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 4 ? [...ids, id] : ids;
}
