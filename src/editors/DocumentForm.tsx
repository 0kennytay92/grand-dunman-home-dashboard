import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { MAX_FILE_MB, processPhoto, putFile, requestPersistentStorage } from '../data/images';
import { newId, todayIso, useStore } from '../data/store';
import { documentTypes, fileSize, withAmount } from '../data/budget';
import type { DocumentFile, DocumentType, PurchaseItem } from '../data/types';
import { formatDate, money } from '../format';
import { DateInput, EditorModal, Field, FieldRow, NumberInput, SelectInput, TextArea, TextInput, numText, toNumber } from '../components/forms';

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// Quotations, invoices, receipts… as PDFs or pictures. The file
// is kept exactly as uploaded. Uploading a document never marks
// anything as paid and never changes an amount by itself.
// ─────────────────────────────────────────────────────────────

export const DOC_ACCEPT = 'application/pdf,image/*';

export interface DocDefaults {
  type?: DocumentType;
  vendorId?: string;
  itemIds?: string[];
  paymentIds?: string[];
}

/** Checks the size and stores one file (with a preview for pictures). Throws a friendly error. */
export async function storeDocumentFile(id: string, file: File) {
  if (file.size > MAX_FILE_MB * 1_048_576) throw new Error(`"${file.name}" is ${fileSize(file.size)} – the limit is ${MAX_FILE_MB} MB per file.`);
  requestPersistentStorage();
  let thumb: Blob | undefined;
  if (file.type.startsWith('image/')) thumb = await processPhoto(file).then((r) => r.thumb, () => undefined);
  await putFile(id, file, thumb);
  return { hasThumb: !!thumb };
}

export const titleFromFile = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || 'Document';

