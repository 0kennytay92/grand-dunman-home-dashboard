import type { AppData } from '../data/types';

// ─────────────────────────────────────────────────────────────
// ITEMS
// Online, every room, measurement, photo, design, vendor, item, payment and task
// is its own row ("items" table), plus two settings rows. That way a
// change on one device only touches that one thing, and edits made
// on different devices merge instead of overwriting each other.
// ─────────────────────────────────────────────────────────────

export const listNames = ['rooms', 'measurements', 'photos', 'designs', 'budgetCategories', 'expenses', 'vendors', 'purchases', 'payments', 'documents', 'issues', 'messages', 'notes', 'tasks'] as const;
export type ListName = (typeof listNames)[number];
const metaIds = ['project', 'floorPlan'] as const;

/** e.g. "photos:abc123" or "meta:project" */
export type ItemKey = string;
export const itemKey = (collection: string, id: string) => `${collection}:${id}`;
export function splitKey(key: ItemKey) {
  const i = key.indexOf(':');
  return { collection: key.slice(0, i), id: key.slice(i + 1) };
}

/** The current value of one item, or undefined if it doesn't exist. */
export function itemValue(data: AppData, key: ItemKey): unknown {
  const { collection, id } = splitKey(key);
  if (collection === 'meta') return id === 'project' ? data.project : id === 'floorPlan' ? data.floorPlan : undefined;
  const list = data[collection as ListName] as { id: string }[] | undefined;
  return list?.find((x) => x.id === id);
}

/** Every item key in the data. */
export function allKeys(data: AppData): ItemKey[] {
  const keys: ItemKey[] = [];
  for (const name of listNames) for (const x of data[name] as { id: string }[]) keys.push(itemKey(name, x.id));
  for (const id of metaIds) if (itemValue(data, itemKey('meta', id)) !== undefined) keys.push(itemKey('meta', id));
  return keys;
}

/** Which items were added, changed or removed between two versions (compares by reference, so it's fast). */
export function diffKeys(prev: AppData, next: AppData): ItemKey[] {
  const changed: ItemKey[] = [];
  for (const name of listNames) {
    const a = prev[name] as { id: string }[];
    const b = next[name] as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, x]));
    for (const x of b) {
      if (before.get(x.id) !== x) changed.push(itemKey(name, x.id));
      before.delete(x.id);
    }
    for (const id of before.keys()) changed.push(itemKey(name, id));
  }
  if (prev.project !== next.project) changed.push(itemKey('meta', 'project'));
  if (prev.floorPlan !== next.floorPlan) changed.push(itemKey('meta', 'floorPlan'));
  return changed;
}

export interface RemoteRow {
  collection: string;
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}

/** Applies rows from the online copy. Returns the new data and exactly which values were put in. */
export function applyRows(data: AppData, rows: RemoteRow[]) {
  const next: AppData = { ...data };
  const applied = new Map<ItemKey, unknown>();
  const lists = new Map<ListName, Map<string, unknown>>();

  for (const row of rows) {
    const key = itemKey(row.collection, row.id);
    const value = row.deleted ? undefined : row.data;
    if (row.collection === 'meta') {
      if (row.id === 'project' && value) next.project = value as AppData['project'];
      if (row.id === 'floorPlan') next.floorPlan = value as AppData['floorPlan'];
      applied.set(key, row.id === 'project' ? next.project : next.floorPlan);
      continue;
    }
    if (!(listNames as readonly string[]).includes(row.collection)) continue; // from a newer version of the app
    const name = row.collection as ListName;
    if (!lists.has(name)) lists.set(name, new Map((next[name] as { id: string }[]).map((x) => [x.id, x])));
    const map = lists.get(name)!;
    if (value === undefined) map.delete(row.id);
    else map.set(row.id, value);
    applied.set(key, value);
  }
  for (const [name, map] of lists) (next[name] as unknown[]) = [...map.values()];
  return { next, applied };
}
