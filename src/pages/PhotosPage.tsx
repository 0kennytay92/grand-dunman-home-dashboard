import { useState } from 'react';
import { useRoomName, useStore } from '../data/store';
import type { PhotoTag } from '../data/types';
import { formatDate } from '../format';
import { Badge, Chips, EmptyState, PageHeader, PhotoPlaceholder, statusTone } from '../components/ui';

const filters = ['All', 'Before', 'Progress', 'Inspiration'] as const;

export function PhotosPage() {
  const { photos } = useStore().data;
  const roomName = useRoomName();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const shown = [...photos]
    .filter((p) => filter === 'All' || p.tag === (filter as PhotoTag))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader eyebrow="Gallery" title="Photos" subtitle="Before, progress and inspiration shots. Real photo upload comes in a later version." />
      <Chips options={filters} value={filter} onChange={setFilter} />

      {shown.length === 0 ? (
        <EmptyState>No photos in this category.</EmptyState>
      ) : (
        <div className="photo-grid">
          {shown.map((p) => (
            <figure key={p.id} className="photo-card">
              <PhotoPlaceholder roomId={p.roomId} label="Sample photo" />
              <figcaption>
                <div className="room-card-top">
                  <p className="row-title">{p.caption}</p>
                  <Badge tone={statusTone[p.tag]}>{p.tag}</Badge>
                </div>
                <p className="row-sub">{roomName(p.roomId)} · {formatDate(p.date)}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
