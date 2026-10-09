import { useEffect, useState } from 'react';
import { Camera, Check, ImageOff, Upload, X } from 'lucide-react';
import { useImageUrl, useSlow } from '../data/images';
import { useStore } from '../data/store';
import type { Photo } from '../data/types';
import { PhotoAdder } from '../editors/PhotoAdder';
import { EditorModal } from './forms';
import { PhotoThumb } from './PhotoThumb';

/** Up to this many photos can be on the cover. */
const MAX_COVER = 4;

/** The cover photos that still exist and have a picture, in the chosen order. */
export function useCoverPhotos(): Photo[] {
  const { data } = useStore();
  return (data.project.coverPhotoIds ?? [])
    .map((id) => data.photos.find((p) => p.id === id))
    .filter((p): p is Photo => !!p?.hasImage);
}

/**
 * The photos at the top of the Home page. Wide screens show them side by side;
 * phones show one at a time, changing every few seconds.
 */
export function HomeCover({ photos }: { photos: Photo[] }) {
  const [shown, setShown] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (count < 2) return;
    const t = window.setInterval(() => setShown((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const current = shown % count;
  return (
    <div className={`hero-cover${count === 2 ? ' pair' : ''}`}>
      {photos.map((p, i) => <CoverImage key={p.id} photo={p} on={i === current} />)}
      {count > 1 && (
        <div className="hero-dots">
          {photos.map((p, i) => (
            <button key={p.id} type="button" className={i === current ? 'on' : ''} aria-label={`Show cover photo ${i + 1}`} onClick={() => setShown(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoverImage({ photo, on }: { photo: Photo; on: boolean }) {
  const url = useImageUrl(photo.id, 'full');
  const slow = useSlow(!url);
  return (
    <figure className={`hero-cover-img${on ? ' on' : ''}`}>
      {url ? (
        <img src={url} alt={photo.caption || 'Cover photo'} draggable={false} />
      ) : (
        <span className="thumb-wait">{slow ? <><ImageOff size={18} /> Picture not here yet – it may still be uploading</> : 'Loading picture…'}</span>
      )}
    </figure>
  );
}

/** Button + window for choosing which photos go on the cover. */
export function CoverPicker() {
  const [open, setOpen] = useState(false);
  const has = useCoverPhotos().length > 0;
  return (
    <>
      <button type="button" className="hero-cover-btn" onClick={() => setOpen(true)}>
        <Camera size={15} /> {has ? 'Change cover' : 'Add cover photo'}
      </button>
      {open && <CoverPickerForm onClose={() => setOpen(false)} />}
    </>
  );
}

function CoverPickerForm({ onClose }: { onClose: () => void }) {
  const { data, getData, updateProject, notify } = useStore();
  const current = useCoverPhotos().map((p) => p.id);
  const [chosen, setChosen] = useState<string[]>(current);
  const [msg, setMsg] = useState('');
  const balcony = data.rooms.find((r) => /balcony/i.test(r.name))?.id;
  const photos = [...data.photos].filter((p) => p.hasImage).sort((a, b) => b.date.localeCompare(a.date));

  const toggle = (id: string) => {
    setMsg('');
    if (chosen.includes(id)) return setChosen(chosen.filter((x) => x !== id));
    if (chosen.length >= MAX_COVER) return setMsg(`Up to ${MAX_COVER} photos can be on the cover. Untick one first.`);
    setChosen([...chosen, id]);
  };

  const save = (ids = chosen) => {
    updateProject({ ...getData().project, coverPhotoIds: ids.length ? ids : undefined });
    notify(ids.length ? 'Cover photo saved' : 'Cover photo removed');
    onClose();
  };

  // Newly uploaded photos go straight onto the cover.
  const added = (ids: string[]) => save([...chosen, ...ids].slice(0, MAX_COVER));

  // The upload form sits beside (not inside) this window, so its Save doesn't also save this one.
  return (
    <PhotoAdder roomId={balcony} onSaved={added}>
      {(openPicker) => (
        <EditorModal
          title="Home cover photo"
          onClose={onClose}
          onSave={() => save()}
          footer={
            <>
              {current.length > 0 && <button type="button" className="btn btn-danger" onClick={() => save([])}><X size={15} /> Remove cover</button>}
              <span className="grow" />
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </>
          }
        >
          <p className="field-hint">
            Pick up to {MAX_COVER} photos for the top of the Home page. Tall photos of people work best. The photos stay private – only people who have joined your home can see them.
          </p>
          <button type="button" className="btn btn-ghost" onClick={openPicker}><Upload size={15} /> Upload new photos</button>
          {photos.length === 0 ? (
            <p className="row-sub">No photos yet – upload one above.</p>
          ) : (
            <>
              <p className="cover-label">Or choose from your photos{chosen.length ? ` · ${chosen.length} chosen` : ''}</p>
              <div className="cover-grid">
                {photos.map((p) => {
                  const n = chosen.indexOf(p.id);
                  return (
                    <button key={p.id} type="button" className={`cover-pick${n >= 0 ? ' on' : ''}`} onClick={() => toggle(p.id)} aria-pressed={n >= 0} aria-label={p.caption || 'Photo'}>
                      <PhotoThumb photo={p} />
                      {n >= 0 && <span className="cover-pick-num">{chosen.length > 1 ? n + 1 : <Check size={14} />}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {msg && <p className="field-msg">{msg}</p>}
        </EditorModal>
      )}
    </PhotoAdder>
  );
}
