import { useState } from 'react';
import { Camera } from 'lucide-react';
import { useStore } from '../../data/store';
import { photoFilters, type PhotoFilter } from '../../data/photoTags';
import type { PhotoTag, Room } from '../../data/types';
import { formatDate } from '../../format';
import { PhotoAdder } from '../../editors/PhotoAdder';
import { PhotoThumb } from '../../components/PhotoThumb';
import { PhotoViewer } from '../../components/PhotoViewer';
import { Badge, Chips, EmptyState, statusTone } from '../../components/ui';

export function PhotosTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [filter, setFilter] = useState<PhotoFilter>('All');
  const [viewing, setViewing] = useState<string | null>(null);

  const all = data.photos.filter((p) => p.roomId === room.id);
  const shown = all.filter((p) => filter === 'All' || p.tag === (filter as PhotoTag)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="toolbar spread">
        <Chips options={photoFilters} value={filter} onChange={setFilter} />
        <PhotoAdder roomId={room.id}>
          {(open) => (
            <button className="btn btn-primary" onClick={open}>
              <Camera size={17} /> Add Photo
            </button>
          )}
        </PhotoAdder>
      </div>

      {shown.length === 0 ? (
        <EmptyState>{all.length ? 'No photos in this category.' : `No photos of the ${room.name.toLowerCase()} yet. Tap "Add Photo" to take or choose some.`}</EmptyState>
      ) : (
        <div className="photo-grid">
          {shown.map((p) => (
            <button key={p.id} type="button" className="photo-card card-button" onClick={() => setViewing(p.id)}>
              <PhotoThumb photo={p} label="Sample photo" />
              <span className="photo-caption">
                <span className="room-card-top">
                  <span className="row-title">{p.caption || p.tag}</span>
                  <Badge tone={statusTone[p.tag]}>{p.tag}</Badge>
                </span>
                <span className="photo-cat">{p.tag}</span>
                <span className="row-sub">{formatDate(p.date)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {viewing && <PhotoViewer photos={shown} startId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
