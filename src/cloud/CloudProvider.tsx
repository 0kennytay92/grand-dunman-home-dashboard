import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { arrivalParams, arrivedFromEmailLink, supabase } from './client';
import { SyncEngine, type SyncSnapshot } from './sync';
import { allKeys } from './changes';
import { connectImageSync } from '../data/images';
import { imageIdsInUse } from '../data/designs';
import { useStore } from '../data/store';
import type { AppData } from '../data/types';

// ─────────────────────────────────────────────────────────────
// ONLINE SYNC – sign in, your shared home, and keeping in step.
// ─────────────────────────────────────────────────────────────

export interface Home {
  id: string;
  name: string;
  role: 'owner' | 'member';
}
export interface Member {
  user_id: string;
  email: string | null;
  role: 'owner' | 'member';
}

interface Cloud {
  configured: boolean;
  ready: boolean; // finished checking whether someone is signed in
  session: Session | null;
  homes: Home[];
  home: Home | null; // the home this device syncs with
  sync: SyncSnapshot | null;
  recovering: boolean; // arrived from a "reset password" email
  linkError: string | null; // an email link that couldn't be used
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<'signed-in' | 'check-email'>;
  sendPasswordReset: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createHome: (name: string) => Promise<void>;
  connectHome: (homeId: string, mode: 'download' | 'merge') => Promise<void>;
  refreshHomes: () => Promise<Home[]>;
  renameHome: (name: string) => Promise<void>;
  listMembers: () => Promise<{ members: Member[]; invites: string[] }>;
  invite: (email: string) => Promise<void>;
  cancelInvite: (email: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  syncNow: () => void;
  clearLinkError: () => void;
}

const CloudContext = createContext<Cloud | null>(null);
const homeKey = (userId: string) => `grand-dunman-home:cloud-home:${userId}`;
const siteUrl = () => `${window.location.origin}${window.location.pathname}`;

/** Turns Supabase's error messages into plain English. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match. Check them, or use “Forgot password”.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first – open the link in the email we sent you, then sign in.';
  if (/already registered|already been registered/i.test(msg)) return 'There’s already an account with this email. Sign in instead.';
  if (/password should be at least|weak password/i.test(msg)) return 'Please choose a longer password (at least 8 characters).';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/fetch|network|load failed/i.test(msg)) return 'Can’t reach the internet right now. Check your connection and try again.';
  return msg;
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncSnapshot | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);
  const userId = session?.user.id ?? null;

  // ── Who's signed in ────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    // An email link that failed (e.g. expired) comes back with an error in the address.
    const err = arrivalParams.get('error_description');
    if (err) setLinkError(/expired|invalid/i.test(err) ? 'That email link has expired or was already used. Please sign in, or request a new link.' : err);
    // Arriving from an email link: show the Sync page, where the outcome is explained.
    if (arrivedFromEmailLink) window.location.hash = '/sync';

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (arrivedFromEmailLink) {
        // Tidy the address bar (remove …?code=…).
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        // The link was opened in a different browser from the one used to sign up
        // (e.g. the Home Screen app vs Safari): the email is confirmed, but you need to sign in.
        if (arrivalParams.has('code') && !data.session && !err) {
          setLinkError('Your email is confirmed. Please sign in with your email and password.');
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Which homes you belong to ──────────────────────────────
  const refreshHomes = useCallback(async () => {
    if (!supabase || !userId) return [];
    await supabase.rpc('accept_invites'); // join any home you've been invited to
    const { data, error } = await supabase.from('home_members').select('role, homes(id, name)').eq('user_id', userId);
    if (error) throw error;
    const list: Home[] = (data ?? []).flatMap((r) => {
      const h = (Array.isArray(r.homes) ? r.homes[0] : r.homes) as { id: string; name: string } | null;
      return h ? [{ id: h.id, name: h.name, role: r.role as Home['role'] }] : [];
    });
    setHomes(list);
    return list;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHomes([]);
      setHomeId(null);
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(homeKey(userId));
    } catch {
      // ignore
    }
    refreshHomes()
      .then((list) => setHomeId(saved && list.some((h) => h.id === saved) ? saved : null))
      .catch(() => setHomeId(saved)); // offline: keep using the home from last time
  }, [userId, refreshHomes]);

  // ── The sync engine for the chosen home ────────────────────
  useEffect(() => {
    if (!supabase || !userId || !homeId) {
      setSync(null);
      return;
    }
    const engine = new SyncEngine(supabase, homeId, {
      getData: () => storeRef.current.getData(),
      applyRemote: (rows) => storeRef.current.applyRemote(rows),
    });
    engineRef.current = engine;
    const offStatus = engine.subscribe(setSync);
    const offChanges = storeRef.current.onLocalChange((keys) => engine.markChanged(keys));
    const offImages = connectImageSync({
      onPut: (id) => engine.queueUpload([id]),
      onDelete: (ids) => engine.queueDelete(ids),
      fetchRemote: (id, variant) => engine.fetchImage(id, variant),
    });
    engine.start();
    return () => {
      engine.stop();
      offStatus();
      offChanges();
      offImages();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [userId, homeId]);

  const chooseHome = useCallback(
    (id: string | null) => {
      if (!userId) return;
      try {
        if (id) localStorage.setItem(homeKey(userId), id);
        else localStorage.removeItem(homeKey(userId));
      } catch {
        // ignore
      }
      setHomeId(id);
    },
    [userId],
  );

  // ── Actions ────────────────────────────────────────────────
  const need = () => {
    if (!supabase) throw new Error('Online sync is not set up.');
    return supabase;
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await need().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await need().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: siteUrl() } });
    if (error) throw error;
    if (data.user && data.user.identities?.length === 0) throw new Error('already registered');
    return data.session ? 'signed-in' : 'check-email';
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl() });
    if (error) throw error;
  }, []);

  const setNewPassword = useCallback(async (password: string) => {
    const { error } = await need().auth.updateUser({ password });
    if (error) throw error;
    setRecovering(false);
  }, []);

  const signOut = useCallback(async () => {
    await engineRef.current?.syncNow(); // send anything still waiting
    await need().auth.signOut();
  }, []);

  /** Creates a new online home and uploads everything on this device into it. */
  const createHome = useCallback(
    async (name: string) => {
      const client = need();
      const { data, error } = await client.from('homes').insert({ name: name.trim() || 'Our home' }).select('id').single();
      if (error) throw error;
      SyncEngine.reset(data.id);
      queueEverything(data.id, storeRef.current.getData());
      await refreshHomes();
      chooseHome(data.id);
    },
    [refreshHomes, chooseHome],
  );

