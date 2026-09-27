import { useMemo, useState, type KeyboardEvent } from 'react';
import { Pin, Search } from 'lucide-react';
import { newId, useRoomName, useStore } from '../data/store';
import type { Note } from '../data/types';
import { EditorModal, Field, SelectInput } from '../components/forms';
import { PhotoPicks, PhotoRow, usePhotoPicks } from '../components/PhotoPicks';
import { Card, EmptyState, PageHeader } from '../components/ui';

// ─────────────────────────────────────────────────────────────
// NOTES
// Rough notes: type (or photograph) anything worth remembering.
// Optionally tag a room, and pin the important ones to the top.
// ─────────────────────────────────────────────────────────────

/** "27 Sept, 9:41 am" (the year is added when it isn't this year). */
export function noteTime(iso: string) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-SG', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), hour: 'numeric', minute: '2-digit' });
}

const sortNotes = (a: Note, b: Note) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt.localeCompare(a.updatedAt);

export function NotesPage() {
  const { data } = useStore();
  const roomName = useRoomName();
  const [q, setQ] = useState('');
  const [roomId, setRoomId] = useState('all');
  const [editing, setEditing] = useState<Note | null>(null);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return data.notes
      .filter((x) => roomId === 'all' || (roomId === 'none' ? !x.roomId : x.roomId === roomId))
      .filter((x) => !n || `${x.text} ${x.roomId ? roomName(x.roomId) : ''}`.toLowerCase().includes(n))
      .sort(sortNotes);
  }, [data.notes, q, roomId, roomName]);

  return (
    <>
      <PageHeader eyebrow="Jot it down" title="Notes" subtitle="Rough notes – ideas, things to ask, reminders. Tag a room if you like." />

      <QuickNote />

      {data.notes.length > 0 && (
        <div className="toolbar">
          <label className="search notes-search">
            <Search size={17} />
            <input type="search" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notes" />
          </label>
          <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Filter by room">
            <option value="all">All notes</option>
            <option value="none">Not about a room</option>
            {data.rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
          </select>
        </div>
      )}

      {data.notes.length === 0 ? (
        <EmptyState>No notes yet. Type something above – it's saved straight away.</EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState>No notes match.</EmptyState>
      ) : (
        <NoteGrid notes={shown} onOpen={setEditing} />
      )}

      {editing && <NoteEditor note={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export function NoteGrid({ notes, onOpen, showRoom = true }: { notes: Note[]; onOpen: (n: Note) => void; showRoom?: boolean }) {
  const roomName = useRoomName();
  return (
    <ul className="note-grid">
      {notes.map((n) => (
        <li key={n.id}>
          <div className={`note-card ${n.pinned ? 'pinned' : ''}`}>
            <button type="button" className="note-open" onClick={() => onOpen(n)} aria-label="Open note">
              {n.text ? <p className="note-text">{n.text}</p> : <p className="note-text muted">(photo)</p>}
            </button>
            <PhotoRow ids={n.photoIds} caption={n.text.slice(0, 80)} />
            <p className="note-meta">
              {n.pinned && <Pin size={13} className="pin-icon" />}
              {showRoom && n.roomId && <span className="note-room">{roomName(n.roomId)}</span>}
              <span>{noteTime(n.updatedAt)}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The always-open box at the top: type, optionally pick a room or add photos, save. */
export function QuickNote({ roomId: fixedRoom }: { roomId?: string }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const [text, setText] = useState('');
  const [roomId, setRoomId] = useState(fixedRoom ?? '');
  const picks = usePhotoPicks([]);
  const [busy, setBusy] = useState(false);
  const empty = !text.trim() && !picks.count;

  const save = async () => {
    if (empty || busy) return;
    setBusy(true);
    const photoIds = await picks.commit();
    const now = new Date().toISOString();
    upsert('notes', { id: newId(), text: text.trim(), roomId: roomId || undefined, photoIds, createdAt: now, updatedAt: now });
    setBusy(false);
    setText('');
    setRoomId(fixedRoom ?? ''); // the next note starts without a room, so it isn't tagged by mistake
    picks.reset();
    notify('Note saved');
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <Card className="quick-note">
      <textarea
        className="input note-input"
        rows={3}
        placeholder="Write a note… e.g. Ask contractor about an extra power point behind the TV"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        aria-label="New note"
      />
      <div className="quick-note-row">
        <PhotoPicks picks={picks} label="Photo" />
        <span className="grow" />
        {!fixedRoom && (
          <select className="input select note-room-select" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Room (optional)">
            <option value="">No room</option>
            {data.rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
          </select>
        )}
        <button type="button" className="btn btn-primary" onClick={save} disabled={empty || busy}>{busy ? 'Saving…' : 'Save note'}</button>
      </div>
    </Card>
  );
}

export function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [text, setText] = useState(note.text);
  const [roomId, setRoomId] = useState(note.roomId ?? '');
  const [pinned, setPinned] = useState(!!note.pinned);
  const picks = usePhotoPicks(note.photoIds);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!text.trim() && !picks.count) return del();
    setBusy(true);
    const photoIds = await picks.commit();
    const changed = text.trim() !== note.text || (roomId || undefined) !== note.roomId || photoIds.join() !== note.photoIds.join();
    upsert('notes', { ...note, text: text.trim(), roomId: roomId || undefined, pinned: pinned || undefined, photoIds, updatedAt: changed ? new Date().toISOString() : note.updatedAt });
    setBusy(false);
    notify('Note saved');
    onClose();
  };
  const del = () => {
    if (!window.confirm('Delete this note?')) return;
    remove('notes', note.id);
    notify('Note deleted');
    onClose();
  };

  return (
    <EditorModal title="Note" onClose={busy ? () => {} : onClose} onSave={save} onDelete={del} saveLabel={busy ? 'Saving…' : 'Save'}>
      <textarea className="input note-input big" rows={8} value={text} onChange={(e) => setText(e.target.value)} aria-label="Note" autoFocus />
      <Field label="Photos">{() => <PhotoPicks picks={picks} label="Add photo" />}</Field>
      <SelectInput label="Room" value={roomId} onChange={setRoomId} options={[{ value: '', label: 'No room' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
      <label className="checkbox-line">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        <span>Pin to the top</span>
      </label>
      <p className="field-hint">Written {noteTime(note.createdAt)}{note.updatedAt !== note.createdAt ? ` · changed ${noteTime(note.updatedAt)}` : ''}</p>
    </EditorModal>
  );
}
