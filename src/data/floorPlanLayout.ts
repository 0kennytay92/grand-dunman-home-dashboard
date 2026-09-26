// ─────────────────────────────────────────────────────────────
// FLOOR PLAN LAYOUT – Grand Dunman Type 4BR G1 (179 m²)
// Where each room sits on the plan, in millimetres from the
// inside top-left corner of the living room. Traced from the
// developer's unit floor plan using its dimension lines.
//
//   x → left to right on the plan   (a room's WIDTH)
//   y ↓ top to bottom on the plan   (a room's LENGTH)
// ─────────────────────────────────────────────────────────────

export type Rect = [x: number, y: number, w: number, h: number];

export interface PlanRoom {
  /** The room's main space; measured width × length is drawn from its top-left corner. */
  main: Rect;
  /** Attached spaces drawn in the same colour (e.g. the master bath). */
  extra?: Rect[];
  extraNames?: string[];
  /** Size on the plan (width × length, mm). Printed dimensions where the plan gives them. */
  planMm: [number, number];
  /** Name printed on the plan, when it differs from the app's room name. */
  planName?: string;
}

export const planRooms: Record<string, PlanRoom> = {
  living: { main: [0, -183, 3798, 4679], planMm: [3800, 4700] },
  dining: { main: [0, 4495, 3798, 3578], planMm: [3800, 3600] },
  'dry-kitchen': { main: [0, 8073, 3798, 1193], planMm: [3800, 1200] },
  balcony: { main: [-1798, 3890, 1560, 5339], planMm: [1550, 5350] },
  'bedroom-2': { main: [3982, -183, 2624, 3798], planMm: [2600, 3800], planName: 'Bedroom 4' },
  'bedroom-3': { main: [8477, -183, 2642, 3798], extra: [[6789, -183, 1505, 3798]], extraNames: ['Bath 3'], planMm: [2600, 3800] },
  master: { main: [11284, -183, 2826, 6092], extra: [[11284, 6092, 2826, 2569]], extraNames: ['Master bath'], planMm: [2800, 5950] },
  'junior-master': { main: [-239, 9413, 4220, 2844], extra: [[4018, 9413, 2624, 1688]], extraNames: ['JM bath'], planMm: [4250, 2800] },
  'lift-lobby': { main: [3927, 4807, 1890, 2165], planMm: [1900, 2150] },
  'power-room': { main: [3927, 7064, 1890, 1101], planMm: [1900, 1100], planName: 'Powder room' },
  'wet-kitchen': { main: [5908, 8165, 5229, 1743], extra: [[9358, 7248, 1780, 917]], extraNames: ['WC'], planMm: [5250, 1750] },
  store: { main: [9358, 5963, 1780, 1193], planMm: [1800, 1200] },
  yard: { main: [11138, 8807, 3028, 1193], planMm: [3050, 1200] },
  utility: { main: [11101, 10734, 1596, 1927], planMm: [1600, 1950] },
};

/** Shared spaces that aren't rooms in the app. */
export const planCommon: { name: string; rect: Rect }[] = [
  { name: 'Private lift', rect: [6000, 4807, 2294, 2624] },
  { name: 'Gallery', rect: [8294, 4587, 1064, 3578] },
  { name: 'Foyer', rect: [12697, 10000, 1468, 2661] },
];

/** The drawing area, with a margin around the unit. */
export const planBounds = { x: -2300, y: -700, w: 17000, h: 14100 };

/** How close a measurement must be to the plan to count as matching (5%). */
export const MATCH_TOLERANCE = 0.05;
