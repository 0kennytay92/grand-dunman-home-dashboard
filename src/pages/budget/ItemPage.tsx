import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, CreditCard, History, LayoutGrid, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRoomName, useStore } from '../../data/store';
import { deleteImages, useImageUrl } from '../../data/images';
import { deliveryTone, installationTone, itemMoney, paidValue, paymentTone, pctText } from '../../data/budget';
import type { Payment, PurchaseItem } from '../../data/types';
import { formatDate, money } from '../../format';
import { AmountEditor, ItemEditor } from '../../editors/ItemEditor';
import { PaymentEditor } from '../../editors/PaymentEditor';
import { ItemPhotoAdder } from '../../editors/ItemPhotoAdder';
import { ImageLightbox } from '../../components/ImageLightbox';
import { LinkedText } from '../../components/LinkedText';
import { Badge, Card, EmptyState, ProgressBar } from '../../components/ui';
import { tabHref } from '../room/tabs';
import { ItemThumb } from './ItemList';
import { budgetHref, itemHref, vendorHref, type ItemTab } from './links';

const tabs: { id: ItemTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'photos', label: 'Photos', icon: Camera },
];

/** One item: its money, details, payments and photos. */
export function ItemPage({ itemId, tab: tabParam }: { itemId: string; tab?: string }) {
  const { data } = useStore();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<'item' | 'amount' | { payment?: Payment } | null>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const item = data.purchases.find((i) => i.id === itemId);
  const tab: ItemTab = tabs.some((t) => t.id === tabParam) ? (tabParam as ItemTab) : 'overview';

  useEffect(() => {
    const strip = tabsRef.current;
    const active = strip?.querySelector<HTMLElement>('.room-tab.active');
    if (strip && active) strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  }, [tab]);

  if (!item) {
    return (
      <>
        <a className="back" href={budgetHref()}><ChevronLeft size={18} /> Renovation Budget</a>
        <EmptyState>This item could not be found. It may have been deleted.</EmptyState>
      </>
    );
  }

  const m = itemMoney(item, data.payments);
  const vendor = data.vendors.find((v) => v.id === item.vendorId);
  const category = data.budgetCategories.find((c) => c.id === item.categoryId);
  const payments = data.payments.filter((p) => p.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date));
  const counts: Partial<Record<ItemTab, number>> = { payments: payments.length, photos: item.photoIds.length };

  return (
    <>
      <a className="back" href={budgetHref()}><ChevronLeft size={18} /> Renovation Budget</a>

      <header className="item-head">
        <ItemThumb item={item} size="lg" />
        <div className="grow">
          {category && <p className="eyebrow">{category.name}</p>}
          <h1>{item.name}{item.quantity && item.quantity > 1 ? <span className="muted"> ×{item.quantity}</span> : null}</h1>
          <p className="row-sub">
            {vendor ? <a className="inline-link link" href={vendorHref(vendor.id)}>{vendor.name}</a> : 'No vendor yet'}
            {' · '}
            {item.roomId ? <a className="inline-link link" href={tabHref(item.roomId, 'budget')}>{roomName(item.roomId)}</a> : 'Whole home'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setEditing('item')}><Pencil size={15} /> Edit</button>
          <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add payment</button>
          <ItemPhotoAdder itemId={item.id}>
            {(open, busy) => <button className="btn btn-ghost" onClick={open} disabled={busy}><Camera size={16} /> {busy ? 'Saving…' : 'Add photo'}</button>}
          </ItemPhotoAdder>
        </div>
      </header>

      <Card className="budget-summary item-money">
        <div className="budget-figures four">
          <div>
            <p className="stat-label">Total amount</p>
            <button type="button" className="amount-btn" onClick={() => setEditing('amount')} aria-label="Change total amount">
              <span className={`budget-big ${m.total === null ? 'tbd' : ''}`}>{m.total === null ? 'TBD' : money(m.total)}</span>
              <Pencil size={14} />
            </button>
            <Badge tone={m.total === null ? 'warn' : item.amountStatus === 'Confirmed' ? 'good' : 'neutral'}>{m.total === null ? 'Amount not known yet' : item.amountStatus}</Badge>
          </div>
          <div>
            <p className="stat-label">Paid</p>
            <p className="budget-big">{money(m.paid)}</p>
          </div>
          <div>
            <p className="stat-label">{m.remaining !== null && m.remaining < 0 ? 'Overpaid' : 'Remaining'}</p>
            <p className={`budget-big ${m.remaining !== null && m.remaining < 0 ? 'over' : 'accent'}`}>{m.remaining === null ? '—' : money(Math.abs(m.remaining))}</p>
          </div>
          <div>
            <p className="stat-label">Payment progress</p>
            <p className="budget-big">{pctText(m.pct)}</p>
          </div>
        </div>
        {m.pct !== null && <ProgressBar value={m.pct} tone={m.state === 'Fully paid' ? 'good' : m.state === 'Overpaid' ? 'bad' : 'accent'} />}
        <p className="row-sub">
          <Badge tone={paymentTone(m.state)}>{m.state === 'TBD' ? 'Amount TBD' : m.state}</Badge>{' '}
          {m.next ? `Next payment: ${money(m.next.amount)} due ${formatDate(m.next.date)}` : m.total === null ? 'Add the amount once you have a quote.' : ''}
        </p>
      </Card>

      <nav className="room-tabs" aria-label="Item sections" ref={tabsRef}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <a key={id} href={itemHref(item.id, id)} className={`room-tab ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={16} strokeWidth={1.9} />
            <span>{label}</span>
            {counts[id] ? <span className="tab-count">{counts[id]}</span> : null}
          </a>
        ))}
      </nav>

      <div className="room-tab-body">
        {tab === 'overview' && <Overview item={item} onEdit={() => setEditing('item')} />}
        {tab === 'payments' && <PaymentsTab payments={payments} onAdd={() => setEditing({})} onOpen={(p) => setEditing({ payment: p })} />}
        {tab === 'photos' && <PhotosTab item={item} />}
      </div>

      {editing === 'item' && <ItemEditor item={item} onClose={() => setEditing(null)} onDeleted={() => (window.location.hash = '/budget')} />}
      {editing === 'amount' && <AmountEditor item={item} onClose={() => setEditing(null)} />}
      {editing && typeof editing === 'object' && <PaymentEditor payment={editing.payment} itemId={item.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function Overview({ item, onEdit }: { item: PurchaseItem; onEdit: () => void }) {
  const details: [string, string | undefined][] = [
    ['Brand', item.brand], ['Model', item.model], ['SKU / product code', item.sku], ['Quantity', item.quantity ? String(item.quantity) : undefined],
    ['Dimensions', item.dimensions], ['Material', item.material], ['Colour', item.colour], ['Finish', item.finish],
  ];
  const shown = details.filter(([, v]) => v);
  const d = (iso?: string) => (iso ? formatDate(iso) : '—');
  const history = [...(item.amountHistory ?? [])].reverse();

  return (
    <div className="grid-2">
      <div className="stack">
        <Card title="Details" action={<button className="link" onClick={onEdit}>Edit</button>}>
          {item.description && <p className="notes-text">{item.description}</p>}
          {shown.length > 0 && (
            <dl className="detail-list">
              {shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
          {item.url && <p className="detail-link"><LinkedText text={item.url} /></p>}
          {item.notes && <p className="notes-text muted-notes">{item.notes}</p>}
          {!item.description && !shown.length && !item.url && !item.notes && <EmptyState>No details yet. Tap Edit to add brand, model, size and more.</EmptyState>}
        </Card>
        {history.length > 0 && (
          <Card title="Amount history">
            <ul className="list">
              {history.map((h, i) => (
                <li key={i} className="list-row">
                  <History size={16} className="muted" />
                  <div className="grow">
                    <p className="row-title">{h.from === null ? 'TBD' : money(h.from)} → {h.to === null ? 'TBD' : money(h.to)} <span className="muted">({h.status.toLowerCase()})</span></p>
                    <p className="row-sub">{[formatDate(h.date), h.note].filter(Boolean).join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Card title="Order, delivery & installation" action={<button className="link" onClick={onEdit}>Edit</button>}>
        <dl className="detail-list">
          <div><dt>Order date</dt><dd>{d(item.orderDate)}</dd></div>
          <div><dt>Delivery</dt><dd><Badge tone={deliveryTone(item.deliveryStatus)}>{item.deliveryStatus}</Badge></dd></div>
          <div><dt>Expected delivery</dt><dd>{d(item.expectedDelivery)}</dd></div>
          <div><dt>Delivered on</dt><dd>{d(item.actualDelivery)}</dd></div>
          <div><dt>Installation</dt><dd><Badge tone={installationTone(item.installationStatus)}>{item.installationStatus}</Badge></dd></div>
          <div><dt>Expected installation</dt><dd>{d(item.expectedInstallation)}</dd></div>
          <div><dt>Installed on</dt><dd>{d(item.actualInstallation)}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

export function PaymentRow({ p, onOpen, showItem }: { p: Payment; onOpen: (p: Payment) => void; showItem?: boolean }) {
  const { data } = useStore();
  const item = showItem ? data.purchases.find((i) => i.id === p.itemId) : undefined;
  const vendor = data.vendors.find((v) => v.id === p.vendorId)?.name;
  const title = showItem ? (item?.name ?? p.description ?? 'Payment') : p.description || p.type;
  const sub = [showItem ? p.type : p.description && p.type, showItem && vendor, p.method, p.reference && `Ref ${p.reference}`].filter(Boolean).join(' · ');
  const value = paidValue(p);
  return (
    <button className="list-row row-button" onClick={() => onOpen(p)}>
      <div className="date-tile">
        <span>{formatDate(p.date, { month: 'short' })}</span>
        <strong>{formatDate(p.date, { day: 'numeric' })}</strong>
      </div>
      <div className="grow">
        <p className="row-title">{title}</p>
        <p className="row-sub">{sub || formatDate(p.date)}</p>
      </div>
      <div className="pay-amount">
        <span className={`row-amount ${p.type === 'Refund' ? 'refund' : ''}`}>{p.type === 'Refund' ? '−' : ''}{money(p.amount)}</span>
        {p.status === 'Scheduled' ? <Badge tone="warn">Scheduled</Badge> : value === 0 ? null : <span className="paid-tag">Paid</span>}
      </div>
    </button>
  );
}

function PaymentsTab({ payments, onAdd, onOpen }: { payments: Payment[]; onAdd: () => void; onOpen: (p: Payment) => void }) {
  return (
    <Card title="Payments" action={<button className="link" onClick={onAdd}><Plus size={15} /> Add payment</button>}>
      {payments.length === 0 ? (
        <EmptyState>No payments yet. Add deposits, progress payments and final payments here – "Paid" adds them up for you.</EmptyState>
      ) : (
        <ul className="list">
          {payments.map((p) => <li key={p.id}><PaymentRow p={p} onOpen={onOpen} /></li>)}
        </ul>
      )}
    </Card>
  );
}

function PhotosTab({ item }: { item: PurchaseItem }) {
  const { upsert, notify } = useStore();
  const [viewing, setViewing] = useState<number | null>(null);

  const makeCover = (id: string) => {
    upsert('purchases', { ...item, coverId: id });
    notify('Cover photo set');
  };
  const removePhoto = (id: string) => {
    if (!window.confirm('Delete this photo?')) return;
    const photoIds = item.photoIds.filter((x) => x !== id);
    upsert('purchases', { ...item, photoIds, coverId: item.coverId === id ? photoIds[0] : item.coverId });
    deleteImages([id], { cloud: true }).catch(() => {});
    notify('Photo deleted');
  };

  return (
    <Card
      title="Product photos"
      action={
        <ItemPhotoAdder itemId={item.id}>
          {(open, busy) => <button className="link" onClick={open} disabled={busy}><Plus size={15} /> {busy ? 'Saving…' : 'Add photo'}</button>}
        </ItemPhotoAdder>
      }
    >
      {item.photoIds.length === 0 ? (
        <EmptyState>No photos yet. Add product photos, showroom pictures or screenshots.</EmptyState>
      ) : (
        <div className="item-photos">
          {item.photoIds.map((id, i) => (
            <figure key={id} className="item-photo">
              <button type="button" className="item-photo-img" onClick={() => setViewing(i)} aria-label={`View photo ${i + 1}`}>
                <Thumb id={id} />
              </button>
              <figcaption>
                {(item.coverId ?? item.photoIds[0]) === id ? (
                  <span className="cover-tag"><Star size={13} /> Cover</span>
                ) : (
                  <button type="button" className="text-btn" onClick={() => makeCover(id)}>Make cover</button>
                )}
                <button type="button" className="icon-btn small danger" onClick={() => removePhoto(id)} aria-label="Delete photo"><Trash2 size={15} /></button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {viewing !== null && <ImageLightbox images={item.photoIds.map((id) => ({ id, caption: item.name }))} start={viewing} onClose={() => setViewing(null)} />}
    </Card>
  );
}

function Thumb({ id }: { id: string }) {
  const url = useImageUrl(id, 'thumb');
  return url ? <img src={url} alt="" loading="lazy" draggable={false} /> : null;
}
