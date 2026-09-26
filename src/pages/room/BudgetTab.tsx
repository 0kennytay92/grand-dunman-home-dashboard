import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useStore } from '../../data/store';
import type { Expense, Room } from '../../data/types';
import { formatDate, money } from '../../format';
import { ExpenseEditor } from '../../editors/ExpenseEditor';
import { EditorModal, NumberInput, numText, toNumber } from '../../components/forms';
import { Card, EmptyState, ProgressBar } from '../../components/ui';

export function BudgetTab({ room }: { room: Room }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<{ kind: 'expense'; item?: Expense } | { kind: 'budget' } | null>(null);

  const payments = data.expenses.filter((e) => e.roomId === room.id).sort((a, b) => b.date.localeCompare(a.date));
  const spent = payments.reduce((s, e) => s + e.amount, 0);
  const budget = room.budget ?? 0;
  const remaining = budget - spent;
  const pct = budget ? Math.round((spent / budget) * 100) : 0;
  const categoryName = (id: string) => data.budgetCategories.find((c) => c.id === id)?.name ?? 'No category';

  const byCategory = data.budgetCategories
    .map((c) => ({ name: c.name, total: payments.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <Card className="budget-summary">
        <div className="card-head">
          <h2>Room budget</h2>
          <button className="link" onClick={() => setEditing({ kind: 'budget' })}><Pencil size={14} /> {budget ? 'Change' : 'Set budget'}</button>
        </div>
        <div className="budget-figures">
          <div>
            <p className="stat-label">Planned</p>
            <p className="budget-big">{budget ? money(budget) : '—'}</p>
          </div>
          <div>
            <p className="stat-label">Spent</p>
            <p className="budget-big">{money(spent)}</p>
          </div>
          <div>
            <p className="stat-label">{remaining < 0 ? 'Over budget' : 'Remaining'}</p>
            <p className={`budget-big ${remaining < 0 ? 'over' : 'accent'}`}>{budget ? money(Math.abs(remaining)) : '—'}</p>
          </div>
        </div>
        {budget > 0 && <ProgressBar value={pct} tone={pct > 100 ? 'bad' : pct > 85 ? 'warn' : 'accent'} />}
        <p className="row-sub">
          {budget ? `${pct}% of this room's budget used` : 'Set a budget to track spending for this room.'}
        </p>
      </Card>

      <div className="grid-2">
        <Card title="Payments for this room" action={<button className="link" onClick={() => setEditing({ kind: 'expense' })}><Plus size={15} /> Add payment</button>}>
          {payments.length === 0 ? (
            <EmptyState>No payments linked to this room yet.</EmptyState>
          ) : (
            <ul className="list">
              {payments.map((e) => (
                <li key={e.id}>
                  <button className="list-row row-button" onClick={() => setEditing({ kind: 'expense', item: e })}>
                    <div className="grow">
                      <p className="row-title">{e.description}</p>
                      <p className="row-sub">{[categoryName(e.categoryId), e.vendor, formatDate(e.date)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="row-amount">{money(e.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Spending by category">
          {byCategory.length === 0 ? (
            <EmptyState>Nothing spent yet.</EmptyState>
          ) : (
            <ul className="list">
              {byCategory.map((c) => (
                <li key={c.name} className="cat-row">
                  <div className="cat-head">
                    <p className="row-title">{c.name}</p>
                    <p className="row-meta"><strong>{money(c.total)}</strong></p>
                  </div>
                  <ProgressBar value={spent ? (c.total / spent) * 100 : 0} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {editing?.kind === 'expense' && <ExpenseEditor expense={editing.item} roomId={room.id} onClose={() => setEditing(null)} />}
      {editing?.kind === 'budget' && <RoomBudgetEditor room={room} onClose={() => setEditing(null)} />}
    </>
  );
}

function RoomBudgetEditor({ room, onClose }: { room: Room; onClose: () => void }) {
  const { upsert, notify } = useStore();
  const [value, setValue] = useState(numText(room.budget));
  const [error, setError] = useState('');

  const save = () => {
    const n = toNumber(value) ?? 0;
    if (Number.isNaN(n) || n < 0) {
      setError('Enter an amount, e.g. 8000');
      return;
    }
    upsert('rooms', { ...room, budget: n || undefined });
    notify('Room budget saved');
    onClose();
  };

  return (
    <EditorModal title={`${room.name} budget`} onClose={onClose} onSave={save}>
      <NumberInput label="Planned budget" value={value} onChange={setValue} suffix="S$" error={error} hint="How much you plan to spend on this room. Leave empty for no budget." />
    </EditorModal>
  );
}
