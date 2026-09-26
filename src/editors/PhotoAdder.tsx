import { useEffect, useRef, useState, type ReactNode } from 'react';
import { putImages, processPhoto, requestPersistentStorage } from '../data/images';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import type { PhotoTag } from '../data/types';
import { DateInput, EditorModal, FieldRow, SelectInput, TextInput } from '../components/forms';
import { photoTags } from './PhotoEditor';

/**
 * Wraps an "Add photos" button. Tapping it opens the phone's
 * Take Photo / Photo Library picker, then a short form to label the photos.
 */
export function PhotoAdder({ roomId, children }: { roomId?: string; children: (open: () => void) => ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  return (
    <>
      {children(() => input.current?.click())}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {files.length > 0 && <PhotoUploadForm files={files} roomId={roomId} onClose={() => setFiles([])} />}
    </>
  );
}

function PhotoUploadForm({ files, roomId, onClose }: { files: File[]; roomId?: string; onClose: () => void }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const [room, setRoom] = useState(roomId ?? data.rooms[0]?.id ?? '');
  const [tag, setTag] = useState<PhotoTag>('Progress');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(todayIso());
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const save = async () => {
    if (progress !== null) return; // already saving
    if (!room) {
      setError('Add a room first.');
      return;
    }
    setError('');
    requestPersistentStorage();
    let saved = 0;
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress(i + 1);
      try {
        const { full, thumb } = await processPhoto(file);
        const id = newId();
        await putImages(id, full, thumb);
        upsert('photos', { id, roomId: room, tag, caption: caption.trim(), date: date || todayIso(), hasImage: true });
        saved++;
      } catch {
        failed.push(file.name);
      }
    }
    setProgress(null);
    if (failed.length) {
      setError(`${failed.length} photo${failed.length > 1 ? 's' : ''} could not be saved (${failed.join(', ')}). The file may not be a photo, or the device may be out of space.`);
      if (!saved) return;
    }
    notify(saved === 1 ? 'Photo added' : `${saved} photos added`);
    if (!failed.length) onClose();
  };

  const n = files.length;
  return (
    <EditorModal title={n === 1 ? 'Add photo' : `Add ${n} photos`} onClose={progress === null ? onClose : () => {}} onSave={save}>
      <div className="upload-previews">
        {previews.map((u, i) => <img key={u} src={u} alt={`Selected photo ${i + 1}`} />)}
      </div>
      <SelectInput label="Room" value={room} onChange={setRoom} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
      <FieldRow>
        <SelectInput label="Type" value={tag} onChange={(v) => setTag(v as PhotoTag)} options={photoTags.map((t) => ({ value: t, label: t }))} />
        <DateInput label="Date taken" value={date} onChange={setDate} />
      </FieldRow>
      <TextInput label="Caption (optional)" value={caption} onChange={setCaption} placeholder="e.g. Wardrobe carcass delivered" hint={n > 1 ? 'Used for all selected photos. You can change each one later.' : undefined} />
      {progress !== null && <p className="upload-status">Saving photo {progress} of {n}…</p>}
      {error && <p className="field-msg">{error}</p>}
    </EditorModal>
  );
}
