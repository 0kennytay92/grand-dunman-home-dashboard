import type { PhotoTag } from './types';

/** Photo categories, in the order they are shown. */
export const photoTags: PhotoTag[] = ['Existing Condition', 'Measurement', 'Design Reference', 'Renovation Progress'];

/** Filter options for photo lists. */
export const photoFilters = ['All', ...photoTags] as const;
export type PhotoFilter = (typeof photoFilters)[number];
