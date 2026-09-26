import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import { totalsFor } from '../../data/budget';
import { inUnit, roomArea, roomSize } from '../../data/measurementKinds';
import type { Room } from '../../data/types';
import { money } from '../../format';
import { TaskList } from '../../components/TaskList';
import { PhotoThumb } from '../../components/PhotoThumb';
import { TaskEditor } from '../../editors/TaskEditor';
import { Card, EmptyState } from '../../components/ui';
import { tabHref } from './tabs';

export function OverviewTab({ room, onEditRoom }: { room: Room; onEditRoom: () => void }) {
  const { data } = useStore();
  const [addingTask, setAddingTask] = useState(false);

  const { width, length, ceiling } = roomSize(data.measurements, room.id);
  const floor = roomArea(room, data.measurements);
  const roomMoney = totalsFor(data.purchases.filter((i) => i.roomId === room.id), data.payments);
  const latestPhotos = data.photos.filter((p) => p.roomId === room.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const designs = data.designs.filter((d) => d.roomId === room.id);
  const selected = designs.filter((d) => d.status === 'Selected').length;
  const m = (v?: number) => (v === undefined ? undefined : `${inUnit(v, 'm')} m`);

  const facts = [
    { label: 'Floor area', value: floor ? `${floor} m²` : '—', sub: width?.widthMm && length?.depthMm ? 'From width × length' : 'Not measured yet', tab: 'measurements' as const },
    { label: 'Room size', value: width?.widthMm && length?.depthMm ? `${m(width.widthMm)} × ${m(length.depthMm)}` : '—', sub: 'Width × length', tab: 'measurements' as const },
    { label: 'Ceiling height', value: m(ceiling?.heightMm) ?? '—', sub: ceiling ? 'Measured' : 'Not measured yet', tab: 'measurements' as const },
    { label: 'Budget', value: roomMoney.itemCount ? money(roomMoney.total) : '—', sub: roomMoney.itemCount ? `${money(roomMoney.paid)} paid${roomMoney.tbdCount ? ` · ${roomMoney.tbdCount} TBD` : ''}` : 'No items yet', tab: 'budget' as const },
    { label: 'Designs', value: String(designs.length), sub: designs.length ? `${selected} selected` : 'None yet', tab: 'designs' as const },
  ];

  return (
    <>
      <div className="fact-grid">
        {facts.map((f) => (
          <a key={f.label} className="fact" href={tabHref(room.id, f.tab)}>
            <span className="fact-label">{f.label}</span>
            <span className="fact-value">{f.value}</span>
            <span className="fact-sub">{f.sub}</span>
          </a>
        ))}
      </div>

      <div className="grid-2">
        <Card title="Notes" action={<button className="link" onClick={onEditRoom}>Edit</button>}>
          {room.notes ? <p className="notes-text">{room.notes}</p> : <EmptyState>No notes yet.</EmptyState>}
        </Card>

        <Card title="Tasks" action={<button className="link" onClick={() => setAddingTask(true)}><Plus size={15} /> Add</button>}>
          <TaskList roomId={room.id} />
        </Card>
      </div>

      <Card title="Latest photos" action={<a className="link" href={tabHref(room.id, 'photos')}>All photos <ChevronRight size={15} /></a>}>
        {latestPhotos.length === 0 ? (
          <EmptyState>No photos yet. Add some in the Photos tab.</EmptyState>
        ) : (
          <div className="photo-strip four">
            {latestPhotos.map((p) => (
              <a key={p.id} href={tabHref(room.id, 'photos')} aria-label={p.caption || 'Photo'}>
                <PhotoThumb photo={p} />
              </a>
            ))}
          </div>
        )}
      </Card>

      {addingTask && <TaskEditor roomId={room.id} onClose={() => setAddingTask(false)} />}
    </>
  );
}
