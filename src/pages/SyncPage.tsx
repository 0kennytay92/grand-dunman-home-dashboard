import { useEffect, useState, type FormEvent } from 'react';
import { CloudOff, Download, LogOut, Merge, RefreshCw, Trash2, UploadCloud, UserPlus } from 'lucide-react';
import { friendlyError, useCloud, type Member } from '../cloud/CloudProvider';
import { useStore } from '../data/store';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { TextInput } from '../components/forms';

export function SyncPage() {
  const cloud = useCloud();

  if (!cloud.configured) {
    return (
      <>
        <PageHeader eyebrow="Online" title="Sync & Sharing" />
        <Card>
          <EmptyState>Online sync hasn't been set up for this app yet. Everything is saved on this device.</EmptyState>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Online"
        title="Sync & Sharing"
        subtitle={
          cloud.home
            ? `This device is syncing with “${cloud.home.name}”. Everyone in it sees the same rooms, photos, designs and budget.`
            : 'Sign in to keep your phone and computer in step, and to share your home with family or your designer.'
        }
      />
      {cloud.linkError && (
        <p className="banner-info" role="status">
          {cloud.linkError} <button className="link" onClick={cloud.clearLinkError}>OK</button>
        </p>
      )}
      {!cloud.ready ? <EmptyState>Checking…</EmptyState> : !cloud.session ? <SignIn /> : !cloud.home ? <ChooseHome /> : <Connected />}
    </>
  );
}

// ── Signed out ───────────────────────────────────────────────

function SignIn() {
  const cloud = useCloud();
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter your email address.');
    if (mode !== 'reset' && password.length < 8) return setError('Your password needs at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'in') await cloud.signIn(email, password);
      else if (mode === 'up') {
        const result = await cloud.signUp(email, password);
        if (result === 'check-email') setMessage(`Almost done: we've sent a confirmation email to ${email.trim()}. Open the link in it, then come back here and sign in.`);
      } else {
        await cloud.sendPasswordReset(email);
        setMessage(`If there's an account for ${email.trim()}, a link to choose a new password is on its way. Open it on this device.`);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-2">
      <Card title={mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create your account' : 'Reset your password'}>
        <form className="form-stack" onSubmit={submit} noValidate>
          <TextInput label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
          {mode !== 'reset' && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode === 'up' && <p className="field-hint">At least 8 characters.</p>}
            </div>
          )}
          {error && <p className="field-msg">{error}</p>}
          {message && <p className="banner-info">{message}</p>}
          <div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
            </button>
          </div>
          <p className="row-sub">
            {mode === 'in' ? (
              <>
                New here? <button type="button" className="link" onClick={() => setMode('up')}>Create an account</button> ·{' '}
                <button type="button" className="link" onClick={() => setMode('reset')}>Forgot password?</button>
              </>
            ) : (
              <>Already have an account? <button type="button" className="link" onClick={() => setMode('in')}>Sign in</button></>
            )}
          </p>
        </form>
      </Card>
      <Card title="How it works">
        <ul className="plain-list">
          <li>Your data stays on this device as it does now, and a copy is kept safely online.</li>
          <li>Changes made on one device appear on your others within seconds.</li>
          <li>Invite family or your designer by email; only people you invite can see your home.</li>
          <li>No internet? Keep working – changes upload when you're back online.</li>
        </ul>
      </Card>
    </div>
  );
}

// ── Signed in, not yet syncing ───────────────────────────────

function ChooseHome() {
  const cloud = useCloud();
  const [name, setName] = useState('Grand Dunman Home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="row-sub signed-as">Signed in as <strong>{cloud.session!.user.email}</strong> · <button className="link" onClick={() => cloud.signOut()}>Sign out</button></p>

      {cloud.homes.length > 0 && (
        <Card title="Your online home">
          <p className="card-text">Choose what should happen to the data that's on this device now:</p>
          {cloud.homes.map((h) => (
            <div key={h.id} className="home-choice">
              <p className="row-title">{h.name}</p>
              <div className="button-stack">
                <button className="btn btn-primary" disabled={busy} onClick={() => run(() => cloud.connectHome(h.id, 'download'))}>
                  <Download size={16} /> Use the online copy
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => cloud.connectHome(h.id, 'merge'))}>
                  <Merge size={16} /> Combine with this device
                </button>
              </div>
              <p className="row-sub">
                <strong>Use the online copy</strong> (recommended on a new phone or computer) replaces what's on this device with your shared home.{' '}
                <strong>Combine</strong> also uploads everything on this device – including any sample data – into the shared home.
              </p>
            </div>
          ))}
        </Card>
      )}

      <Card title={cloud.homes.length ? 'Or start a separate home' : 'Put your home online'}>
        <p className="card-text">
          {cloud.homes.length
            ? 'Only if you want a second, separate home.'
            : 'This uploads everything on this device – rooms, measurements, photos, designs, budget and your floor plan – to your private online home. Do this on the device that has your real data.'}
        </p>
        <div className="form-stack">
          <TextInput label="Home name" value={name} onChange={setName} />
          <div>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => cloud.createHome(name))}>
              <UploadCloud size={16} /> {busy ? 'Setting up…' : 'Create home and upload this device'}
            </button>
          </div>
        </div>
        {error && <p className="field-msg">{error}</p>}
      </Card>

      <p className="row-sub">
        Invited by someone? Their home appears above automatically once you sign in with the email they invited.{' '}
        <button className="link" onClick={() => run(async () => void (await cloud.refreshHomes()))}>Check again</button>
      </p>
    </>
  );
}

