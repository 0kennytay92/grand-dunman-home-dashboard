import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sampleData } from './sampleData';
import type { AppData, PhotoTag, Project } from './types';
import { upgradeMeasurements } from './measurementKinds';
import { designImageIds, imageIdsInUse, itemImageIds, upgradeDesigns } from './designs';
import { totalsFor, upgradeBudget } from './budget';
import { applyRows, diffKeys, itemValue, type ItemKey, type RemoteRow } from '../cloud/changes';
import { deleteImages, exportImages, importImages, pruneImages, type ImageBundle } from './images';

// ─────────────────────────────────────────────────────────────
// THE STORE
// Holds all the app's data while it runs, and saves every change
// in this browser's own storage (localStorage) so it is still
// there next time. No database or internet needed.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'grand-dunman-home:data';
const PRE_UPGRADE_KEY = 'grand-dunman-home:budget-before-upgrade';

/** The lists the app lets you add to, edit and delete from. */
type Collections = Omit<AppData, 'version' | 'project' | 'floorPlan'>;
export type CollectionName = keyof Collections;
type ItemOf<K extends CollectionName> = Collections[K][number];

const collectionNames: CollectionName[] = ['rooms', 'measurements', 'photos', 'designs', 'budgetCategories', 'expenses', 'vendors', 'purchases', 'payments', 'documents', 'issues', 'messages', 'tasks'];

/** Checks that a file or saved value looks like our data, filling any missing lists. */
export function parseData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('This file does not contain Grand Dunman Home data.');
  const obj = raw as Partial<AppData>;
  const hasAnyList = collectionNames.some((k) => Array.isArray(obj[k]));
  if (!hasAnyList) throw new Error('This file does not contain Grand Dunman Home data.');

  const data: AppData = {
    version: 1,
    project: { ...sampleData.project, ...(obj.project ?? {}) },
    rooms: [],
    measurements: [],
    photos: [],
    designs: [],
    budgetCategories: [],
    expenses: [],
    vendors: [],
    purchases: [],
    payments: [],
    documents: [],
    issues: [],
    messages: [],
    tasks: [],
  };
  for (const k of collectionNames) {
    const list = obj[k];
    if (list !== undefined && !Array.isArray(list)) throw new Error(`"${k}" in this file is not a list.`);
    (data[k] as unknown[]) = list ?? [];
  }
  data.measurements = upgradeMeasurements(data.measurements);
  data.designs = upgradeDesigns(data.designs);
  const fp = obj.floorPlan;
  if (fp && typeof fp.imageId === 'string' && fp.pxPerMm > 0) data.floorPlan = fp;
  // Photo categories were renamed; convert ones saved by earlier versions.
  const oldTags: Record<string, PhotoTag> = { Before: 'Existing Condition', Progress: 'Renovation Progress', Inspiration: 'Design Reference' };
  data.photos = data.photos.map((p) => (oldTags[p.tag] ? { ...p, tag: oldTags[p.tag] } : p));
  data.purchases = data.purchases.map((i) => (Array.isArray(i.photoIds) ? i : { ...i, photoIds: [] }));
  data.documents = data.documents.map((x) => (Array.isArray(x.itemIds) && Array.isArray(x.paymentIds) ? x : { ...x, itemIds: x.itemIds ?? [], paymentIds: x.paymentIds ?? [] }));
  return data;
}

function load(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return parseData(JSON.parse(saved));
  } catch {
    // Unreadable or blocked storage: fall back to the sample data.
  }
  return sampleData;
}

