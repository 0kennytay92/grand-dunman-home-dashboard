import { useState } from 'react';
import { Camera } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import { photoFilters, type PhotoFilter } from '../data/photoTags';
import type { PhotoTag } from '../data/types';
import { formatDate } from '../format';
import { PhotoAdder } from '../editors/PhotoAdder';
import { PhotoThumb } from '../components/PhotoThumb';
import { PhotoViewer } from '../components/PhotoViewer';
import { Badge, Chips, EmptyState, PageHeader, statusTone } from '../components/ui';

export function PhotosPage() {
  const { photos, rooms } = useStore().data;
  const roomName = useRoomName();
  const [filter, setFilter] = useState<PhotoFilter>('All');
  const [roomId, setRoomId] = useState('all');
  const [viewing, setViewing] = useState<string | null>(null);

  const shown = photos
    .filter((p) => filter === 'All' || p.tag === (filter as PhotoTag))
    .filter((p) => roomId === 'all' || p.roomId === roomId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Photos"
        subtitle={`${photos.length} photo${photos.length === 1 ? '' : 's'} · newest first`}
        action={
          <PhotoAdder roomId={roomId === 'all' ? undefined : roomId}>
            {(open) => (
              <button className="btn btn-primary" onClick={open}>
                <Camera size={17} /> Add Photo
              </button>
            )}
          </PhotoAdder>
        }
      />

      <div className="toolbar">
        <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Filter by room">
          <option value="all">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{roomName(r.id)}</option>
          ))}
        </select>
        <Chips options={photoFilters} value={filter} onChange={setFilter} />
      </div>

      {shown.length === 0 ? (
        <EmptyState>{photos.length ? 'No photos match these filters.' : 'No photos yet. Tap "Add Photo" to take or choose some.'}</EmptyState>
      ) : (
        <div className="photo-grid">
          {shown.map((p) => (
            <button key={p.id} type="button" className="photo-card card-button" onClick={() => setViewing(p.id)}>
              <PhotoThumb photo={p} label="Sample photo" />
              <span className="photo-caption">
                <span className="room-card-top">
                  <span className="row-title">{p.caption || roomName(p.roomId)}</span>
                  <Badge tone={statusTone[p.tag]}>{p.tag}</Badge>
                </span>
                <span className="photo-cat">{p.tag}</span>
                <span className="row-sub">{roomName(p.roomId)} · {formatDate(p.date)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {viewing && <PhotoViewer photos={shown} startId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
