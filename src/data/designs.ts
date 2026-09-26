import type { AppData, Design, DesignStatus } from './types';

export const designStatuses: DesignStatus[] = ['Concept', 'Shortlisted', 'Selected', 'Rejected'];

/** Converts designs saved by earlier versions of the app to the current format. */
export function upgradeDesigns(list: Partial<Design>[]): Design[] {
  const oldStatus: Record<string, DesignStatus> = { Draft: 'Concept', 'Under review': 'Shortlisted', Approved: 'Selected' };
  return list.map((d) => ({
    ...(d as Design),
    status: oldStatus[d.status as string] ?? (designStatuses.includes(d.status as DesignStatus) ? (d.status as DesignStatus) : 'Concept'),
    version: d.version ?? 'v1',
    date: d.date ?? '',
    notes: d.notes ?? '',
    prompt: d.prompt ?? '',
    referenceIds: Array.isArray(d.referenceIds) ? d.referenceIds : [],
  }));
}

/** The next version label for a room's design, e.g. "v3". */
export function nextVersion(designs: Design[], roomId: string, title: string) {
  const key = title.trim().toLowerCase();
  const same = designs.filter((d) => d.roomId === roomId && d.title.trim().toLowerCase() === key);
  const numbers = same.map((d) => parseInt(d.version.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  return `v${(numbers.length ? Math.max(...numbers) : 0) + 1}`;
}

/** Every stored image id in use: photos, design renders and reference images. */
export function imageIdsInUse(data: Pick<AppData, 'photos' | 'designs'>) {
  return [
    ...data.photos.filter((p) => p.hasImage).map((p) => p.id),
    ...data.designs.filter((d) => d.hasImage).map((d) => d.id),
    ...data.designs.flatMap((d) => d.referenceIds),
  ];
}

/** Image ids belonging to one design (its render and references). */
export const designImageIds = (d: Design) => [...(d.hasImage ? [d.id] : []), ...d.referenceIds];
