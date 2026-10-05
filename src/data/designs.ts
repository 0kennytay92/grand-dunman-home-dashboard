import type { AppData, Design, DesignStatus, PurchaseItem } from './types';

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

/** Every stored image id in use: photos, design renders, reference images, item photos and videos, and documents. */
/** Every picture or file belonging to an item: photos, videos and inspection photos. */
export const itemImageIds = (i: PurchaseItem) => [
  ...i.photoIds, ...(i.videoIds ?? []), ...(i.deliveryInspection?.photoIds ?? []), ...(i.installationInspection?.photoIds ?? []),
];

export function imageIdsInUse(data: Pick<AppData, 'photos' | 'designs' | 'floorPlan' | 'purchases' | 'documents' | 'issues' | 'messages' | 'notes'>) {
  return [
    ...(data.floorPlan ? [data.floorPlan.imageId] : []),
    ...data.photos.filter((p) => p.hasImage).map((p) => p.id),
    ...data.designs.filter((d) => d.hasImage).map((d) => d.id),
    ...data.designs.flatMap((d) => d.referenceIds),
    ...data.purchases.flatMap(itemImageIds),
    ...data.documents.map((d) => d.id),
    ...data.issues.flatMap((x) => x.photoIds),
    ...data.messages.flatMap((x) => x.photoIds),
    ...data.notes.flatMap((x) => x.photoIds),
  ];
}

/** Image ids belonging to one design (its render and references). */
export const designImageIds = (d: Design) => [...(d.hasImage ? [d.id] : []), ...d.referenceIds];

/** What a stored picture/file belongs to, in words (for sync messages), e.g. "Render of “Desk options”". */
export function describeImage(data: AppData, id: string): string {
  const photo = data.photos.find((p) => p.id === id);
  if (photo) return `Photo${photo.caption ? ` “${photo.caption}”` : ''} (${photo.date})`;
  const design = data.designs.find((d) => d.id === id);
  if (design) return `Render of “${design.title}” ${design.version}`;
  const ref = data.designs.find((d) => d.referenceIds.includes(id));
  if (ref) return `Reference image for “${ref.title}”`;
  if (data.floorPlan?.imageId === id) return 'Floor plan drawing';
  const item = data.purchases.find((i) => i.photoIds.includes(id) || i.videoIds?.includes(id) || i.deliveryInspection?.photoIds.includes(id) || i.installationInspection?.photoIds.includes(id));
  if (item) return `${item.videoIds?.includes(id) ? 'Video' : 'Photo'} of “${item.name}”`;
  const doc = data.documents.find((d) => d.id === id);
  if (doc) return `Document “${doc.title}”`;
  const issue = data.issues.find((x) => x.photoIds.includes(id));
  if (issue) return `Photo for issue “${issue.title}”`;
  if (data.messages.some((m) => m.photoIds.includes(id))) return 'Message screenshot';
  if (data.notes.some((n) => n.photoIds.includes(id))) return 'Note photo';
  return 'A picture that has since been deleted';
}
