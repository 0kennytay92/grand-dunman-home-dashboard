import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRoomName, useStore } from '../../data/store';
import { designStatuses } from '../../data/designs';
import { useImageUrl } from '../../data/images';
import type { Design, DesignStatus } from '../../data/types';
import { formatDate } from '../../format';
import { DesignImage } from '../../components/DesignCard';
import { LinkedText } from '../../components/LinkedText';
import { Chips, EmptyState, PageHeader } from '../../components/ui';
import { tabHref } from '../room/tabs';
import { designHref } from './links';

const modes = ['Side by side', 'Slider'] as const;

/** Compare several renders for one room. */
export function ComparePage({ roomId }: { roomId: string }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const room = data.rooms.find((r) => r.id === roomId);
  const designs = data.designs
    .filter((d) => d.roomId === roomId)
    .sort((a, b) => a.title.localeCompare(b.title) || a.version.localeCompare(b.version, undefined, { numeric: true }));

  // Start with the designs that are still in the running (not rejected), up to 4.
  const [picked, setPicked] = useState<string[]>(() => {
    const live = designs.filter((d) => d.status !== 'Rejected');
    return (live.length >= 2 ? live : designs).slice(0, 4).map((d) => d.id);
  });
  const [mode, setMode] = useState<(typeof modes)[number]>('Side by side');

  if (!room) return <EmptyState>Room not found.</EmptyState>;

  const chosen = picked.map((id) => designs.find((d) => d.id === id)).filter(Boolean) as Design[];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const setStatus = (d: Design, status: DesignStatus) => {
    upsert('designs', { ...d, status });
    notify(`${d.title} ${d.version}: ${status}`);
  };
  const canSlide = chosen.length === 2 && chosen.every((d) => d.hasImage);

  return (
    <>
      <a className="back" href={tabHref(roomId, 'designs')}><ChevronLeft size={18} /> {roomName(roomId)} designs</a>
      <PageHeader eyebrow="Compare renders" title={roomName(roomId)} subtitle="Tap designs below to add or remove them from the comparison." />

      <div className="compare-picker">
        {designs.map((d) => (
          <button key={d.id} type="button" className={`chip ${picked.includes(d.id) ? 'chip-active' : ''}`} aria-pressed={picked.includes(d.id)} onClick={() => toggle(d.id)}>
            {d.title} {d.version}
          </button>
        ))}
      </div>

      {chosen.length === 2 && (
        <div className="toolbar">
          <Chips options={modes} value={canSlide ? mode : 'Side by side'} onChange={setMode} />
          {!canSlide && <span className="row-sub">The slider needs a render on both designs.</span>}
        </div>
      )}

      {chosen.length < 2 ? (
        <EmptyState>Pick at least two designs to compare.</EmptyState>
      ) : canSlide && mode === 'Slider' ? (
        <SliderCompare a={chosen[0]} b={chosen[1]} />
      ) : (
        <div className={`compare-grid cols-${Math.min(chosen.length, 4)}`}>
          {chosen.map((d) => (
            <article key={d.id} className="compare-col">
              <a href={designHref(d.id)} className="compare-img" aria-label={`Open ${d.title} ${d.version}`}>
                <DesignImage design={d} variant="full" contain />
              </a>
              <div className="compare-body">
                <h3>{d.title} <span className="version-inline">{d.version}</span></h3>
                {d.date && <p className="row-sub">{formatDate(d.date)}</p>}
                <select
                  className={`input select status-select s-${d.status.toLowerCase()}`}
                  value={d.status}
                  onChange={(e) => setStatus(d, e.target.value as DesignStatus)}
                  aria-label={`Status of ${d.title} ${d.version}`}
                >
                  {designStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {d.notes && <p className="compare-notes"><LinkedText text={d.notes} /></p>}
                {d.prompt && (
                  <details className="compare-prompt">
                    <summary>Prompt</summary>
                    <p>{d.prompt}</p>
                  </details>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/** Two renders on top of each other; drag the handle to wipe between them. */
function SliderCompare({ a, b }: { a: Design; b: Design }) {
  const [pos, setPos] = useState(50);
  const urlA = useImageUrl(a.id, 'full');
  const urlB = useImageUrl(b.id, 'full');
  return (
    <div className="slider-compare">
      <div className="slider-frame">
        {urlB && <img src={urlB} alt={`${b.title} ${b.version}`} draggable={false} />}
        {urlA && <img className="slider-top" src={urlA} alt={`${a.title} ${a.version}`} draggable={false} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
        <div className="slider-line" style={{ left: `${pos}%` }} />
        <span className="slider-tag left">{a.title} {a.version}</span>
        <span className="slider-tag right">{b.title} {b.version}</span>
        <input className="slider-range" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Slide to compare the two renders" />
      </div>
      <p className="row-sub center">Drag the handle across the picture to compare.</p>
    </div>
  );
}
