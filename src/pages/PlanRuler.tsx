import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { Eraser, Pencil, Ruler, Save, Undo2 } from 'lucide-react';
import { newId, useRoomName, useStore } from '../data/store';
import { planBounds, planCommon, planRooms } from '../data/floorPlanLayout';
import { centre, metres, pathLength, polygonArea, roomAt, snapToWalls, squareMetres, straighten, type Pt } from '../data/ruler';
import type { FloorPlanImage, MeasurementKind, PlanMeasure } from '../data/types';
import { Chips, EmptyState, Card } from '../components/ui';
import { EditorModal, FieldRow, NumberInput, SelectInput, TextInput, toNumber } from '../components/forms';

// ─────────────────────────────────────────────────────────────
// FLOOR PLAN RULER
// Tap points on the plan to measure distances, a run of lines,
// or an area. Ends can be dragged (with a magnifier on phones),
// lines straighten and snap to walls, and the scale can be
// calibrated against a length you know.
// ─────────────────────────────────────────────────────────────

export type Tool = 'line' | 'path' | 'area';
const toolLabels: Record<Tool, string> = { line: 'Distance', path: 'Multi-point', area: 'Area' };
const toolByLabel = Object.fromEntries(Object.entries(toolLabels).map(([k, v]) => [v, k])) as Record<string, Tool>;

export interface RulerState {
  tool: Tool;
  points: Pt[];
  straight: boolean;
  snap: boolean;
}
export const initialRuler: RulerState = { tool: 'line', points: [], straight: true, snap: true };

/** Plan millimetres per screen pixel at the current zoom (smaller = more precise). */
export function useMmPerPx(canvasRef: RefObject<HTMLDivElement | null>) {
  const [v, setV] = useState(planBounds.w / 1000);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => el.clientWidth && setV(planBounds.w / el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasRef]);
  return v;
}

const pctPos = ([x, y]: Pt) => ({ left: `${((x - planBounds.x) / planBounds.w) * 100}%`, top: `${((y - planBounds.y) / planBounds.h) * 100}%` });

function result(tool: Tool, points: Pt[], cal: number) {
  if (tool === 'area') return points.length >= 3 ? squareMetres(polygonArea(points), cal) : null;
  return points.length >= 2 ? metres(pathLength(points), cal) : null;
}

/** Toolbar shown above the plan while measuring. */
export function RulerPanel({ st, set, mmPerPx, onSave, onCalibrate }: {
  st: RulerState; set: (s: RulerState) => void; mmPerPx: number; onSave: () => void; onCalibrate: () => void;
}) {
  const { project } = useStore().data;
  const cal = project.planCalibration ?? 1;
  const value = result(st.tool, st.points, cal);
  const n = st.points.length;
  const hint =
    st.tool === 'line' ? (n === 0 ? 'Tap where the measurement starts.' : n === 1 ? 'Now tap where it ends.' : 'Drag either end to adjust. Tap elsewhere to start a new line.')
    : st.tool === 'path' ? (n < 2 ? 'Tap point after point along the run (e.g. a cabinet or curtain track).' : 'Keep tapping to add points. Drag a point to adjust it.')
    : n < 3 ? 'Tap the corners of the area, one after another.' : 'Keep tapping corners. Drag a corner to adjust it.';
  // Roughly how precisely you can place a point at this zoom (a few screen pixels), after calibration.
  const plusMinusCm = Math.max(1, Math.ceil((3 * mmPerPx * cal) / 10));
  const perimeter = st.tool === 'area' && n >= 3 ? metres(pathLength(st.points, true), cal) : null;

  return (
    <div className="ruler-panel" role="region" aria-label="Ruler">
      <div className="ruler-row">
        <Chips options={Object.values(toolLabels)} value={toolLabels[st.tool]} onChange={(v) => set({ ...st, tool: toolByLabel[v], points: [] })} />
        <div className="ruler-toggles">
          <label className="checkbox-line"><input type="checkbox" checked={st.straight} onChange={(e) => set({ ...st, straight: e.target.checked })} /> Straight lines</label>
          <label className="checkbox-line"><input type="checkbox" checked={st.snap} onChange={(e) => set({ ...st, snap: e.target.checked })} /> Snap to walls</label>
        </div>
      </div>
      <div className="ruler-row">
        <div className="ruler-readout" aria-live="polite">
          <span className="ruler-value">{value ?? '—'}</span>
          {st.tool === 'path' && n >= 2 && <span className="row-sub">total of {n - 1} line{n === 2 ? '' : 's'}</span>}
          {perimeter && <span className="row-sub">perimeter {perimeter}</span>}
          <span className="row-sub ruler-precision">≈ ±{plusMinusCm} cm at this zoom{cal === 1 ? ' · plan scale as drawn' : ' · calibrated'}</span>
        </div>
        <div className="ruler-actions">
          <button className="btn btn-ghost small" onClick={() => set({ ...st, points: st.points.slice(0, -1) })} disabled={!n}><Undo2 size={15} /> Undo</button>
          <button className="btn btn-ghost small" onClick={() => set({ ...st, points: [] })} disabled={!n}><Eraser size={15} /> Clear</button>
          {st.tool === 'line' && <button className="btn btn-ghost small" onClick={onCalibrate} disabled={n < 2}><Ruler size={15} /> Calibrate</button>}
          <button className="btn btn-primary small" onClick={onSave} disabled={!value}><Save size={15} /> Save</button>
        </div>
      </div>
      <p className="row-sub ruler-hint">{hint}</p>
    </div>
  );
}

