import { useMemo, useState } from 'react';
import { Package, Search, SlidersHorizontal, X } from 'lucide-react';
import { useImageUrl } from '../../data/images';
import { useRoomName, useStore } from '../../data/store';
import {
  amountStatuses, deliveryStatuses, deliveryTone, itemMoney, itemStage, paymentStates, paymentTone, pctText, totalsFor,
  type ItemMoney, type PaymentState,
} from '../../data/budget';
import type { PurchaseItem } from '../../data/types';
import { formatDate, money } from '../../format';
import { Badge, EmptyState, ProgressBar } from '../../components/ui';
import { itemHref } from './links';

// ─────────────────────────────────────────────────────────────
// THE ITEM LIST
// A table on computers and cards on phones, with search, filters
// and sorting. Used on the Budget page, room pages and vendor pages.
// ─────────────────────────────────────────────────────────────

export interface ItemFilters {
  q: string;
  roomId: string; // '' = any, 'whole' = whole home
  categoryId: string;
  vendorId: string;
  pay: string; // PaymentState or ''
  delivery: string;
  amount: string; // 'Estimated' | 'Confirmed' | 'TBD' | ''
  sort: SortKey;
}

type SortKey = 'name' | 'total' | 'remaining' | 'next' | 'delivery' | 'room' | 'vendor' | 'recent';
const sorts: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'total', label: 'Total amount (highest)' },
  { value: 'remaining', label: 'Remaining (highest)' },
  { value: 'next', label: 'Next payment (soonest)' },
  { value: 'delivery', label: 'Delivery date (soonest)' },
  { value: 'room', label: 'Room' },
  { value: 'vendor', label: 'Vendor' },
];

export const noFilters: ItemFilters = { q: '', roomId: '', categoryId: '', vendorId: '', pay: '', delivery: '', amount: '', sort: 'recent' };

/** A product photo, or a simple icon when there isn't one. */
export function ItemThumb({ item, size = 'sm' }: { item: PurchaseItem; size?: 'sm' | 'lg' }) {
  const id = item.coverId ?? item.photoIds[0];
  const url = useImageUrl(id ?? '', size === 'lg' ? 'full' : 'thumb', !!id);
  return (
    <span className={`item-thumb ${size === 'lg' ? 'big' : ''}`}>
      {url ? <img src={url} alt="" loading="lazy" draggable={false} /> : <Package size={size === 'lg' ? 30 : 18} strokeWidth={1.6} />}
    </span>
  );
}

/** "S$6,976", "S$6,976 est." or "TBD". `stacked` puts "estimated" on its own line (for the table). */
export function AmountText({ item, stacked }: { item: PurchaseItem; stacked?: boolean }) {
  if (item.totalAmount === null) return <span className="tbd">TBD</span>;
  return (
    <>
      {money(item.totalAmount)}
      {item.amountStatus === 'Estimated' && (stacked ? <span className="cell-sub">estimated</span> : <span className="est" title="Estimated amount"> est.</span>)}
    </>
  );
}

