import { useRef, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, Ruler, TriangleAlert } from 'lucide-react';
import { useRoomName, useStore } from '../data/store';
import { useImageUrl } from '../data/images';
import { roomSize } from '../data/measurementKinds';
import { MATCH_TOLERANCE, planBounds, planCommon, planRooms, type Rect } from '../data/floorPlanLayout';
import type { Measurement, MeasurementKind, Room } from '../data/types';
import { MeasurementEditor } from '../editors/MeasurementEditor';
import { EditorModal } from '../components/forms';
import { Card, Chips, PageHeader } from '../components/ui';
import { tabHref } from './room/tabs';
import { pathLength } from '../data/ruler';
import { CalibrateForm, RulerLayer, RulerPanel, SaveMeasureForm, SavedPlanMeasures, initialRuler, useMmPerPx, type RulerState } from './PlanRuler';

const zooms = ['Fit', '1.5×', '2×', '3×'] as const;
const zoomScale = { Fit: 1, '1.5×': 1.5, '2×': 2, '3×': 3 };

type Fit = 'match' | 'differs' | 'partial' | 'none';

/** How a room's measured size compares with the plan. */
function compare(room: Room, measurements: Measurement[]) {
  const plan = planRooms[room.id];
  const { width, length } = roomSize(measurements, room.id);
  const w = width?.widthMm;
  const l = length?.depthMm;
  const within = (v: number, p: number) => Math.abs(v - p) / p <= MATCH_TOLERANCE;
  let fit: Fit = 'none';
  if (w && l) fit = within(w, plan.planMm[0]) && within(l, plan.planMm[1]) ? 'match' : 'differs';
  else if (w || l) fit = 'partial';
  return { plan, w, l, fit, dw: w ? w - plan.planMm[0] : undefined, dl: l ? l - plan.planMm[1] : undefined };
}

const m2 = (mm: number) => (mm / 1000).toFixed(2);
const signed = (mm: number) => `${mm > 0 ? '+' : mm < 0 ? '−' : '±'}${Math.abs(mm).toLocaleString('en-SG')}`;

/** Position of a plan rectangle as percentages of the drawing, for HTML overlays. */
const pct = ([x, y, w, h]: Rect) => ({
  left: `${((x - planBounds.x) / planBounds.w) * 100}%`,
  top: `${((y - planBounds.y) / planBounds.h) * 100}%`,
  width: `${(w / planBounds.w) * 100}%`,
  height: `${(h / planBounds.h) * 100}%`,
});

