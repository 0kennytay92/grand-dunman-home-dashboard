import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getLocalImage, type Variant } from '../data/images';
import type { AppData } from '../data/types';
import { IMAGE_BUCKET, imagePath } from './client';
import { itemValue, splitKey, type ItemKey, type RemoteRow } from './changes';

// ─────────────────────────────────────────────────────────────
// SYNC ENGINE
// Keeps this device and the online copy of one home in step.
//
//  • Changes made here go into an "outbox" (saved on the device),
//    and are uploaded a moment later – or when you're back online.
//  • Changes made elsewhere arrive live (Supabase Realtime), and are
//    also checked for when the app regains focus and every minute.
//  • If something changed both here and online before syncing, the
//    change made here wins once it's uploaded.
// ─────────────────────────────────────────────────────────────

export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error';

interface SyncState {
  cursor: string | null; // newest online change already applied here
  outbox: Record<ItemKey, number>; // item → edit counter (so an edit made mid-upload isn't lost)
  uploads: string[]; // pictures and files to upload
  deletes: string[]; // pictures and files to delete online
  seen: Record<ItemKey, string>; // item → online timestamp already applied
}

export interface SyncSnapshot {
  status: SyncStatus;
  pending: number;
  lastSynced: Date | null;
  error: string | null;
}

interface LocalSide {
  getData: () => AppData;
  applyRemote: (rows: RemoteRow[]) => void;
}

const PAGE = 500;
const OVERLAP_MS = 5000; // re-check a few seconds back, in case a slow save landed out of order

export class SyncEngine {
  private state: SyncState;
  private channel: RealtimeChannel | null = null;
  private timers: number[] = [];
  private pushTimer: number | undefined;
  private pullTimer: number | undefined;
  private running = false;
  private busy: Promise<void> = Promise.resolve();
  private snapshot: SyncSnapshot = { status: 'syncing', pending: 0, lastSynced: null, error: null };
  private listeners = new Set<(s: SyncSnapshot) => void>();

  constructor(
    private client: SupabaseClient,
    readonly homeId: string,
    private local: LocalSide,
  ) {
    this.state = this.load();
    this.snapshot.pending = this.pendingCount();
  }

  // ── Saved state ────────────────────────────────────────────

