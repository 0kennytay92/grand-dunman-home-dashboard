import { useState } from 'react';
import { Columns2, Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import type { Room } from '../../data/types';
import { DesignEditor } from '../../editors/DesignEditor';
import { DesignCard } from '../../components/DesignCard';
import { EmptyState } from '../../components/ui';
import { compareHref, designHref } from '../designs/links';
import { statusSummary } from '../designs/DesignsPage';

export function DesignsTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [adding, setAdding] = useState(false);
  const designs = data.designs
    .filter((d) => d.roomId === room.id)
    .sort((a, b) => a.title.localeCompare(b.title) || a.version.localeCompare(b.version, undefined, { numeric: true }));

  return (
    <>
      <div className="toolbar spread">
        <p className="row-sub">{designs.length ? statusSummary(designs.map((d) => d.status)) : ''}</p>
        <div className="header-actions">
          {designs.length >= 2 && <a className="btn btn-ghost" href={compareHref(room.id)}><Columns2 size={16} /> Compare</a>}
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={17} /> Add design</button>
        </div>
      </div>

      {designs.length === 0 ? (
        <EmptyState>No designs for this room yet. Add a render with its prompt and reference images.</EmptyState>
      ) : (
        <div className="design-grid">
          {designs.map((d) => <DesignCard key={d.id} design={d} showRoom={false} href={designHref(d.id)} />)}
        </div>
      )}

      {adding && <DesignEditor roomId={room.id} onClose={() => setAdding(false)} onSaved={(id) => (window.location.hash = `/designs/${id}`)} />}
    </>
  );
}