/** Lines, labels, handles and the tap-catching layer, drawn over the plan. */
export function RulerLayer({ canvasRef, active, st, set, saved, selected, drawing, mmPerPx }: {
  canvasRef: RefObject<HTMLDivElement | null>;
  active: boolean;
  st: RulerState;
  set: (s: RulerState) => void;
  saved: PlanMeasure[];
  selected?: string;
  drawing: { url: string; fp: FloorPlanImage } | null;
  mmPerPx: number;
}) {
  const cal = useStore().data.project.planCalibration ?? 1;
  const down = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ i: number; touch: boolean; client: [number, number] } | null>(null);

  const toMm = (clientX: number, clientY: number): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [planBounds.x + ((clientX - r.left) / r.width) * planBounds.w, planBounds.y + ((clientY - r.top) / r.height) * planBounds.h];
  };
  /** Straighten against a neighbour, then snap to walls (screen-based tolerance). */
  const place = (p: Pt, ref: Pt | undefined): Pt => {
    const s = st.straight ? straighten(p, ref) : { p, lock: null };
    return st.snap ? snapToWalls(s.p, 12 * mmPerPx, s.lock).p : s.p;
  };

  const onDown = (e: ReactPointerEvent) => { down.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const onUp = (e: ReactPointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; // a scroll, not a tap
    const raw = toMm(e.clientX, e.clientY);
    if (st.tool === 'line' && st.points.length >= 2) return set({ ...st, points: [place(raw, undefined)] });
    set({ ...st, points: [...st.points, place(raw, st.points[st.points.length - 1])] });
  };

  const startDrag = (i: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep receiving moves when the finger leaves the handle
    } catch {
      // not a real pointer (e.g. some browsers' synthetic events) – dragging still works while over the handle
    }
    setDrag({ i, touch: e.pointerType !== 'mouse', client: [e.clientX, e.clientY] });
  };
  const moveDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const pts = st.points;
    const ref = pts[drag.i - 1] ?? pts[drag.i + 1];
    const next = [...pts];
    next[drag.i] = place(toMm(e.clientX, e.clientY), ref);
    set({ ...st, points: next });
    setDrag({ ...drag, client: [e.clientX, e.clientY] });
  };
  const endDrag = () => setDrag(null);

  const pts = st.points;
  const shape = (points: Pt[], kind: Tool, cls: string, key: string) =>
    kind === 'area' && points.length >= 3 ? (
      <polygon key={key} className={cls} points={points.map((p) => p.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
    ) : (
      <polyline key={key} className={cls} points={points.map((p) => p.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
    );

  return (
    <>
      <svg className="fp-svg ruler-svg" viewBox={`${planBounds.x} ${planBounds.y} ${planBounds.w} ${planBounds.h}`} aria-hidden>
        {saved.map((m) => shape(m.points, m.kind, `ruler-saved ${m.id === selected ? 'selected' : ''} k-${m.kind}`, m.id))}
        {active && pts.length > 0 && shape(pts, st.tool, `ruler-current k-${st.tool}`, 'current')}
      </svg>
      {saved.map((m) => (
        <span key={m.id} className={`ruler-label saved ${m.id === selected ? 'selected' : ''}`} style={pctPos(m.kind === 'area' ? centre(m.points) : mid(m.points))}>
          <strong>{m.name}</strong> {m.kind === 'area' ? squareMetres(polygonArea(m.points), cal) : metres(pathLength(m.points), cal)}
        </span>
      ))}
      {active && (
        <>
          <div className="ruler-capture" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (down.current = null)} data-testid="ruler-capture" />
          {st.tool !== 'area' && pts.slice(1).map((p, i) => (
            <span key={`seg${i}`} className="ruler-label" style={pctPos(mid([pts[i], p]))}>{metres(pathLength([pts[i], p]), cal)}</span>
          ))}
          {st.tool === 'area' && pts.length >= 3 && <span className="ruler-label big" style={pctPos(centre(pts))}>{squareMetres(polygonArea(pts), cal)}</span>}
          {pts.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`ruler-handle ${drag?.i === i ? 'dragging' : ''}`}
              style={pctPos(p)}
              aria-label={`Point ${i + 1} – drag to adjust`}
              onPointerDown={startDrag(i)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))}
          {drag?.touch && pts[drag.i] && <Loupe at={pts[drag.i]} client={drag.client} mmPerPx={mmPerPx} drawing={drawing} points={pts} tool={st.tool} />}
        </>
      )}
    </>
  );
}

