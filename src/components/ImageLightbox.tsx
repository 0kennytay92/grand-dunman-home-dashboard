import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useImageUrl } from '../data/images';

/** A simple full-screen view of stored images (renders, reference images). Swipe or use arrows. */
export function ImageLightbox({ images, start = 0, onClose }: { images: { id: string; caption?: string }[]; start?: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const touchX = useRef<number | null>(null);
  const current = images[index];
  const thumb = useImageUrl(current?.id ?? '', 'thumb', !!current);
  const full = useImageUrl(current?.id ?? '', 'full', !!current);
  const go = (step: number) => setIndex((i) => Math.min(images.length - 1, Math.max(0, i + step)));

  useEffect(() => {
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

  if (!current) return null;
  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className="viewer-bar">
        <span className="viewer-count">{images.length > 1 ? `${index + 1} / ${images.length}` : ''}</span>
        <div className="viewer-actions">
          <button className="viewer-btn" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
      </header>
      <div className="viewer-stage">
        {(full || thumb) && <img key={current.id} className="viewer-img" src={full ?? thumb ?? undefined} alt={current.caption ?? ''} draggable={false} />}
        {index > 0 && <button className="viewer-nav prev" onClick={() => go(-1)} aria-label="Previous image"><ChevronLeft size={28} /></button>}
        {index < images.length - 1 && <button className="viewer-nav next" onClick={() => go(1)} aria-label="Next image"><ChevronRight size={28} /></button>}
      </div>
      <footer className="viewer-info">
        <p className="viewer-caption">{current.caption}</p>
      </footer>
    </div>
  );
}