  /**
   * Starts syncing with an existing home.
   * download: this device's data is replaced by the online copy.
   * merge: this device's data is added to the online copy too.
   */
  const connectHome = useCallback(
    async (id: string, mode: 'download' | 'merge') => {
      SyncEngine.reset(id);
      const current = storeRef.current.getData();
      if (mode === 'download') {
        storeRef.current.replaceLocal({ ...current, rooms: [], measurements: [], photos: [], designs: [], budgetCategories: [], expenses: [], vendors: [], purchases: [], payments: [], documents: [], issues: [], messages: [], tasks: [], floorPlan: undefined });
      } else {
        queueEverything(id, current);
      }
      chooseHome(id);
    },
    [chooseHome],
  );

  const renameHome = useCallback(
    async (name: string) => {
      if (!homeId) return;
      const { error } = await need().from('homes').update({ name: name.trim() }).eq('id', homeId);
      if (error) throw error;
      await refreshHomes();
    },
    [homeId, refreshHomes],
  );

  const listMembers = useCallback(async () => {
    if (!homeId) return { members: [], invites: [] };
    const client = need();
    const [m, i] = await Promise.all([
      client.from('home_members').select('user_id, email, role').eq('home_id', homeId).order('joined_at'),
      client.from('home_invites').select('email').eq('home_id', homeId).order('created_at'),
    ]);
    if (m.error) throw m.error;
    if (i.error) throw i.error;
    return { members: (m.data ?? []) as Member[], invites: (i.data ?? []).map((x) => x.email as string) };
  }, [homeId]);

  const invite = useCallback(
    async (email: string) => {
      if (!homeId) return;
      const { error } = await need().from('home_invites').upsert({ home_id: homeId, email: email.trim().toLowerCase() }, { onConflict: 'home_id,email' });
      if (error) throw error;
    },
    [homeId],
  );

  const cancelInvite = useCallback(
    async (email: string) => {
      if (!homeId) return;
      const { error } = await need().from('home_invites').delete().eq('home_id', homeId).eq('email', email);
      if (error) throw error;
    },
    [homeId],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!homeId) return;
      const { error } = await need().from('home_members').delete().eq('home_id', homeId).eq('user_id', memberId);
      if (error) throw error;
      if (memberId === userId) chooseHome(null);
    },
    [homeId, userId, chooseHome],
  );

  const syncNow = useCallback(() => void engineRef.current?.syncNow(), []);
  const clearLinkError = useCallback(() => setLinkError(null), []);

  const value = useMemo<Cloud>(
    () => ({
      configured: !!supabase,
      ready,
      session,
      homes,
      home: homes.find((h) => h.id === homeId) ?? (homeId ? { id: homeId, name: 'Your home', role: 'member' } : null),
      sync,
      recovering,
      linkError,
      signIn,
      signUp,
      sendPasswordReset,
      setNewPassword,
      signOut,
      createHome,
      connectHome,
      refreshHomes,
      renameHome,
      listMembers,
      invite,
      cancelInvite,
      removeMember,
      syncNow,
      clearLinkError,
    }),
    [ready, session, homes, homeId, sync, recovering, linkError, signIn, signUp, sendPasswordReset, setNewPassword, signOut, createHome, connectHome, refreshHomes, renameHome, listMembers, invite, cancelInvite, removeMember, syncNow, clearLinkError],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

/** Marks everything on this device (items and pictures) to be uploaded to a home. */
function queueEverything(homeId: string, data: AppData) {
  const state = {
    cursor: null,
    outbox: Object.fromEntries(allKeys(data).map((k) => [k, 1])),
    uploads: imageIdsInUse(data),
    deletes: [],
    seen: {},
  };
  try {
    localStorage.setItem(`grand-dunman-home:sync:${homeId}`, JSON.stringify(state));
  } catch {
    // very large data on a full device: items will still sync as they're edited
  }
}

export function useCloud() {
  const c = useContext(CloudContext);
  if (!c) throw new Error('useCloud must be used inside <CloudProvider>');
  return c;
}
