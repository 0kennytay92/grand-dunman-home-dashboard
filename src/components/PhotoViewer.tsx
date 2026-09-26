import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { useImageUrl } from '../data/images';
import { useRoomName } from '../data/store';
import type { Photo } from '../data/types';
import { formatDate } from '../format';
import { PhotoEditor } from '../editors/PhotoEditor';
import { Badge, PhotoPlaceholder, statusTone } from './ui';

/** Full-screen photo view. Swipe or use the arrows to move between photos. */
export function PhotoViewer({ photos, startId, onClose }: { photos: Photo[]; startId: string; onClose: () => void }) {
  const roomName = useRoomName();
  const [currentId, setCurrentId] = useState(startId);
  const [editing, setEditing] = useState(false);
  const touchX = useRef<number | null>(null);

  const index = Math.max(0, photos.findIndex((p) => p.id === currentId));
  const photo = photos[index] as Photo | undefined;
  const thumbUrl = useImageUrl(photo?.id ?? '', 'thumb', !!photo?.hasImage);
  const fullUrl = useImageUrl(photo?.id ?? '', 'full', !!photo?.hasImage);

  const go = (step: number) => {
    const next = photos[index + step];
    if (next) setCurrentId(next.id);
  };

  useEffect(() => {
    if (editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  });

  // The photo was deleted: close the viewer.
  useEffect(() => {
    if (!photo) onClose();
  }, [photo, onClose]);
  if (!photo) return null;

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className="viewer-bar">
        <span className="viewer-count">{index + 1} / {photos.length}</span>
        <div className="viewer-actions">
          <button className="viewer-btn" onClick={() => setEditing(true)} aria-label="Edit photo details"><Pencil size={18} /></button>
          <button className="viewer-btn" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
      </header>

      <div className="viewer-stage">
        {photo.hasImage ? (
          (fullUrl || thumbUrl) && <img key={photo.id} src={fullUrl ?? thumbUrl ?? undefined} alt={photo.caption} draggable={false} />
        ) : (
          <div className="viewer-ph"><PhotoPlaceholder roomId={photo.roomId} label="Sample photo – no image" /></div>
        )}
        {index > 0 && <button className="viewer-nav prev" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={28} /></button>}
        {index < photos.length - 1 && <button className="viewer-nav next" onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={28} /></button>}
      </div>

      <footer className="viewer-info">
        <div>
          <p className="viewer-caption">{photo.caption || roomName(photo.roomId)}</p>
          <p className="viewer-sub">{roomName(photo.roomId)} · {formatDate(photo.date)}</p>
        </div>
        <Badge tone={statusTone[photo.tag]}>{photo.tag}</Badge>
      </footer>

      {editing && <PhotoEditor photo={photo} onClose={() => setEditing(false)} />}
    </div>
  );
}
