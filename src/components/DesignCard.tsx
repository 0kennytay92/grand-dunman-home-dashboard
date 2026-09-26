import { Images } from 'lucide-react';
import { useImageUrl } from '../data/images';
import { useRoomName } from '../data/store';
import type { Design } from '../data/types';
import { formatDate } from '../format';
import { Badge, statusTone } from './ui';

/** The design's render, or its colour swatches when there is no render yet. */
export function DesignImage({ design, variant = 'thumb', contain = false }: { design: Design; variant?: 'thumb' | 'full'; contain?: boolean }) {
  const url = useImageUrl(design.id, variant, !!design.hasImage);
  if (design.hasImage) {
    return <div className={`design-img ${contain ? 'contain' : ''}`}>{url && <img src={url} alt={`${design.title} ${design.version}`} draggable={false} />}</div>;
  }
  const colours = design.palette?.length ? design.palette : ['#e8e2d8', '#cbbfae', '#8f8171'];
  return (
    <div className="design-img placeholder">
      <div className="palette">{colours.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
      <span className="no-render">No render yet</span>
    </div>
  );
}

/** A design in a grid. Tap to open it. */
export function DesignCard({ design: d, showRoom = true, href }: { design: Design; showRoom?: boolean; href: string }) {
  const roomName = useRoomName();
  return (
    <a className={`design-card ${d.status === 'Rejected' ? 'is-rejected' : ''}`} href={href}>
      <div className="design-card-media">
        <DesignImage design={d} />
        <span className="version-chip">{d.version}</span>
        {d.referenceIds.length > 0 && (
          <span className="thumb-badge" title={`${d.referenceIds.length} reference images`}>
            <Images size={12} /> {d.referenceIds.length}
          </span>
        )}
      </div>
      <div className="design-body">
        <div className="room-card-top">
          <h3>{d.title}</h3>
          <Badge tone={statusTone[d.status]}>{d.status}</Badge>
        </div>
        <p className="row-sub">{[showRoom && roomName(d.roomId), d.date && formatDate(d.date)].filter(Boolean).join(' · ')}</p>
      </div>
    </a>
  );
}
