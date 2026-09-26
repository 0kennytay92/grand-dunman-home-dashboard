import { upgradeDesigns } from './designs';
import { dataUrlToBlob, putImages, type ImageBundle } from './images';
import type { Design, FloorPlanImage } from './types';

// ─────────────────────────────────────────────────────────────
// DESIGN FILES
// A ready-made bundle of designs (with their pictures) and,
// optionally, a floor plan drawing. Importing one ADDS to what
// you already have – it never replaces your other data.
// ─────────────────────────────────────────────────────────────

export interface DesignPack {
  kind: 'grand-dunman-design-pack';
  version: 1;
  name: string;
  rooms: Record<string, string>; // room id → description, e.g. "Bedroom 4 on the plan"
  designs: Design[];
  floorPlan?: FloorPlanImage;
  images: ImageBundle;
}

export function parsePack(text: string): DesignPack {
  let raw: Partial<DesignPack>;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file could not be read.');
  }
  if (raw.kind !== 'grand-dunman-design-pack' || !Array.isArray(raw.designs) || !raw.images) {
    throw new Error('This is not a design file. (To restore a full backup, use Settings & Backup.)');
  }
  return { ...(raw as DesignPack), rooms: raw.rooms ?? {}, designs: upgradeDesigns(raw.designs) };
}

/** Saves the pictures for the chosen designs (and the floor plan) on this device. */
export async function savePackImages(pack: DesignPack, designs: Design[], withFloorPlan: boolean, onProgress?: (done: number, total: number) => void) {
  const ids = [
    ...designs.flatMap((d) => [...(d.hasImage ? [d.id] : []), ...d.referenceIds]),
    ...(withFloorPlan && pack.floorPlan ? [pack.floorPlan.imageId] : []),
  ];
  let done = 0;
  for (const id of ids) {
    const img = pack.images[id];
    if (img?.full && img.thumb) await putImages(id, dataUrlToBlob(img.full), dataUrlToBlob(img.thumb));
    onProgress?.(++done, ids.length);
  }
}
