import { useState } from 'react';
import { requestPersistentStorage } from '../data/images';
import { savePackImages, type DesignPack } from '../data/designPack';
import { sampleData } from '../data/sampleData';
import { useRoomName, useStore } from '../data/store';
import { EditorModal } from '../components/forms';

const exampleIds = new Set(sampleData.designs.map((d) => d.id));

/** Adds the designs (and floor plan drawing) from a design file. Your other data is kept. */
export function PackImport({ pack, fileName, onClose }: { pack: DesignPack; fileName: string; onClose: () => void }) {
  const { data, update, remove, notify } = useStore();
  const roomName = useRoomName();
  const packRooms = [...new Set(pack.designs.map((d) => d.roomId))];
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(packRooms.map((r) => [r, data.rooms.some((x) => x.id === r) ? r : ''])),
  );
  const examples = data.designs.filter((d) => exampleIds.has(d.id));
  const [removeExamples, setRemoveExamples] = useState(examples.length > 0);
  const [useFloorPlan, setUseFloorPlan] = useState(!!pack.floorPlan);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState('');

  const already = pack.designs.filter((d) => data.designs.some((x) => x.id === d.id)).length;

  const doImport = async () => {
    if (progress) return;
    if (packRooms.some((r) => !mapping[r])) return setError('Choose a room for each group.');
    setError('');
    requestPersistentStorage();
    try {
      const designs = pack.designs.map((d) => ({ ...d, roomId: mapping[d.roomId] }));
      await savePackImages(pack, designs, useFloorPlan, (done, total) => setProgress(`Saving pictures ${done} of ${total}…`));
      update((d) => {
        const byId = new Map(d.designs.map((x) => [x.id, x]));
        designs.forEach((x) => byId.set(x.id, x)); // re-importing the same file updates, never duplicates
        return { ...d, designs: [...byId.values()], floorPlan: useFloorPlan && pack.floorPlan ? pack.floorPlan : d.floorPlan };
      });
      if (removeExamples) examples.forEach((x) => remove('designs', x.id));
      notify(`${designs.length} designs added`);
      onClose();
    } catch (e) {
      setProgress(null);
      setError(`${(e as Error).message || 'Something went wrong.'} Your existing data was not changed.`);
    }
  };

  return (
    <EditorModal title="Add designs from file" onClose={progress ? () => {} : onClose} onSave={doImport} saveLabel={`Add ${pack.designs.length} designs`}>
      <p className="card-text">
        <strong>{pack.name}</strong> ({fileName}): {pack.designs.length} designs for {packRooms.length} rooms
        {pack.floorPlan ? ', plus your floor plan drawing' : ''}. They'll be <strong>added</strong> — nothing you already have is replaced.
        {already > 0 && ` ${already} of them are already in the app and will be updated.`}
      </p>

      <div className="pack-rooms">
        {packRooms.map((r) => (
          <div key={r} className="pack-room">
            <div className="grow">
              <p className="row-title">{pack.rooms[r] ?? r}</p>
              <p className="row-sub">{pack.designs.filter((d) => d.roomId === r).length} designs</p>
            </div>
            <select
              className={`input select ${mapping[r] ? '' : 'needs-room'}`}
              value={mapping[r]}
              onChange={(e) => setMapping({ ...mapping, [r]: e.target.value })}
              aria-label={`Room for ${pack.rooms[r] ?? r}`}
            >
              <option value="">Choose room…</option>
              {data.rooms.map((x) => <option key={x.id} value={x.id}>{roomName(x.id)}</option>)}
            </select>
          </div>
        ))}
      </div>

      {examples.length > 0 && (
        <label className="checkbox-line">
          <input type="checkbox" checked={removeExamples} onChange={(e) => setRemoveExamples(e.target.checked)} />
          Remove the {examples.length} example designs that came with the app
        </label>
      )}
      {pack.floorPlan && (
        <label className="checkbox-line">
          <input type="checkbox" checked={useFloorPlan} onChange={(e) => setUseFloorPlan(e.target.checked)} />
          Show my floor plan drawing on the Floor Plan page
        </label>
      )}

      {progress && <p className="upload-status">{progress}</p>}
      {error && <p className="field-msg">{error}</p>}
    </EditorModal>
  );
}
