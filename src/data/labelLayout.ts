import { kindInfo } from './measurementKinds';
import type { Measurement } from './types';

// ─────────────────────────────────────────────────────────────
// LABEL PLACEMENT
// Each label can sit to the left or right of its dot, and above or
// below it. This picks the combination where labels overlap each
// other the least and stay inside the photo.
// ─────────────────────────────────────────────────────────────

export type Placement = { side: 'left' | 'right'; vert: 'above' | 'below' };

/** The text lines of a label, e.g. ["Width 3,200 mm", "Height 2,400 mm"]. */
export function labelLines(m: Measurement) {
  return kindInfo[m.kind].fields
    .filter((f) => m[f.field] !== undefined)
    .map((f) => `${f.label} ${m[f.field]!.toLocaleString('en-SG')} mm`);
}

const options: Placement[] = [
  { side: 'right', vert: 'above' },
  { side: 'left', vert: 'above' },
  { side: 'right', vert: 'below' },
  { side: 'left', vert: 'below' },
];

type Rect = { x1: number; y1: number; x2: number; y2: number };
const GAP = 12; // distance from the dot to the label (matches the CSS)

export function layoutLabels(labels: Measurement[], width: number, height: number, compact: boolean): Record<string, Placement> {
  const charW = compact ? 6.9 : 7.5;
  const lineH = compact ? 16 : 17.5;
  const pad = compact ? 16 : 20;

  const items = labels.map((m) => {
    const lines = [m.item, ...labelLines(m)];
    const w = Math.max(...lines.map((l) => l.length)) * charW + pad;
    const h = lines.length * lineH + (compact ? 10 : 14);
    return { id: m.id, px: m.pin!.x * width, py: m.pin!.y * height, w, h };
  });

  const rectFor = (it: (typeof items)[number], p: Placement): Rect => {
    const x1 = p.side === 'right' ? it.px + GAP : it.px - GAP - it.w;
    const y1 = p.vert === 'above' ? it.py - GAP - it.h : it.py + GAP;
    return { x1, y1, x2: x1 + it.w, y2: y1 + it.h };
  };
  const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const outside = (r: Rect) => (r.x2 - r.x1) * (r.y2 - r.y1) - overlap(r, { x1: 0, y1: 0, x2: width, y2: height });
  const dots = items.map((it) => ({ x1: it.px - 10, y1: it.py - 10, x2: it.px + 10, y2: it.py + 10 }));

  const cost = (choice: number[]) => {
    const rects = choice.map((c, i) => rectFor(items[i], options[c]));
    let total = 0;
    rects.forEach((r, i) => {
      total += outside(r) * 2 + choice[i]; // small preference for the first option
      rects.forEach((o, j) => j > i && (total += overlap(r, o) * 3));
      dots.forEach((d, j) => j !== i && (total += overlap(r, d) * 3));
    });
    return total;
  };

  // Try every combination for a handful of labels; otherwise place them one at a time.
  let best = items.map(() => 0);
  if (items.length <= 6) {
    let bestCost = Infinity;
    const total = options.length ** items.length;
    for (let n = 0; n < total; n++) {
      const choice = items.map((_, i) => Math.floor(n / options.length ** i) % options.length);
      const c = cost(choice);
      if (c < bestCost) [bestCost, best] = [c, choice];
    }
  } else {
    items.forEach((_, i) => {
      let bestC = Infinity;
      options.forEach((_, o) => {
        const trial = [...best.slice(0, i), o];
        const c = cost(trial);
        if (c < bestC) [bestC, best[i]] = [c, o];
      });
    });
  }
  return Object.fromEntries(items.map((it, i) => [it.id, options[best[i]]]));
}
