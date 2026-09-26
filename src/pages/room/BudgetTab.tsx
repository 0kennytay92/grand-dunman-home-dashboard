import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import { paidValue, pctText, totalsFor } from '../../data/budget';
import type { Payment, Room } from '../../data/types';
import { money } from '../../format';
import { ItemEditor } from '../../editors/ItemEditor';
import { PaymentEditor } from '../../editors/PaymentEditor';
import { Card, EmptyState, ProgressBar } from '../../components/ui';
import { ItemList, noFilters, type ItemFilters } from '../budget/ItemList';
import { PaymentRow } from '../budget/ItemPage';
import { TotalsNotes } from '../budget/BudgetPage';

/** The room's items and what they cost. */
export function BudgetTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<'item' | { payment: Payment } | null>(null);
  const [filters, setFilters] = useState<ItemFilters>(noFilters);

  const items = data.purchases.filter((i) => i.roomId === room.id);
  const t = totalsFor(items, data.payments);
  // Payments for this room that aren't linked to an item yet.
  const loose = data.payments.filter((p) => !p.itemId && p.roomId === room.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Card className="budget-summary">
        <div className="card-head">
          <h2>Room total</h2>
          <button className="link" onClick={() => setEditing('item')}><Plus size={15} /> Add item</button>
        </div>
        <div className="budget-figures four">
          <div>
            <p className="stat-label">Total amount</p>
            <p className="budget-big">{money(t.total)}</p>
          </div>
          <div>
            <p className="stat-label">Paid</p>
            <p className="budget-big">{money(t.paid)}</p>
          </div>
          <div>
            <p className="stat-label">{t.remaining < 0 ? 'Overpaid' : 'Remaining'}</p>
            <p className={`budget-big ${t.remaining < 0 ? 'over' : 'accent'}`}>{money(Math.abs(t.remaining))}</p>
          </div>
          <div>
            <p className="stat-label">Payment progress</p>
            <p className="budget-big">{t.total > 0 ? pctText(t.pct) : '—'}</p>
          </div>
        </div>
        {t.total > 0 && <ProgressBar value={t.pct} tone={t.pct > 100 ? 'bad' : 'accent'} />}
        <TotalsNotes totals={t} />
        {!items.length && <p className="row-sub">Add the items for this room (furniture, carpentry, lights…) to see what it costs.</p>}
      </Card>

      <ItemList items={items} filters={filters} setFilters={setFilters} hide={['room']} emptyText="No items for this room yet." />

      {loose.length > 0 && (
        <Card title="Payments not linked to an item">
          <p className="card-text">{money(loose.reduce((s, p) => s + paidValue(p), 0))} recorded for this room before items existed. Tap one to link it to an item.</p>
          <ul className="list">
            {loose.map((p) => <li key={p.id}><PaymentRow p={p} showItem onOpen={(x) => setEditing({ payment: x })} /></li>)}
          </ul>
        </Card>
      )}

      {loose.length === 0 && items.length === 0 && <EmptyState>Items you add with this room chosen show here.</EmptyState>}

      {editing === 'item' && <ItemEditor defaults={{ roomId: room.id }} onClose={() => setEditing(null)} onSaved={(id) => (window.location.hash = `/budget/items/${id}`)} />}
      {editing && typeof editing === 'object' && <PaymentEditor payment={editing.payment} onClose={() => setEditing(null)} />}
    </>
  );
}
