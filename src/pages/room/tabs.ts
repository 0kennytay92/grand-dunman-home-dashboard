import { href } from '../../router';

export type RoomTab = 'overview' | 'photos' | 'measurements' | 'designs' | 'budget';

/** Web address of a tab on a room's page, e.g. #/rooms/dining/measurements */
export const tabHref = (roomId: string, tab: RoomTab) => href(tab === 'overview' ? `/rooms/${roomId}` : `/rooms/${roomId}/${tab}`);