/** Middle point along a line (or the middle of the first segment of a run, for labels). */
function mid(points: Pt[]): Pt {
  if (points.length < 2) return points[0] ?? [0, 0];
  const [a, b] = points.length === 2 ? points : [points[0], points[1]];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** A zoomed-in circle above your finger, so you can see exactly where the point is. */
function Loupe({ at, client, mmPerPx, drawing, points, tool }: { at: Pt; client: [number, number]; mmPerPx: number; drawing: { url: string; fp: FloorPlanImage } | null; points: Pt[]; tool: Tool }) {
  const SIZE = 132;
  const ZOOM = 3;
  const span = (SIZE * mmPerPx) / ZOOM;
  const above = client[1] > SIZE + 60;
  const style = { left: client[0] - SIZE / 2, top: above ? client[1] - SIZE - 48 : client[1] + 48, width: SIZE, height: SIZE };
  const rects = [...Object.values(planRooms).flatMap((r) => [r.main, ...(r.extra ?? [])]), ...planCommon.map((c) => c.rect)];
  const line = points.map((p) => p.join(',')).join(' ');
  return (
    <div className="ruler-loupe" style={style} aria-hidden>
      <svg viewBox={`${at[0] - span / 2} ${at[1] - span / 2} ${span} ${span}`} width={SIZE} height={SIZE}>
        <rect x={at[0] - span} y={at[1] - span} width={span * 2} height={span * 2} className="loupe-bg" />
        {drawing ? (
          <image href={drawing.url} x={-drawing.fp.originX / drawing.fp.pxPerMm} y={-drawing.fp.originY / drawing.fp.pxPerMm} width={drawing.fp.width / drawing.fp.pxPerMm} height={drawing.fp.height / drawing.fp.pxPerMm} preserveAspectRatio="none" />
        ) : (
          rects.map((r, i) => <rect key={i} className="loupe-room" x={r[0]} y={r[1]} width={r[2]} height={r[3]} vectorEffect="non-scaling-stroke" />)
        )}
        {tool === 'area' && points.length >= 3 ? <polygon className="ruler-current" points={line} vectorEffect="non-scaling-stroke" /> : <polyline className="ruler-current" points={line} vectorEffect="non-scaling-stroke" />}
        <line className="loupe-cross" x1={at[0] - span} y1={at[1]} x2={at[0] + span} y2={at[1]} vectorEffect="non-scaling-stroke" />
        <line className="loupe-cross" x1={at[0]} y1={at[1] - span} x2={at[0]} y2={at[1] + span} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// ── Calibrate ────────────────────────────────────────────────

export function CalibrateForm({ rawMm, onClose }: { rawMm: number; onClose: () => void }) {
  const { data, updateProject, notify } = useStore();
  const cal = data.project.planCalibration ?? 1;
  const [real, setReal] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    const m = toNumber(real);
    if (m === undefined || Number.isNaN(m) || m <= 0) return setError('Enter the real length in metres, e.g. 3.80');
    const factor = (m * 1000) / rawMm;
    if (factor < 0.5 || factor > 2) return setError("That's very different from the plan – check the line covers the same length.");
    updateProject({ ...data.project, planCalibration: Math.round(factor * 100000) / 100000 });
    notify(`Calibrated – plan scale adjusted by ${factor >= 1 ? '+' : '−'}${Math.abs((factor - 1) * 100).toFixed(1)}%`);
    onClose();
  };
  const reset = () => {
    updateProject({ ...data.project, planCalibration: undefined });
    notify('Back to the plan scale as drawn');
    onClose();
  };

  return (
    <EditorModal title="Calibrate the ruler" onClose={onClose} onSave={save} onDelete={cal !== 1 ? reset : undefined} deleteLabel="Reset scale" saveLabel="Calibrate">
      <p className="card-text">
        Draw the ruler over something whose real length you know – a wall you measured with a tape, or a dimension printed on the plan – then enter that length.
        All ruler readings will use the corrected scale.
      </p>
      <p className="card-text">This line measures <strong>{metres(rawMm)}</strong> on the plan as drawn{cal !== 1 && <> (<strong>{metres(rawMm, cal)}</strong> with the current calibration)</>}.</p>
      <NumberInput label="Real length" value={real} onChange={setReal} suffix="m" error={error} hint="e.g. 3.80" />
    </EditorModal>
  );
}

// ── Save, and the saved list ─────────────────────────────────

const roomKinds: { value: MeasurementKind; label: string }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'roomWidth', label: 'Room width' },
  { value: 'roomLength', label: 'Room length' },
  { value: 'other', label: 'Other' },
];

