import { useState } from 'react';
import { Columns2, FileUp, Plus } from 'lucide-react';
import { useRoomName, useStore } from '../../data/store';
import { designStatuses } from '../../data/designs';
import type { DesignStatus } from '../../data/types';
import { DesignEditor } from '../../editors/DesignEditor';
import { PptxImport } from '../../editors/PptxImport';
import { DesignCard } from '../../components/DesignCard';
import { Chips, EmptyState, PageHeader } from '../../components/ui';
import { tabHref } from '../room/tabs';
import { compareHref, designHref } from './links';

const filters = ['All', ...designStatuses] as const;

/** All designs, grouped by room. */
export function DesignsPage() {
  const { designs, rooms } = useStore().data;
  const roomName = useRoomName();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [roomId, setRoomId] = useState('all');
  const [adding, setAdding] = useState<{ roomId?: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const groups = rooms
    .filter((r) => roomId === 'all' || r.id === roomId)
    .map((r) => {
      const all = designs.filter((d) => d.roomId === r.id);
      const shown = all
        .filter((d) => filter === 'All' || d.status === (filter as DesignStatus))
        .sort((a, b) => a.title.localeCompare(b.title) || a.version.localeCompare(b.version, undefined, { numeric: true }));
      return { room: r, all, shown };
    })
    .filter((g) => g.shown.length > 0 || (roomId !== 'all' && filter === 'All'));

  const selected = designs.filter((d) => d.status === 'Selected').length;

  return (
    <>
      <PageHeader
        eyebrow="Look & feel"
        title="Interior Designs"
        subtitle={`${designs.length} designs · ${selected} selected`}
        action={
          <div className="header-actions">
            <button className="btn btn-ghost" onClick={() => setImporting(true)}><FileUp size={16} /> Import from PowerPoint</button>
            <button className="btn btn-primary" onClick={() => setAdding({ roomId: roomId === 'all' ? undefined : roomId })}><Plus size={17} /> Add design</button>
          </div>
        }
      />

      <div className="toolbar">
        <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Filter by room">
          <option value="all">All rooms</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
        </select>
        <Chips options={filters} value={filter} onChange={setFilter} />
      </div>

      {groups.length === 0 && (
        <EmptyState>{designs.length ? 'No designs match these filters.' : 'No designs yet. Add a render, or import your renders from PowerPoint.'}</EmptyState>
      )}

      {groups.map(({ room, all, shown }) => (
        <section key={room.id} className="design-group">
          <div className="design-group-head">
            <div>
              <h2><a href={tabHref(room.id, 'designs')}>{roomName(room.id)}</a></h2>
              <p className="row-sub">{statusSummary(all.map((d) => d.status))}</p>
            </div>
            <div className="card-actions">
              {all.length >= 2 && <a className="btn btn-ghost small" href={compareHref(room.id)}><Columns2 size={15} /> Compare</a>}
              <button className="icon-btn small" aria-label={`Add design for ${room.name}`} onClick={() => setAdding({ roomId: room.id })}><Plus size={17} /></button>
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState>No designs for this room yet.</EmptyState>
          ) : (
            <div className="design-grid">
              {shown.map((d) => <DesignCard key={d.id} design={d} showRoom={false} href={designHref(d.id)} />)}
            </div>
          )}
        </section>
      ))}

      {adding && <DesignEditor roomId={adding.roomId} onClose={() => setAdding(null)} onSaved={(id) => (window.location.hash = `/designs/${id}`)} />}
      {importing && <PptxImport onClose={() => setImporting(false)} />}
    </>
  );
}

/** e.g. "3 designs · 1 selected · 1 shortlisted" */
export function statusSummary(statuses: DesignStatus[]) {
  const n = statuses.length;
  const parts = [`${n} design${n === 1 ? '' : 's'}`];
  for (const s of ['Selected', 'Shortlisted'] as DesignStatus[]) {
    const c = statuses.filter((x) => x === s).length;
    if (c) parts.push(`${c} ${s.toLowerCase()}`);
  }
  return parts.join(' · ');
}
