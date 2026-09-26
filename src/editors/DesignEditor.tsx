import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { deleteImages, getImage, processPhoto, putImages, requestPersistentStorage, useImageUrl } from '../data/images';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import { designStatuses, nextVersion } from '../data/designs';
import type { Design, DesignStatus } from '../data/types';
import { DateInput, EditorModal, FieldRow, SelectInput, TextArea, TextInput } from '../components/forms';

/**
 * Add or edit a design. Pass `from` (without `design`) to start a new version of an existing design:
 * it copies the room, name, description, prompt and reference images, and bumps the version.
 */
export function DesignEditor({ design, from, roomId, onClose, onSaved }: {
  design?: Design;
  from?: Design;
  roomId?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const base = design ?? from;
  const startRoom = base?.roomId ?? roomId ?? data.rooms[0]?.id ?? '';

  const [room, setRoom] = useState(startRoom);
  const [title, setTitle] = useState(base?.title ?? '');
  const [version, setVersion] = useState(design?.version ?? nextVersion(data.designs, startRoom, from?.title ?? ''));
  const [versionTouched, setVersionTouched] = useState(false);
  // For a new design, the version follows the name: a new name starts at v1, an existing name continues its numbering.
  const autoVersion = (r: string, t: string) => {
    if (!design && !versionTouched) setVersion(nextVersion(data.designs, r, t.trim()));
  };
  const [date, setDate] = useState(design?.date || todayIso());
  const [status, setStatus] = useState<DesignStatus>(design?.status ?? 'Concept');
  const [notes, setNotes] = useState(base?.notes ?? '');
  const [prompt, setPrompt] = useState(base?.prompt ?? '');
  const [renderFile, setRenderFile] = useState<File | null>(null);
  const [removeRender, setRemoveRender] = useState(false);
  const [keptRefs, setKeptRefs] = useState<string[]>(base?.referenceIds ?? []);
  const [newRefs, setNewRefs] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const renderInput = useRef<HTMLInputElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  const hasRender = !!renderFile || (!!design?.hasImage && !removeRender);

  const save = async () => {
    if (saving) return;
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Give the design a name, e.g. "Warm Minimal Living".';
    if (!room) e.room = 'Add a room first.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    requestPersistentStorage();
    try {
      const id = design?.id ?? newId();
      let hasImage = design?.hasImage ?? false;
      if (renderFile) {
        const { full, thumb } = await processPhoto(renderFile);
        await putImages(id, full, thumb);
        hasImage = true;
      } else if (removeRender && design?.hasImage) {
        await deleteImages([id]);
        hasImage = false;
      }

      // Reference images: keep, copy (for a new version) or add.
      const referenceIds: string[] = [];
      for (const refId of keptRefs) {
        if (design) {
          referenceIds.push(refId);
        } else {
          // New version: give it its own copy so deleting one design never affects the other.
          const [full, thumb] = await Promise.all([getImage(refId, 'full'), getImage(refId, 'thumb')]);
          if (full && thumb) {
            const copyId = newId();
            await putImages(copyId, full, thumb);
            referenceIds.push(copyId);
          }
        }
      }
      for (const file of newRefs) {
        const { full, thumb } = await processPhoto(file);
        const refId = newId();
        await putImages(refId, full, thumb);
        referenceIds.push(refId);
      }
      if (design) await deleteImages(design.referenceIds.filter((r) => !keptRefs.includes(r)));

      upsert('designs', {
        ...(design ?? {}),
        palette: design?.palette ?? from?.palette,
        id,
        roomId: room,
        title: title.trim(),
        version: version.trim() || 'v1',
        date,
        status,
        notes: notes.trim(),
        prompt: prompt.trim(),
        hasImage,
        referenceIds,
      });
      notify(design ? 'Design updated' : from ? `${version} added` : 'Design added');
      onClose();
      onSaved?.(id);
    } catch (err) {
      setErrors({ form: `${(err as Error).message} Nothing was saved.` });
      setSaving(false);
    }
  };

  const del = () => {
    if (!design || !window.confirm(`Delete "${design.title} ${design.version}" and its images?`)) return;
    remove('designs', design.id);
    notify('Design deleted');
    onClose();
  };

  return (
    <EditorModal
      title={design ? 'Edit design' : from ? `New version of ${from.title}` : 'Add design'}
      onClose={saving ? () => {} : onClose}
      onSave={save}
      onDelete={design ? del : undefined}
    >
      {/* Render */}
      <div className="field">
        <label>Render / image</label>
        <div className="render-pick">
          {hasRender ? (
            <div className="render-preview">
              {renderFile ? <FilePreview file={renderFile} /> : <StoredThumb id={design!.id} />}
              <div className="render-actions">
                <button type="button" className="btn btn-ghost" onClick={() => renderInput.current?.click()}>Replace</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setRenderFile(null); setRemoveRender(true); }}>Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" className="render-empty" onClick={() => renderInput.current?.click()}>
              <ImagePlus size={26} />
              <span>Add render</span>
            </button>
          )}
        </div>
        <input ref={renderInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setRenderFile(f); setRemoveRender(false); } e.target.value = ''; }} />
      </div>

      <TextInput label="Design name" value={title} onChange={(t) => { setTitle(t); autoVersion(room, t); }} error={errors.title} placeholder="e.g. Warm Minimal Living" />
      <FieldRow>
        <SelectInput label="Room" value={room} onChange={(r) => { setRoom(r); autoVersion(r, title); }} error={errors.room} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
        <TextInput label="Version" value={version} onChange={(v) => { setVersion(v); setVersionTouched(true); }} placeholder="v1" />
        <DateInput label="Date" value={date} onChange={setDate} />
      </FieldRow>

      <div className="field">
        <label>Status</label>
        <div className="kind-chips" role="radiogroup" aria-label="Status">
          {designStatuses.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} className={`chip status-chip s-${s.toLowerCase()} ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <TextArea label="Description" value={notes} onChange={setNotes} placeholder="Materials, finishes, what you like or don't like…" />
      <TextArea label="Design prompt" value={prompt} onChange={setPrompt} placeholder="The text you used to generate this render" />

      {/* Reference images */}
      <div className="field">
        <label>Reference images</label>
        <div className="ref-grid">
          {keptRefs.map((id) => (
            <div key={id} className="ref-item">
              <StoredThumb id={id} />
              <button type="button" className="swatch-remove" aria-label="Remove reference image" onClick={() => setKeptRefs(keptRefs.filter((r) => r !== id))}><X size={12} /></button>
            </div>
          ))}
          {newRefs.map((f, i) => (
            <div key={`${f.name}-${i}`} className="ref-item">
              <FilePreview file={f} />
              <button type="button" className="swatch-remove" aria-label="Remove reference image" onClick={() => setNewRefs(newRefs.filter((_, j) => j !== i))}><X size={12} /></button>
            </div>
          ))}
          <button type="button" className="ref-add" onClick={() => refInput.current?.click()} aria-label="Add reference images">
            <ImagePlus size={20} />
            <span>Add</span>
          </button>
        </div>
        <input ref={refInput} type="file" accept="image/*" multiple hidden onChange={(e) => { setNewRefs([...newRefs, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
      </div>

      {saving && <p className="upload-status">Saving images…</p>}
      {errors.form && <p className="field-msg">{errors.form}</p>}
    </EditorModal>
  );
}

function StoredThumb({ id }: { id: string }) {
  const url = useImageUrl(id, 'thumb');
  return <div className="thumb-box">{url && <img src={url} alt="" />}</div>;
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return <div className="thumb-box">{url && <img src={url} alt="" />}</div>;
}
