import type { Measurement, MeasurementKind } from './types';

// ─────────────────────────────────────────────────────────────
// MEASUREMENT TYPES
// Which sizes each kind of measurement asks for, and how it is
// labelled. All sizes are stored in millimetres.
// ─────────────────────────────────────────────────────────────

export type SizeField = 'widthMm' | 'depthMm' | 'heightMm' | 'sillMm';

interface KindInfo {
  label: string; // "Window"
  plural: string; // "Windows"
  /** Room width / length / ceiling height: one value per room, no name needed. */
  single: boolean;
  fields: { field: SizeField; label: string; short: string }[];
  namePlaceholder?: string;
}

export const kindInfo: Record<MeasurementKind, KindInfo> = {
  roomWidth: { label: 'Room width', plural: 'Room width', single: true, fields: [{ field: 'widthMm', label: 'Width', short: '' }] },
  roomLength: { label: 'Room length', plural: 'Room length', single: true, fields: [{ field: 'depthMm', label: 'Length', short: '' }] },
  ceilingHeight: { label: 'Ceiling height', plural: 'Ceiling height', single: true, fields: [{ field: 'heightMm', label: 'Height', short: '' }] },
  wall: {
    label: 'Wall', plural: 'Walls', single: false, namePlaceholder: 'e.g. TV feature wall',
    fields: [{ field: 'widthMm', label: 'Width', short: 'W' }, { field: 'heightMm', label: 'Height', short: 'H' }],
  },
  door: {
    label: 'Door', plural: 'Doors', single: false, namePlaceholder: 'e.g. Main door, Kitchen opening',
    fields: [{ field: 'widthMm', label: 'Width', short: 'W' }, { field: 'heightMm', label: 'Height', short: 'H' }],
  },
  window: {
    label: 'Window', plural: 'Windows', single: false, namePlaceholder: 'e.g. Bay window',
    fields: [
      { field: 'widthMm', label: 'Width', short: 'W' },
      { field: 'heightMm', label: 'Height', short: 'H' },
      { field: 'sillMm', label: 'Height from floor', short: 'from floor' },
    ],
  },
  other: {
    label: 'Other', plural: 'Other', single: false, namePlaceholder: 'e.g. Island counter, Aircon ledge',
    fields: [{ field: 'widthMm', label: 'Width', short: 'W' }, { field: 'depthMm', label: 'Depth', short: 'D' }, { field: 'heightMm', label: 'Height', short: 'H' }],
  },
};

export const kindOrder: MeasurementKind[] = ['roomWidth', 'roomLength', 'ceilingHeight', 'wall', 'door', 'window', 'other'];
export const singleKinds = kindOrder.filter((k) => kindInfo[k].single);
export const listKinds = kindOrder.filter((k) => !kindInfo[k].single);

// ── Units ────────────────────────────────────────────────────

export const units = ['mm', 'cm', 'm'] as const;
export type Unit = (typeof units)[number];

export function inUnit(valueMm: number, unit: Unit) {
  if (unit === 'mm') return valueMm.toLocaleString('en-SG');
  if (unit === 'cm') return (valueMm / 10).toLocaleString('en-SG', { maximumFractionDigits: 1 });
  return (valueMm / 1000).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

/** e.g. "1,800 W × 1,500 H mm · 900 from floor", or "3,500 mm" for a room width. */
export function formatMeasurement(m: Measurement, unit: Unit = 'mm') {
  const info = kindInfo[m.kind] ?? kindInfo.other;
  if (info.single) {
    const v = m[info.fields[0].field];
    return v === undefined ? '—' : `${inUnit(v, unit)} ${unit}`;
  }
  const main = info.fields
    .filter((f) => f.field !== 'sillMm' && m[f.field] !== undefined)
    .map((f) => `${inUnit(m[f.field]!, unit)} ${f.short}`);
  let text = main.length ? `${main.join(' × ')} ${unit}` : '';
  if (m.sillMm !== undefined) text += `${text ? ' · ' : ''}${inUnit(m.sillMm, unit)} ${unit} from floor`;
  return text || '—';
}

/** The room's width, length, ceiling height and worked-out floor area. */
export function roomSize(measurements: Measurement[], roomId: string) {
  const find = (k: MeasurementKind) => measurements.find((m) => m.roomId === roomId && m.kind === k);
  const width = find('roomWidth');
  const length = find('roomLength');
  const ceiling = find('ceilingHeight');
  const w = width?.widthMm;
  const l = length?.depthMm;
  const areaSqm = w && l ? Math.round((w * l) / 10_000) / 100 : undefined; // 2 decimals
  return { width, length, ceiling, areaSqm };
}

/**
 * Converts measurements saved by earlier versions of the app (which had
 * no "kind") into the new format, so nothing already entered is lost.
 */
export function upgradeMeasurements(list: Partial<Measurement>[]): Measurement[] {
  return list.flatMap((raw) => {
    const m = raw as Measurement;
    if (m.kind && kindInfo[m.kind]) return [m];
    const name = (m.item ?? '').trim();
    if (/^floor area$/i.test(name) && m.widthMm && m.depthMm) {
      return [
        { id: `${m.id}-w`, roomId: m.roomId, kind: 'roomWidth', item: 'Room width', widthMm: m.widthMm, note: m.note },
        { id: `${m.id}-l`, roomId: m.roomId, kind: 'roomLength', item: 'Room length', depthMm: m.depthMm },
      ];
    }
    if (/ceiling height/i.test(name) && m.heightMm) return [{ ...m, kind: 'ceilingHeight', item: 'Ceiling height' }];
    if (/window/i.test(name)) return [{ ...m, kind: 'window' }];
    if (/door/i.test(name)) return [{ ...m, kind: 'door' }];
    if (/wall/i.test(name)) return [{ ...m, kind: 'wall' }];
    return [{ ...m, kind: 'other' }];
  });
}

/** Floor area to show for a room: worked out from width × length when both are measured. */
export function roomArea(room: { id: string; areaSqm: number }, measurements: Measurement[]) {
  return roomSize(measurements, room.id).areaSqm ?? room.areaSqm;
}
