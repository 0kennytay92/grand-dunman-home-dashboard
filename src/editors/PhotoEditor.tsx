import { useState } from 'react';
import { useRoomName, useStore } from '../data/store';
import type { Photo, PhotoTag } from '../data/types';
import { photoTags } from '../data/photoTags';
import { DateInput, EditorModal, FieldRow, SelectInput, TextInput } from '../components/forms';

/** Change a photo's description, room, category or date – or delete it. */
export function PhotoEditor({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [caption, setCaption] = useState(photo.caption);
  const [roomId, setRoomId] = useState(photo.roomId);
  const [tag, setTag] = useState<PhotoTag>(photo.tag);
  const [date, setDate] = useState(photo.date);

  const save = () => {
    upsert('photos', { ...photo, caption: caption.trim(), roomId, tag, date: date || photo.date });
    // Measurements drawn on this photo move with it to its new room.
    if (roomId !== photo.roomId) {
      data.measurements.filter((m) => m.pin?.photoId === photo.id).forEach((m) => upsert('measurements', { ...m, roomId }));
    }
    notify('Photo updated');
    onClose();
  };

  const del = () => {
    const pinned = data.measurements.filter((m) => m.pin?.photoId === photo.id).length;
    const extra = pinned ? `\n\nIts ${pinned} measurement${pinned > 1 ? 's' : ''} will stay in the room's Measurements list.` : '';
    if (!window.confirm(`Delete this photo? This cannot be undone.${extra}`)) return;
    remove('photos', photo.id);
    notify('Photo deleted');
    onClose();
  };

  return (
    <EditorModal title="Photo details" onClose={onClose} onSave={save} onDelete={del}>
      <TextInput label="Description" value={caption} onChange={setCaption} placeholder="e.g. Wardrobe carcass delivered" />
      <SelectInput label="Room" value={roomId} onChange={setRoomId} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
      <FieldRow>
        <SelectInput label="Category" value={tag} onChange={(v) => setTag(v as PhotoTag)} options={photoTags.map((t) => ({ value: t, label: t }))} />
        <DateInput label="Date taken" value={date} onChange={setDate} />
      </FieldRow>
    </EditorModal>
  );
}
