import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, LayoutGrid, Palette, Pencil, Ruler, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '../../data/store';
import { useImageUrl } from '../../data/images';
import { roomArea } from '../../data/measurementKinds';
import type { Room } from '../../data/types';
import { area } from '../../format';
import { href } from '../../router';
import { RoomEditor } from '../../editors/RoomEditor';
import { EmptyState, ProgressBar } from '../../components/ui';
import { OverviewTab } from './OverviewTab';
import { PhotosTab } from './PhotosTab';
import { MeasurementsTab } from './MeasurementsTab';
import { DesignsTab } from './DesignsTab';
import { BudgetTab } from './BudgetTab';
import { tabHref, type RoomTab } from './tabs';


const tabs: { id: RoomTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'designs', label: 'Designs', icon: Palette },
  { id: 'budget', label: 'Budget', icon: Wallet },
];

/** One room, with tabs: Overview · Photos · Measurements · Designs · Budget. */
export function RoomPage({ roomId, tab: tabParam }: { roomId: string; tab?: string }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const tabsRef = useRef<HTMLElement>(null);
  const room = data.rooms.find((r) => r.id === roomId);
  const tab: RoomTab = tabs.some((t) => t.id === tabParam) ? (tabParam as RoomTab) : 'overview';

  // On phones the tab strip scrolls sideways: keep the current tab in view.
  useEffect(() => {
    const strip = tabsRef.current;
    const active = strip?.querySelector<HTMLElement>('.room-tab.active');
    if (strip && active) strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }, [tab]);

  if (!room) {
    return (
      <>
        <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> Rooms</a>
        <EmptyState>That room could not be found.</EmptyState>
      </>
    );
  }

  const counts: Partial<Record<RoomTab, number>> = {
    photos: data.photos.filter((p) => p.roomId === room.id).length,
    measurements: data.measurements.filter((m) => m.roomId === room.id).length,
    designs: data.designs.filter((d) => d.roomId === room.id).length,
  };

  return (
    <>
      <a className="back" href={href('/rooms')}><ChevronLeft size={18} /> All rooms</a>
      <RoomCover room={room} onEdit={() => setEditing(true)} />

      <nav className="room-tabs" aria-label="Room sections" ref={tabsRef}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <a key={id} href={tabHref(room.id, id)} className={`room-tab ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={16} strokeWidth={1.9} />
            <span>{label}</span>
            {counts[id] ? <span className="tab-count">{counts[id]}</span> : null}
          </a>
        ))}
      </nav>

      <div className="room-tab-body">
        {tab === 'overview' && <OverviewTab room={room} onEditRoom={() => setEditing(true)} />}
        {tab === 'photos' && <PhotosTab room={room} />}
        {tab === 'measurements' && <MeasurementsTab room={room} />}
        {tab === 'designs' && <DesignsTab room={room} />}
        {tab === 'budget' && <BudgetTab room={room} />}
      </div>

      {editing && <RoomEditor room={room} onClose={() => setEditing(false)} onDeleted={() => (window.location.hash = '/rooms')} />}
    </>
  );
}

/** Banner at the top of the room page, using the room's latest photo when there is one. */
function RoomCover({ room, onEdit }: { room: Room; onEdit: () => void }) {
  const { data } = useStore();
  const cover = data.photos.filter((p) => p.roomId === room.id && p.hasImage).sort((a, b) => b.date.localeCompare(a.date))[0];
  const coverUrl = useImageUrl(cover?.id ?? '', 'full', !!cover);
  const size = area(roomArea(room, data.measurements));

  return (
    <section className="room-cover" style={{ background: `linear-gradient(135deg, hsl(${room.hue} 30% 70%), hsl(${room.hue + 25} 22% 38%))` }}>
      {coverUrl && <img className="room-cover-img" src={coverUrl} alt="" />}
      <div className="room-cover-shade" />
      <div className="room-cover-content">
        <div className="room-cover-top">
          <span className="cover-chip">{room.status}</span>
          <button type="button" className="cover-btn" onClick={onEdit}>
            <Pencil size={15} /> Edit room
          </button>
        </div>
        <div>
          {size && <p className="cover-eyebrow">{size}</p>}
          <h1>{room.name}</h1>
          {room.includes && <p className="cover-sub">with {room.includes}</p>}
          <div className="cover-progress">
            <ProgressBar value={room.progress} tone={room.progress === 100 ? 'good' : 'accent'} />
            <span>{room.progress}% complete</span>
          </div>
        </div>
      </div>
    </section>
  );
}
