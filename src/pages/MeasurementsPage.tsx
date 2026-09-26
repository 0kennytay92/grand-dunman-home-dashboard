import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import type { Measurement } from '../data/types';
import { mm } from '../format';
import { href } from '../router';
import { AddButton } from '../components/forms';
import { MeasurementEditor } from '../editors/MeasurementEditor';
import { Card, Chips, EmptyState, PageHeader } from '../components/ui';

const units = ['mm', 'cm', 'm'] as const;
type Unit = (typeof units)[number];

function inUnit(value: number, unit: Unit) {
  if (unit === 'mm') return mm(value);
  if (unit === 'cm') return (value / 10).toLocaleString('en-SG');
  return (value / 1000).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** e.g. "4,800 W × 5,800 D mm" */
export function dimensions(m: Measurement, unit: Unit = 'mm') {
  const parts = [
    m.widthMm !== undefined && `${inUnit(m.widthMm, unit)} W`,
    m.depthMm !== undefined && `${inUnit(m.depthMm, unit)} D`,
    m.heightMm !== undefined && `${inUnit(m.heightMm, unit)} H`,
  ].filter(Boolean);
  return `${parts.join(' × ')} ${unit}`;
}

export function MeasurementsPage() {
  const { rooms, measurements } = useStore().data;
  const roomName = useRoomName();
  const [unit, setUnit] = useState<Unit>('mm');
  const [roomId, setRoomId] = useState('all');
  const [editing, setEditing] = useState<{ item?: Measurement; roomId?: string } | null>(null);

  const grouped = rooms
    .filter((r) => roomId === 'all' || r.id === roomId)
    .map((r) => ({ room: r, items: measurements.filter((m) => m.roomId === r.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader eyebrow="Site survey" title="Measurements" subtitle={`${measurements.length} measurements across ${rooms.length} rooms`}
        action={<AddButton label="Add" onClick={() => setEditing({ roomId: roomId === 'all' ? undefined : roomId })} />}
      />

      <div className="toolbar">
        <select className="select" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Filter by room">
          <option value="all">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{roomName(r.id)}</option>
          ))}
        </select>
        <Chips options={units} value={unit} onChange={setUnit} />
      </div>

      {grouped.length === 0 && <EmptyState>No measurements yet. Tap "Add" to record one.</EmptyState>}

      <div className="stack">
        {grouped.map(({ room, items }) => (
          <Card
            key={room.id}
            title={roomName(room.id)}
            action={
              <span className="card-actions">
                <a className="link" href={href(`/rooms/${room.id}`)}>View room</a>
                <button className="icon-btn small" aria-label={`Add measurement to ${room.name}`} onClick={() => setEditing({ roomId: room.id })}><Plus size={17} /></button>
              </span>
            }
          >
            <ul className="list">
              {items.map((m) => (
                <li key={m.id}>
                  <button className="list-row wrap row-button" onClick={() => setEditing({ item: m })}>
                    <div className="grow">
                      <p className="row-title">{m.item}</p>
                      {m.note && <p className="row-sub">{m.note}</p>}
                    </div>
                    <span className="dims mono">{dimensions(m, unit)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {editing && <MeasurementEditor measurement={editing.item} roomId={editing.roomId} onClose={() => setEditing(null)} />}
    </>
  );
}
