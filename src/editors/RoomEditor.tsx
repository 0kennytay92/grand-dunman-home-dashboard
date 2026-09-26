import { useState } from 'react';
import { newId, useStore } from '../data/store';
import type { Room, RoomStatus } from '../data/types';
import { roomSize } from '../data/measurementKinds';
import { EditorModal, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';

const statuses: RoomStatus[] = ['Not started', 'Planning', 'In progress', 'Completed'];

export function RoomEditor({ room, onClose, onDeleted }: { room?: Room; onClose: () => void; onDeleted?: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const [name, setName] = useState(room?.name ?? '');
  const [includes, setIncludes] = useState(room?.includes ?? '');
  const [area, setArea] = useState(room?.areaSqm ? numText(room.areaSqm) : '');
  const [status, setStatus] = useState<RoomStatus>(room?.status ?? 'Not started');
  const [budget, setBudget] = useState(room?.budget ? numText(room.budget) : '');
  const [progress, setProgress] = useState(room?.progress ?? 0);
  const [notes, setNotes] = useState(room?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const measuredArea = room ? roomSize(data.measurements, room.id).areaSqm : undefined;

  const changeStatus = (s: RoomStatus) => {
    setStatus(s);
    if (s === 'Completed') setProgress(100);
    if (s === 'Not started') setProgress(0);
  };

  const save = () => {
    const areaNum = toNumber(area) ?? 0;
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please give the room a name.';
    if (Number.isNaN(areaNum) || areaNum < 0) e.area = 'Enter a number, e.g. 12.5';
    const budgetNum = toNumber(budget) ?? 0;
    if (Number.isNaN(budgetNum) || budgetNum < 0) e.budget = 'Enter an amount, e.g. 8000';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('rooms', {
      id: room?.id ?? newId(),
      hue: room?.hue ?? Math.floor(Math.random() * 360),
      name: name.trim(),
      includes: includes.trim() || undefined,
      areaSqm: areaNum,
      status,
      progress,
      budget: budgetNum || undefined,
      notes: notes.trim(),
    });
    notify(room ? 'Room updated' : 'Room added');
    onClose();
  };

  const del = () => {
    if (!room) return;
    const linked = data.measurements.filter((m) => m.roomId === room.id).length + data.designs.filter((d) => d.roomId === room.id).length + data.photos.filter((p) => p.roomId === room.id).length;
    const extra = linked ? `\n\nIts ${linked} linked measurements, designs and photos will also be deleted.` : '';
    if (!window.confirm(`Delete "${room.name}"?${extra}`)) return;
    remove('rooms', room.id);
    notify('Room deleted');
    onClose();
    onDeleted?.();
  };

  return (
    <EditorModal title={room ? 'Edit room' : 'Add room'} onClose={onClose} onSave={save} onDelete={room ? del : undefined}>
      <TextInput label="Room name" value={name} onChange={setName} error={errors.name} placeholder="e.g. Study" autoFocus={!room} />
      <TextInput label="Includes (optional)" value={includes} onChange={setIncludes} placeholder="e.g. Master Bath" hint="Attached spaces shown with the room name" />
      <FieldRow>
        <NumberInput label="Floor area" value={area} onChange={setArea} suffix="m²" error={errors.area} hint={measuredArea ? `Measured: ${measuredArea} m² (width × length) – this is shown instead` : 'Worked out for you once room width and length are measured'} />
        <NumberInput label="Room budget" value={budget} onChange={setBudget} suffix="S$" error={errors.budget} />
      </FieldRow>
      <SelectInput label="Status" value={status} onChange={(v) => changeStatus(v as RoomStatus)} options={statuses.map((s) => ({ value: s, label: s }))} />
      <div className="field">
        <label htmlFor="room-progress">Progress: <strong>{progress}%</strong></label>
        <input id="room-progress" className="range" type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
      </div>
      <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="What's happening in this room?" />
    </EditorModal>
  );
}