// ── Syncing ──────────────────────────────────────────────────

function Connected() {
  const cloud = useCloud();
  const { notify } = useStore();
  const home = cloud.home!;
  const me = cloud.session!.user;
  const [people, setPeople] = useState<{ members: Member[]; invites: string[] } | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [homeName, setHomeName] = useState(home.name);

  const load = () => cloud.listMembers().then(setPeople).catch((e) => setError(friendlyError(e)));
  useEffect(() => {
    load();
  }, [home.id]);

  const act = async (fn: () => Promise<void>, done?: string) => {
    setError('');
    try {
      await fn();
      if (done) notify(done);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  const s = cloud.sync;
  const isOwner = people?.members.some((m) => m.user_id === me.id && m.role === 'owner');

  return (
    <div className="grid-2">
      <Card title="Sync" action={<button className="link" onClick={cloud.syncNow}><RefreshCw size={15} /> Sync now</button>}>
        <SyncLine />
        {s?.status === 'error' && <p className="field-msg">{s.error}</p>}
        <p className="row-sub sync-note">
          Changes you make here upload within seconds; changes from your other devices appear automatically.
        </p>
      </Card>

      <Card title="Account">
        <p className="card-text">Signed in as <strong>{me.email}</strong></p>
        <button className="btn btn-ghost" onClick={() => cloud.signOut()}><LogOut size={16} /> Sign out</button>
        <p className="row-sub sync-note">Signing out keeps a copy of your data on this device, but stops syncing it.</p>
      </Card>

      <Card title="Your home">
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act(() => cloud.renameHome(homeName), 'Home renamed'); }}>
          <TextInput label="Home name" value={homeName} onChange={setHomeName} />
          {homeName.trim() !== home.name && <button className="btn btn-ghost" type="submit">Save</button>}
        </form>
        <h3 className="mini-head">People</h3>
        {!people ? (
          <EmptyState>Loading…</EmptyState>
        ) : (
          <ul className="list">
            {people.members.map((m) => (
              <li key={m.user_id} className="list-row">
                <div className="grow">
                  <p className="row-title">{m.email ?? 'Member'}{m.user_id === me.id && ' (you)'}</p>
                </div>
                <Badge tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role === 'owner' ? 'Owner' : 'Member'}</Badge>
                {isOwner && m.user_id !== me.id && (
                  <button className="icon-btn small" aria-label={`Remove ${m.email}`} onClick={() => window.confirm(`Remove ${m.email} from this home?`) && act(() => cloud.removeMember(m.user_id), 'Removed')}>
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
            {people.invites.map((e) => (
              <li key={e} className="list-row">
                <div className="grow">
                  <p className="row-title">{e}</p>
                  <p className="row-sub">Invited – joins when they sign in with this email</p>
                </div>
                <button className="icon-btn small" aria-label={`Cancel invite for ${e}`} onClick={() => act(() => cloud.cancelInvite(e), 'Invite cancelled')}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Invite someone">
        <form className="form-stack" onSubmit={(e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter their email address.');
          act(() => cloud.invite(email), 'Invite saved').then(() => setEmail(''));
        }}>
          <TextInput label="Their email" value={email} onChange={setEmail} placeholder="name@example.com" />
          <div><button className="btn btn-primary" type="submit"><UserPlus size={16} /> Invite</button></div>
          <p className="row-sub">
            They open this app, tap <strong>Create an account</strong> with this email, and your home appears for them. (No email is sent – just tell them.)
          </p>
        </form>
        {error && <p className="field-msg">{error}</p>}
      </Card>
    </div>
  );
}

/** e.g. "✓ Up to date · synced 2 min ago" */
export function SyncLine({ compact = false }: { compact?: boolean }) {
  const { sync } = useCloud();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  if (!sync) return null;
  const ago = sync.lastSynced ? timeAgo(sync.lastSynced) : '';
  const text =
    sync.status === 'syncing' ? 'Syncing…'
    : sync.status === 'offline' ? `Offline – ${sync.pending ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} will upload later` : 'saved on this device'}`
    : sync.status === 'error' ? 'Sync problem – tap Sync now'
    : sync.pending ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} uploading…`
    : `Up to date${ago && !compact ? ` · synced ${ago}` : ''}`;
  return (
    <p className={`sync-line s-${sync.status}`} role="status">
      {sync.status === 'offline' ? <CloudOff size={15} /> : <span className="sync-dot" />} {text}
    </p>
  );
}

function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}