/** Save a new ruler measurement (`draft`) or edit a saved one (`measure`); optionally add it to a room. */
export function SaveMeasureForm({ draft, measure, onClose, onSaved }: { draft?: { kind: Tool; points: Pt[] }; measure?: PlanMeasure; onClose: () => void; onSaved?: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const cal = data.project.planCalibration ?? 1;
  const kind = measure?.kind ?? draft!.kind;
  const points = measure?.points ?? draft!.points;
  const isLength = kind !== 'area';
  const lengthMm = Math.round(pathLength(points) * cal);
  const n = data.planMeasures.filter((m) => m.kind === kind).length + 1;
  const [name, setName] = useState(measure?.name ?? '');
  const [toRoom, setToRoom] = useState(false);
  const [roomId, setRoomId] = useState(roomAt(centre(points)) ?? data.rooms[0]?.id ?? '');
  const [mKind, setMKind] = useState<MeasurementKind>('wall');
  const value = isLength ? metres(pathLength(points), cal) : squareMetres(polygonArea(points), cal);

  const save = () => {
    const finalName = name.trim() || `${kind === 'area' ? 'Area' : 'Distance'} ${n}`;
    upsert('planMeasures', { id: measure?.id ?? newId(), name: finalName, kind, points, createdAt: measure?.createdAt ?? new Date().toISOString() });

    if (isLength && toRoom && roomId) {
      const field = mKind === 'roomLength' ? 'depthMm' : 'widthMm';
      const existing = (mKind === 'roomWidth' || mKind === 'roomLength') ? data.measurements.find((m) => m.roomId === roomId && m.kind === mKind) : undefined;
      if (existing && !window.confirm(`${roomName(roomId)} already has a ${mKind === 'roomWidth' ? 'room width' : 'room length'} of ${(existing[field] ?? 0).toLocaleString('en-SG')} mm. Replace it with ${lengthMm.toLocaleString('en-SG')} mm from the plan?`)) return;
      upsert('measurements', {
        id: existing?.id ?? newId(),
        roomId,
        kind: mKind,
        item: mKind === 'roomWidth' ? 'Room width' : mKind === 'roomLength' ? 'Room length' : finalName,
        [field]: lengthMm,
        note: 'Estimated from the floor plan ruler',
        fromPlan: true,
      });
      notify(`Saved, and added to ${roomName(roomId)}`);
    } else {
      notify(measure ? 'Measurement updated' : 'Measurement saved on the plan');
    }
    onClose();
    onSaved?.();
  };

  const del = () => {
    if (!measure || !window.confirm(`Delete "${measure.name}" from the plan?`)) return;
    remove('planMeasures', measure.id);
    notify('Deleted');
    onClose();
  };

  return (
    <EditorModal title={measure ? 'Plan measurement' : 'Save measurement'} onClose={onClose} onSave={save} onDelete={measure ? del : undefined}>
      <p className="ruler-value modal-value">{value}{kind === 'path' && <span className="row-sub"> · {points.length - 1} lines</span>}</p>
      <TextInput label="Name" value={name} onChange={setName} placeholder={kind === 'area' ? 'e.g. Living room flooring' : 'e.g. TV wall'} autoFocus={!measure} />
      {isLength && (
        <>
          <label className="checkbox-line">
            <input type="checkbox" checked={toRoom} onChange={(e) => setToRoom(e.target.checked)} />
            <span>Also add to a room's measurements (marked “from plan”)</span>
          </label>
          {toRoom && (
            <>
              <FieldRow>
                <SelectInput label="Room" value={roomId} onChange={setRoomId} options={data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))} />
                <SelectInput label="As" value={mKind} onChange={(v) => setMKind(v as MeasurementKind)} options={roomKinds} />
              </FieldRow>
              <p className="field-hint">Adds {lengthMm.toLocaleString('en-SG')} mm. It's an estimate from the drawing – replace it once you've measured on site.</p>
            </>
          )}
        </>
      )}
    </EditorModal>
  );
}

