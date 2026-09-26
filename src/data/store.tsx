import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sampleData } from './sampleData';
import type { AppData, PhotoTag, Project } from './types';
import { upgradeMeasurements } from './measurementKinds';
import { deleteImages, exportImages, importImages, pruneImages, type ImageBundle } from './images';

// ─────────────────────────────────────────────────────────────
// THE STORE
// Holds all the app's data while it runs, and saves every change
// in this browser's own storage (localStorage) so it is still
// there next time. No database or internet needed.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'grand-dunman-home:data';

/** The lists the app lets you add to, edit and delete from. */
type Collections = Omit<AppData, 'version' | 'project'>;
export type CollectionName = keyof Collections;
type ItemOf<K extends CollectionName> = Collections[K][number];

const collectionNames: CollectionName[] = ['rooms', 'measurements', 'photos', 'designs', 'budgetCategories', 'expenses', 'tasks'];

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
    tasks: [],
  };
  for (const k of collectionNames) {
    const list = obj[k];
    if (list !== undefined && !Array.isArray(list)) throw new Error(`"${k}" in this file is not a list.`);
    (data[k] as unknown[]) = list ?? [];
  }
  data.measurements = upgradeMeasurements(data.measurements);
  // Photo categories were renamed; convert ones saved by earlier versions.
  const oldTags: Record<string, PhotoTag> = { Before: 'Existing Condition', Progress: 'Renovation Progress', Inspiration: 'Design Reference' };
  data.photos = data.photos.map((p) => (oldTags[p.tag] ? { ...p, tag: oldTags[p.tag] } : p));
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
  updateProject: (project: Project) => void;
  replaceAll: (data: AppData) => void;
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
    pruneImages(dataRef.current.photos.map((p) => p.id)).catch(() => {});
  }, []);

  // Save after every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
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
    const photoIds =
      name === 'photos' ? [id] : name === 'rooms' ? dataRef.current.photos.filter((p) => p.roomId === id).map((p) => p.id) : [];
    deleteImages(photoIds).catch(() => {});

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

      }
      return next;
    });
  }, []);

  const updateProject = useCallback((project: Project) => setData((d) => ({ ...d, project })), []);
  const replaceAll = useCallback((next: AppData) => {
    setData(next);
    pruneImages(next.photos.map((p) => p.id)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ data, saveError, upsert, remove, updateProject, replaceAll, toast, notify }),
    [data, saveError, upsert, remove, updateProject, replaceAll, toast, notify],
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
  const { budgetCategories, expenses } = useStore().data;
  return useMemo(() => {
    const spentBy = (categoryId: string) => expenses.filter((e) => e.categoryId === categoryId).reduce((s, e) => s + e.amount, 0);
    const totalBudget = budgetCategories.reduce((s, c) => s + c.budget, 0);
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    return { spentBy, totalBudget, totalSpent, pct: totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0 };
  }, [budgetCategories, expenses]);
}

// ── Backup helpers ───────────────────────────────────────────

interface BackupFile extends AppData {
  images?: ImageBundle;
}

/** Saves everything, photos included, as one .json file. */
export async function downloadBackup(data: AppData) {
  const images = await exportImages(data.photos.filter((p) => p.hasImage).map((p) => p.id));
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
  return data;
}

/** A clean slate: keeps the room list and budget categories, clears everything else. */
export function blankData(current: AppData): AppData {
  return {
    ...current,
    rooms: current.rooms.map((r) => ({ ...r, areaSqm: 0, status: 'Not started', progress: 0, notes: '' })),
    budgetCategories: current.budgetCategories.map((c) => ({ ...c, budget: 0 })),
    measurements: [],
    photos: [],
    designs: [],
    expenses: [],
    tasks: [],
  };
}

/** Today's date as YYYY-MM-DD in local (Singapore) time. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
