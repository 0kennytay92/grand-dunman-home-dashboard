import { budgetCategories, expenses } from '../data/sampleData';
import { formatDate, money } from '../format';
import { Card, PageHeader, ProgressBar } from '../components/ui';

export function BudgetPage() {
  const totalBudget = budgetCategories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + c.spent, 0);
  const remaining = totalBudget - totalSpent;
  const pct = Math.round((totalSpent / totalBudget) * 100);
  const categoryName = (id: string) => budgetCategories.find((c) => c.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader eyebrow="Finances" title="Budget" subtitle="All amounts in Singapore dollars" />

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
            <p className="stat-label">Remaining</p>
            <p className="budget-big accent">{money(remaining)}</p>
          </div>
        </div>
        <ProgressBar value={pct} />
        <p className="row-sub">{pct}% of budget used</p>
      </Card>

      <div className="grid-2">
        <Card title="By category">
          <ul className="list">
            {budgetCategories.map((c) => {
              const used = c.budget ? (c.spent / c.budget) * 100 : 0;
              return (
                <li key={c.id} className="cat-row">
                  <div className="cat-head">
                    <p className="row-title">{c.name}</p>
                    <p className="row-meta">
                      <strong>{money(c.spent)}</strong> / {money(c.budget)}
                    </p>
                  </div>
                  <ProgressBar value={used} tone={used > 90 ? 'bad' : used > 70 ? 'warn' : 'accent'} />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Payments">
          <ul className="list">
            {expenses.map((e) => (
              <li key={e.id} className="list-row">
                <div className="grow">
                  <p className="row-title">{e.description}</p>
                  <p className="row-sub">{categoryName(e.categoryId)} · {e.vendor} · {formatDate(e.date)}</p>
                </div>
                <span className="row-amount">{money(e.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
