import { rooms } from './data/sampleData';

const sgd = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

export const money = (n: number) => sgd.format(n);

export const mm = (n: number) => n.toLocaleString('en-SG');

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-SG', opts);
}

export function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function roomName(roomId: string) {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return 'Whole home';
  return room.includes ? `${room.name} & ${room.includes}` : room.name;
}

export function roomHue(roomId: string) {
  return rooms.find((r) => r.id === roomId)?.hue ?? 35;
}
