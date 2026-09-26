import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import { formatMeasurement, inUnit, kindInfo, listKinds, roomSize, singleKinds, units } from '../../data/measurementKinds';
import { useUnit } from '../../data/useUnit';
import type { Measurement, MeasurementKind, Room } from '../../data/types';
import { MeasurementEditor } from '../../editors/MeasurementEditor';
import { Card, Chips, EmptyState } from '../../components/ui';

export function MeasurementsTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [unit, setUnit] = useUnit();
  const [editing, setEditing] = useState<{ item?: Measurement; kind?: MeasurementKind } | null>(null);

  const mine = data.measurements.filter((m) => m.roomId === room.id);
  const size = roomSize(data.measurements, room.id);
  const singles = { roomWidth: size.width, roomLength: size.length, ceilingHeight: size.ceiling };

  return (
    <>
      <div className="toolbar spread">
        <Chips options={units} value={unit} onChange={setUnit} />
        <button className="btn btn-primary" onClick={() => setEditing({ kind: 'wall' })}>
          <Plus size={17} /> Add measurement
        </button>
      </div>

      <Card title="Room size">
        <div className="size-grid">
          {singleKinds.map((k) => {
            const m = singles[k as keyof typeof singles];
            return (
              <button key={k} type="button" className={`size-tile ${m ? '' : 'empty'}`} onClick={() => setEditing(m ? { item: m } : { kind: k })}>
                <span className="fact-label">{kindInfo[k].label}</span>
                {m ? <span className="size-value">{formatMeasurement(m, unit)}</span> : <span className="size-add"><Plus size={16} /> Add</span>}
              </button>
            );
          })}
        </div>
        <p className="size-area">
          {size.areaSqm ? (
            <>
              Floor area: {inUnit(size.width!.widthMm!, 'm')} m × {inUnit(size.length!.depthMm!, 'm')} m = <strong>{size.areaSqm} m²</strong>
            </>
          ) : (
            'Add the room width and length to work out the floor area.'
          )}
        </p>
      </Card>

      <div className="grid-2">
        {listKinds.map((k) => {
          const items = mine.filter((m) => m.kind === k);
          const info = kindInfo[k];
          return (
            <Card
              key={k}
              title={`${info.plural}${items.length ? ` (${items.length})` : ''}`}
              action={<button className="link" onClick={() => setEditing({ kind: k })}><Plus size={15} /> Add {info.label.toLowerCase()}</button>}
            >
              {items.length === 0 ? (
                <EmptyState>No {info.plural.toLowerCase()} measured yet.</EmptyState>
              ) : (
                <ul className="list">
                  {items.map((m) => (
                    <li key={m.id}>
                      <button className="list-row wrap row-button" onClick={() => setEditing({ item: m })}>
                        <div className="grow">
                          <p className="row-title">{m.item}</p>
                          {m.note && <p className="row-sub">{m.note}</p>}
                        </div>
                        <span className="dims mono">{formatMeasurement(m, unit)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {editing && <MeasurementEditor measurement={editing.item} kind={editing.kind} roomId={room.id} onClose={() => setEditing(null)} />}
    </>
  );
}
