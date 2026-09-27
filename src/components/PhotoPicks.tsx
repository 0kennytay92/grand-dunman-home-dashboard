import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { deleteImages, putImages, processPhoto, requestPersistentStorage, useImageUrl } from '../data/images';
import { newId } from '../data/store';
import { ImageLightbox } from './ImageLightbox';

// ─────────────────────────────────────────────────────────────
// PHOTOS INSIDE A FORM
// Pick photos (camera or library) inside a form. Nothing is saved
// until the form is saved; photos removed in the form are deleted then.
// ─────────────────────────────────────────────────────────────

export function usePhotoPicks(initial: string[]) {
  const [ids, setIds] = useState<string[]>(initial);
  const [files, setFiles] = useState<File[]>([]);
  return {
    ids,
    files,
    count: ids.length + files.length,
    add: (more: File[]) => setFiles((f) => [...f, ...more]),
    removeId: (id: string) => setIds((x) => x.filter((i) => i !== id)),
    removeFile: (i: number) => setFiles((f) => f.filter((_, j) => j !== i)),
    /** Stores new photos and deletes removed ones. Returns the final list of photo ids. */
    async commit(): Promise<string[]> {
      requestPersistentStorage();
      const added: string[] = [];
      for (const file of files) {
        try {
          const { full, thumb } = await processPhoto(file);
          const id = newId();
          await putImages(id, full, thumb);
          added.push(id);
        } catch {
          // skip files that aren't photos
        }
      }
      const removed = initial.filter((i) => !ids.includes(i));
      if (removed.length) deleteImages(removed, { cloud: true }).catch(() => {});
      return [...ids, ...added];
    },
  };
}
export type PhotoPicksState = ReturnType<typeof usePhotoPicks>;

export function PhotoPicks({ picks, label = 'Add photos' }: { picks: PhotoPicksState; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => picks.files.map((f) => URL.createObjectURL(f)), [picks.files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div className="photo-picks">
      {picks.ids.map((id, i) => (
        <span key={id} className="pick">
          <button type="button" className="pick-img" onClick={() => setViewing(i)} aria-label="View photo"><PickThumb id={id} /></button>
          <button type="button" className="pick-x" onClick={() => picks.removeId(id)} aria-label="Remove photo"><X size={13} /></button>
        </span>
      ))}
      {previews.map((u, i) => (
        <span key={u} className="pick">
          <img src={u} alt="" />
          <button type="button" className="pick-x" onClick={() => picks.removeFile(i)} aria-label="Remove photo"><X size={13} /></button>
        </span>
      ))}
      <button type="button" className="pick-add" onClick={() => input.current?.click()}>
        <Camera size={20} />
        <span>{label}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="pick-input"
        onChange={(e) => {
          picks.add(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {viewing !== null && <ImageLightbox images={picks.ids.map((id) => ({ id }))} start={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function PickThumb({ id }: { id: string }) {
  const url = useImageUrl(id, 'thumb');
  return url ? <img src={url} alt="" /> : null;
}

/** A row of small photos that open full screen. */
export function PhotoRow({ ids, caption }: { ids: string[]; caption?: string }) {
  const [viewing, setViewing] = useState<number | null>(null);
  if (!ids.length) return null;
  return (
    <div className="photo-picks view">
      {ids.map((id, i) => (
        <button key={id} type="button" className="pick pick-img" onClick={() => setViewing(i)} aria-label={`View photo ${i + 1}`}><PickThumb id={id} /></button>
      ))}
      {viewing !== null && <ImageLightbox images={ids.map((id) => ({ id, caption }))} start={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