export function FloorPlanPage() {
  const { data } = useStore();
  const roomName = useRoomName();
  // Phones start zoomed in so room labels are readable; scroll sideways to see the rest.
  const [zoom, setZoom] = useState<(typeof zooms)[number]>(() => (window.innerWidth < 700 ? '2×' : 'Fit'));
  const [showMeasured, setShowMeasured] = useState(true);
  const [showDrawing, setShowDrawing] = useState(true);
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  // Ruler
  const [rulerOn, setRulerOn] = useState(false);
  const [ruler, setRuler] = useState<RulerState>(initialRuler);
  const [showSaved, setShowSaved] = useState(true);
  const [selected, setSelected] = useState<string | undefined>();
  const [rulerModal, setRulerModal] = useState<'save' | 'calibrate' | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mmPerPx = useMmPerPx(canvasRef);

  const fp = data.floorPlan;
  const drawingUrl = useImageUrl(fp?.imageId ?? '', 'full', !!fp);
  const drawing = fp && drawingUrl && showDrawing ? { url: drawingUrl, fp } : null;

  const onPlan = data.rooms.filter((r) => planRooms[r.id]);
  const offPlan = data.rooms.filter((r) => !planRooms[r.id]);
  const results = onPlan.map((r) => ({ room: r, ...compare(r, data.measurements) }));
  const counts = { match: results.filter((r) => r.fit === 'match').length, differs: results.filter((r) => r.fit === 'differs').length };
  const zi = zooms.indexOf(zoom);

  return (
    <>
      <PageHeader
        eyebrow="Type 4BR G1 · 179 m²"
        title="Floor Plan"
        subtitle="Outlines show each room's measured width × length, drawn to scale. Tap a room to update its measurements, or use the Ruler to measure anything on the plan."
      />

      <div className="toolbar spread">
        <div className="chips">
          <button className={`chip ${showMeasured ? 'chip-active' : ''}`} aria-pressed={showMeasured} onClick={() => setShowMeasured((s) => !s)}>Measured sizes</button>
          {fp && <button className={`chip ${showDrawing ? 'chip-active' : ''}`} aria-pressed={showDrawing} onClick={() => setShowDrawing((s) => !s)}>Plan drawing</button>}
          {data.planMeasures.length > 0 && <button className={`chip ${showSaved ? 'chip-active' : ''}`} aria-pressed={showSaved} onClick={() => setShowSaved((s) => !s)}>Ruler marks</button>}
          <button className={`chip ruler-chip ${rulerOn ? 'chip-active' : ''}`} aria-pressed={rulerOn} onClick={() => { setRulerOn((on) => !on); setRuler((r) => ({ ...r, points: [] })); }}>
            <Ruler size={14} /> Ruler
          </button>
        </div>
        <div className="zoom">
          <button className="icon-btn" aria-label="Zoom out" disabled={zi === 0} onClick={() => setZoom(zooms[zi - 1])}><Minus size={18} /></button>
          <Chips options={zooms} value={zoom} onChange={setZoom} />
          <button className="icon-btn" aria-label="Zoom in" disabled={zi === zooms.length - 1} onClick={() => setZoom(zooms[zi + 1])}><Plus size={18} /></button>
        </div>
      </div>

      {rulerOn && <RulerPanel st={ruler} set={setRuler} mmPerPx={mmPerPx} onSave={() => setRulerModal('save')} onCalibrate={() => setRulerModal('calibrate')} />}

      <div className="fp-scroll">
        <div ref={canvasRef} className={`fp-canvas ${drawing ? 'with-drawing' : ''} ${rulerOn ? 'ruler-on' : ''}`} style={{ width: `${zoomScale[zoom] * 100}%`, aspectRatio: `${planBounds.w} / ${planBounds.h}` }}>
          <svg className="fp-svg" viewBox={`${planBounds.x} ${planBounds.y} ${planBounds.w} ${planBounds.h}`} aria-hidden>
            {drawing && (
              <image
                href={drawing.url}
                x={-drawing.fp.originX / drawing.fp.pxPerMm}
                y={-drawing.fp.originY / drawing.fp.pxPerMm}
                width={drawing.fp.width / drawing.fp.pxPerMm}
                height={drawing.fp.height / drawing.fp.pxPerMm}
                preserveAspectRatio="none"
              />
            )}
            {!drawing && planCommon.map((c) => <rect key={c.name} className="fp-common" x={c.rect[0]} y={c.rect[1]} width={c.rect[2]} height={c.rect[3]} />)}
            {results.map(({ room, plan, fit }) => (
              <g key={room.id} className={`fp-room fit-${fit}`} onClick={() => setOpenRoom(room.id)}>
                {[plan.main, ...(plan.extra ?? [])].map((r, i) => (
                  <rect key={i} x={r[0] + 40} y={r[1] + 40} width={r[2] - 80} height={r[3] - 80} rx={60} />
                ))}
              </g>
            ))}
            {showMeasured &&
              results.map(({ room, plan, w, l, fit }) =>
                w && l ? (
                  <rect key={room.id} className={`fp-measured fit-${fit}`} x={plan.main[0]} y={plan.main[1]} width={w} height={l} />
                ) : null,
              )}
          </svg>

          {!drawing && planCommon.map((c) => (
            <span key={c.name} className="fp-common-label" style={pct(c.rect)}>{c.name}</span>
          ))}
          {!drawing && results.flatMap(({ room, plan }) =>
            (plan.extra ?? []).map((r, i) => (
              <span key={`${room.id}-${i}`} className="fp-common-label" style={pct(r)}>{plan.extraNames?.[i]}</span>
            )),
          )}
          {results.map(({ room, plan, w, l, fit }) => (
            <button key={room.id} type="button" className={`fp-label fit-${fit}`} style={pct(plan.main)} onClick={() => setOpenRoom(room.id)} aria-label={`${roomName(room.id)}: ${w && l ? `measured ${m2(w)} by ${m2(l)} metres` : 'not measured'}. Tap to update.`}>
              <span className="fp-label-inner">
                <strong>{room.name}</strong>
                {showMeasured && (w || l) ? (
                  <span className="fp-size">{w ? m2(w) : '?'} × {l ? m2(l) : '?'} m</span>
                ) : (
                  <span className="fp-size plan">plan {m2(plan.planMm[0])} × {m2(plan.planMm[1])}</span>
                )}
              </span>
            </button>
          ))}
          <RulerLayer
            canvasRef={canvasRef}
            active={rulerOn}
            st={ruler}
            set={setRuler}
            saved={showSaved ? data.planMeasures : []}
            selected={selected}
            drawing={fp && drawingUrl ? { url: drawingUrl, fp } : null}
            mmPerPx={mmPerPx}
          />
        </div>
      </div>

      <div className="fp-legend">
        <span><i className="lg match" /> Matches plan (within 5%)</span>
        <span><i className="lg differs" /> Differs from plan</span>
        <span><i className="lg none" /> Not measured yet</span>
        <span className="row-sub">Width = left ↔ right on the plan · Length = top ↕ bottom</span>
      </div>

      <Card title="Measured vs plan" action={<span className="row-sub">{counts.match} match · {counts.differs} differ</span>}>
        <div className="fp-table" role="table">
          <div className="fp-row head" role="row">
            <span role="columnheader">Room</span>
            <span role="columnheader">Plan (W × L)</span>
            <span role="columnheader">Measured</span>
            <span role="columnheader">Difference</span>
          </div>
          {results.map(({ room, plan, w, l, fit, dw, dl }) => (
            <button key={room.id} type="button" className="fp-row" role="row" onClick={() => setOpenRoom(room.id)}>
              <span role="cell" className="fp-room-cell"><FitIcon fit={fit} /> {roomName(room.id)}</span>
              <span role="cell" className="mono">{m2(plan.planMm[0])} × {m2(plan.planMm[1])} m</span>
              <span role="cell" className="mono">{w || l ? `${w ? m2(w) : '—'} × ${l ? m2(l) : '—'} m` : <em className="muted">Not measured</em>}</span>
              <span role="cell" className={`mono diff fit-${fit}`}>
                {dw !== undefined || dl !== undefined ? `${dw !== undefined ? signed(dw) : '—'} / ${dl !== undefined ? signed(dl) : '—'} mm` : ''}
              </span>
            </button>
          ))}
        </div>
        {offPlan.length > 0 && (
          <p className="row-sub fp-off">Not on the floor plan: {offPlan.map((r) => r.name).join(', ')}.</p>
        )}
      </Card>

      <SavedPlanMeasures selected={selected} onSelect={(id) => { setSelected(id); if (id) setShowSaved(true); }} />

      {rulerModal === 'save' && <SaveMeasureForm draft={{ kind: ruler.tool, points: ruler.points }} onClose={() => setRulerModal(null)} onSaved={() => setRuler((r) => ({ ...r, points: [] }))} />}
      {rulerModal === 'calibrate' && <CalibrateForm rawMm={pathLength(ruler.points)} onClose={() => setRulerModal(null)} />}
      {openRoom && <RoomPlanSheet room={data.rooms.find((r) => r.id === openRoom)!} onClose={() => setOpenRoom(null)} />}
    </>
  );
}

