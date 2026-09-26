import type { AmountChange, AmountStatus, AppData, BudgetCategory, DeliveryStatus, InstallationStatus, Payment, PaymentType, PurchaseItem, Vendor } from './types';

// ─────────────────────────────────────────────────────────────
// RENOVATION BUDGET
// The money rules, in one place:
//   PAID      = the item's paid payments (refunds subtracted)
//   REMAINING = total amount − paid
//   PROGRESS  = paid ÷ total amount
// An item whose amount is TBD (unknown) is never counted as $0:
// it is left out of the totals and counted separately.
// ─────────────────────────────────────────────────────────────

export const deliveryStatuses: DeliveryStatus[] = [
  'Not Ordered', 'Ordered', 'Awaiting Delivery Date', 'Delivery Scheduled',
  'Partially Delivered', 'Delivered', 'Delivery Issue', 'Returned / Exchanged',
];

export const installationStatuses: InstallationStatus[] = [
  'Not Required', 'Awaiting Installation', 'Installation Scheduled', 'Installation In Progress',
  'Installed', 'Installation Issue', 'Completed',
];

export const paymentTypes: PaymentType[] = ['Deposit', 'Progress Payment', 'Final Payment', 'Refund', 'Other'];
export const paymentMethods = ['PayNow', 'Bank transfer', 'Credit card', 'Debit card', 'Cash', 'Cheque', 'Other'];
export const amountStatuses: AmountStatus[] = ['Estimated', 'Confirmed'];

export const suggestedCategories = [
  'Interior Design', 'Carpentry', 'Furniture', 'Electrical', 'Lighting', 'Appliances', 'Curtains / Blinds',
  'Flooring', 'Smart Home', 'Kitchen', 'Bathroom', 'Balcony', 'Air Conditioning', 'Moving', 'Other',
];

/** A payment's effect on "paid": refunds count as negative, scheduled payments don't count yet. */
export const paidValue = (p: Payment) => (p.status !== 'Paid' ? 0 : p.type === 'Refund' ? -p.amount : p.amount);

export type PaymentState = 'TBD' | 'Not paid' | 'Partly paid' | 'Fully paid' | 'Overpaid';
export const paymentStates: PaymentState[] = ['TBD', 'Not paid', 'Partly paid', 'Fully paid', 'Overpaid'];

export interface ItemMoney {
  total: number | null;
  paid: number;
  remaining: number | null;
  pct: number | null; // 0–100+, null when TBD or total is 0
  state: PaymentState;
  next?: Payment; // the earliest scheduled payment
}

export function itemMoney(item: PurchaseItem, payments: Payment[]): ItemMoney {
  const mine = payments.filter((p) => p.itemId === item.id);
  const paid = round2(mine.reduce((s, p) => s + paidValue(p), 0));
  const next = mine.filter((p) => p.status === 'Scheduled').sort((a, b) => a.date.localeCompare(b.date))[0];
  const total = item.totalAmount;
  if (total === null) return { total, paid, remaining: null, pct: null, state: 'TBD', next };
  const remaining = round2(total - paid);
  const pct = total > 0 ? (paid / total) * 100 : null;
  const state: PaymentState = paid <= 0 ? 'Not paid' : remaining > 0 ? 'Partly paid' : remaining === 0 ? 'Fully paid' : 'Overpaid';
  return { total, paid, remaining, pct, state, next };
}

export interface Totals {
  total: number; // sum of known amounts
  paid: number; // paid towards those items
  remaining: number;
  pct: number;
  itemCount: number;
  tbdCount: number; // items awaiting an amount (left out of the totals)
  tbdPaid: number; // already paid towards TBD items
  estimatedCount: number; // known amounts that are still estimates
}

/** Adds up a group of items (all of them, one room, one vendor…). */
export function totalsFor(items: PurchaseItem[], payments: Payment[]): Totals {
  const t: Totals = { total: 0, paid: 0, remaining: 0, pct: 0, itemCount: items.length, tbdCount: 0, tbdPaid: 0, estimatedCount: 0 };
  for (const item of items) {
    const m = itemMoney(item, payments);
    if (m.total === null) {
      t.tbdCount++;
      t.tbdPaid += m.paid;
      continue;
    }
    t.total += m.total;
    t.paid += m.paid;
    if (item.amountStatus === 'Estimated') t.estimatedCount++;
  }
  t.total = round2(t.total);
  t.paid = round2(t.paid);
  t.tbdPaid = round2(t.tbdPaid);
  t.remaining = round2(t.total - t.paid);
  t.pct = t.total > 0 ? (t.paid / t.total) * 100 : 0;
  return t;
}

