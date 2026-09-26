import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBudgetTotals, useRoomName, useStore } from '../data/store';
import type { BudgetCategory, Expense } from '../data/types';
import { formatDate, money } from '../format';
import { AddButton } from '../components/forms';
import { CategoryEditor } from '../editors/CategoryEditor';
import { ExpenseEditor } from '../editors/ExpenseEditor';
import { Card, EmptyState, PageHeader, ProgressBar } from '../components/ui';

type Editing = { kind: 'category'; item?: BudgetCategory } | { kind: 'expense'; item?: Expense };

export function BudgetPage() {
  const { budgetCategories, expenses } = useStore().data;
  const { spentBy, totalBudget, totalSpent, pct } = useBudgetTotals();
  const roomName = useRoomName();
  const [editing, setEditing] = useState<Editing | null>(null);
  const remaining = totalBudget - totalSpent;
  const categoryName = (id: string) => budgetCategories.find((c) => c.id === id)?.name ?? 'No category';
  const payments = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const close = () => setEditing(null);

  return (
    <>
      <PageHeader
        eyebrow="Finances"
        title="Budget"
        subtitle="All amounts in Singapore dollars"
        action={<AddButton label="Add payment" onClick={() => setEditing({ kind: 'expense' })} />}
      />

      <Card className="budget-summary">
        <div className="budget-figures">
          <div>
            <p className="stat-label">Total budget</p>
            <p className="budget-big">{money(totalBudget)}</p>
          </div>
          <div>
            <p className="stat-label">Spent</p>
            <p className="budget-big">{money(totalSpent)}</p>
          </div>
          <div>
            <p className="stat-label">{remaining < 0 ? 'Over budget' : 'Remaining'}</p>
            <p className={`budget-big ${remaining < 0 ? 'over' : 'accent'}`}>{money(Math.abs(remaining))}</p>
          </div>
        </div>
        <ProgressBar value={pct} tone={pct > 100 ? 'bad' : 'accent'} />
        <p className="row-sub">{totalBudget ? `${pct}% of budget used` : 'Set a budget for each category below.'}</p>
      </Card>

      <div className="grid-2">
        <Card title="By category" action={<button className="link" onClick={() => setEditing({ kind: 'category' })}><Plus size={15} /> Add category</button>}>
          {budgetCategories.length === 0 ? (
            <EmptyState>No categories yet.</EmptyState>
          ) : (
            <ul className="list">
              {budgetCategories.map((c) => {
                const spent = spentBy(c.id);
                const used = c.budget ? (spent / c.budget) * 100 : spent ? 100 : 0;
                return (
                  <li key={c.id}>
                    <button className="cat-row row-button" onClick={() => setEditing({ kind: 'category', item: c })}>
                      <div className="cat-head">
                        <p className="row-title">{c.name}</p>
                        <p className="row-meta">
                          <strong>{money(spent)}</strong> / {money(c.budget)}
                        </p>
                      </div>
                      <ProgressBar value={used} tone={used > 100 ? 'bad' : used > 85 ? 'warn' : 'accent'} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Payments" action={<button className="link" onClick={() => setEditing({ kind: 'expense' })}><Plus size={15} /> Add</button>}>
          {payments.length === 0 ? (
            <EmptyState>No payments yet.</EmptyState>
          ) : (
            <ul className="list">
              {payments.map((e) => (
                <li key={e.id}>
                  <button className="list-row row-button" onClick={() => setEditing({ kind: 'expense', item: e })}>
                    <div className="grow">
                      <p className="row-title">{e.description}</p>
                      <p className="row-sub">{[categoryName(e.categoryId), e.roomId && roomName(e.roomId), e.vendor, formatDate(e.date)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="row-amount">{money(e.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {editing?.kind === 'category' && <CategoryEditor category={editing.item} onClose={close} />}
      {editing?.kind === 'expense' && <ExpenseEditor expense={editing.item} onClose={close} />}
    </>
  );
}
