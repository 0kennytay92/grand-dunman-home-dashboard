import { useState } from 'react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import type { Expense } from '../data/types';
import { DateInput, EditorModal, FieldRow, NumberInput, SelectInput, TextInput, numText, toNumber } from '../components/forms';

export function ExpenseEditor({ expense, roomId, onClose }: { expense?: Expense; roomId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [room, setRoom] = useState(expense ? (expense.roomId ?? '') : (roomId ?? ''));
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(numText(expense?.amount));
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? data.budgetCategories[0]?.id ?? '');
  const [vendor, setVendor] = useState(expense?.vendor ?? '');
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const amountNum = toNumber(amount);
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = 'What was this payment for?';
    if (amountNum === undefined || Number.isNaN(amountNum) || amountNum <= 0) e.amount = 'Enter the amount, e.g. 1500';
    if (!categoryId) e.category = 'Add a budget category first.';
    if (!date) e.date = 'Pick a date.';
    setErrors(e);
    if (Object.keys(e).length) return;

    upsert('expenses', { id: expense?.id ?? newId(), description: description.trim(), amount: amountNum!, categoryId, vendor: vendor.trim(), date, roomId: room || undefined });
    notify(expense ? 'Payment updated' : 'Payment added');
    onClose();
  };

  const del = () => {
    if (!expense || !window.confirm(`Delete "${expense.description}"?`)) return;
    remove('expenses', expense.id);
    notify('Payment deleted');
    onClose();
  };

  return (
    <EditorModal title={expense ? 'Edit payment' : 'Add payment'} onClose={onClose} onSave={save} onDelete={expense ? del : undefined}>
      <TextInput label="Description" value={description} onChange={setDescription} error={errors.description} placeholder="e.g. Carpentry deposit" autoFocus={!expense} />
      <FieldRow>
        <NumberInput label="Amount" value={amount} onChange={setAmount} suffix="S$" error={errors.amount} />
        <DateInput label="Date paid" value={date} onChange={setDate} error={errors.date} />
      </FieldRow>
      <SelectInput label="Category" value={categoryId} onChange={setCategoryId} error={errors.category} options={data.budgetCategories.map((c) => ({ value: c.id, label: c.name }))} />
      <SelectInput label="Room" value={room} onChange={setRoom} options={[{ value: '', label: 'Whole home / not room-specific' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
      <TextInput label="Paid to (optional)" value={vendor} onChange={setVendor} placeholder="e.g. Oak & Stone Carpentry" />
    </EditorModal>
  );
}
