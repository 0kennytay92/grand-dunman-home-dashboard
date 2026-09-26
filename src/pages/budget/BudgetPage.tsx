import { useRef, useState } from 'react';
import { AlertTriangle, Camera, ChevronRight, CreditCard, FileUp, Link2, ListPlus, Plus, Truck, Wrench } from 'lucide-react';
import { todayIso, useBudgetTotals, useRoomName, useStore } from '../../data/store';
import { needsAttention, paidValue, pctText, totalsFor, unlinkedPayments, upcoming, type Totals } from '../../data/budget';
import type { BudgetCategory, Payment, PurchaseItem } from '../../data/types';
import { daysUntil, formatDate, money } from '../../format';
import { CategoryEditor } from '../../editors/CategoryEditor';
import { ItemEditor } from '../../editors/ItemEditor';
import { ItemImport } from '../../editors/ItemImport';
import { ItemPhotoAdder } from '../../editors/ItemPhotoAdder';
import { DocumentAdder } from '../../editors/DocumentForm';
import { DocumentsCard } from './Documents';
import { PaymentEditor } from '../../editors/PaymentEditor';
import { VendorEditor } from '../../editors/VendorEditor';
import { Card, Chips, EmptyState, PageHeader, ProgressBar } from '../../components/ui';
import { ItemList, noFilters, type ItemFilters } from './ItemList';
import { PaymentRow } from './ItemPage';
import { itemHref, vendorHref } from './links';

type Editing =
  | { kind: 'item' }
  | { kind: 'payment'; payment?: Payment }
  | { kind: 'vendor' }
  | { kind: 'category'; category?: BudgetCategory };

const groupings = ['Room', 'Category', 'Vendor'] as const;
type Grouping = (typeof groupings)[number];

export function BudgetPage() {
  const { data } = useStore();
  const totals = useBudgetTotals();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [filters, setFilters] = useState<ItemFilters>(noFilters);
  const itemsRef = useRef<HTMLDivElement>(null);
  const close = () => setEditing(null);

  const showItems = (patch: Partial<ItemFilters>) => {
    setFilters({ ...noFilters, sort: filters.sort, ...patch });
    itemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const unlinked = unlinkedPayments(data).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="budget-page">
      <PageHeader
        eyebrow="Finances"
        title="Renovation Budget"
        subtitle="Every item you're buying or building, what it costs and what's been paid. All amounts in Singapore dollars."
        action={
          <ItemImport>
            {(open) => <button className="btn btn-ghost" onClick={open}><ListPlus size={16} /> Import items</button>}
          </ItemImport>
        }
      />

      <div className="quick-actions">
        <button className="qa" onClick={() => setEditing({ kind: 'item' })}><Plus size={20} /> Add item</button>
        <button className="qa" onClick={() => setEditing({ kind: 'payment' })}><CreditCard size={20} /> Add payment</button>
        <DocumentAdder defaults={{ type: 'Invoice' }}>
          {(open) => <button className="qa" onClick={open}><FileUp size={20} /> Upload invoice</button>}
        </DocumentAdder>
        <ItemPhotoAdder>
          {(open, busy) => <button className="qa" onClick={open} disabled={busy}><Camera size={20} /> {busy ? 'Saving…' : 'Take product photo'}</button>}
        </ItemPhotoAdder>
      </div>

      <Summary totals={totals} />

      <div className="grid-2">
        <UpcomingCard onOpenPayment={(p) => setEditing({ kind: 'payment', payment: p })} />
        <AttentionCard unlinkedCount={unlinked.length} tbdCount={totals.tbdCount} onTbd={() => showItems({ amount: 'TBD' })} onOpenPayment={(p) => setEditing({ kind: 'payment', payment: p })} />
      </div>

      {unlinked.length > 0 && (
        <Card title="Payments not linked to an item" className="unlinked-card">
          <p className="card-text">
            These {unlinked.length} payment{unlinked.length === 1 ? ' was' : 's were'} recorded before items existed ({money(unlinked.reduce((s, p) => s + paidValue(p), 0))} in total).
            Tap one and choose its item so it counts towards that item's “Paid”. Until then they aren't in the totals above.
          </p>
          <ul className="list">
            {unlinked.map((p) => <li key={p.id}><PaymentRow p={p} showItem onOpen={(x) => setEditing({ kind: 'payment', payment: x })} /></li>)}
          </ul>
        </Card>
      )}

      <Breakdown onPick={showItems} />

      <div ref={itemsRef} className="section-head items-head">
        <h2 className="section-title">Items</h2>
        <button className="link" onClick={() => setEditing({ kind: 'item' })}><Plus size={15} /> Add item</button>
      </div>
      <ItemList items={data.purchases} filters={filters} setFilters={setFilters} emptyText='No items yet. Tap "Add item", or "Import items" to load a list.' />

      <div className="grid-2 after-items">
        <RecentPayments onOpen={(p) => setEditing({ kind: 'payment', payment: p })} onAdd={() => setEditing({ kind: 'payment' })} />
        <VendorsCard onAdd={() => setEditing({ kind: 'vendor' })} />
      </div>
      <div className="grid-2 after-items">
        <DocumentsCard action={<DocumentAdder>{(open) => <button className="link" onClick={open}><Plus size={15} /> Upload</button>}</DocumentAdder>} />
        <CategoriesCard onEdit={(c) => setEditing({ kind: 'category', category: c })} />
      </div>

      {editing?.kind === 'item' && <ItemEditor defaults={{ roomId: filters.roomId && filters.roomId !== 'whole' ? filters.roomId : undefined }} onClose={close} onSaved={(id) => (window.location.hash = `/budget/items/${id}`)} />}
      {editing?.kind === 'payment' && <PaymentEditor payment={editing.payment} onClose={close} />}
      {editing?.kind === 'vendor' && <VendorEditor onClose={close} />}
      {editing?.kind === 'category' && <CategoryEditor category={editing.category} onClose={close} />}
    </div>
  );
}

