import { useState } from 'react';
import { rooms, type RoomStatus } from '../data/sampleData';
import { href } from '../router';
import { Badge, Chips, EmptyState, PageHeader, PhotoPlaceholder, ProgressBar, statusTone } from '../components/ui';

const filters = ['All', 'Not started', 'Planning', 'In progress', 'Completed'] as const;

export function RoomsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const shown = filter === 'All' ? rooms : rooms.filter((r) => r.status === (filter as RoomStatus));

  return (
    <>
      <PageHeader eyebrow="Floor plan" title="Rooms" subtitle={`${rooms.length} spaces · ${rooms.reduce((s, r) => s + r.areaSqm, 0).toFixed(1)} m² in total`} />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>No rooms with this status.</EmptyState>
      ) : (
        <div className="room-grid">
          {shown.map((r) => (
            <a key={r.id} href={href(`/rooms/${r.id}`)} className="room-card">
              <PhotoPlaceholder roomId={r.id} />
              <div className="room-card-body">
                <div className="room-card-top">
                  <div>
                    <h3>{r.name}</h3>
                    <p className="row-sub">{r.includes ? `with ${r.includes}` : `${r.areaSqm} m²`}</p>
                  </div>
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </div>
                <ProgressBar value={r.progress} tone={r.progress === 100 ? 'good' : 'accent'} />
                <p className="row-sub">{r.progress}% complete{r.includes ? ` · ${r.areaSqm} m²` : ''}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
