import { useState } from 'react';
import { Move } from 'lucide-react';
import { newId, useStore } from '../data/store';
import { kindInfo } from '../data/measurementKinds';
import type { Measurement, MeasurementKind, Photo } from '../data/types';
import { EditorModal, FieldRow, NumberInput, TextInput, numText, toNumber } from '../components/forms';

const quickKinds: MeasurementKind[] = ['wall', 'window', 'door', 'other'];

/**
 * The short form for a measurement drawn on a photo: a name, a type, width and height.
 * It is saved as a normal measurement of the photo's room, plus where it sits on the photo.
 */
export function AnnotationEditor({ photo, measurement, at, onClose, onMove }: {
  photo: Photo;
  measurement?: Measurement;
  at?: { x: number; y: number }; // where the user tapped, for a new annotation
  onClose: () => void;
  onMove?: () => void;
}) {
  const { data, upsert, remove, notify } = useStore();
  const [name, setName] = useState(measurement?.item ?? '');
  const [kind, setKind] = useState<MeasurementKind>(measurement?.kind ?? 'wall');
  const [width, setWidth] = useState(numText(measurement?.widthMm));
  const [height, setHeight] = useState(numText(measurement?.heightMm));
  const [error, setError] = useState('');

  const save = () => {
    const w = toNumber(width);
    const h = toNumber(height);
    const bad = (v?: number) => v !== undefined && (Number.isNaN(v) || v <= 0 || v > 100_000);
    if (bad(w) || bad(h)) return setError('Sizes must be numbers in mm, e.g. 4850');
    if (w === undefined && h === undefined) return setError('Enter a width or a height.');

    const sameKind = data.measurements.filter((m) => m.roomId === photo.roomId && m.kind === kind && m.id !== measurement?.id).length;
    const pin = measurement?.pin ?? { photoId: photo.id, x: at?.x ?? 0.5, y: at?.y ?? 0.5 };
    upsert('measurements', {
      ...(measurement ?? {}),
      id: measurement?.id ?? newId(),
      roomId: photo.roomId,
      kind,
      item: name.trim() || `${kindInfo[kind].label} ${sameKind + 1}`,
      widthMm: w,
      heightMm: h,
      pin,
    });
    notify(measurement ? 'Measurement updated' : 'Measurement added to photo');
    onClose();
  };

  const del = () => {
    if (!measurement) return;
    if (!window.confirm(`Delete "${measurement.item}"? It will also be removed from the room's measurements.`)) return;
    remove('measurements', measurement.id);
    notify('Measurement deleted');
    onClose();
  };

  return (
    <EditorModal title={measurement ? 'Edit measurement' : 'Add measurement'} onClose={onClose} onSave={save} onDelete={measurement ? del : undefined}>
      <TextInput label="Name" value={name} onChange={setName} placeholder="e.g. Dining wall" />
      <div className="kind-chips" role="radiogroup" aria-label="Type">
        {quickKinds.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={`chip ${kind === k ? 'chip-active' : ''}`} onClick={() => setKind(k)}>
            {kindInfo[k].label}
          </button>
        ))}
      </div>
      <FieldRow>
        <NumberInput label="Width" value={width} onChange={setWidth} suffix="mm" step="1" />
        <NumberInput label="Height" value={height} onChange={setHeight} suffix="mm" step="1" />
      </FieldRow>
      {error && <p className="field-msg">{error}</p>}
      {measurement && onMove && (
        <button type="button" className="btn btn-ghost" onClick={onMove}>
          <Move size={16} /> Move label on photo
        </button>
      )}
    </EditorModal>
  );
}
