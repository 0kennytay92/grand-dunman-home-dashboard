import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { newId, useRoomName, useStore } from '../data/store';
import type { Design, DesignStatus } from '../data/types';
import { EditorModal, FieldRow, SelectInput, TextArea, TextInput } from '../components/forms';

const statuses: DesignStatus[] = ['Draft', 'Under review', 'Approved'];
const MAX_COLOURS = 6;

export function DesignEditor({ design, roomId, onClose }: { design?: Design; roomId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [title, setTitle] = useState(design?.title ?? '');
  const [room, setRoom] = useState(design?.roomId ?? roomId ?? data.rooms[0]?.id ?? '');
  const [style, setStyle] = useState(design?.style ?? '');
  const [designer, setDesigner] = useState(design?.designer ?? '');
  const [status, setStatus] = useState<DesignStatus>(design?.status ?? 'Draft');
  const [palette, setPalette] = useState<string[]>(design?.palette ?? ['#ede6db', '#b89b76', '#4a4037']);
  const [notes, setNotes] = useState(design?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Please give the design a name.';
    if (!room) e.room = 'Add a room first.';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('designs', { id: design?.id ?? newId(), title: title.trim(), roomId: room, style: style.trim(), designer: designer.trim(), status, palette, notes: notes.trim() });
    notify(design ? 'Design updated' : 'Design added');
    onClose();
  };

  const del = () => {
    if (!design || !window.confirm(`Delete "${design.title}"?`)) return;
    remove('designs', design.id);
    notify('Design deleted');
    onClose();
  };

  return (
    <EditorModal title={design ? 'Edit design' : 'Add design'} onClose={onClose} onSave={save} onDelete={design ? del : undefined}>
      <TextInput label="Design name" value={title} onChange={setTitle} error={errors.title} placeholder="e.g. Warm Minimal Living" autoFocus={!design} />
      <FieldRow>
        <SelectInput label="Room" value={room} onChange={setRoom} error={errors.room} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
        <SelectInput label="Status" value={status} onChange={(v) => setStatus(v as DesignStatus)} options={statuses.map((s) => ({ value: s, label: s }))} />
      </FieldRow>
      <FieldRow>
        <TextInput label="Style" value={style} onChange={setStyle} placeholder="e.g. Japandi" />
        <TextInput label="Designer" value={designer} onChange={setDesigner} placeholder="e.g. Studio name" />
      </FieldRow>
      <div className="field">
        <label>Colour palette</label>
        <div className="palette-edit">
          {palette.map((c, i) => (
            <div key={i} className="swatch-edit">
              <input type="color" value={c} aria-label={`Colour ${i + 1}`} onChange={(e) => setPalette(palette.map((x, j) => (j === i ? e.target.value : x)))} />
              {palette.length > 1 && (
                <button type="button" className="swatch-remove" aria-label={`Remove colour ${i + 1}`} onClick={() => setPalette(palette.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {palette.length < MAX_COLOURS && (
            <button type="button" className="swatch-add" aria-label="Add colour" onClick={() => setPalette([...palette, '#cccccc'])}>
              <Plus size={18} />
            </button>
          )}
        </div>
        <p className="field-hint">Tap a colour to change it.</p>
      </div>
      <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="Materials, finishes, ideas…" />
    </EditorModal>
  );
}
