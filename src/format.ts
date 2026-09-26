const sgd = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

const sgdCents = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "S$1,500", or "S$1,499.50" when there are cents. */
export const money = (n: number) => (Math.round(n * 100) % 100 === 0 ? sgd : sgdCents).format(n);

export const mm = (n: number) => n.toLocaleString('en-SG');

/** "24 m²", or "" when the area hasn't been entered yet. */
export const area = (sqm: number) => (sqm > 0 ? `${sqm.toLocaleString('en-SG')} m²` : '');

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-SG', opts);
}

export function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