/** A short random id. Works on phones over plain http, unlike crypto.randomUUID. */
export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface Store {
  data: AppData;
  saveError: boolean;
  upsert: <K extends CollectionName>(name: K, item: ItemOf<K>) => void;
  remove: (name: CollectionName, id: string) => void;
  /** Changes several things at once, e.g. when importing. */
  update: (change: (d: AppData) => AppData) => void;
  updateProject: (project: Project) => void;
  replaceAll: (data: AppData) => void;
  /** For online sync: hear about changes made on this device. Returns an unsubscribe function. */
  onLocalChange: (listener: (keys: ItemKey[]) => void) => () => void;
  /** For online sync: apply changes that came from another device (not sent back online). */
  applyRemote: (rows: RemoteRow[]) => void;
  /** For online sync: replace this device's data without treating it as edits. */
  replaceLocal: (data: AppData) => void;
  getData: () => AppData;
  toast: string | null;
  notify: (message: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [saveError, setSaveError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Tidy up photo files left behind (e.g. if the app closed mid-delete).
  useEffect(() => {
    pruneImages(imageIdsInUse(dataRef.current)).catch(() => {});
  }, []);

  // Online sync bookkeeping: which values came from another device (so they aren't sent back),
  // and whether the next change is a quiet replacement.
  const listeners = useRef(new Set<(keys: ItemKey[]) => void>());
  const remoteApplied = useRef(new Map<ItemKey, unknown>());
  const quietNext = useRef(false);
  const prevData = useRef(data);

  // Save after every change, and tell online sync what changed on this device.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    const prev = prevData.current;
    prevData.current = data;
    if (prev === data) return;
    const quiet = quietNext.current;
    quietNext.current = false;
    const fromRemote = remoteApplied.current;
    remoteApplied.current = new Map();
    if (quiet) return;
    const local = diffKeys(prev, data).filter((k) => !(fromRemote.has(k) && fromRemote.get(k) === itemValue(data, k)));
    if (local.length) listeners.current.forEach((fn) => fn(local));
  }, [data]);

  // Bring older budget data up to date (runs again if old records arrive from another device).
  // The upgraded records are normal changes, so they are saved and synced like any edit.
  useEffect(() => {
    const upgraded = upgradeBudget(data);
    if (upgraded === data) return;
    try {
      if (data.expenses.some((e) => !e.migrated) && !localStorage.getItem(PRE_UPGRADE_KEY)) {
        const { budgetCategories, expenses, rooms } = data;
        localStorage.setItem(PRE_UPGRADE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), budgetCategories, expenses, roomBudgets: rooms.map((r) => ({ id: r.id, budget: r.budget })) }));
      }
    } catch {
      // The originals are kept in the data anyway.
    }
    setData(upgraded);
  }, [data]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const upsert = useCallback(<K extends CollectionName>(name: K, item: ItemOf<K>) => {
    setData((d) => {
      const list = d[name] as ItemOf<K>[];
      const exists = list.some((x) => x.id === item.id);
      const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
      return { ...d, [name]: next };
    });
  }, []);

  const remove = useCallback((name: CollectionName, id: string) => {
    // Photo files are stored separately, so delete those too.
    const d0 = dataRef.current;
    const imageIds =
      name === 'photos' ? [id]
      : name === 'designs' ? d0.designs.filter((x) => x.id === id).flatMap(designImageIds)
      : name === 'rooms' ? [...d0.photos.filter((p) => p.roomId === id).map((p) => p.id), ...d0.designs.filter((x) => x.roomId === id).flatMap(designImageIds)]
      : name === 'purchases' ? [...d0.purchases.filter((x) => x.id === id).flatMap(itemImageIds), ...d0.issues.filter((x) => x.itemId === id).flatMap((x) => x.photoIds)]
      : name === 'documents' ? [id]
      : name === 'issues' ? d0.issues.find((x) => x.id === id)?.photoIds ?? []
      : name === 'messages' ? d0.messages.find((x) => x.id === id)?.photoIds ?? []
      : name === 'vendors' ? d0.messages.filter((x) => x.vendorId === id).flatMap((x) => x.photoIds)
      : [];
    deleteImages(imageIds, { cloud: true }).catch(() => {});

    setData((d) => {
      const next = { ...d, [name]: (d[name] as { id: string }[]).filter((x) => x.id !== id) };
      if (name === 'photos') {
        // Measurements shown on the photo stay in the room; they just lose their label position.
        next.measurements = d.measurements.map((m) => (m.pin?.photoId === id ? { ...m, pin: undefined } : m));
      }
      if (name === 'rooms') {
        // A deleted room takes its measurements, photos and designs with it.
        next.measurements = d.measurements.filter((m) => m.roomId !== id);
        next.photos = d.photos.filter((p) => p.roomId !== id);
        next.designs = d.designs.filter((x) => x.roomId !== id);
        next.tasks = d.tasks.map((t) => (t.roomId === id ? { ...t, roomId: undefined } : t));
        next.expenses = d.expenses.map((x) => (x.roomId === id ? { ...x, roomId: undefined } : x)); // payments are kept
        // Items and payments are kept too, as "whole home".
        next.purchases = d.purchases.map((x) => (x.roomId === id ? { ...x, roomId: undefined } : x));
        next.payments = d.payments.map((x) => (x.roomId === id ? { ...x, roomId: undefined } : x));
      }
      if (name === 'purchases') {
        // Payments are money records: they stay, just no longer linked to the item.
        const item = d.purchases.find((x) => x.id === id);
        next.payments = d.payments.map((p) => (p.itemId === id ? { ...p, itemId: undefined, roomId: p.roomId ?? item?.roomId, categoryId: p.categoryId ?? item?.categoryId, description: p.description || item?.name } : p));
        // Documents are kept too (an invoice may cover other items).
        next.documents = d.documents.map((x) => (x.itemIds.includes(id) ? { ...x, itemIds: x.itemIds.filter((i) => i !== id) } : x));
        // The item's issues go with it; messages stay with the vendor.
        next.issues = d.issues.filter((x) => x.itemId !== id);
        next.messages = d.messages.map((x) => (x.itemIds.includes(id) ? { ...x, itemIds: x.itemIds.filter((i) => i !== id) } : x));
      }
      if (name === 'issues') {
        next.documents = d.documents.map((x) => (x.issueIds?.includes(id) ? { ...x, issueIds: x.issueIds.filter((i) => i !== id) } : x));
      }
      if (name === 'payments') {
        next.documents = d.documents.map((x) => (x.paymentIds.includes(id) ? { ...x, paymentIds: x.paymentIds.filter((i) => i !== id) } : x));
      }
      if (name === 'vendors') {
        next.purchases = d.purchases.map((x) => (x.vendorId === id ? { ...x, vendorId: undefined } : x));
        next.payments = d.payments.map((x) => (x.vendorId === id ? { ...x, vendorId: undefined } : x));
        next.documents = d.documents.map((x) => (x.vendorId === id ? { ...x, vendorId: undefined } : x));
        next.messages = d.messages.filter((x) => x.vendorId !== id); // messages belong to the vendor
      }
      return next;
    });
  }, []);

  const update = useCallback((change: (d: AppData) => AppData) => setData(change), []);
  const updateProject = useCallback((project: Project) => setData((d) => ({ ...d, project })), []);
  const replaceAll = useCallback((next: AppData) => {
    setData(next);
    pruneImages(imageIdsInUse(next)).catch(() => {});
  }, []);

  const onLocalChange = useCallback((listener: (keys: ItemKey[]) => void) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  const applyRemote = useCallback((rows: RemoteRow[]) => {
    if (!rows.length) return;
    // Pictures of photos/designs deleted on another device are removed here too (this device only).
    const before = dataRef.current;
    const gone = rows.filter((r) => r.deleted);
    const imageIds = [
      ...gone.filter((r) => r.collection === 'photos').map((r) => r.id),
      ...gone.filter((r) => r.collection === 'purchases').flatMap((r) => before.purchases.filter((x) => x.id === r.id).flatMap(itemImageIds)),
      ...gone.filter((r) => r.collection === 'documents').map((r) => r.id),
      ...gone.filter((r) => r.collection === 'issues').flatMap((r) => before.issues.find((x) => x.id === r.id)?.photoIds ?? []),
      ...gone.filter((r) => r.collection === 'messages').flatMap((r) => before.messages.find((x) => x.id === r.id)?.photoIds ?? []),
      ...gone.filter((r) => r.collection === 'designs').flatMap((r) => {
        const d = before.designs.find((x) => x.id === r.id);
        return d ? designImageIds(d) : [];
      }),
    ];
    if (imageIds.length) deleteImages(imageIds).catch(() => {});
    setData((d) => {
      const { next, applied } = applyRows(d, rows);
      applied.forEach((v, k) => remoteApplied.current.set(k, v));
      return next;
    });
  }, []);

  const replaceLocal = useCallback((next: AppData) => {
    quietNext.current = true;
    setData(next);
    pruneImages(imageIdsInUse(next)).catch(() => {});
  }, []);

  const getData = useCallback(() => dataRef.current, []);

  const value = useMemo(
    () => ({ data, saveError, upsert, remove, update, updateProject, replaceAll, onLocalChange, applyRemote, replaceLocal, getData, toast, notify }),
    [data, saveError, upsert, remove, update, updateProject, replaceAll, onLocalChange, applyRemote, replaceLocal, getData, toast, notify],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

// ── Handy lookups ────────────────────────────────────────────

export function useRoomName() {
  const { rooms } = useStore().data;
  return useCallback(
    (roomId?: string) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return 'Whole home';
      return room.includes ? `${room.name} & ${room.includes}` : room.name;
    },
    [rooms],
  );
}

export function useBudgetTotals() {
  const { purchases, payments } = useStore().data;
  return useMemo(() => totalsFor(purchases, payments), [purchases, payments]);
}

// ── Backup helpers ───────────────────────────────────────────

interface BackupFile extends AppData {
  images?: ImageBundle;
}

/** Saves everything, photos included, as one .json file. */
export async function downloadBackup(data: AppData) {
  const images = await exportImages(imageIdsInUse(data));
  const backup: BackupFile = { ...data, images };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grand-dunman-home-backup-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads a backup file and restores its photos. Returns the data to load. */
export async function readBackup(text: string): Promise<AppData> {
  const raw = JSON.parse(text) as BackupFile;
  const data = parseData(raw);
  if (raw.images && typeof raw.images === 'object') await importImages(raw.images);
  // Photos whose file isn't in the backup fall back to a placeholder.
  const restored = new Set(Object.keys(raw.images ?? {}));
  data.photos = data.photos.map((p) => (p.hasImage && !restored.has(p.id) ? { ...p, hasImage: false } : p));
  if (data.floorPlan && !restored.has(data.floorPlan.imageId)) data.floorPlan = undefined;
  data.designs = data.designs.map((d) => ({
    ...d,
    hasImage: d.hasImage && restored.has(d.id),
    referenceIds: d.referenceIds.filter((r) => restored.has(r)),
  }));
  data.purchases = data.purchases.map((i) => {
    const photoIds = i.photoIds.filter((r) => restored.has(r));
    const videoIds = i.videoIds?.filter((r) => restored.has(r));
    return { ...i, photoIds, videoIds, coverId: i.coverId && photoIds.includes(i.coverId) ? i.coverId : undefined };
  });
  const keep = (ids: string[]) => ids.filter((r) => restored.has(r));
  data.purchases = data.purchases.map((i) => ({
    ...i,
    ...(i.deliveryInspection ? { deliveryInspection: { ...i.deliveryInspection, photoIds: keep(i.deliveryInspection.photoIds) } } : {}),
    ...(i.installationInspection ? { installationInspection: { ...i.installationInspection, photoIds: keep(i.installationInspection.photoIds) } } : {}),
  }));
  data.issues = data.issues.map((x) => ({ ...x, photoIds: keep(x.photoIds) }));
  data.messages = data.messages.map((x) => ({ ...x, photoIds: keep(x.photoIds) }));
  // Documents whose file isn't in the backup are kept (their details are still useful); they show as "file missing".
  return data;
}

/** A clean slate: keeps the room list and budget categories, clears everything else (vendors included). */
export function blankData(current: AppData): AppData {
  return {
    ...current,
    rooms: current.rooms.map((r) => ({ ...r, areaSqm: 0, status: 'Not started', progress: 0, notes: '' })),
    budgetCategories: current.budgetCategories.map((c) => ({ ...c, budget: 0 })),
    measurements: [],
    photos: [],
    designs: [],
    expenses: [],
    vendors: [],
    purchases: [],
    payments: [],
    documents: [],
    issues: [],
    messages: [],
    tasks: [],
  };
}

/** Today's date as YYYY-MM-DD in local (Singapore) time. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
