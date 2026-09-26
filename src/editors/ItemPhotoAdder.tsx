import { useEffect, useRef, useState, type ReactNode } from 'react';
import { putImages, processPhoto, requestPersistentStorage } from '../data/images';
import { newId, todayIso, useStore } from '../data/store';
import { blankItem } from '../data/budget';
import type { PurchaseItem } from '../data/types';
import { EditorModal, SelectInput, TextInput } from '../components/forms';

const NEW_ITEM = '__new__';

/** Shrinks and stores the chosen photos. Returns the new image ids (skipping any that failed). */
async function storePhotos(files: File[]) {
  requestPersistentStorage();
  const ids: string[] = [];
  let failed = 0;
  for (const file of files) {
    try {
      const { full, thumb } = await processPhoto(file);
      const id = newId();
      await putImages(id, full, thumb);
      ids.push(id);
    } catch {
      failed++;
    }
  }
  return { ids, failed };
}

/**
 * Wraps a "Take product photo" button. On iPhone, tapping it offers Take Photo or Photo Library.
 * With `itemId` the photos go straight onto that item; without, you pick the item (or name a new one).
 */
export function ItemPhotoAdder({ itemId, children }: { itemId?: string; children: (open: () => void, busy: boolean) => ReactNode }) {
  const { getData, upsert, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const addTo = async (chosen: File[], target: PurchaseItem) => {
    setBusy(true);
    const { ids, failed } = await storePhotos(chosen);
    setBusy(false);
    if (ids.length) {
      // Read the latest copy of the item, in case it changed while the photos were processed.
      const latest = getData().purchases.find((i) => i.id === target.id) ?? target;
      upsert('purchases', { ...latest, photoIds: [...latest.photoIds, ...ids], coverId: latest.coverId ?? ids[0] });
      notify(ids.length === 1 ? 'Photo added' : `${ids.length} photos added`);
    }
    if (failed) window.alert(`${failed} photo${failed > 1 ? 's' : ''} could not be saved. The file may not be a photo, or the device may be out of space.`);
    return ids.length > 0;
  };

  return (
    <>
      {children(() => input.current?.click(), busy)}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const chosen = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!chosen.length) return;
          const target = itemId && getData().purchases.find((i) => i.id === itemId);
          if (target) addTo(chosen, target);
          else setFiles(chosen);
        }}
      />
      {files.length > 0 && <ChooseItem files={files} busy={busy} onClose={() => setFiles([])} onPick={(item) => addTo(files, item)} />}
    </>
  );
}

function ChooseItem({ files, busy, onClose, onPick }: { files: File[]; busy: boolean; onClose: () => void; onPick: (item: PurchaseItem) => Promise<boolean> }) {
  const { data, upsert } = useStore();
  const [choice, setChoice] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const vendorName = (id?: string) => data.vendors.find((v) => v.id === id)?.name;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const save = async () => {
    if (busy) return;
    let item = data.purchases.find((i) => i.id === choice);
    if (choice === NEW_ITEM) {
      if (!name.trim()) return setError('What is this item called?');
      item = { ...blankItem(newId(), todayIso()), name: name.trim() };
      upsert('purchases', item);
    }
    if (!item) return setError('Choose which item this photo is for.');
    if (await onPick(item)) {
      onClose();
      window.location.hash = `/budget/items/${item.id}/photos`;
    }
  };

  return (
    <EditorModal title={files.length === 1 ? 'Product photo' : `${files.length} product photos`} onClose={busy ? () => {} : onClose} onSave={save} saveLabel={busy ? 'Saving…' : 'Save'}>
      <div className="upload-previews">
        {previews.map((u, i) => <img key={u} src={u} alt={`Selected photo ${i + 1}`} />)}
      </div>
      <SelectInput
        label="Which item is this for?"
        value={choice}
        onChange={(v) => { setChoice(v); setError(''); }}
        error={choice === NEW_ITEM ? undefined : error}
        options={[
          { value: '', label: 'Choose an item…' },
          ...[...data.purchases].sort((a, b) => a.name.localeCompare(b.name)).map((i) => ({ value: i.id, label: [i.name, vendorName(i.vendorId)].filter(Boolean).join(' – ') })),
          { value: NEW_ITEM, label: '+ A new item…' },
        ]}
      />
      {choice === NEW_ITEM && <TextInput label="New item's name" value={name} onChange={setName} error={error} placeholder="e.g. Coffee table" autoFocus hint="You can add the vendor, room and amount afterwards." />}
    </EditorModal>
  );
}
