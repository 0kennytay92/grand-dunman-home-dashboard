import { useState } from 'react';
import { newId, useStore } from '../data/store';
import { normName } from '../data/budget';
import type { BudgetCategory } from '../data/types';
import { EditorModal, TextInput } from '../components/forms';

export function CategoryEditor({ category, onClose }: { category?: BudgetCategory; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return setError('Please give the category a name.');
    const same = data.budgetCategories.find((c) => c.id !== category?.id && normName(c.name) === normName(name));
    if (same) return setError(`"${same.name}" already exists.`);
    // The old per-category budget isn't used any more but is kept as it was.
    upsert('budgetCategories', { id: category?.id ?? newId(), budget: category?.budget ?? 0, name: name.trim() });
    notify(category ? 'Category renamed' : 'Category added');
    onClose();
  };

  const del = () => {
    if (!category) return;
    const items = data.purchases.filter((x) => x.categoryId === category.id).length;
    const payments = data.payments.filter((x) => !x.itemId && x.categoryId === category.id).length;
    if (items || payments) {
      window.alert(`"${category.name}" is used by ${[items && `${items} item${items > 1 ? 's' : ''}`, payments && `${payments} payment${payments > 1 ? 's' : ''}`].filter(Boolean).join(' and ')}. Move them to another category first.`);
      return;
    }
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    remove('budgetCategories', category.id);
    notify('Category deleted');
    onClose();
  };

  return (
    <EditorModal title={category ? 'Edit category' : 'Add category'} onClose={onClose} onSave={save} onDelete={category ? del : undefined}>
      <TextInput label="Category name" value={name} onChange={setName} error={error} placeholder="e.g. Aircon" autoFocus={!category} />
    </EditorModal>
  );
}
