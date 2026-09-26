import { useState } from 'react';
import { useRoomName, useStore } from '../data/store';
import type { Design, DesignStatus } from '../data/types';
import { AddButton } from '../components/forms';
import { DesignEditor } from '../editors/DesignEditor';
import { Badge, Chips, EmptyState, PageHeader, statusTone } from '../components/ui';

const filters = ['All', 'Draft', 'Under review', 'Approved'] as const;

export function DesignsPage() {
  const { designs } = useStore().data;
  const roomName = useRoomName();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [editing, setEditing] = useState<{ item?: Design } | null>(null);
  const shown = filter === 'All' ? designs : designs.filter((d) => d.status === (filter as DesignStatus));

  return (
    <>
      <PageHeader
        eyebrow="Look & feel"
        title="Interior Designs"
        subtitle={`${designs.filter((d) => d.status === 'Approved').length} of ${designs.length} concepts approved`}
        action={<AddButton label="Add design" onClick={() => setEditing({})} />}
      />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>{designs.length ? 'No designs with this status.' : 'No designs yet. Tap "Add design" to start.'}</EmptyState>
      ) : (
        <div className="design-grid">
          {shown.map((d) => (
            <button key={d.id} type="button" className="design-card card-button" onClick={() => setEditing({ item: d })}>
              <div className="palette">
                {d.palette.map((c, i) => <span key={i} style={{ background: c }} title={c} />)}
              </div>
              <div className="design-body">
                <div className="room-card-top">
                  <div>
                    {d.style && <p className="eyebrow">{d.style}</p>}
                    <h3>{d.title}</h3>
                  </div>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                </div>
                {d.notes && <p className="design-notes">{d.notes}</p>}
                <p className="row-sub">{[roomName(d.roomId), d.designer].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && <DesignEditor design={editing.item} onClose={() => setEditing(null)} />}
    </>
  );
}