/** Payments that aren't linked to an item yet (e.g. ones from before the upgrade). */
export const unlinkedPayments = (data: Pick<AppData, 'payments' | 'purchases'>) =>
  data.payments.filter((p) => !p.itemId || !data.purchases.some((i) => i.id === p.itemId));

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** "45%", or a dash when there's nothing to show. */
export const pctText = (pct: number | null) => (pct === null ? '—' : `${Math.round(pct)}%`);

export const paymentTone = (s: PaymentState) =>
  s === 'Fully paid' ? 'good' : s === 'Partly paid' ? 'info' : s === 'Overpaid' ? 'bad' : s === 'TBD' ? 'warn' : 'neutral';

export const deliveryTone = (s: DeliveryStatus) =>
  s === 'Delivered' ? 'good' : s === 'Delivery Issue' || s === 'Returned / Exchanged' ? 'bad' : s === 'Not Ordered' ? 'neutral' : 'info';

export const installationTone = (s: InstallationStatus) =>
  s === 'Installed' || s === 'Completed' ? 'good' : s === 'Installation Issue' ? 'bad' : s === 'Not Required' ? 'neutral' : 'info';

/** One word for where an item is in its journey (for the STATUS column). */
export function itemStage(item: PurchaseItem, money: ItemMoney) {
  if (item.deliveryStatus === 'Delivery Issue' || item.installationStatus === 'Installation Issue') return { label: 'Issue', tone: 'bad' as const };
  if (item.installationStatus === 'Completed' || item.installationStatus === 'Installed') return { label: 'Installed', tone: 'good' as const };
  if (item.deliveryStatus === 'Delivered') {
    return item.installationStatus === 'Not Required' ? { label: 'Delivered', tone: 'good' as const } : { label: 'To install', tone: 'info' as const };
  }
  if (item.deliveryStatus !== 'Not Ordered') return { label: 'Ordered', tone: 'info' as const };
  if (money.total === null) return { label: 'Needs quote', tone: 'warn' as const };
  return { label: 'Planning', tone: 'neutral' as const };
}

/** Records a change of total amount in the item's history (only when it actually changed). */
export function withAmount(item: PurchaseItem, total: number | null, status: AmountStatus, note: string, date: string): PurchaseItem {
  if (item.totalAmount === total && item.amountStatus === status) return item;
  const change: AmountChange = { date, from: item.totalAmount, to: total, status, ...(note.trim() ? { note: note.trim() } : {}) };
  return { ...item, totalAmount: total, amountStatus: status, amountHistory: [...(item.amountHistory ?? []), change] };
}

export function blankItem(id: string, today: string): PurchaseItem {
  return {
    id, name: '', totalAmount: null, amountStatus: 'Estimated',
    deliveryStatus: 'Not Ordered', installationStatus: 'Not Required', photoIds: [], createdAt: today,
  };
}

// ── Matching names ───────────────────────────────────────────

/** "Oak & Stone " → "oak and stone" */
export const normName = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const slug = (s: string) => normName(s).replace(/ /g, '-').slice(0, 40) || 'x';

export const findVendorByName = (vendors: Vendor[], name: string) => vendors.find((v) => normName(v.name) === normName(name));

/**
 * The category a name like "Lighting" belongs to: an exact match, or one that
 * contains it (e.g. "Electrical & Lighting"). Plural "Bathrooms" matches "Bathroom".
 */
export function findCategory(categories: BudgetCategory[], name: string) {
  const n = normName(name);
  const exact = categories.find((c) => normName(c.name) === n);
  if (exact) return exact;
  const words = (s: string) => normName(s).split(' ').map((w) => w.replace(/s$/, ''));
  const target = words(name).join(' ');
  return categories.find((c) => ` ${words(c.name).join(' ')} `.includes(` ${target} `));
}

// ── Upgrading data from before the budget upgrade ────────────

/**
 * Brings older data up to date without deleting anything:
 * - adds the suggested categories that are missing (once)
 * - copies every old payment into the new payments list, creating vendor records from the "Paid to" names
 * Ids are fixed (not random), so two devices upgrading at once produce the same records, not duplicates.
 * Returns the same object when there's nothing to do.
 */