export function ItemList({
  items,
  filters,
  setFilters,
  hide = [],
  emptyText = 'No items yet.',
}: {
  items: PurchaseItem[];
  filters: ItemFilters;
  setFilters: (f: ItemFilters) => void;
  hide?: ('room' | 'vendor')[];
  emptyText?: string;
}) {
  const { data } = useStore();
  const roomName = useRoomName();
  const [showFilters, setShowFilters] = useState(false);
  const vendorName = (id?: string) => data.vendors.find((v) => v.id === id)?.name ?? '';
  const categoryName = (id?: string) => data.budgetCategories.find((c) => c.id === id)?.name ?? '';
  const shortRoom = (id?: string) => data.rooms.find((r) => r.id === id)?.name ?? 'Whole home';
  const set = (patch: Partial<ItemFilters>) => setFilters({ ...filters, ...patch });

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const withMoney = items.map((item) => ({ item, m: itemMoney(item, data.payments) }));
    const shown = withMoney.filter(({ item, m }) => {
      if (filters.roomId && (filters.roomId === 'whole' ? !!item.roomId : item.roomId !== filters.roomId)) return false;
      if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
      if (filters.vendorId && item.vendorId !== filters.vendorId) return false;
      if (filters.pay && m.state !== filters.pay) return false;
      if (filters.delivery && item.deliveryStatus !== filters.delivery) return false;
      if (filters.amount === 'TBD' ? item.totalAmount !== null : filters.amount && (item.totalAmount === null || item.amountStatus !== filters.amount)) return false;
      if (q) {
        const text = [item.name, item.description, item.brand, item.model, item.sku, item.notes, vendorName(item.vendorId), roomName(item.roomId), categoryName(item.categoryId)].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    const far = '9999';
    const by: Record<SortKey, (a: (typeof shown)[number], b: (typeof shown)[number]) => number> = {
      name: (a, b) => a.item.name.localeCompare(b.item.name),
      total: (a, b) => (b.m.total ?? -1) - (a.m.total ?? -1),
      remaining: (a, b) => (b.m.remaining ?? -1) - (a.m.remaining ?? -1),
      next: (a, b) => (a.m.next?.date ?? far).localeCompare(b.m.next?.date ?? far),
      delivery: (a, b) => (a.item.expectedDelivery ?? far).localeCompare(b.item.expectedDelivery ?? far),
      room: (a, b) => roomName(a.item.roomId).localeCompare(roomName(b.item.roomId)),
      vendor: (a, b) => (vendorName(a.item.vendorId) || '~').localeCompare(vendorName(b.item.vendorId) || '~'),
      recent: () => 0,
    };
    const sorted = [...shown].sort((a, b) => by[filters.sort](a, b) || a.item.name.localeCompare(b.item.name));
    return filters.sort === 'recent' ? [...shown].reverse() : sorted;
  }, [items, filters, data.payments, data.vendors, data.budgetCategories, roomName]);

  const totals = totalsFor(rows.map((r) => r.item), data.payments);
  const active = (['roomId', 'categoryId', 'vendorId', 'pay', 'delivery', 'amount'] as const).filter((k) => filters[k] && !(hide.includes('room') && k === 'roomId') && !(hide.includes('vendor') && k === 'vendorId')).length;
  const vendorsUsed = data.vendors.filter((v) => data.purchases.some((i) => i.vendorId === v.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="item-list">
      <div className="item-toolbar">
        <label className="search">
          <Search size={17} />
          <input type="search" placeholder="Search items" value={filters.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search items" />
        </label>
        <button type="button" className={`btn btn-ghost filter-btn ${showFilters || active ? 'on' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal size={16} /> Filters{active ? ` (${active})` : ''}
        </button>
        <select className="select sort-select" value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Sort items">
          {sorts.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
      </div>

      {showFilters && (
        <div className="filter-panel">
          {!hide.includes('room') && (
            <FilterSelect label="Room" value={filters.roomId} onChange={(v) => set({ roomId: v })} options={[{ value: 'whole', label: 'Whole home' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
          )}
          <FilterSelect label="Category" value={filters.categoryId} onChange={(v) => set({ categoryId: v })} options={data.budgetCategories.map((c) => ({ value: c.id, label: c.name }))} />
          {!hide.includes('vendor') && (
            <FilterSelect label="Vendor" value={filters.vendorId} onChange={(v) => set({ vendorId: v })} options={vendorsUsed.map((v) => ({ value: v.id, label: v.name }))} />
          )}
          <FilterSelect label="Payment" value={filters.pay} onChange={(v) => set({ pay: v })} options={paymentStates.map((s) => ({ value: s, label: s === 'TBD' ? 'Amount TBD' : s }))} />
          <FilterSelect label="Delivery" value={filters.delivery} onChange={(v) => set({ delivery: v })} options={deliveryStatuses.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Amount" value={filters.amount} onChange={(v) => set({ amount: v })} options={[...amountStatuses.map((s) => ({ value: s, label: s })), { value: 'TBD', label: 'TBD (unknown)' }]} />
          {active > 0 && (
            <button type="button" className="link clear-filters" onClick={() => setFilters({ ...noFilters, q: filters.q, sort: filters.sort, roomId: hide.includes('room') ? filters.roomId : '', vendorId: hide.includes('vendor') ? filters.vendorId : '' })}>
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState>{items.length === 0 ? emptyText : 'No items match. Try clearing the search or filters.'}</EmptyState>
      ) : (
        <>
          {/* Computers: a table */}
          <div className="item-table-wrap">
            <table className="item-table">
              <thead>
                <tr>
                  <th>Item</th>
                  {!hide.includes('vendor') && <th>Vendor</th>}
                  {!hide.includes('room') && <th>Room</th>}
                  <th className="col-cat">Category</th>
                  <th className="num">Total amount</th>
                  <th className="num">Paid</th>
                  <th className="num">Remaining</th>
                  <th>Payment %</th>
                  <th>Next payment</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, m }) => {
                  const stage = itemStage(item, m);
                  const go = () => (window.location.hash = itemHref(item.id).slice(1));
                  return (
                    <tr key={item.id} onClick={go}>
                      <td>
                        <a className="item-cell" href={itemHref(item.id)} onClick={(e) => e.stopPropagation()}>
                          <ItemThumb item={item} />
                          <span className="item-name">
                            {item.name}{item.quantity && item.quantity > 1 ? <span className="muted"> ×{item.quantity}</span> : null}
                            {item.categoryId && <span className="cell-sub cat-sub">{categoryName(item.categoryId)}</span>}
                          </span>
                        </a>
                      </td>
                      {!hide.includes('vendor') && <td className="clip" title={vendorName(item.vendorId)}>{vendorName(item.vendorId) || <span className="muted">—</span>}</td>}
                      {!hide.includes('room') && <td className="clip" title={roomName(item.roomId)}>{shortRoom(item.roomId)}</td>}
                      <td className="clip col-cat" title={categoryName(item.categoryId)}>{categoryName(item.categoryId) || <span className="muted">—</span>}</td>
                      <td className="num"><AmountText item={item} stacked /></td>
                      <td className="num">{money(m.paid)}</td>
                      <td className="num">{m.remaining === null ? <span className="muted">—</span> : <span className={m.remaining < 0 ? 'over' : ''}>{money(m.remaining)}</span>}</td>
                      <td><PctCell m={m} /></td>
                      <td>{m.next ? <><span className="nowrap">{formatDate(m.next.date, { day: 'numeric', month: 'short' })}</span><span className="cell-sub">{money(m.next.amount)}</span></> : <span className="muted">—</span>}</td>
                      <td><Badge tone={deliveryTone(item.deliveryStatus)}>{item.deliveryStatus}</Badge>{deliveryDate(item) && <span className="cell-sub">{deliveryDate(item)}</span>}</td>
                      <td><Badge tone={stage.tone}>{stage.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={1 + (hide.includes('vendor') ? 0 : 1) + (hide.includes('room') ? 0 : 1)}>
                    {rows.length} item{rows.length === 1 ? '' : 's'}{totals.tbdCount ? ` · ${totals.tbdCount} TBD not included` : ''}
                  </td>
                  <td className="col-cat" />
                  <td className="num">{money(totals.total)}</td>
                  <td className="num">{money(totals.paid)}</td>
                  <td className="num">{money(totals.remaining)}</td>
                  <td>{totals.total ? `${Math.round(totals.pct)}%` : ''}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="item-cards">
            {rows.map(({ item, m }) => (
              <li key={item.id}>
                <ItemCard item={item} m={m} vendor={hide.includes('vendor') ? '' : vendorName(item.vendorId)} room={hide.includes('room') ? '' : roomName(item.roomId)} />
              </li>
            ))}
          </ul>
          <p className="item-count-line">
            {rows.length} item{rows.length === 1 ? '' : 's'} · {money(totals.total)} total · {money(totals.paid)} paid
            {totals.tbdCount ? ` · ${totals.tbdCount} TBD not included` : ''}
          </p>
        </>
      )}
    </div>
  );
}

function deliveryDate(item: PurchaseItem) {
  const d = item.actualDelivery ?? item.expectedDelivery;
  if (!d) return '';
  return `${item.actualDelivery ? '' : 'Expected '}${formatDate(d, { day: 'numeric', month: 'short' })}`;
}

function PctCell({ m }: { m: ItemMoney }) {
  if (m.pct === null) return <span className="muted">—</span>;
  return (
    <span className="pct-cell">
      <ProgressBar value={m.pct} tone={m.state === 'Fully paid' ? 'good' : m.state === 'Overpaid' ? 'bad' : 'accent'} />
      <span>{pctText(m.pct)}</span>
    </span>
  );
}

function ItemCard({ item, m, vendor, room }: { item: PurchaseItem; m: ItemMoney; vendor: string; room: string }) {
  const stage = itemStage(item, m);
  return (
    <a className="item-card" href={itemHref(item.id)}>
      <div className="item-card-top">
        <ItemThumb item={item} />
        <div className="grow">
          <p className="row-title">{item.name}{item.quantity && item.quantity > 1 ? <span className="muted"> ×{item.quantity}</span> : null}</p>
          <p className="row-sub">{[vendor, room].filter(Boolean).join(' · ') || ' '}</p>
        </div>
        <Badge tone={stage.tone}>{stage.label}</Badge>
      </div>
      <div className="item-card-money">
        <div>
          <span className="stat-label">Total</span>
          <strong><AmountText item={item} /></strong>
        </div>
        <div>
          <span className="stat-label">Paid</span>
          <strong>{money(m.paid)}</strong>
        </div>
        <div>
          <span className="stat-label">Remaining</span>
          <strong className={m.remaining !== null && m.remaining < 0 ? 'over' : ''}>{m.remaining === null ? '—' : money(m.remaining)}</strong>
        </div>
      </div>
      {m.pct !== null && <ProgressBar value={m.pct} tone={m.state === 'Fully paid' ? 'good' : m.state === 'Overpaid' ? 'bad' : 'accent'} />}
      <div className="item-card-tags">
        <Badge tone={paymentTone(m.state as PaymentState)}>{m.state === 'TBD' ? 'Amount TBD' : m.state}{m.pct !== null && m.state === 'Partly paid' ? ` ${pctText(m.pct)}` : ''}</Badge>
        <Badge tone={deliveryTone(item.deliveryStatus)}>{item.deliveryStatus}</Badge>
        {m.next && <span className="next-pay">Next: {money(m.next.amount)} on {formatDate(m.next.date, { day: 'numeric', month: 'short' })}</span>}
      </div>
    </a>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
