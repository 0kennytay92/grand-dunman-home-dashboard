import { useState } from 'react';
import { newId, useRoomName, useStore } from '../data/store';
import type { Measurement, MeasurementKind } from '../data/types';
import { kindInfo, kindOrder, type SizeField } from '../data/measurementKinds';
import { EditorModal, FieldRow, NumberInput, SelectInput, TextInput, numText, toNumber } from '../components/forms';

export function MeasurementEditor({ measurement, roomId, kind: startKind, onClose }: {
  measurement?: Measurement;
  roomId?: string;
  kind?: MeasurementKind;
  onClose: () => void;
}) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [room, setRoom] = useState(measurement?.roomId ?? roomId ?? data.rooms[0]?.id ?? '');
  const [kind, setKind] = useState<MeasurementKind>(measurement?.kind ?? startKind ?? 'wall');
  const [item, setItem] = useState(measurement && !kindInfo[measurement.kind].single ? measurement.item : '');
  const [sizes, setSizes] = useState<Record<SizeField, string>>({
    widthMm: numText(measurement?.widthMm),
    depthMm: numText(measurement?.depthMm),
    heightMm: numText(measurement?.heightMm),
    sillMm: numText(measurement?.sillMm),
  });
  const [note, setNote] = useState(measurement?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const info = kindInfo[kind];
  // Room width / length / ceiling height: there is only one per room.
  const existingSingle = info.single ? data.measurements.find((m) => m.roomId === room && m.kind === kind && m.id !== measurement?.id) : undefined;

  const save = () => {
    const e: Record<string, string> = {};
    if (!room) e.room = 'Add a room first.';
    const values: Partial<Record<SizeField, number>> = {};
    for (const { field } of info.fields) {
      const v = toNumber(sizes[field]);
      if (v !== undefined && (Number.isNaN(v) || v <= 0 || v > 100_000)) e[field] = 'Enter a size in mm, e.g. 2400';
      else values[field] = v;
    }
    const mainFields = info.fields.filter((f) => f.field !== 'sillMm');
    if (mainFields.every((f) => values[f.field] === undefined) && !e[mainFields[0].field]) {
      e[mainFields[0].field] = info.single ? 'Enter the measurement in mm.' : 'Enter at least one size.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    // Unnamed walls/doors/windows get a numbered name, e.g. "Window 2".
    const sameKind = data.measurements.filter((m) => m.roomId === room && m.kind === kind && m.id !== measurement?.id).length;
    const name = info.single ? info.label : item.trim() || `${info.label} ${sameKind + 1}`;

    upsert('measurements', {
      id: existingSingle?.id ?? measurement?.id ?? newId(),
      roomId: room,
      kind,
      item: name,
      ...values,
      note: note.trim() || undefined,
    });
    if (existingSingle && measurement) remove('measurements', measurement.id);
    notify(measurement || existingSingle ? 'Measurement updated' : 'Measurement added');
    onClose();
  };

  const del = () => {
    if (!measurement || !window.confirm(`Delete "${measurement.item}"?`)) return;
    remove('measurements', measurement.id);
    notify('Measurement deleted');
    onClose();
  };

  const setSize = (field: SizeField) => (v: string) => setSizes((s) => ({ ...s, [field]: v }));

  return (
    <EditorModal
      title={measurement ? `Edit ${info.label.toLowerCase()}` : `Add ${info.single ? info.label.toLowerCase() : 'measurement'}`}
      onClose={onClose}
      onSave={save}
      onDelete={measurement ? del : undefined}
    >
      <FieldRow>
        <SelectInput label="Room" value={room} onChange={setRoom} error={errors.room} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
        <SelectInput label="Type" value={kind} onChange={(v) => setKind(v as MeasurementKind)} options={kindOrder.map((k) => ({ value: k, label: kindInfo[k].label }))} />
      </FieldRow>

      {!info.single && (
        <TextInput label="Name (optional)" value={item} onChange={setItem} placeholder={info.namePlaceholder} autoFocus={!measurement} />
      )}

      <FieldRow>
        {info.fields.map(({ field, label }) => (
          <NumberInput key={field} label={label} value={sizes[field]} onChange={setSize(field)} suffix="mm" step="1" error={errors[field]} />
        ))}
      </FieldRow>
      <p className="field-hint">
        All sizes in millimetres (1 m = 1,000 mm).
        {kind === 'window' && ' "Height from floor" is where the bottom of the window starts, which helps with curtains and furniture.'}
      </p>
      {existingSingle && (
        <p className="field-note">This room already has a {info.label.toLowerCase()} ({numText(existingSingle[info.fields[0].field])} mm). Saving will replace it.</p>
      )}

      <TextInput label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Measured to the skirting" />
    </EditorModal>
  );
}