/** "+ 11 items awaiting estimates (not included)" and similar notes under the totals. */
export function TotalsNotes({ totals }: { totals: Totals }) {
  const notes = [
    totals.tbdCount > 0 && `+ ${totals.tbdCount} item${totals.tbdCount === 1 ? '' : 's'} awaiting ${totals.tbdCount === 1 ? 'an estimate' : 'estimates'} (not included)`,
    totals.tbdPaid > 0 && `${money(totals.tbdPaid)} already paid towards ${totals.tbdCount === 1 ? 'it' : 'them'}`,
    totals.estimatedCount > 0 && `${totals.estimatedCount} amount${totals.estimatedCount === 1 ? ' is' : 's are'} still estimated`,
  ].filter(Boolean);
  if (!notes.length) return null;
  return <p className="row-sub totals-notes">{notes.join(' · ')}</p>;
}

function Summary({ totals }: { totals: Totals }) {
  return (
    <Card className="budget-summary">
      <div className="budget-figures four">
        <div>
          <p className="stat-label">Total renovation amount</p>
          <p className="budget-big">{money(totals.total)}</p>
        </div>
        <div>
          <p className="stat-label">Total paid</p>
          <p className="budget-big">{money(totals.paid)}</p>
        </div>
        <div>
          <p className="stat-label">{totals.remaining < 0 ? 'Overpaid' : 'Total remaining'}</p>
          <p className={`budget-big ${totals.remaining < 0 ? 'over' : 'accent'}`}>{money(Math.abs(totals.remaining))}</p>
        </div>
        <div>
          <p className="stat-label">Payment progress</p>
          <p className="budget-big">{totals.total > 0 ? pctText(totals.pct) : '—'}</p>
        </div>
      </div>
      <ProgressBar value={totals.pct} tone={totals.pct > 100 ? 'bad' : 'accent'} />
      <TotalsNotes totals={totals} />
    </Card>
  );
}

