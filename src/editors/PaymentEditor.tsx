import { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { newId, todayIso, useRoomName, useStore } from '../data/store';
import { fileSize, itemMoney, paymentMethods, paymentTypes } from '../data/budget';
import type { DocumentType, Payment, PaymentType } from '../data/types';
import { money } from '../format';
import { DateInput, EditorModal, Field, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';
import { DOC_ACCEPT, storeDocumentFile, titleFromFile } from './DocumentForm';

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
  const [paymentId] = useState(() => payment?.id ?? newId());
  // Documents: which existing ones are attached, and new files (receipts / proof) to save with the payment.
  const [attached, setAttached] = useState<string[]>(() => data.documents.filter((d) => d.paymentIds.includes(paymentId)).map((d) => d.id));
  const [newFiles, setNewFiles] = useState<{ file: File; type: DocumentType }[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const save = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (amountNum === undefined || Number.isNaN(amountNum) || amountNum <= 0) e.amount = 'Enter the amount, e.g. 1500';
    if (!date) e.date = status === 'Paid' ? 'When was it paid?' : 'When is it due?';
    if (!linked && !description.trim()) e.description = 'What was this payment for? (or link it to an item)';
    setErrors(e);
    if (Object.keys(e).length) return;

    const opt = (s: string) => s.trim() || undefined;
    const vId = linked ? (linked.vendorId ?? (vendorId || undefined)) : vendorId || undefined;

    // New receipt / proof files are saved first, so a failure can be shown before anything changes.
    setBusy(true);
    const problems: string[] = [];
    const created: string[] = [];
    for (const { file, type: docType } of newFiles) {
      const id = newId();
      try {
        const { hasThumb } = await storeDocumentFile(id, file);
        upsert('documents', {
          id, type: docType, title: titleFromFile(file.name), date, fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, hasThumb,
          vendorId: vId, itemIds: linked ? [linked.id] : [], paymentIds: [paymentId], addedAt: new Date().toISOString(),
        });
        created.push(id);
      } catch (err) {
        problems.push(err instanceof Error && err.message.includes('limit') ? err.message : `"${file.name}" could not be saved.`);
      }
    }
    setBusy(false);
    if (problems.length) {
      window.alert(problems.join('\n'));
      if (!created.length) return; // nothing saved yet: keep the form open so it can be fixed
    }
    // Attach / detach existing documents.
    for (const d of data.documents) {
      const want = attached.includes(d.id);
      const has = d.paymentIds.includes(paymentId);
      if (want !== has) upsert('documents', { ...d, paymentIds: want ? [...d.paymentIds, paymentId] : d.paymentIds.filter((x) => x !== paymentId) });
    }

    upsert('payments', {
      ...(payment ?? {}),
      id: paymentId,
      itemId: linked?.id,
      vendorId: vId,
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

  // Documents that can be attached: this item's and this vendor's, plus any already attached.
  const vendorForDocs = linked?.vendorId ?? vendorId;
  const attachable = data.documents
    .filter((d) => !attached.includes(d.id) && ((linked && d.itemIds.includes(linked.id)) || (vendorForDocs && d.vendorId === vendorForDocs)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const docTitle = (id: string) => data.documents.find((d) => d.id === id);

  return (
    <EditorModal title={payment ? 'Edit payment' : 'Add payment'} onClose={busy ? () => {} : onClose} onSave={save} onDelete={payment ? del : undefined} saveLabel={busy ? 'Saving…' : 'Save'}>
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
      <Field label="Receipt / proof of payment" hint="Attach the receipt, a screenshot of the transfer, or the invoice this pays. Attaching never changes any amounts.">
        {() => (
          <div className="attach-box">
            {(attached.length > 0 || newFiles.length > 0) && (
              <ul className="file-chips">
                {attached.map((id) => {
                  const d = docTitle(id);
                  return (
                    <li key={id}>
                      <Paperclip size={13} /> <span className="file-chip-name">{d?.title ?? 'Document'}</span> <span className="muted">{d?.type}</span>
                      <button type="button" className="chip-x" aria-label="Detach" onClick={() => setAttached((a) => a.filter((x) => x !== id))}><X size={14} /></button>
                    </li>
                  );
                })}
                {newFiles.map((f, i) => (
                  <li key={`new-${i}`}>
                    <span className="file-chip-name">{f.file.name}</span> <span className="muted">{fileSize(f.file.size)}</span>
                    <select className="chip-select" value={f.type} aria-label="Document type" onChange={(e) => setNewFiles((all) => all.map((x, j) => (j === i ? { ...x, type: e.target.value as DocumentType } : x)))}>
                      <option value="Receipt">Receipt</option>
                      <option value="Proof of Payment">Proof of payment</option>
                      <option value="Invoice">Invoice</option>
                    </select>
                    <button type="button" className="chip-x" aria-label="Remove" onClick={() => setNewFiles((all) => all.filter((_, j) => j !== i))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="attach-actions">
              <button type="button" className="btn btn-ghost small" onClick={() => fileInput.current?.click()}><Paperclip size={14} /> Add receipt or screenshot</button>
              {attachable.length > 0 && (
                <select className="input select attach-existing" value="" aria-label="Attach an existing document" onChange={(e) => e.target.value && setAttached((a) => [...a, e.target.value])}>
                  <option value="">Attach an existing document…</option>
                  {attachable.map((d) => <option key={d.id} value={d.id}>{d.type}: {d.title}</option>)}
                </select>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={DOC_ACCEPT}
              multiple
              hidden
              data-testid="receipt-input"
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? []);
                e.target.value = '';
                setNewFiles((f) => [...f, ...chosen.map((file) => ({ file, type: (file.type.startsWith('image/') ? 'Proof of Payment' : 'Receipt') as DocumentType }))]);
              }}
            />
          </div>
        )}
      </Field>
      <TextArea label="Notes" value={notes} onChange={setNotes} />
    </EditorModal>
  );
}