export function upgradeBudget(data: AppData): AppData {
  let next = data;
  // (Skipped while the category list is empty, e.g. mid-download from the online copy, so nothing is doubled up.)
  if ((data.project.budgetVersion ?? 0) < 2 && data.budgetCategories.length > 0) {
    const added: BudgetCategory[] = [];
    for (const name of suggestedCategories) {
      const all = [...data.budgetCategories, ...added];
      if (findCategory(all, name) || all.some((c) => c.id === `cat-${slug(name)}`)) continue;
      added.push({ id: `cat-${slug(name)}`, name, budget: 0 });
    }
    next = { ...next, project: { ...next.project, budgetVersion: 2 }, budgetCategories: [...data.budgetCategories, ...added] };
  }

  const todo = next.expenses.filter((e) => !e.migrated);
  if (todo.length) {
    const vendors = [...next.vendors];
    const payments = [...next.payments];
    for (const e of todo) {
      let vendorId: string | undefined;
      if (e.vendor.trim()) {
        let v = findVendorByName(vendors, e.vendor);
        if (!v) {
          v = { id: `vendor-${slug(e.vendor)}`, name: e.vendor.trim() };
          if (vendors.some((x) => x.id === v!.id)) v = vendors.find((x) => x.id === v!.id)!;
          else vendors.push(v);
        }
        vendorId = v.id;
      }
      const id = `pay-${e.id}`;
      if (!payments.some((p) => p.id === id)) {
        payments.push({
          id, vendorId, amount: e.amount, date: e.date, status: 'Paid', type: guessType(e.description),
          description: e.description, categoryId: e.categoryId, roomId: e.roomId, fromExpenseId: e.id,
        });
      }
    }
    const done = new Set(todo.map((e) => e.id));
    next = { ...next, vendors, payments, expenses: next.expenses.map((e) => (done.has(e.id) ? { ...e, migrated: true } : e)) };
  }
  return next;
}

function guessType(description: string): PaymentType {
  const d = description.toLowerCase();
  if (/deposit/.test(d)) return 'Deposit';
  if (/final|balance/.test(d)) return 'Final Payment';
  if (/progress|\b\d+(st|nd|rd|th) payment/.test(d)) return 'Progress Payment';
  return 'Other';
}

// ── What's coming up, and what needs attention ───────────────

export interface Upcoming {
  kind: 'payment' | 'delivery' | 'installation';
  date: string;
  item?: PurchaseItem;
  payment?: Payment;
}

const deliveredLike: DeliveryStatus[] = ['Delivered', 'Returned / Exchanged'];
const installedLike: InstallationStatus[] = ['Not Required', 'Installed', 'Completed'];

/** Scheduled payments, deliveries and installations from today on, soonest first. */
export function upcoming(data: Pick<AppData, 'purchases' | 'payments'>, today: string): Upcoming[] {
  const out: Upcoming[] = [];
  for (const p of data.payments) {
    if (p.status === 'Scheduled' && p.date >= today) out.push({ kind: 'payment', date: p.date, payment: p, item: data.purchases.find((i) => i.id === p.itemId) });
  }
  for (const i of data.purchases) {
    if (i.expectedDelivery && i.expectedDelivery >= today && !deliveredLike.includes(i.deliveryStatus)) out.push({ kind: 'delivery', date: i.expectedDelivery, item: i });
    if (i.expectedInstallation && i.expectedInstallation >= today && !installedLike.includes(i.installationStatus)) out.push({ kind: 'installation', date: i.expectedInstallation, item: i });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface Attention {
  key: string;
  tone: 'bad' | 'warn' | 'info';
  title: string;
  detail: string;
  date?: string; // when it was due / expected
  item?: PurchaseItem;
  payment?: Payment;
}

/** Things to look at: overdue payments, deliveries and installations, payments to link, amounts to find out. */
export function needsAttention(data: Pick<AppData, 'purchases' | 'payments'>, today: string): Attention[] {
  const out: Attention[] = [];
  for (const p of data.payments) {
    if (p.status === 'Scheduled' && p.date < today) {
      const item = data.purchases.find((i) => i.id === p.itemId);
      out.push({ key: `pay-${p.id}`, tone: 'bad', title: 'Payment overdue', detail: item?.name ?? p.description ?? 'Payment', date: p.date, item, payment: p });
    }
  }
  for (const i of data.purchases) {
    if (i.expectedDelivery && i.expectedDelivery < today && !deliveredLike.includes(i.deliveryStatus) && i.deliveryStatus !== 'Partially Delivered') {
      out.push({ key: `del-${i.id}`, tone: 'bad', title: 'Delivery overdue', detail: i.name, date: i.expectedDelivery, item: i });
    }
    if (i.deliveryStatus === 'Delivery Issue') out.push({ key: `deli-${i.id}`, tone: 'bad', title: 'Delivery issue', detail: i.name, item: i });
    if (i.expectedInstallation && i.expectedInstallation < today && !installedLike.includes(i.installationStatus)) {
      out.push({ key: `ins-${i.id}`, tone: 'bad', title: 'Installation overdue', detail: i.name, date: i.expectedInstallation, item: i });
    }
    if (i.installationStatus === 'Installation Issue') out.push({ key: `insi-${i.id}`, tone: 'bad', title: 'Installation issue', detail: i.name, item: i });
  }
  return out;
}