function UpcomingCard({ onOpenPayment }: { onOpenPayment: (p: Payment) => void }) {
  const { data } = useStore();
  const list = upcoming(data, todayIso()).slice(0, 6);
  const icon = { payment: <CreditCard size={16} />, delivery: <Truck size={16} />, installation: <Wrench size={16} /> };
  const label = { payment: 'Payment due', delivery: 'Delivery', installation: 'Installation' };

  return (
    <Card title="Coming up">
      {list.length === 0 ? (
        <EmptyState>Nothing scheduled. Scheduled payments and expected delivery and installation dates show here.</EmptyState>
      ) : (
        <ul className="list">
          {list.map((u, i) => {
            const days = daysUntil(u.date);
            const body = (
              <>
                <span className={`up-icon up-${u.kind}`}>{icon[u.kind]}</span>
                <div className="grow">
                  <p className="row-title">{u.item?.name ?? u.payment?.description ?? 'Payment'}</p>
                  <p className="row-sub">{label[u.kind]} · {formatDate(u.date)}{days <= 7 ? ` · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}</p>
                </div>
                {u.payment && <span className="row-amount">{money(u.payment.amount)}</span>}
                <ChevronRight size={16} className="muted" />
              </>
            );
            return (
              <li key={i}>
                {u.payment ? (
                  <button className="list-row row-button" onClick={() => onOpenPayment(u.payment!)}>{body}</button>
                ) : (
                  <a className="list-row" href={itemHref(u.item!.id)}>{body}</a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AttentionCard({ unlinkedCount, tbdCount, onTbd, onOpenPayment }: { unlinkedCount: number; tbdCount: number; onTbd: () => void; onOpenPayment: (p: Payment) => void }) {
  const { data } = useStore();
  const [all, setAll] = useState(false);
  const full = needsAttention(data, todayIso());
  const LIMIT = 5;
  const list = all ? full : full.slice(0, LIMIT);
  const empty = !full.length && !unlinkedCount && !tbdCount;

  return (
    <Card title="Needs attention">
      {empty ? (
        <EmptyState>All good – nothing overdue.</EmptyState>
      ) : (
        <ul className="list">
          {list.map((a) => {
            const body = (
              <>
                <span className={`up-icon tone-${a.tone}`}><AlertTriangle size={16} /></span>
                <div className="grow">
                  <p className="row-title">{a.title}</p>
                  <p className="row-sub">{a.detail}{a.date ? ` · ${formatDate(a.date)}` : ''}</p>
                </div>
                {a.payment && <span className="row-amount">{money(a.payment.amount)}</span>}
                <ChevronRight size={16} className="muted" />
              </>
            );
            return (
              <li key={a.key}>
                {a.payment ? <button className="list-row row-button" onClick={() => onOpenPayment(a.payment!)}>{body}</button> : <a className="list-row" href={itemHref(a.item!.id)}>{body}</a>}
              </li>
            );
          })}
          {unlinkedCount > 0 && (
            <li>
              <a className="list-row" href="#" onClick={(e) => { e.preventDefault(); document.querySelector('.unlinked-card')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="up-icon tone-warn"><Link2 size={16} /></span>
                <div className="grow">
                  <p className="row-title">{unlinkedCount} payment{unlinkedCount === 1 ? '' : 's'} to link to items</p>
                  <p className="row-sub">From before the budget upgrade</p>
                </div>
                <ChevronRight size={16} className="muted" />
              </a>
            </li>
          )}
          {tbdCount > 0 && (
            <li>
              <button className="list-row row-button" onClick={onTbd}>
                <span className="up-icon tone-info"><AlertTriangle size={16} /></span>
                <div className="grow">
                  <p className="row-title">{tbdCount} item{tbdCount === 1 ? '' : 's'} awaiting an amount</p>
                  <p className="row-sub">Get quotes, then enter the amounts</p>
                </div>
                <ChevronRight size={16} className="muted" />
              </button>
            </li>
          )}
        </ul>
      )}
      {full.length > LIMIT && !all && <button className="text-btn" onClick={() => setAll(true)}>Show all {full.length}</button>}
    </Card>
  );
}

/** Totals by room, category or vendor. Tapping a row filters the item list. */
function Breakdown({ onPick }: { onPick: (patch: Partial<ItemFilters>) => void }) {
  const { data } = useStore();
  const roomName = useRoomName();
  const [by, setBy] = useState<Grouping>('Room');

  const groups: { key: string; name: string; items: PurchaseItem[]; patch: Partial<ItemFilters> }[] =
    by === 'Room'
      ? [
          ...data.rooms.map((r) => ({ key: r.id, name: roomName(r.id), items: data.purchases.filter((i) => i.roomId === r.id), patch: { roomId: r.id } })),
          { key: 'whole', name: 'Whole home', items: data.purchases.filter((i) => !i.roomId || !data.rooms.some((r) => r.id === i.roomId)), patch: { roomId: 'whole' } },
        ]
      : by === 'Category'
        ? [
            ...data.budgetCategories.map((c) => ({ key: c.id, name: c.name, items: data.purchases.filter((i) => i.categoryId === c.id), patch: { categoryId: c.id } })),
          ]
        : [
            ...data.vendors.map((v) => ({ key: v.id, name: v.name, items: data.purchases.filter((i) => i.vendorId === v.id), patch: { vendorId: v.id } })),
          ];
  const rows = groups
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, t: totalsFor(g.items, data.payments) }))
    .sort((a, b) => b.t.total - a.t.total || b.t.itemCount - a.t.itemCount);

  return (
    <Card title="Breakdown" action={<Chips options={groupings} value={by} onChange={setBy} />} className="breakdown">
      {rows.length === 0 ? (
        <EmptyState>Add items to see totals by room, category and vendor.</EmptyState>
      ) : (
        <ul className="list">
          {rows.map(({ key, name, t, patch }) => (
            <li key={key}>
              <button className="cat-row row-button" onClick={() => onPick(patch)}>
                <div className="cat-head">
                  <p className="row-title">{name} <span className="muted">· {t.itemCount} item{t.itemCount === 1 ? '' : 's'}{t.tbdCount ? `, ${t.tbdCount} TBD` : ''}</span></p>
                  <p className="row-meta">{t.total ? <><strong>{money(t.paid)}</strong> paid of {money(t.total)}</> : 'No amounts yet'}</p>
                </div>
                <ProgressBar value={t.pct} tone={t.pct >= 100 ? 'good' : 'accent'} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentPayments({ onOpen, onAdd }: { onOpen: (p: Payment) => void; onAdd: () => void }) {
  const { payments } = useStore().data;
  const [show, setShow] = useState<'Paid' | 'Scheduled'>('Paid');
  const [all, setAll] = useState(false);
  const list = payments.filter((p) => p.status === show).sort((a, b) => (show === 'Paid' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  const shown = all ? list : list.slice(0, 6);

  return (
    <Card title="Payments" action={<button className="link" onClick={onAdd}><Plus size={15} /> Add</button>}>
      <Chips options={['Paid', 'Scheduled'] as const} value={show} onChange={(v) => { setShow(v); setAll(false); }} />
      {list.length === 0 ? (
        <EmptyState>{show === 'Paid' ? 'No payments yet.' : 'No scheduled payments.'}</EmptyState>
      ) : (
        <>
          <ul className="list">
            {shown.map((p) => <li key={p.id}><PaymentRow p={p} showItem onOpen={onOpen} /></li>)}
          </ul>
          {list.length > shown.length && <button className="text-btn" onClick={() => setAll(true)}>Show all {list.length}</button>}
        </>
      )}
    </Card>
  );
}

function VendorsCard({ onAdd }: { onAdd: () => void }) {
  const { data } = useStore();
  const vendors = [...data.vendors].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card title="Vendors" action={<button className="link" onClick={onAdd}><Plus size={15} /> Add vendor</button>}>
      {vendors.length === 0 ? (
        <EmptyState>No vendors yet. They're added when you add items.</EmptyState>
      ) : (
        <ul className="list">
          {vendors.map((v) => {
            const items = data.purchases.filter((i) => i.vendorId === v.id);
            const t = totalsFor(items, data.payments);
            return (
              <li key={v.id}>
                <a className="list-row" href={vendorHref(v.id)}>
                  <div className="grow">
                    <p className="row-title">{v.name}</p>
                    <p className="row-sub">{items.length} item{items.length === 1 ? '' : 's'}{v.contactPerson ? ` · ${v.contactPerson}` : ''}</p>
                  </div>
                  <span className="row-meta">{t.total ? `${money(t.paid)} / ${money(t.total)}` : t.tbdCount ? 'TBD' : ''}</span>
                  <ChevronRight size={16} className="muted" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function CategoriesCard({ onEdit }: { onEdit: (c?: BudgetCategory) => void }) {
  const { data } = useStore();
  return (
    <Card title="Categories" action={<button className="link" onClick={() => onEdit()}><Plus size={15} /> Add category</button>}>
      <div className="cat-chips">
        {data.budgetCategories.map((c) => {
          const n = data.purchases.filter((i) => i.categoryId === c.id).length;
          return (
            <button key={c.id} className="chip" onClick={() => onEdit(c)}>
              {c.name}{n ? <span className="tab-count">{n}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="card-text muted">Tap a category to rename or delete it.</p>
    </Card>
  );
}
