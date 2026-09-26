import { useState } from 'react';
import { newId, useRoomName, useStore } from '../data/store';
import type { Measurement } from '../data/types';
import { EditorModal, FieldRow, NumberInput, SelectInput, TextInput, numText, toNumber } from '../components/forms';

export function MeasurementEditor({ measurement, roomId, onClose }: { measurement?: Measurement; roomId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [room, setRoom] = useState(measurement?.roomId ?? roomId ?? data.rooms[0]?.id ?? '');
  const [item, setItem] = useState(measurement?.item ?? '');
  const [width, setWidth] = useState(numText(measurement?.widthMm));
  const [depth, setDepth] = useState(numText(measurement?.depthMm));
  const [height, setHeight] = useState(numText(measurement?.heightMm));
  const [note, setNote] = useState(measurement?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const dims = { widthMm: toNumber(width), depthMm: toNumber(depth), heightMm: toNumber(height) };
    const e: Record<string, string> = {};
    if (!room) e.room = 'Add a room first.';
    if (!item.trim()) e.item = 'What did you measure? e.g. "Window"';
    for (const [key, v] of Object.entries(dims)) {
      if (v !== undefined && (Number.isNaN(v) || v <= 0)) e[key] = 'Must be a number above 0';
    }
    if (Object.values(dims).every((v) => v === undefined)) e.widthMm = 'Enter at least one size.';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('measurements', { id: measurement?.id ?? newId(), roomId: room, item: item.trim(), ...dims, note: note.trim() || undefined });
    notify(measurement ? 'Measurement updated' : 'Measurement added');
    onClose();
  };

  const del = () => {
    if (!measurement || !window.confirm(`Delete "${measurement.item}"?`)) return;
    remove('measurements', measurement.id);
    notify('Measurement deleted');
    onClose();
  };

  return (
    <EditorModal title={measurement ? 'Edit measurement' : 'Add measurement'} onClose={onClose} onSave={save} onDelete={measurement ? del : undefined}>
      <SelectInput label="Room" value={room} onChange={setRoom} error={errors.room} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
      <TextInput label="What was measured" value={item} onChange={setItem} error={errors.item} placeholder="e.g. Window, Wardrobe wall" autoFocus={!measurement} />
      <p className="field-hint">All sizes in millimetres. Fill in only the ones you need.</p>
      <FieldRow>
        <NumberInput label="Width" value={width} onChange={setWidth} suffix="mm" step="1" error={errors.widthMm} />
        <NumberInput label="Depth" value={depth} onChange={setDepth} suffix="mm" step="1" error={errors.depthMm} />
        <NumberInput label="Height" value={height} onChange={setHeight} suffix="mm" step="1" error={errors.heightMm} />
      </FieldRow>
      <TextInput label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Allow 150 mm for trunking" />
    </EditorModal>
  );
}
