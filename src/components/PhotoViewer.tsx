import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Ruler, Trash2, X } from 'lucide-react';
import { useImageUrl, useSlow } from '../data/images';
import { useRoomName, useStore } from '../data/store';
import { labelLines, layoutLabels, type Placement } from '../data/labelLayout';
import type { Measurement, Photo } from '../data/types';
import { formatDate } from '../format';
import { PhotoEditor } from '../editors/PhotoEditor';
import { AnnotationEditor } from '../editors/AnnotationEditor';
import { Badge, PhotoPlaceholder, statusTone } from './ui';

type Mode =
  | { kind: 'view' }
  | { kind: 'details' } // editing the photo's description etc.
  | { kind: 'place'; moving?: Measurement } // waiting for a tap on the photo
  | { kind: 'annotate'; measurement?: Measurement; at?: { x: number; y: number } };

/**
 * Full-screen photo view. Swipe or use the arrows to move between photos.
 * Measurements can be pinned onto the photo as labels; the photo file itself is never changed.
 */
export function PhotoViewer({ photos, startId, onClose }: { photos: Photo[]; startId: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [currentId, setCurrentId] = useState(startId);
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [showLabels, setShowLabels] = useState(true);
  const touchX = useRef<number | null>(null);

  const index = Math.max(0, photos.findIndex((p) => p.id === currentId));
  const photo = photos[index] as Photo | undefined;
  const thumbUrl = useImageUrl(photo?.id ?? '', 'thumb', !!photo?.hasImage);
  const fullUrl = useImageUrl(photo?.id ?? '', 'full', !!photo?.hasImage);
  const slowPic = useSlow(!!photo?.hasImage && !(fullUrl ?? thumbUrl));
  const labels = photo ? data.measurements.filter((m) => m.pin?.photoId === photo.id) : [];

  // Work out exactly where the picture sits on screen, so labels line up with it.
  const stageRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const box = (() => {
    if (!natural || !stage) return null;
    const scale = Math.min(stage.w / natural.w, stage.h / natural.h);
    const w = natural.w * scale;
    const h = natural.h * scale;
    return { left: (stage.w - w) / 2, top: (stage.h - h) / 2, width: w, height: h };
  })();

  const visibleLabels = labels.filter((m) => !(mode.kind === 'place' && mode.moving?.id === m.id));
  const placements = box ? layoutLabels(visibleLabels, box.width, box.height, box.width < 560) : {};

  /** Deletes the photo on screen, then shows the next one (or closes when it was the last). */
  const deleteThis = () => {
    if (!photo) return;
    const pinned = data.measurements.filter((m) => m.pin?.photoId === photo.id).length;
    const extra = pinned ? `\n\nIts ${pinned} measurement${pinned > 1 ? 's' : ''} will stay in the room's Measurements list.` : '';
    if (!window.confirm(`Delete this ${photo.hasImage ? 'photo' : 'sample photo'}? This cannot be undone.${extra}`)) return;
    const next = photos[index + 1] ?? photos[index - 1];
    remove('photos', photo.id);
    notify('Photo deleted');
    if (next) setCurrentId(next.id);
    else onClose();
  };

  const go = (step: number) => {
    const next = photos[index + step];
    if (!next) return;
    setCurrentId(next.id);
    setNatural(null);
    setMode({ kind: 'view' });
  };

  const busy = mode.kind !== 'view';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode.kind === 'place' && e.key === 'Escape') return setMode({ kind: 'view' });
      if (busy) return;
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

  const placeAt = (e: MouseEvent<HTMLDivElement>) => {
    if (mode.kind !== 'place') return;
    const r = e.currentTarget.getBoundingClientRect();
    const at = { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
    if (mode.moving) {
      upsert('measurements', { ...mode.moving, pin: { photoId: photo.id, ...at } });
      notify('Label moved');
      setMode({ kind: 'view' });
    } else {
      setMode({ kind: 'annotate', at });
    }
  };

  const src = fullUrl ?? thumbUrl ?? undefined;

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || busy) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className="viewer-bar">
        <span className="viewer-count">{index + 1} / {photos.length}</span>
        <div className="viewer-actions">
          {labels.length > 0 && (
            <button className="viewer-btn" onClick={() => setShowLabels((s) => !s)} aria-label={showLabels ? 'Hide measurements' : 'Show measurements'} aria-pressed={showLabels}>
              {showLabels ? <Eye size={19} /> : <EyeOff size={19} />}
            </button>
          )}
          <button className="viewer-btn" onClick={() => setMode({ kind: 'details' })} aria-label="Edit photo details"><Pencil size={18} /></button>
          <button className="viewer-btn" onClick={deleteThis} aria-label="Delete photo"><Trash2 size={18} /></button>
          <button className="viewer-btn" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
      </header>

      <div className="viewer-stage" ref={stageRef}>
        {photo.hasImage ? (
          !src ? (
            <p className="viewer-wait">{slowPic ? 'This picture isn’t here yet – it may still be uploading from the device it was taken on. Open the app on that device and keep it open until it says “Up to date”.' : 'Loading picture…'}</p>
          ) : (
            <img
              key={photo.id}
              className="viewer-img"
              src={src}
              alt={photo.caption}
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
          )
        ) : (
          <div className="viewer-ph"><PhotoPlaceholder roomId={photo.roomId} label="Sample photo – no image" /></div>
        )}

        {photo.hasImage && box && (
          <div
            className={`anno-layer ${mode.kind === 'place' ? 'placing' : ''}`}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            onClick={placeAt}
          >
            {showLabels &&
              visibleLabels.map((m) => (
                  <AnnotationLabel
                    key={m.id}
                    m={m}
                    placement={placements[m.id]}
                    disabled={mode.kind === 'place'}
                    onClick={() => setMode({ kind: 'annotate', measurement: m })}
                  />
                ))}
            {mode.kind === 'annotate' && mode.at && (
              // Where you tapped, shown while you fill in the form.
              <span className="anno-pending" style={{ left: `${mode.at.x * 100}%`, top: `${mode.at.y * 100}%` }} />
            )}
          </div>
        )}

        {mode.kind === 'place' && (
          <p className="place-hint" role="status"><Ruler size={16} /> Tap the photo where {mode.moving ? 'the label should go' : 'the measurement is'}</p>
        )}
        {!busy && index > 0 && <button className="viewer-nav prev" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={28} /></button>}
        {!busy && index < photos.length - 1 && <button className="viewer-nav next" onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={28} /></button>}
      </div>

      {/* The footer keeps the same size in every mode, so the photo never jumps while you tap. */}
      <footer className="viewer-info">
        <div className="viewer-text">
          <p className="viewer-caption">{photo.caption || roomName(photo.roomId)}</p>
          <p className="viewer-sub">{roomName(photo.roomId)} · {formatDate(photo.date)}</p>
          <div className="viewer-tags"><Badge tone={statusTone[photo.tag]}>{photo.tag}</Badge></div>
        </div>
        {mode.kind === 'place' ? (
          <button className="btn btn-light" onClick={() => setMode({ kind: 'view' })}>Cancel</button>
        ) : (
          photo.hasImage && (
            <button className="btn btn-light" onClick={() => { setShowLabels(true); setMode({ kind: 'place' }); }}>
              <Ruler size={17} /> Add measurement
            </button>
          )
        )}
      </footer>

      {mode.kind === 'details' && <PhotoEditor photo={photo} onClose={() => setMode({ kind: 'view' })} />}
      {mode.kind === 'annotate' && (
        <AnnotationEditor
          photo={photo}
          measurement={mode.measurement}
          at={mode.at}
          onClose={() => setMode({ kind: 'view' })}
          onMove={mode.measurement ? () => setMode({ kind: 'place', moving: mode.measurement }) : undefined}
        />
      )}
    </div>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** A dot on the photo with a small label, e.g. "Dining wall · Width 4,850 mm". */
function AnnotationLabel({ m, placement, onClick, disabled }: { m: Measurement; placement?: Placement; onClick: () => void; disabled: boolean }) {
  const { x, y } = m.pin!;
  const lines = labelLines(m);
  const { side, vert } = placement ?? { side: 'right', vert: 'above' };
  return (
    <button
      type="button"
      className={`anno anno-${side} anno-${vert}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      aria-label={`${m.item}: ${lines.join(', ')}. Tap to edit.`}
    >
      <span className="anno-dot" />
      <span className="anno-label">
        <strong>{m.item}</strong>
        {lines.map((l) => <span key={l}>{l}</span>)}
      </span>
    </button>
  );
}
