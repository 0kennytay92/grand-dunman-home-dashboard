import { useState } from 'react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import { itemMoney, paymentMethods, paymentTypes } from '../data/budget';
import type { Payment, PaymentType } from '../data/types';
import { money } from '../format';
import { DateInput, EditorModal, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';

/** Add or edit a payment. A payment belongs to an item; older payments may not be linked yet. */
export function PaymentEditor({ payment, itemId, vendorId: vendorDefault, onClose }: { payment?: Payment; itemId?: string; vendorId?: string; onClose: () => void }) {
  const { data, upsert, remove, notify } = useStore();
  const roomName = useRoomName();
  const [item, setItem] = useState(payment ? (payment.itemId ?? '') : (itemId ?? ''));
  const [amount, setAmount] = useState(numText(payment?.amount));
  const [date, setDate] = useState(payment?.date ?? todayIso());
  const [status, setStatus] = useState<Payment['status']>(payment?.status ?? 'Paid');
  const [type, setType] = useState<PaymentType>(payment?.type ?? 'Deposit');
  const [method, setMethod] = useState(payment?.method ?? '');
  const [reference, setReference] = useState(payment?.reference ?? '');
  const [description, setDescription] = useState(payment?.description ?? '');
  const [notes, setNotes] = useState(payment?.notes ?? '');
  const [vendorId, setVendorId] = useState(payment ? (payment.vendorId ?? '') : (vendorDefault ?? ''));
  const [categoryId, setCategoryId] = useState(payment?.categoryId ?? '');
  const [roomId, setRoomId] = useState(payment?.roomId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const linked = data.purchases.find((i) => i.id === item);
  const vendorName = (id?: string) => data.vendors.find((v) => v.id === id)?.name;
  const items = [...data.purchases].sort((a, b) => a.name.localeCompare(b.name));

  // Heads-up (not a block) when a payment is more than what's left to pay.
  const amountNum = toNumber(amount);
  let hint: string | undefined;
  if (linked && status === 'Paid' && type !== 'Refund' && amountNum && !Number.isNaN(amountNum)) {
    const others = data.payments.filter((p) => p.id !== payment?.id);
    const m = itemMoney(linked, others);
    if (m.remaining !== null && amountNum > m.remaining + 0.001) hint = `Heads up: only ${money(Math.max(m.remaining, 0))} is left to pay on this item.`;
  }

  const save = () => {
    const e: Record<string, string> = {};
    if (amountNum === undefined || Number.isNaN(amountNum) || amountNum <= 0) e.amount = 'Enter the amount, e.g. 1500';
    if (!date) e.date = status === 'Paid' ? 'When was it paid?' : 'When is it due?';
    if (!linked && !description.trim()) e.description = 'What was this payment for? (or link it to an item)';
    setErrors(e);
    if (Object.keys(e).length) return;

    const opt = (s: string) => s.trim() || undefined;
    upsert('payments', {
      ...(payment ?? {}),
      id: payment?.id ?? newId(),
      itemId: linked?.id,
      vendorId: linked ? (linked.vendorId ?? (vendorId || undefined)) : vendorId || undefined,
      amount: Math.round(amountNum! * 100) / 100,
      date,
      status,
      type,
      method: opt(method),
      reference: opt(reference),
      description: opt(description),
      notes: opt(notes),
      categoryId: linked ? payment?.categoryId : categoryId || undefined,
      roomId: linked ? payment?.roomId : roomId || undefined,
    });
    notify(payment ? 'Payment updated' : status === 'Scheduled' ? 'Payment scheduled' : 'Payment added');
    onClose();
  };

  const del = () => {
    if (!payment || !window.confirm(`Delete this ${money(payment.amount)} payment? This can't be undone.`)) return;
    remove('payments', payment.id);
    notify('Payment deleted');
    onClose();
  };

  return (
    <EditorModal title={payment ? 'Edit payment' : 'Add payment'} onClose={onClose} onSave={save} onDelete={payment ? del : undefined}>
      <SelectInput
        label="Item"
        value={item}
        onChange={setItem}
        options={[{ value: '', label: 'Not linked to an item' }, ...items.map((i) => ({ value: i.id, label: [i.name, vendorName(i.vendorId)].filter(Boolean).join(' – ') }))]}
      />
      <FieldRow>
        <NumberInput label="Amount" value={amount} onChange={setAmount} suffix="S$" error={errors.amount} hint={hint ?? (type === 'Refund' ? 'Enter the refund as a positive number – it is taken off "paid"' : undefined)} />
        <SelectInput label="Type" value={type} onChange={(v) => setType(v as PaymentType)} options={paymentTypes.map((t) => ({ value: t, label: t }))} />
      </FieldRow>
      <FieldRow>
        <SelectInput label="Status" value={status} onChange={(v) => setStatus(v as Payment['status'])} options={[{ value: 'Paid', label: 'Paid' }, { value: 'Scheduled', label: 'Scheduled (not paid yet)' }]} />
        <DateInput label={status === 'Paid' ? 'Date paid' : 'Due date'} value={date} onChange={setDate} error={errors.date} />
      </FieldRow>
      <FieldRow>
        <SelectInput label="Method" value={method} onChange={setMethod} options={[{ value: '', label: '—' }, ...paymentMethods.map((m) => ({ value: m, label: m })), ...(method && !paymentMethods.includes(method) ? [{ value: method, label: method }] : [])]} />
        <TextInput label="Reference" value={reference} onChange={setReference} placeholder="e.g. invoice or transfer no." />
      </FieldRow>
      <TextInput label={linked ? 'Description (optional)' : 'Description'} value={description} onChange={setDescription} error={errors.description} placeholder="e.g. Carpentry deposit (30%)" />

      {!linked && (
        <>
          <SelectInput label="Paid to" value={vendorId} onChange={setVendorId} options={[{ value: '', label: '—' }, ...[...data.vendors].sort((a, b) => a.name.localeCompare(b.name)).map((v) => ({ value: v.id, label: v.name }))]} />
          <FieldRow>
            <SelectInput label="Category" value={categoryId} onChange={setCategoryId} options={[{ value: '', label: 'No category' }, ...data.budgetCategories.map((c) => ({ value: c.id, label: c.name }))]} />
            <SelectInput label="Room" value={roomId} onChange={setRoomId} options={[{ value: '', label: 'Whole home' }, ...data.rooms.map((r) => ({ value: r.id, label: roomName(r.id) }))]} />
          </FieldRow>
        </>
      )}
      <TextArea label="Notes" value={notes} onChange={setNotes} />
    </EditorModal>
  );
}