  private get storageKey() {
    return `grand-dunman-home:sync:${this.homeId}`;
  }
  private load(): SyncState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return { cursor: null, outbox: {}, uploads: [], deletes: [], seen: {}, ...JSON.parse(raw) };
    } catch {
      // start fresh
    }
    return { cursor: null, outbox: {}, uploads: [], deletes: [], seen: {} };
  }
  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // storage full: the outbox stays in memory until the next save succeeds
    }
  }
  /** Forget everything about this home on this device (used before a fresh download). */
  static reset(homeId: string) {
    try {
      localStorage.removeItem(`grand-dunman-home:sync:${homeId}`);
    } catch {
      // ignore
    }
  }

  // ── Status for the screen ──────────────────────────────────

  subscribe(fn: (s: SyncSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => void this.listeners.delete(fn);
  }
  private set(patch: Partial<SyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch, pending: this.pendingCount() };
    this.listeners.forEach((fn) => fn(this.snapshot));
  }
  private pendingCount() {
    return Object.keys(this.state.outbox).length + this.state.uploads.length + this.state.deletes.length;
  }

  // ── Recording changes made on this device ──────────────────

  markChanged(keys: ItemKey[]) {
    for (const k of keys) this.state.outbox[k] = (this.state.outbox[k] ?? 0) + 1;
    this.save();
    this.set({});
    this.schedulePush();
  }
  queueUpload(ids: string[]) {
    this.state.uploads = [...new Set([...this.state.uploads, ...ids])];
    this.state.deletes = this.state.deletes.filter((d) => !ids.includes(d));
    this.save();
    this.set({});
    this.schedulePush();
  }
  queueDelete(ids: string[]) {
    this.state.deletes = [...new Set([...this.state.deletes, ...ids])];
    this.state.uploads = this.state.uploads.filter((u) => !ids.includes(u));
    this.save();
    this.set({});
    this.schedulePush();
  }

  // ── Running ────────────────────────────────────────────────

  start() {
    if (this.running) return;
    this.running = true;
    this.channel = this.client
      .channel(`items:${this.homeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `home_id=eq.${this.homeId}` }, () => this.schedulePull(300))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.schedulePull(0); // catch anything missed while connecting
      });
    const onWake = () => this.syncNow();
    window.addEventListener('online', onWake);
    window.addEventListener('focus', onWake);
    const onVisible = () => document.visibilityState === 'visible' && this.syncNow();
    document.addEventListener('visibilitychange', onVisible);
    this.timers.push(window.setInterval(() => this.syncNow(), 60_000));
    this.stopListeners = () => {
      window.removeEventListener('online', onWake);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onVisible);
    };
    this.syncNow();
  }
  private stopListeners = () => {};

  stop() {
    this.running = false;
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    window.clearTimeout(this.pushTimer);
    window.clearTimeout(this.pullTimer);
    this.stopListeners();
    if (this.channel) this.client.removeChannel(this.channel);
    this.channel = null;
  }

  /** Upload, then download. Runs one at a time. */
  syncNow() {
    this.busy = this.busy.then(() => this.cycle()).catch(() => {});
    return this.busy;
  }
  private schedulePush(delay = 800) {
    window.clearTimeout(this.pushTimer);
    this.pushTimer = window.setTimeout(() => this.syncNow(), delay);
  }
  private schedulePull(delay: number) {
    window.clearTimeout(this.pullTimer);
    this.pullTimer = window.setTimeout(() => {
      this.busy = this.busy.then(() => this.pullOnly()).catch(() => {});
    }, delay);
  }

  private async cycle() {
    if (!this.running) return;
    this.set({ status: 'syncing' });
    try {
      await this.push();
      await this.pull();
      this.set({ status: 'synced', lastSynced: new Date(), error: null });
    } catch (e) {
      this.fail(e);
    }
  }
  private async pullOnly() {
    if (!this.running) return;
    try {
      await this.pull();
      this.set({ status: this.pendingCount() ? this.snapshot.status : 'synced', lastSynced: new Date(), error: null });
    } catch (e) {
      this.fail(e);
    }
  }
  private fail(e: unknown) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    const looksOffline = offline || /fetch|network|load failed/i.test(message);
    this.set({ status: looksOffline ? 'offline' : 'error', error: looksOffline ? null : message });
    if (this.running) this.schedulePush(looksOffline ? 15_000 : 30_000); // try again later
  }

  // ── Upload ─────────────────────────────────────────────────

  private async push() {
    const entries = Object.entries(this.state.outbox);
    if (entries.length) {
      const data = this.local.getData();
      const rows = entries.map(([key]) => {
        const { collection, id } = splitKey(key);
        const value = itemValue(data, key);
        return { home_id: this.homeId, collection, id, data: value ?? null, deleted: value === undefined };
      });
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await this.client.from('items').upsert(rows.slice(i, i + 200), { onConflict: 'home_id,collection,id' });
        if (error) throw error;
      }
      // Only clear items that weren't edited again while uploading.
      for (const [key, count] of entries) if (this.state.outbox[key] === count) delete this.state.outbox[key];
      this.save();
      this.set({});
    }

    for (const id of [...this.state.uploads]) {
      await this.uploadImage(id);
      this.state.uploads = this.state.uploads.filter((u) => u !== id);
      this.save();
      this.set({});
    }

    if (this.state.deletes.length) {
      const ids = [...this.state.deletes];
      const paths = ids.flatMap((id) => (['full', 'thumb', 'original'] as Variant[]).map((v) => imagePath(this.homeId, id, v)));
      const { error } = await this.client.storage.from(IMAGE_BUCKET).remove(paths);
      if (error) throw error;
      this.state.deletes = this.state.deletes.filter((d) => !ids.includes(d));
      this.save();
      this.set({});
    }
  }

  private async uploadImage(id: string) {
    for (const variant of ['thumb', 'full', 'original'] as Variant[]) {
      const blob = await getLocalImage(id, variant);
      if (!blob) continue; // not stored (e.g. deleted, or a file without this version) – nothing to upload
      const { error } = await this.client.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath(this.homeId, id, variant), blob, { upsert: true, contentType: blob.type || (variant === 'original' ? 'application/octet-stream' : 'image/jpeg') });
      if (error) throw error;
    }
  }

  /** Downloads one picture that this device doesn't have yet. */
  async fetchImage(id: string, variant: Variant) {
    const { data, error } = await this.client.storage.from(IMAGE_BUCKET).download(imagePath(this.homeId, id, variant));
    if (error || !data) return undefined;
    return data;
  }

  // ── Download ───────────────────────────────────────────────

  private async pull() {
    // First page: everything newer than what we've seen (with a small overlap).
    // Later pages: carry on from the last row received, so big batches are never cut short.
    let from = this.state.cursor ? new Date(new Date(this.state.cursor).getTime() - OVERLAP_MS).toISOString() : '1970-01-01T00:00:00Z';
    let inclusive = false;
    for (;;) {
      const query = this.client
        .from('items')
        .select('collection,id,data,deleted,updated_at')
        .eq('home_id', this.homeId);
      const { data, error } = await (inclusive ? query.gte('updated_at', from) : query.gt('updated_at', from))
        .order('updated_at', { ascending: true })
        .limit(PAGE);
      if (error) throw error;
      const rows = (data ?? []) as RemoteRow[];

      // Skip what's already here, and anything with a change still waiting to upload from this device.
      const fresh = rows.filter((r) => {
        const key = `${r.collection}:${r.id}`;
        return this.state.seen[key] !== r.updated_at && !(key in this.state.outbox);
      });
      if (fresh.length) this.local.applyRemote(fresh);
      for (const r of rows) this.state.seen[`${r.collection}:${r.id}`] = r.updated_at;
      if (rows.length) {
        const newest = rows[rows.length - 1].updated_at;
        if (!this.state.cursor || newest > this.state.cursor) this.state.cursor = newest;
      }
      this.save();

      if (rows.length < PAGE) break;
      const last = rows[rows.length - 1].updated_at;
      if (inclusive && last === from) break; // a whole page with one timestamp: nothing more to gain
      from = last;
      inclusive = true;
    }
  }
}