export function SavedPlanMeasures({ selected, onSelect }: { selected?: string; onSelect: (id?: string) => void }) {
  const { data } = useStore();
  const cal = data.project.planCalibration ?? 1;
  const [editing, setEditing] = useState<PlanMeasure | null>(null);
  const list = [...data.planMeasures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card title="Ruler measurements" action={cal !== 1 ? <span className="row-sub">Calibrated ({cal > 1 ? '+' : '−'}{Math.abs((cal - 1) * 100).toFixed(1)}%)</span> : undefined}>
      {!list.length ? (
        <EmptyState>Measurements you save with the ruler appear here and on the plan.</EmptyState>
      ) : (
        <ul className="list">
          {list.map((m) => (
            <li key={m.id} className={`list-row ruler-row-item ${m.id === selected ? 'selected' : ''}`}>
              <button type="button" className="row-button grow" onClick={() => onSelect(m.id === selected ? undefined : m.id)} aria-pressed={m.id === selected}>
                <span className="row-title">{m.name}</span>
                <span className="row-sub">{toolLabels[m.kind]}{m.kind === 'path' ? ` · ${m.points.length - 1} lines` : ''}</span>
              </button>
              <span className="row-amount">{m.kind === 'area' ? squareMetres(polygonArea(m.points), cal) : metres(pathLength(m.points), cal)}</span>
              <button type="button" className="icon-btn small" aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}><Pencil size={15} /></button>
            </li>
          ))}
        </ul>
      )}
      {editing && <SaveMeasureForm measure={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
