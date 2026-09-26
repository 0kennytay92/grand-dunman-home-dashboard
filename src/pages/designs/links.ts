import { href } from '../../router';

export const designHref = (id: string) => href(`/designs/${id}`);
export const compareHref = (roomId: string) => href(`/designs/compare/${roomId}`);