/** Wraps an "Upload document" button: choose PDFs or photos, then fill in a short form. */
export function DocumentAdder({ defaults, children }: { defaults?: DocDefaults; children: (open: () => void) => ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  return (
    <>
      {children(() => input.current?.click())}
      <input
        ref={input}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        hidden
        data-testid="doc-input"
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {files.length > 0 && <DocumentForm files={files} defaults={defaults} onClose={() => setFiles([])} />}
    </>
  );
}

/** Upload new files (`files`) or edit an existing document's details and links (`doc`). */
export function DocumentForm({ doc, files, defaults, onClose, onDeleted }: { doc?: DocumentFile; files?: File[]; defaults?: DocDefaults; onClose: () => void; onDeleted?: () => void }) {
  const { data, upsert, remove, getData, notify } = useStore();
  const single = !files || files.length === 1;
  const [type, setType] = useState<DocumentType>(doc?.type ?? defaults?.type ?? 'Invoice');
  const [title, setTitle] = useState(doc?.title ?? (files?.length === 1 ? titleFromFile(files[0].name) : ''));
  const [date, setDate] = useState(doc?.date ?? todayIso());
  const [vendorId, setVendorId] = useState(doc ? (doc.vendorId ?? '') : (defaults?.vendorId ?? ''));
  const [itemIds, setItemIds] = useState<string[]>(doc?.itemIds ?? defaults?.itemIds ?? []);
  const [paymentIds, setPaymentIds] = useState<string[]>(doc?.paymentIds ?? defaults?.paymentIds ?? []);
  const [number, setNumber] = useState(doc?.number ?? '');
  const [amount, setAmount] = useState(numText(doc?.amount));
  const [notes, setNotes] = useState(doc?.notes ?? '');
  const [updateTotal, setUpdateTotal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // An invoice or quotation for one item whose amount differs from the item's total: offer (never force) an update.
  const amountNum = toNumber(amount);
  const oneItem: PurchaseItem | undefined = itemIds.length === 1 ? data.purchases.find((i) => i.id === itemIds[0]) : undefined;
  const offerUpdate = !!oneItem && ['Invoice', 'Quotation', 'Contract'].includes(type) && amountNum !== undefined && !Number.isNaN(amountNum) && amountNum > 0 && amountNum !== oneItem.totalAmount;

  const save = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (single && !title.trim()) e.title = 'Give the document a name, e.g. "Sofa invoice"';
    if (amountNum !== undefined && (Number.isNaN(amountNum) || amountNum < 0)) e.amount = 'Enter an amount, e.g. 2950';
    if (!date) e.date = 'Pick the date on the document.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const fields = {
      type, date, vendorId: vendorId || undefined, itemIds, paymentIds,
      number: number.trim() || undefined, amount: amountNum === undefined ? undefined : Math.round(amountNum * 100) / 100, notes: notes.trim() || undefined,
    };

    if (doc) {
      upsert('documents', { ...doc, ...fields, title: title.trim() });
      notify('Document updated');
    } else if (files) {
      const failed: string[] = [];
      let saved = 0;
      for (const [i, file] of files.entries()) {
        setBusy(files.length > 1 ? `Saving ${i + 1} of ${files.length}…` : 'Saving…');
        const id = newId();
        try {
          const { hasThumb } = await storeDocumentFile(id, file);
          upsert('documents', {
            id, ...fields, title: single ? title.trim() : titleFromFile(file.name),
            fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, hasThumb, addedAt: new Date().toISOString(),
          });
          saved++;
        } catch (err) {
          failed.push(err instanceof Error && err.message.includes('limit') ? err.message : `"${file.name}" could not be saved (the device may be out of space).`);
        }
      }
      setBusy(null);
      if (failed.length) {
        window.alert(failed.join('\n'));
        if (!saved) return;
      }
      notify(saved === 1 ? `${type} saved` : `${saved} documents saved`);
    }
    if (offerUpdate && updateTotal && oneItem) {
      const latest = getData().purchases.find((i) => i.id === oneItem.id) ?? oneItem;
      upsert('purchases', withAmount(latest, amountNum!, type === 'Quotation' ? latest.amountStatus : 'Confirmed', `From ${type.toLowerCase()}${number.trim() ? ` ${number.trim()}` : ''}`, todayIso()));
    }
    onClose();
  };

  const del = () => {
    if (!doc || !window.confirm(`Delete "${doc.title}"? The file is removed from this device and from online storage.`)) return;
    remove('documents', doc.id);
    notify('Document deleted');
    onClose();
    onDeleted?.();
  };

  const vendors = [...data.vendors].sort((a, b) => a.name.localeCompare(b.name));
  const heading = doc ? 'Edit document' : files && files.length > 1 ? `Upload ${files.length} documents` : 'Upload document';

  return (
    <EditorModal title={heading} onClose={busy ? () => {} : onClose} onSave={save} onDelete={doc ? del : undefined} saveLabel={busy ?? 'Save'}>
      {files && (
        <ul className="file-chips">
          {files.map((f, i) => <li key={i}><span className="file-chip-name">{f.name}</span> <span className="muted">{fileSize(f.size)}</span></li>)}
        </ul>
      )}
      <FieldRow>
        <SelectInput label="Type" value={type} onChange={(v) => setType(v as DocumentType)} options={documentTypes.map((t) => ({ value: t, label: t }))} />
        <DateInput label="Date on document" value={date} onChange={setDate} error={errors.date} />
      </FieldRow>
      {single && <TextInput label="Name" value={title} onChange={setTitle} error={errors.title} placeholder="e.g. Sofa invoice" />}
      <SelectInput label="Vendor" value={vendorId} onChange={setVendorId} options={[{ value: '', label: '—' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]} />
      <ItemChecklist value={itemIds} onChange={setItemIds} vendorId={vendorId} />
      <PaymentChecklist value={paymentIds} onChange={setPaymentIds} itemIds={itemIds} />
      <FieldRow>
        <TextInput label="Document no. (optional)" value={number} onChange={setNumber} placeholder="e.g. INV-1042" />
        <NumberInput label="Amount on it (optional)" value={amount} onChange={setAmount} suffix="S$" error={errors.amount} hint="For reference – it doesn't change any totals" />
      </FieldRow>
      {offerUpdate && oneItem && (
        <label className="checkbox-line update-offer">
          <input type="checkbox" checked={updateTotal} onChange={(e) => setUpdateTotal(e.target.checked)} />
          <span>
            Also change <strong>{oneItem.name}</strong>'s total from {oneItem.totalAmount === null ? 'TBD' : money(oneItem.totalAmount)} to <strong>{money(amountNum!)}</strong>
            {type !== 'Quotation' && ' (confirmed)'}
          </span>
        </label>
      )}
      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {doc && <p className="field-hint">File: {doc.fileName} · {fileSize(doc.sizeBytes)} · added {formatDate(doc.addedAt.slice(0, 10))}</p>}
    </EditorModal>
  );
}

/** Tick the items a document is for. The vendor's items are listed first. */
function ItemChecklist({ value, onChange, vendorId }: { value: string[]; onChange: (v: string[]) => void; vendorId: string }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const vendorName = (id?: string) => data.vendors.find((v) => v.id === id)?.name;
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const sorted = [...data.purchases].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)) || Number(b.vendorId === vendorId) - Number(a.vendorId === vendorId) || a.name.localeCompare(b.name));
    return sorted.filter((i) => (n ? `${i.name} ${vendorName(i.vendorId) ?? ''}`.toLowerCase().includes(n) : all || !vendorId || value.includes(i.id) || i.vendorId === vendorId));
  }, [data.purchases, data.vendors, value, vendorId, q, all]);
  const hidden = !q && !all && vendorId ? data.purchases.length - list.length : 0;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <Field label={`Items${value.length ? ` (${value.length})` : ''}`} hint="One invoice can cover several items.">
      {() => (
        <div className="checklist">
          {data.purchases.length > 8 && (
            <label className="search small">
              <Search size={15} />
              <input type="search" placeholder="Find an item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an item" />
            </label>
          )}
          <ul>
            {list.map((i) => (
              <li key={i.id}>
                <label className="checkbox-line">
                  <input type="checkbox" checked={value.includes(i.id)} onChange={() => toggle(i.id)} />
                  <span>{i.name}{vendorName(i.vendorId) && <span className="muted"> · {vendorName(i.vendorId)}</span>}</span>
                </label>
              </li>
            ))}
            {!list.length && <li className="muted">{data.purchases.length ? 'No items match.' : 'No items yet.'}</li>}
          </ul>
          {hidden > 0 && <button type="button" className="text-btn" onClick={() => setAll(true)}>Show all items ({hidden} more)</button>}
        </div>
      )}
    </Field>
  );
}

/** Tick the payments a receipt or proof of payment belongs to (payments of the ticked items). */
function PaymentChecklist({ value, onChange, itemIds }: { value: string[]; onChange: (v: string[]) => void; itemIds: string[] }) {
  const { data } = useStore();
  const list = data.payments
    .filter((p) => value.includes(p.id) || (p.itemId && itemIds.includes(p.itemId)))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return null;
  const itemName = (id?: string) => data.purchases.find((i) => i.id === id)?.name;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Field label="Payments (for receipts and proof of payment)">
      {() => (
        <div className="checklist">
          <ul>
            {list.map((p) => (
              <li key={p.id}>
                <label className="checkbox-line">
                  <input type="checkbox" checked={value.includes(p.id)} onChange={() => toggle(p.id)} />
                  <span>
                    {money(p.amount)} · {p.type}{p.status === 'Scheduled' ? ' (scheduled)' : ''} · {formatDate(p.date)}
                    {itemIds.length > 1 && itemName(p.itemId) && <span className="muted"> · {itemName(p.itemId)}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Field>
  );
}