function FitIcon({ fit }: { fit: Fit }) {
  if (fit === 'match') return <span className="fit-icon match" title="Matches plan"><Check size={12} strokeWidth={3} /></span>;
  if (fit === 'differs') return <span className="fit-icon differs" title="Differs from plan"><TriangleAlert size={12} strokeWidth={2.5} /></span>;
  return <span className="fit-icon none" title="Not fully measured" />;
}

/** Quick view of one room: plan size vs measured, with buttons to update width and length. */
function RoomPlanSheet({ room, onClose }: { room: Room; onClose: () => void }) {
  const { data } = useStore();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<{ kind: MeasurementKind; item?: Measurement } | null>(null);
  const { plan, w, l, fit, dw, dl } = compare(room, data.measurements);
  const { width, length } = roomSize(data.measurements, room.id);

  const tile = (label: string, kind: MeasurementKind, value: number | undefined, planValue: number, diff: number | undefined, item?: Measurement) => (
    <button type="button" className={`size-tile ${value ? '' : 'empty'}`} onClick={() => setEditing({ kind, item })}>
      <span className="fact-label">{label} <span className="muted">· plan {planValue.toLocaleString('en-SG')} mm</span></span>
      {value ? <span className="size-value">{value.toLocaleString('en-SG')} mm</span> : <span className="size-add"><Plus size={16} /> Add</span>}
      {diff !== undefined && <span className={`diff fit-${Math.abs(diff) / planValue <= MATCH_TOLERANCE ? 'match' : 'differs'}`}>{signed(diff)} mm vs plan</span>}
    </button>
  );

  return (
    <>
      <EditorModal title={roomName(room.id)} onClose={onClose} onSave={onClose} saveLabel="Done">
        {plan.planName && <p className="row-sub">Shown as “{plan.planName}” on the developer's plan.</p>}
        <div className="size-grid two">
          {tile('Width (left ↔ right)', 'roomWidth', w, plan.planMm[0], dw, width)}
          {tile('Length (top ↕ bottom)', 'roomLength', l, plan.planMm[1], dl, length)}
        </div>
        <p className={`fp-verdict fit-${fit}`}>
          <FitIcon fit={fit} />
          {fit === 'match' && 'Measured size matches the plan.'}
          {fit === 'differs' && 'Measured size differs from the plan by more than 5%. Worth double-checking before ordering built-ins.'}
          {fit === 'partial' && 'Add both width and length to compare with the plan.'}
          {fit === 'none' && 'Not measured yet. Tap width or length to add it.'}
        </p>
        <a className="link" href={tabHref(room.id, 'measurements')} onClick={onClose}>All measurements for this room <ArrowRight size={15} /></a>
      </EditorModal>
      {editing && <MeasurementEditor measurement={editing.item} kind={editing.kind} roomId={room.id} onClose={() => setEditing(null)} />}
    </>
  );
}
