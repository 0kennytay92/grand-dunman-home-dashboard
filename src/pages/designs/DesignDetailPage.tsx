import { useState } from 'react';
import { Check, ChevronLeft, Columns2, Copy, CopyPlus, Maximize2, Pencil } from 'lucide-react';
import { useRoomName, useStore } from '../../data/store';
import { designStatuses } from '../../data/designs';
import { useImageUrl } from '../../data/images';
import type { Design } from '../../data/types';
import { formatDate } from '../../format';
import { copyText } from '../../copy';
import { href } from '../../router';
import { DesignEditor } from '../../editors/DesignEditor';
import { DesignCard, DesignImage } from '../../components/DesignCard';
import { ImageLightbox } from '../../components/ImageLightbox';
import { Card, EmptyState } from '../../components/ui';
import { tabHref } from '../room/tabs';
import { compareHref, designHref } from './links';

export function DesignDetailPage({ designId }: { designId: string }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<'edit' | 'version' | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: { id: string; caption?: string }[]; start: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const d = data.designs.find((x) => x.id === designId);

  if (!d) {
    return (
      <>
        <a className="back" href={href('/designs')}><ChevronLeft size={18} /> Interior Designs</a>
        <EmptyState>This design could not be found. It may have been deleted.</EmptyState>
      </>
    );
  }

  const roomDesigns = data.designs.filter((x) => x.roomId === d.roomId);
  const others = roomDesigns
    .filter((x) => x.id !== d.id)
    .sort((a, b) => Number(b.title === d.title) - Number(a.title === d.title) || a.version.localeCompare(b.version, undefined, { numeric: true }));

  const setStatus = (status: Design['status']) => {
    upsert('designs', { ...d, status });
    notify(`Marked as ${status}`);
  };

  const copyPrompt = async () => {
    if (await copyText(d.prompt)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else notify('Could not copy – select the text instead');
  };

  return (
    <>
      <a className="back" href={tabHref(d.roomId, 'designs')}><ChevronLeft size={18} /> {roomName(d.roomId)} designs</a>

      <header className="design-head">
        <div>
          <p className="eyebrow">{roomName(d.roomId)}</p>
          <h1>{d.title} <span className="version-inline">{d.version}</span></h1>
          <p className="row-sub">{d.date ? formatDate(d.date) : 'No date'}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setEditing('edit')}><Pencil size={15} /> Edit</button>
          <button className="btn btn-ghost" onClick={() => setEditing('version')}><CopyPlus size={15} /> New version</button>
          {roomDesigns.length >= 2 && <a className="btn btn-ghost" href={compareHref(d.roomId)}><Columns2 size={15} /> Compare</a>}
        </div>
      </header>

      <div className="design-detail">
        <div className="design-hero">
          {d.hasImage ? (
            <button type="button" className="design-hero-btn" onClick={() => setLightbox({ ids: [{ id: d.id, caption: `${d.title} ${d.version}` }], start: 0 })} aria-label="View render full screen">
              <DesignImage design={d} variant="full" contain />
              <span className="hero-zoom"><Maximize2 size={16} /></span>
            </button>
          ) : (
            <button type="button" className="design-hero-btn" onClick={() => setEditing('edit')}>
              <DesignImage design={d} />
              <span className="hero-add">Tap to add the render</span>
            </button>
          )}
        </div>

        <div className="design-side">
          <Card title="Status">
            <div className="status-switch" role="radiogroup" aria-label="Status">
              {designStatuses.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={d.status === s} className={`status-opt s-${s.toLowerCase()} ${d.status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Description">
            {d.notes ? <p className="notes-text">{d.notes}</p> : <EmptyState>No description yet.</EmptyState>}
          </Card>

          <Card
            title="Design prompt"
            action={d.prompt ? <button className="link" onClick={copyPrompt}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button> : undefined}
          >
            {d.prompt ? <p className="prompt-text">{d.prompt}</p> : <EmptyState>No prompt saved.</EmptyState>}
          </Card>
        </div>
      </div>

      <Card title={`Reference images${d.referenceIds.length ? ` (${d.referenceIds.length})` : ''}`} action={<button className="link" onClick={() => setEditing('edit')}>{d.referenceIds.length ? 'Change' : 'Add'}</button>}>
        {d.referenceIds.length === 0 ? (
          <EmptyState>No reference images. Add the photos or inspiration this design was based on.</EmptyState>
        ) : (
          <div className="ref-grid view">
            {d.referenceIds.map((id, i) => (
              <button key={id} type="button" className="ref-item" onClick={() => setLightbox({ ids: d.referenceIds.map((r, n) => ({ id: r, caption: `Reference ${n + 1}` })), start: i })}>
                <RefThumb id={id} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {others.length > 0 && (
        <>
          <h2 className="section-title">Other designs for the {roomName(d.roomId)}</h2>
          <div className="design-grid">
            {others.map((x) => <DesignCard key={x.id} design={x} showRoom={false} href={designHref(x.id)} />)}
          </div>
        </>
      )}

      {editing === 'edit' && <DesignEditor design={d} onClose={() => setEditing(null)} />}
      {editing === 'version' && <DesignEditor from={d} onClose={() => setEditing(null)} onSaved={(id) => (window.location.hash = `/designs/${id}`)} />}
      {lightbox && <ImageLightbox images={lightbox.ids} start={lightbox.start} onClose={() => setLightbox(null)} />}
    </>
  );
}

function RefThumb({ id }: { id: string }) {
  const url = useImageUrl(id, 'thumb');
  return <div className="thumb-box">{url && <img src={url} alt="Reference" />}</div>;
}
