import { planCommon, planRooms, type Rect } from './floorPlanLayout';

// ─────────────────────────────────────────────────────────────
// FLOOR PLAN RULER – the maths
// Points are plan coordinates in millimetres (x → right, y ↓ down).
// The calibration factor (1 = plan as drawn) is applied when
// showing a result, so saved points never need changing.
// ─────────────────────────────────────────────────────────────

export type Pt = [number, number];

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Total length along the points, in mm (raw plan scale). */
export function pathLength(points: Pt[], closed = false) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  if (closed && points.length > 2) total += dist(points[points.length - 1], points[0]);
  return total;
}

/** Area inside the points, in mm² (raw plan scale). */
export function polygonArea(points: Pt[]) {
  if (points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** "3.42 m" – mm on the plan × calibration, to 2 decimal places. */
export const metres = (mm: number, cal = 1) => `${((mm * cal) / 1000).toFixed(2)} m`;
/** "12.40 m²" – area scales with the square of the calibration. */
export const squareMetres = (mm2: number, cal = 1) => `${((mm2 * cal * cal) / 1_000_000).toFixed(2)} m²`;

/** Within this angle of horizontal/vertical, a line is straightened. */
const STRAIGHT_DEG = 6;

/** Straightens the line from `ref` to `p` when it's nearly horizontal or vertical. Returns the locked axis. */
export function straighten(p: Pt, ref: Pt | undefined): { p: Pt; lock: 'h' | 'v' | null } {
  if (!ref) return { p, lock: null };
  const dx = p[0] - ref[0];
  const dy = p[1] - ref[1];
  if (Math.hypot(dx, dy) < 1) return { p, lock: null };
  const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  if (angle <= STRAIGHT_DEG) return { p: [p[0], ref[1]], lock: 'h' };
  if (angle >= 90 - STRAIGHT_DEG) return { p: [ref[0], p[1]], lock: 'v' };
  return { p, lock: null };
}

interface Edge { at: number; from: number; to: number } // a wall line: x (or y) = at, spanning from..to

function edges(): { vertical: Edge[]; horizontal: Edge[] } {
  const rects: Rect[] = [
    ...Object.values(planRooms).flatMap((r) => [r.main, ...(r.extra ?? [])]),
    ...planCommon.map((c) => c.rect),
  ];
  const vertical: Edge[] = [];
  const horizontal: Edge[] = [];
  for (const [x, y, w, h] of rects) {
    vertical.push({ at: x, from: y, to: y + h }, { at: x + w, from: y, to: y + h });
    horizontal.push({ at: y, from: x, to: x + w }, { at: y + h, from: x, to: x + w });
  }
  return { vertical, horizontal };
}
const EDGES = edges();

/** Moves a point onto the nearest room edge within `tolerance` mm (only the axes not locked straight). */
export function snapToWalls(p: Pt, tolerance: number, lock: 'h' | 'v' | null): { p: Pt; snapped: boolean } {
  let [x, y] = p;
  let snapped = false;
  const near = (list: Edge[], along: number, across: number) => {
    let best: Edge | undefined;
    for (const e of list) {
      if (along < e.from - tolerance || along > e.to + tolerance) continue;
      if (Math.abs(across - e.at) <= tolerance && (!best || Math.abs(across - e.at) < Math.abs(across - best.at))) best = e;
    }
    return best;
  };
  if (lock !== 'v') {
    // x is free: snap to a vertical wall
    const e = near(EDGES.vertical, y, x);
    if (e) { x = e.at; snapped = true; }
  }
  if (lock !== 'h') {
    const e = near(EDGES.horizontal, x, y);
    if (e) { y = e.at; snapped = true; }
  }
  return { p: [x, y], snapped };
}

/** Which room a point is in (by the plan layout), if any. */
export function roomAt([x, y]: Pt): string | undefined {
  for (const [id, r] of Object.entries(planRooms)) {
    for (const [rx, ry, rw, rh] of [r.main, ...(r.extra ?? [])]) {
      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return id;
    }
  }
  return undefined;
}

/** The middle of a shape, for placing its label. */
export function centre(points: Pt[]): Pt {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}
