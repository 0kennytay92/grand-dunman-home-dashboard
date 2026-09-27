import { Trash2 } from 'lucide-react';
import { useStore } from '../data/store';

/** Offers to remove the example photos (the grey pictures that came with the app) in one go. */
export function SamplePhotosNote({ roomId }: { roomId?: string }) {
  const { data, update, notify } = useStore();
  const samples = data.photos.filter((p) => !p.hasImage && (!roomId || p.roomId === roomId));
  if (!samples.length) return null;
  const n = samples.length;

  const removeAll = () => {
    if (!window.confirm(`Remove ${n === 1 ? 'the sample photo' : `all ${n} sample photos`}${roomId ? ' in this room' : ''}? Your own photos are not affected.`)) return;
    const gone = new Set(samples.map((p) => p.id));
    update((d) => ({
      ...d,
      photos: d.photos.filter((p) => !gone.has(p.id)),
      // Measurements shown on them stay in the room; they just lose their label position.
      measurements: d.measurements.map((m) => (m.pin && gone.has(m.pin.photoId) ? { ...m, pin: undefined } : m)),
    }));
    notify(n === 1 ? 'Sample photo removed' : `${n} sample photos removed`);
  };

  return (
    <div className="banner-info sample-note">
      <span>{n === 1 ? '1 of these is a sample photo' : `${n} of these are sample photos`} (the grey pictures that came with the app).</span>
      <button className="btn btn-ghost small" onClick={removeAll}><Trash2 size={15} /> Remove sample photos</button>
    </div>
  );
}
