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

export type Variant = 'full' | 'thumb';
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

export async function putImages(photoId: string, full: Blob, thumb: Blob) {
  await run('readwrite', (s) => {
    s.put(full, key(photoId, 'full'));
    s.put(thumb, key(photoId, 'thumb'));
  });
  forget(photoId);
}

export function getImage(photoId: string, variant: Variant) {
  return run<Blob | undefined>('readonly', (s) => s.get(key(photoId, variant)));
}

export async function deleteImages(photoIds: string[]) {
  if (!photoIds.length) return;
  await run('readwrite', (s) => {
    for (const id of photoIds) {
      s.delete(key(id, 'full'));
      s.delete(key(id, 'thumb'));
    }
  });
  photoIds.forEach(forget);
}

/** Removes any stored image whose photo no longer exists. */
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
  for (const v of ['full', 'thumb'] as Variant[]) {
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

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type ImageBundle = Record<string, { full: string; thumb: string }>;

export async function exportImages(photoIds: string[]): Promise<ImageBundle> {
  const out: ImageBundle = {};
  for (const id of photoIds) {
    const [full, thumb] = await Promise.all([getImage(id, 'full'), getImage(id, 'thumb')]);
    if (full && thumb) out[id] = { full: await blobToDataUrl(full), thumb: await blobToDataUrl(thumb) };
  }
  return out;
}

export async function importImages(bundle: ImageBundle) {
  for (const [id, { full, thumb }] of Object.entries(bundle)) {
    await putImages(id, dataUrlToBlob(full), dataUrlToBlob(thumb));
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
