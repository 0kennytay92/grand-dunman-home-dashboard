import { useState } from 'react';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import type { Design, Measurement } from '../data/types';
import { area } from '../format';
import { href } from '../router';
import { TaskList } from '../components/TaskList';
import { RoomEditor } from '../editors/RoomEditor';
import { MeasurementEditor } from '../editors/MeasurementEditor';
import { DesignEditor } from '../editors/DesignEditor';
import { TaskEditor } from '../editors/TaskEditor';
import { Badge, Card, EmptyState, PageHeader, PhotoPlaceholder, ProgressBar, statusTone } from '../components/ui';
import { dimensions } from './MeasurementsPage';

type Editing =
  | { kind: 'room' }
  | { kind: 'measurement'; item?: Measurement }
  | { kind: 'design'; item?: Design }
  | { kind: 'task' };

export function RoomDetailPage({ roomId }: { roomId: string }) {
  const { data } = useStore();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<Editing | null>(null);
  const room = data.rooms.find((r) => r.id === roomId);

  if (!room) {
    return (
      <>
        <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> Rooms</a>
        <EmptyState>That room could not be found.</EmptyState>
      </>
    );
  }

  const roomMeasurements = data.measurements.filter((m) => m.roomId === room.id);
  const roomPhotos = data.photos.filter((p) => p.roomId === room.id);
  const roomDesigns = data.designs.filter((d) => d.roomId === room.id);
  const close = () => setEditing(null);
  const addLink = (label: string, e: Editing) => (
    <button className="link" onClick={() => setEditing(e)}><Plus size={15} /> {label}</button>
  );

  return (
    <>
      <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> Rooms</a>
      <PageHeader
        eyebrow={area(room.areaSqm) || 'Room'}
        title={roomName(room.id)}
        subtitle={room.notes}
        action={
          <button className="btn btn-ghost" onClick={() => setEditing({ kind: 'room' })}>
            <Pencil size={15} /> Edit
          </button>
        }
      />

      <Card>
        <div className="progress-head">
          <span>Renovation progress</span>
          <span className="progress-head-right">
            <Badge tone={statusTone[room.status]}>{room.status}</Badge>
            <strong>{room.progress}%</strong>
          </span>
        </div>
        <ProgressBar value={room.progress} tone={room.progress === 100 ? 'good' : 'accent'} />
      </Card>

      <div className="grid-2">
        <Card title="Measurements" action={addLink('Add', { kind: 'measurement' })}>
          {roomMeasurements.length === 0 ? (
            <EmptyState>No measurements yet.</EmptyState>
          ) : (
            <ul className="list">
              {roomMeasurements.map((m) => (
                <li key={m.id}>
                  <button className="list-row row-button" onClick={() => setEditing({ kind: 'measurement', item: m })}>
                    <p className="row-title grow">{m.item}</p>
                    <span className="row-meta mono">{dimensions(m)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tasks" action={addLink('Add', { kind: 'task' })}>
          <TaskList roomId={room.id} />
        </Card>

        <Card title="Interior designs" action={addLink('Add', { kind: 'design' })}>
          {roomDesigns.length === 0 ? (
            <EmptyState>No designs yet.</EmptyState>
          ) : (
            <ul className="list">
              {roomDesigns.map((d) => (
                <li key={d.id}>
                  <button className="list-row row-button" onClick={() => setEditing({ kind: 'design', item: d })}>
                    <div className="swatches small">
                      {d.palette.map((c, i) => <span key={i} style={{ background: c }} />)}
                    </div>
                    <div className="grow">
                      <p className="row-title">{d.title}</p>
                      <p className="row-sub">{d.style}</p>
                    </div>
                    <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Photos" action={<a className="link" href={href('/photos')}>All</a>}>
          {roomPhotos.length === 0 ? (
            <EmptyState>No photos yet.</EmptyState>
          ) : (
            <div className="mini-photos">
              {roomPhotos.map((p) => (
                <figure key={p.id}>
                  <PhotoPlaceholder roomId={p.roomId} />
                  <figcaption>{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </Card>
      </div>

      {editing?.kind === 'room' && <RoomEditor room={room} onClose={close} onDeleted={() => (window.location.hash = '/rooms')} />}
      {editing?.kind === 'measurement' && <MeasurementEditor measurement={editing.item} roomId={room.id} onClose={close} />}
      {editing?.kind === 'design' && <DesignEditor design={editing.item} roomId={room.id} onClose={close} />}
      {editing?.kind === 'task' && <TaskEditor roomId={room.id} onClose={close} />}
    </>
  );
}
