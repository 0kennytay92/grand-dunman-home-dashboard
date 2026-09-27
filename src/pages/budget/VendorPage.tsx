import { useState } from 'react';
import { ChevronLeft, Globe, Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import { paidValue, totalsFor } from '../../data/budget';
import type { Payment } from '../../data/types';
import { money } from '../../format';
import { ItemEditor } from '../../editors/ItemEditor';
import { PaymentEditor } from '../../editors/PaymentEditor';
import { VendorEditor } from '../../editors/VendorEditor';
import { Card, EmptyState, ProgressBar } from '../../components/ui';
import { ItemList, noFilters, type ItemFilters } from './ItemList';
import { PaymentRow } from './ItemPage';
import { budgetHref } from './links';
import { DocumentRows } from './Documents';
import { DocumentAdder } from '../../editors/DocumentForm';
import { IssueForm, MessageForm } from '../../editors/Tracking';
import { IssueList, MessageTimeline } from './ItemTracking';
import type { Issue, VendorMessage } from '../../data/types';

/** Digits only, for tel: and WhatsApp links. Singapore numbers without a country code get +65. */
function phoneDigits(n: string) {
  const d = n.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  return d.length === 8 ? `65${d}` : d;
}

export function VendorPage({ vendorId }: { vendorId: string }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<'vendor' | 'item' | { payment?: Payment } | null>(null);
  const [filters, setFilters] = useState<ItemFilters>(noFilters);
  const vendor = data.vendors.find((v) => v.id === vendorId);

  if (!vendor) {
    return (
      <>
        <a className="back" href={budgetHref()}><ChevronLeft size={18} /> Renovation Budget</a>
        <EmptyState>This vendor could not be found. It may have been deleted.</EmptyState>
      </>
    );
  }

  const items = data.purchases.filter((i) => i.vendorId === vendor.id);
  const itemIds = new Set(items.map((i) => i.id));
  const payments = data.payments.filter((p) => p.vendorId === vendor.id || (p.itemId && itemIds.has(p.itemId))).sort((a, b) => b.date.localeCompare(a.date));
  const t = totalsFor(items, data.payments);
  const unlinkedPaid = payments.filter((p) => !p.itemId || !itemIds.has(p.itemId)).reduce((s, p) => s + paidValue(p), 0);
  const web = vendor.website && (/^https?:\/\//.test(vendor.website) ? vendor.website : `https://${vendor.website}`);
  const wa = vendor.whatsapp || vendor.mobile;

  return (
    <>
      <a className="back" href={budgetHref()}><ChevronLeft size={18} /> Renovation Budget</a>
      <header className="page-header">
        <div>
          <p className="eyebrow">Vendor</p>
          <h1>{vendor.name}</h1>
          {vendor.contactPerson && <p className="subtitle">Contact: {vendor.contactPerson}</p>}
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setEditing('vendor')}><Pencil size={15} /> Edit</button>
          <button className="btn btn-primary" onClick={() => setEditing('item')}><Plus size={16} /> Add item</button>
        </div>
      </header>

      {(vendor.mobile || wa || vendor.email || web) && (
        <div className="contact-buttons">
          {vendor.mobile && <a className="btn btn-ghost" href={`tel:+${phoneDigits(vendor.mobile)}`}><Phone size={16} /> Call</a>}
          {wa && <a className="btn btn-ghost" href={`https://wa.me/${phoneDigits(wa)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
          {vendor.email && <a className="btn btn-ghost" href={`mailto:${vendor.email}`}><Mail size={16} /> Email</a>}
          {web && <a className="btn btn-ghost" href={web} target="_blank" rel="noopener noreferrer"><Globe size={16} /> Website</a>}
        </div>
      )}

      <div className="grid-2">
        <Card className="budget-summary" title="With this vendor">
          <div className="budget-figures">
            <div>
              <p className="stat-label">Total amount</p>
              <p className="budget-big">{money(t.total)}</p>
            </div>
            <div>
              <p className="stat-label">Paid</p>
              <p className="budget-big">{money(t.paid)}</p>
            </div>
            <div>
              <p className="stat-label">Remaining</p>
              <p className={`budget-big ${t.remaining < 0 ? 'over' : 'accent'}`}>{money(t.remaining)}</p>
            </div>
          </div>
          {t.total > 0 && <ProgressBar value={t.pct} tone={t.pct >= 100 ? 'good' : 'accent'} />}
          <p className="row-sub">
            {items.length} item{items.length === 1 ? '' : 's'}
            {t.tbdCount ? ` · + ${t.tbdCount} awaiting ${t.tbdCount === 1 ? 'an estimate' : 'estimates'} (not included)` : ''}
            {unlinkedPaid ? ` · ${money(unlinkedPaid)} in payments not linked to an item` : ''}
          </p>
        </Card>

        <Card title="Details" action={<button className="link" onClick={() => setEditing('vendor')}>Edit</button>}>
          <dl className="detail-list">
            <div><dt>Contact person</dt><dd>{vendor.contactPerson || '—'}</dd></div>
            <div><dt>Mobile</dt><dd>{vendor.mobile || '—'}</dd></div>
            {vendor.whatsapp && <div><dt>WhatsApp</dt><dd>{vendor.whatsapp}</dd></div>}
            <div><dt>Email</dt><dd>{vendor.email || '—'}</dd></div>
            <div><dt>Website</dt><dd>{vendor.website || '—'}</dd></div>
            <div><dt>UEN</dt><dd>{vendor.uen || '—'}</dd></div>
          </dl>
          {vendor.address && <p className="row-sub vendor-address"><MapPin size={14} /> {vendor.address}</p>}
          {vendor.notes && <p className="notes-text muted-notes">{vendor.notes}</p>}
        </Card>
      </div>

      <h2 className="section-title">Items</h2>
      <ItemList items={items} filters={filters} setFilters={setFilters} hide={['vendor']} emptyText="No items from this vendor yet." />

      <div className="grid-2">
        <VendorMessages vendorId={vendor.id} />
        <VendorIssues vendorId={vendor.id} />
      </div>

      <DocumentsForVendor vendorId={vendor.id} />

      <Card title="Payments" action={<button className="link" onClick={() => setEditing({})}><Plus size={15} /> Add payment</button>}>
        {payments.length === 0 ? (
          <EmptyState>No payments to this vendor yet.</EmptyState>
        ) : (
          <ul className="list">
            {payments.map((p) => <li key={p.id}><PaymentRow p={p} showItem onOpen={(x) => setEditing({ payment: x })} /></li>)}
          </ul>
        )}
      </Card>

      {editing === 'vendor' && <VendorEditor vendor={vendor} onClose={() => setEditing(null)} onDeleted={() => (window.location.hash = '/budget')} />}
      {editing === 'item' && <ItemEditor defaults={{ vendorId: vendor.id }} onClose={() => setEditing(null)} onSaved={(id) => (window.location.hash = `/budget/items/${id}`)} />}
      {editing && typeof editing === 'object' && <PaymentEditor payment={editing.payment} itemId={items.length === 1 ? items[0].id : undefined} vendorId={vendor.id} onClose={() => setEditing(null)} />}
    </>
  );
}

function DocumentsForVendor({ vendorId }: { vendorId: string }) {
  const { data } = useStore();
  const itemIds = new Set(data.purchases.filter((i) => i.vendorId === vendorId).map((i) => i.id));
  const docs = data.documents.filter((d) => d.vendorId === vendorId || d.itemIds.some((i) => itemIds.has(i)));
  return (
    <Card title="Documents" action={<DocumentAdder defaults={{ vendorId }}>{(open) => <button className="link" onClick={open}><Plus size={15} /> Upload</button>}</DocumentAdder>}>
      <DocumentRows docs={docs} empty="No quotations, invoices or receipts from this vendor yet." />
    </Card>
  );
}

function VendorMessages({ vendorId }: { vendorId: string }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<{ message?: VendorMessage } | null>(null);
  const messages = data.messages.filter((m) => m.vendorId === vendorId);
  return (
    <Card title="Messages" action={<button className="link" onClick={() => setEditing({})}><Plus size={15} /> Add message</button>}>
      <MessageTimeline messages={messages} onOpen={(message) => setEditing({ message })} empty="No messages yet. Type in what was agreed, or add WhatsApp or email screenshots." />
      {editing && <MessageForm message={editing.message} vendorId={vendorId} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function VendorIssues({ vendorId }: { vendorId: string }) {
  const { data } = useStore();
  const [open, setOpen] = useState<Issue | null>(null);
  const itemIds = new Set(data.purchases.filter((i) => i.vendorId === vendorId).map((i) => i.id));
  const issues = data.issues.filter((x) => itemIds.has(x.itemId));
  return (
    <Card title="Issues">
      <IssueList issues={issues} onOpen={setOpen} showItem empty="No issues with this vendor's items." />
      {open && <IssueForm issue={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}
