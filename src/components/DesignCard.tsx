import { useRoomName } from '../data/store';
import type { Design } from '../data/types';
import { Badge, statusTone } from './ui';

/** A design concept card with its colour palette. Tap to edit. */
export function DesignCard({ design: d, showRoom = true, onClick }: { design: Design; showRoom?: boolean; onClick: () => void }) {
  const roomName = useRoomName();
  const meta = [showRoom && roomName(d.roomId), d.designer].filter(Boolean).join(' · ');
  return (
    <button type="button" className="design-card card-button" onClick={onClick}>
      <div className="palette">
        {d.palette.map((c, i) => <span key={i} style={{ background: c }} title={c} />)}
      </div>
      <div className="design-body">
        <div className="room-card-top">
          <div>
            {d.style && <p className="eyebrow">{d.style}</p>}
            <h3>{d.title}</h3>
          </div>
          <Badge tone={statusTone[d.status]}>{d.status}</Badge>
        </div>
        {d.notes && <p className="design-notes">{d.notes}</p>}
        {meta && <p className="row-sub">{meta}</p>}
      </div>
    </button>
  );
}
