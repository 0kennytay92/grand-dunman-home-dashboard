import { useState } from 'react';
import { newId, useStore } from '../data/store';
import type { BudgetCategory } from '../data/types';
import { EditorModal, NumberInput, TextInput, numText, toNumber } from '../components/forms';

export function CategoryEditor({ category, onClose }: { category?: BudgetCategory; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const [name, setName] = useState(category?.name ?? '');
  const [budget, setBudget] = useState(category?.budget ? numText(category.budget) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const budgetNum = toNumber(budget) ?? 0;
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please give the category a name.';
    if (Number.isNaN(budgetNum) || budgetNum < 0) e.budget = 'Enter an amount, e.g. 15000';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('budgetCategories', { id: category?.id ?? newId(), name: name.trim(), budget: budgetNum });
    notify(category ? 'Category updated' : 'Category added');
    onClose();
  };

  const del = () => {
    if (!category) return;
    const payments = data.expenses.filter((x) => x.categoryId === category.id).length;
    if (payments) {
      window.alert(`"${category.name}" has ${payments} payment${payments > 1 ? 's' : ''}. Move them to another category or delete them first.`);
      return;
    }
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    remove('budgetCategories', category.id);
    notify('Category deleted');
    onClose();
  };

  return (
    <EditorModal title={category ? 'Edit budget category' : 'Add budget category'} onClose={onClose} onSave={save} onDelete={category ? del : undefined}>
      <TextInput label="Category name" value={name} onChange={setName} error={errors.name} placeholder="e.g. Aircon" autoFocus={!category} />
      <NumberInput label="Budget" value={budget} onChange={setBudget} suffix="S$" error={errors.budget} hint="How much you plan to spend. Money spent is added up from your payments." />
    </EditorModal>
  );
}
