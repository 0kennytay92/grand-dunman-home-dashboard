import { useEffect, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { guessRoom, readPptx, splitPrompt, type SlideInfo } from '../data/pptx';
import { processPhoto, putImages, requestPersistentStorage } from '../data/images';
import { nextVersion } from '../data/designs';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import type { Design } from '../data/types';
import { EditorModal } from '../components/forms';
import { parsePack, type DesignPack } from '../data/designPack';
import { PackImport } from './PackImport';

interface Row {
  slide: SlideInfo;
  include: boolean;
  roomId: string;
  title: string;
}

/**
 * Imports designs from a design file (.json) or a PowerPoint deck (.pptx).
 * PowerPoint: each slide with a picture becomes a design
 * (its largest picture is the render; any others become reference images).
 */
export function PptxImport({ onClose }: { onClose: () => void }) {
  const { data, upsert, notify } = useStore();
  const roomName = useRoomName();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pack, setPack] = useState<DesignPack | null>(null);

  const pick = async (file: File) => {
    setError('');
    setReading(true);
    setFileName(file.name);
    try {
      if (/\.json$/i.test(file.name) || file.type === 'application/json') {
        setPack(parsePack(await file.text()));
        return;
      }
      const slides = (await readPptx(file)).filter((s) => s.images.length > 0);
      if (!slides.length) throw new Error('No pictures were found in this presentation.');
      let lastRoom = '';
      setRows(
        slides.map((slide) => {
          const roomId = guessRoom(`${slide.title}\n${slide.text}`, data.rooms) ?? lastRoom; // slides often follow on from the previous room
          lastRoom = roomId;
          return { slide, include: true, roomId, title: slide.title || `Slide ${slide.number}` };
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setRows(null);
    } finally {
      setReading(false);
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows?.filter((r) => r.include) ?? [];
  const missingRoom = chosen.some((r) => !r.roomId);

  const doImport = async () => {
    if (!rows || progress) return;
    if (!chosen.length) return setError('Tick at least one slide to import.');
    if (missingRoom) return setError('Choose a room for every ticked slide.');
    setError('');
    requestPersistentStorage();
    const made: Design[] = [];
    let failed = 0;
    for (const [n, row] of chosen.entries()) {
      setProgress(`Importing ${n + 1} of ${chosen.length}…`);
      try {
        const [render, ...refs] = row.slide.images;
        const id = newId();
        const r = await processPhoto(render.blob);
        await putImages(id, r.full, r.thumb);
        const referenceIds: string[] = [];
        for (const ref of refs) {
          try {
            const p = await processPhoto(ref.blob);
            const refId = newId();
            await putImages(refId, p.full, p.thumb);
            referenceIds.push(refId);
          } catch {
            // a picture that can't be read is skipped; the design is still imported
          }
        }
        const { description, prompt } = splitPrompt(row.slide);
        const title = row.title.trim() || `Slide ${row.slide.number}`;
        const design: Design = {
          id,
          roomId: row.roomId,
          title,
          version: nextVersion([...data.designs, ...made], row.roomId, title),
          date: todayIso(),
          status: 'Concept',
          notes: description,
          prompt,
          hasImage: true,
          referenceIds,
        };
        made.push(design);
        upsert('designs', design);
      } catch {
        failed++;
      }
    }
    setProgress(null);
    notify(`${made.length} design${made.length === 1 ? '' : 's'} imported`);
    if (failed) setError(`${failed} slide${failed > 1 ? 's' : ''} could not be imported (the picture couldn't be read).`);
    else onClose();
  };

  if (pack) return <PackImport pack={pack} fileName={fileName} onClose={onClose} />;

  return (
    <EditorModal
      title="Import designs"
      onClose={progress ? () => {} : onClose}
      onSave={rows ? doImport : () => input.current?.click()}
      saveLabel={rows ? `Import ${chosen.length} design${chosen.length === 1 ? '' : 's'}` : 'Choose file'}
    >
      {!rows ? (
        <>
          <p className="card-text">
            Choose a <strong>design file</strong> (.json) or your renders presentation (<strong>.pptx</strong>).
            Design files add ready-made designs with their pictures. From Google Slides, use <em>File → Download → Microsoft PowerPoint</em> first.
            Each slide with a picture becomes a design; the biggest picture is the render and any others become reference images.
            Everything stays on this device.
          </p>
          <button type="button" className="render-empty" onClick={() => input.current?.click()} disabled={reading}>
            <FileUp size={26} />
            <span>{reading ? `Reading ${fileName}…` : 'Choose file'}</span>
          </button>
        </>
      ) : (
        <>
          <p className="card-text">
            <strong>{rows.length}</strong> slides with pictures in {fileName}. Check the room and name for each, untick any you don't want, then tap <strong>Import</strong>.
          </p>
          <div className="field">
            <label htmlFor="all-room">Set every slide to one room (optional)</label>
            <select id="all-room" className="input select" value="" onChange={(e) => e.target.value && setRows(rows.map((r) => ({ ...r, roomId: e.target.value })))}>
              <option value="">Choose…</option>
              {data.rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
            </select>
          </div>
          <ul className="import-list">
            {rows.map((row, i) => (
              <li key={row.slide.number} className={`import-row ${row.include ? '' : 'off'}`}>
                <label className="import-check">
                  <input type="checkbox" checked={row.include} onChange={(e) => update(i, { include: e.target.checked })} aria-label={`Import slide ${row.slide.number}`} />
                </label>
                <BlobThumb blob={row.slide.images[0].blob} />
                <div className="import-fields">
                  <span className="row-sub">
                    Slide {row.slide.number}
                    {row.slide.images.length > 1 && ` · +${row.slide.images.length - 1} reference image${row.slide.images.length > 2 ? 's' : ''}`}
                  </span>
                  <input className="input" value={row.title} onChange={(e) => update(i, { title: e.target.value })} aria-label={`Name for slide ${row.slide.number}`} />
                  <select className={`input select ${row.include && !row.roomId ? 'needs-room' : ''}`} value={row.roomId} onChange={(e) => update(i, { roomId: e.target.value })} aria-label={`Room for slide ${row.slide.number}`}>
                    <option value="">Choose room…</option>
                    {data.rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <input ref={input} type="file" accept=".pptx,.json,application/json,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
      {progress && <p className="upload-status">{progress}</p>}
      {error && <p className="field-msg">{error}</p>}
    </EditorModal>
  );
}

function BlobThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return <div className="thumb-box import-thumb">{url && <img src={url} alt="" />}</div>;
}
