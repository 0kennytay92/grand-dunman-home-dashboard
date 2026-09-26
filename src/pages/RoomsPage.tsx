import { useState } from 'react';
import { useStore } from '../data/store';
import type { RoomStatus } from '../data/types';
import { area } from '../format';
import { href } from '../router';
import { AddButton } from '../components/forms';
import { RoomEditor } from '../editors/RoomEditor';
import { Badge, Chips, EmptyState, PageHeader, PhotoPlaceholder, ProgressBar, statusTone } from '../components/ui';

const filters = ['All', 'Not started', 'Planning', 'In progress', 'Completed'] as const;

export function RoomsPage() {
  const { rooms } = useStore().data;
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [adding, setAdding] = useState(false);
  const shown = filter === 'All' ? rooms : rooms.filter((r) => r.status === (filter as RoomStatus));
  const totalArea = rooms.reduce((s, r) => s + r.areaSqm, 0);

  return (
    <>
      <PageHeader
        eyebrow="Floor plan"
        title="Rooms"
        subtitle={`${rooms.length} spaces${totalArea ? ` · ${totalArea.toFixed(1)} m² in total` : ''}`}
        action={<AddButton label="Add room" onClick={() => setAdding(true)} />}
      />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>{rooms.length ? 'No rooms with this status.' : 'No rooms yet. Tap "Add room" to start.'}</EmptyState>
      ) : (
        <div className="room-grid">
          {shown.map((r) => (
            <a key={r.id} href={href(`/rooms/${r.id}`)} className="room-card">
              <PhotoPlaceholder roomId={r.id} />
              <div className="room-card-body">
                <div className="room-card-top">
                  <div>
                    <h3>{r.name}</h3>
                    <p className="row-sub">{[r.includes && `with ${r.includes}`, area(r.areaSqm)].filter(Boolean).join(' · ') || ' '}</p>
                  </div>
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </div>
                <ProgressBar value={r.progress} tone={r.progress === 100 ? 'good' : 'accent'} />
                <p className="row-sub">{r.progress}% complete</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {adding && <RoomEditor onClose={() => setAdding(false)} />}
    </>
  );
}
