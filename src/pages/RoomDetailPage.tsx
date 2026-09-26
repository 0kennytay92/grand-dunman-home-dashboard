import { ChevronLeft } from 'lucide-react';
import { defects, designs, measurements, photos, rooms } from '../data/sampleData';
import { formatDate, roomName } from '../format';
import { href } from '../router';
import { Badge, Card, EmptyState, PageHeader, PhotoPlaceholder, ProgressBar, statusTone } from '../components/ui';
import { dimensions } from './MeasurementsPage';

export function RoomDetailPage({ roomId }: { roomId: string }) {
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return (
      <>
        <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> Rooms</a>
        <EmptyState>That room could not be found.</EmptyState>
      </>
    );
  }

  const roomMeasurements = measurements.filter((m) => m.roomId === room.id);
  const roomPhotos = photos.filter((p) => p.roomId === room.id);
  const roomDesigns = designs.filter((d) => d.roomId === room.id);
  const roomDefects = defects.filter((d) => d.roomId === room.id);

  return (
    <>
      <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> Rooms</a>
      <PageHeader eyebrow={`${room.areaSqm} m²`} title={roomName(room.id)} subtitle={room.notes} action={<Badge tone={statusTone[room.status]}>{room.status}</Badge>} />

      <Card>
        <div className="progress-head">
          <span>Renovation progress</span>
          <strong>{room.progress}%</strong>
        </div>
        <ProgressBar value={room.progress} tone={room.progress === 100 ? 'good' : 'accent'} />
      </Card>

      <div className="grid-2">
        <Card title="Measurements" action={<a className="link" href={href('/measurements')}>All</a>}>
          {roomMeasurements.length === 0 ? (
            <EmptyState>No measurements yet.</EmptyState>
          ) : (
            <ul className="list">
              {roomMeasurements.map((m) => (
                <li key={m.id} className="list-row">
                  <p className="row-title grow">{m.item}</p>
                  <span className="row-meta mono">{dimensions(m)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Defects" action={<a className="link" href={href('/defects')}>All</a>}>
          {roomDefects.length === 0 ? (
            <EmptyState>No defects reported. 🎉</EmptyState>
          ) : (
            <ul className="list">
              {roomDefects.map((d) => (
                <li key={d.id} className="list-row">
                  <div className="grow">
                    <p className="row-title">{d.title}</p>
                    <p className="row-sub">Reported {formatDate(d.reportedOn)}</p>
                  </div>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Interior designs" action={<a className="link" href={href('/designs')}>All</a>}>
          {roomDesigns.length === 0 ? (
            <EmptyState>No designs yet.</EmptyState>
          ) : (
            <ul className="list">
              {roomDesigns.map((d) => (
                <li key={d.id} className="list-row">
                  <div className="swatches small">
                    {d.palette.map((c) => <span key={c} style={{ background: c }} />)}
                  </div>
                  <div className="grow">
                    <p className="row-title">{d.title}</p>
                    <p className="row-sub">{d.style}</p>
                  </div>
                  <Badge tone={statusTone[d.status]}>{d.status}</Badge>
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
    </>
  );
}
