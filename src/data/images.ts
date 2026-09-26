import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// PHOTO STORAGE
// Photo files are too big for localStorage, so they live in the
// browser's built-in file store (IndexedDB) on this device.
// Each photo is saved twice: a full-size copy (max 1920 px) and
// a small thumbnail for fast-loading grids.
// ─────────────────────────────────────────────────────────────

const DB_NAME = 'grand-dunman-home';
const STORE = 'images';

/** full/thumb: resized pictures. original: an uploaded file kept exactly as it was (documents, videos). */
export type Variant = 'full' | 'thumb' | 'original';
const variants: Variant[] = ['full', 'thumb', 'original'];
const key = (photoId: string, variant: Variant) => `${photoId}:${variant}`;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage aborted'));
  });
}

// ── Online sync hooks ────────────────────────────────────────
// When online sync is on, it listens here so new pictures get uploaded
// and deletions are passed on, and it can fetch pictures this device
// doesn't have yet.

type ImageEvents = {
  onPut?: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  fetchRemote?: (id: string, variant: Variant) => Promise<Blob | undefined>;
};
let cloud: ImageEvents = {};
export function connectImageSync(events: ImageEvents) {
  cloud = events;
  return () => {
    if (cloud === events) cloud = {};
  };
}

/** Saves a picture. `fromCloud` means it was just downloaded, so it isn't uploaded again. */
export async function putImages(photoId: string, full: Blob, thumb: Blob, opts: { fromCloud?: boolean } = {}) {
  await run('readwrite', (s) => {
    s.put(full, key(photoId, 'full'));
    s.put(thumb, key(photoId, 'thumb'));
  });
  forget(photoId);
  if (!opts.fromCloud) cloud.onPut?.(photoId);
}

/** Saves an uploaded file exactly as it is, with an optional small preview picture. */
export async function putFile(id: string, original: Blob, thumb?: Blob, opts: { fromCloud?: boolean } = {}) {
  await run('readwrite', (s) => {
    s.put(original, key(id, 'original'));
    if (thumb) s.put(thumb, key(id, 'thumb'));
  });
  forget(id);
  if (!opts.fromCloud) cloud.onPut?.(id);
}

/** The largest file that can be added (the online storage accepts up to 50 MB per file). */
export const MAX_FILE_MB = 50;

/** Only what's stored on this device. */
export function getLocalImage(photoId: string, variant: Variant) {
  return run<Blob | undefined>('readonly', (s) => s.get(key(photoId, variant)));
}

/** A stored picture; fetched from the online copy (and kept) if this device doesn't have it yet. */
export async function getImage(photoId: string, variant: Variant) {
  const local = await getLocalImage(photoId, variant);
  if (local || !cloud.fetchRemote) return local;
  const remote = await cloud.fetchRemote(photoId, variant).catch(() => undefined);
  if (remote) await run('readwrite', (s) => void s.put(remote, key(photoId, variant)));
  return remote;
}

/**
 * Deletes pictures from this device. `cloud: true` also removes the online copy
 * (used when you delete a photo or design; not for tidying up).
 */
export async function deleteImages(photoIds: string[], opts: { cloud?: boolean } = {}) {
  if (!photoIds.length) return;
  await run('readwrite', (s) => {
    for (const id of photoIds) for (const v of variants) s.delete(key(id, v));
  });
  photoIds.forEach(forget);
  if (opts.cloud) cloud.onDelete?.(photoIds);
}

/** Removes any stored image whose photo no longer exists (this device only). */
export async function pruneImages(keepPhotoIds: string[]) {
  const keep = new Set(keepPhotoIds);
  const keys = (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) as string[];
  const orphans = [...new Set(keys.map((k) => k.split(':')[0]))].filter((id) => !keep.has(id));
  await deleteImages(orphans);
}

// ── Shrinking photos before saving ───────────────────────────

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be read as a photo.'));
    };
    img.src = url;
  });
}

function resize(img: HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Photo processing is not supported on this browser.'));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The photo could not be saved.'))), 'image/jpeg', quality),
  );
}

/** Turns a camera photo (often 3–8 MB) into a ~300 KB copy plus a tiny thumbnail. */
export async function processPhoto(file: Blob) {
  const img = await loadImage(file);
  const full = await resize(img, 1920, 0.82);
  const thumb = await resize(img, 480, 0.75);
  return { full, thumb };
}

// ── Showing photos ───────────────────────────────────────────

const urlCache = new Map<string, string>();

function forget(photoId: string) {
  for (const v of variants) {
    const k = key(photoId, v);
    const url = urlCache.get(k);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(k);
  }
}

/** Web address for a stored photo, or null while loading / if missing. */
export function useImageUrl(photoId: string, variant: Variant, enabled = true) {
  const k = key(photoId, variant);
  const [url, setUrl] = useState<string | null>(() => urlCache.get(k) ?? null);

  useEffect(() => {
    if (!enabled) return;
    const cached = urlCache.get(k);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    getImage(photoId, variant)
      .then((blob) => {
        if (!alive || !blob) return;
        const u = URL.createObjectURL(blob);
        urlCache.set(k, u);
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [k, photoId, variant, enabled]);

  return enabled ? url : null;
}

// ── Backups ──────────────────────────────────────────────────

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type ImageBundle = Record<string, { full?: string; thumb?: string; original?: string }>;

export async function exportImages(photoIds: string[]): Promise<ImageBundle> {
  const out: ImageBundle = {};
  for (const id of photoIds) {
    const [full, thumb, original] = await Promise.all(variants.map((v) => getImage(id, v)));
    if (full && thumb) out[id] = { full: await blobToDataUrl(full), thumb: await blobToDataUrl(thumb) };
    else if (original) out[id] = { original: await blobToDataUrl(original), ...(thumb ? { thumb: await blobToDataUrl(thumb) } : {}) };
  }
  return out;
}

export async function importImages(bundle: ImageBundle) {
  for (const [id, { full, thumb, original }] of Object.entries(bundle)) {
    if (full && thumb) await putImages(id, dataUrlToBlob(full), dataUrlToBlob(thumb));
    else if (original) await putFile(id, dataUrlToBlob(original), thumb ? dataUrlToBlob(thumb) : undefined);
  }
}

// ── Device storage ───────────────────────────────────────────

/** Asks the browser not to clear our storage when space runs low. */
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

export async function storageUsedMb() {
  const est = await navigator.storage?.estimate?.();
  return est?.usage !== undefined ? est.usage / 1_048_576 : null;
}
