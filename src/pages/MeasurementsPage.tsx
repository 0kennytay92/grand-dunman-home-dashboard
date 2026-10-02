import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import { formatMeasurement, kindInfo, kindOrder, units } from '../data/measurementKinds';
import { useUnit } from '../data/useUnit';
import type { Measurement } from '../data/types';
import { AddButton } from '../components/forms';
import { MeasurementEditor } from '../editors/MeasurementEditor';
import { Card, Chips, EmptyState, PageHeader } from '../components/ui';
import { tabHref } from './room/tabs';

/** Every room's measurements on one page. */
export function MeasurementsPage() {
  const { rooms, measurements } = useStore().data;
  const roomName = useRoomName();
  const [unit, setUnit] = useUnit();
  const [roomId, setRoomId] = useState('all');
  const [editing, setEditing] = useState<{ item?: Measurement; roomId?: string } | null>(null);

  const grouped = rooms
    .filter((r) => roomId === 'all' || r.id === roomId)
    .map((r) => ({
      room: r,
      items: measurements.filter((m) => m.roomId === r.id).sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Site survey"
        title="Measurements"
        subtitle={`${measurements.length} measurements across ${rooms.length} rooms`}
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
                <a className="link" href={tabHref(room.id, 'measurements')}>Open room</a>
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
                      <p className="row-sub">{m.fromPlan && <span className="from-plan">from plan</span>}{[!kindInfo[m.kind].single && kindInfo[m.kind].label, m.pin && 'On a photo', m.note].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="dims mono">{formatMeasurement(m, unit)}</span>
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
