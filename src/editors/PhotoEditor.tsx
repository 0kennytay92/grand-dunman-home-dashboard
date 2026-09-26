import { useState } from 'react';
import { useRoomName, useStore } from '../data/store';
import type { Photo, PhotoTag } from '../data/types';
import { DateInput, EditorModal, FieldRow, SelectInput, TextInput } from '../components/forms';

export const photoTags: PhotoTag[] = ['Before', 'Progress', 'Inspiration'];

/** Change a photo's caption, room, type or date – or delete it. */
export function PhotoEditor({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [caption, setCaption] = useState(photo.caption);
  const [roomId, setRoomId] = useState(photo.roomId);
  const [tag, setTag] = useState<PhotoTag>(photo.tag);
  const [date, setDate] = useState(photo.date);

  const save = () => {
    upsert('photos', { ...photo, caption: caption.trim(), roomId, tag, date: date || photo.date });
    notify('Photo updated');
    onClose();
  };

  const del = () => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    remove('photos', photo.id);
    notify('Photo deleted');
    onClose();
  };

  return (
    <EditorModal title="Photo details" onClose={onClose} onSave={save} onDelete={del}>
      <TextInput label="Caption" value={caption} onChange={setCaption} placeholder="e.g. Wardrobe carcass delivered" />
      <SelectInput label="Room" value={roomId} onChange={setRoomId} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
      <FieldRow>
        <SelectInput label="Type" value={tag} onChange={(v) => setTag(v as PhotoTag)} options={photoTags.map((t) => ({ value: t, label: t }))} />
        <DateInput label="Date taken" value={date} onChange={setDate} />
      </FieldRow>
    </EditorModal>
  );
}
